// Running a practical without a screen: doing a step "for" the learner (the
// bench's "Do it for me" button, and the tests), and a seeded random number
// generator so a practical can be set up the same way twice.
import type { Field, Practical, Rand, Step } from "@/lib/lab/bench/types";

export type Done<S> = { s: S; values: Record<string, string> };

// Do one step the right way.
export function doStep<S>(step: Step<S>, s: S, values: Record<string, string>): Done<S> {
  const a = step.action;
  if (a.type === "record") {
    const v = { ...values };
    for (const f of a.fields) v[f.key] = f.answer(s, v);
    return { s, values: v };
  }
  if (a.type === "set") return { s: step.apply ? step.apply(s, a.target) : s, values };
  if (a.type === "hold" || a.type === "wait") {
    let x = step.apply ? step.apply(s) : s;
    const by = a.type === "hold" ? a.drop : 0.1; // a hold goes drop by drop, so it stops right at the end point
    for (let i = 0; i < 20000 && step.tick && !(step.finished?.(x) ?? true); i++) x = step.tick(x, by);
    return { s: x, values };
  }
  return { s: step.apply ? step.apply(s) : s, values };
}

// Check one answer in the notebook: true, or a hint.
export function checkField<S>(f: Field, value: string, s: S, values: Record<string, string>): true | string {
  if (!String(value ?? "").trim()) return f.options ? "Choose one." : "Write a value first.";
  return f.check(value, s, { ...values, [f.key]: value });
}

// The whole practical, done right (for tests and previews).
export function runAll<S>(p: Practical<S>, rand: Rand): Done<S> & { notes: (string | null)[] } {
  let s = p.init(rand), values: Record<string, string> = {};
  const notes: (string | null)[] = [];
  for (const step of p.steps) {
    ({ s, values } = doStep(step, s, values));
    notes.push(step.note?.(s) ?? null);
  }
  return { s, values, notes };
}

// Mulberry32: a small, good-enough seeded generator.
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
