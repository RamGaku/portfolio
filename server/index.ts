import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { answerLocally, loadKnowledge, retrieveSemantic } from "./rag/retriever";
import { answerWithVertex, isVertexConfigured } from "./rag/vertex";
import { loadOverrides, saveOverrides } from "./content";
import { endSession, pingSession, startSession } from "./sessions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT ?? 8787);

const ADMIN_ID = process.env.ADMIN_ID ?? "admin42";
const ADMIN_PW = process.env.ADMIN_PW ?? "0909";
const sessions = new Set<string>();

const chatSchema = z.object({
  question: z.string().trim().min(2).max(500),
  term: z.boolean().optional()
});

const loginSchema = z.object({
  id: z.string().min(1).max(100),
  pw: z.string().min(1).max(100)
});

const contentSchema = z.record(z.string().max(200), z.string().max(5000));

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  if (
    req.method === "POST" &&
    req.path.startsWith("/api/session/") &&
    req.headers["content-type"]?.includes("text/plain")
  ) {
    // sendBeacon often posts as text/plain so express.json() doesn't parse it.
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: isVertexConfigured() ? "vertex-ready" : "local-kb",
    knowledgeCount: loadKnowledge().length
  });
});

app.get("/api/kb", (_req, res) => {
  const knowledge = loadKnowledge();
  res.json({
    count: knowledge.length,
    categories: [...new Set(knowledge.map((entry) => entry.category))],
    entries: knowledge.map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      summary: entry.summary
    }))
  });
});

app.post("/api/chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      answer: "질문은 2자 이상 500자 이하로 입력해 주세요.",
      mode: "blocked",
      sources: []
    });
    return;
  }

  const question = parsed.data.question;
  const term = parsed.data.term === true;
  const results = await retrieveSemantic(question);
  const vertexAnswer = await answerWithVertex(question, results, { term });
  res.json(vertexAnswer ?? answerLocally(question, results));
});

app.get("/api/content", (_req, res) => {
  res.json(loadOverrides());
});

const sessionStartSchema = z.object({
  referrer: z.string().max(2000).optional(),
  path: z.string().max(500).optional()
});

const sessionIdSchema = z.object({
  id: z.string().uuid()
});

function clientIp(req: express.Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.ip ?? "unknown";
}

app.post("/api/session/start", (req, res) => {
  const parsed = sessionStartSchema.safeParse(req.body ?? {});
  const referrer = parsed.success ? parsed.data.referrer ?? "" : "";
  const path = parsed.success ? parsed.data.path ?? "/" : "/";
  const ua = (req.headers["user-agent"] as string) ?? "";
  const session = startSession({ ip: clientIp(req), ua, referrer, path });
  if (!session) {
    res.json({ ok: false, reason: "skip" });
    return;
  }
  res.json({ ok: true, id: session.id });
});

app.post("/api/session/ping", (req, res) => {
  const parsed = sessionIdSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false });
    return;
  }
  res.json({ ok: pingSession(parsed.data.id) });
});

app.post("/api/session/end", (req, res) => {
  const parsed = sessionIdSchema.safeParse(req.body ?? {});
  if (parsed.success) {
    endSession(parsed.data.id);
  }
  res.json({ ok: true });
});

app.post("/api/admin/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success || parsed.data.id !== ADMIN_ID || parsed.data.pw !== ADMIN_PW) {
    res.status(401).json({ ok: false, error: "invalid_credentials" });
    return;
  }

  const token = randomUUID();
  sessions.add(token);
  res.json({ ok: true, token });
});

app.post("/api/content", (req, res) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token || !sessions.has(token)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "invalid_payload" });
    return;
  }

  const next = saveOverrides(parsed.data);
  res.json({ ok: true, count: Object.keys(next).length });
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.join(rootDir, "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Portfolio API listening on http://127.0.0.1:${port}`);
});
