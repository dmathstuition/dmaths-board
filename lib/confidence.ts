// Confidence check: learners say "sure" or "not sure" before they find out if
// they're right. Put together with whether they were right, it shows who
// really understands, who guessed lucky, and — most useful — who is sure of a
// wrong answer (a misconception to fix). Pure.
export type SureEntry = { by: string; right: boolean; sure: boolean };
export type Confidence = { knew: string[]; lucky: string[]; misconception: string[]; unsure: string[]; total: number };

export function confidence(entries: SureEntry[]): Confidence {
  const latest = new Map<string, SureEntry>();
  for (const e of entries) latest.set(e.by, e); // the last tap counts
  const all = [...latest.values()];
  return {
    knew: all.filter((e) => e.right && e.sure).map((e) => e.by),
    lucky: all.filter((e) => e.right && !e.sure).map((e) => e.by),
    misconception: all.filter((e) => !e.right && e.sure).map((e) => e.by),
    unsure: all.filter((e) => !e.right && !e.sure).map((e) => e.by),
    total: all.length,
  };
}
export const CONFIDENCE_LABELS = {
  knew: { icon: "✅", title: "Knew it", hint: "Right and sure" },
  lucky: { icon: "🎲", title: "Lucky guess", hint: "Right but not sure" },
  misconception: { icon: "⚠️", title: "Sure but wrong", hint: "A misconception — talk it through" },
  unsure: { icon: "🤔", title: "Unsure and wrong", hint: "Needs more teaching" },
} as const;
