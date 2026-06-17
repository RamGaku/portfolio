import { GoogleGenAI } from "@google/genai";

// 한국어 콘텐츠/질의가 많으므로 다국어 임베딩 모델을 기본으로 사용한다.
const EMBED_MODEL = process.env.VERTEX_EMBED_MODEL || "text-multilingual-embedding-002";

function embedLocation(): string {
  const loc = process.env.GOOGLE_CLOUD_LOCATION;
  // 임베딩 모델은 보통 리전 엔드포인트에서 제공된다. "global"이면 리전으로 폴백.
  if (loc && loc !== "global") return loc;
  return process.env.VERTEX_EMBED_LOCATION || "asia-northeast3";
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!project) return null;
  if (!client) {
    client = new GoogleGenAI({ vertexai: true, project, location: embedLocation() });
  }
  return client;
}

export function embeddingsEnabled(): boolean {
  return (
    process.env.VERTEX_AI_ENABLED === "true" &&
    Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT)
  );
}

/** Returns one vector per input text, or null if embeddings are unavailable. */
export async function embed(texts: string[]): Promise<number[][] | null> {
  const ai = getClient();
  if (!ai || texts.length === 0) {
    return null;
  }

  try {
    const response = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: texts
    });
    const vectors = (response.embeddings ?? []).map((item) => item.values ?? []);
    if (vectors.length !== texts.length || vectors.some((vector) => vector.length === 0)) {
      console.warn("Embedding returned unexpected shape; falling back.", {
        expected: texts.length,
        got: vectors.length
      });
      return null;
    }
    return vectors;
  } catch (error) {
    console.warn("Embedding request failed; falling back to keyword search.", error);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
