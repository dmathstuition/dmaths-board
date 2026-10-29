import { describe, it, expect } from "vitest";
import { UK_SETS, UK_YEARS, quizQuestions, gameItems } from "@/lib/ukPrimary";
import { cleanQuestions } from "@/lib/liveQuiz";

describe("UK primary ready-made sets", () => {
  it("cover every year from Reception to Year 6, in Maths and English", () => {
    for (const y of UK_YEARS) {
      const subjects = new Set(UK_SETS.filter((s) => s.year === y).map((s) => s.subject));
      expect(subjects.has("Maths"), `${y} maths`).toBe(true);
      expect(subjects.has("English"), `${y} english`).toBe(true);
    }
  });
  it("have unique ids", () => {
    expect(new Set(UK_SETS.map((s) => s.id)).size).toBe(UK_SETS.length);
  });
  for (const s of UK_SETS) {
    it(`${s.id}: every question has 2–4 different options including the answer`, () => {
      expect(s.questions.length).toBeGreaterThanOrEqual(8);
      for (const q of s.questions) {
        expect(q.options.length, q.q).toBeGreaterThanOrEqual(2);
        expect(q.options.length, q.q).toBeLessThanOrEqual(4);
        expect(new Set(q.options).size, q.q).toBe(q.options.length);
        expect(q.options.filter((o) => o === q.answer).length, q.q).toBe(1);
      }
    });
    it(`${s.id}: launches as a live quiz with nothing dropped`, () => {
      const qs = cleanQuestions(quizQuestions(s))!;
      expect(qs).toHaveLength(s.questions.length);
      qs.forEach((q, i) => expect(q.options[q.answer]).toBe(s.questions[i].answer));
    });
  }
  it("turn into class-game items", () => {
    const items = gameItems(UK_SETS[0]);
    expect(items[0]).toMatchObject({ lead: UK_SETS[0].topic, answer: UK_SETS[0].questions[0].answer });
  });
});
