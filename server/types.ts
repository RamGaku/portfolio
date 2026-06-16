export type KnowledgeEntry = {
  id: string;
  title: string;
  period: string;
  category: string;
  summary: string;
  highlights: string[];
  technologies: string[];
  evidence: string[];
  tags: string[];
};

export type SearchResult = KnowledgeEntry & {
  score: number;
};

export type ChatSource = {
  id: string;
  title: string;
  category: string;
  summary: string;
};

export type ChatResponse = {
  answer: string;
  mode: "local" | "vertex" | "local-fallback" | "vertex-empty-fallback" | "blocked";
  sources: ChatSource[];
};
