// The lab safety licence: before their first practical, a learner shows they
// know the hazard symbols and the lab rules — 10 questions, 8 to pass. Each
// answer is explained, so failing teaches too; a retake asks different ones.
// Passed once, it's kept on their phone (and their teacher sees it).
export type Symbol = "flammable" | "corrosive" | "toxic" | "harmful" | "oxidising" | "explosive" | "environment" | "health" | "gas";
export type LicenceQ = { id: string; q: string; symbol?: Symbol; options: string[]; answer: number; why: string };

// looks: what the pictogram shows (for a screen reader — it doesn't give the name away).
export const SYMBOLS: Record<Symbol, { name: string; means: string; looks?: string }> = {
  flammable: { name: "Flammable", means: "Catches fire easily — keep it away from flames and sparks." },
  corrosive: { name: "Corrosive", means: "Burns skin and eyes and eats through metals — wear goggles and gloves." },
  toxic: { name: "Toxic", means: "Can kill in small amounts if swallowed, breathed in or on the skin." },
  harmful: { name: "Harmful / irritant", means: "Can irritate skin, eyes or lungs, or harm you in larger amounts." },
  oxidising: { name: "Oxidising", means: "Gives off oxygen and makes other things burn fiercely." },
  explosive: { name: "Explosive", means: "Can explode if heated, knocked or rubbed." },
  environment: { name: "Dangerous to the environment", means: "Harms water life — never pour it down the sink." },
  health: { name: "Serious health hazard", means: "Can cause long-term harm, e.g. to the lungs or cancer." },
  gas: { name: "Gas under pressure", means: "A cylinder of gas that can burst if heated." },
};

const sym = (s: Symbol, wrong: Symbol[]): Omit<LicenceQ, "answer"> & { right: string } => ({
  id: `sym-${s}`, q: "What does this hazard symbol mean?", symbol: s,
  options: [SYMBOLS[s].name, ...wrong.map((w) => SYMBOLS[w].name)], right: SYMBOLS[s].name, why: SYMBOLS[s].means,
});
const rule = (id: string, q: string, right: string, wrong: string[], why: string): Omit<LicenceQ, "answer"> & { right: string } => ({ id, q, options: [right, ...wrong], right, why });

// Every question; the right answer is listed first here and shuffled when asked.
const BANK = [
  sym("flammable", ["oxidising", "explosive", "harmful"]),
  sym("corrosive", ["toxic", "harmful", "environment"]),
  sym("toxic", ["harmful", "health", "corrosive"]),
  sym("harmful", ["toxic", "health", "flammable"]),
  sym("oxidising", ["flammable", "explosive", "gas"]),
  sym("explosive", ["flammable", "oxidising", "gas"]),
  sym("environment", ["toxic", "harmful", "health"]),
  sym("health", ["toxic", "harmful", "corrosive"]),
  sym("gas", ["explosive", "oxidising", "flammable"]),
  rule("goggles", "When must you wear safety goggles?", "Whenever chemicals are being used or heated — by anyone near you", ["Only when you are heating something yourself", "Only with acids", "Only if the teacher is watching"], "Splashes travel; your eyes can be hurt by someone else's experiment."),
  rule("splash", "Acid splashes on your skin. What do you do first?", "Wash it with plenty of cold running water, and tell the teacher", ["Wipe it with a dry cloth", "Put an alkali on it to neutralise it", "Carry on and wash it at the end"], "Running water dilutes and removes it fast; neutralising can heat and burn the skin more."),
  rule("eye", "A chemical gets in your eye. What do you do?", "Rinse the eye at the eye-wash station for at least 10 minutes and tell the teacher", ["Rub it gently", "Close it tight and wait", "Put a drop of alkali in"], "Long rinsing with clean water is the only safe first aid for eyes."),
  rule("smell", "How should you smell a gas or a solution?", "Waft the gas towards your nose with your hand", ["Put your nose right over the tube and sniff hard", "Never smell anything in a lab, even when told to", "Breathe in through your mouth"], "Wafting lets you detect a smell without breathing in a dangerous amount."),
  rule("taste", "Can you taste a chemical to identify it?", "Never — nothing in a lab is tasted or eaten", ["Yes, if it's only a tiny amount", "Yes, if it's a food test", "Only sugars and salt"], "Lab glassware and chemicals may be contaminated or poisonous."),
  rule("food", "Can you eat or drink in the laboratory?", "No — not food, drinks or chewing gum", ["Yes, if you keep it on your bench", "Only water", "Yes, at the end of the lesson"], "Food can pick up chemicals from benches and hands."),
  rule("tube", "Heating a liquid in a test tube, where should the open end point?", "Away from you and everyone else", ["Towards you, so you can see inside", "Straight up at the ceiling light", "Towards the window"], "Liquids can 'bump' and shoot out of the tube."),
  rule("tubehold", "How do you heat a liquid in a test tube?", "Hold it in a test-tube holder, tilted, and heat gently near the top of the liquid while moving it", ["Hold it in your fingers over the hottest part of the flame", "Heat only the very bottom and keep it still", "Stand it upright in the flame"], "Gentle, moving heat stops sudden boiling."),
  rule("bunsen", "Before lighting a Bunsen burner, the air hole should be…", "Closed — light it on the yellow safety flame", ["Fully open", "Half open", "Taped over"], "The yellow flame is easy to see; open the air hole only when you need the hot blue flame."),
  rule("bunsenleft", "You stop heating for a moment. What do you do with the Bunsen burner?", "Turn it to the yellow safety flame so everyone can see it is lit", ["Leave it on the roaring blue flame", "Cover it with a beaker", "Turn the gas off and on again later without checking"], "A blue flame is almost invisible — people get burned by it."),
  rule("hair", "Why tie back long hair and tuck in ties in the lab?", "So they can't catch fire or dip into chemicals", ["To look smart", "So the goggles fit", "It doesn't matter"], "Hair and loose clothing near a flame catch fire very quickly."),
  rule("glass", "You break a beaker. What should you do?", "Tell the teacher and let them clear it up safely (with a brush and dustpan)", ["Pick the pieces up quickly with your fingers", "Push them under the bench", "Put them in the normal bin"], "Broken glass cuts; it goes in a special glass bin."),
  rule("spill", "You spill a chemical on the bench. What do you do?", "Tell the teacher straight away", ["Wipe it with your sleeve", "Ignore it if it's small", "Pour water on it and walk away"], "The teacher knows how to clear each chemical safely."),
  rule("sink", "Where do you put leftover chemicals at the end?", "Where the teacher tells you — some must not go down the sink", ["Always down the sink", "Back in the stock bottle", "In the normal bin"], "Some chemicals harm water life; putting them back would contaminate the stock."),
  rule("pipette", "How do you fill a pipette?", "With a pipette filler — never by mouth", ["By sucking gently", "By mouth, if it's only water", "By dipping it and tipping it"], "Mouth-pipetting can put chemicals in your mouth."),
  rule("hot", "How do you tell if glassware is still hot?", "You can't by looking — let it cool, and pick it up with tongs", ["It glows red when hot", "Hot glass looks cloudy", "Touch it quickly"], "Hot glass looks exactly like cold glass."),
  rule("dilute", "When diluting a concentrated acid, you should…", "Add the acid slowly to the water", ["Add the water quickly to the acid", "Mix them both at once", "Heat them first"], "Adding water to acid can boil and spit acid out."),
  rule("electric", "Wet hands and electrical equipment…", "Never mix — dry your hands before touching plugs or switches", ["Are fine at low voltage only", "Are fine if you wear goggles", "Are fine for a quick test"], "Water conducts electricity."),
  rule("bench", "Why stand up while doing a practical?", "So you can move away quickly if something spills or catches fire", ["It's more comfortable", "The stools are for the teacher", "It's easier to write"], "Standing lets you step back from spills and flames."),
  rule("unknown", "You're not sure how to do a step. What do you do?", "Stop and ask the teacher", ["Guess and carry on", "Copy the person next to you", "Skip it"], "A guess in a lab can hurt you or others."),
];

export const LICENCE_SIZE = 10, LICENCE_PASS = 8;

// Ten questions: four symbols and six rules, different each time (and each option order shuffled).
export function licenceQuiz(rand: () => number = Math.random): LicenceQ[] {
  const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const syms = shuffle(BANK.filter((q) => q.symbol)).slice(0, 4), rules = shuffle(BANK.filter((q) => !q.symbol)).slice(0, LICENCE_SIZE - 4);
  return shuffle([...syms, ...rules]).map(({ right, ...q }) => { const options = shuffle(q.options); return { ...q, options, answer: options.indexOf(right) }; });
}
export const bankSize = () => BANK.length;
const LOOKS: Record<Symbol, string> = { flammable: "a flame", corrosive: "liquid dripping onto a hand and onto a surface", toxic: "a skull and crossbones", harmful: "an exclamation mark",
  oxidising: "a flame over a circle", explosive: "an exploding bomb", environment: "a dead tree and a dead fish", health: "a person with a starburst on the chest", gas: "a metal cylinder lying on its side" };
export const looksOf = (s: Symbol) => LOOKS[s];
// The right answer to a question, by its words (and the pictogram, for a symbol).
export function licenceRight(q: string, symbol?: Symbol): string | null {
  return BANK.find((x) => (symbol ? x.symbol === symbol : x.q === q && !x.symbol))?.right ?? null;
}
export const passed = (score: number) => score >= LICENCE_PASS;

// Kept on the phone once passed.
export const LICENCE_KEY = "dm-lab-licence";
export type Licence = { at: number; score: number; of: number; name?: string };
export function readLicence(raw: string | null): Licence | null {
  try { const j = JSON.parse(raw ?? "null"); return j && Number.isFinite(j.at) && passed(Number(j.score)) ? { at: Number(j.at), score: Number(j.score), of: Number(j.of) || LICENCE_SIZE, ...(j.name ? { name: String(j.name).slice(0, 60) } : {}) } : null; } catch { return null; }
}
