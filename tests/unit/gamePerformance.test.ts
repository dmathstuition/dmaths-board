import { describe, it, expect } from "vitest";
import {
  questionTags, addTags, cleanTags, playerLevel, tierFor, ratingOf, gameStat, performance, skillLabel, type Round,
} from "@/lib/games/performance";
import { findGame, CLASS_GAMES } from "@/lib/games/catalog";

const blitz = findGame("times-blitz")!;
const day = (d: number, h = 12) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
const round = (game_id: string, correct: number, attempts: number, d: number, extra: Partial<Round> = {}): Round =>
  ({ game_id, correct, attempts, score: correct * 12, created_at: day(d), ...extra });

describe("question topics", () => {
  it("tags arithmetic questions by their topic", () => {
    expect(questionTags("multiplication", "7 × 8")).toEqual(["×7 table", "×8 table"]);
    expect(questionTags("multiplication", "6 × 6")).toEqual(["×6 table"]);
    expect(questionTags("division", "56 ÷ 7")).toEqual(["÷7"]);
    expect(questionTags("addition", "27 + 15")).toEqual(["Adding with carrying"]);
    expect(questionTags("addition", "21 + 13")).toEqual(["Adding without carrying"]);
    expect(questionTags("subtraction", "52 − 17")).toEqual(["Subtracting with borrowing"]);
    expect(questionTags("subtraction", "58 − 17")).toEqual(["Subtracting without borrowing"]);
    expect(questionTags("missing", "? × 4 = 28")).toEqual(["Missing number (×)"]);
    expect(questionTags("spelling", "anything")).toEqual([]);
  });
  it("tallies and sanitises topic counts", () => {
    const t = addTags(addTags({}, ["×7 table"], true), ["×7 table", "×8 table"], false);
    expect(t).toEqual({ "×7 table": { c: 1, a: 2 }, "×8 table": { c: 0, a: 1 } });
    expect(cleanTags({ ok: { c: 9, a: 3 }, bad: { c: 1, a: 0 }, "": { c: 1, a: 1 } })).toEqual({ ok: { c: 3, a: 3 } });
    expect(cleanTags("nope")).toEqual({});
  });
});

describe("levels, ratings and tiers", () => {
  it("player level grows with XP", () => {
    expect(playerLevel(0)).toMatchObject({ level: 1, pct: 0 });
    expect(playerLevel(50).level).toBe(2);
    expect(playerLevel(199).level).toBe(2);
    expect(playerLevel(200).level).toBe(3);
  });
  it("tiers follow the rating bands", () => {
    expect([0, 39, 40, 60, 75, 90, 100].map(tierFor)).toEqual(["Bronze", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Diamond"]);
  });
  it("rating blends accuracy and speed", () => {
    expect(ratingOf(blitz, [round("times-blitz", 20, 20, 1)])).toBe(100);      // perfect and fast
    expect(ratingOf(blitz, [round("times-blitz", 9, 10, 1)])).toBeLessThan(80); // accurate but slow
    expect(ratingOf(blitz, [round("times-blitz", 0, 0, 1)])).toBe(0);
  });
  it("detects improving and slipping trends", () => {
    const up = [1, 2, 3].map((d) => round("times-blitz", 5, 10, d)).concat([4, 5, 6].map((d) => round("times-blitz", 9, 10, d)));
    expect(gameStat(blitz, up).trend).toBe("up");
    const down = [1, 2, 3].map((d) => round("times-blitz", 9, 10, d)).concat([4, 5, 6].map((d) => round("times-blitz", 5, 10, d)));
    expect(gameStat(blitz, down).trend).toBe("down");
    expect(gameStat(blitz, up.slice(0, 2)).trend).toBe("new");
    expect(gameStat(blitz, up).history).toHaveLength(6);
  });
});

describe("the learner's profile", () => {
  it("finds strengths, weak points and tricky topics, and recommends practice", () => {
    const rounds: Round[] = [
      round("times-blitz", 19, 20, 1, { tags: { "×7 table": { c: 1, a: 5 }, "×2 table": { c: 6, a: 6 } } }),
      round("times-blitz", 20, 20, 2),
      round("division-dash", 3, 10, 3),
      round("division-dash", 4, 10, 4),
      round("not-a-game", 10, 10, 4),
    ];
    const p = performance(rounds, new Date(day(4, 18)));
    expect(p.plays).toBe(5);
    expect(p.games.map((g) => g.gameId).sort()).toEqual(["division-dash", "times-blitz"]);
    expect(p.strengths.map((s) => s.skill)).toContain("Times tables");
    expect(p.weaknesses.map((s) => s.skill)).toContain("Division");
    expect(p.weakTopics).toEqual([{ tag: "×7 table", attempts: 5, accuracy: 20 }]);
    expect(p.strongTopics.map((t) => t.tag)).toEqual(["×2 table"]);
    expect(p.recommend?.gameId).toBe("division-dash");
    expect(p.streakDays).toBe(4);
    expect(p.daysPlayed).toBe(4);
  });
  it("is empty but valid with no rounds", () => {
    const p = performance([]);
    expect(p).toMatchObject({ plays: 0, xp: 0, accuracy: null, games: [], recommend: null });
  });
  it("every game has a readable skill label", () => {
    for (const g of CLASS_GAMES) expect(skillLabel(g).length).toBeGreaterThan(2);
  });
});
