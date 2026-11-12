// A practical lesson the way it runs in a real lab:
//   1. "Watch me": the teacher does the practical and every learner's screen
//      shows the teacher's bench, live ("lab-demo", teacher → all, signed).
//   2. "Your turn": each learner does it on their own device, with the task
//      the teacher gave ("lab-open" carries the mode and the task).
//   3. The teacher watches everyone's progress and observations and can send
//      one learner a word of help ("lab-nudge", teacher → all, signed, { to }).
// Pure: what travels, and how it's checked on arrival.

export type LabMode = "watch" | "try";
export type DemoMove = { id: string; x: number; y: number; tilt: number };
export type DemoPour = { x: number; y: number; colour: string; drops: boolean };
// One picture of the teacher's bench: where the practical is up to and what's moving.
export type DemoFrame = {
  slug: string; id: number; step: number;
  s: unknown;                               // the practical's state (plain data: see the unit test)
  values: Record<string, string>; notes: Record<number, string>; shown: string[];
  move: DemoMove | null; pour: DemoPour | null; holding: boolean; setVal: number | null;
};
export type Nudge = { to: string; text: string; at: number };

const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
const fin = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const MAX_STATE = 60_000; // characters: a practical's state is a few kB

export function cleanMode(v: unknown): LabMode { return v === "watch" ? "watch" : "try"; }
export function cleanTask(v: unknown): string { return str(v, 400).trim(); }

export function cleanFrame(v: unknown): DemoFrame | null {
  const f = v as Partial<DemoFrame> | null;
  if (!f || typeof f !== "object" || typeof f.slug !== "string" || !f.slug) return null;
  let s: unknown;
  try { const t = JSON.stringify(f.s ?? null); if (t.length > MAX_STATE) return null; s = JSON.parse(t); } catch { return null; }
  const values: Record<string, string> = {};
  for (const [k, x] of Object.entries(f.values && typeof f.values === "object" ? f.values : {}).slice(0, 200)) values[str(k, 60)] = str(x, 80);
  const notes: Record<number, string> = {};
  for (const [k, x] of Object.entries(f.notes && typeof f.notes === "object" ? f.notes : {}).slice(0, 200)) if (Number.isInteger(Number(k))) notes[Number(k)] = str(x, 400);
  const m = f.move as DemoMove | null, p = f.pour as DemoPour | null;
  return {
    slug: str(f.slug, 60), id: fin(f.id), step: Math.max(0, Math.min(500, Math.round(fin(f.step)))), s, values, notes,
    shown: (Array.isArray(f.shown) ? f.shown : []).slice(0, 200).map((x) => str(x, 60)),
    move: m && typeof m === "object" && typeof m.id === "string" ? { id: str(m.id, 60), x: fin(m.x), y: fin(m.y), tilt: fin(m.tilt) } : null,
    pour: p && typeof p === "object" ? { x: fin(p.x), y: fin(p.y), colour: /^#[0-9a-f]{3,8}$/i.test(String(p.colour)) ? String(p.colour) : "#BFDBFE", drops: !!p.drops } : null,
    holding: !!f.holding, setVal: f.setVal == null ? null : fin(f.setVal),
  };
}

export function cleanNudge(v: unknown): Nudge | null {
  const n = v as Partial<Nudge> | null;
  const to = str(n?.to, 80), text = str(n?.text, 300).trim();
  if (!to || !text) return null;
  return { to, text, at: Number(n?.at) || Date.now() };
}

// Ready-made words of help for the teacher to send with one tap.
export const QUICK_HELP = [
  "Read the step again slowly — what does it ask you to do?",
  "Look at the scale at eye level before you write the reading.",
  "Write your observation now: what did you see change?",
  "Give the unit with every reading.",
  "Well done — keep going!",
];
