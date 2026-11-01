import { describe, it, expect, vi, afterEach } from "vitest";
import { answerSummary, cleanAnswerText, cleanRound, hasAnswered, MAX_ANSWER_TEXT } from "@/lib/answerBoards";

describe("typed answers on answer boards", () => {
  it("keeps the tutor's choice of how to answer, defaulting to either", () => {
    expect(cleanRound({ id: "r1", q: "x?", open: true, mode: "type" })?.mode).toBe("type");
    expect(cleanRound({ id: "r1", q: "x?", open: true })?.mode).toBe("both");
    expect(cleanRound({ id: "r1", open: true, mode: "<script>" })?.mode).toBe("both");
  });
  it("tidies and limits typed text", () => {
    expect(cleanAnswerText("a\r\n\n\n\nb")).toBe("a\n\nb");
    expect(cleanAnswerText("x".repeat(900))).toHaveLength(MAX_ANSWER_TEXT);
    expect(cleanAnswerText(42)).toBe("");
  });
  it("counts a typed answer as answered", () => {
    expect(hasAnswered({ strokes: [], text: "  " })).toBe(false);
    expect(hasAnswered({ strokes: [], text: "x = 4" })).toBe(true);
    const s = answerSummary([{ by: "a", name: "Ada", strokes: [], text: "4", v: 1, at: 0 }], [{ id: "a", name: "Ada" }, { id: "b", name: "Bo" }]);
    expect(s).toEqual({ answered: 1, handedIn: 0, waiting: ["Bo"] });
  });
  it("carries the typed text when the tutor shows an answer", () => {
    expect(cleanRound({ id: "r", open: true, show: { strokes: [], text: "Half", name: null } })?.show?.text).toBe("Half");
  });
});

describe("the class clock", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it("works out the server's time from the quickest round trip", async () => {
    let t = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => t);
    // This phone is 5 minutes fast; each request takes 200 ms there and back.
    vi.stubGlobal("fetch", vi.fn(async () => { t += 100; const now = t - 300_000; t += 100; return { json: async () => ({ now }) }; }));
    const clock = await import("@/lib/serverClock");
    await clock.syncServerClock();
    expect(clock.clockSynced()).toBe(true);
    expect(Math.abs(clock.serverNow() - (t - 300_000))).toBeLessThanOrEqual(1);
    vi.restoreAllMocks();
  });
});

describe("marks on answer boards", () => {
  it("keeps what a question is worth and each learner's mark, within limits", () => {
    const r = cleanRound({ id: "r", open: true, max: 5, marks: { a: 3, b: 9, c: -2, d: "x" } })!;
    expect(r.max).toBe(5);
    expect(r.marks).toEqual({ a: 3, b: 5, c: 0 });
    expect(cleanRound({ id: "r", open: true, max: 99 })!.max).toBe(10);
    expect(cleanRound({ id: "r", open: true })!).toMatchObject({ max: 1, marks: {} });
  });
});
