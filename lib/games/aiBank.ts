// A.I-written questions for the word & grammar games.
//
// The A.I never writes finished questions: it writes *bank items* in exactly
// the same shape as the curated banks (a word + clue, a sentence with a gap,
// an idiom + meaning…). Every item is checked here before it is stored or
// shown, and the game code still builds the distractors and checks answers
// the same way it does for built-in items. Maths games don't use this — their
// questions come from formulas, so they're unlimited and always correct.

import type { Difficulty } from "@/lib/games/generators";
import { BANKS, PREFIX_SET, itemKey, type BankKind, type POS } from "@/lib/games/englishBank";

// Which bank each A.I-capable game skill draws from.
export const SKILL_KIND: Record<string, BankKind> = {
  spelling: "spelling", scramble: "spelling", gaps: "spelling",
  synonyms: "synonyms", antonyms: "antonyms",
  partsOfSpeech: "pos", tenses: "verbs", homophones: "homophones", concord: "concord", punctuation: "punctuation",
  plurals: "plurals", prefixes: "prefixes", vocabulary: "vocab", idioms: "idioms", oddOneOut: "categories", sentence: "sentences",
};
export const aiKindFor = (skill: string): BankKind | null => SKILL_KIND[skill] ?? null;

const LEVEL: Record<Difficulty, string> = {
  easy: "Primary 4–6 (ages 8–11)",
  medium: "Junior Secondary JSS 1–3 (ages 11–14)",
  hard: "Senior Secondary SSS 1–3, WAEC/NECO standard (ages 14–18)",
};

const POS_LIST: POS[] = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"];
const POS_BY_LEVEL: Record<Difficulty, POS[]> = {
  easy: ["noun", "verb", "adjective", "adverb"],
  medium: ["noun", "verb", "adjective", "adverb", "pronoun"],
  hard: POS_LIST,
};

// What to ask the model for, per bank: a description and the JSON shape.
const SPEC: Record<BankKind, { what: string; shape: string }> = {
  spelling: { what: "single English words worth practising spelling, each with a short clue that points to exactly that word (never containing the word itself)", shape: `{"word":"necessary","clue":"Needed; essential"}` },
  synonyms: { what: "pairs of single words with the same meaning", shape: `["begin","start"]` },
  antonyms: { what: "pairs of single words with opposite meanings", shape: `["ancient","modern"]` },
  pos: { what: "short sentences with one target word and its part of speech in that sentence", shape: `{"sentence":"The old man walked slowly.","word":"slowly","pos":"adverb"}` },
  verbs: { what: "irregular English verbs with all five forms: base, third-person singular, past simple, past participle, -ing", shape: `["write","writes","wrote","written","writing"]` },
  homophones: { what: "sentences with one gap (written ___) to be filled by one word from a set of 2–3 words that sound the same", shape: `{"sentence":"They left ___ bags at home.","answer":"their","set":["their","there","they're"]}` },
  concord: { what: "subject–verb agreement sentences with one gap (___) and two verb choices, exactly one correct", shape: `{"sentence":"Each of the students ___ a book.","options":["has","have"],"answer":"has"}` },
  punctuation: { what: "sentences punctuated correctly, each with three versions that contain one clear punctuation or capitalisation mistake", shape: `{"correct":"It's time to go home.","wrong":["Its time to go home.","It's time to go home","its time to go home."]}` },
  plurals: { what: "nouns with exactly one standard plural form (avoid nouns with two accepted plurals)", shape: `["child","children"]` },
  prefixes: { what: `adjectives or verbs whose opposite is made with exactly one of these prefixes: ${PREFIX_SET.join(", ")}`, shape: `["possible","im"]` },
  vocab: { what: "words with a short, clear meaning (meanings must not overlap with each other)", shape: `["reluctant","unwilling to do something"]` },
  idioms: { what: "common English idioms with their meaning", shape: `["bury the hatchet","make peace after a quarrel"]` },
  categories: { what: "categories of six single words that clearly belong together (no word could fit two categories)", shape: `{"name":"musical instruments","words":["guitar","drum","piano","trumpet","violin","flute"]}` },
  sentences: { what: "short sentences (5–10 words) whose words can only go in one natural order; start with a capital letter and end with . ! or ?", shape: `"The children are playing in the garden."` },
};

export function buildPrompt(kind: BankKind, d: Difficulty, count: number, avoid: string[]): string {
  const s = SPEC[kind];
  const examples = (BANKS[kind][d] as unknown[]).slice(0, 2).map((x) => JSON.stringify(x)).join("\n");
  return `You write content for an English-language learning game used by Nigerian school pupils.
Level: ${LEVEL[d]}.

Write ${count} NEW ${s.what}.
${kind === "pos" ? `Allowed parts of speech at this level: ${POS_BY_LEVEL[d].join(", ")}.\n` : ""}Rules:
- British/Nigerian English spelling (colour, favourite, organise). No American spellings.
- Everything must be correct, unambiguous, age-appropriate and culturally suitable for Nigerian learners.
- Exactly one right answer. No trick questions, no slang, no proper names that are hard to spell.
- Do NOT repeat any of these: ${avoid.slice(0, 80).join("; ") || "(none)"}

Each item has exactly this JSON shape:
${s.shape}
Examples already in the game (do not repeat them):
${examples}

Return ONLY strict JSON: {"items":[ ... ${count} items ... ]}`;
}

// ── Validation ─────────────────────────────────────────────────────────────
const str = (x: unknown, max = 120): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= max;
const word = (x: unknown, max = 24): x is string => str(x, max) && /^[A-Za-z][A-Za-z'-]*$/.test(x);
const phrase = (x: unknown, max = 80): x is string => str(x, max) && /^[A-Za-z][A-Za-z' ,;-]*$/.test(x as string);
const gapCount = (s: string) => s.split("___").length - 1;
const AMERICAN = /(?:^|[^a-z])(color|favorite|honor|labor|neighbor|organize|realize|center|theater|meter|traveled|gray|program)(?:[^a-z]|$)/i;

// Levenshtein distance (small strings only).
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// Returns the cleaned item, or null if it isn't safe to use.
export function validateItem(kind: BankKind, d: Difficulty, raw: any): unknown | null {
  try {
    switch (kind) {
      case "spelling": {
        if (!word(raw?.word, 18) || !str(raw?.clue, 90)) return null;
        if (raw.word.length < 3 || raw.clue.toLowerCase().includes(raw.word.toLowerCase())) return null;
        if (AMERICAN.test(raw.word)) return null;
        return { word: raw.word.trim(), clue: raw.clue.trim() };
      }
      case "synonyms": case "antonyms": {
        if (!Array.isArray(raw) || raw.length !== 2 || !phrase(raw[0], 18) || !phrase(raw[1], 18)) return null;
        if (raw[0].toLowerCase() === raw[1].toLowerCase()) return null;
        return [raw[0].trim(), raw[1].trim()];
      }
      case "pos": {
        if (!str(raw?.sentence, 90) || !word(raw?.word) || !POS_BY_LEVEL[d].includes(raw?.pos)) return null;
        if (!raw.sentence.split(/[\s.,!?;:]+/).includes(raw.word)) return null;
        if (!/[.!?]$/.test(raw.sentence.trim())) return null;
        return { sentence: raw.sentence.trim(), word: raw.word, pos: raw.pos };
      }
      case "verbs": {
        if (!Array.isArray(raw) || raw.length !== 5 || !raw.every((x: unknown) => word(x, 16))) return null;
        const [base, third, , , ing] = raw.map((x: string) => x.toLowerCase());
        if (!third.startsWith(base.slice(0, Math.max(1, base.length - 2))) || !ing.endsWith("ing")) return null;
        return raw.map((x: string) => x.toLowerCase());
      }
      case "homophones": {
        if (!str(raw?.sentence, 90) || gapCount(raw.sentence) !== 1 || !Array.isArray(raw?.set)) return null;
        const set = raw.set.filter((x: unknown) => word(x, 16));
        if (set.length < 2 || set.length > 3 || set.length !== raw.set.length || new Set(set).size !== set.length) return null;
        if (!set.includes(raw.answer)) return null;
        return { sentence: raw.sentence.trim(), answer: raw.answer, set };
      }
      case "concord": {
        if (!str(raw?.sentence, 100) || gapCount(raw.sentence) !== 1 || !Array.isArray(raw?.options) || raw.options.length !== 2) return null;
        if (!raw.options.every((x: unknown) => word(x, 14)) || raw.options[0] === raw.options[1] || !raw.options.includes(raw.answer)) return null;
        return { sentence: raw.sentence.trim(), options: raw.options, answer: raw.answer };
      }
      case "punctuation": {
        if (!str(raw?.correct, 110) || !Array.isArray(raw?.wrong) || raw.wrong.length !== 3 || !raw.wrong.every((x: unknown) => str(x, 110))) return null;
        const all = [raw.correct, ...raw.wrong].map((x: string) => x.trim());
        if (new Set(all).size !== 4) return null;
        // the wrong versions must be the same sentence with only punctuation/case changes
        const letters = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
        if (!all.every((x) => editDistance(letters(x), letters(all[0])) <= 2)) return null;
        return { correct: all[0], wrong: all.slice(1) };
      }
      case "plurals": {
        if (!Array.isArray(raw) || raw.length !== 2 || !phrase(raw[0], 24) || !phrase(raw[1], 26)) return null;
        return [raw[0].trim().toLowerCase(), raw[1].trim().toLowerCase()];
      }
      case "prefixes": {
        if (!Array.isArray(raw) || raw.length !== 2 || !word(raw[0], 18) || !PREFIX_SET.includes(String(raw[1]))) return null;
        return [raw[0].toLowerCase(), raw[1]];
      }
      case "vocab": case "idioms": {
        if (!Array.isArray(raw) || raw.length !== 2 || !phrase(raw[0], kind === "idioms" ? 60 : 20) || !str(raw[1], 80)) return null;
        if (raw[1].toLowerCase().includes(raw[0].toLowerCase())) return null;
        return [raw[0].trim(), raw[1].trim()];
      }
      case "categories": {
        if (!str(raw?.name, 40) || !Array.isArray(raw?.words) || raw.words.length !== 6 || !raw.words.every((x: unknown) => phrase(x, 18))) return null;
        if (new Set(raw.words.map((x: string) => x.toLowerCase())).size !== 6) return null;
        return { name: raw.name.trim().toLowerCase(), words: raw.words.map((x: string) => x.trim()) };
      }
      case "sentences": {
        if (!str(raw, 90) || !/^[A-Z]/.test(raw) || !/[.!?]$/.test(raw.trim())) return null;
        const n = raw.trim().split(/\s+/).length;
        if (n < 4 || n > 12) return null;
        return raw.trim().replace(/\s+/g, " ");
      }
    }
  } catch {
    return null;
  }
  return null;
}

// Validate a batch; drop invalid items, duplicates of the built-in bank and
// duplicates within the batch. Odd-one-out categories must not share words
// with the existing categories at that level.
export function validateBatch(kind: BankKind, d: Difficulty, raw: unknown[], existing: unknown[] = []): unknown[] {
  const known = [...(BANKS[kind][d] as unknown[]), ...existing];
  const seen = new Set<string>(known.map((x) => itemKey(kind, x)));
  const usedWords = kind === "categories"
    ? new Set((known as { words: string[] }[]).flatMap((c) => c.words.map((w) => w.toLowerCase())))
    : null;
  // Meanings must be unique too, or a question could have two right answers.
  const meanings = kind === "vocab" || kind === "idioms" || kind === "synonyms" || kind === "antonyms"
    ? new Set((known as [string, string][]).map((x) => String(x[1]).toLowerCase()))
    : null;
  const out: unknown[] = [];
  for (const r of raw) {
    const item = validateItem(kind, d, r);
    if (!item) continue;
    const k = itemKey(kind, item);
    if (seen.has(k)) continue;
    if (meanings) {
      const m = String((item as [string, string])[1]).toLowerCase();
      if (meanings.has(m)) continue;
      meanings.add(m);
    }
    if (usedWords) {
      const ws = (item as { words: string[] }).words.map((w) => w.toLowerCase());
      if (ws.some((w) => usedWords.has(w))) continue;
      ws.forEach((w) => usedWords.add(w));
    }
    seen.add(k);
    out.push(item);
  }
  return out;
}
