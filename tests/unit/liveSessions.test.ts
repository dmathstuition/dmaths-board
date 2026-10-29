import { describe, it, expect } from "vitest";
import { makeCode, cleanCode, formatCode, joinPath, isOpen, canWrite, participantList, writerIds, type ParticipantRow } from "@/lib/liveSession";
import { nextPatch, scoreAnswer, streakBefore, streakBonus, leaderboard, viewFor, type AnswerRow, type QuizRow } from "@/lib/liveQuiz";

const now = Date.parse("2026-10-05T10:00:00Z");
const session = (over = {}) => ({ status: "live" as const, all_can_write: false, created_at: new Date(now - 60_000).toISOString(), host_id: "t1", ...over });
const seat = (id: string, over: Partial<ParticipantRow> = {}): ParticipantRow => ({ student_id: id, can_write: false, removed: false, joined_at: "", last_seen: new Date(now - 5000).toISOString(), ...over });

describe("interactive class sessions", () => {
  it("makes readable 6-digit PINs and cleans what learners type", () => {
    for (let i = 0; i < 200; i++) expect(makeCode()).toMatch(/^[1-9]\d{5}$/);
    expect(makeCode(() => 0)).toBe("100000");
    expect(cleanCode(" 482 913 ")).toBe("482913");
    expect(cleanCode("482-91")).toBeNull();
    expect(formatCode("482913")).toBe("482 913");
    expect(joinPath("482913")).toBe("/portal/live?pin=482913");
  });
  it("closes sessions that ended or were left running too long", () => {
    expect(isOpen(session(), now)).toBe(true);
    expect(isOpen(session({ status: "ended" }), now)).toBe(false);
    expect(isOpen(session({ created_at: new Date(now - 7 * 3600_000).toISOString() }), now)).toBe(false);
  });
  it("the host decides who writes", () => {
    expect(canWrite(session(), { host: true }, null, now)).toBe(true);
    expect(canWrite(session(), { host: false }, seat("s1"), now)).toBe(false);
    expect(canWrite(session(), { host: false }, seat("s1", { can_write: true }), now)).toBe(true);
    expect(canWrite(session({ all_can_write: true }), { host: false }, seat("s1"), now)).toBe(true);
    expect(canWrite(session({ all_can_write: true }), { host: false }, seat("s1", { removed: true }), now)).toBe(false);
    expect(canWrite(session({ status: "ended" }), { host: true }, null, now)).toBe(false);
    expect(writerIds(session(), [seat("s1", { can_write: true }), seat("s2"), seat("s3", { can_write: true, removed: true })])).toEqual(["t1", "s1"]);
    expect(writerIds(session({ all_can_write: true }), [])).toBe("all");
  });
  it("lists people online first and hides removed learners", () => {
    const rows = [seat("s1", { last_seen: new Date(now - 120_000).toISOString() }), seat("s2"), seat("s3", { removed: true })];
    const list = participantList(rows, new Map([["s1", "Ada O"], ["s2", "Bayo K"]]), false, now);
    expect(list.map((p) => [p.name, p.online])).toEqual([["Bayo K", true], ["Ada O", false]]);
  });
});

const q = (over: Partial<QuizRow> = {}): QuizRow => ({
  id: "z", session_id: "ls", title: "T", status: "lobby", current: -1, started_at: null, created_at: "",
  questions: [{ q: "a", options: ["1", "2"], answer: 0, seconds: 20 }, { q: "b", options: ["1", "2"], answer: 1, seconds: 20 }], ...over,
});

describe("kahoot-style flow", () => {
  it("moves lobby → question → reveal → scoreboard → … → podium", () => {
    const t = "2026-10-05T10:00:00.000Z";
    expect(nextPatch(q(), t)).toEqual({ status: "question", current: 0, started_at: t });
    expect(nextPatch(q({ status: "question", current: 0 }), t)).toEqual({ status: "reveal" });
    expect(nextPatch(q({ status: "reveal", current: 0 }), t)).toEqual({ status: "leaderboard" });
    expect(nextPatch(q({ status: "leaderboard", current: 0 }), t)).toEqual({ status: "question", current: 1, started_at: t });
    expect(nextPatch(q({ status: "reveal", current: 1 }), t)).toEqual({ status: "ended", ended_at: t });
    expect(nextPatch(q({ status: "ended", current: 1 }), t)).toBeNull();
  });
  it("adds an answer-streak bonus", () => {
    expect([0, 1, 2, 3, 6, 10].map(streakBonus)).toEqual([0, 0, 100, 200, 500, 500]);
    const prior: AnswerRow[] = [
      { idx: 0, student_id: "s1", choice: 0, correct: true, ms: 0, points: 1000 },
      { idx: 1, student_id: "s1", choice: 1, correct: true, ms: 0, points: 1100 },
    ];
    expect(streakBefore(prior, "s1", 2)).toBe(2);
    expect(streakBefore(prior, "s1", 3)).toBe(0);           // skipped question 2 breaks it
    expect(scoreAnswer(true, 0, 20, 2)).toEqual({ streak: 3, bonus: 200, points: 1200 });
    expect(scoreAnswer(false, 0, 20, 2)).toEqual({ streak: 0, bonus: 0, points: 0 });
  });
  it("shows who moved up, and how far behind the next learner you are", () => {
    const answers: AnswerRow[] = [
      { idx: 0, student_id: "a", choice: 0, correct: true, ms: 0, points: 1000 },
      { idx: 0, student_id: "b", choice: 0, correct: true, ms: 10_000, points: 750 },
      { idx: 1, student_id: "a", choice: 0, correct: false, ms: 0, points: 0 },
      { idx: 1, student_id: "b", choice: 1, correct: true, ms: 0, points: 1100, streak: 2 },
    ];
    const names = new Map([["a", "Ada"], ["b", "Bayo"]]);
    expect(leaderboard(answers, names).map((s) => [s.name, s.points, s.streak])).toEqual([["Bayo", 1850, 2], ["Ada", 1000, 0]]);
    const v = viewFor(q({ status: "reveal", current: 1, started_at: "x" }), answers, names, { host: false, id: "a" }, 2);
    expect(v.leaderboard[0]).toMatchObject({ name: "Bayo", move: 1 });
    expect(v.me).toMatchObject({ rank: 2, behind: { name: "Bayo", by: 850 }, answer: { correct: false, points: 0 } });
    const during = viewFor(q({ status: "question", current: 1, started_at: "x" }), answers, names, { host: false, id: "a" }, 2);
    expect(during.me?.behind).toBeNull();
    expect(during.question?.answer).toBeNull();
  });
});

import { revealDue } from "@/lib/liveQuiz";
import { secondsLeft } from "@/components/live/QuizBits";

describe("live quiz timing (no early zero)", () => {
  const t0 = Date.parse("2026-10-07T10:00:00Z");
  const quizAt = (startedAt: string | null, status: "question" | "reveal" = "question") =>
    ({ status, current: 0, started_at: startedAt, questions: [{ q: "a", options: ["1", "2"], answer: 0, seconds: 20 }] });
  it("a fresh question shows its full time, never a leftover 0", () => {
    expect(secondsLeft(new Date(t0).toISOString(), 20, 0, t0)).toBe(20);
    expect(secondsLeft(new Date(t0).toISOString(), 20, 0, t0 + 5_500)).toBe(15);
    expect(secondsLeft(new Date(t0).toISOString(), 20, 0, t0 + 25_000)).toBe(0);
    expect(secondsLeft(null, 20, 0, t0)).toBe(20);
    // A host device whose clock runs 3s fast still counts down from 20.
    expect(secondsLeft(new Date(t0).toISOString(), 20, -3000, t0 + 3000)).toBe(20);
  });
  it("only closes a question when time is really up or everyone answered", () => {
    const q = quizAt(new Date(t0).toISOString());
    expect(revealDue(q, 0, 5, t0 + 1000)).toBe(false);
    expect(revealDue(q, 0, 5, t0 + 20_500)).toBe(false);   // grace for late taps
    expect(revealDue(q, 0, 5, t0 + 21_600)).toBe(true);
    expect(revealDue(q, 5, 5, t0 + 1000)).toBe(true);
    expect(revealDue(q, 0, 0, t0 + 1000)).toBe(false);
    expect(revealDue(quizAt(new Date(t0).toISOString(), "reveal"), 5, 5, t0)).toBe(false);
  });
});
