import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ChatResponse, KnowledgeEntry, SearchResult } from "../types";
import { loadOverrides, type ContentOverrides } from "../content";
import { loadProfileEntries } from "./profile";
import { cosineSimilarity, embed, embeddingsEnabled } from "./embeddings";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const kbPath = path.join(rootDir, "data", "public-kb.json");

const sensitiveTerms = [
  "password",
  "passwd",
  "비밀번호",
  "암호",
  "계정",
  "아이디",
  "vpn",
  "anydesk",
  "토큰",
  "secret",
  "credential",
  "키값",
  "private key"
];

const sensitivePatterns = [
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/,
  /(ip|아이피).*(주소|알려|공유|노출|뭐야|무엇)/,
  /(계정|아이디|id).*(알려|공유|노출|뭐야|무엇|접속)/,
  /(비밀번호|암호|password|passwd).*(알려|공유|노출|뭐야|무엇)/,
  /(vpn|anydesk|원격).*(주소|계정|아이디|비밀번호|암호|password|접속 정보)/
];

// 폴백 전용. 정상 경로는 retrieveSemantic()의 벡터 임베딩이 처리하고,
// 임베딩이 비활성/실패해 retrieve() 키워드 경로로 떨어졌을 때만 사용된다.
// 한↔영 도메인 어휘(예: 모드버스↔modbus, 청송↔vnet-7000)를 이어 폴백 품질을 유지한다.
const expansionMap: Record<string, string[]> = {
  "인핸스": ["enhans", "fde", "customer", "솔루션", "현장", "고객", "데이터", "통합"],
  "enhans": ["인핸스", "fde", "customer", "solution", "현장", "고객", "통합"],
  "fde": ["forward", "deployed", "현장", "고객", "문제", "요구사항", "솔루션", "통합"],
  "솔루션": ["solution", "개발", "통합", "운영", "유지보수", "배포"],
  "통합": ["integration", "연동", "인터페이스", "시스템", "데이터"],
  "자동화": ["automation", "절차", "점검", "mapping", "cli", "스킬"],
  "성과": ["결과", "임팩트", "수치", "검증", "evidence"],
  "임팩트": ["성과", "결과", "수치", "운영", "검증"],
  "rag": ["kb", "검색", "질문", "답변", "문서", "근거"],
  "데이터": ["data", "flow", "layer", "stack", "rtdb", "api", "viewer", "report"],
  "흐름": ["flow", "pipeline", "layer", "장비", "프로토콜", "api", "화면"],
  "플로우": ["flow", "pipeline", "data", "layer", "stack"],
  "레이어": ["layer", "stack", "source", "ingestion", "api", "surface"],
  "모드버스": ["modbus", "mapping", "gateway", "주소", "레지스터", "skill", "t-dataserver"],
  "경주풍력": ["gjpp", "digital twin", "edge", "center", "viewer", "dtviewer"],
  "청송": ["고진동", "vibration", "vnet-7000", "export", "측정", "전송"],
  "해군": ["추진전동기", "보고서", "report", "pdf", "trend", "alarm"],
  "보고서": ["report", "pdf", "template", "chart", "trend", "automation"],
  "폐쇄망": ["closed network", "onlinetsi", "uwf", "dhcp", "golden image", "망분리"],
  "onlinetsi": ["폐쇄망", "closed network", "uwf", "dhcp", "운영 환경"],
  "edge": ["dtedgeserver", "edge computing", "rtDB", "rest", "grafana", "influxdb"],
  "opc": ["dcs", "plc", "연동", "industrial", "opc da", "opc ua"],
  "hsms": ["interface", "industrial", "integration", "protocol"],
  "펌웨어": ["firmware", "protocol", "c++", "c#", "binary", "timeout", "wire"],
  "진동": ["vibration", "vnet-7000", "측정", "신호", "모니터링"],
  "문서": ["srs", "sdd", "manual", "v&v", "산출물", "report"]
};

const SCALAR_FIELDS = ["title", "period", "category", "summary"] as const;
const ARRAY_FIELDS = ["highlights", "technologies", "evidence", "tags"] as const;

let cachedRaw: KnowledgeEntry[] | null = null;

function loadRawKnowledge(): KnowledgeEntry[] {
  if (cachedRaw) {
    return cachedRaw;
  }

  const raw = fs.readFileSync(kbPath, "utf-8");
  cachedRaw = JSON.parse(raw) as KnowledgeEntry[];
  return cachedRaw;
}

function applyEntryOverrides(entry: KnowledgeEntry, overrides: ContentOverrides): KnowledgeEntry {
  const next: KnowledgeEntry = { ...entry };

  for (const field of SCALAR_FIELDS) {
    const value = overrides[`kb.${entry.id}.${field}`];
    if (typeof value === "string") {
      next[field] = value;
    }
  }

  for (const field of ARRAY_FIELDS) {
    next[field] = entry[field].map((item, index) => {
      const value = overrides[`kb.${entry.id}.${field}.${index}`];
      return typeof value === "string" ? value : item;
    });
  }

  return next;
}

export function loadKnowledge(): KnowledgeEntry[] {
  const overrides = loadOverrides();
  const projects = loadRawKnowledge().map((entry) => applyEntryOverrides(entry, overrides));
  return [...projects, ...loadProfileEntries()];
}

export function isSensitiveQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return (
    sensitiveTerms.some((term) => normalized.includes(term)) ||
    sensitivePatterns.some((pattern) => pattern.test(normalized))
  );
}

export function retrieve(question: string, limit = 4): SearchResult[] {
  const knowledge = loadKnowledge();
  const queryTerms = expandTerms(tokenize(question));

  const scored = knowledge
    .map((entry) => {
      const haystack = entryToSearchText(entry);
      const tokens = new Set(tokenize(haystack));
      const lowerHaystack = haystack.toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (tokens.has(term)) {
          score += 4;
          continue;
        }
        if (lowerHaystack.includes(term)) {
          score += 2;
          continue;
        }
        // 한국어 조사 허용: 질의 토큰이 KB 토큰을 품으면 부분 매칭 (예: "취미가" ⊇ "취미", "년생이야" ⊇ "년생")
        for (const token of tokens) {
          if (token.length >= 2 && term.length > token.length && term.includes(token)) {
            score += 1;
            break;
          }
        }
      }

      for (const tag of entry.tags) {
        const normalizedTag = tag.toLowerCase();
        if (question.toLowerCase().includes(normalizedTag)) {
          score += 6;
        }
      }

      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

type IndexedEntry = { entry: KnowledgeEntry; vector: number[] };

let semanticIndex: { signature: string; items: IndexedEntry[] } | null = null;

function knowledgeSignature(entries: KnowledgeEntry[]): string {
  return entries.map((entry) => `${entry.id}:${entryToSearchText(entry).length}`).join("|");
}

async function buildIndex(entries: KnowledgeEntry[]): Promise<IndexedEntry[] | null> {
  const signature = knowledgeSignature(entries);
  if (semanticIndex && semanticIndex.signature === signature) {
    return semanticIndex.items;
  }

  const vectors = await embed(entries.map((entry) => entryToSearchText(entry)));
  if (!vectors) {
    return null;
  }

  const items = entries.map((entry, index) => ({ entry, vector: vectors[index] }));
  semanticIndex = { signature, items };
  return items;
}

/**
 * Vector (semantic) retrieval: embeds the KB once (cached, re-embedded when the
 * KB text changes) and the question, then ranks by cosine similarity. Falls
 * back to keyword retrieval when Vertex embeddings are unavailable or fail.
 */
export async function retrieveSemantic(question: string, limit = 4): Promise<SearchResult[]> {
  if (embeddingsEnabled()) {
    const index = await buildIndex(loadKnowledge());
    if (index) {
      const queryVectors = await embed([question]);
      if (queryVectors) {
        const query = queryVectors[0];
        return index
          .map(({ entry, vector }) => ({ ...entry, score: cosineSimilarity(query, vector) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }
    }
  }

  return retrieve(question, limit);
}

export function answerLocally(question: string, results: SearchResult[]): ChatResponse {
  if (isSensitiveQuestion(question)) {
    return {
      mode: "blocked",
      answer:
        "이 포트폴리오 챗봇은 공개 가능한 경력 정보만 답합니다. 계정, 비밀번호, IP, VPN, 원격 접속 정보 같은 내부 운영 정보는 답변하지 않도록 막아 두었습니다.",
      sources: []
    };
  }

  if (results.length === 0) {
    return {
      mode: "local",
      answer:
        "공개 경력 KB에서 바로 연결되는 근거를 찾지 못했습니다. 질문을 Enhans 적합성, 청송양수 고진동, 추진전동기 보고서, 경주풍력 Digital Twin, Modbus Mapping Skill, 폐쇄망 OnlineTSI, 산업용 인터페이스, Edge Computing, 펌웨어 디버깅 중 하나로 좁혀 주면 더 정확하게 답할 수 있습니다.",
      sources: []
    };
  }

  if (isImpactQuestion(question)) {
    const sources = results.filter((result) => result.id !== "enhans-positioning");
    return {
      mode: "local",
      answer: [
        "공개 KB에는 매출, 비용 절감률처럼 강한 비즈니스 수치가 아직 정리되어 있지 않습니다. 그래서 과장된 수치 대신 확인 가능한 운영 근거로 답합니다.",
        "대표 근거는 VibLowExplorer 기능/UX 수정 11건, Modbus 125 register read limit 반영, DtEdgeServer v1.0.2 배포 검증, 폐쇄망 OnlineTSI 운영 제약 정리입니다.",
        "추가로 면접 전에는 각 프로젝트별 본인 주도 범위, 전후 소요시간, 오류 감소, 고객 검토 결과를 원본 기록에서 더 뽑아 보강하는 것이 좋습니다."
      ].join("\n\n"),
      sources: toSources((sources.length ? sources : results).slice(0, 4))
    };
  }

  const [primary] = results;
  const answer = [primary.summary, primary.highlights[0]]
    .filter(Boolean)
    .join(" ");

  return {
    mode: "local",
    answer,
    sources: toSources([primary])
  };
}

function isImpactQuestion(question: string) {
  const terms = ["성과", "임팩트", "수치", "줄였", "개선", "효과", "result", "impact", "metric"];
  const normalized = question.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function toSources(results: SearchResult[]) {
  return results.map((result) => ({
    id: result.id,
    title: result.title,
    category: result.category,
    summary: result.summary
  }));
}

function entryToSearchText(entry: KnowledgeEntry) {
  return [
    entry.id,
    entry.title,
    entry.period,
    entry.category,
    entry.summary,
    ...entry.highlights,
    ...entry.technologies,
    ...entry.evidence,
    ...entry.tags
  ].join(" ");
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize("NFKC")
      .match(/[a-z0-9+#.&-]+|[가-힣]{2,}/g) ?? []
  );
}

function expandTerms(terms: string[]) {
  const expanded = new Set<string>();

  for (const term of terms) {
    expanded.add(term);
    const extra = expansionMap[term];
    if (extra) {
      for (const item of extra) {
        expanded.add(item.toLowerCase());
      }
    }
  }

  return expanded;
}
