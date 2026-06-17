import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { ChatResponse, SearchResult } from "../types";
import { answerLocally, isSensitiveQuestion, toSources } from "./retriever";

export function isVertexConfigured() {
  const explicitEnabled = process.env.VERTEX_AI_ENABLED === "true";
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  return explicitEnabled && Boolean(project);
}

export async function answerWithVertex(
  question: string,
  results: SearchResult[]
): Promise<ChatResponse | null> {
  if (!isVertexConfigured() || isSensitiveQuestion(question)) {
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

  const prompt = `
You are a portfolio assistant. Answer the question — nothing more.

Hard rules:
- Korean.
- Maximum 3 sentences. No preamble, no recap, no closing remark.
- Technical and direct: tools, methods, concrete results. Skip filler ("또한", "한편", "이와 같이").
- Stay on the single asked subject. Do NOT compare with or add information about other projects unless explicitly asked.
- Do NOT cite KB titles inline. Do NOT repeat the question.
- Use only the public knowledge below. Never invent customers, metrics, credentials, IPs, or private data.
- If the question asks for secrets, credentials, or private material, refuse in one sentence.

Public career knowledge:
${context}

Question:
${question}
`;

  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });

    const text = extractResponseText(response);
    if (!text) {
      console.warn("Vertex AI returned no text. Falling back to local answer.", {
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
