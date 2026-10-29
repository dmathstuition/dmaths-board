// "Fix my mistakes" — pure. Engines hand over each question a learner got
// wrong; after the round they come back as a short replay with a tip, and
// getting them right earns a "Mastered" star for the topic.
import type { Rng } from "@/lib/games/generators";

export type MistakeItem = {
  lead?: string;      // instruction / context line
  prompt: string;     // the question
  answer: string;     // the right answer, as shown
  options?: string[]; // choices (omit for a typed answer)
  tag: string;        // topic, e.g. "×7 table" or the game's skill
};

export const MAX_REPLAY = 8;

// Unique by prompt, newest kept, capped.
export function collectMistakes(list: MistakeItem[]): MistakeItem[] {
  const seen = new Set<string>();
  const out: MistakeItem[] = [];
  for (const m of [...list].reverse()) {
    const k = `${m.lead ?? ""}|${m.prompt}`;
    if (seen.has(k) || !m.prompt || !m.answer) continue;
    seen.add(k); out.push(m);
    if (out.length >= MAX_REPLAY) break;
  }
  return out.reverse();
}

const norm = (s: string) => s.toLowerCase().replace(/[\s.,!?'’"]+/g, " ").trim();
export function isRight(item: MistakeItem, given: string): boolean {
  const a = item.answer.trim(), g = given.trim();
  if (!g) return false;
  const na = Number(a.replace(/,/g, "")), ng = Number(g.replace(/,/g, ""));
  if (a !== "" && !Number.isNaN(na) && !Number.isNaN(ng)) return Math.abs(na - ng) < 1e-9;
  return norm(a) === norm(g);
}

// Shuffle a copy of the options (so the replay isn't the same layout).
export function replayOptions(item: MistakeItem, rng: Rng = Math.random): string[] | null {
  if (!item.options?.length) return null;
  const a = [...new Set(item.options.includes(item.answer) ? item.options : [item.answer, ...item.options])].slice(0, 4);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const TIPS: Record<string, string> = {
  addition: "Add the tens first, then the units, then put them together.",
  subtraction: "Count up from the smaller number to the bigger one — that gap is the answer.",
  multiplication: "Use a fact you know: 7 × 8 is 7 × 4 doubled. Say the table out loud.",
  division: "Think of the times table backwards: what times the divisor makes the big number?",
  missing: "Use the opposite operation: undo + with −, and × with ÷.",
  bodmas: "Brackets, then Orders (powers), then ÷ and × left to right, then + and − left to right.",
  mixed: "Read the sign carefully before you work it out.",
  linear: "Do the same thing to both sides until x is on its own.",
  percent: "Find 10% (divide by 10) or 1% (divide by 100), then build the percentage you need.",
  sequences: "Find the difference between terms. If it changes, look at the second difference.",
  logs: "log_b(x) asks: b to what power gives x?",
  fractions: "Make the denominators the same before adding or subtracting; simplify at the end.",
  indices: "Same base: multiply → add the powers, divide → subtract them, power of a power → multiply.",
  standardForm: "A × 10ⁿ with 1 ≤ A < 10. Count how many places the decimal point moves.",
  quadratics: "Factorise (find two numbers that multiply to c and add to b), then set each bracket to 0.",
  simultaneous: "Make one variable's numbers match, then add or subtract the equations to remove it.",
  expand: "Multiply every term in the first bracket by every term in the second.",
  differentiation: "Bring the power down to the front and take one off the power.",
  identity: "Test it with a simple value like x = 2 — if the sides differ, it isn't an identity.",
  trig: "SOH CAH TOA, and learn sin, cos, tan of 30°, 45° and 60°.",
  elements: "Some symbols come from Latin names: Na (natrium) is sodium, Fe (ferrum) is iron.",
  units: "Base SI units: metre, kilogram, second, ampere, kelvin, mole, candela.",
  spelling: "Break the word into syllables and spell each part.",
  partsOfSpeech: "Ask what job the word does: names (noun), action (verb), describes (adjective/adverb).",
  tenses: "Look for time words like yesterday, now or tomorrow — they tell you the tense.",
  homophones: "Same sound, different meaning — check which meaning fits the sentence.",
  concord: "The verb must agree with its subject: singular subject, singular verb.",
  punctuation: "Read it aloud — pauses need commas, full stops end a complete thought.",
  plurals: "Words ending in s, x, ch, sh add -es; consonant + y changes to -ies.",
  prefixes: "The prefix changes the meaning: un-/dis-/in- often mean 'not'.",
  vocabulary: "Use the rest of the sentence as a clue to the word's meaning.",
  idioms: "Idioms don't mean the literal words — think about how people use the phrase.",
  oddOneOut: "Find what three of them share; the one left over is the odd one out.",
  synonyms: "A synonym means the same (or nearly the same) as the word.",
  antonyms: "An antonym means the opposite.",
  scramble: "Find the vowels first, then try common endings like -ing, -tion or -ed.",
  gaps: "Say the word slowly and listen for the missing sound.",
  sentence: "Start with who or what the sentence is about, then the action.",
};

export function tipFor(skill: string, item: MistakeItem): string {
  return TIPS[skill] ?? `The answer is ${item.answer}. Try it again slowly.`;
}

// Topics fixed in a replay (each mistake's tag, once).
export const fixedTags = (items: MistakeItem[]) => [...new Set(items.map((m) => m.tag).filter(Boolean))].slice(0, MAX_REPLAY);

// A seeded random number generator (mulberry32) — everyone in a race gets the
// same questions in the same order.
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
