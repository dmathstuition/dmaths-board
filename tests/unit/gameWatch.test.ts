import { describe, expect, it } from "vitest";
import { accuracy, addToFeed, cleanSnap, isStale, rankLive, summarise, type Live } from "../../lib/games/watch";
import { quizFromSkill } from "../../lib/games/source";

const live = (by: string, score: number, correct = 0): Live => ({ by, name: by, game: "g", at: Date.now(), feed: [], phase: "playing", left: 30, score, correct, attempts: correct, streak: 0, best: 0 });

describe("watching a learner play", () => {
  it("cleans a snapshot from a phone", () => {
    expect(cleanSnap({ phase: "nope" })).toBeNull();
    const s = cleanSnap({ phase: "playing", left: 9999, score: -5, correct: 9, attempts: 3, streak: 2, best: 1, now: { prompt: "  7 × 8 = ?  ", options: ["54", "56"] } })!;
    expect(s.left).toBe(600); expect(s.score).toBe(0); expect(s.attempts).toBe(9);
    expect(s.now?.prompt).toBe("7 × 8 = ?");
  });
  it("keeps a feed without repeats, newest first", () => {
    const a = { n: 1, ok: true, prompt: "a" }, b = { n: 2, ok: false, prompt: "b" };
    let f = addToFeed([], a); f = addToFeed(f, a); f = addToFeed(f, b);
    expect(f.map((x) => x.n)).toEqual([2, 1]);
    expect(addToFeed(Array.from({ length: 12 }, (_, i) => ({ n: i, ok: true, prompt: `${i}` })), { n: 99, ok: true, prompt: "x" })).toHaveLength(12);
  });
  it("ranks by score and measures accuracy", () => {
    expect(rankLive([live("a", 10), live("b", 30), live("c", 30, 4)]).map((l) => l.by)).toEqual(["c", "b", "a"]);
    expect(accuracy({ correct: 3, attempts: 4 })).toBe(75); expect(accuracy({ correct: 0, attempts: 0 })).toBeNull();
  });
  it("treats a quiet phone as away, unless it finished", () => {
    expect(isStale({ at: 0, phase: "playing" }, 20_000)).toBe(true);
    expect(isStale({ at: 0, phase: "over" }, 20_000)).toBe(false);
  });
  it("sums up a learner's saved rounds", () => {
    const r = (id: string, score: number, correct: number, attempts: number, at: string) => ({ student_id: id, name: id, game_id: "x", difficulty: "easy", score, correct, attempts, created_at: at });
    const [top] = summarise([r("a", 50, 5, 10, "2026-01-01"), r("a", 70, 7, 10, "2026-01-02"), r("b", 10, 1, 10, "2026-01-01")]);
    expect(top).toMatchObject({ id: "a", rounds: 2, best: 70, total: 120, accuracy: 60, last: "2026-01-02" });
  });
  it("makes a quiz from a skill", () => {
    const q = quizFromSkill("multiplication", "easy", 6, 15);
    expect(q).toHaveLength(6);
    for (const x of q) { expect(x.options.length).toBeGreaterThanOrEqual(2); expect(x.answer).toBeLessThan(x.options.length); expect(x.seconds).toBe(15); }
  });
});
