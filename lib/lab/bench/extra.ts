// The last three experiments as practicals: a projectile launcher (physics),
// beads in bags for a genetic cross, and taking your pulse (biology).
import { BENCH, SHELF, between, deg, fix, near, num, round, type Practical, type Step } from "@/lib/lab/bench/types";

const vals = (v: Record<string, string>, keys: string[]) => keys.map((k) => num(v[k] ?? ""));

// ── Projectile motion: a launcher on the bench ─────────────────────────────
type Pj = { v: number; angle: number; shots: number; landed: number | null };
const PANG = [15, 30, 45, 60, 75];
export const rangeCm = (s: { v: number }, a: number) => round((100 * s.v ** 2 * Math.sin(deg(2 * a))) / 9.81, 1);
const pjPts = (v: Record<string, string>) => PANG.map((a, i) => [a, num(v[`R${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, b]) => [a, b] as [number, number]);
export const projectile: Practical<Pj> = {
  slug: "projectile", title: "Projectile motion: the launcher", subject: "physics",
  aim: "Fire a ball from a spring launcher at different angles, measure how far it travels, and find the angle that gives the longest range.",
  safety: ["Wear eye protection.", "Never point the launcher at anyone, and stand behind it."],
  init: (r) => ({ v: between(r, 2.8, 3.2, 2), angle: 45, shots: 0, landed: null }),
  layout: (s) => [{ id: "launcher", kind: "launcher", x: 180, y: BENCH, label: "Spring launcher, metre rules and carbon paper", props: { angle: s.angle, shots: s.shots, landed: s.landed } }],
  steps: [
    ...PANG.flatMap((a, i): Step<Pj>[] => [
      { id: `a${i}`, group: i === 0 ? "Fire at each angle" : undefined, title: `Set the launcher to ${a}°`, how: "Tilt the launcher until its protractor reads the angle. Use the same spring setting every time.",
        action: { type: "set", item: "launcher", label: "Launch angle", min: 0, max: 90, step: 5, unit: "°", target: a, tolerance: 0, start: 45 }, apply: (s, v) => ({ ...s, angle: v ?? a, landed: null }) },
      { id: `f${i}`, title: "Fire!", how: "Pull back to the same notch and let go. The ball leaves a mark where it lands on the carbon paper.",
        action: { type: "tap", item: "launcher", label: "Fire" }, apply: (s) => ({ ...s, shots: s.shots + 1, landed: rangeCm(s, s.angle) }) },
      { id: `R${i}`, title: `Measure the range (${a}°)`, how: "Read the metre rule at the mark, to the nearest cm. The rule's 0 is under the launcher.", magnify: "launcher", magnifyAt: { x: 700, y: 180 },
        action: { type: "record", fields: [{ key: `R${i}`, label: `Range at ${a}°`, unit: "cm", check: (v, s: Pj) => (near(v, rangeCm(s, a), 1) ? true : "Read the rule at the middle of the mark."), answer: (s: Pj) => fix(rangeCm(s, a), 0) }] } },
    ]),
    { id: "best", group: "Conclusion", title: "Which angle went furthest?", how: "Look at your table and graph.",
      action: { type: "record", fields: [
        { key: "best", label: "Longest range at", options: PANG.map((a) => `${a}°`), check: (v, _s, values) => { const p = pjPts(values); const b = p.length ? p.reduce((x, y) => (y[1] > x[1] ? y : x))[0] : 45; return v === `${b}°` ? true : "Which range was biggest?"; }, answer: (_s, values) => { const p = pjPts(values); return `${p.length ? p.reduce((x, y) => (y[1] > x[1] ? y : x))[0] : 45}°`; } },
        { key: "pair", label: "15° and 75° give", options: ["about the same range", "very different ranges"], check: (v) => (v === "about the same range" ? true : "Compare those two ranges."), answer: () => "about the same range" },
      ] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Angle / °", "Range / cm"], rows: PANG.map((a, i) => [String(a), v[`R${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = pjPts(v); return points.length ? { title: "Range against launch angle", x: "angle / °", y: "range / cm", points } : null; },
  conclusion: (s) => `The range is greatest at 45° (about ${fix(rangeCm(s, 45), 0)} cm). Angles that add up to 90°, such as 15° and 75°, give the same range: one goes low and fast across, the other high and slow.`,
};

// ── A genetic cross with beads ─────────────────────────────────────────────
type Gn = { draws: [number, number][]; n: number };
const TOTALS = [40, 200];
const kinds = (s: Gn, n: number) => { const d = s.draws.slice(0, n); return { BB: d.filter(([a, b]) => a + b === 2).length, Bb: d.filter(([a, b]) => a + b === 1).length, bb: d.filter(([a, b]) => a + b === 0).length }; };
export const genetics: Practical<Gn> = {
  slug: "genetics", title: "A genetic cross with beads", subject: "biology",
  aim: "Model a cross between two brown-eyed parents who both carry blue (Bb × Bb) by drawing beads from two bags, and compare the offspring with a Punnett square.",
  safety: ["Put each bead back in its bag after every draw, so the chances stay the same."],
  init: (r) => {
    for (let t = 0; ; t++) {
      const draws = Array.from({ length: 200 }, () => [r() < 0.5 ? 1 : 0, r() < 0.5 ? 1 : 0] as [number, number]);
      if (kinds({ draws, n: 0 }, 40).bb >= 4 || t > 20) return { draws, n: 0 };
    }
  },
  layout: (s) => {
    const k = kinds(s, s.n);
    return [
      { id: "bags", kind: "bead-bags", x: 420, y: BENCH, label: "Father (Bb) and mother (Bb): 50 brown B + 50 blue b each", props: { last: s.n ? s.draws[s.n - 1] : null, n: s.n } },
      { id: "chart", kind: "tally-chart", x: 940, y: BENCH, label: "Offspring tally", props: { labels: ["BB", "Bb", "bb"], counts: [k.BB, k.Bb, k.bb], total: s.n } },
    ];
  },
  steps: [
    { id: "gam", group: "Predict", title: "What gametes does each parent make?", how: "Each sperm or egg carries one of the parent's two alleles.",
      action: { type: "record", fields: [{ key: "gam", label: "A Bb parent's gametes", options: ["B or b (half each)", "only B", "only b", "BB or bb"], check: (v) => (v === "B or b (half each)" ? true : "One allele goes into each gamete."), answer: () => "B or b (half each)" }] } },
    { id: "pun", title: "Use a Punnett square to predict the offspring", how: "B (brown) is dominant: BB and Bb have brown eyes; only bb has blue.",
      action: { type: "record", fields: [{ key: "pun", label: "Expected brown : blue", options: ["3 : 1", "1 : 1", "all brown", "1 : 3"], check: (v) => (v === "3 : 1" ? true : "Fill in the 4 boxes: BB, Bb, Bb, bb."), answer: () => "3 : 1" }] } },
    ...TOTALS.flatMap((N, i): Step<Gn>[] => [
      { id: `draw${i}`, group: i === 0 ? "Model it" : "More offspring", title: `Draw pairs of beads until you have ${N}`, how: "Take one bead from each bag without looking — that's one offspring. Tally it, then put the beads back.",
        action: { type: "wait", label: `Draw ${N} pairs`, minutes: 0 }, tick: (s, sec) => ({ ...s, n: Math.min(N, Math.max(s.n + 1, Math.floor(s.n + sec * N * 0.5))) }), finished: (s) => s.n >= N },
      { id: `count${i}`, title: `Count the offspring (${N})`, how: "Read the tally chart. Brown = BB + Bb; blue = bb.", magnify: "chart",
        action: { type: "record", fields: [
          ...(["BB", "Bb", "bb"] as const).map((g) => ({ key: `${g}${i}`, label: `${g}`, check: (v: string, s: Gn) => (near(v, kinds(s, N)[g], 0) ? true : "Read the frequency."), answer: (s: Gn) => String(kinds(s, N)[g]) })),
          { key: `ratio${i}`, label: "Brown ÷ blue", check: (v: string, _s: Gn, values: Record<string, string>) => { const [a, b, c] = vals(values, [`BB${i}`, `Bb${i}`, `bb${i}`]); if (a == null || b == null || !c) return "Count them first."; return near(v, (a + b) / c, 0.05) ? true : "(BB + Bb) ÷ bb."; },
            answer: (_s: Gn, values: Record<string, string>) => { const [a, b, c] = vals(values, [`BB${i}`, `Bb${i}`, `bb${i}`]); return fix(((a ?? 0) + (b ?? 0)) / (c || 1), 2); } },
        ] } },
    ]),
    { id: "why", group: "Conclusion", title: "Why isn't it exactly 3 : 1?", how: "Compare your two ratios.",
      action: { type: "record", fields: [{ key: "why", label: "Because", options: ["fertilisation is random: with more offspring the ratio gets closer to 3 : 1", "blue is dominant", "the Punnett square is wrong"], check: (v) => (v.startsWith("fertilisation") ? true : "It's down to chance."), answer: () => "fertilisation is random: with more offspring the ratio gets closer to 3 : 1" }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Offspring", "BB", "Bb", "bb", "Brown ÷ blue"], rows: TOTALS.map((N, i) => [String(N), v[`BB${i}`] ?? "—", v[`Bb${i}`] ?? "—", v[`bb${i}`] ?? "—", v[`ratio${i}`] ?? "—"]) }],
  conclusion: () => "Bb × Bb gives BB : Bb : bb in the ratio 1 : 2 : 1, so 3 brown-eyed to 1 blue-eyed. Each offspring is a chance event, so small families can be far from 3 : 1; the more offspring, the closer the ratio gets.",
};

// ── Exercise and heart rate ────────────────────────────────────────────────
type Hr = { rest: number; peak: number; phase: "rest" | "ex" | "rec"; t: number; secs: number; ex: number; at: number; noise: number[] };
const REC = [1, 2, 3, 4];
const bpm = (s: Hr) => (s.phase === "rest" ? s.rest : s.phase === "ex" ? s.peak : s.rest + (s.peak - s.rest) * Math.exp(-s.t / 1.6));
export const beatsIn15 = (s: Hr, at: number) => { const b = at < 0 ? s.rest : at === 0 ? s.peak : s.rest + (s.peak - s.rest) * Math.exp(-at / 1.6); return Math.round(b / 4) + s.noise[at + 1]; };
const hrPts = (v: Record<string, string>) => [-1, 0, ...REC].map((t, i) => [t, num(v[`bpm${i}`] ?? "")] as const).filter((p): p is readonly [number, number] => p[1] != null).map(([a, b]) => [a, b] as [number, number]);
const countStep = (i: number, at: number, label: string): Step<Hr>[] => [
  { id: `c${i}`, title: `Count your pulse for 15 seconds (${label})`, how: "Two fingers on the inside of your wrist, below the thumb. Count each beat while the stopwatch runs.",
    action: { type: "wait", label: "Count for 15 s", minutes: 0 }, apply: (s) => ({ ...s, secs: 0, at }),
    tick: (s, sec) => ({ ...s, secs: Math.min(15, s.secs + sec * 5) }), finished: (s) => s.secs >= 15 },
  { id: `r${i}`, title: `Record your pulse (${label})`, how: "Beats per minute = beats in 15 s × 4.", magnify: "pulse",
    action: { type: "record", fields: [
      { key: `b${i}`, label: "Beats in 15 s", check: (v, s: Hr) => (near(v, beatsIn15(s, at), 0) ? true : "Read the beat counter."), answer: (s: Hr) => String(beatsIn15(s, at)) },
      { key: `bpm${i}`, label: "Heart rate", unit: "bpm", check: (v, _s, values) => { const b = num(values[`b${i}`] ?? ""); return b != null && near(v, b * 4, 0) ? true : "Beats in 15 s × 4."; }, answer: (_s, values) => String((num(values[`b${i}`] ?? "") ?? 0) * 4) },
    ] } },
];
export const heartRate: Practical<Hr> = {
  slug: "heart-rate", title: "Exercise and heart rate", subject: "biology",
  aim: "Measure your pulse at rest, straight after 2 minutes of step-ups, and every minute as you recover.",
  safety: ["Don't exercise if you're unwell or have a heart condition.", "Step up and down at a steady pace — it's not a race."],
  init: (r) => ({ rest: Math.round(between(r, 62, 78, 0)), peak: Math.round(between(r, 128, 150, 0)), phase: "rest", t: 0, secs: 0, ex: 0, at: -1, noise: [-1, 0, 1, 2, 3, 4].map(() => Math.round((r() - 0.5) * 2)) }),
  layout: (s) => {
    const counting = s.secs > 0 && s.secs < 15, target = beatsIn15(s, s.at), rate = counting || s.secs >= 15 ? target * 4 : bpm(s);
    return [
      { id: "box", kind: "step-box", x: 380, y: BENCH, label: "Step-up box", props: { active: s.ex > 0 && s.ex < 2 } },
      { id: "pulse", kind: "pulse", x: 760, y: BENCH, label: "Taking the pulse at the wrist", props: { bpm: rate, beats: Math.round((target * s.secs) / 15), counting } },
      { id: "watch", kind: "stopwatch", x: 1080, y: BENCH, label: "Stopwatch", props: { t: s.phase === "rec" && !counting ? s.t * 60 : s.secs } },
    ];
  },
  steps: [
    ...countStep(0, -1, "at rest").map((x, k) => (k === 0 ? { ...x, group: "At rest" } : x)),
    { id: "ex", group: "Exercise", title: "Step up and down for 2 minutes", how: "Up, up, down, down — at a steady pace.", action: { type: "wait", label: "Exercise for 2 minutes", minutes: 2 },
      tick: (s, sec) => ({ ...s, ex: Math.min(2, s.ex + sec * 0.6) }), finished: (s) => s.ex >= 2, apply: (s) => ({ ...s, ex: 0.001 }) },
    ...countStep(1, 0, "straight after exercise").map((x) => ({ ...x, apply: (s: Hr) => ({ ...s, phase: "ex" as const, secs: 0, at: 0 }) })),
    ...REC.flatMap((t, k): Step<Hr>[] => [
      { id: `wait${t}`, group: k === 0 ? "Recovery" : undefined, title: `Sit and rest until ${t} minute${t > 1 ? "s" : ""} after exercise`, how: "Sit still and breathe normally.",
        action: { type: "wait", label: `Rest to ${t} min`, minutes: 1 }, apply: (s) => ({ ...s, phase: "rec", secs: 0 }), tick: (s, sec) => ({ ...s, t: Math.min(t, s.t + sec * 0.6) }), finished: (s) => s.t >= t },
      ...countStep(k + 2, t, `${t} min after`),
    ]),
    { id: "why", group: "Conclusion", title: "Why does your heart rate go up?", how: "Think about what your muscles need.",
      action: { type: "record", fields: [{ key: "why", label: "During exercise the heart beats faster to", options: ["deliver more oxygen and glucose to the muscles, and remove CO₂", "cool the body down", "make you breathe more slowly"], check: (v) => (v.startsWith("deliver") ? true : "Muscles respire faster when they work."), answer: () => "deliver more oxygen and glucose to the muscles, and remove CO₂" }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["When", "Beats in 15 s", "Heart rate / bpm"], rows: ["At rest", "After exercise", ...REC.map((t) => `${t} min after`)].map((w, i) => [w, v[`b${i}`] ?? "—", v[`bpm${i}`] ?? "—"]) }],
  graph: (_s, v) => { const points = hrPts(v); return points.length ? { title: "Heart rate against time after exercise", x: "time after exercise / min", y: "heart rate / bpm", points } : null; },
  conclusion: (s) => `Your heart rate rose from about ${s.rest} to ${s.peak} bpm: working muscles respire faster and need more oxygen and glucose. It then fell back towards resting — the faster it recovers, the fitter you are.`,
};

export const EXTRA: Practical[] = [projectile, genetics, heartRate];
export { SHELF };
