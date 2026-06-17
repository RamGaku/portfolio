import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { KnowledgeEntry } from "../types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profilePath = path.resolve(__dirname, "../..", "data", "profile.md");

/**
 * Reads data/profile.md and turns each level-2 (`##`) section into a
 * searchable knowledge entry for the RAG chatbot. Add to the markdown and
 * redeploy — no code change needed. These entries are RAG-only; the project
 * cards on the page come from public-kb.json, so profile content never renders
 * as a card.
 */
export function loadProfileEntries(): KnowledgeEntry[] {
  let raw: string;
  try {
    raw = fs.readFileSync(profilePath, "utf-8");
  } catch {
    return [];
  }

  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/); // level-2 only; "###" won't match
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.map((section, index) => {
    const bodyLines = section.body
      .map((line) => line.replace(/^\s*[-*]\s*/, "").replace(/^#+\s*/, "").trim())
      .filter(Boolean);
    const slug =
      section.title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "") || `section-${index + 1}`;

    return {
      id: `profile-${slug}`,
      title: section.title,
      period: "",
      category: "Profile",
      summary: `${section.title} — ${bodyLines.slice(0, 2).join(" / ")}`.slice(0, 300),
      highlights: bodyLines.slice(0, 30),
      technologies: [],
      evidence: [],
      tags: ["프로필", "인적사항", "경력", section.title]
    };
  });
}
