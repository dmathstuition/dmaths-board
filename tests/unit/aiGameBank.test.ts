import { describe, it, expect, beforeEach } from "vitest";
import { validateItem, validateBatch, buildPrompt, aiKindFor, SKILL_KIND } from "@/lib/games/aiBank";
import { BANKS, bank, addExtra, draw, clearExtras, extraCount, itemKey, type BankKind } from "@/lib/games/englishBank";
import { englishChoice, tilePuzzle, solution } from "@/lib/games/english";
import { CLASS_GAMES } from "@/lib/games/catalog";
import { DIFFICULTIES } from "@/lib/games/generators";

beforeEach(() => clearExtras());

describe("validators accept every built-in item", () => {
  it("each bank item passes its own validator (so the rules match the curated style)", () => {
    for (const kind of Object.keys(BANKS) as BankKind[]) for (const d of DIFFICULTIES) {
      for (const item of BANKS[kind][d] as unknown[]) {
        // built-in irregulars like "lie/lay" or hyphenated plurals are fine; only shape is checked
        expect(validateItem(kind, d, item), `${kind}/${d}: ${JSON.stringify(item)}`).not.toBeNull();
      }
    }
  });
});

describe("validators reject bad A.I output", () => {
  it("spelling", () => {
    expect(validateItem("spelling", "easy", { word: "colour", clue: "What red and blue are" })).not.toBeNull();
    expect(validateItem("spelling", "easy", { word: "color", clue: "What red and blue are" })).toBeNull();      // American
    expect(validateItem("spelling", "easy", { word: "apple", clue: "An apple is a fruit" })).toBeNull();          // clue gives it away
    expect(validateItem("spelling", "easy", { word: "two words", clue: "x" })).toBeNull();
    expect(validateItem("spelling", "easy", { word: "<script>", clue: "x" })).toBeNull();
  });
  it("gap sentences need exactly one gap and the answer in the set", () => {
    expect(validateItem("homophones", "easy", { sentence: "I ___ a ___.", answer: "see", set: ["see", "sea"] })).toBeNull();
    expect(validateItem("homophones", "easy", { sentence: "I ___ it.", answer: "saw", set: ["see", "sea"] })).toBeNull();
    expect(validateItem("concord", "easy", { sentence: "He ___ here.", options: ["is", "is"], answer: "is" })).toBeNull();
    expect(validateItem("concord", "easy", { sentence: "He ___ here.", options: ["is", "are"], answer: "is" })).not.toBeNull();
  });
  it("punctuation variants must be the same words", () => {
    expect(validateItem("punctuation", "easy", { correct: "I am here.", wrong: ["i am here.", "I am here", "I am here!"] })).not.toBeNull();
    expect(validateItem("punctuation", "easy", { correct: "I am here.", wrong: ["You are here.", "I am here", "I am here!"] })).toBeNull();
  });
  it("parts of speech respect the level and the sentence", () => {
    expect(validateItem("pos", "easy", { sentence: "Wow! That is big.", word: "Wow", pos: "interjection" })).toBeNull(); // too hard for easy
    expect(validateItem("pos", "hard", { sentence: "Wow! That is big.", word: "Wow", pos: "interjection" })).not.toBeNull();
    expect(validateItem("pos", "easy", { sentence: "The cat sat.", word: "dog", pos: "noun" })).toBeNull();
  });
  it("prefixes, verbs, categories, sentences", () => {
    expect(validateItem("prefixes", "easy", ["kind", "non"])).toBeNull();
    expect(validateItem("verbs", "easy", ["go", "goes", "went", "gone"])).toBeNull();
    expect(validateItem("categories", "easy", { name: "fruits", words: ["a", "b", "c", "d", "e", "e"] })).toBeNull();
    expect(validateItem("sentences", "easy", "no capital letter here.")).toBeNull();
    expect(validateItem("sentences", "easy", "The cat sleeps on the mat.")).not.toBeNull();
  });
  it("junk never throws", () => {
    for (const kind of Object.keys(BANKS) as BankKind[]) for (const junk of [null, 42, "x", [], {}, [1, 2], { word: 5 }]) {
      expect(validateItem(kind, "medium", junk)).toBeNull();
    }
  });
});

describe("batches", () => {
  it("drop duplicates of the built-in bank and within the batch", () => {
    const fresh = { word: "zeppelin", clue: "A large airship" };
    const out = validateBatch("spelling", "easy", [BANKS.spelling.easy[0], fresh, fresh, { word: "bad word" }]);
    expect(out).toEqual([fresh]);
  });
  it("odd-one-out categories can't reuse a word from any existing category", () => {
    const clash = { name: "breakfast foods", words: ["bread", "egg", "tea", "mango", "akara", "pap"] }; // mango is already a fruit
    const ok = { name: "insects", words: ["ant", "bee", "fly", "beetle", "moth", "wasp"] };
    expect(validateBatch("categories", "easy", [clash, ok])).toEqual([ok]);
  });
  it("rejects an idiom or word whose meaning is already in the bank", () => {
    expect(validateBatch("idioms", "medium", [["spill the beans", "reveal a secret"]])).toEqual([]);
    expect(validateBatch("idioms", "medium", [["spill the beans", "tell a secret too early"]])).toHaveLength(1);
  });

  it("prompts mention the level, the shape and what to avoid", () => {
    const p = buildPrompt("idioms", "hard", 10, ["bury the hatchet"]);
    expect(p).toMatch(/WAEC/);
    expect(p).toMatch(/bury the hatchet/);
    expect(p).toMatch(/"items"/);
  });
});

describe("extras registry and decks", () => {
  it("extra items join the bank once, and generators use them", () => {
    const item = { word: "zeppelin", clue: "A large airship" };
    expect(addExtra("spelling", "easy", [item, item])).toBe(1);
    expect(extraCount("spelling", "easy")).toBe(1);
    expect(bank("spelling", "easy").some((w) => w.word === "zeppelin")).toBe(true);
    // with a one-item bank swap we can see generators reach the extra
    let seen = false;
    for (let i = 0; i < 400 && !seen; i++) seen = solution(tilePuzzle("scramble", "easy")) === "zeppelin";
    expect(seen).toBe(true);
  });

  it("draw deals every item once before repeating", () => {
    const n = bank("idioms", "medium").length;
    const keys = Array.from({ length: n }, () => itemKey("idioms", draw("idioms", "medium")));
    expect(new Set(keys).size).toBe(n);
  });

  it("A.I vocab items still give four distinct options with the answer once", () => {
    addExtra("vocab", "hard", [["quixotic", "unrealistically idealistic"], ["laconic", "using very few words"]]);
    for (let i = 0; i < 300; i++) {
      const q = englishChoice("vocabulary", "hard");
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
    }
  });

  it("every word/grammar game skill maps to a bank; maths skills don't", () => {
    for (const g of CLASS_GAMES.filter((x) => x.subject === "english")) expect(aiKindFor(g.skill), g.id).not.toBeNull();
    expect(aiKindFor("multiplication")).toBeNull();
    expect(aiKindFor("quadratics")).toBeNull();
    expect(Object.values(SKILL_KIND).every((k) => k in BANKS)).toBe(true);
  });
});
