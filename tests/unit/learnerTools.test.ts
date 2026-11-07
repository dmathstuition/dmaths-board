import { describe, expect, it } from "vitest";
import { MAX_ITEMS, buildPractice, practicePrompt, practiceStars, retryOf, type Missed } from "@/lib/practice";
import { cleanCards, flashcardPrompt, questionCards } from "@/lib/flashcards";
import { cleanReading, speakable } from "@/lib/reading";
import { confidence } from "@/lib/confidence";
import { leaderboard, roundStars } from "@/lib/stars";

const back: Missed = { from: "Exam Q1", q: "The bearing of B from A is 065°. Find the bearing of A from B.", options: ["245°", "115°", "295°", "065°"], answer: "245°", given: "115°" };
const work: Missed = { from: "Class work", q: "Expand 3(x + 4)", options: [], answer: null, given: "3x + 4" };

describe("fix my mistakes", () => {
  it("brings a missed question back with its options in a new, repeatable order", () => {
    const a = retryOf(back, "s|g")!, b = retryOf(back, "s|g")!;
    expect(a).toEqual(b);
    expect(a.options.sort()).toEqual([...back.options].sort());
    expect(a.options[a.answer]).toBe("245°");
    expect(a.working).toEqual(["The right answer is 245°.", "You put 115° — compare the two and see where it went wrong."]);
    expect(retryOf(work, "x")).toBeNull(); // class work has no options to mark against
  });

  it("puts the A.I's working and similar questions after each retry, and drops bad ones", () => {
    const ai = { fixes: [
      { n: 1, explain: ["Back bearing = bearing + 180° when it is under 180°", "065° + 180° = 245°"], similar: [
        { q: "The bearing of Q from P is 120°. Find the bearing of P from Q.", options: ["300°", "060°", "240°", "120°"], answer: 0, working: ["120° + 180° = 300°"] },
        { q: "Bad: three options", options: ["1", "2", "3"], answer: 0 },
        { q: "Bad: answer out of range", options: ["1", "2", "3", "4"], answer: 7 },
      ] },
      { n: 2, similar: [{ q: "Expand 5(x + 2)", options: ["5x + 10", "5x + 2", "x + 10", "5x + 7"], answer: 0, working: ["5 × x = 5x", "5 × 2 = 10"] }] },
    ] };
    const items = buildPractice([back, work], ai, "s|g");
    expect(items.map((x) => [x.kind, x.from])).toEqual([["retry", "Exam Q1"], ["similar", "Like Exam Q1"], ["similar", "Like Class work"]]);
    expect(items[0].working[1]).toBe("065° + 180° = 245°");
    expect(items[2].working).toEqual(["5 × x = 5x", "5 × 2 = 10"]);
  });

  it("works without the A.I, and keeps the set short", () => {
    expect(buildPractice([back, work], null, "s").map((x) => x.kind)).toEqual(["retry"]);
    const many = Array.from({ length: 10 }, (_, i) => ({ ...back, q: `${back.q} (${i})` }));
    const ai = { fixes: many.map((_, i) => ({ n: i + 1, similar: [0, 1].map((k) => ({ q: `New ${i}.${k}`, options: ["a", "b", "c", "d"], answer: 1, working: ["x"] })) })) };
    expect(buildPractice(many, ai, "s").length).toBe(MAX_ITEMS);
  });

  it("tells the A.I the right answer when it's known", () => {
    const p = practicePrompt([back, work]);
    expect(p).toContain("Right answer: 245°");
    expect(p).toContain("Their answer: 115°");
    expect(p).toContain("Right answer: (not given — work it out carefully)");
  });

  it("gives a star per right answer, up to 10, on the leaderboard", () => {
    expect([practiceStars(3), practiceStars(14), practiceStars(-1)]).toEqual([3, 10, 0]);
    expect(roundStars({ correct: 7, game_id: "practice" })).toBe(7);
    expect(roundStars({ correct: 7, game_id: "bearing-bound" })).toBe(1);
    const list = leaderboard({ sessions: [{ id: "s", at: "" }], guests: [{ id: "g", session_id: "s", name: "Ada" }], marks: [], quiz: [], exams: [],
      games: [{ session_id: "s", student_id: "g", name: "Ada", correct: 6, game_id: "practice" }] }, "s");
    expect(list[0].stars).toBe(1 + 6);
  });
});

describe("revision flashcards", () => {
  const lesson = { title: "Bearings", questions: [{ q: "Back bearing of 065°?", answer: "245°", from: "Quiz" }, { q: "Back bearing of 065°?", answer: "245°", from: "Exam" }, { q: "Expand 3(x + 4)", answer: null, from: "Class work" }], board: ["Bearings: from North, clockwise, 3 figures"] };
  it("makes question cards without the A.I", () => {
    expect(questionCards(lesson)).toEqual([{ front: "Back bearing of 065°?", back: "245°", tag: "Practice" }]);
  });
  it("cleans the A.I's cards", () => {
    expect(cleanCards({ cards: [{ front: "Bearings are measured from", back: "North, clockwise", tag: "Key fact" }, { front: "bearings are measured from", back: "dupe" }, { front: "", back: "x" }, { front: "x² + 2x", back: "y", tag: "Weird" }] }))
      .toEqual([{ front: "Bearings are measured from", back: "North, clockwise", tag: "Key fact" }, { front: "x² + 2x", back: "y", tag: "Key fact" }]);
  });
  it("gives the A.I the lesson", () => {
    const p = flashcardPrompt(lesson);
    expect(p).toContain("Lesson: Bearings");
    expect(p).toContain("Back bearing of 065°? (answer: 245°)");
    expect(p).toContain("- Bearings: from North, clockwise, 3 figures");
  });
});

describe("easier to read", () => {
  it("reads maths the way a teacher says it", () => {
    expect(speakable("x² + √9 = 12")).toBe("x squared + root 9 equals 12");
    expect(speakable("065° + 180° − 5° ≈ 240°")).toBe("065 degrees + 180 degrees minus 5 degrees is about 240 degrees");
    expect(speakable("3/4 × 8 ÷ 2")).toBe("3 over 4 times 8 divided by 2");
    expect(speakable("∠PQR and θ")).toBe("angle PQR and theta");
    expect(speakable("50% of ₦200")).toBe("50 percent of 200 naira");
  });
  it("keeps settings sensible", () => {
    expect(cleanReading({ size: 3, easy: 1, voice: true })).toEqual({ size: 3, easy: true, voice: true });
    expect(cleanReading({ size: 9 })).toEqual({ size: 1, easy: false, voice: false });
    expect(cleanReading(null)).toEqual({ size: 1, easy: false, voice: false });
  });
});

describe("confidence check", () => {
  it("sorts learners by how sure they were against whether they were right", () => {
    const c = confidence([
      { by: "a", right: true, sure: true }, { by: "b", right: true, sure: false }, { by: "c", right: false, sure: true },
      { by: "d", right: false, sure: false }, { by: "c", right: false, sure: true }, { by: "e", right: true, sure: false }, { by: "e", right: true, sure: true },
    ]);
    expect(c).toEqual({ knew: ["a", "e"], lucky: ["b"], misconception: ["c"], unsure: ["d"], total: 5 });
  });
});
