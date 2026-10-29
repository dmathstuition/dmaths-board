import { describe, it, expect } from "vitest";
import { cleanOptions, cleanPoll, cleanPulse, cleanVote, pulseNow, tally, PULSE_TTL_MS, type PulseEntry } from "@/lib/classPulse";

describe("got it / I'm lost", () => {
  it("only accepts a thumbs up or lost signal", () => {
    expect(cleanPulse({ by: "a", name: "Ada", v: "up" }, 5)).toEqual({ by: "a", name: "Ada", v: "up", at: 5 });
    expect(cleanPulse({ by: "a", v: "maybe" })).toBeNull();
    expect(cleanPulse({ v: "lost" })).toBeNull();
  });
  it("counts fresh signals and drops learners who have gone quiet", () => {
    const now = 100_000;
    const e = (by: string, v: "up" | "lost", age: number): PulseEntry => ({ by, name: by.toUpperCase(), v, at: now - age });
    const r = pulseNow([e("b", "up", 1000), e("a", "up", 0), e("c", "lost", 2000), e("d", "lost", PULSE_TTL_MS + 1)], now);
    expect(r.up.map((x) => x.by)).toEqual(["a", "b"]);
    expect(r.lost.map((x) => x.by)).toEqual(["c"]);
  });
});

describe("quick poll", () => {
  it("cleans the teacher's own choices: 2–6, trimmed, no repeats", () => {
    expect(cleanOptions("Red\n blue ,red,\n\nGreen")).toEqual(["Red", "blue", "Green"]);
    expect(cleanOptions(["1", "2", "3", "4", "5", "6", "7"])).toHaveLength(6);
    expect(cleanOptions("x".repeat(80))[0]).toHaveLength(40);
  });
  it("needs at least two choices", () => {
    expect(cleanPoll({ id: "p", options: ["Only one"], open: true })).toBeNull();
    expect(cleanPoll({ id: "p", q: "Ready?", options: ["Yes", "No"], open: true })).toMatchObject({ q: "Ready?", options: ["Yes", "No"], reveal: null });
  });
  it("accepts a vote only for this poll and a real choice", () => {
    const poll = cleanPoll({ id: "p1", options: ["A", "B", "C"], open: true });
    expect(cleanVote({ poll: "p1", by: "s1", name: "Tolu", choice: 2 }, poll)).toMatchObject({ by: "s1", choice: 2 });
    expect(cleanVote({ poll: "p0", by: "s1", choice: 1 }, poll)).toBeNull();
    expect(cleanVote({ poll: "p1", by: "s1", choice: 3 }, poll)).toBeNull();
    expect(cleanVote({ poll: "p1", by: "s1", choice: -1 }, poll)).toBeNull();
  });
  it("tallies counts, names and shares", () => {
    const poll = cleanPoll({ id: "p1", options: ["Yes", "No"], open: true })!;
    const t = tally(poll, [{ by: "a", name: "Zed", choice: 0, v: 1 }, { by: "b", name: "Ada", choice: 0, v: 1 }, { by: "c", name: "Bo", choice: 1, v: 1 }]);
    expect(t.counts).toEqual([2, 1]);
    expect(t.names[0]).toEqual(["Ada", "Zed"]);
    expect(t.pct).toEqual([67, 33]);
    expect(t.total).toBe(3);
  });
});
