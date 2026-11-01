import { describe, expect, it } from "vitest";
import { cleanShown, examStars, gameStars, leaderboard, nameKey, shownBoard, type StarRows } from "@/lib/stars";

const rows: StarRows = {
  sessions: [{ id: "s1", at: "" }, { id: "s2", at: "" }, { id: "s3", at: "" }],
  guests: [
    { id: "a1", session_id: "s1", name: "Ada Obi" }, { id: "a2", session_id: "s2", name: "ada  obi" }, { id: "a3", session_id: "s3", name: "ADA OBI" },
    { id: "b1", session_id: "s3", name: "Bola" },
  ],
  marks: [{ session_id: "s3", student_id: "a3", name: "ADA OBI", mark: 2, max_mark: 2 }, { session_id: "s3", student_id: "b1", name: "Bola", mark: null, max_mark: 5 }],
  quiz: Array.from({ length: 10 }, (_, i) => ({ session_id: "s2", student_id: "a2", correct: i < 9 })),
  exams: [{ session_id: "s3", student_id: "b1", name: "Bola", score: 10, total: 10 }],
  games: [{ session_id: "s3", student_id: "b1", name: "Bola", correct: 17 }],
};

describe("stars and badges", () => {
  it("one learner across classes is matched by name", () => {
    expect(nameKey("  Ada   OBI ")).toBe("ada obi");
    const [ada] = leaderboard(rows, "s3").filter((p) => p.key === "ada obi");
    expect(ada.classes).toBe(3);
    expect(ada.parts).toEqual({ attend: 3, quiz: 9, work: 2, exams: 0, games: 0 });
    expect(ada.stars).toBe(14);
    expect(ada.classStars).toBe(3); // this class: came (1) + class work (2)
    expect(ada.badges.map((b) => b.id)).toEqual(["first", "regular"]);
  });

  it("exams, games and feedback-only rows", () => {
    expect(examStars(10, 10)).toBe(5); expect(examStars(7, 10)).toBe(3); expect(examStars(null, 10)).toBe(0);
    expect(gameStars(17)).toBe(3); expect(gameStars(4)).toBe(0);
    const bola = leaderboard(rows, "s3").find((p) => p.key === "bola")!;
    expect(bola.stars).toBe(1 + 5 + 3); // came, a perfect exam, a game round (no mark yet for class work)
    expect(bola.badges.map((b) => b.id)).toContain("perfect");
  });

  it("puts the most stars first, and shows a short version on screens", () => {
    const list = leaderboard(rows, "s3");
    expect(list.map((p) => p.name)).toEqual(["Ada Obi", "Bola"]);
    const shown = shownBoard(list, "class");
    expect(shown.rows.map((r) => r.name)).toEqual(["Bola", "Ada Obi"]); // this class: 9 v 3
    expect(cleanShown({ title: "x".repeat(99), rows: [{ name: "Ada", stars: -3, badges: ["⭐", 5] }, { name: "" }] })).toEqual({ title: "x".repeat(40), rows: [{ name: "Ada", stars: 0, badges: ["⭐", "5"] }] });
  });
});
