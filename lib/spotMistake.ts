// Spot the mistake: the A.I. (or the teacher) writes a worked solution with ONE
// deliberate error. Learners find the wrong line on their phones; the teacher
// sees who found it, then reveals the fix. The answer (which line, why, the
// fix) stays on the teacher's screen until they reveal it. Pure.
import { WORK_LEVELS } from "@/lib/classWorkAi";

export type SpotKey = { wrong: number; why: string; fix: string };
// What learners get. The answer is only added once the teacher reveals it.
export type SpotRound = { id: string; title: string; question: string; lines: string[]; open: boolean; revealed: boolean } & Partial<SpotKey>;
export type SpotDraft = { title: string; question: string; lines: string[] } & SpotKey;
export type SpotPick = { name: string; line: number };

export const MIN_LINES = 3, MAX_LINES = 9;
export const ERROR_KINDS = ["any", "sign error", "arithmetic slip", "wrong rule or formula", "wrong step order", "unit or rounding"] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];

export const SPOT_SYSTEM = `You write "spot the mistake" tasks for a teacher's live maths or science lesson. Learners read a worked solution line by line on their phones and tap the ONE line that contains the mistake.
Reply with JSON only: {"title":"...","question":"...","lines":["...","..."],"wrong":2,"why":"...","fix":"..."}
- question: the problem being solved, one sentence (max 200 characters).
- lines: the worked solution as 4 to 7 short lines, one step each (max 120 characters per line). Plain text maths: × ÷ − ², √, π, fractions like 3/4.
- wrong: the 0-based index of the ONE line that contains the error. Every other line must be correct, and each line must follow correctly from the line before it EXCEPT that the error line is wrong. Lines after the error should follow from the wrong line (so the final answer is wrong).
- why: what is wrong in that line and why it's wrong (max 250 characters).
- fix: the corrected line (max 120 characters).
The error should be a realistic mistake a learner would actually make, not a typo. Vary which line is wrong — not always the middle.`;

export function spotPrompt(o: { topic: string; level?: string; kind?: string; subject?: string }): string {
  const kind = ERROR_KINDS.includes(o.kind as ErrorKind) && o.kind !== "any" ? ` Kind of mistake: ${o.kind}.` : "";
  return `Subject: ${o.subject?.trim() || "Mathematics"}. Level: ${o.level?.trim() || "secondary school"}. Topic: ${o.topic.trim()}.${kind} Write one task.`;
}
export const SPOT_LEVELS = WORK_LEVELS;

const text = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
// A task, tidied. null unless it has enough lines and a valid wrong line.
export function cleanSpot(v: unknown): SpotDraft | null {
  const x = (v && typeof v === "object" ? v : {}) as any;
  const lines = (Array.isArray(x.lines) ? x.lines : []).map((l: unknown) => text(l, 160)).filter(Boolean).slice(0, MAX_LINES);
  const wrong = Math.round(Number(x.wrong));
  if (lines.length < MIN_LINES || !(wrong >= 0 && wrong < lines.length)) return null;
  return { title: text(x.title, 80) || "Spot the mistake", question: text(x.question, 220), lines, wrong, why: text(x.why, 300), fix: text(x.fix, 160) };
}
export function cleanSpotRound(v: unknown): SpotRound | null {
  const x = (v && typeof v === "object" ? v : {}) as any;
  const id = text(x.id, 40), lines = (Array.isArray(x.lines) ? x.lines : []).map((l: unknown) => text(l, 160)).filter(Boolean).slice(0, MAX_LINES);
  if (!id || lines.length < MIN_LINES) return null;
  const out: SpotRound = { id, title: text(x.title, 80) || "Spot the mistake", question: text(x.question, 220), lines, open: x.open !== false, revealed: x.revealed === true };
  if (out.revealed) {
    const wrong = Math.round(Number(x.wrong));
    if (!(wrong >= 0 && wrong < lines.length)) out.revealed = false;
    else { out.wrong = wrong; out.why = text(x.why, 300); out.fix = text(x.fix, 160); }
  }
  return out;
}
// The round sent to everyone: the answer only once revealed.
export const publicSpot = (d: SpotDraft, id: string, open: boolean, revealed: boolean): SpotRound =>
  ({ id, title: d.title, question: d.question, lines: d.lines, open, revealed, ...(revealed ? { wrong: d.wrong, why: d.why, fix: d.fix } : {}) });

// ── Who picked what ──
export type Tally = { counts: number[]; right: string[]; wrongPick: string[]; total: number };
export function tallyPicks(picks: Record<string, SpotPick>, lineCount: number, wrong: number): Tally {
  const counts = new Array(lineCount).fill(0) as number[], right: string[] = [], wrongPick: string[] = [];
  for (const p of Object.values(picks)) {
    if (!(p.line >= 0 && p.line < lineCount)) continue;
    counts[p.line]++;
    (p.line === wrong ? right : wrongPick).push(p.name);
  }
  return { counts, right, wrongPick, total: counts.reduce((a, b) => a + b, 0) };
}
export const cleanPick = (v: unknown, lineCount: number): number | null => { const n = Math.round(Number(v)); return n >= 0 && n < lineCount ? n : null; };
