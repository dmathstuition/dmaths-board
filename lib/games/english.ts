// Question generators for the English class games, drawing on the curated
// banks in englishBank.ts. Pure with an injectable rng so tests can check
// that every right answer is right and no wrong option is accidentally right.

import type { Difficulty, Rng } from "@/lib/games/generators";
import type { ChoiceQ } from "@/lib/games/senior";
import { bank, draw, PREFIX_SET, type POS } from "@/lib/games/englishBank";

export type EnglishChoiceSkill =
  | "spelling" | "partsOfSpeech" | "tenses" | "homophones" | "concord" | "punctuation" | "plurals" | "prefixes"
  | "vocabulary" | "idioms" | "oddOneOut";
export type EnglishMatchSkill = "synonyms" | "antonyms";
export type TileSkill = "scramble" | "gaps" | "sentence";

export const ENGLISH_CHOICE: readonly string[] = ["spelling", "partsOfSpeech", "tenses", "homophones", "concord", "punctuation", "plurals", "prefixes", "vocabulary", "idioms", "oddOneOut"];
export const ENGLISH_MATCH: readonly string[] = ["synonyms", "antonyms"];
export const TILE_SKILLS: readonly string[] = ["scramble", "gaps", "sentence"];

function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
}
function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Up to `n` distinct items from `xs` that pass `ok`, in random order.
function sample<T>(rng: Rng, xs: readonly T[], n: number, ok: (x: T) => boolean = () => true): T[] {
  return shuffle(rng, xs.filter(ok)).slice(0, n);
}
function withAnswer(rng: Rng, answer: string, wrong: string[]): string[] {
  const set = new Set<string>([answer]);
  for (const w of wrong) if (set.size < 4 && w && w !== answer) set.add(w);
  return shuffle(rng, [...set]);
}

// ── Misspellings ───────────────────────────────────────────────────────────
// Plausible slips: doubled/undoubled letters, ie↔ei, vowel swaps, a dropped
// letter, and common suffix confusions. Never returns the word itself.
const VOWELS = "aeiou";
export function misspellings(word: string, rng: Rng, n = 3): string[] {
  const w = word;
  const out = new Set<string>();
  // American spellings are correct elsewhere, so never offer them as "wrong".
  const american = new Set([w.replace("our", "or"), w.replace("tre", "ter"), w.replace("ise", "ize"), w.replace("ogue", "og")]);
  const add = (x: string) => { if (x !== w && x.length > 2 && x.toLowerCase() !== w.toLowerCase() && !american.has(x)) out.add(x); };
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1] && !VOWELS.includes(w[i])) add(w.slice(0, i) + w.slice(i + 1));          // undouble
    else if ("bcdfglmnprst".includes(w[i]) && VOWELS.includes(w[i - 1]) && i < w.length - 1 && VOWELS.includes(w[i + 1])) add(w.slice(0, i) + w[i] + w.slice(i)); // double
  }
  if (w.includes("ie")) add(w.replace("ie", "ei"));
  if (w.includes("ei")) add(w.replace("ei", "ie"));
  [["ence", "ance"], ["ance", "ence"], ["ible", "able"], ["able", "ible"], ["ent", "ant"], ["ant", "ent"], ["tion", "sion"], ["ous", "us"]]
    .forEach(([a, b]) => { if (w.endsWith(a)) add(w.slice(0, -a.length) + b); });
  for (let i = 1; i < w.length; i++) {
    if (VOWELS.includes(w[i])) for (const v of VOWELS) if (v !== w[i]) add(w.slice(0, i) + v + w.slice(i + 1));
  }
  for (let i = 1; i < w.length - 1; i++) add(w.slice(0, i) + w.slice(i + 1));
  // Prefer the "structural" slips (listed first), then random others.
  const all = [...out];
  const first = all.slice(0, 6);
  return shuffle(rng, first).concat(shuffle(rng, all.slice(6))).slice(0, n);
}

// ── Choice skills ──────────────────────────────────────────────────────────
function spelling(rng: Rng, d: Difficulty): ChoiceQ {
  const { word, clue } = draw("spelling", d, rng);
  return { lead: clue, prompt: "Which spelling is correct?", answer: word, options: withAnswer(rng, word, misspellings(word, rng)) };
}

const POS_BY_LEVEL: Record<Difficulty, POS[]> = {
  easy: ["noun", "verb", "adjective", "adverb"],
  medium: ["noun", "verb", "adjective", "adverb", "pronoun"],
  hard: ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"],
};
function partsOfSpeech(rng: Rng, d: Difficulty): ChoiceQ {
  const it = draw("pos", d, rng);
  return { lead: `What part of speech is “${it.word}”?`, prompt: it.sentence, answer: it.pos,
    options: withAnswer(rng, it.pos, sample(rng, POS_BY_LEVEL[d], 3, (p) => p !== it.pos)) };
}

const NAMES = ["Ada", "Musa", "Tolu", "Chidi", "Bisi", "Emeka", "Zainab", "Kemi"];
function tenses(rng: Rng, d: Difficulty): ChoiceQ {
  const v = draw("verbs", d, rng);
  const [base, third, past, participle, ing] = v;
  const who = pick(rng, NAMES);
  const frames: { s: string; a: string }[] = [
    { s: `Yesterday, ${who} ___ (${base}).`, a: past },
    { s: `${who} has already ___ (${base}).`, a: participle },
    { s: `Every day, ${who} ___ (${base}).`, a: third },
    { s: `Right now, ${who} is ___ (${base}).`, a: ing },
  ];
  const f = pick(rng, frames);
  // Forms can coincide (e.g. walked/walked), so offer only distinct ones.
  return { lead: "Choose the correct form of the verb", prompt: f.s, answer: f.a,
    options: withAnswer(rng, f.a, shuffle(rng, [base, third, past, participle, ing].filter((x) => x !== f.a))) };
}

function homophones(rng: Rng, d: Difficulty): ChoiceQ {
  const it = draw("homophones", d, rng);
  return { lead: "Fill in the gap", prompt: it.sentence, answer: it.answer, options: shuffle(rng, [...it.set]) };
}

function concord(rng: Rng, d: Difficulty): ChoiceQ {
  const it = draw("concord", d, rng);
  return { lead: "Choose the verb that agrees with the subject", prompt: it.sentence, answer: it.answer, options: shuffle(rng, [...it.options]) };
}

function punctuation(rng: Rng, d: Difficulty): ChoiceQ {
  const it = draw("punctuation", d, rng);
  return { lead: "Which sentence is punctuated correctly?", prompt: "", answer: it.correct, options: withAnswer(rng, it.correct, it.wrong) };
}

export function pluralGuesses(base: string): string[] {
  if (base.includes("-")) {
    const [head, ...rest] = base.split("-");
    return [`${base}s`, `${head}s-${rest.join("-")}s`, `${head}-${rest.map((r) => r + "s").join("-")}`];
  }
  const stem = (n: number) => base.slice(0, -n);
  if (base.endsWith("is")) return [`${base}es`, `${stem(2)}ii`, `${stem(2)}a`];
  if (base.endsWith("us")) return [`${base}es`, `${stem(2)}a`, `${stem(2)}ies`];
  if (base.endsWith("on")) return [`${base}s`, `${base}es`, `${stem(2)}i`];
  if (base.endsWith("um")) return [`${base}s`, `${stem(2)}i`, `${base}es`];
  const g = base.endsWith("s") || base.endsWith("x") || base.endsWith("ch") || base.endsWith("sh") ? [`${base}s`, `${base}ses`, `${base}en`] : [`${base}s`, `${base}es`];
  if (base.endsWith("y")) g.push(`${stem(1)}ies`, `${stem(1)}eys`);
  if (base.endsWith("f")) g.push(`${stem(1)}ves`, `${stem(1)}fs`);
  if (base.endsWith("fe")) g.push(`${stem(2)}ves`, `${stem(2)}fs`);
  if (base.length <= 5 && !base.endsWith("s")) g.push(`${base}en`, `${base}ren`);
  if (base.includes("oo")) g.push(base.replace("oo", "ee") + "s");
  g.push(`${base}'s`); // the greengrocer's apostrophe — a classic mistake
  return g;
}
function plurals(rng: Rng, d: Difficulty): ChoiceQ {
  const [base, plural] = draw("plurals", d, rng);
  const wrong = [...new Set(pluralGuesses(base).filter((x) => x !== plural))];
  return { lead: "What is the plural?", prompt: `one ${base} → two …`, answer: plural, options: withAnswer(rng, plural, shuffle(rng, wrong)) };
}

function prefixes(rng: Rng, d: Difficulty): ChoiceQ {
  const [root, pre] = draw("prefixes", d, rng);
  const answer = pre + root;
  return { lead: "Make the opposite with a prefix", prompt: root, answer,
    options: withAnswer(rng, answer, sample(rng, PREFIX_SET, 3, (p) => p !== pre).map((p) => p + root)) };
}

function meaning(rng: Rng, kind: "vocab" | "idioms", d: Difficulty, lead: (w: string) => string): ChoiceQ {
  const [w, m] = draw(kind, d, rng);
  return { lead: lead(w), prompt: w, answer: m, options: withAnswer(rng, m, sample(rng, bank(kind, d), 3, ([x, mm]) => x !== w && mm !== m).map(([, mm]) => mm)) };
}

function oddOneOut(rng: Rng, d: Difficulty): ChoiceQ {
  const main = draw("categories", d, rng);
  const other = sample(rng, bank("categories", d), 1, (c) => c.name !== main.name)[0];
  const three = sample(rng, main.words, 3);
  const odd = pick(rng, other.words);
  // Easy levels name the group as a hint; harder levels make you work it out.
  return { lead: "Which word is the odd one out?", prompt: d === "easy" ? `Three are ${main.name}…` : "Three of these belong together", answer: odd, options: shuffle(rng, [...three, odd]) };
}

export function englishChoice(skill: EnglishChoiceSkill, d: Difficulty, rng: Rng = Math.random): ChoiceQ {
  switch (skill) {
    case "spelling": return spelling(rng, d);
    case "partsOfSpeech": return partsOfSpeech(rng, d);
    case "tenses": return tenses(rng, d);
    case "homophones": return homophones(rng, d);
    case "concord": return concord(rng, d);
    case "punctuation": return punctuation(rng, d);
    case "plurals": return plurals(rng, d);
    case "prefixes": return prefixes(rng, d);
    case "vocabulary": return meaning(rng, "vocab", d, () => "What does this word mean?");
    case "idioms": return meaning(rng, "idioms", d, () => "What does this idiom mean?");
    case "oddOneOut": return oddOneOut(rng, d);
  }
}

// ── True / False: is the word spelled correctly? ───────────────────────────
export function spellingStatement(d: Difficulty, rng: Rng = Math.random): { text: string; isTrue: boolean } {
  const { word, clue } = draw("spelling", d, rng);
  const isTrue = rng() < 0.5;
  // The clue makes clear which word is meant, so a slip that happens to be
  // another real word is still plainly wrong here.
  return { text: `${clue}: “${isTrue ? word : misspellings(word, rng, 1)[0]}”`, isTrue };
}

// ── Memory match pairs ─────────────────────────────────────────────────────
export function englishPairs(skill: EnglishMatchSkill, d: Difficulty, pairs: number, rng: Rng = Math.random): [string, string][] {
  return sample(rng, bank(skill, d), pairs);
}

// ── Tile puzzles (Letters engine) ──────────────────────────────────────────
// `slots` is the finished answer with null where the learner must place a
// tile; `fill` lists what goes in the blanks, in order; `tiles` is what they
// choose from (the fill plus a few decoys), shuffled.
export type TilePuzzle = { lead: string; clue: string; slots: (string | null)[]; fill: string[]; tiles: string[]; joiner: "" | " " };
const ALPHA = "abcdefghijklmnopqrstuvwxyz";

export function tilePuzzle(skill: TileSkill, d: Difficulty, rng: Rng = Math.random): TilePuzzle {
  if (skill === "sentence") {
    const s = draw("sentences", d, rng);
    const words = s.split(" ");
    let tiles = shuffle(rng, words);
    // Never deal the tiles already in order.
    for (let k = 0; k < 5 && tiles.join(" ") === s; k++) tiles = shuffle(rng, words);
    return { lead: "Build the sentence", clue: "Tap the words in the right order.", slots: words.map(() => null), fill: words, tiles, joiner: " " };
  }
  const { word, clue } = draw("spelling", d, rng);
  const letters = word.toLowerCase().split("");
  if (skill === "scramble") {
    let tiles = shuffle(rng, letters);
    for (let k = 0; k < 5 && tiles.join("") === letters.join(""); k++) tiles = shuffle(rng, letters);
    return { lead: "Unscramble the word", clue, slots: letters.map(() => null), fill: letters, tiles, joiner: "" };
  }
  // Gaps: hide some letters (vowels first — they're the usual traps), keep the first.
  const hideCount = Math.min(letters.length - 2, d === "easy" ? 2 : d === "medium" ? 3 : 4);
  const idx = letters.map((_, i) => i).slice(1);
  const vowelIdx = shuffle(rng, idx.filter((i) => VOWELS.includes(letters[i])));
  const otherIdx = shuffle(rng, idx.filter((i) => !VOWELS.includes(letters[i])));
  const hide = new Set([...vowelIdx, ...otherIdx].slice(0, hideCount));
  const slots = letters.map((c, i) => (hide.has(i) ? null : c));
  const fill = letters.filter((_, i) => hide.has(i));
  const decoys = sample(rng, ALPHA.split(""), 2, (c) => !fill.includes(c));
  return { lead: "Fill in the missing letters", clue, slots, fill, tiles: shuffle(rng, [...fill, ...decoys]), joiner: "" };
}

// The learner's finished attempt as text, for checking.
export function assemble(p: TilePuzzle, placed: string[]): string {
  let k = 0;
  return p.slots.map((s) => (s === null ? placed[k++] ?? "" : s)).join(p.joiner);
}
export function solution(p: TilePuzzle): string {
  return assemble(p, p.fill);
}
