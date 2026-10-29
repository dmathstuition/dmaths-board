// "Got it / I'm lost" and quick polls on the class board.
//
// Pulse: each learner can show 👍 (got it) or 😕 (I'm lost). Their screen
// repeats the signal every few seconds, so the teacher's count drops anyone
// who has left (a signal older than PULSE_TTL no longer counts).
//
// Poll: the teacher asks a question with 2–6 choices; learners tap one (and
// may change it); the teacher sees the count for each choice and can show
// the results to the class.

export type Pulse = "up" | "lost";
export type PulseEntry = { by: string; name: string; v: Pulse; at: number };
export const PULSE_EVERY_MS = 15_000;
export const PULSE_TTL_MS = 40_000;

export function cleanPulse(p: unknown, now = Date.now()): PulseEntry | null {
  const x = p as any;
  if (!x || typeof x.by !== "string" || !x.by) return null;
  if (x.v !== "up" && x.v !== "lost") return null;
  return { by: x.by.slice(0, 60), name: String(x.name ?? "Learner").slice(0, 60) || "Learner", v: x.v, at: now };
}

// Who is following and who is lost right now (newest signals only).
export function pulseNow(entries: Iterable<PulseEntry>, now = Date.now()) {
  const fresh = [...entries].filter((e) => now - e.at < PULSE_TTL_MS);
  const byName = (a: PulseEntry, b: PulseEntry) => a.name.localeCompare(b.name);
  return {
    up: fresh.filter((e) => e.v === "up").sort(byName),
    lost: fresh.filter((e) => e.v === "lost").sort(byName),
  };
}

export type PollRound = { id: string; q: string; options: string[]; open: boolean; reveal: number[] | null };
export const POLL_PRESETS: { id: string; label: string; options: string[] }[] = [
  { id: "yesno", label: "Yes / No", options: ["Yes", "No"] },
  { id: "abcd", label: "A B C D", options: ["A", "B", "C", "D"] },
  { id: "tf", label: "True / False", options: ["True", "False"] },
  { id: "confidence", label: "How sure are you?", options: ["😀 I've got it", "🙂 Nearly", "😟 Not yet"] },
];
export const MAX_POLL_OPTIONS = 6;
export const MAX_OPTION_LENGTH = 40;

// The teacher's own choices: one per line (or comma), 2–6 of them, no repeats.
export function cleanOptions(v: unknown): string[] {
  const list = Array.isArray(v) ? v : String(v ?? "").split(/\n|,/);
  const out: string[] = [];
  for (const raw of list) {
    const t = String(raw ?? "").trim().slice(0, MAX_OPTION_LENGTH);
    if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= MAX_POLL_OPTIONS) break;
  }
  return out;
}

export function cleanPoll(v: unknown): PollRound | null {
  const r = v as any;
  if (!r || typeof r.id !== "string" || !r.id) return null;
  const options = cleanOptions(r.options);
  if (options.length < 2) return null;
  const reveal = Array.isArray(r.reveal) ? options.map((_, i) => Math.max(0, Math.round(Number(r.reveal[i]) || 0))) : null;
  return { id: r.id.slice(0, 40), q: String(r.q ?? "").slice(0, 200), options, open: !!r.open, reveal };
}

export type Vote = { by: string; name: string; choice: number; v: number };
export function cleanVote(p: unknown, poll: PollRound | null): Vote | null {
  const x = p as any;
  if (!poll || !x || x.poll !== poll.id || typeof x.by !== "string" || !x.by) return null;
  const choice = Math.round(Number(x.choice));
  if (!Number.isInteger(choice) || choice < 0 || choice >= poll.options.length) return null;
  return { by: x.by.slice(0, 60), name: String(x.name ?? "Learner").slice(0, 60) || "Learner", choice, v: Number(x.v) || 0 };
}

// How many chose each option, who they were, and the share of the votes.
export function tally(poll: PollRound, votes: Iterable<Vote>) {
  const counts = poll.options.map(() => 0);
  const names: string[][] = poll.options.map(() => []);
  let total = 0;
  for (const v of votes) {
    if (v.choice < 0 || v.choice >= counts.length) continue;
    counts[v.choice]++; names[v.choice].push(v.name); total++;
  }
  names.forEach((n) => n.sort((a, b) => a.localeCompare(b)));
  const pct = counts.map((c) => (total ? Math.round((c / total) * 100) : 0));
  return { counts, names, total, pct };
}
