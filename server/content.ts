import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const contentPath = path.join(rootDir, "data", "content-overrides.json");

export type ContentOverrides = Record<string, string>;

let cache: ContentOverrides | null = null;

export function loadOverrides(): ContentOverrides {
  if (cache) {
    return cache;
  }

  try {
    const raw = fs.readFileSync(contentPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    cache = isStringRecord(parsed) ? parsed : {};
  } catch {
    cache = {};
  }

  return cache;
}

export function saveOverrides(patch: ContentOverrides): ContentOverrides {
  const current = loadOverrides();
  const next: ContentOverrides = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string") {
      next[key] = value;
    }
  }

  fs.writeFileSync(contentPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  cache = next;
  return next;
}

function isStringRecord(value: unknown): value is ContentOverrides {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}
