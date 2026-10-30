// SERVER ONLY — built-in class voice through Cloudflare Realtime (an SFU: each
// phone sends its microphone to Cloudflare once, and Cloudflare passes it on to
// everyone listening).
//
// Settings (Vercel → Environment Variables):
//   CF_REALTIME_APP_ID, CF_REALTIME_APP_TOKEN   — Cloudflare dashboard → Realtime → SFU → your app
//   CF_TURN_KEY_ID, CF_TURN_KEY_TOKEN (optional) — Realtime → TURN Server, for networks that block direct audio
import crypto from "crypto";

const API = "https://rtc.live.cloudflare.com/v1";
const appId = () => process.env.CF_REALTIME_APP_ID?.trim() ?? "";
const appToken = () => process.env.CF_REALTIME_APP_TOKEN?.trim() ?? "";
export const voiceConfigured = () => !!(appId() && appToken());

const secret = () => process.env.BOARD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dmaths-voice";
const mac = (s: string) => crypto.createHmac("sha256", secret()).update(`voice|${s}`).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// A ticket ties a Cloudflare session to the person who opened it in this class,
// so nobody else can add or remove tracks on it.
export const sessionTicket = (classId: string, who: string, cfSession: string) => mac(`s|${classId}|${who}|${cfSession}`);
export const ticketOk = (classId: string, who: string, cfSession: string, ticket: unknown) =>
  typeof ticket === "string" && !!cfSession && same(ticket, sessionTicket(classId, who, cfSession));

// A speaking pass: the teacher lets one learner use their microphone for a while.
export const SPEAK_MS = 2 * 60 * 60 * 1000;
export const speakPass = (classId: string, learner: string, exp: number) => mac(`p|${classId}|${learner}|${exp}`);
export const passOk = (classId: string, learner: string, pass: unknown, exp: unknown, now = Date.now()) =>
  typeof pass === "string" && Number(exp) > now && same(pass, speakPass(classId, learner, Number(exp)));

// Each person's microphone has a fixed track name, so nobody can speak as someone else.
export const micTrack = (who: string) => `mic-${who}`.slice(0, 64);

export const cleanId = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(v) ? v : "");
export const cleanSdp = (v: unknown) => (typeof v === "string" && v.startsWith("v=0") && v.length < 60_000 ? v : "");

export class VoiceError extends Error { constructor(message: string, public status = 502) { super(message); } }

// One call to the Cloudflare Realtime API for this app.
export async function cf<T = any>(path: string, init: { method: "POST" | "PUT" | "GET"; body?: unknown }): Promise<T> {
  const r = await fetch(`${API}/apps/${appId()}${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${appToken()}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => null);
  if (!r) throw new VoiceError("The voice service didn't answer. Check the connection and try again.");
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || j?.errorCode) throw new VoiceError(j?.errorDescription || `The voice service said no (${r.status}).`, r.status === 401 ? 503 : 502);
  return j as T;
}

// Servers that help phones on strict networks reach Cloudflare. Without a TURN
// key, Cloudflare's free STUN servers.
export async function iceServers(): Promise<RTCIceServerLike[]> {
  const id = process.env.CF_TURN_KEY_ID?.trim(), token = process.env.CF_TURN_KEY_TOKEN?.trim();
  const stun: RTCIceServerLike[] = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] }];
  if (!id || !token) return stun;
  const r = await fetch(`${API}/turn/keys/${id}/credentials/generate-ice-servers`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: 6 * 60 * 60 }), signal: AbortSignal.timeout(8000), cache: "no-store",
  }).catch(() => null);
  const j = r?.ok ? ((await r.json().catch(() => null)) as any) : null;
  const list = Array.isArray(j?.iceServers) ? j.iceServers : j?.iceServers ? [j.iceServers] : null;
  return list?.length ? list : stun;
}
export type RTCIceServerLike = { urls: string | string[]; username?: string; credential?: string };
