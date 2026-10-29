import { describe, expect, it } from "vitest";
import {
  clockDigital, clockWords, multiplesOf, normTime, numberToWords, placeValue, sentenceRight, sentenceWords, shuffleOrder,
  simplify, spellDone, spellShown, spellWrong, wallTotal, cleanSpellWord,
} from "@/lib/boardExtras";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

describe("clock", () => {
  it("says the time in words", () => {
    expect(clockWords(3, 0)).toBe("three o'clock");
    expect(clockWords(3, 15)).toBe("quarter past three");
    expect(clockWords(3, 30)).toBe("half past three");
    expect(clockWords(3, 40)).toBe("twenty to four");
    expect(clockWords(11, 45)).toBe("quarter to twelve");
    expect(clockWords(3, 7)).toBe("seven minutes past three");
    expect(clockWords(3, 59)).toBe("one minute to four");
  });
  it("wraps hours and minutes", () => {
    expect(normTime(0, -5)).toEqual({ h: 11, m: 55 });
    expect(normTime(11, 65)).toEqual({ h: 0, m: 5 });
    expect(clockDigital(0, 5)).toBe("12:05");
  });
});

describe("numbers in words", () => {
  it("writes numbers the British way", () => {
    expect(numberToWords(0)).toBe("zero");
    expect(numberToWords(42)).toBe("forty-two");
    expect(numberToWords(105)).toBe("one hundred and five");
    expect(numberToWords(1005)).toBe("one thousand and five");
    expect(numberToWords(2350)).toBe("two thousand three hundred and fifty");
    expect(numberToWords(1000000)).toBe("one million");
    expect(numberToWords(9999999)).toBe("nine million nine hundred and ninety-nine thousand nine hundred and ninety-nine");
  });
  it("reads place-value digits", () => expect(placeValue([0, 0, 1, 2, 3, 4, 5])).toBe(12345));
});

describe("fractions and the hundred square", () => {
  it("simplifies and adds shaded pieces", () => {
    expect(simplify(4, 8)).toEqual([1, 2]);
    expect(wallTotal([{ d: 2, on: [0] }, { d: 4, on: [0] }])).toEqual([3, 4]);
    expect(wallTotal([{ d: 3, on: [] }])).toEqual([0, 1]);
  });
  it("lists multiples up to 100", () => {
    expect(multiplesOf(25)).toEqual([25, 50, 75, 100]);
    expect(multiplesOf(7)).toHaveLength(14);
  });
});

describe("English tools", () => {
  it("scrambles a sentence and checks it", () => {
    const words = sentenceWords("  The cat sat on the mat. ");
    expect(words).toEqual(["The", "cat", "sat", "on", "the", "mat."]);
    let r = 0; const order = shuffleOrder(words.length, () => ((r = (r * 9301 + 49297) % 233280) / 233280));
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(order).not.toEqual([0, 1, 2, 3, 4, 5]);
    expect(sentenceRight(words, [0, 1, 2, 3, 4, 5])).toBe(true);
    expect(sentenceRight(words, [4, 1, 2, 3, 0, 5])).toBe(true); // "the"/"The" swap reads the same
    expect(sentenceRight(words, [1, 0, 2, 3, 4, 5])).toBe(false);
  });
  it("shows guessed letters only", () => {
    const w = cleanSpellWord("Ice-cream!");
    expect(w).toBe("ICE-CREAM");
    expect(spellShown(w, ["C"]).join("|")).toBe("|C||-|C||||");
    expect(spellWrong(w, ["C", "Z"])).toEqual(["Z"]);
    expect(spellDone(w, ["I", "C", "E", "R", "A", "M"])).toBe(true);
  });
});

describe("cleaning the new tools", () => {
  it("keeps good state and repairs bad state", () => {
    const w = cleanWidgets({
      clock: { on: true, x: 0.2, y: 0.2, h: 15, m: 99 },
      fractions: { bars: [{ d: 40, on: [0, 0, 50] }] },
      hundred: { marks: [0, 5, 5, 101, 100] },
      sentence: { words: ["a", "b", "c"], order: [2, 0], built: [9, 1] },
      spell: { word: "dog1", guessed: ["d", "zz", "D"] },
      wordCard: { kind: "banana", word: "x".repeat(99) },
    });
    expect(w.clock).toMatchObject({ on: true, h: 11, m: 59 });
    expect(w.fractions.bars).toEqual([{ d: 12, on: [0] }]);
    expect(w.hundred.marks).toEqual([5, 100]);
    expect(w.sentence.order).toEqual([0, 1, 2]);
    expect(w.sentence.built).toEqual([1]);
    expect(w.spell).toMatchObject({ word: "DOG", guessed: ["D"] });
    expect(w.wordCard.kind).toBe("noun");
    expect(w.wordCard.word).toHaveLength(40);
    expect(cleanWidgets({}).placeValue).toEqual(DEFAULT_WIDGETS.placeValue);
  });
});
