// Repeat readings. Real measurements scatter a little, and now and then one
// goes wrong (a miscounted swing, an overshot end point). A practical takes a
// reading, repeats it twice more, then the learner spots any anomaly and works
// out the mean of the rest — the evaluation skills practical papers ask for.
import { fix, near, num, round, type Rand, type Step, type Table } from "@/lib/lab/bench/types";

// Planned when the practical is set up: the scatter of the two repeats (−1…1),
// which of the three readings goes wrong (−1: none) and which way.
export type Rep = { e: [number, number]; odd: number; up: boolean; size: number };
export function planRepeats(r: Rand, oddChance = 0.75): Rep {
  const e: [number, number] = [r() * 2 - 1, r() * 2 - 1];
  const hit = r() < oddChance, which = r() < 0.5 ? 1 : 2, up = r() < 0.5, size = r();
  return { e, odd: hit ? which : -1, up, size };
}

// Three readings: the learner's own first one, then two repeats. `spread` is
// how far a good repeat can stray, `off` how far the bad one is out (both as a
// fraction of the reading); `step` rounds readings to what the instrument shows.
export function repeatReadings(first: number, rep: Rep, o: { spread: number; off: number; step: number; up?: boolean }): number[] {
  const snap = (x: number) => round(Math.round(x / o.step) * o.step, 6);
  const out = [first, ...rep.e.map((e) => snap(first * (1 + o.spread * e)))];
  if (rep.odd > 0) {
    const up = o.up ?? rep.up;
    out[rep.odd] = snap(first * (1 + (up ? 1 : -1) * o.off * (1 + 0.5 * rep.size)));
  }
  return out;
}

// The mean of the readings that are kept (all of them when none is anomalous).
export const keptMean = (xs: number[], odd: number) => { const kept = xs.filter((_, i) => i !== odd); return kept.reduce((a, b) => a + b, 0) / Math.max(1, kept.length); };
const NONE = "None — they agree";

type Opts<S> = {
  id: string; item: string; group?: string;                // the apparatus that is used again
  again: string; how: string; label: string; // the "repeat it" step: title, how, button
  key: string;                             // its values: `${key}Odd`, `${key}Mean`
  what: string; unit: string; dp: number;  // the quantity (in the table and the mean)
  names?: [string, string, string];        // what the three readings are called
  readings: (s: S, values: Record<string, string>) => number[];
  rep: (s: S) => Rep;
  cause: string;                           // why the anomaly most likely happened
};

// Two steps: repeat the measurement, then look at all three readings.
export function repeatSteps<S>(o: Opts<S>): Step<S>[] {
  const names = o.names ?? ["1st", "2nd", "3rd"];
  const oddName = (s: S) => { const k = o.rep(s).odd; return k >= 0 ? names[k] : NONE; };
  const mean = (s: S, v: Record<string, string>) => keptMean(o.readings(s, v), o.rep(s).odd);
  const tol = 10 ** -o.dp;
  return [
    { id: `${o.id}-again`, group: o.group, title: o.again, how: o.how, action: { type: "tap", item: o.item, label: o.label } },
    { id: `${o.id}-check`, title: "Check your repeats", how: "An anomaly is a reading that doesn't fit with the others. Leave it out, and take the mean of the rest.",
      show: (s, v) => ({ title: `${o.what} / ${o.unit}`, columns: names, rows: [o.readings(s, v).map((x) => fix(x, o.dp))] }),
      action: { type: "record", fields: [
        { key: `${o.key}Odd`, label: "Anomalous reading", options: [...names, NONE],
          check: (v, s: S) => {
            if (v === oddName(s)) return true;
            return oddName(s) === NONE ? "Look again: are any of them far from the other two?" : v === NONE ? "One of them is well away from the other two." : "Which one is furthest from the other two?";
          },
          answer: (s: S) => oddName(s) },
        { key: `${o.key}Mean`, label: "Mean (without any anomaly)", unit: o.unit,
          check: (v, s: S, values) => {
            const want = mean(s, values), all = keptMean(o.readings(s, values), -1);
            if (near(v, want, tol)) return true;
            return o.rep(s).odd >= 0 && near(v, all, tol) ? "Leave the anomalous reading out of the mean." : "Add up the readings you keep and divide by how many there are.";
          },
          answer: (s: S, values) => fix(mean(s, values), o.dp) },
      ] },
      note: (s) => (o.rep(s).odd >= 0 ? `Leaving out the anomaly makes the mean more reliable. It most likely happened because ${o.cause}` : "Your three readings agree closely: they're repeatable, so their mean is reliable.") },
  ];
}

// The mean the learner worked out (or null before they did).
export const repMean = (values: Record<string, string>, key: string) => num(values[`${key}Mean`] ?? "");
