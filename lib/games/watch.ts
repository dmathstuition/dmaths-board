// Watching a learner play: while a game is out on the phones, each learner's
// game sends a small snapshot — score, time left, the question on screen, the
// last answer — and the teacher sees everyone's scores live, and can open one
// learner to follow their game as they play. Pure.
export type Phase = "intro" | "countdown" | "playing" | "over";
export type Now = { lead?: string; prompt: string; options?: string[]; status?: string };
export type Last = { n: number; ok: boolean; prompt: string; answer?: string };
export type LiveSnap = { phase: Phase; left: number; score: number; correct: number; attempts: number; streak: number; best: number; now?: Now; last?: Last };
export type Live = LiveSnap & { by: string; name: string; game: string; at: number; feed: Last[] };

const PHASES: Phase[] = ["intro", "countdown", "playing", "over"];
const num = (v: unknown, hi: number) => Math.max(0, Math.min(hi, Math.round(Number(v) || 0)));
const text = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

export function cleanNow(v: unknown): Now | undefined {
  const x = (v && typeof v === "object" ? v : null) as any;
  if (!x || !text(x.prompt, 200)) return undefined;
  return { ...(text(x.lead, 160) ? { lead: text(x.lead, 160) } : {}), prompt: text(x.prompt, 200),
    ...(Array.isArray(x.options) ? { options: x.options.slice(0, 6).map((o: unknown) => text(o, 80)).filter(Boolean) } : {}),
    ...(text(x.status, 120) ? { status: text(x.status, 120) } : {}) };
}
export function cleanLast(v: unknown): Last | undefined {
  const x = (v && typeof v === "object" ? v : null) as any;
  if (!x || !text(x.prompt, 200)) return undefined;
  return { n: num(x.n, 1000), ok: x.ok === true, prompt: text(x.prompt, 200), ...(text(x.answer, 80) ? { answer: text(x.answer, 80) } : {}) };
}
export function cleanSnap(v: unknown): LiveSnap | null {
  const x = (v && typeof v === "object" ? v : null) as any;
  if (!x || !PHASES.includes(x.phase)) return null;
  const correct = num(x.correct, 1000), attempts = Math.max(correct, num(x.attempts, 2000));
  return { phase: x.phase, left: num(x.left, 600), score: num(x.score, 10_000), correct, attempts, streak: num(x.streak, 1000), best: num(x.best, 10_000), now: cleanNow(x.now), last: cleanLast(x.last) };
}
// The last answers, newest first, without repeats.
export function addToFeed(feed: Last[], last: Last | undefined, max = 12): Last[] {
  if (!last || feed.some((f) => f.n === last.n && f.prompt === last.prompt)) return feed;
  return [last, ...feed].slice(0, max);
}
export const accuracy = (l: Pick<LiveSnap, "correct" | "attempts">) => (l.attempts ? Math.round((l.correct / l.attempts) * 100) : null);
export const rankLive = (list: Live[]) => [...list].sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));
export const PHASE_LABEL: Record<Phase, string> = { intro: "Getting ready", countdown: "Starting…", playing: "Playing", over: "Finished" };
// A phone that hasn't been heard from for a while has probably left the game.
export const isStale = (l: Pick<Live, "at" | "phase">, now = Date.now()) => l.phase !== "over" && now - l.at > 15_000;

// ── A learner's rounds, from the saved scores ──
export type RoundRow = { game_id: string; difficulty: string; score: number; correct: number; attempts: number; created_at: string; student_id?: string; name?: string };
export type PlayerSummary = { id: string; name: string; rounds: number; best: number; total: number; accuracy: number | null; last: string | null };
export function summarise(rows: RoundRow[]): PlayerSummary[] {
  const by = new Map<string, PlayerSummary & { c: number; a: number }>();
  for (const r of rows) {
    const id = r.student_id ?? r.name ?? "?", s = by.get(id) ?? { id, name: r.name ?? "Learner", rounds: 0, best: 0, total: 0, accuracy: null, last: null, c: 0, a: 0 };
    s.rounds++; s.best = Math.max(s.best, r.score); s.total += r.score; s.c += r.correct; s.a += r.attempts;
    if (!s.last || r.created_at > s.last) s.last = r.created_at;
    by.set(id, s);
  }
  return [...by.values()].map(({ c, a, ...s }) => ({ ...s, accuracy: a ? Math.round((c / a) * 100) : null })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
