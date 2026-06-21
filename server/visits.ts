import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

type Session = {
  id: string;
  startedAt: number;
  lastPing: number;
  ua: string;
  ip: string;
  referrer: string;
  path: string;
  emailSent: boolean;
};

const sessions = new Map<string, Session>();

const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3분 idle → 종료로 간주
const MIN_DURATION_MS = 5 * 1000; // 5초 미만은 메일 안 보냄 (봇·실수 방지)
const CLEANUP_AFTER_MS = 30 * 60 * 1000; // 30분 후 메모리에서 삭제

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

const BOT_PATTERNS = [
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

function isBot(ua: string): boolean {
  if (!ua) return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(ua));
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}초`;
  return `${minutes}분 ${seconds}초`;
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

async function sendVisitEmail(session: Session) {
  if (!transporter || !NOTIFY_EMAIL) {
    console.warn("[visits] GMAIL_USER/GMAIL_APP_PASSWORD/NOTIFY_EMAIL 누락, 메일 발송 스킵");
    return;
  }

  const durationMs = session.lastPing - session.startedAt;
  if (durationMs < MIN_DURATION_MS) {
    console.log("[visits] 체류시간 5초 미만, 메일 스킵", { id: session.id, durationMs });
    return;
  }

  const startedAtKst = formatKstTime(session.startedAt);
  const duration = formatDuration(durationMs);
  const referrer = session.referrer || "(직접 방문)";

  try {
    await transporter.sendMail({
      from: `Portfolio Visits <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject: `포트폴리오 방문 — ${duration} 체류`,
      text: [
        `포트폴리오 사이트 방문이 감지됐습니다.`,
        ``,
        `시작 시각: ${startedAtKst} (KST)`,
        `체류 시간: ${duration}`,
        `진입 경로: ${session.path}`,
        `유입처: ${referrer}`,
        `IP: ${session.ip}`,
        `User-Agent: ${session.ua}`,
        ``,
        `Session ID: ${session.id}`
      ].join("\n")
    });
    console.log("[visits] 메일 발송 완료", { id: session.id, duration });
  } catch (error) {
    console.error("[visits] 메일 발송 실패", error);
  }
}

export function startSession(input: {
  ip: string;
  ua: string;
  referrer: string;
  path: string;
}): { id: string } | null {
  if (isBot(input.ua)) {
    return null;
  }

  const id = randomUUID();
  const now = Date.now();
  sessions.set(id, {
    id,
    startedAt: now,
    lastPing: now,
    ua: input.ua,
    ip: input.ip,
    referrer: input.referrer,
    path: input.path,
    emailSent: false
  });
  return { id };
}

export function pingSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  session.lastPing = Date.now();
  return true;
}

export function endSession(id: string): void {
  const session = sessions.get(id);
  if (!session || session.emailSent) return;
  session.emailSent = true;
  session.lastPing = Date.now();
  void sendVisitEmail(session);
}

// 주기적으로 idle 세션 정리 + 메일 발송
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (!session.emailSent && now - session.lastPing > SESSION_TIMEOUT_MS) {
      session.emailSent = true;
      void sendVisitEmail(session);
    }
    if (now - session.lastPing > CLEANUP_AFTER_MS) {
      sessions.delete(id);
    }
  }
}, 60 * 1000).unref?.();
