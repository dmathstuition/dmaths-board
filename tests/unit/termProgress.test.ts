import { describe, expect, it } from "vitest";
import { cleanDays, progressSummary, termProgress, trendOf, type TermRows } from "@/lib/termProgress";

const rows = (): TermRows => ({
  sessions: [
    { id: "s0", at: "2026-09-01T10:00:00Z" }, // before Ada came: not counted
    { id: "s1", at: "2026-09-08T10:00:00Z" },
    { id: "s2", at: "2026-09-15T10:00:00Z" },
    { id: "s3", at: "2026-09-22T10:00:00Z" }, // missed
    { id: "s4", at: "2026-09-29T10:00:00Z" },
  ],
  titles: { s1: "Fractions", s2: "Decimals", s3: "Ratio", s4: "Long division" },
  guests: [
    { id: "a1", session_id: "s1", name: "Ada" }, { id: "a2", session_id: "s2", name: " ada " }, { id: "a4", session_id: "s4", name: "ADA" },
    { id: "b0", session_id: "s0", name: "Ben" }, { id: "b3", session_id: "s3", name: "Ben" },
  ],
  marks: [
    { session_id: "s1", student_id: "a1", name: "Ada", mark: 1, max_mark: 2 },
    { session_id: "s2", student_id: "a2", name: "Ada", mark: 3, max_mark: 4 },
    { session_id: "s2", student_id: "a2", name: "Ada", mark: null, max_mark: 4 }, // feedback only
  ],
  asked: [{ session_id: "s1", asked: 2 }, { session_id: "s4", asked: 4 }],
  quiz: [{ session_id: "s1", student_id: "a1", correct: true }, { session_id: "s4", student_id: "a4", correct: true }, { session_id: "s4", student_id: "a4", correct: true }],
  exams: [{ session_id: "s4", student_id: "a4", name: "Ada", score: 9, total: 10 }],
  games: [{ session_id: "s2", student_id: "a2", name: "Ada", correct: 10 }],
});

describe("term progress", () => {
  it("adds up one learner across classes, matched by name", () => {
    const p = termProgress(rows(), "Ada", 91)!;
    expect(p.name).toBe("Ada");
    expect(p.held).toBe(4); // from her first class on
    expect(p.attended).toBe(3);
    expect(p.attendance).toBe(75);
    const [c1, c2, c3, c4] = p.classes;
    expect(c1).toMatchObject({ title: "Fractions", work: [1, 2], quiz: [1, 2], exam: null, percent: 50 });
    expect(c2).toMatchObject({ work: [3, 4], quiz: null, percent: 75 });
    expect(c3).toMatchObject({ attended: false, percent: null, stars: 0 });
    expect(c4).toMatchObject({ quiz: [2, 4], exam: [9, 10], percent: 79 });
    // stars: c1 1+1+1, c2 1+3+2 (game), c4 1+2+4 (exam 90% → 4)
    expect(p.classes.map((c) => c.stars)).toEqual([3, 6, 0, 7]);
    expect(p.stars).toBe(16);
    expect(p.averages).toEqual({ work: 67, quiz: 50, exam: 90, overall: 68 });
    expect(p.trend.direction).toBe("up");
    expect(p.best?.id).toBe("s4");
    expect(p.latest?.id).toBe("s4");
    expect(progressSummary(p)).toBe("Ada came to 3 of 4 classes, averaging 68% and is improving.");
  });

  it("is empty for someone who never came", () => {
    expect(termProgress(rows(), "Zed", 91)).toBeNull();
    expect(termProgress(rows(), "  ", 91)).toBeNull();
  });

  it("works out the trend", () => {
    expect(trendOf([50, 60, 70]).direction).toBe("up");
    expect(trendOf([80, 70, 60]).direction).toBe("down");
    expect(trendOf([70, 71, 70]).direction).toBe("steady");
    expect(trendOf([70, null]).direction).toBe("unknown");
  });

  it("keeps the range to the choices offered", () => {
    expect(cleanDays(31)).toBe(31);
    expect(cleanDays("183")).toBe(183);
    expect(cleanDays(5000)).toBe(91);
  });
});
