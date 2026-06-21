import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

type SessionEntry = {
  id: string;
  startedAt: number;
  lastPing: number;
  ua: string;
  ip: string;
  referrer: string;
  path: string;
  interacted: boolean;
  notified: boolean;
  sections: Record<string, number>;
  chats: number;
};

const entries = new Map<string, SessionEntry>();

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const MIN_DURATION_MS = 5 * 1000;
const CLEANUP_AFTER_MS = 30 * 60 * 1000;

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
      })
    : null;

const SKIP_UA_PATTERNS = [
  /\bbot\b/i,
  /crawler/i,
  /spider/i,
  /preview/i,
  /headless/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /slackbot/i,
  /twitterbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /discordbot/i,
  /pingdom/i,
  /uptimerobot/i,
  /lighthouse/i,
  /chrome-lighthouse/i,
  /gptbot/i,
  /claudebot/i,
  /amazonbot/i,
  /bingbot/i,
  /googlebot/i,
  /yandexbot/i,
  /baiduspider/i
];

function isSkipUa(ua: string): boolean {
  if (!ua) return true;
  return SKIP_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatKstTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

async function notifyOwner(entry: SessionEntry) {
  if (!transporter || !NOTIFY_EMAIL) {
    console.warn("[sessions] mailer not configured (env), skipping");
    return;
  }

  if (!entry.interacted) {
    console.log("[sessions] no interaction signal, skipping", { id: entry.id });
    return;
  }

  const durationMs = entry.lastPing - entry.startedAt;
  if (durationMs < MIN_DURATION_MS) {
    console.log("[sessions] duration under threshold, skipping", { id: entry.id, durationMs });
    return;
  }

  const startedAtKst = formatKstTime(entry.startedAt);
  const duration = formatDuration(durationMs);
  const referrer = entry.referrer || "(direct)";

  const dwellLines = Object.entries(entry.sections)
    .filter(([, ms]) => ms >= 2000)
    .sort(([, a], [, b]) => b - a)
    .map(([label, ms]) => `  ${label.padEnd(28)} ${formatDuration(ms)}`);

  const body: string[] = [
    `Session summary:`,
    ``,
    `Started: ${startedAtKst} (KST)`,
    `Duration: ${duration}`,
    `Path: ${entry.path}`,
    `Referrer: ${referrer}`,
    `IP: ${entry.ip}`,
    `User-Agent: ${entry.ua}`
  ];

  if (dwellLines.length > 0) {
    body.push("", `Section dwell:`, ...dwellLines);
  }

  if (entry.chats > 0) {
    body.push("", `Chat prompts sent: ${entry.chats}`);
  }

  body.push("", `ID: ${entry.id}`);

  try {
    await transporter.sendMail({
      from: `Site Notes <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `Site session — ${duration}`,
      text: body.join("\n")
    });
    console.log("[sessions] notified", { id: entry.id, duration });
  } catch (error) {
    console.error("[sessions] notify failed", error);
  }
}

export function startSession(input: {
  ip: string;
  ua: string;
  referrer: string;
  path: string;
}): { id: string } | null {
  if (isSkipUa(input.ua)) {
    return null;
  }

  const id = randomUUID();
  const now = Date.now();
  entries.set(id, {
    id,
    startedAt: now,
    lastPing: now,
    ua: input.ua,
    ip: input.ip,
    referrer: input.referrer,
    path: input.path,
    interacted: false,
    notified: false,
    sections: {},
    chats: 0
  });
  return { id };
}

type SessionUpdate = {
  interacted?: boolean;
  sections?: Record<string, number>;
  chats?: number;
};

function mergeUpdate(entry: SessionEntry, update: SessionUpdate) {
  if (update.interacted) entry.interacted = true;
  if (update.sections) {
    for (const [key, value] of Object.entries(update.sections)) {
      if (typeof value === "number" && value > (entry.sections[key] ?? 0)) {
        entry.sections[key] = value;
      }
    }
  }
  if (typeof update.chats === "number" && update.chats > entry.chats) {
    entry.chats = update.chats;
  }
}

export function pingSession(id: string, update: SessionUpdate = {}): boolean {
  const entry = entries.get(id);
  if (!entry) return false;
  entry.lastPing = Date.now();
  mergeUpdate(entry, update);
  return true;
}

export function endSession(id: string, update: SessionUpdate = {}): void {
  const entry = entries.get(id);
  if (!entry || entry.notified) return;
  mergeUpdate(entry, update);
  entry.notified = true;
  entry.lastPing = Date.now();
  void notifyOwner(entry);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of entries) {
    if (!entry.notified && now - entry.lastPing > IDLE_TIMEOUT_MS) {
      entry.notified = true;
      void notifyOwner(entry);
    }
    if (now - entry.lastPing > CLEANUP_AFTER_MS) {
      entries.delete(id);
    }
  }
}, 60 * 1000).unref?.();
