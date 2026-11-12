// Planning a practical in the lab room: the apparatus each bench practical
// needs (so a learner's list can be checked), and a risk assessment made from
// what they picked.
import type { LabSubject } from "@/lib/lab/catalog";
import { hazardNote, itemByName, ROOMS, type Item } from "@/lib/lab/room/inventory";
import type { Hazard } from "@/lib/lab/room/engines";

// What each practical needs, by the names in that subject's room.
export const NEEDS: Record<string, { subject: LabSubject; needs: string[] }> = {
  probability: { subject: "maths", needs: ["Six-sided dice", "Tally counter", "Frequency table board"] },
  pythagoras: { subject: "maths", needs: ["Ruler (30 cm)", "Protractor (180°)", "Right-angled triangle"] },
  statistics: { subject: "maths", needs: ["Ruler (30 cm)", "Mean calculator", "Median calculator"] },
  transformations: { subject: "maths", needs: ["Tracing paper", "Transformation grid", "Ruler (30 cm)"] },
  quadratics: { subject: "maths", needs: ["Rectangle", "Quadratic graphing tool", "Graph paper"] },
  "unit-circle": { subject: "maths", needs: ["Unit circle", "Sine curve generator", "Protractor (180°)"] },
  "circle-theorems": { subject: "maths", needs: ["Pair of compasses", "Protractor (180°)", "Circle theorem demonstration tool"] },
  "linear-graphs": { subject: "maths", needs: ["Ruler (30 cm)", "Graph paper", "Straight-line graph generator"] },
  mensuration: { subject: "maths", needs: ["Cylinder", "Ruler (30 cm)", "Measuring tape"] },
  fractions: { subject: "maths", needs: ["Fraction strips", "Ruler (30 cm)"] },
  polygons: { subject: "maths", needs: ["Protractor (180°)", "Regular polygon", "Ruler (30 cm)"] },
  pendulum: { subject: "physics", needs: ["Retort stand", "Clamp", "Pendulum bob", "Pendulum thread", "Pendulum support", "Metre rule", "Stopwatch"] },
  circuits: { subject: "physics", needs: ["DC power supply", "Ammeter", "Voltmeter", "Fixed resistor", "Connecting wires", "Switch"] },
  density: { subject: "physics", needs: ["Electronic weighing balance", "Measuring cylinder", "Beaker", "Pendulum thread"] },
  projectile: { subject: "physics", needs: ["Projectile motion apparatus", "Metre rule", "Measuring tape"] },
  hooke: { subject: "physics", needs: ["Retort stand", "Clamp", "Spring", "Slotted masses", "Mass hanger", "Metre rule"] },
  refraction: { subject: "physics", needs: ["Rectangular glass block", "Ray box", "Protractor", "Optical pins", "Pin board"] },
  moments: { subject: "physics", needs: ["Lever apparatus", "Metre rule", "Slotted masses", "Mass hanger"] },
  lens: { subject: "physics", needs: ["Convex lens", "Lens holder", "Screen", "Illuminated object", "Optical bench"] },
  "heating-curve": { subject: "physics", needs: ["Beaker", "Bunsen burner", "Tripod stand", "Wire gauze", "Laboratory thermometer", "Stopwatch"] },
  waves: { subject: "physics", needs: ["Ripple tank", "Ripple generator", "Metre rule"] },
  "free-fall": { subject: "physics", needs: ["Free-fall apparatus", "Digital timer", "Metre rule", "Ball bearings"] },
  "specific-heat": { subject: "physics", needs: ["Specific heat capacity apparatus", "Electric heater", "Electrical energy meter", "Laboratory thermometer", "Electronic weighing balance"] },
  "wire-resistance": { subject: "physics", needs: ["Resistance wire", "Metre rule", "DC power supply", "Ammeter", "Voltmeter", "Crocodile clips"] },
  electromagnet: { subject: "physics", needs: ["Electromagnet", "Soft iron core", "DC power supply", "Switch", "Connecting wires"] },
  insulation: { subject: "physics", needs: ["Beaker", "Laboratory thermometer", "Stopwatch", "Measuring cylinder"] },
  "terminal-velocity": { subject: "physics", needs: ["Ball bearings", "Measuring cylinder", "Stopwatch", "Metre rule"] },
  "vernier-callipers": { subject: "physics", needs: ["Vernier callipers", "Marble"] },
  micrometer: { subject: "physics", needs: ["Micrometer screw gauge"] },
  callipers: { subject: "physics", needs: ["Half-metre rule"] },
  "reading-instruments": { subject: "physics", needs: ["Laboratory thermometer", "Ammeter", "Voltmeter", "Measuring cylinder"] },
  sonometer: { subject: "physics", needs: ["Sonometer", "Tuning forks", "Slotted masses", "Metre rule"] },
  archimedes: { subject: "physics", needs: ["Spring balance", "Retort stand", "Measuring cylinder", "Beaker"] },
  titration: { subject: "chemistry", needs: ["Burette", "Volumetric pipette", "Conical flask", "Retort stand", "Methyl orange", "Hydrochloric acid", "Sodium hydroxide", "Safety goggles"] },
  reactivity: { subject: "chemistry", needs: ["Test tube", "Test tube rack", "Hydrochloric acid", "Magnesium ribbon", "Zinc granules", "Iron filings", "Copper turnings", "Safety goggles"] },
  rates: { subject: "chemistry", needs: ["Conical flask", "Measuring cylinder", "Stopwatch", "Sodium thiosulfate", "Hydrochloric acid", "Safety goggles"] },
  "gas-laws": { subject: "chemistry", needs: ["Gas syringe", "Gas pressure sensor"] },
  electrolysis: { subject: "chemistry", needs: ["Beaker", "DC power supply", "Copper(II) sulfate", "Connecting wires", "Ammeter", "Safety goggles"] },
  chromatography: { subject: "chemistry", needs: ["Chromatography paper", "Chromatography tank", "Capillary tubes", "Ruler (30 cm)"] },
  "flame-tests": { subject: "chemistry", needs: ["Bunsen burner", "Heatproof mat", "Sodium chloride", "Potassium chloride", "Calcium chloride", "Copper(II) sulfate", "Safety goggles"] },
  "ph-indicators": { subject: "chemistry", needs: ["Universal indicator", "Test tube", "Test tube rack", "Hydrochloric acid", "Sodium hydroxide", "Distilled water"] },
  neutralisation: { subject: "chemistry", needs: ["Measuring cylinder", "Thermometer", "Burette", "Hydrochloric acid", "Sodium hydroxide", "Safety goggles"] },
  salts: { subject: "chemistry", needs: ["Beaker", "Bunsen burner", "Tripod stand", "Wire gauze", "Filter funnel", "Filter paper", "Evaporating dish", "Sulfuric acid", "Safety goggles"] },
  "gas-syringe": { subject: "chemistry", needs: ["Conical flask", "Gas syringe", "Delivery tube", "Stopwatch", "Hydrochloric acid", "Calcium carbonate", "Safety goggles"] },
  "ion-tests": { subject: "chemistry", needs: ["Test tube", "Test tube rack", "Sodium hydroxide", "Silver nitrate", "Dropper bottle", "Safety goggles"] },
  photosynthesis: { subject: "biology", needs: ["Photosynthesis apparatus", "Hydrilla plant setup", "Light meter", "Stopwatch", "Measuring tape"] },
  cells: { subject: "biology", needs: ["Compound light microscope", "Microscope slides", "Cover slips", "Dropping pipette", "Iodine solution", "Forceps"] },
  osmosis: { subject: "biology", needs: ["Potato tuber", "Scalpel", "Digital weighing balance", "Beaker", "Sucrose", "Distilled water"] },
  enzymes: { subject: "biology", needs: ["Water bath", "Test tube", "Iodine solution", "Starch solution", "Stopwatch", "Thermometer"] },
  "food-tests": { subject: "biology", needs: ["Test tube", "Test tube rack", "Benedict's solution", "Biuret reagent", "Iodine solution", "Water bath", "Food samples"] },
  transpiration: { subject: "biology", needs: ["Potometer", "Secateurs", "Stopwatch", "Measuring tape"] },
  genetics: { subject: "biology", needs: ["Genetic inheritance model", "Punnett square board"] },
  "heart-rate": { subject: "biology", needs: ["Stopwatch"] },
  yeast: { subject: "biology", needs: ["Test tube", "Water bath", "Limewater", "Glucose solution", "Thermometer", "Stopwatch"] },
  "leaf-starch": { subject: "biology", needs: ["Beaker", "Bunsen burner", "Ethanol", "Iodine solution", "Forceps", "Leaf specimens", "Safety goggles"] },
  quadrats: { subject: "biology", needs: ["Quadrat", "Measuring tape", "Identification charts"] },
  "reaction-time": { subject: "biology", needs: ["Metre rule"] },
};

export type Plan = { title: string; aim: string; method: string[]; independent: string; dependent: string; controls: string; picked: string[]; target: string | null };
export const emptyPlan = (): Plan => ({ title: "", aim: "", method: [""], independent: "", dependent: "", controls: "", picked: [], target: null });

// How a learner's apparatus list compares with what a practical needs.
export function checkPlan(subject: LabSubject, picked: string[], target: string | null) {
  const need = target ? NEEDS[target] : null;
  if (!need || need.subject !== subject) return null;
  const names = new Set(picked.map((id) => ROOMS[subject].find((x) => x.id === id)?.name).filter(Boolean) as string[]);
  const missing = need.needs.filter((n) => !names.has(n));
  return { missing, have: need.needs.length - missing.length, of: need.needs.length, ready: !missing.length };
}

// A risk assessment from the hazards of what was picked.
export function riskAssessment(items: Item[]) {
  const hazards = new Set<Hazard>();
  for (const it of items) {
    if (it.spec.e === "reagent") it.spec.hazards.forEach((h) => hazards.add(h));
    if (it.spec.e === "heater" && it.spec.power > 0) hazards.add("hot");
    if (it.spec.e === "circuit") hazards.add("electrical");
    if (it.spec.e === "radiation" && it.spec.kind !== "detector" && it.spec.kind !== "halflife") hazards.add("radiation");
    if (/scalpel|knife|needle|pins|compass/i.test(it.name)) hazards.add("sharp");
    if (it.spec.e === "vessel" || /glass|tube|slide|thermometer/i.test(it.name)) hazards.add("glass");
    if (it.spec.e === "specimen" || /agar|culture|inoculat|swab/i.test(it.name)) hazards.add("biological");
  }
  const has = new Set(items.filter((x) => x.spec.e === "safety").map((x) => x.name));
  const wants = [...hazards].flatMap((h) => SAFETY_FOR[h] ?? []).filter((n, i, a) => a.indexOf(n) === i);
  return { rows: [...hazards].map((h) => ({ hazard: h, control: hazardNote(h) })), missingSafety: wants.filter((n) => !has.has(n)) };
}
const SAFETY_FOR: Partial<Record<Hazard, string[]>> = {
  corrosive: ["Safety goggles", "Chemical-resistant gloves"], irritant: ["Safety goggles"], toxic: ["Safety goggles", "Fume cupboard"], oxidising: ["Safety goggles"],
  flammable: ["Fire blanket"], hot: ["Safety goggles"], explosive: ["Face shield"], harmful: ["Safety goggles"],
};
export const safetyItem = (subject: LabSubject, name: string) => itemByName(subject, name) ?? itemByName("chemistry", name);
