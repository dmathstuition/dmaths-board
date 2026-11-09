import { describe, expect, it } from "vitest";
import { addBuzz, buzzOrder, cleanBuzz, cleanBuzzRound, cleanReward, newBuzzRound, ordinal, topOf, type Buzz } from "@/lib/buzzRewards";
import { leaderboard, roundStars, type StarRows } from "@/lib/stars";

describe("the buzzer", () => {
  const round = { ...newBuzzRound("  What is 7 × 8?  ", 1000), id: "r1" };
  it("starts open, with the question tidied", () => {
    expect(round).toMatchObject({ q: "What is 7 × 8?", open: true, locked: false, startedAt: 1000, top: [] });
  });
  it("orders by when they pressed, not when it arrived", () => {
    let list: Buzz[] = [];
    list = addBuzz(list, cleanBuzz({ round: "r1", by: "slow-net", name: "Ada", at: 1200 }, round, 1900)); // pressed first, arrived late
    list = addBuzz(list, cleanBuzz({ round: "r1", by: "fast-net", name: "Bo", at: 1300 }, round, 1310));
    list = addBuzz(list, cleanBuzz({ round: "r1", by: "fast-net", name: "Bo", at: 1250 }, round, 1500)); // a repeat: the first one counts
    expect(buzzOrder(list).map((b) => b.name)).toEqual(["Ada", "Bo"]);
    expect(topOf(list)).toEqual([{ by: "slow-net", name: "Ada", ms: 0 }, { by: "fast-net", name: "Bo", ms: 100 }]);
  });
  it("doesn't let a buzz claim to be before the start or in the future", () => {
    expect(cleanBuzz({ round: "r1", by: "a", at: 5 }, round, 2000)!.at).toBe(1000);
    expect(cleanBuzz({ round: "r1", by: "a", at: 9e12 }, round, 2000)!.at).toBe(2000);
    expect(cleanBuzz({ round: "r1", by: "a", at: "x" }, round, 2000)!.at).toBe(2000);
  });
  it("ignores buzzes for another round, a locked round, or with no one", () => {
    expect(cleanBuzz({ round: "old", by: "a", at: 1100 }, round, 2000)).toBeNull();
    expect(cleanBuzz({ round: "r1", by: "a", at: 1100 }, { ...round, locked: true }, 2000)).toBeNull();
    expect(cleanBuzz({ round: "r1", at: 1100 }, round, 2000)).toBeNull();
    expect(cleanBuzz({ round: "r1", by: "a" }, null, 2000)).toBeNull();
  });
  it("a tie goes to whoever reached the teacher first", () => {
    const a = cleanBuzz({ round: "r1", by: "a", name: "A", at: 1500 }, round, 1700)!, b = cleanBuzz({ round: "r1", by: "b", name: "B", at: 1500 }, round, 1600)!;
    expect(buzzOrder([a, b]).map((x) => x.by)).toEqual(["b", "a"]);
  });
  it("cleans the round as it arrives", () => {
    expect(cleanBuzzRound(null)).toBeNull();
    const r = cleanBuzzRound({ id: "r", q: "x".repeat(500), open: 1, top: Array.from({ length: 9 }, (_, i) => ({ by: `p${i}`, name: "", ms: -4 })) })!;
    expect(r.q).toHaveLength(200);
    expect(r.top).toHaveLength(5);
    expect(r.top[0]).toEqual({ by: "p0", name: "Learner", ms: 0 });
  });
  it("says places the English way", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });
});

describe("rewards", () => {
  it("cleans a reward message", () => {
    expect(cleanReward({ id: "x", to: [] })).toBeNull();
    expect(cleanReward({ id: "x", to: ["a", 3, ""], names: ["Ada"], reason: "" })).toEqual({ id: "x", to: ["a"], names: ["Ada"], reason: "Well done", all: false });
  });
  it("each reward is one star, counted apart from game rounds", () => {
    expect(roundStars({ game_id: "reward", correct: 1 })).toBe(1);
    const rows: StarRows = {
      sessions: [{ id: "s", at: "" }], guests: [{ id: "g", session_id: "s", name: "Ada" }], marks: [], quiz: [], exams: [],
      games: Array.from({ length: 5 }, () => ({ session_id: "s", student_id: "g", name: "Ada", correct: 1, game_id: "reward" })),
    };
    const [ada] = leaderboard(rows, "s");
    expect(ada.parts.rewards).toBe(5);
    expect(ada.parts.games).toBe(0);
    expect(ada.stars).toBe(6); // 5 rewards + coming to class
    expect(ada.badges.map((b) => b.id)).toContain("praised");
    expect(ada.badges.map((b) => b.id)).not.toContain("gamer");
  });
});
