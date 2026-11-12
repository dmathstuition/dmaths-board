// The free experiment bench in the lab rooms: put one piece of apparatus onto
// another and they act on each other like the real thing — pour a reagent into
// a test tube, add indicator, add sodium hydroxide and see the precipitate,
// heat it over a Bunsen burner, put a thermometer in, wire up a circuit, put a
// slide under the microscope… Pure functions: what happens, and what you see.
import type { Item } from "@/lib/lab/room/inventory";
import { countRate, current, firstResonance, image, indicatorColour, stretch, type IndicatorId, type Spec } from "@/lib/lab/room/engines";

export type Ion = { ion: string; from: string };
export type Liquid = {
  parts: string[]; acid: number; T: number; vol: number;
  cations: Ion[]; anions: Ion[]; tags: string[];
  indicator: IndicatorId | null; base: string;             // the solution's own colour
  ppt: { colour: string; name: string } | null; gas: string | null; milky: boolean; hydroxide: number; heatedFor: number;
};
export type Slot = { liquid?: Liquid; heat?: string | null; on?: boolean; inside?: string | null; reading?: string; glow?: number; blown?: boolean; spin?: boolean; flip?: boolean; boiling?: boolean };
export type BenchState = { slots: Record<string, Slot>; wires: string[]; log: { at: number; text: string }[] };
export type Fx = "pour" | "drop" | "fizz" | "ppt" | "colour" | "heat" | "light" | "click" | "view" | "none";
export type Result = { st: BenchState; note: string; fx: Fx; ok: boolean };
export const emptyBench = (): BenchState => ({ slots: {}, wires: [], log: [] });

type Rg = Extract<Spec, { e: "reagent" }>;
const COLOURS: Record<string, string> = {
  CuSO4: "#60A5FA", FeSO4: "#BEF264", FeCl3: "#D97706", KMnO4: "#7E22CE", K2Cr2O7: "#F97316", "I2/KI": "#92400E", "Br2(aq)": "#EA580C", "Cl2(aq)": "#D9F99D",
  "CuSO4 + NaOH": "#93C5FD", "Cu2+ (alkaline)": "#3B82F6", DCPIP: "#2563EB", "Ca(OH)2(aq)": "#F8FAFC",
};
const CLEAR = "#E0F2FE";
const PPT_OH: Record<string, [string, string, boolean]> = { // colour, name, dissolves in excess NaOH
  "Cu2+": ["#7DD3FC", "copper(II) hydroxide (light blue)", false], "Fe2+": ["#4D7C0F", "iron(II) hydroxide (green)", false], "Fe3+": ["#9A3412", "iron(III) hydroxide (red-brown)", false],
  "Zn2+": ["#F8FAFC", "zinc hydroxide (white)", true], "Al3+": ["#F8FAFC", "aluminium hydroxide (white)", true], "Pb2+": ["#F8FAFC", "lead(II) hydroxide (white)", true],
  "Ca2+": ["#F8FAFC", "calcium hydroxide (white)", false], "Mg2+": ["#F8FAFC", "magnesium hydroxide (white)", false],
};
const strongOf = (acid: number) => 7 - 6 * Math.tanh(acid * 2);
export const pHOf = (l: Liquid) => Math.round(strongOf(l.acid) * 10) / 10;
const acidOf = (pH: number) => { const x = Math.max(-0.999, Math.min(0.999, (7 - pH) / 6)); return Math.atanh(x) / 2; };

export function colourOf(l: Liquid): string {
  if (l.milky) return "#F1F5F9";
  if (l.indicator) return indicatorColour(l.indicator, pHOf(l)).hex;
  if (l.ppt) return CLEAR; // the coloured ions have come out as the solid
  return l.base;
}
const isVessel = (it: Item) => it.spec.e === "vessel" || /tube|flask|beaker|dish|jar|bottle|calorimeter|trough|cylinder/i.test(it.name);
const isThermo = (it: Item) => it.spec.e === "scale" && it.spec.unit === "°C";
const isHeater = (it: Item) => it.spec.e === "heater" && it.spec.power > 0;
// Circuit parts — meters (scales in A or V) go in circuits too.
export const partOf = (it: Item): string | null => it.spec.e === "circuit" ? it.spec.part : it.spec.e === "scale" && /^(A|μA)$/.test(it.spec.unit) ? "ammeter" : it.spec.e === "scale" && it.spec.unit === "V" ? "voltmeter" : null;
const tags = (r: Rg, name: string): string[] => {
  const t: string[] = [];
  if (r.formula === "(C6H10O5)n") t.push("starch");
  if (/glucose/i.test(name) || r.formula === "C6H12O6" || r.formula === "C6H12O6(aq)") t.push("glucose");
  if (/protein|albumen/i.test(name + r.formula)) t.push("protein");
  if (/benedict/i.test(name)) t.push("benedict");
  if (/biuret/i.test(name)) t.push("biuret");
  if (r.formula === "I2/KI") t.push("iodine");
  if (r.formula === "Br2(aq)") t.push("bromine");
  if (r.formula === "Ca(OH)2(aq)") t.push("limewater");
  if (r.formula === "DCPIP") t.push("dcpip");
  if (r.formula === "H2O2") t.push("peroxide");
  if (r.kind === "metal") t.push(`metal:${r.formula}`);
  if (r.anion === "CO3 2-" || r.anion === "HCO3-") t.push("carbonate");
  return t;
};
function newLiquid(name: string, r: Rg): Liquid {
  return {
    parts: [name], acid: acidOf(r.pH), T: 25, vol: 10, cations: r.cation && r.kind !== "acid" ? [{ ion: r.cation, from: name }] : [], anions: r.anion ? [{ ion: r.anion, from: name }] : [],
    tags: tags(r, name), indicator: null, base: COLOURS[r.formula] ?? CLEAR, ppt: null, gas: null, milky: false, hydroxide: r.anion === "OH-" ? 1 : 0, heatedFor: 0,
  };
}

// Something is added to a liquid: what happens.
export function addTo(l: Liquid | undefined, name: string, sp: Spec): { l: Liquid; note: string; fx: Fx } {
  if (sp.e === "indicator") {
    if (!l) return { l: { ...newLiquid("water", { e: "reagent", formula: "H2O", kind: "other", pH: 7, hazards: [] }), parts: [name], indicator: sp.ind }, note: `${name} on its own: ${indicatorColour(sp.ind, 7).name}.`, fx: "drop" };
    if (sp.ind === "starch") {
      const blue = l.tags.includes("iodine");
      return { l: { ...l, parts: [...l.parts, name], base: blue ? "#1E1B4B" : l.base, tags: [...l.tags, "starch"] }, note: blue ? "It turns blue-black: iodine is present." : "No change.", fx: blue ? "colour" : "drop" };
    }
    const c = indicatorColour(sp.ind, pHOf(l));
    return { l: { ...l, parts: [...l.parts, name], indicator: sp.ind }, note: `${name} turns ${c.name}: the solution has a pH of about ${pHOf(l)}.`, fx: "colour" };
  }
  if (sp.e !== "reagent") return { l: l!, note: "", fx: "none" };
  if (sp.kind === "gas") {
    if (!l) return { l: l!, note: `${name} is a gas: bubble it through a liquid, or test it with a splint.`, fx: "none" };
    return bubble(l, sp.formula, name);
  }
  if (!l) return { l: newLiquid(name, sp), note: `${name} poured in.`, fx: "pour" };
  const add = newLiquid(name, sp);
  const vol = l.vol + add.vol, acidBefore = l.acid;
  let m: Liquid = {
    ...l, parts: [...l.parts, name], acid: (l.acid * l.vol + add.acid * add.vol) / vol, vol,
    cations: [...l.cations, ...add.cations], anions: [...l.anions, ...add.anions], tags: [...new Set([...l.tags, ...add.tags])],
    base: l.base === CLEAR ? add.base : add.base === CLEAR ? l.base : add.base, hydroxide: l.hydroxide + add.hydroxide,
  };
  const notes: string[] = []; let fx: Fx = "pour";
  // Neutralisation warms the mixture.
  if (acidBefore * add.acid < -0.01) { m.T += 6; notes.push(`The mixture warms up (neutralisation): pH now about ${pHOf(m)}.`); }
  // Hydroxide ions with metal ions from something else: a precipitate.
  if (add.hydroxide && !l.ppt) {
    const cat = m.cations.find((c) => c.from !== name && PPT_OH[c.ion]);
    if (cat) { const [colour, nm] = PPT_OH[cat.ion]; m.ppt = { colour, name: nm }; fx = "ppt"; notes.push(`A precipitate forms: ${nm}.`); }
  } else if (add.hydroxide && l.ppt) {
    const cat = m.cations.find((c) => PPT_OH[c.ion]);
    if (cat && PPT_OH[cat.ion][2] && m.hydroxide >= 2) { m.ppt = null; notes.push("The precipitate dissolves in excess sodium hydroxide, giving a colourless solution."); fx = "colour"; }
    else notes.push("The precipitate does not dissolve in excess.");
  }
  if (!add.hydroxide && m.hydroxide && !l.ppt) {
    const cat = add.cations.find((c) => PPT_OH[c.ion]);
    if (cat && m.anions.some((a) => a.ion === "OH-" && a.from !== name)) { const [colour, nm] = PPT_OH[cat.ion]; m.ppt = { colour, name: nm }; fx = "ppt"; notes.push(`A precipitate forms: ${nm}.`); }
  }
  // Silver and barium tests.
  const pair = (cat: string, an: string) => m.cations.some((c) => c.ion === cat) && m.anions.some((a) => a.ion === an) && m.cations.find((c) => c.ion === cat)!.from !== m.anions.find((a) => a.ion === an)!.from;
  if (!m.ppt && pair("Ag+", "Cl-")) { m.ppt = { colour: "#F8FAFC", name: "silver chloride (white)" }; fx = "ppt"; notes.push("A white precipitate of silver chloride: chloride ions are present."); }
  if (!m.ppt && pair("Ba2+", "SO4 2-")) { m.ppt = { colour: "#F8FAFC", name: "barium sulfate (white)" }; fx = "ppt"; notes.push("A white precipitate of barium sulfate: sulfate ions are present."); }
  if (!m.ppt && pair("Pb2+", "Cl-")) { m.ppt = { colour: "#F8FAFC", name: "lead(II) chloride (white)" }; fx = "ppt"; notes.push("A white precipitate of lead(II) chloride."); }
  // Acids with carbonates and metals: fizzing.
  if (m.acid > 0.1 && m.tags.includes("carbonate")) { m.gas = "CO2"; m.tags = m.tags.filter((t) => t !== "carbonate"); fx = "fizz"; notes.push("It fizzes: carbon dioxide is given off (test it with limewater)."); }
  const metal = m.tags.find((t) => t.startsWith("metal:") && t !== "metal:Cu");
  if (metal === "metal:Na") { m.gas = "H2"; m.acid = Math.min(m.acid, -1); m.T += 15; fx = "fizz"; notes.push("Sodium fizzes about on the surface, melts into a ball and gives off hydrogen; the solution becomes alkaline."); }
  else if (metal && m.acid > 0.1) { m.gas = "H2"; fx = "fizz"; notes.push(`It bubbles: hydrogen is given off (a lighted splint pops). ${metal === "metal:Mg" ? "Magnesium reacts quickly" : metal === "metal:Zn" ? "Zinc reacts steadily" : "Iron reacts slowly"}.`); }
  if (m.tags.includes("metal:Cu") && m.acid > 0.1 && !metal) notes.push("Copper doesn't react with dilute acid: it is below hydrogen in the reactivity series.");
  // Food tests and other colour changes.
  if (m.tags.includes("iodine") && m.tags.includes("starch")) { m.base = "#1E1B4B"; fx = "colour"; notes.push("Blue-black: starch is present."); }
  else if (add.tags.includes("iodine")) notes.push("The iodine stays orange-brown: no starch.");
  if (m.tags.includes("biuret")) { if (m.tags.includes("protein")) { m.base = "#7C3AED"; fx = "colour"; notes.push("Purple: protein is present."); } else if (add.tags.includes("biuret")) notes.push("It stays blue: no protein."); }
  if (add.tags.includes("benedict")) notes.push("Now heat it in a water bath: Benedict's only changes colour when it's hot.");
  if (m.tags.includes("dcpip") && /vitamin|citric|fruit/i.test(m.parts.join(" "))) { m.base = CLEAR; notes.push("The blue DCPIP is decolourised: vitamin C is present."); }
  if (m.tags.includes("peroxide") && m.cations.some((c) => c.ion === "Fe3+" || c.ion === "Cu2+")) { m.gas = "O2"; fx = "fizz"; notes.push("Bubbles of oxygen: the metal ions catalyse the decomposition of hydrogen peroxide."); }
  if (!notes.length) notes.push(`${name} added: no visible reaction${m.indicator ? ` (the indicator shows pH about ${pHOf(m)})` : ""}.`);
  if (m.indicator && fx === "pour") fx = "colour";
  m = { ...m, T: Math.min(100, m.T) };
  return { l: m, note: notes.join(" "), fx };
}
// A gas bubbled through a liquid.
function bubble(l: Liquid, gas: string, name: string): { l: Liquid; note: string; fx: Fx } {
  if (gas === "CO2" && l.tags.includes("limewater")) return { l: { ...l, milky: true }, note: "The limewater turns milky: the gas is carbon dioxide.", fx: "ppt" };
  if ((gas === "C2H4" || gas === "C2H2") && l.tags.includes("bromine")) return { l: { ...l, base: CLEAR, tags: l.tags.filter((t) => t !== "bromine") }, note: "The bromine water is decolourised (orange to colourless): the gas is unsaturated.", fx: "colour" };
  if (gas === "NH3" || gas === "CO2" || gas === "Cl2") { const acid = gas === "NH3" ? l.acid - 0.4 : l.acid + 0.15; return { l: { ...l, acid }, note: `${name} dissolves: the solution becomes ${gas === "NH3" ? "more alkaline" : "more acidic"} (pH about ${pHOf({ ...l, acid })}).`, fx: "colour" }; }
  return { l, note: `${name} bubbles through with no visible change.`, fx: "fizz" };
}

const label = (st: BenchState, text: string) => ({ ...st, log: [...st.log, { at: Date.now(), text }].slice(-60) });
const slot = (st: BenchState, id: string) => st.slots[id] ?? {};
const put = (st: BenchState, id: string, s: Slot): BenchState => ({ ...st, slots: { ...st.slots, [id]: { ...slot(st, id), ...s } } });

// Put `a` onto `b`.
export function combine(a: Item, b: Item, st0: BenchState): Result {
  let st = st0;
  const res = (note: string, fx: Fx, ok = true): Result => ({ st: label(st, note), note, fx, ok });
  const A = a.spec, B = b.spec;
  // Liquids into containers.
  if ((A.e === "reagent" || A.e === "indicator") && isVessel(b)) {
    const r = addTo(slot(st, b.id).liquid, a.name, A);
    if (r.fx === "none") return res(r.note, "none", false);
    st = put(st, b.id, { liquid: r.l });
    return res(`${b.name}: ${r.note}`, r.fx);
  }
  if (isVessel(a) && (B.e === "reagent" || B.e === "indicator")) return combine(b, a, st0);
  // One container into another: pour, or bubble the gas it's making through.
  if (isVessel(a) && isVessel(b)) {
    const la = slot(st, a.id).liquid, lb = slot(st, b.id).liquid;
    if (!la) return res(`The ${a.name.toLowerCase()} is empty — put something in it first.`, "none", false);
    if (la.gas && lb) { const r = bubble(lb, la.gas, la.gas === "CO2" ? "Carbon dioxide" : la.gas === "H2" ? "Hydrogen" : la.gas); st = put(st, b.id, { liquid: r.l }); return res(`Gas from the ${a.name.toLowerCase()} into the ${b.name.toLowerCase()}: ${r.note}`, r.fx); }
    const out: Liquid = lb ? { ...lb, parts: [...lb.parts, ...la.parts], vol: lb.vol + la.vol, acid: (lb.acid * lb.vol + la.acid * la.vol) / (lb.vol + la.vol), cations: [...lb.cations, ...la.cations], anions: [...lb.anions, ...la.anions], tags: [...new Set([...lb.tags, ...la.tags])], indicator: lb.indicator ?? la.indicator, ppt: lb.ppt ?? la.ppt, T: (lb.T * lb.vol + la.T * la.vol) / (lb.vol + la.vol) } : { ...la };
    st = put(put(st, b.id, { liquid: out }), a.id, { liquid: undefined });
    return res(`Poured the ${a.name.toLowerCase()} into the ${b.name.toLowerCase()}.`, "pour");
  }
  // Heating.
  if (isVessel(a) && isHeater(b)) {
    const l = slot(st, a.id).liquid;
    if (/measuring cylinder|volumetric|burette|pipette/i.test(a.name)) return res(`Never heat a ${a.name.toLowerCase()} — the heat spoils its accuracy and can crack it. Use a beaker or boiling tube.`, "none", false);
    st = put(put(st, a.id, { heat: b.id }), b.id, { on: true });
    return res(l ? `The ${a.name.toLowerCase()} is heating on the ${b.name.toLowerCase()}.` : `The ${a.name.toLowerCase()} is empty: heating dry glass can crack it. Put a liquid in first.`, "heat", !!l);
  }
  if (isHeater(a) && isVessel(b)) return combine(b, a, st0);
  if (isThermo(a) && isVessel(b)) {
    const l = slot(st, b.id).liquid;
    st = put(st, a.id, { inside: b.id, reading: l ? `${Math.round(l.T)} °C` : "25 °C" });
    return res(l ? `The thermometer reads ${Math.round(l.T)} °C.` : "The thermometer reads the room temperature: 25 °C.", "view");
  }
  // Circuits: join parts in series.
  if (partOf(a) && partOf(b)) {
    const wires = [...new Set([...st.wires, b.id, a.id])];
    st = { ...st, wires };
    return res(`Connected the ${a.name.toLowerCase()} to the ${b.name.toLowerCase()}.`, "light");
  }
  if (B.e === "microscope" && (A.e === "specimen" || /slide/i.test(a.name))) {
    const mag = B.eyepiece * B.objectives[Math.min(1, B.objectives.length - 1)];
    const what = A.e === "specimen" ? `${a.name}: ${A.features.slice(0, 2).join("; ")}` : a.name;
    st = put(st, b.id, { reading: a.name });
    return res(`Under the microscope at ×${mag}: ${what}. Focus with the coarse knob, then the fine knob.`, "view");
  }
  if (A.e === "magnet" && B.e === "magnet") { const flip = !slot(st, b.id).flip; st = put(st, b.id, { flip }); return res(flip ? "Unlike poles facing: they attract and snap together." : "Like poles facing: they repel and push apart.", "click"); }
  if (/compass/i.test(a.name) && B.e === "magnet") return res(`The compass needle turns towards the magnet's pole — about 70° at 5 cm, hardly at all at 30 cm.`, "click");
  if (A.e === "radiation" && B.e === "radiation" && B.kind === "detector" && A.kind !== "detector" && A.kind !== "halflife") { const c = countRate(A.kind, "none", 3, Math.random); st = put(st, b.id, { reading: `${c.perSecond} /s` }); return res(`The counter clicks: ${c.counts} counts in 10 s (${c.perSecond} per second, ${c.corrected} once the background is taken off).`, "click"); }
  if (A.e === "wave" && A.part === "fork" && B.e === "wave" && (B.part === "tube" || B.part === "string")) return res(B.part === "tube" ? `Hold the ${A.f} Hz fork over the tube and lift it: it booms at about ${Math.round(firstResonance(A.f ?? 256) * 1000) / 10} cm — the first resonance.` : `Stand the fork on the sonometer and move the bridge until the paper rider jumps off: resonance.`, "click");
  if (A.e === "optic" && A.f && (/screen|light|object|candle/i.test(b.name))) { const i = image(A.f, 30); return res(`Object 30 cm from the lens: the image forms ${Number.isFinite(i.v) ? `${Math.round(i.v * 10) / 10} cm away` : "at infinity"} — ${i.nature}`, "view"); }
  if (/slotted masses|mass hanger/i.test(a.name) && B.e === "spring") { const r = stretch(B.k, B.limit, 2); st = put(st, b.id, { reading: `${Math.round(r.x * 1000) / 10} cm` }); return res(`With 2 N hanging, the spring stretches ${Math.round(r.x * 1000) / 10} cm (F = kx, k = ${B.k} N/m).`, "click"); }
  if (A.e === "random" && /tally|frequency/i.test(b.name)) { const k = A.kind === "coin" ? 2 : A.sides ?? 6; const v = 1 + Math.floor(Math.random() * k); return res(`${A.kind === "coin" ? (v === 1 ? "Heads" : "Tails") : `Rolled a ${v}`} — one more tally mark.`, "click"); }
  return res(hintFor(a, b), "none", false);
}
function hintFor(a: Item, b: Item): string {
  const B = b.spec;
  const use = B.e === "vessel" ? "pour a reagent or indicator into it, or put it on a heater" : B.e === "heater" ? "put a beaker or boiling tube of liquid on it" : B.e === "circuit" ? "connect another circuit part to it" : B.e === "microscope" ? "put a slide or specimen on it" : B.e === "reagent" ? "pour it into a test tube or beaker" : "look at what it's used for";
  return `Nothing happens when you put the ${a.name.toLowerCase()} on the ${b.name.toLowerCase()}. For the ${b.name.toLowerCase()}: ${use}.`;
}

// Time passing: heating, boiling, Benedict's turning colour; the circuit's current.
export function tick(st: BenchState, items: Item[], seconds: number): BenchState {
  let next = st;
  for (const it of items) {
    const s = slot(st, it.id);
    if (!s.heat || !s.liquid) continue;
    const heater = items.find((x) => x.id === s.heat);
    if (!heater || heater.spec.e !== "heater") { next = put(next, it.id, { heat: null }); continue; }
    const P = heater.spec.power * 0.15; // only part of the flame's energy goes into a small amount of liquid
    const l = s.liquid, rise = (P * seconds) / ((Math.max(5, l.vol) / 1000) * 4200 * 6);
    const T = Math.min(100, l.T + rise), heatedFor = l.heatedFor + (T > 70 ? seconds : 0);
    let liquid: Liquid = { ...l, T, heatedFor };
    let note: string | null = null;
    if (l.tags.includes("benedict") && T > 70) {
      const g = l.tags.includes("glucose");
      const stages = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#B91C1C"], k = g ? Math.min(4, Math.floor(heatedFor / 4)) : 0;
      if (g && stages[k] !== l.base) { liquid = { ...liquid, base: stages[k] }; if (k === 4) note = `${it.name}: Benedict's has turned brick-red — a reducing sugar (glucose) is present.`; }
      if (!g && heatedFor >= 8 && heatedFor - seconds < 8) note = `${it.name}: Benedict's stays blue after heating — no reducing sugar.`;
    }
    if (T >= 100 && l.T < 100) note = `${it.name}: it's boiling at 100 °C — the temperature stays the same while the water turns to steam.`;
    next = put(next, it.id, { liquid, boiling: T >= 100 });
    if (note) next = label(next, note);
  }
  // Thermometers follow the liquid they're in.
  for (const it of items) { const s = slot(next, it.id); if (s.inside) { const l = slot(next, s.inside).liquid; next = put(next, it.id, { reading: `${Math.round(l?.T ?? 25)} °C` }); } }
  return circuitState(next, items);
}

// The circuit: everything joined is in series.
export function circuitState(st: BenchState, items: Item[]): BenchState {
  const parts = st.wires.map((id) => items.find((x) => x.id === id)).filter((x): x is Item => !!x && !!partOf(x));
  let next = st;
  for (const p of parts) next = put(next, p.id, { glow: 0, spin: false });
  const emf = parts.reduce((s, p) => s + (partOf(p) === "cell" || partOf(p) === "supply" ? (p.spec as Extract<Spec, { e: "circuit" }>).value || 0 : 0), 0);
  const open = parts.some((p) => partOf(p) === "switch" && !slot(st, p.id).on) || parts.some((p) => slot(st, p.id).blown);
  if (!emf || open || parts.length < 2) return next;
  let drop = 0, R = 0.2, voltmeterInSeries = false;
  for (const p of parts) {
    const sp = p.spec as Extract<Spec, { e: "circuit" }>, v = sp.value ?? 0;
    switch (partOf(p)) {
      case "resistor": case "heater": case "wire": R += v; break;
      case "rheostat": R += v / 2; break;
      case "lamp": R += 12; break;
      case "diode": drop += 0.6; R += 10; break;
      case "led": drop += 1.8; R += 100; break;
      case "motor": R += 4; break;
      case "bell": case "relay": R += 12; break;
      case "thermistor": R += current("thermistor", v, { V: 1 }).R ?? v; break;
      case "ldr": R += current("ldr", 0, { V: 1, lux: 300 }).R ?? 1000; break;
      case "voltmeter": voltmeterInSeries = true; R += 1e6; break;
      case "fuse": R += 0.1; break;
    }
  }
  const I = Math.max(0, (emf - drop) / R);
  for (const p of parts) {
    const sp = p.spec as Extract<Spec, { e: "circuit" }>, part = partOf(p);
    if (part === "fuse" && I > (sp.value || 3)) { next = put(next, p.id, { blown: true }); next = label(next, `The fuse blew: ${I.toFixed(2)} A is more than its ${sp.value} A rating, so the circuit is broken.`); return circuitState(next, items); }
    if (part === "lamp") next = put(next, p.id, { glow: Math.min(1, I / 0.5) });
    if (part === "led") next = put(next, p.id, { glow: I > 0.002 ? 1 : 0 });
    if (part === "motor") next = put(next, p.id, { spin: I > 0.05 });
    if (part === "bell") next = put(next, p.id, { spin: I > 0.1 });
    if (part === "ammeter" || part === "galvanometer") next = put(next, p.id, { reading: `${I.toFixed(2)} A` });
    if (part === "voltmeter") next = put(next, p.id, { reading: voltmeterInSeries && parts.length > 2 ? `${emf.toFixed(1)} V` : `${(I * R).toFixed(1)} V` });
  }
  return { ...next, wires: st.wires };
}
// What the circuit is doing, in words.
export function circuitNote(st: BenchState, items: Item[]): string | null {
  const parts = st.wires.map((id) => items.find((x) => x.id === id)).filter((x): x is Item => !!x);
  if (parts.length < 2) return null;
  const has = (p: string) => parts.some((x) => partOf(x) === p);
  if (!has("cell") && !has("supply")) return "No power: add a cell or power supply to the circuit.";
  if (parts.some((p) => partOf(p) === "switch" && !slot(st, p.id).on)) return "The switch is open: tap it to close the circuit.";
  if (has("voltmeter") && !has("resistor") && !has("lamp")) return "A voltmeter in series lets almost no current through — connect it in parallel across a component.";
  const amm = parts.find((p) => partOf(p) === "ammeter");
  return amm ? `The ammeter reads ${slot(st, amm.id).reading ?? "0.00 A"}.` : "The circuit is complete — add an ammeter to measure the current.";
}
