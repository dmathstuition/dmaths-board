// A.I. class work: questions for the answer boards on a topic, each with its
// answer and short working — the answers stay on the tutor's screen (an answer
// key while marking); learners only ever get the questions. Pure.

export type WorkItem = { q: string; a: string; w: string };
export const WORK_LEVELS = ["Primary 4–6", "JSS 1–3", "SS 1–3 (WAEC/NECO)", "IGCSE", "UK KS2 (SATs)", "A level"] as const;
export const WORK_HARD = ["mixed", "easy", "medium", "hard"] as const;
export type WorkHard = (typeof WORK_HARD)[number];
export const MAX_WORK_ITEMS = 20;

export const WORK_SYSTEM = `You set class work for a teacher's live lesson. Learners answer each question on a small whiteboard on their phone, by writing or typing.
Reply with JSON only: {"items":[{"q":"...","a":"...","w":"..."}]}
q: one question a learner can answer in a few minutes on a small board (max 200 characters). Number values, not "a number".
a: the final answer only, short (max 120 characters) — with units where they matter.
w: the working, in 1–3 short steps (max 400 characters), so the teacher can mark the method.
Match the level and exam style given (WAEC/NECO, IGCSE, SATs and so on). Vary the questions — not the same one with new numbers each time — and order them from easier to harder.
Use plain text maths: × ÷ − ², ³, √, π, fractions like 3/4, and "x" for the unknown.`;

export function workPrompt(o: { topic: string; level?: string; count?: number; hard?: string; subject?: string }): string {
  const n = clampCount(o.count);
  const hard = WORK_HARD.includes(o.hard as WorkHard) ? (o.hard as WorkHard) : "mixed";
  return `Subject: ${o.subject?.trim() || "Mathematics"}. Level: ${o.level?.trim() || "secondary school"}. Topic: ${o.topic.trim()}.
Write ${n} questions, ${hard === "mixed" ? "from easy to hard" : `all ${hard}`}.`;
}
export const clampCount = (v: unknown) => Math.max(1, Math.min(MAX_WORK_ITEMS, Math.round(Number(v) || 8)));

const text = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
// The A.I.'s reply, tidied: only questions with an answer; no repeats.
export function cleanWorkItems(v: unknown): WorkItem[] {
  const list = Array.isArray(v) ? v : Array.isArray((v as any)?.items) ? (v as any).items : [];
  const seen = new Set<string>(), out: WorkItem[] = [];
  for (const x of list) {
    const q = text(x?.q ?? x?.question, 200), a = text(x?.a ?? x?.answer, 120), w = text(x?.w ?? x?.working, 400);
    if (q.length < 3 || !a || seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase()); out.push({ q, a, w });
    if (out.length >= MAX_WORK_ITEMS) break;
  }
  return out;
}
