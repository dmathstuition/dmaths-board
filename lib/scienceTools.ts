// Three science tools on the board — pure: the periodic table, the circuit
// builder and label-the-diagram. What each holds, how it's cleaned as it
// arrives over the class channel, and the facts and sums behind them.
import type { Panel } from "@/lib/boardTools";

const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const int = (n: unknown, lo: number, hi: number, d: number) => Math.round(clamp(n, lo, hi, d));
const panel = (p: any, d: Panel): Panel => ({ on: !!p?.on, x: clamp(p?.x, 0, 0.95, d.x), y: clamp(p?.y, 0, 0.95, d.y) });
export const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;
export const tidy = (x: number, dp = 2) => String(round(x, dp));

// ═══ Periodic table ═══════════════════════════════════════════════════════
export type Family = "am" | "ae" | "tm" | "pt" | "ml" | "nm" | "ha" | "ng" | "la" | "ac";
export const FAMILIES: Record<Family, { name: string; colour: string }> = {
  am: { name: "Alkali metal", colour: "#FCA5A5" }, ae: { name: "Alkaline earth metal", colour: "#FDBA74" }, tm: { name: "Transition metal", colour: "#FDE68A" },
  pt: { name: "Other metal", colour: "#A7F3D0" }, ml: { name: "Metalloid", colour: "#99F6E4" }, nm: { name: "Non-metal", colour: "#BAE6FD" },
  ha: { name: "Halogen", colour: "#C7D2FE" }, ng: { name: "Noble gas", colour: "#F5D0FE" }, la: { name: "Lanthanide", colour: "#FBCFE8" }, ac: { name: "Actinide", colour: "#E9D5FF" },
};
// symbol, name, relative atomic mass, family — in order of atomic number.
const RAW = "H,Hydrogen,1.008,nm;He,Helium,4.003,ng;Li,Lithium,6.94,am;Be,Beryllium,9.012,ae;B,Boron,10.81,ml;C,Carbon,12.01,nm;N,Nitrogen,14.01,nm;O,Oxygen,16.00,nm;F,Fluorine,19.00,ha;Ne,Neon,20.18,ng;"
  + "Na,Sodium,22.99,am;Mg,Magnesium,24.31,ae;Al,Aluminium,26.98,pt;Si,Silicon,28.09,ml;P,Phosphorus,30.97,nm;S,Sulfur,32.06,nm;Cl,Chlorine,35.45,ha;Ar,Argon,39.95,ng;"
  + "K,Potassium,39.10,am;Ca,Calcium,40.08,ae;Sc,Scandium,44.96,tm;Ti,Titanium,47.87,tm;V,Vanadium,50.94,tm;Cr,Chromium,52.00,tm;Mn,Manganese,54.94,tm;Fe,Iron,55.85,tm;Co,Cobalt,58.93,tm;Ni,Nickel,58.69,tm;Cu,Copper,63.55,tm;Zn,Zinc,65.38,tm;"
  + "Ga,Gallium,69.72,pt;Ge,Germanium,72.63,ml;As,Arsenic,74.92,ml;Se,Selenium,78.97,nm;Br,Bromine,79.90,ha;Kr,Krypton,83.80,ng;"
  + "Rb,Rubidium,85.47,am;Sr,Strontium,87.62,ae;Y,Yttrium,88.91,tm;Zr,Zirconium,91.22,tm;Nb,Niobium,92.91,tm;Mo,Molybdenum,95.95,tm;Tc,Technetium,98,tm;Ru,Ruthenium,101.1,tm;Rh,Rhodium,102.9,tm;Pd,Palladium,106.4,tm;Ag,Silver,107.9,tm;Cd,Cadmium,112.4,tm;"
  + "In,Indium,114.8,pt;Sn,Tin,118.7,pt;Sb,Antimony,121.8,ml;Te,Tellurium,127.6,ml;I,Iodine,126.9,ha;Xe,Xenon,131.3,ng;"
  + "Cs,Caesium,132.9,am;Ba,Barium,137.3,ae;La,Lanthanum,138.9,la;Ce,Cerium,140.1,la;Pr,Praseodymium,140.9,la;Nd,Neodymium,144.2,la;Pm,Promethium,145,la;Sm,Samarium,150.4,la;Eu,Europium,152.0,la;Gd,Gadolinium,157.3,la;"
  + "Tb,Terbium,158.9,la;Dy,Dysprosium,162.5,la;Ho,Holmium,164.9,la;Er,Erbium,167.3,la;Tm,Thulium,168.9,la;Yb,Ytterbium,173.0,la;Lu,Lutetium,175.0,la;"
  + "Hf,Hafnium,178.5,tm;Ta,Tantalum,180.9,tm;W,Tungsten,183.8,tm;Re,Rhenium,186.2,tm;Os,Osmium,190.2,tm;Ir,Iridium,192.2,tm;Pt,Platinum,195.1,tm;Au,Gold,197.0,tm;Hg,Mercury,200.6,tm;"
  + "Tl,Thallium,204.4,pt;Pb,Lead,207.2,pt;Bi,Bismuth,209.0,pt;Po,Polonium,209,pt;At,Astatine,210,ha;Rn,Radon,222,ng;"
  + "Fr,Francium,223,am;Ra,Radium,226,ae;Ac,Actinium,227,ac;Th,Thorium,232.0,ac;Pa,Protactinium,231.0,ac;U,Uranium,238.0,ac;Np,Neptunium,237,ac;Pu,Plutonium,244,ac;Am,Americium,243,ac;Cm,Curium,247,ac;"
  + "Bk,Berkelium,247,ac;Cf,Californium,251,ac;Es,Einsteinium,252,ac;Fm,Fermium,257,ac;Md,Mendelevium,258,ac;No,Nobelium,259,ac;Lr,Lawrencium,266,ac;"
  + "Rf,Rutherfordium,267,tm;Db,Dubnium,268,tm;Sg,Seaborgium,269,tm;Bh,Bohrium,270,tm;Hs,Hassium,277,tm;Mt,Meitnerium,278,tm;Ds,Darmstadtium,281,tm;Rg,Roentgenium,282,tm;Cn,Copernicium,285,tm;"
  + "Nh,Nihonium,286,pt;Fl,Flerovium,289,pt;Mc,Moscovium,290,pt;Lv,Livermorium,293,pt;Ts,Tennessine,294,ha;Og,Oganesson,294,ng";

export type Element = {
  z: number; symbol: string; name: string; mass: number; family: Family;
  period: number; group: number | null;      // group is null for the lanthanides and actinides
  col: number; row: number;                  // where it sits in the usual layout (row 8 and 9: the two rows underneath)
  state: "solid" | "liquid" | "gas";         // at room temperature
};
const PERIOD_START = [1, 3, 11, 19, 37, 55, 87, 119];
const GASES = new Set([1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86]), LIQUIDS = new Set([35, 80]);
function place(z: number): Pick<Element, "period" | "group" | "col" | "row"> {
  const period = PERIOD_START.findIndex((s) => z < s), start = PERIOD_START[period - 1], k = z - start; // k: place in the period, from 0
  if (z >= 57 && z <= 71) return { period: 6, group: null, col: 3 + (z - 57), row: 8 };
  if (z >= 89 && z <= 103) return { period: 7, group: null, col: 3 + (z - 89), row: 9 };
  let group: number;
  if (period === 1) group = k === 0 ? 1 : 18;
  else if (period <= 3) group = k < 2 ? k + 1 : k + 11;
  else if (period <= 5) group = k + 1;
  else group = k < 2 ? k + 1 : k - 13; // after the 15 in the row underneath (and its place-holder in group 3)
  return { period, group, col: group, row: period };
}
export const ELEMENTS: Element[] = RAW.split(";").map((e, i) => {
  const [symbol, name, mass, family] = e.split(","), z = i + 1;
  return { z, symbol, name, mass: Number(mass), family: family as Family, ...place(z), state: GASES.has(z) ? "gas" : LIQUIDS.has(z) ? "liquid" : "solid" };
});
export const element = (z: number) => ELEMENTS[z - 1] ?? null;
export const isMetal = (e: Element) => ["am", "ae", "tm", "pt", "la", "ac"].includes(e.family);
export const metalKind = (e: Element) => (e.family === "ml" ? "Metalloid" : isMetal(e) ? "Metal" : "Non-metal");
// Electrons in each shell, for the first 20 elements (2, 8, 8, 2).
export function shells(z: number): number[] | null {
  if (z < 1 || z > 20) return null;
  const out: number[] = [];
  let left = z;
  for (const cap of [2, 8, 8, 2]) { if (left <= 0) break; out.push(Math.min(cap, left)); left -= cap; }
  return out;
}
export type PColour = "family" | "state" | "metal" | "none";
export const STATE_COLOURS = { solid: "#E2E8F0", liquid: "#93C5FD", gas: "#FDE68A" } as const;
export const METAL_COLOURS = { Metal: "#FDE68A", Metalloid: "#99F6E4", "Non-metal": "#BAE6FD" } as const;
export const elementColour = (e: Element, by: PColour) =>
  (by === "family" ? FAMILIES[e.family].colour : by === "state" ? STATE_COLOURS[e.state] : by === "metal" ? METAL_COLOURS[metalKind(e) as keyof typeof METAL_COLOURS] : "#F1F5F9");
// hide: a quiz — the squares show only atomic numbers until the teacher reveals the chosen one.
export type PTableState = Panel & { sel: number; colour: PColour; hide: boolean; reveal: boolean };
export const DEFAULT_PTABLE: PTableState = { on: false, x: 0.03, y: 0.04, sel: 0, colour: "family", hide: false, reveal: false };
export function cleanPTable(p: any): PTableState {
  const d = DEFAULT_PTABLE;
  return { ...panel(p, d), sel: int(p?.sel, 0, 118, 0), colour: ["state", "metal", "none"].includes(p?.colour) ? p.colour : "family", hide: !!p?.hide, reveal: !!p?.reveal };
}

// ═══ Circuit builder ══════════════════════════════════════════════════════
// A battery of cells, a main switch and ammeter, and up to three branches side
// by side (parallel). The parts on one branch are in series.
export type PartKind = "bulb" | "resistor" | "switch" | "ammeter";
export type Part = { kind: PartKind; open?: boolean };
export type CircuitState = Panel & { cells: number; closed: boolean; branches: Part[][]; volt: string }; // volt: where the voltmeter is ("" none, "battery", "b0", "p0.1")
export const CELL_VOLTS = 1.5, BULB_OHMS = 6, RESISTOR_OHMS = 10, MAX_CELLS = 6, MAX_BRANCHES = 3, MAX_PARTS = 4;
export const PART_NAMES: Record<PartKind, string> = { bulb: "Bulb", resistor: "Resistor", switch: "Switch", ammeter: "Ammeter" };
export const DEFAULT_CIRCUIT: CircuitState = { on: false, x: 0.06, y: 0.04, cells: 2, closed: true, branches: [[{ kind: "bulb" }]], volt: "" };
const KINDS: PartKind[] = ["bulb", "resistor", "switch", "ammeter"];
export function cleanCircuit(c: any): CircuitState {
  const d = DEFAULT_CIRCUIT;
  const branches: Part[][] = (Array.isArray(c?.branches) ? c.branches : d.branches).slice(0, MAX_BRANCHES)
    .map((b: any) => (Array.isArray(b) ? b : []).slice(0, MAX_PARTS).filter((p: any) => KINDS.includes(p?.kind)).map((p: any) => (p.kind === "switch" ? { kind: "switch" as const, open: !!p.open } : { kind: p.kind as PartKind })));
  const state: CircuitState = { ...panel(c, d), cells: int(c?.cells, 1, MAX_CELLS, d.cells), closed: c ? c.closed !== false : true, branches: branches.length ? branches : [[]], volt: "" };
  const v = String(c?.volt ?? "");
  return { ...state, volt: voltTargets(state).some((t) => t.id === v) ? v : "" };
}
export const ohms = (p: Part) => (p.kind === "bulb" ? BULB_OHMS : p.kind === "resistor" ? RESISTOR_OHMS : 0);
// Can this part go on this branch? (room for four; one switch a branch)
export const canAdd = (branch: Part[], kind: PartKind) => branch.length < MAX_PARTS && !(kind === "switch" && branch.some((p) => p.kind === "switch"));
// Where the voltmeter can go.
export function voltTargets(c: Pick<CircuitState, "branches">): { id: string; label: string }[] {
  const many = c.branches.length > 1;
  return [{ id: "battery", label: "the battery" },
    ...c.branches.flatMap((b, i) => [
      ...(many && b.length ? [{ id: `b${i}`, label: `branch ${i + 1}` }] : []),
      ...b.map((p, j) => ({ id: `p${i}.${j}`, label: `${PART_NAMES[p.kind].toLowerCase()} ${j + 1}${many ? ` on branch ${i + 1}` : ""}` })),
    ])];
}

export type Brightness = "off" | "dim" | "normal" | "bright" | "very bright";
export type Solved = {
  volts: number;                // the battery
  short: boolean;               // a path with nothing to resist the current
  total: number;                // amps from the battery (the main ammeter)
  branches: { amps: number; ohms: number; open: boolean; empty: boolean; parts: { volts: number; watts: number; brightness: Brightness }[] }[];
  voltmeter: number | null;
};
const NORMAL_WATTS = (CELL_VOLTS * CELL_VOLTS) / BULB_OHMS; // one bulb on one cell
export function brightness(watts: number): Brightness {
  const k = watts / NORMAL_WATTS;
  return k < 0.02 ? "off" : k < 0.6 ? "dim" : k < 1.6 ? "normal" : k < 5 ? "bright" : "very bright";
}
// Ohm's law on every branch. The cells and meters are ideal (no resistance of their own).
export function solveCircuit(c: Pick<CircuitState, "cells" | "closed" | "branches" | "volt">): Solved {
  const volts = c.cells * CELL_VOLTS;
  const info = c.branches.map((b) => ({ empty: b.length === 0, open: b.some((p) => p.kind === "switch" && p.open), r: b.reduce((a, p) => a + ohms(p), 0) }));
  const short = c.closed && info.some((x) => !x.empty && !x.open && x.r === 0);
  const live = c.closed && !short;
  const branches = c.branches.map((b, i) => {
    const x = info[i], amps = live && !x.empty && !x.open ? volts / x.r : 0;
    return { amps, ohms: x.r, open: x.open, empty: x.empty,
      parts: b.map((p) => {
        // A part's share of the voltage; an open switch in a live circuit has all of it across its gap.
        const v = p.kind === "switch" && p.open ? (live ? volts : 0) : amps * ohms(p), watts = amps * amps * ohms(p);
        return { volts: v, watts, brightness: p.kind === "bulb" ? brightness(watts) : ("off" as Brightness) };
      }) };
  });
  const total = branches.reduce((a, b) => a + b.amps, 0);
  let voltmeter: number | null = null;
  const b = c.volt.match(/^b(\d)$/), p = c.volt.match(/^p(\d)\.(\d)$/);
  if (c.volt === "battery") voltmeter = short ? 0 : volts;
  else if (b && branches[+b[1]] && !branches[+b[1]].empty) voltmeter = live ? volts : 0;
  else if (p && branches[+p[1]]?.parts[+p[2]]) voltmeter = branches[+p[1]].parts[+p[2]].volts;
  return { volts, short, total, branches, voltmeter };
}

// ═══ Label the diagram ════════════════════════════════════════════════════
// Each label points at a place on a 600 × 360 drawing (components/live/board/ScienceTools).
export type DiagramId = "animal-cell" | "plant-cell" | "heart" | "flower" | "bunsen" | "digestion" | "eye" | "leaf" | "skeleton" | "tooth";
export type DLabel = { name: string; note: string; at: [number, number]; side: "l" | "r" };
export const DIAGRAMS: Record<DiagramId, { title: string; subject: string; labels: DLabel[] }> = {
  "animal-cell": { title: "Animal cell", subject: "Biology", labels: [
    { name: "Cell membrane", note: "Controls what goes into and out of the cell.", at: [403, 114], side: "r" },
    { name: "Cytoplasm", note: "Jelly where the cell's chemical reactions happen.", at: [232, 128], side: "l" },
    { name: "Nucleus", note: "Holds the DNA and controls the cell.", at: [262, 178], side: "l" },
    { name: "Mitochondrion", note: "Where respiration releases energy.", at: [372, 158], side: "r" },
    { name: "Ribosomes", note: "Where proteins are made.", at: [338, 246], side: "r" },
  ] },
  "plant-cell": { title: "Plant cell", subject: "Biology", labels: [
    { name: "Cell wall", note: "Made of cellulose; keeps the cell's shape.", at: [181, 212], side: "l" },
    { name: "Cell membrane", note: "Controls what goes into and out of the cell.", at: [410, 158], side: "r" },
    { name: "Vacuole", note: "Filled with cell sap; keeps the cell firm.", at: [318, 190], side: "r" },
    { name: "Nucleus", note: "Holds the DNA and controls the cell.", at: [224, 108], side: "l" },
    { name: "Chloroplast", note: "Contains chlorophyll: where photosynthesis happens.", at: [388, 104], side: "r" },
    { name: "Cytoplasm", note: "Jelly where the cell's chemical reactions happen.", at: [213, 170], side: "l" },
    { name: "Mitochondrion", note: "Where respiration releases energy.", at: [391, 226], side: "r" },
  ] },
  heart: { title: "Heart", subject: "Biology", labels: [
    { name: "Vena cava", note: "Brings blood low in oxygen back from the body.", at: [225, 78], side: "l" },
    { name: "Right atrium", note: "Takes in blood from the body.", at: [246, 158], side: "l" },
    { name: "Right ventricle", note: "Pumps blood to the lungs.", at: [256, 246], side: "l" },
    { name: "Septum", note: "The wall that keeps the two sides apart.", at: [300, 290], side: "l" },
    { name: "Pulmonary artery", note: "Carries blood low in oxygen to the lungs.", at: [274, 58], side: "l" },
    { name: "Aorta", note: "The main artery: carries oxygen-rich blood to the body.", at: [330, 52], side: "r" },
    { name: "Pulmonary vein", note: "Brings oxygen-rich blood from the lungs.", at: [386, 84], side: "r" },
    { name: "Left atrium", note: "Takes in blood from the lungs.", at: [354, 158], side: "r" },
    { name: "Valve", note: "Stops blood flowing backwards.", at: [352, 196], side: "r" },
    { name: "Left ventricle", note: "Thick muscle: pumps blood round the whole body.", at: [346, 252], side: "r" },
  ] },
  flower: { title: "Flower", subject: "Biology", labels: [
    { name: "Petal", note: "Bright and scented, to attract insects.", at: [205, 168], side: "l" },
    { name: "Anther", note: "Makes pollen (the male part's tip).", at: [246, 148], side: "l" },
    { name: "Sepal", note: "Protected the flower when it was a bud.", at: [240, 279], side: "l" },
    { name: "Flower stalk", note: "Holds the flower up.", at: [300, 334], side: "l" },
    { name: "Stigma", note: "Sticky tip that catches pollen.", at: [300, 120], side: "r" },
    { name: "Style", note: "Joins the stigma to the ovary.", at: [300, 180], side: "r" },
    { name: "Filament", note: "The stalk that holds the anther up.", at: [337, 217], side: "r" },
    { name: "Ovary", note: "Becomes the fruit after fertilisation.", at: [320, 248], side: "r" },
    { name: "Ovule", note: "Becomes a seed after fertilisation.", at: [301, 262], side: "r" },
  ] },
  bunsen: { title: "Bunsen burner", subject: "Chemistry", labels: [
    { name: "Outer flame", note: "The hottest part is just above the inner cone.", at: [308, 88], side: "r" },
    { name: "Inner blue cone", note: "Unburnt gas and air: cooler than the outer flame.", at: [298, 128], side: "l" },
    { name: "Barrel (chimney)", note: "Gas and air mix as they rise up it.", at: [314, 200], side: "r" },
    { name: "Collar", note: "Turn it to open or close the air hole.", at: [320, 258], side: "r" },
    { name: "Air hole", note: "Open: a hot blue flame. Closed: a yellow safety flame.", at: [300, 272], side: "l" },
    { name: "Gas tube", note: "Brings gas from the gas tap.", at: [222, 302], side: "l" },
    { name: "Base", note: "Heavy, so the burner stands steady.", at: [352, 322], side: "r" },
  ] },
  digestion: { title: "Digestive system", subject: "Biology", labels: [
    { name: "Mouth", note: "Teeth break food up; saliva starts to digest starch.", at: [312, 36], side: "r" },
    { name: "Oesophagus", note: "The gullet: muscles squeeze food down to the stomach.", at: [297, 82], side: "l" },
    { name: "Liver", note: "Makes bile, which breaks fat into tiny droplets.", at: [238, 140], side: "l" },
    { name: "Stomach", note: "Churns food with acid and enzymes that digest protein.", at: [342, 148], side: "r" },
    { name: "Pancreas", note: "Makes enzymes that digest starch, protein and fat.", at: [346, 199], side: "r" },
    { name: "Small intestine", note: "Digestion finishes; food is absorbed into the blood.", at: [340, 266], side: "r" },
    { name: "Large intestine", note: "Absorbs water from what is left.", at: [231, 264], side: "l" },
    { name: "Rectum", note: "Stores the waste (faeces) until it leaves the body.", at: [297, 324], side: "l" },
    { name: "Anus", note: "The opening where the waste leaves the body.", at: [303, 342], side: "r" },
  ] },
  eye: { title: "Eye", subject: "Biology", labels: [
    { name: "Ciliary muscle", note: "Changes the shape of the lens to focus near or far.", at: [246, 136], side: "l" },
    { name: "Iris", note: "The coloured ring: it makes the pupil bigger or smaller.", at: [229, 148], side: "l" },
    { name: "Cornea", note: "The clear front window: it bends most of the light.", at: [201, 172], side: "l" },
    { name: "Pupil", note: "The hole that lets light into the eye.", at: [232, 181], side: "l" },
    { name: "Lens", note: "Fine-focuses the light onto the retina.", at: [251, 197], side: "l" },
    { name: "Sclera", note: "The tough white outer coat that protects the eye.", at: [397, 101], side: "r" },
    { name: "Vitreous humour", note: "Clear jelly that keeps the eyeball in shape.", at: [330, 168], side: "r" },
    { name: "Retina", note: "Light-sensitive cells: this is where the image forms.", at: [421, 176], side: "r" },
    { name: "Optic nerve", note: "Carries the signals from the retina to the brain.", at: [440, 216], side: "r" },
  ] },
  leaf: { title: "Leaf (cut across)", subject: "Biology", labels: [
    { name: "Waxy cuticle", note: "Waterproof layer: stops the leaf losing too much water.", at: [182, 48], side: "l" },
    { name: "Upper epidermis", note: "Thin and clear, so light passes through to the cells below.", at: [420, 65], side: "r" },
    { name: "Chloroplast", note: "Contains chlorophyll, which traps light for photosynthesis.", at: [392, 104], side: "r" },
    { name: "Palisade cell", note: "Tall cells packed with chloroplasts: most photosynthesis happens here.", at: [185, 124], side: "l" },
    { name: "Spongy cell", note: "Loosely packed, so gases can move between the cells.", at: [400, 180], side: "r" },
    { name: "Vein", note: "Xylem brings water; phloem carries sugar away.", at: [258, 206], side: "l" },
    { name: "Air space", note: "Lets carbon dioxide reach the cells and oxygen leave.", at: [366, 214], side: "r" },
    { name: "Guard cell", note: "A pair of them opens and closes each stoma.", at: [316, 270], side: "r" },
    { name: "Lower epidermis", note: "The bottom layer, where most of the stomata are.", at: [192, 274], side: "l" },
    { name: "Stoma", note: "A tiny hole: gases go in and out, and water vapour escapes.", at: [301, 281], side: "r" },
  ] },
  skeleton: { title: "Skeleton", subject: "Biology", labels: [
    { name: "Skull", note: "The cranium: it protects the brain.", at: [286, 38], side: "l" },
    { name: "Collar bone", note: "The clavicle: it joins the arm to the body.", at: [278, 82], side: "l" },
    { name: "Ribs", note: "A cage that protects the heart and lungs.", at: [324, 112], side: "r" },
    { name: "Upper arm bone", note: "The humerus, from shoulder to elbow.", at: [256, 118], side: "l" },
    { name: "Backbone", note: "The spine: it holds the body up and protects the spinal cord.", at: [301, 162], side: "r" },
    { name: "Lower arm bones", note: "The radius and the ulna, from elbow to wrist.", at: [246, 182], side: "l" },
    { name: "Hip bone (pelvis)", note: "Supports the body and joins the legs to the spine.", at: [318, 196], side: "r" },
    { name: "Thigh bone", note: "The femur: the longest and strongest bone in the body.", at: [283, 238], side: "l" },
    { name: "Kneecap", note: "The patella: it protects the knee joint.", at: [280, 272], side: "l" },
    { name: "Shin bones", note: "The tibia and the fibula, from knee to ankle.", at: [320, 306], side: "r" },
  ] },
  tooth: { title: "Tooth", subject: "Biology", labels: [
    { name: "Enamel", note: "The hardest substance in the body: it protects the tooth.", at: [244, 122], side: "l" },
    { name: "Crown", note: "The part of the tooth you can see above the gum.", at: [384, 140], side: "r" },
    { name: "Dentine", note: "Softer than enamel: it makes up most of the tooth.", at: [265, 160], side: "l" },
    { name: "Pulp cavity", note: "The soft centre, holding the nerves and blood vessels.", at: [305, 162], side: "r" },
    { name: "Gum", note: "Covers the jawbone and seals round the tooth.", at: [214, 197], side: "l" },
    { name: "Nerve and vessels", note: "Nerves feel hot, cold and pain; blood brings food and oxygen.", at: [318, 250], side: "r" },
    { name: "Cement", note: "A thin layer that fixes the root into the jaw.", at: [253, 262], side: "l" },
    { name: "Root", note: "The part below the gum that holds the tooth in the jaw.", at: [384, 264], side: "r" },
    { name: "Jawbone", note: "The bone the teeth are set into.", at: [404, 304], side: "r" },
  ] },
};
export const DIAGRAM_IDS = Object.keys(DIAGRAMS) as DiagramId[];
// hide: the names are covered (a quiz); `shown` are the ones uncovered so far.
export type LabelState = Panel & { diagram: DiagramId; hide: boolean; shown: number[]; notes: boolean };
export const DEFAULT_LABELS: LabelState = { on: false, x: 0.06, y: 0.04, diagram: "plant-cell", hide: false, shown: [], notes: false };
export function cleanLabels(l: any): LabelState {
  const d = DEFAULT_LABELS, diagram: DiagramId = DIAGRAM_IDS.includes(l?.diagram) ? l.diagram : d.diagram, n = DIAGRAMS[diagram].labels.length;
  const shown = [...new Set((Array.isArray(l?.shown) ? l.shown : []).map((k: unknown) => Math.round(Number(k))).filter((k: number) => Number.isFinite(k) && k >= 0 && k < n))] as number[];
  return { ...panel(l, d), diagram, hide: !!l?.hide, shown, notes: !!l?.notes };
}
// Is this label's name showing?
export const labelShown = (s: Pick<LabelState, "hide" | "shown">, i: number) => !s.hide || s.shown.includes(i);
// The next covered label, top to bottom (for "Reveal the next one").
export function nextHidden(s: Pick<LabelState, "diagram" | "hide" | "shown">): number | null {
  if (!s.hide) return null;
  const order = DIAGRAMS[s.diagram].labels.map((l, i) => ({ i, y: l.at[1] })).sort((a, b) => a.y - b.y).map((x) => x.i);
  return order.find((i) => !s.shown.includes(i)) ?? null;
}
// Where each label's box goes: its side's labels spread down the drawing, in the order of what they point at.
export function labelRows(id: DiagramId, top = 34, bottom = 326): number[] {
  const labels = DIAGRAMS[id].labels, ys = new Array<number>(labels.length).fill(0);
  for (const side of ["l", "r"] as const) {
    const mine = labels.map((l, i) => ({ i, y: l.at[1] })).filter((x) => labels[x.i].side === side).sort((a, b) => a.y - b.y);
    mine.forEach((x, k) => { ys[x.i] = mine.length === 1 ? (top + bottom) / 2 : top + (k * (bottom - top)) / (mine.length - 1); });
  }
  return ys;
}
