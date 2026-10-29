import { describe, it, expect } from "vitest";
import { askedCount, classResults, resultsCsv } from "@/lib/classResults";

const people = [{ id: "a", name: "Ada" }, { id: "b", name: "Bayo" }, { id: "c", name: "Chi" }];
const marks = [
  { round_id: "r1", student_id: "a", name: "Ada", question: "Q1", mark: 1, max_mark: 1 },
  { round_id: "r1", student_id: "b", name: "Bayo", question: "Q1", mark: 0, max_mark: 1 },
  { round_id: "r2", student_id: "a", name: "Ada", question: "Q2", mark: 3, max_mark: 5 },
  { round_id: "r2", student_id: "b", name: "Bayo", question: "Q2", mark: 5, max_mark: 5 },
];
const quizzes = [{ id: "q1", title: "Bonds", asked: 4 }];
const answers = [
  { quiz_id: "q1", student_id: "a", correct: true, points: 900 },
  { quiz_id: "q1", student_id: "a", correct: true, points: 800 },
  { quiz_id: "q1", student_id: "b", correct: false, points: 0 },
  { quiz_id: "q1", student_id: "c", correct: true, points: 950 },
];

describe("class results", () => {
  it("adds class-work marks and quiz answers into one total per learner", () => {
    const rows = classResults(people, marks, quizzes, answers);
    const ada = rows.find((r) => r.id === "a")!;
    expect(ada).toMatchObject({ work: 4, workMax: 6, quizCorrect: 2, quizAsked: 4, quizPoints: 1700, total: 6, totalMax: 10, percent: 60 });
    const chi = rows.find((r) => r.id === "c")!; // never marked: class work counts as 0 out of 6
    expect(chi).toMatchObject({ work: 0, workMax: 6, quizCorrect: 1, total: 1, totalMax: 10 });
    expect(rows.map((r) => r.name)).toEqual(["Ada", "Bayo", "Chi"]); // highest total first
  });
  it("names learners who have left from their marks", () => {
    const rows = classResults([], marks.slice(0, 1), [], []);
    expect(rows[0].name).toBe("Ada");
  });
  it("counts only the quiz questions that were asked", () => {
    expect(askedCount({ questions: [1, 2, 3], status: "lobby", current: -1 })).toBe(0);
    expect(askedCount({ questions: [1, 2, 3], status: "reveal", current: 1 })).toBe(2);
    expect(askedCount({ questions: [1, 2, 3], status: "ended", current: 2 })).toBe(3);
  });
  it("makes a spreadsheet", () => {
    const csv = resultsCsv(classResults(people, marks, quizzes, answers));
    expect(csv.split("\n")[0]).toMatch(/^Learner,Class work/);
    expect(csv).toContain("Ada,4,6,2,4,1700,6,10,60");
  });
});
