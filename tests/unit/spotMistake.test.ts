import { describe, it, expect } from "vitest";
import { cleanPick, cleanSpot, cleanSpotRound, publicSpot, spotPrompt, tallyPicks } from "@/lib/spotMistake";

const raw = { title: "Expanding", question: "Expand 3(x + 4)", lines: ["3(x + 4)", "= 3x + 4", "= 3x + 4 + 0", "Answer: 3x + 4"], wrong: 1, why: "3 must multiply the 4 too", fix: "= 3x + 12" };

describe("spot the mistake", () => {
  it("keeps a task only with enough lines and a valid wrong line, tidied", () => {
    expect(cleanSpot(raw)).toMatchObject({ title: "Expanding", wrong: 1, lines: ["3(x + 4)", "= 3x + 4", "= 3x + 4 + 0", "Answer: 3x + 4"] });
    expect(cleanSpot({ ...raw, wrong: 9 })).toBeNull();
    expect(cleanSpot({ ...raw, wrong: -1 })).toBeNull();
    expect(cleanSpot({ ...raw, lines: ["a", "b"] })).toBeNull();
    expect(cleanSpot({ ...raw, lines: ["a", " ", "b", "c"], wrong: 3 })).toBeNull(); // a blank line is dropped, so index 3 is gone
    expect(cleanSpot("nonsense")).toBeNull();
    expect(cleanSpot({ ...raw, lines: Array.from({ length: 30 }, (_, i) => `line ${i}`) })!.lines).toHaveLength(9);
  });
  it("never sends the answer to learners until it's revealed", () => {
    const d = cleanSpot(raw)!;
    const before = publicSpot(d, "r1", true, false);
    expect(before).toEqual({ id: "r1", title: "Expanding", question: "Expand 3(x + 4)", lines: d.lines, open: true, revealed: false });
    expect("wrong" in before || "why" in before || "fix" in before).toBe(false);
    expect(publicSpot(d, "r1", false, true)).toMatchObject({ revealed: true, wrong: 1, why: "3 must multiply the 4 too", fix: "= 3x + 12" });
    // A learner's copy ignores an answer that arrives without being revealed.
    expect(cleanSpotRound({ ...before, wrong: 1, why: "x" })).toEqual(before);
    expect(cleanSpotRound({ ...publicSpot(d, "r1", false, true), wrong: 12 })!.revealed).toBe(false);
    expect(cleanSpotRound({ lines: ["a", "b", "c"] })).toBeNull(); // no id
  });
  it("counts picks and says who found it", () => {
    const t = tallyPicks({ a: { name: "Ada", line: 1 }, b: { name: "Bola", line: 1 }, c: { name: "Chidi", line: 2 }, d: { name: "Dayo", line: 99 } }, 4, 2);
    expect(t).toEqual({ counts: [0, 2, 1, 0], right: ["Chidi"], wrongPick: ["Ada", "Bola"], total: 3 });
    expect(cleanPick("2", 4)).toBe(2); expect(cleanPick(4, 4)).toBeNull(); expect(cleanPick("x", 4)).toBeNull();
  });
  it("asks for the level and kind of mistake", () => {
    const p = spotPrompt({ topic: "Percentages", level: "JSS 1–3", kind: "sign error" });
    expect(p).toContain("Topic: Percentages"); expect(p).toContain("Kind of mistake: sign error");
    expect(spotPrompt({ topic: "Ratio", kind: "any" })).not.toContain("Kind of mistake");
  });
});
