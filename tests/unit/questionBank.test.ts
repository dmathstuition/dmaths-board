import { describe, it, expect } from "vitest";
import { validateQuestion, normaliseQuestion, pickRandom, toCbtQuestions, MAX_OPTIONS, parseQuestionBatch, summariseGroups, groupReady, GROUP_TARGET } from "@/lib/questionBank";

describe("summariseGroups", () => {
  it("counts questions per named group, ignoring blanks, sorted by name", () => {
    const rows = [
      { group_name: "Beta Set" },
      { group_name: "Alpha Set" },
      { group_name: "Beta Set" },
      { group_name: "" },
      { group_name: null },
      {},
    ];
    expect(summariseGroups(rows)).toEqual([
      { name: "Alpha Set", count: 1 },
      { name: "Beta Set", count: 2 },
    ]);
  });

  it("trims names and merges ones that differ only by whitespace", () => {
    expect(summariseGroups([{ group_name: "Set A" }, { group_name: "  Set A " }]))
      .toEqual([{ name: "Set A", count: 2 }]);
  });

  it("returns an empty array for no input", () => {
    expect(summariseGroups([])).toEqual([]);
    expect(summariseGroups(undefined as any)).toEqual([]);
  });
});

describe("groupReady", () => {
  it("is ready only at or above the target", () => {
    expect(groupReady(GROUP_TARGET - 1)).toBe(false);
    expect(groupReady(GROUP_TARGET)).toBe(true);
    expect(groupReady(GROUP_TARGET + 5)).toBe(true);
  });
});

describe("question images", () => {
  it("normaliseQuestion keeps and trims an image_url", () => {
    const q = normaliseQuestion({ question: "See the figure", options: ["a", "b"], answer: 0, image_url: "  https://x/img.png  " });
    expect(q.image_url).toBe("https://x/img.png");
  });
  it("normaliseQuestion defaults a missing image_url to blank", () => {
    expect(normaliseQuestion({ question: "q", options: ["a", "b"], answer: 0 }).image_url).toBe("");
  });
  it("toCbtQuestions carries the image through to the stored test", () => {
    const out = toCbtQuestions([{ question: "q", options: ["a", "b"], answer: 1, image_url: "https://x/i.png" }]);
    expect(out[0].image_url).toBe("https://x/i.png");
    expect(out[0].id).toBe(1);
  });
});

describe("parseQuestionBatch", () => {
  it("parses multiple blocks with the correct option flagged by *", () => {
    const text = `What is 2 + 2?
A) 3
B) 4 *
C) 5

Capital of France?
* A) Paris
B) Lagos`;
    const { questions, errors } = parseQuestionBatch(text);
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({ question: "What is 2 + 2?", answer: 1 });
    expect(questions[0].options).toEqual(["3", "4", "5"]);
    expect(questions[1]).toMatchObject({ question: "Capital of France?", answer: 0 });
  });
  it("strips question numbering and supports dash options", () => {
    const { questions } = parseQuestionBatch(`1. Pick the even number\n- 3\n- 4 *`);
    expect(questions[0].question).toBe("Pick the even number");
    expect(questions[0].answer).toBe(1);
  });
  it("reports blocks with no correct option or too few options", () => {
    const { questions, errors } = parseQuestionBatch(`No answer marked\nA) one\nB) two\n\nLonely\nA) only one`);
    expect(questions).toHaveLength(0);
    expect(errors.length).toBe(2);
    expect(errors[0]).toMatch(/mark the correct option/i);
  });
  it("is empty-safe", () => {
    expect(parseQuestionBatch("")).toEqual({ questions: [], errors: [] });
  });
});

const GOOD = { question: "2x + 6 = 14, so x = ?", options: ["2", "4", "6", "8"], answer: 1 };

describe("validateQuestion", () => {
  it("accepts a complete question", () => {
    expect(validateQuestion(GOOD)).toBeNull();
  });

  it("rejects one with no text", () => {
    expect(validateQuestion({ ...GOOD, question: "   " })).toMatch(/text/i);
  });

  it("rejects fewer than two options", () => {
    expect(validateQuestion({ ...GOOD, options: ["4"], answer: 0 })).toMatch(/two options/i);
  });

  it("rejects a blank option rather than storing an unchoosable answer", () => {
    expect(validateQuestion({ ...GOOD, options: ["2", "", "6", "8"] })).toMatch(/blank/i);
  });

  it("rejects too many options", () => {
    const options = Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => `o${i}`);
    expect(validateQuestion({ ...GOOD, options })).toMatch(/at most/i);
  });

  // The one that would silently mis-mark a learner.
  it("rejects an answer index that points at nothing", () => {
    expect(validateQuestion({ ...GOOD, answer: 4 })).toMatch(/correct answer/i);
    expect(validateQuestion({ ...GOOD, answer: -1 })).toMatch(/correct answer/i);
    expect(validateQuestion({ ...GOOD, answer: 1.5 })).toMatch(/correct answer/i);
  });
});

describe("normaliseQuestion", () => {
  it("trims text and options", () => {
    const n = normaliseQuestion({ question: "  x?  ", options: [" 2 ", " 4 "], answer: 1 });
    expect(n.question).toBe("x?");
    expect(n.options).toEqual(["2", "4"]);
  });

  it("clamps the answer inside the options it actually has", () => {
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: 9 }).answer).toBe(1);
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: -3 }).answer).toBe(0);
  });

  it("caps the option count", () => {
    const options = Array.from({ length: 20 }, (_, i) => `o${i}`);
    expect(normaliseQuestion({ question: "x?", options, answer: 0 }).options).toHaveLength(MAX_OPTIONS);
  });

  it("defaults a missing code block to empty rather than undefined", () => {
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: 0 }).code).toBe("");
  });
});

describe("pickRandom", () => {
  const items = [1, 2, 3, 4, 5];

  it("never repeats a question", () => {
    const picked = pickRandom(items, 5);
    expect(new Set(picked).size).toBe(5);
  });

  it("takes everything when asked for more than exists", () => {
    expect(pickRandom(items, 99).sort()).toEqual(items);
  });

  it("handles zero and an empty pool", () => {
    expect(pickRandom(items, 0)).toEqual([]);
    expect(pickRandom([], 5)).toEqual([]);
  });

  it("is deterministic with a fixed rng", () => {
    const rng = () => 0; // always take the head
    expect(pickRandom(items, 3, rng)).toEqual([1, 2, 3]);
  });
});

describe("toCbtQuestions", () => {
  it("renumbers from 1 whatever order they were assembled in", () => {
    const out = toCbtQuestions([GOOD, { ...GOOD, question: "another" }]);
    expect(out.map((q) => q.id)).toEqual([1, 2]);
    expect(out[1].question).toBe("another");
  });

  it("keeps the answer index intact", () => {
    expect(toCbtQuestions([GOOD])[0].answer).toBe(1);
  });
});
