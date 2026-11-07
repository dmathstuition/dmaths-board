// "Fix my mistakes": a short practice set made from the questions a learner
// got wrong in a class (exam, live quiz, class work). Each missed question
// comes back (shuffled), followed by similar new ones the A.I makes up, each
// with its working shown after the try. Without the A.I it still works: the
// missed questions come back with the right answer explained simply. Pure.

export type Missed = {
  from: string;           // "Exam Q3", "Quiz Q2", "Class work"
  q: string;
  options: string[];      // empty when it wasn't multiple choice
  answer: string | null;  // the right answer, when known (class work is marked by hand: unknown)
  given: string;          // what they put
};
export type PracticeItem = { q: string; options: string[]; answer: number; working: string[]; from: string; kind: "retry" | "similar" };

export const MAX_MISSED = 6, MAX_ITEMS = 12;
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// A repeatable shuffle (same learner, same order each time they open it).
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// The original question again, its options in a new order.
export function retryOf(m: Missed, seed: string, working?: string[]): PracticeItem | null {
  if (m.options.length < 2 || m.answer == null || !m.options.includes(m.answer)) return null;
  const options = shuffle(m.options, rng(`${seed}|${m.q}`));
  return {
    q: m.q, options, answer: options.indexOf(m.answer), from: m.from, kind: "retry",
    working: working?.length ? working : [`The right answer is ${m.answer}.`, ...(m.given && m.given !== m.answer ? [`You put ${m.given} — compare the two and see where it went wrong.`] : [])],
  };
}

export const PRACTICE_SYSTEM = `You are a patient Nigerian secondary-school maths and English teacher (WAEC/NECO/JAMB/Common Entrance level, British spelling, Naira for money) helping ONE learner fix their mistakes.
Reply with JSON only, in exactly this shape:
{"fixes":[{"n":1,"explain":["step","step"],"similar":[{"q":"...","options":["...","...","...","..."],"answer":0,"working":["step","step"]}]}]}
Rules:
- One entry per question you are given, with the same "n".
- "explain": 2–5 short steps that solve THE GIVEN question and reach its right answer (when the right answer is given, your steps must reach exactly it). If their wrong answer shows a common mistake, say so kindly in one step.
- "similar": 2 NEW questions testing the same skill, a little different (other numbers or wording), multiple choice with exactly 4 options, one correct, "answer" its 0-based index — vary its position; wrong options are typical mistakes. Check every answer is certainly right.
- "working": 2–5 short steps for each new question, ending with the answer.
- Each step max 160 characters. Questions max 300 characters, options max 80.
- Plain text only: write x², √, π, ÷, ×, °, ½ as characters. No LaTeX, no markdown, no emojis.`;

export function practicePrompt(missed: Missed[]): string {
  return missed.slice(0, MAX_MISSED).map((m, i) => [
    `${i + 1}. Question: ${clip(m.q, 400)}`,
    m.options.length ? `   Options: ${m.options.map((o) => clip(o, 80)).join(" | ")}` : "",
    m.answer != null ? `   Right answer: ${clip(m.answer, 120)}` : "   Right answer: (not given — work it out carefully)",
    m.given ? `   Their answer: ${clip(m.given, 120)}` : "   Their answer: (left blank)",
  ].filter(Boolean).join("\n")).join("\n\n");
}

const steps = (v: unknown) => (Array.isArray(v) ? v : []).map((s) => clip(s, 200)).filter(Boolean).slice(0, 6);
function cleanChoice(x: any, from: string): PracticeItem | null {
  const q = clip(x?.q, 400), options = (Array.isArray(x?.options) ? x.options : []).map((o: unknown) => clip(o, 100)).filter(Boolean);
  const answer = Number(x?.answer);
  if (!q || options.length !== 4 || new Set(options.map((o: string) => o.toLowerCase())).size !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
  return { q, options, answer, working: steps(x?.working), from, kind: "similar" };
}

// The set: for each missed question, the retry (if it can be marked) then the
// A.I's similar questions; without the A.I, just the retries.
export function buildPractice(missed: Missed[], ai: unknown, seed: string): PracticeItem[] {
  const fixes: any[] = Array.isArray((ai as any)?.fixes) ? (ai as any).fixes : [];
  const out: PracticeItem[] = [];
  missed.slice(0, MAX_MISSED).forEach((m, i) => {
    const fix = fixes.find((f) => Number(f?.n) === i + 1);
    const retry = retryOf(m, seed, steps(fix?.explain));
    if (retry) out.push(retry);
    for (const s of (Array.isArray(fix?.similar) ? fix.similar : []).slice(0, 2)) {
      const c = cleanChoice(s, `Like ${m.from}`);
      if (c) out.push(c);
    }
  });
  return out.slice(0, MAX_ITEMS);
}

// Stars for a practice round: one for each right answer, up to 10.
export const practiceStars = (right: number) => Math.max(0, Math.min(10, Math.round(right)));
