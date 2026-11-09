// Two class tools: the buzzer (who answers first) and rewards (the teacher
// hands out a trophy, which every screen celebrates and which counts as a
// star on the leaderboard). Pure: rounds, buzzes, ordering and cleaning what
// arrives over the class channel.

// ── Buzzer ──
// Messages: "buzz-round" (teacher → all, signed, re-sent every few seconds)
// and "buzz" (learner → teacher). A buzz carries the learner's estimate of
// the server's clock, so a slow connection doesn't cost them their place.
export type BuzzRound = { id: string; q: string; open: boolean; locked: boolean; startedAt: number; top: { by: string; name: string; ms: number }[] };
export type Buzz = { by: string; name: string; at: number; heard: number };
export const BUZZ_SHOWN = 5; // how many places every screen sees

const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null; };

export function newBuzzRound(q: string, now: number): BuzzRound {
  return { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, q: q.trim().slice(0, 200), open: true, locked: false, startedAt: now, top: [] };
}

export function cleanBuzzRound(r: any): BuzzRound | null {
  if (!r || typeof r !== "object" || typeof r.id !== "string" || !r.id) return null;
  return {
    id: str(r.id, 40), q: str(r.q, 200), open: !!r.open, locked: !!r.locked, startedAt: num(r.startedAt) ?? 0,
    top: (Array.isArray(r.top) ? r.top : []).slice(0, BUZZ_SHOWN).filter((t: any) => t && typeof t.by === "string")
      .map((t: any) => ({ by: str(t.by, 80), name: str(t.name, 60) || "Learner", ms: Math.max(0, Math.round(num(t.ms) ?? 0)) })),
  };
}

// A buzz as it arrives. `now` is the teacher's server-clock time when it was
// heard: a buzz claiming to come from before the round started or from the
// future is pinned to a sensible time instead.
export function cleanBuzz(p: any, round: BuzzRound | null, now: number): Buzz | null {
  if (!round || !round.open || round.locked || !p || p.round !== round.id || typeof p.by !== "string" || !p.by) return null;
  const at = num(p.at);
  const claimed = at == null ? now : Math.min(now, Math.max(round.startedAt, at));
  return { by: str(p.by, 80), name: str(p.name, 60).trim() || "Learner", at: claimed, heard: now };
}

// Keep each learner's first buzz only.
export function addBuzz(list: Buzz[], b: Buzz | null): Buzz[] {
  if (!b || list.some((x) => x.by === b.by)) return list;
  return [...list, b];
}

// First to buzz first; a tie goes to whoever reached the teacher first.
export function buzzOrder(list: Buzz[]): Buzz[] {
  return [...list].sort((a, b) => a.at - b.at || a.heard - b.heard || a.by.localeCompare(b.by));
}

// The places every screen sees: names with time after the first buzz.
export function topOf(list: Buzz[]): BuzzRound["top"] {
  const order = buzzOrder(list), first = order[0]?.at ?? 0;
  return order.slice(0, BUZZ_SHOWN).map((b) => ({ by: b.by, name: b.name, ms: Math.round(b.at - first) }));
}
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

// ── Rewards ──
// Message "reward" (teacher → all, signed). Stored as one row each in
// board_game_scores (game_id "reward"), so it is one star on the leaderboard.
export const REWARD_REASONS = ["Great answer", "Hard work", "Helping others", "Good question", "Neat work", "Most improved", "First to buzz"];
export const REWARD_GAME_ID = "reward";
export type Reward = { id: string; to: string[]; names: string[]; reason: string; all: boolean };

export function cleanReward(p: any): Reward | null {
  if (!p || typeof p !== "object" || typeof p.id !== "string" || !Array.isArray(p.to)) return null;
  const to = p.to.filter((x: unknown) => typeof x === "string" && x).slice(0, 300).map((x: string) => x.slice(0, 80));
  if (!to.length) return null;
  return { id: str(p.id, 40), to, names: (Array.isArray(p.names) ? p.names : []).slice(0, 300).map((x: unknown) => str(x, 60)), reason: str(p.reason, 40).trim() || "Well done", all: !!p.all };
}
export const cleanReason = (r: unknown) => (typeof r === "string" && r.trim() ? r.trim().slice(0, 40) : "Well done");
