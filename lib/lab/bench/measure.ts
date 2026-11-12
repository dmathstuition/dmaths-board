// Measuring instruments on the lab bench: vernier callipers, the micrometer
// screw gauge, outside and inside callipers with a rule, and a spring balance
// with a eureka can (Archimedes' principle). Lengths are kept in whole
// hundredths (of a cm for the callipers, of a mm for the micrometer) so every
// reading is exact.
import { BENCH, between, fix, near, num, round, type Practical, type Rand, type Step } from "@/lib/lab/bench/types";

const pick = <T,>(r: Rand, xs: T[]) => xs[Math.floor(r() * xs.length) % xs.length];
const int = (r: Rand, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const whole = (v: string, want: number) => { const n = num(v); return n != null && Number.isInteger(n) && n === want; };

// A reading in hundredths, split the way the scales show it: the main scale
// (the last mark before the zero) and the line that lines up.
// Vernier: main in 0.1 cm (10 hundredths), the vernier line 0–9.
export const vernierParts = (h: number) => { const main = Math.floor(h / 10) * 10; return { main, line: h - main }; };
// Micrometer: the sleeve in 0.5 mm (50 hundredths), the thimble line 0–49.
export const micrometerParts = (h: number) => { const sleeve = Math.floor(h / 50) * 50; return { sleeve, thimble: h - sleeve }; };

const zeroHint = (unit: string, of: number) => `Find the line that lines up exactly. If the 0 is past the main zero, the error is + (that line) × 0.01 ${unit}; if it stops short, it is −(${of} − that line) × 0.01 ${unit}. Lined up exactly: 0.00.`;

// ── Vernier callipers ──────────────────────────────────────────────────────
export type VernierObj = { key: "ball" | "rod" | "tube"; name: string; what: string; jaws: "outside" | "inside" };
export const VERNIER_OBJECTS: VernierObj[] = [
  { key: "ball", name: "Glass marble", what: "Diameter of the marble", jaws: "outside" },
  { key: "rod", name: "Brass rod", what: "Length of the brass rod", jaws: "outside" },
  { key: "tube", name: "Test tube", what: "Inside diameter of the test tube", jaws: "inside" },
];
type Vn = { err: number; size: number[]; at: number | null; closed: boolean };
const OPEN_V = 600; // the jaws as they come out of the box: 6.00 cm
export const vernierReading = (s: Vn) => (s.closed ? s.err : s.at != null ? s.size[s.at] + s.err : OPEN_V);
const vCorr = (v: Record<string, string>, i: number) => { const r = num(v[`r${i}`] ?? ""), z = num(v.zero ?? ""); return r != null && z != null ? round(r - z, 2) : null; };

export const vernier: Practical<Vn> = {
  slug: "vernier-callipers", title: "Reading vernier callipers", subject: "physics",
  aim: "Use vernier callipers to measure a marble, a rod and the inside of a test tube to 0.01 cm, correcting for zero error, and find the marble's volume.",
  safety: ["Close the jaws gently — squeezing can crack the glass or change the reading.", "Keep the sharp jaw tips away from your eyes and hands."],
  init: (r) => ({
    err: pick(r, [0, 0, 2, 3, -2, -3, 1, -1]),
    size: [int(r, 150, 220), int(r, 300, 550), int(r, 120, 190)],
    at: null, closed: false,
  }),
  layout: (s) => [
    { id: "vc", kind: "vernier", x: 560, y: BENCH, label: "Vernier callipers", r: 200, props: { h: vernierReading(s), obj: s.at != null ? VERNIER_OBJECTS[s.at].key : null } },
    ...VERNIER_OBJECTS.map((o, i) => ({ id: o.key, kind: "v-object", x: 1000 + i * 130, y: BENCH, label: o.name, hidden: s.at === i, props: { shape: o.key, h: s.size[i] } })),
  ],
  steps: [
    { id: "close", group: "Zero error", title: "Close the jaws", how: "Slide the jaws together until they just touch, with nothing between them.",
      action: { type: "tap", item: "vc", label: "Close the jaws" }, apply: (s) => ({ ...s, closed: true, at: null }),
      note: (s) => (s.err ? "Look at the two zeros: they don't quite line up — the callipers have a zero error." : "Look at the two zeros: do they line up?") },
    { id: "zero", title: "Read the zero error", how: "Look along the vernier for the line that lines up with a main-scale line. " + zeroHint("cm", 10), magnify: "vc",
      action: { type: "record", fields: [{ key: "zero", label: "Zero error", unit: "cm",
        check: (v, s: Vn) => (near(v, s.err / 100, 0.001) ? true : zeroHint("cm", 10)), answer: (s: Vn) => fix(s.err / 100, 2) }] } },
    ...VERNIER_OBJECTS.flatMap((o, i): Step<Vn>[] => [
      { id: `put${i}`, group: i === 0 ? "Measure" : undefined, title: o.jaws === "inside" ? `Put the small jaws inside the ${o.name.toLowerCase()}` : `Close the jaws on the ${o.name.toLowerCase()}`,
        how: o.jaws === "inside" ? "The small top jaws measure inside things: open them until they press lightly on the inside wall." : "Open the jaws, put it between them and close them until they just grip it.",
        action: { type: "drag", item: o.key, onto: "vc" }, apply: (s) => ({ ...s, at: i, closed: false }) },
      { id: `read${i}`, title: `Read the callipers (${o.what.toLowerCase()})`, magnify: "vc",
        how: "Main scale: the last millimetre mark before the vernier's 0 (in cm, e.g. 1.7). Vernier: the line that lines up exactly with a main-scale line. Reading = main scale + vernier line × 0.01 cm. Corrected = reading − zero error.",
        action: { type: "record", fields: [
          { key: `m${i}`, label: "Main scale", unit: "cm", check: (v, s: Vn) => (near(v, vernierParts(vernierReading(s)).main / 100, 0.001) ? true : "Read the main scale just before the vernier's 0, to the nearest mm (0.1 cm)."), answer: (s: Vn) => fix(vernierParts(vernierReading(s)).main / 100, 1) },
          { key: `v${i}`, label: "Vernier line that lines up", check: (v, s: Vn) => (whole(v, vernierParts(vernierReading(s)).line) ? true : "Which vernier line (0–10) lines up exactly with a main-scale line?"), answer: (s: Vn) => String(vernierParts(vernierReading(s)).line) },
          { key: `r${i}`, label: "Reading", unit: "cm", check: (v, s: Vn) => (near(v, vernierReading(s) / 100, 0.001) ? true : "Reading = main scale + vernier line × 0.01 cm."), answer: (s: Vn) => fix(vernierReading(s) / 100, 2) },
          { key: `c${i}`, label: o.what + " (corrected)", unit: "cm", check: (v, s: Vn) => (near(v, s.size[i] / 100, 0.001) ? true : "Corrected = reading − zero error (taking away a negative error adds it)."), answer: (s: Vn) => fix(s.size[i] / 100, 2) },
        ] } },
    ]),
    { id: "vol", group: "Calculate", title: "Work out the marble's volume", how: "Volume of a sphere = πd³ ÷ 6, using the corrected diameter.",
      action: { type: "record", fields: [{ key: "V", label: "Volume of the marble", unit: "cm³",
        check: (v, _s, values) => { const d = num(values.c0 ?? ""); if (d == null) return "Measure the marble first."; const want = (Math.PI * d ** 3) / 6; return near(v, want, want * 0.02) ? true : "V = π × d × d × d ÷ 6."; },
        answer: (_s, values) => fix((Math.PI * (num(values.c0 ?? "") ?? 0) ** 3) / 6, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Measurement", "Reading / cm", "Zero error / cm", "Corrected / cm"],
    rows: VERNIER_OBJECTS.map((o, i) => [o.what, v[`r${i}`] ?? "—", v.zero ?? "—", vCorr(v, i) != null ? fix(vCorr(v, i)!, 2) : "—"]) }],
  conclusion: (s, v) => `With the zero error of ${v.zero ?? "…"} cm taken off, the marble is ${v.c0 ?? "…"} cm across (volume ${v.V ?? "…"} cm³), the rod ${v.c1 ?? "…"} cm long and the test tube ${v.c2 ?? "…"} cm across inside (true values ${fix(s.size[0] / 100, 2)}, ${fix(s.size[1] / 100, 2)} and ${fix(s.size[2] / 100, 2)} cm). Vernier callipers read to 0.01 cm — ten times finer than a metre rule.`,
};

// ── Micrometer screw gauge ─────────────────────────────────────────────────
type Mc = { err: number; d: number[]; place: number; on: boolean; closed: boolean };
const OPEN_M = 300; // 3.00 mm open
export const micrometerReading = (s: Mc) => (!s.closed ? OPEN_M : s.on ? s.d[s.place] + s.err : s.err);
const PLACES = ["one end", "the middle", "the other end"];
const mMean = (v: Record<string, string>) => { const rs = [0, 1, 2].map((i) => num(v[`r${i}`] ?? "")); return rs.every((x) => x != null) ? (rs as number[]).reduce((a, b) => a + b, 0) / 3 : null; };

export const micrometer: Practical<Mc> = {
  slug: "micrometer", title: "Micrometer screw gauge: a wire's diameter", subject: "physics",
  aim: "Use a micrometer screw gauge to measure the diameter of a wire to 0.01 mm in three places, correct for zero error and find its cross-sectional area.",
  safety: ["Turn only the ratchet at the end — it slips when the jaws are just closed, so the wire isn't squashed.", "Hold the micrometer by its frame, not the thimble."],
  init: (r) => { const base = int(r, 30, 110); return { err: pick(r, [0, 0, 1, 2, 3, -1, -2, -3]), d: [base, base + pick(r, [0, 1, -1]), base + pick(r, [0, 1, 1, -1])].map((x) => Math.max(25, x)), place: 0, on: false, closed: false }; },
  layout: (s) => [
    { id: "mic", kind: "micrometer", x: 600, y: BENCH, label: "Micrometer screw gauge", r: 180, props: { h: micrometerReading(s), wire: s.on } },
    { id: "wire", kind: "wire-coil", x: 1050, y: BENCH, label: "Copper wire", hidden: s.on },
  ],
  steps: [
    { id: "close", group: "Zero error", title: "Close it with the ratchet", how: "With nothing between the anvil and spindle, turn the ratchet until it clicks.",
      action: { type: "tap", item: "mic", label: "Turn the ratchet" }, apply: (s) => ({ ...s, closed: true, on: false }) },
    { id: "zero", title: "Read the zero error", magnify: "mic", how: "Look at which thimble line is on the sleeve's long datum line. " + zeroHint("mm", 50),
      action: { type: "record", fields: [{ key: "zero", label: "Zero error", unit: "mm",
        check: (v, s: Mc) => (near(v, s.err / 100, 0.001) ? true : zeroHint("mm", 50)), answer: (s: Mc) => fix(s.err / 100, 2) }] } },
    { id: "put", group: "Measure", title: "Put the wire between anvil and spindle", how: "Open the micrometer a little and hold the wire straight across the anvil.",
      action: { type: "drag", item: "wire", onto: "mic" }, apply: (s) => ({ ...s, on: true, closed: false, place: 0 }) },
    ...PLACES.flatMap((where, i): Step<Mc>[] => [
      { id: `turn${i}`, title: i === 0 ? "Close it on the wire with the ratchet" : `Move to ${where} of the wire and close it again`,
        how: i === 0 ? "Turn the ratchet until it clicks — never the thimble." : "Open it, slide the wire along, and turn the ratchet until it clicks. Wires aren't perfectly round, so measure in different places.",
        action: { type: "tap", item: "mic", label: "Turn the ratchet" }, apply: (s) => ({ ...s, closed: true, place: i }) },
      { id: `read${i}`, title: `Read the micrometer (${where})`, magnify: "mic",
        how: "Sleeve: the last mark showing before the thimble's edge — whole mm above the datum line, half mm below it. Thimble: the line on the datum line. Reading = sleeve + thimble × 0.01 mm.",
        action: { type: "record", fields: [
          { key: `s${i}`, label: "Sleeve", unit: "mm", check: (v, s: Mc) => (near(v, micrometerParts(micrometerReading(s)).sleeve / 100, 0.001) ? true : "Read the last sleeve mark showing — don't forget a half-millimetre mark below the line."), answer: (s: Mc) => fix(micrometerParts(micrometerReading(s)).sleeve / 100, 2) },
          { key: `t${i}`, label: "Thimble line on the datum", check: (v, s: Mc) => (whole(v, micrometerParts(micrometerReading(s)).thimble) ? true : "Which thimble line (0–49) is on the long datum line?"), answer: (s: Mc) => String(micrometerParts(micrometerReading(s)).thimble) },
          { key: `r${i}`, label: "Reading", unit: "mm", check: (v, s: Mc) => (near(v, micrometerReading(s) / 100, 0.001) ? true : "Reading = sleeve + thimble line × 0.01 mm."), answer: (s: Mc) => fix(micrometerReading(s) / 100, 2) },
        ] } },
    ]),
    { id: "mean", group: "Calculate", title: "The mean diameter, corrected", how: "Add the three readings and divide by 3, then take away the zero error.",
      action: { type: "record", fields: [{ key: "d", label: "Mean diameter (corrected)", unit: "mm",
        check: (v, _s, values) => { const m = mMean(values), z = num(values.zero ?? ""); if (m == null || z == null) return "Take the readings first."; return near(v, m - z, 0.006) ? true : "Mean of the three readings, then − zero error."; },
        answer: (_s, values) => fix((mMean(values) ?? 0) - (num(values.zero ?? "") ?? 0), 2) }] } },
    { id: "area", title: "Its cross-sectional area", how: "Area = πd² ÷ 4.",
      action: { type: "record", fields: [{ key: "A", label: "Cross-sectional area", unit: "mm²",
        check: (v, _s, values) => { const d = num(values.d ?? ""); if (d == null) return "Find the mean diameter first."; const want = (Math.PI * d * d) / 4; return near(v, want, Math.max(0.002, want * 0.03)) ? true : "A = π × d × d ÷ 4."; },
        answer: (_s, values) => fix((Math.PI * (num(values.d ?? "") ?? 0) ** 2) / 4, 3) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["Place", "Sleeve / mm", "Thimble", "Reading / mm"],
    rows: PLACES.map((p, i) => [p, v[`s${i}`] ?? "—", v[`t${i}`] ?? "—", v[`r${i}`] ?? "—"]) }],
  conclusion: (s, v) => `Zero error ${v.zero ?? "…"} mm. The wire's corrected mean diameter is ${v.d ?? "…"} mm (true mean ${fix((s.d[0] + s.d[1] + s.d[2]) / 300, 2)} mm), so its cross-sectional area is ${v.A ?? "…"} mm². A micrometer reads to 0.01 mm — ten times finer than vernier callipers.`,
};

// ── Outside and inside callipers with a rule ───────────────────────────────
type Cl = { D: number; t: number; out: "bench" | "pipe" | "rule"; inn: "bench" | "pipe" | "rule" }; // tenths of a cm
export const LEFT_TIP = 100; // the left tip goes on the 10.0 cm mark
const tipsOf = (s: Cl) => (s.out === "rule" ? s.D : s.inn === "rule" ? s.D - 2 * s.t : null);
export const callipers: Practical<Cl> = {
  slug: "callipers", title: "Outside and inside callipers: a pipe's wall", subject: "physics",
  aim: "Use outside and inside callipers with a metre rule to measure a pipe's outside and inside diameters, and work out the thickness of its wall.",
  safety: ["The calliper points are sharp — carry them closed, points down.", "Don't force the legs: they should just touch the pipe."],
  init: (r) => ({ D: int(r, 52, 78), t: int(r, 3, 6), out: "bench", inn: "bench" }),
  layout: (s) => [
    { id: "pipe", kind: "pipe", x: 290, y: BENCH, label: "Plastic pipe", r: 140, props: { D: s.D, t: s.t } },
    // On the pipe, the callipers stand over it (drawn to its size); on the rule, the rule draws them.
    { id: "out", kind: "calliper-out", x: s.out === "pipe" ? 290 : 510, y: BENCH, z: 2, label: s.out === "pipe" ? "" : "Outside callipers", hidden: s.out === "rule", props: { on: s.out === "pipe", D: s.D, t: s.t } },
    { id: "inn", kind: "calliper-in", x: s.inn === "pipe" ? 290 : 680, y: BENCH, z: 2, label: s.inn === "pipe" ? "" : "Inside callipers", hidden: s.inn === "rule", props: { on: s.inn === "pipe", D: s.D, t: s.t } },
    { id: "rule", kind: "half-rule", x: 1075, y: BENCH, label: "Half-metre rule", r: 260, props: { tips: tipsOf(s), which: s.out === "rule" ? "out" : s.inn === "rule" ? "in" : null } },
  ],
  steps: [
    { id: "o1", group: "Outside diameter", title: "Set the outside callipers on the pipe", how: "Open the legs, put them round the pipe and close them until both points just touch the outside.",
      action: { type: "drag", item: "out", onto: "pipe" }, apply: (s) => ({ ...s, out: "pipe" }) },
    { id: "o2", title: "Lay them on the rule", how: "Without moving the legs, lift them off and put the left point on the 10.0 cm mark of the rule.",
      action: { type: "drag", item: "out", onto: "rule" }, apply: (s) => ({ ...s, out: "rule" }) },
    { id: "o3", title: "Read where the right point is", magnify: "rule", how: "Read the rule under the right point, to the nearest mm, looking straight down. Outside diameter = that reading − 10.0 cm.",
      action: { type: "record", fields: [
        { key: "or", label: "Right point at", unit: "cm", check: (v, s: Cl) => (near(v, (LEFT_TIP + s.D) / 10, 0.05) ? true : "Read the rule under the right point, to the nearest 0.1 cm."), answer: (s: Cl) => fix((LEFT_TIP + s.D) / 10, 1) },
        { key: "D", label: "Outside diameter D", unit: "cm", check: (v, s: Cl) => (near(v, s.D / 10, 0.05) ? true : "Take away the 10.0 cm where the left point is."), answer: (s: Cl) => fix(s.D / 10, 1) },
      ] } },
    { id: "i1", group: "Inside diameter", title: "Set the inside callipers in the pipe", how: "Put the closed legs inside the pipe and open them until both points just touch the inside wall.",
      action: { type: "drag", item: "inn", onto: "pipe" }, apply: (s) => ({ ...s, out: "bench", inn: "pipe" }) },
    { id: "i2", title: "Lay them on the rule", how: "Lift them out carefully (the legs mustn't move) and put the left point on the 10.0 cm mark.",
      action: { type: "drag", item: "inn", onto: "rule" }, apply: (s) => ({ ...s, inn: "rule" }) },
    { id: "i3", title: "Read where the right point is", magnify: "rule", how: "Read under the right point. Inside diameter = that reading − 10.0 cm.",
      action: { type: "record", fields: [
        { key: "ir", label: "Right point at", unit: "cm", check: (v, s: Cl) => (near(v, (LEFT_TIP + s.D - 2 * s.t) / 10, 0.05) ? true : "Read the rule under the right point."), answer: (s: Cl) => fix((LEFT_TIP + s.D - 2 * s.t) / 10, 1) },
        { key: "d", label: "Inside diameter d", unit: "cm", check: (v, s: Cl) => (near(v, (s.D - 2 * s.t) / 10, 0.05) ? true : "Take away 10.0 cm."), answer: (s: Cl) => fix((s.D - 2 * s.t) / 10, 1) },
      ] } },
    { id: "wall", group: "Calculate", title: "The thickness of the wall", how: "The pipe's wall is on both sides, so thickness = (D − d) ÷ 2.",
      action: { type: "record", fields: [{ key: "t", label: "Wall thickness", unit: "cm",
        check: (v, _s, values) => { const [D, d] = [num(values.D ?? ""), num(values.d ?? "")]; if (D == null || d == null) return "Measure both diameters first."; return near(v, (D - d) / 2, 0.006) ? true : "(D − d) ÷ 2 — the difference covers two walls."; },
        answer: (_s, values) => fix(((num(values.D ?? "") ?? 0) - (num(values.d ?? "") ?? 0)) / 2, 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Left point / cm", "Right point / cm", "Diameter / cm"],
    rows: [["Outside (D)", "10.0", v.or ?? "—", v.D ?? "—"], ["Inside (d)", "10.0", v.ir ?? "—", v.d ?? "—"]] }],
  conclusion: (s, v) => `The pipe is ${v.D ?? "…"} cm across outside and ${v.d ?? "…"} cm inside, so its wall is ${v.t ?? "…"} cm thick (true value ${fix(s.t / 10, 2)} cm). Callipers only carry a distance to the rule, so the reading is no better than the rule's 1 mm — vernier callipers would be more precise.`,
};

// ── Archimedes' principle: a spring balance and a eureka can ───────────────
type Ar = { V: number; W: number; hung: boolean; full: boolean; catcher: boolean; inWater: boolean }; // V in cm³, W in hundredths of a newton
export const UP_PER_CM3 = 1; // 1 cm³ of water weighs 0.01 N (g = 10 N/kg): one hundredth of a newton
const apparent = (s: Ar) => s.W - s.V * UP_PER_CM3;
export const archimedes: Practical<Ar> = {
  slug: "archimedes", title: "Archimedes' principle: upthrust", subject: "physics",
  aim: "Weigh a stone in air and in water with a spring balance, collect the water it displaces with a eureka can, and show that the upthrust equals the weight of water displaced.",
  safety: ["Clamp the stand firmly — the stone is heavy for its size.", "Mop up any water spilt on the bench."],
  init: (r) => { const V = pick(r, [30, 35, 40, 45, 50, 55, 60]); const W = Math.round((V * between(r, 2.4, 3.0, 2)) / 5) * 5; return { V, W, hung: false, full: false, catcher: false, inWater: false }; },
  layout: (s) => [
    { id: "rig", kind: "spring-balance", x: s.inWater ? 700 : 420, y: BENCH, label: s.inWater ? "" : "Spring balance (0–5 N)", r: 160, props: { N: s.hung ? (s.inWater ? apparent(s) : s.W) / 100 : 0, stone: s.hung, wet: s.inWater } },
    { id: "stone", kind: "stone", x: 230, y: BENCH, label: "Stone", hidden: s.hung, props: { name: "stone" } },
    { id: "can", kind: "eureka-can", x: 700, y: BENCH, label: "Eureka can", props: { full: s.full, stone: s.inWater } },
    { id: "cyl", kind: "measuring-cylinder", x: s.catcher ? 842 : 1000, y: BENCH, label: "Measuring cylinder", props: { vol: s.inWater ? s.V : 0, liquid: "#BFDBFE" } },
    { id: "water", kind: "beaker", x: 1180, y: BENCH, label: "Water", props: { vol: s.full ? 90 : 210, max: 250, colour: "#BFDBFE", liquid: "#BFDBFE" } },
  ],
  steps: [
    { id: "hang", group: "In air", title: "Hang the stone on the spring balance", how: "Tie the stone to the hook with thread and let it hang still.",
      action: { type: "drag", item: "stone", onto: "rig" }, apply: (s) => ({ ...s, hung: true }) },
    { id: "w1", title: "Read its weight in air", magnify: "rig", how: "Read the pointer at eye level. Each small mark is 0.05 N.",
      action: { type: "record", fields: [{ key: "w1", label: "Weight in air", unit: "N", check: (v, s: Ar) => (near(v, s.W / 100, 0.001) ? true : "Read where the pointer is — each small mark is 0.05 N."), answer: (s: Ar) => fix(s.W / 100, 2) }] } },
    { id: "fill", group: "In water", title: "Fill the eureka can", how: "Pour water in until it runs out of the spout, and wait until it stops dripping. Now it is full right up to the spout.",
      action: { type: "drag", item: "water", onto: "can", pour: true }, apply: (s) => ({ ...s, full: true }) },
    { id: "catch", title: "Put the measuring cylinder under the spout", how: "Use an empty, dry measuring cylinder to catch the water that comes out.",
      action: { type: "drag", item: "cyl", onto: "can" }, apply: (s) => ({ ...s, catcher: true }) },
    { id: "lower", title: "Lower the stone into the can", how: "Move the stand so the stone hangs completely under the water, without touching the sides or the bottom.",
      action: { type: "drag", item: "rig", onto: "can" }, apply: (s) => ({ ...s, inWater: true }),
      note: () => "Water runs out of the spout into the cylinder — the volume the stone pushes aside — and the balance reads less." },
    { id: "w2", title: "Read its weight in water", magnify: "rig", how: "Read the pointer again, with the stone still under the water.",
      action: { type: "record", fields: [{ key: "w2", label: "Weight in water", unit: "N", check: (v, s: Ar) => (near(v, apparent(s) / 100, 0.001) ? true : "Read the pointer — each small mark is 0.05 N."), answer: (s: Ar) => fix(apparent(s) / 100, 2) }] } },
    { id: "vol", title: "Read the water displaced", magnify: "cyl", how: "Read the bottom of the meniscus in the measuring cylinder.",
      action: { type: "record", fields: [{ key: "V", label: "Volume of water displaced", unit: "cm³", check: (v, s: Ar) => (near(v, s.V, 0.5) ? true : "Read the bottom of the meniscus — each mark is 1 cm³."), answer: (s: Ar) => String(s.V) }] } },
    { id: "up", group: "Calculate", title: "Upthrust and the water's weight", how: "Upthrust = weight in air − weight in water. 1 cm³ of water has a mass of 1 g, which weighs 0.01 N.",
      action: { type: "record", fields: [
        { key: "U", label: "Upthrust", unit: "N", check: (v, _s, values) => { const [a, b] = [num(values.w1 ?? ""), num(values.w2 ?? "")]; return a != null && b != null && near(v, a - b, 0.006) ? true : "Weight in air − weight in water."; }, answer: (_s, values) => fix((num(values.w1 ?? "") ?? 0) - (num(values.w2 ?? "") ?? 0), 2) },
        { key: "Ww", label: "Weight of water displaced", unit: "N", check: (v, _s, values) => { const V = num(values.V ?? ""); return V != null && near(v, V / 100, 0.006) ? true : "Volume in cm³ × 0.01 N."; }, answer: (_s, values) => fix((num(values.V ?? "") ?? 0) / 100, 2) },
      ] } },
    { id: "rd", title: "The stone's relative density", how: "Relative density = weight in air ÷ upthrust (how many times denser than water it is).",
      action: { type: "record", fields: [{ key: "rd", label: "Relative density", check: (v, _s, values) => { const [a, u] = [num(values.w1 ?? ""), num(values.U ?? "")]; if (!a || !u) return "Find the upthrust first."; return near(v, a / u, (a / u) * 0.02) ? true : "Weight in air ÷ upthrust."; },
        answer: (_s, values) => fix((num(values.w1 ?? "") ?? 0) / (num(values.U ?? "") || 1), 2) }] } },
  ],
  results: (_s, v) => [{ title: "Results", columns: ["", "Value"], rows: [["Weight in air / N", v.w1 ?? "—"], ["Weight in water / N", v.w2 ?? "—"], ["Upthrust / N", v.U ?? "—"], ["Water displaced / cm³", v.V ?? "—"], ["Weight of water displaced / N", v.Ww ?? "—"], ["Relative density", v.rd ?? "—"]] }],
  conclusion: (s, v) => `The upthrust (${v.U ?? "…"} N) equals the weight of water displaced (${v.Ww ?? "…"} N) — Archimedes' principle. The stone's relative density is ${v.rd ?? "…"} (true value ${fix(s.W / s.V, 2)}).`,
};

export const MEASURE: Practical[] = [vernier, micrometer, callipers, archimedes];
