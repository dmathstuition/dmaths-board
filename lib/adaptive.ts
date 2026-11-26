// Adaptive follow-up: after an answer-board round, each learner gets the next
// question at their level — easier if they struggled, harder if they got it —
// written by the A.I. from the question they just did. Pure.
export type Tier = "easier" | "same" | "harder";
export type TierItem = { q: string; a: string; w: string };
export type Tiers = Record<Tier, TierItem>;
export const TIERS: { k: Tier; label: string; icon: string; hint: string }[] = [
  { k: "easier", label: "Easier", icon: "🌱", hint: "A smaller step, with a hint" },
  { k: "same", label: "Same level", icon: "🎯", hint: "Another like it, new numbers" },
  { k: "harder", label: "Harder", icon: "🚀", hint: "A stretch" },
];

// Which follow-up a learner gets, from how they did.
//   not answered → easier · marked below half → easier · 80% or more → harder · otherwise (or not marked yet) → same
export function tierFor(mark: number | undefined, max: number, answered: boolean): Tier {
  if (!answered) return "easier";
  if (mark == null || max <= 0) return "same";
  const p = mark / max;
  return p < 0.5 ? "easier" : p >= 0.8 ? "harder" : "same";
}
export type TierSplit = { by: Record<string, Tier>; counts: Record<Tier, number>; names: Record<Tier, string[]> };
export function splitTiers(learners: { id: string; name: string }[], marks: Record<string, number>, max: number, answered: Set<string>): TierSplit {
  const by: Record<string, Tier> = {}, counts: Record<Tier, number> = { easier: 0, same: 0, harder: 0 }, names: Record<Tier, string[]> = { easier: [], same: [], harder: [] };
  for (const l of learners) {
    const t = tierFor(marks[l.id], max, answered.has(l.id));
    by[l.id] = t; counts[t]++; names[t].push(l.name);
  }
  return { by, counts, names };
}

export const TIERS_SYSTEM = `You write follow-up questions for a teacher's live lesson. You are given the question the class just answered. Write the SAME skill at three levels, so each learner gets the next step that suits them.
Reply with JSON only: {"easier":{"q":"...","a":"...","w":"..."},"same":{"q":"...","a":"...","w":"..."},"harder":{"q":"...","a":"...","w":"..."}}
- easier: a smaller step on the same idea — simpler numbers, or the first part broken out, with a short hint inside the question.
- same: a new question of the same difficulty with different numbers.
- harder: a stretch — bigger or more awkward numbers, an extra step, or a worded/applied version.
- q: the question a learner answers on a small board in about a minute (max 200 characters). a: the final answer, short (max 120). w: the working in 1–3 short steps (max 300).
Plain text maths: × ÷ − ², √, π, fractions like 3/4.`;
export const tiersPrompt = (o: { question: string; level?: string; subject?: string }) =>
  `Subject: ${o.subject?.trim() || "Mathematics"}. Level: ${o.level?.trim() || "secondary school"}.\nThe question the class just did: ${o.question.trim()}\nWrite the three follow-ups.`;

const text = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export function cleanTiers(v: unknown): Tiers | null {
  const x = (v && typeof v === "object" ? v : {}) as any;
  const out = {} as Tiers;
  for (const t of TIERS) {
    const y = x[t.k], q = text(y?.q ?? y?.question, 220), a = text(y?.a ?? y?.answer, 140);
    if (q.length < 3 || !a) return null;
    out[t.k] = { q, a, w: text(y?.w ?? y?.working, 400) };
  }
  // Three different questions — not the same one three times.
  return new Set(TIERS.map((t) => out[t.k].q.toLowerCase())).size === 3 ? out : null;
}
