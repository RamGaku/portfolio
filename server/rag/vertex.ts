import { GoogleGenAI } from "@google/genai";
import type { ChatResponse, SearchResult } from "../types";
import { answerLocally, isSensitiveQuestion, toSources } from "./retriever";

export function isVertexConfigured() {
  const explicitEnabled = process.env.VERTEX_AI_ENABLED === "true";
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  return explicitEnabled && Boolean(project);
}

export async function answerWithVertex(
  question: string,
  results: SearchResult[],
  options: { term?: boolean } = {}
): Promise<ChatResponse | null> {
  const term = options.term === true;
  if (!isVertexConfigured() || (!term && isSensitiveQuestion(question))) {
    return null;
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
  const model = process.env.VERTEX_AI_MODEL || "gemini-3.1-pro-preview";

  if (!project) {
    return null;
  }

  const client = new GoogleGenAI({
    vertexai: true,
    project,
    location
  });

  const context = results
    .map(
      (result, index) => `
[${index + 1}] ${result.title}
Category: ${result.category}
Summary: ${result.summary}
Highlights:
- ${result.highlights.join("\n- ")}
Technologies: ${result.technologies.join(", ")}
Evidence: ${result.evidence.join(", ")}
`
    )
    .join("\n");

  const prompt = term
    ? `다음 질문에 답하세요.

규칙:
- 한국어, 최대 2문장, 서론 없이.
- 질문에 나온 기술/산업 용어의 뜻을 일반 지식으로 정확히 정의하세요.
- 이 웹사이트, 포트폴리오, 소유자, 챗봇에 대해서는 설명하지 마세요.

질문:
${question}
`
    : `
당신은 포트폴리오 주인 "김가람" 본인입니다. 1인칭("저는", "제가", "제 생각엔")으로 답합니다.

규칙:
- 한국어, 최대 3문장.
- 첫 문장은 일반론이 아니라 본인의 단언·관점으로 시작합니다.
  예: "제 출발점은 …입니다.", "제가 가장 중요하게 본 것은 …입니다.", "저는 …라고 생각합니다.", "제 경력의 축은 …입니다."
- 그다음 문장(들)은 그 관점을 KB의 구체 근거(프로젝트·기술·역할·결과)로 짧게 받쳐줍니다. 사례 1~2개로 충분합니다.
- 모호한 수식어와 의례적 표현 금지: "다양한", "여러", "또한", "한편", "이와 같이", "노력했습니다", "다뤘습니다", "경험이 있습니다", "해왔습니다" 등 두루뭉술한 마무리는 쓰지 않습니다.
- KB 카드 제목을 그대로 인용하지 말고, 질문을 다시 적지 말 것.
- KB에 없는 고객명·수치·계정·IP·내부 정보는 만들지 말 것.
- 비밀·자격증명·내부 운영 정보 질문은 한 문장으로 거절합니다.

KB:
${context}

질문:
${question}
`;

  // thinkingConfig는 생략한다. Gemini 3.1 Pro Preview에서 thinkingLevel.LOW를 주면
  // 입력 KB 청크가 이미 잘 다듬어진 답변 형태일 때 모델이 thinking 단계에서
  // "변형할 게 없다"고 판단해 출력 토큰을 0개 만들어 버리는 침묵 패턴이 관찰됐다.
  // thinkingConfig를 빼면 모델 default로 동작해 그 침묵을 우회한다.
  const baseConfig = {
    temperature: 0.2,
    maxOutputTokens: 4096
  } as const;

  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  try {
    let response = await client.models.generateContent({
      model,
      contents,
      config: baseConfig
    });

    let text = extractResponseText(response);

    // 빈 응답이면 온도만 살짝 올려 1회 재시도. 같은 결정적 침묵을 흔든다.
    if (!text) {
      response = await client.models.generateContent({
        model,
        contents,
        config: { ...baseConfig, temperature: 0.6 }
      });
      text = extractResponseText(response);
    }

    if (!text) {
      console.warn("Vertex AI returned no text after retry. Falling back to local answer.", {
        model,
        candidateCount: response.candidates?.length ?? 0,
        finishReason: response.candidates?.[0]?.finishReason,
        finishMessage: response.candidates?.[0]?.finishMessage,
        promptFeedback: response.promptFeedback,
        usageMetadata: response.usageMetadata
      });
      return {
        ...answerLocally(question, results),
        mode: "vertex-empty-fallback"
      };
    }

    return {
      answer: text,
      mode: "vertex",
      sources: toSources(results)
    };
  } catch (error) {
    console.warn("Vertex AI answer failed. Falling back to local answer.", error);
    return {
      ...answerLocally(question, results),
      mode: "local-fallback"
    };
  }
}

function extractResponseText(response: unknown): string | undefined {
  const directText = (response as { text?: unknown }).text;
  if (typeof directText === "string" && directText.trim()) {
    return directText.trim();
  }

  const candidates = (response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          thought?: boolean;
        }>;
      };
    }>;
  }).candidates;

  const partsText = candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text)
    .filter((text): text is string => Boolean(text?.trim()))
    .join("\n")
    .trim();

  return partsText || undefined;
}
