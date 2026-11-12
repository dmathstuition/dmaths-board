// A practical test: in an exam, each learner does a practical on the bench —
// their own samples, so their own readings — and writes the readings in the
// notebook with no checking, no hints and no "show me". What their phone
// saves (a BenchSave) is the bench at each moment they recorded something,
// and what they wrote; it's marked against their own bench, the way an
// examiner marks a practical test: every reading and every calculation from
// their own readings (error carried forward) earns its mark.
import { practicalFor } from "@/lib/lab/bench/all";
import { checkField } from "@/lib/lab/bench/run";

export type BenchSave = {
  step: number; of: number;                      // how far they got, of how many steps
  values: Record<string, string>;                // everything they recorded
  snaps: Record<string, unknown>;                // the bench when they recorded each step (step number → state)
  s?: unknown;                                   // the bench now (to carry on after leaving the question)
  notes?: Record<string, string>;                // what each finished step showed
  obs?: string[];                                // observations they wrote
  got?: number;                                  // marks — always worked out by the server
};
export const MAX_BENCH = 120_000; // characters, the whole save

const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").slice(0, n);

// Every reading and answer a practical's notebook asks for, in order: one mark each.
export function benchFields(slug: string) {
  const p = practicalFor(slug);
  if (!p) return [];
  return p.steps.flatMap((st, i) => (st.action.type === "record" ? st.action.fields.map((f) => ({ step: i, f, title: st.title })) : []));
}
export const benchMarksOf = (slug: string) => benchFields(slug).length;

export function cleanBenchSave(v: unknown): BenchSave | null {
  let x: any = v;
  if (typeof v === "string") { try { x = JSON.parse(v); } catch { return null; } }
  if (!x || typeof x !== "object") return null;
  const values: Record<string, string> = {};
  for (const [k, val] of Object.entries(x.values && typeof x.values === "object" ? x.values : {}).slice(0, 200)) values[str(k, 40)] = str(val, 60).trim();
  const plain = (o: unknown) => { try { return JSON.parse(JSON.stringify(o ?? null)); } catch { return null; } };
  const snaps: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(x.snaps && typeof x.snaps === "object" ? x.snaps : {}).slice(0, 120)) if (/^\d+$/.test(k)) snaps[k] = plain(val);
  const notes: Record<string, string> = {};
  for (const [k, val] of Object.entries(x.notes && typeof x.notes === "object" ? x.notes : {}).slice(0, 200)) if (/^\d+$/.test(k)) notes[k] = str(val, 400);
  const out: BenchSave = {
    step: Math.max(0, Math.min(500, Math.round(Number(x.step) || 0))), of: Math.max(1, Math.min(500, Math.round(Number(x.of) || 1))),
    values, snaps, s: plain(x.s), notes, obs: (Array.isArray(x.obs) ? x.obs : []).slice(0, 30).map((o: unknown) => str(o, 400).trim()).filter(Boolean),
  };
  return JSON.stringify(out).length <= MAX_BENCH ? out : { ...out, s: null, notes: {} }; // too big: keep what's marked
}

// Mark it: each field right against the bench as it was when they recorded it.
export function markBench(slug: string, save: BenchSave | null): { got: number; of: number; right: Record<string, boolean> } {
  const fields = benchFields(slug), right: Record<string, boolean> = {};
  let got = 0;
  if (save) for (const { step, f } of fields) {
    const v = save.values[f.key];
    if (v == null || v === "" || !(String(step) in save.snaps)) { right[f.key] = false; continue; }
    let ok = false;
    try { ok = checkField(f, v, save.snaps[String(step)], save.values) === true; } catch { ok = false; }
    right[f.key] = ok; if (ok) got++;
  }
  return { got, of: fields.length, right };
}
// The save with its marks, as the server keeps it.
export function withMarks(slug: string, v: unknown): BenchSave | null {
  const save = cleanBenchSave(v);
  return save ? { ...save, got: markBench(slug, save).got } : null;
}

// For the teacher and the review: what they recorded, each marked.
export function benchLines(slug: string, save: BenchSave | null): string[] {
  if (!save) return [];
  const m = markBench(slug, save);
  return benchFields(slug).filter(({ f }) => save.values[f.key] != null && save.values[f.key] !== "")
    .map(({ f }) => `${m.right[f.key] ? "✓" : "✗"} ${f.label}: ${save.values[f.key]}${f.unit ? ` ${f.unit}` : ""}`);
}
