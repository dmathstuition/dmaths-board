// More class tools, all for learners who join with a PIN and a name (no
// accounts): class chat with reactions, the focus tools (lock screens, who's
// looking away, roll call) and watching a video together. Pure: what the
// messages hold, how they're cleaned as they arrive, and the sums.
//
// Nothing a learner sends reaches the class directly. Learners send to the
// teacher's screen ("chat-say", "react", "away", "rollcall-here"); the
// teacher's screen checks it and sends the signed result to everyone
// ("chat-state", "react-burst", "focus-lock", "rollcall", "watch"). So one
// learner can't pretend to be another, or the teacher.

const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const newId = (now: number) => `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export type Person = { id: string; name: string; online?: boolean };

// ── Chat ──
export type ChatMode = "off" | "open" | "approve"; // approve: the teacher lets each message through
export type ChatMsg = { id: string; by: string; name: string; text: string; at: number; host?: boolean };
export type ChatState = { mode: ChatMode; react: boolean; msgs: ChatMsg[] };
export const CHAT_MAX = 160, CHAT_KEEP = 30, CHAT_EVERY_MS = 2000;
export const CHAT_OFF: ChatState = { mode: "off", react: false, msgs: [] };

export const cleanChatText = (t: unknown) => str(t, CHAT_MAX);
function cleanMsg(m: any): ChatMsg | null {
  if (!m || typeof m !== "object" || typeof m.id !== "string") return null;
  const text = cleanChatText(m.text);
  if (!text) return null;
  return { id: str(m.id, 40), by: str(m.by, 80), name: str(m.name, 60) || "Learner", text, at: num(m.at) ?? 0, ...(m.host ? { host: true } : {}) };
}
export function cleanChatState(s: any): ChatState {
  if (!s || typeof s !== "object") return CHAT_OFF;
  const mode: ChatMode = s.mode === "open" || s.mode === "approve" ? s.mode : "off";
  return { mode, react: !!s.react, msgs: (Array.isArray(s.msgs) ? s.msgs : []).slice(-CHAT_KEEP).map(cleanMsg).filter((m: ChatMsg | null): m is ChatMsg => !!m) };
}
// What a learner sent, as the teacher's screen takes it: who they really are
// comes from the class list, not from the message.
export function takeSay(p: any, people: Person[], now: number): ChatMsg | null {
  if (!p || typeof p.by !== "string" || !p.by) return null;
  const text = cleanChatText(p.text);
  if (!text) return null;
  const who = people.find((x) => x.id === p.by);
  return { id: newId(now), by: str(p.by, 80), name: who?.name ?? (str(p.name, 60) || "Learner"), text, at: now };
}
// One message every couple of seconds from each learner.
export function mayPost(last: Map<string, number>, by: string, now: number, every = CHAT_EVERY_MS): boolean {
  if (now - (last.get(by) ?? -Infinity) < every) return false;
  last.set(by, now); return true;
}
export const addMsg = (msgs: ChatMsg[], m: ChatMsg) => [...msgs, m].slice(-CHAT_KEEP);

// ── Reactions ──
export const REACTIONS = ["👍", "👏", "❤️", "😂", "🤔", "🎉"];
export const REACT_EVERY_MS = 1200, BURST_MAX = 24;
export const cleanReaction = (e: unknown) => (typeof e === "string" && REACTIONS.includes(e) ? e : null);
export type Reaction = { e: string; by: string };
export function cleanBurst(p: any): Reaction[] {
  return (Array.isArray(p?.items) ? p.items : []).slice(0, BURST_MAX)
    .map((x: any) => ({ e: cleanReaction(x?.e), by: str(x?.by, 80) })).filter((x: { e: string | null }): x is Reaction => !!x.e);
}

// ── Focus: lock screens, who's looking away, roll call ──
export type FocusLock = { on: boolean; msg: string };
export const LOCK_DEFAULT = "Eyes on the teacher";
export const cleanLock = (p: any): FocusLock => ({ on: !!p?.on, msg: str(p?.msg, 80) || LOCK_DEFAULT });

export type Away = { by: string; name: string; away: boolean; at: number };
export function cleanAway(p: any, now: number): Away | null {
  if (!p || typeof p.by !== "string" || !p.by) return null;
  return { by: str(p.by, 80), name: str(p.name, 60) || "Learner", away: !!p.away, at: now };
}
// Learners who are in the class but looking at something else, longest first.
export function awayNow(entries: Iterable<Away>, people: Person[]): Away[] {
  const here = new Map(people.filter((p) => p.online !== false).map((p) => [p.id, p.name]));
  return [...entries].filter((e) => e.away && here.has(e.by)).map((e) => ({ ...e, name: here.get(e.by) ?? e.name })).sort((a, b) => a.at - b.at);
}

export const ROLL_SECONDS = 30;
export type RollCall = { id: string; endsAt: number; open: boolean };
export const newRollCall = (now: number, seconds = ROLL_SECONDS): RollCall => ({ id: newId(now), endsAt: now + seconds * 1000, open: true });
export function cleanRollCall(r: any): RollCall | null {
  if (!r || typeof r.id !== "string" || !r.id) return null;
  return { id: str(r.id, 40), endsAt: num(r.endsAt) ?? 0, open: !!r.open };
}
export const rollLeft = (r: RollCall | null, now: number) => (r && r.open ? Math.max(0, Math.ceil((r.endsAt - now) / 1000)) : 0);
// Who answered, and who was in the class but didn't.
export function rollResult(people: Person[], answered: Iterable<string>) {
  const yes = new Set(answered), online = people.filter((p) => p.online !== false);
  return { here: online.filter((p) => yes.has(p.id)), missing: online.filter((p) => !yes.has(p.id)) };
}

// ── Watch a video together ──
// The teacher's player leads: `pos` seconds at server time `at`, playing or not.
export type Watch = { id: string; video: string; playing: boolean; pos: number; at: number; open: boolean };
// A YouTube link in any of its usual shapes → the video's id.
export function videoId(link: string): string | null {
  const t = String(link ?? "").trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    id = m ? m[1] : u.pathname === "/watch" ? u.searchParams.get("v") : null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
export const newWatch = (video: string, now: number): Watch => ({ id: newId(now), video, playing: false, pos: 0, at: now, open: true });
export function cleanWatch(w: any): Watch | null {
  if (!w || typeof w.id !== "string" || typeof w.video !== "string" || !/^[\w-]{11}$/.test(w.video)) return null;
  return { id: str(w.id, 40), video: w.video, playing: !!w.playing, pos: Math.max(0, num(w.pos) ?? 0), at: num(w.at) ?? 0, open: !!w.open };
}
// Where the video should be now.
export const expectedPos = (w: Watch, now: number) => (w.playing ? w.pos + Math.max(0, now - w.at) / 1000 : w.pos);
export const SEEK_TOLERANCE = 2;
// What a follower's player must do to match the teacher's: nothing, play, pause, and/or jump.
export function follow(w: Watch, mine: { playing: boolean; pos: number }, now: number, tolerance = SEEK_TOLERANCE): { play?: boolean; seek?: number } {
  const want = expectedPos(w, now), out: { play?: boolean; seek?: number } = {};
  if (w.playing !== mine.playing) out.play = w.playing;
  if (Math.abs(mine.pos - want) > (w.playing ? tolerance : 1)) out.seek = Math.round(want * 10) / 10;
  return out;
}
// The teacher's player moved: is it news for the class? (play/pause, or a jump)
export function changed(w: Watch, mine: { playing: boolean; pos: number }, now: number): boolean {
  return w.playing !== mine.playing || Math.abs(mine.pos - expectedPos(w, now)) > 1.2;
}
export const embedUrl = (video: string, origin: string, controls: boolean) =>
  `https://www.youtube-nocookie.com/embed/${video}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1&controls=${controls ? 1 : 0}&origin=${encodeURIComponent(origin)}`;
