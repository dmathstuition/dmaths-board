import { describe, it, expect } from "vitest";
import {
  englishChoice, misspellings, spellingStatement, englishPairs, tilePuzzle, assemble, solution, pluralGuesses,
  type EnglishChoiceSkill,
} from "@/lib/games/english";
import {
  SPELLING, SYNONYMS, ANTONYMS, POS_ITEMS, VERBS, HOMOPHONES, CONCORD, PUNCTUATION, PLURALS, PREFIXES, VOCAB, IDIOMS, CATEGORIES, SENTENCES,
} from "@/lib/games/englishBank";
import { matchBoard, statement, DIFFICULTIES } from "@/lib/games/generators";
import { CLASS_GAMES, subjectOf } from "@/lib/games/catalog";

function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const N = 250;
const SKILLS: EnglishChoiceSkill[] = ["spelling", "partsOfSpeech", "tenses", "homophones", "concord", "punctuation", "plurals", "prefixes", "vocabulary", "idioms", "oddOneOut"];

describe("word banks", () => {
  it("have no duplicate entries within a level", () => {
    for (const d of DIFFICULTIES) {
      const words = SPELLING[d].map((w) => w.word.toLowerCase());
      expect(new Set(words).size, `spelling ${d}`).toBe(words.length);
      for (const bank of [SYNONYMS[d], ANTONYMS[d], PLURALS[d], VOCAB[d], IDIOMS[d]]) {
        const keys = bank.map(([a]) => a);
        expect(new Set(keys).size).toBe(keys.length);
        const vals = bank.map(([, b]) => b);
        expect(new Set(vals).size).toBe(vals.length); // answers must be unique for matching / options
      }
    }
  });

  it("every gap sentence has exactly one gap and an answer in its set", () => {
    for (const d of DIFFICULTIES) {
      for (const h of HOMOPHONES[d]) { expect(h.sentence.split("___")).toHaveLength(2); expect(h.set).toContain(h.answer); }
      for (const c of CONCORD[d]) { expect(c.sentence.split("___")).toHaveLength(2); expect(c.options).toContain(c.answer); }
    }
  });

  it("parts-of-speech targets appear in their sentence", () => {
    for (const d of DIFFICULTIES) for (const it of POS_ITEMS[d]) expect(it.sentence.split(/[\s.,!?]+/)).toContain(it.word);
  });

  it("punctuation sets have one correct and three distinct wrong sentences", () => {
    for (const d of DIFFICULTIES) for (const p of PUNCTUATION[d]) {
      expect(p.wrong).toHaveLength(3);
      expect(new Set([p.correct, ...p.wrong]).size).toBe(4);
    }
  });

  it("verb tables have five forms each", () => {
    for (const d of DIFFICULTIES) for (const v of VERBS[d]) expect(v).toHaveLength(5);
  });

  it("odd-one-out categories never share a word", () => {
    for (const d of DIFFICULTIES) {
      const all = CATEGORIES[d].flatMap((c) => c.words.map((w) => w.toLowerCase()));
      expect(new Set(all).size).toBe(all.length);
    }
  });
});

describe("misspellings", () => {
  it("are never the real word or an American spelling", () => {
    const rng = seeded(1);
    for (const d of DIFFICULTIES) for (const { word } of SPELLING[d]) {
      const m = misspellings(word, rng, 3);
      expect(m.length).toBe(3);
      expect(new Set(m).size).toBe(3);
      for (const x of m) {
        expect(x.toLowerCase()).not.toBe(word.toLowerCase());
        expect(x).not.toBe(word.replace("our", "or"));
      }
    }
    expect(misspellings("neighbour", seeded(2), 20)).not.toContain("neighbor");
    expect(misspellings("favourite", seeded(3), 40)).not.toContain("favorite");
  });
});

describe("choice questions", () => {
  it("have distinct options containing the answer exactly once", () => {
    const rng = seeded(4);
    for (const s of SKILLS) for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = englishChoice(s, d, rng);
      expect(q.options.length, `${s} ${d}`).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
    }
  });

  it("spelling options: the answer is the bank word for that clue", () => {
    const rng = seeded(5);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = englishChoice("spelling", d, rng);
      expect(SPELLING[d].some((w) => w.word === q.answer && w.clue === q.lead)).toBe(true);
    }
  });

  it("tense answers match the time words", () => {
    const rng = seeded(6);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = englishChoice("tenses", d, rng);
      const base = q.prompt.match(/\((\w+)\)/)![1];
      const v = VERBS[d].find((x) => x[0] === base)!;
      const want = q.prompt.startsWith("Yesterday") ? v[2] : q.prompt.includes("has already") ? v[3] : q.prompt.startsWith("Every day") ? v[1] : v[4];
      expect(q.answer).toBe(want);
    }
  });

  it("plural distractors are never the true plural", () => {
    for (const d of DIFFICULTIES) for (const [base, plural] of PLURALS[d]) {
      expect(pluralGuesses(base).filter((g) => g !== plural).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("prefix answers use the bank's prefix", () => {
    const rng = seeded(7);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = englishChoice("prefixes", d, rng);
      const pre = PREFIXES[d].find(([r]) => r === q.prompt)![1];
      expect(q.answer).toBe(pre + q.prompt);
    }
  });

  it("odd-one-out: exactly one option is outside the named category", () => {
    const rng = seeded(8);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const q = englishChoice("oddOneOut", d, rng);
      // the three non-answers share one category; the answer is not in it
      const rest = q.options.filter((o) => o !== q.answer);
      const cat = CATEGORIES[d].find((c) => rest.every((o) => c.words.includes(o)))!;
      expect(cat).toBeTruthy();
      expect(cat.words).not.toContain(q.answer);
      if (d === "easy") expect(q.prompt).toBe(`Three are ${cat.name}…`);
    }
  });
});

describe("spot the spelling", () => {
  it("is true exactly when the word is spelled as in the bank", () => {
    const rng = seeded(9);
    for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const s = spellingStatement(d, rng);
      const [, clue, shown] = s.text.match(/^(.*): “(.*)”$/)!;
      const entry = SPELLING[d].find((w) => w.clue === clue)!;
      expect(shown === entry.word).toBe(s.isTrue);
    }
    expect(statement("easy", seeded(1), "spelling").text).toMatch(/“/);
  });
});

describe("matching", () => {
  it("synonym and antonym boards pair words from the bank", () => {
    const rng = seeded(10);
    for (const skill of ["synonyms", "antonyms"] as const) for (const d of DIFFICULTIES) for (let i = 0; i < 60; i++) {
      const pairs = d === "hard" ? 8 : 6;
      const board = matchBoard(d, rng, pairs, skill);
      expect(board).toHaveLength(pairs * 2);
      const bank = skill === "synonyms" ? SYNONYMS[d] : ANTONYMS[d];
      for (let p = 0; p < pairs; p++) {
        const a = board.find((c) => c.pair === p && c.side === "q")!.text, b = board.find((c) => c.pair === p && c.side === "a")!.text;
        expect(bank.some(([x, y]) => x === a && y === b)).toBe(true);
      }
    }
    expect(englishPairs("synonyms", "easy", 6, rng)).toHaveLength(6);
  });
});

describe("tile puzzles", () => {
  it("placing the fill in order solves it; tiles hold the fill plus decoys", () => {
    const rng = seeded(11);
    for (const skill of ["scramble", "gaps", "sentence"] as const) for (const d of DIFFICULTIES) for (let i = 0; i < N; i++) {
      const p = tilePuzzle(skill, d, rng);
      expect(p.slots.filter((s) => s === null)).toHaveLength(p.fill.length);
      // every fill token is available among the tiles (respecting duplicates)
      const pool = [...p.tiles];
      for (const f of p.fill) { const k = pool.indexOf(f); expect(k).toBeGreaterThanOrEqual(0); pool.splice(k, 1); }
      const target = skill === "sentence" ? SENTENCES[d].find((s) => s === solution(p)) : SPELLING[d].find((w) => w.word.toLowerCase() === solution(p))?.word.toLowerCase();
      expect(target, `${skill} ${solution(p)}`).toBeTruthy();
      expect(assemble(p, p.fill)).toBe(solution(p));
      if (skill !== "gaps") expect(p.tiles.join(p.joiner)).not.toBe(solution(p)); // never dealt already solved
      if (skill === "gaps") expect(p.slots[0]).not.toBeNull();                     // first letter always shown
    }
  });
});

describe("catalog", () => {
  it("has plenty of English games across all stages, each with a known skill", () => {
    const eng = CLASS_GAMES.filter((g) => subjectOf(g) === "english");
    expect(eng.length).toBeGreaterThanOrEqual(15);
    for (const st of ["primary", "junior", "senior"]) expect(eng.some((g) => g.stage === st)).toBe(true);
    const ids = CLASS_GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
