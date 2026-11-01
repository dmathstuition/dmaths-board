import { describe, expect, it } from "vitest";
import { anonLabel, answerSummary, cleanAnswerStrokes, cleanRound } from "@/lib/answerBoards";

const pen = (id: string, n = 4) => ({ id, by: "l1", color: "#1657C9", w: 4, pts: Array.from({ length: n }, () => 0.5) });

describe("answer boards", () => {
  it("keeps only drawing in an answer, within limits", () => {
    const got = cleanAnswerStrokes([pen("a"), { ...pen("b"), kind: "image", text: "x" }, { ...pen("c"), kind: "hl" }, "junk"]);
    expect(got.map((s) => s.id)).toEqual(["a", "c"]);
    expect(cleanAnswerStrokes(Array.from({ length: 40 }, (_, i) => pen(`p${i}`, 2000))).length).toBeLessThan(40);
  });
  it("checks rounds sent by the tutor", () => {
    expect(cleanRound({ id: "r1", q: "What is ½ of 8?", open: true })).toEqual({ id: "r1", q: "What is ½ of 8?", open: true, mode: "both", show: null, max: 1, marks: {}, img: null, per: {}, closed: false, endsAt: null, notes: {}, back: {} });
    expect(cleanRound({ q: "no id" })).toBeNull();
    expect(cleanRound({ id: "r1", open: true, show: { strokes: [pen("a")], name: 5 } })?.show).toMatchObject({ name: null });
  });
  it("gives each learner a steady anonymous letter", () => {
    const order = ["x", "y"];
    expect(anonLabel(order, "y")).toBe("Learner B");
    expect(anonLabel(Array.from({ length: 30 }, (_, i) => `k${i}`), "k27")).toBe("Learner AB");
  });
  it("counts who has answered", () => {
    const s = answerSummary(
      [{ by: "a", name: "Ada", strokes: [pen("1") as any], text: "", v: 1, at: 0 }, { by: "b", name: "Bo", strokes: [], text: "", v: 1, at: 0 }],
      [{ id: "a", name: "Ada" }, { id: "b", name: "Bo" }, { id: "c", name: "Cy" }],
    );
    expect(s).toEqual({ answered: 1, handedIn: 0, waiting: ["Bo", "Cy"] });
  });
});
