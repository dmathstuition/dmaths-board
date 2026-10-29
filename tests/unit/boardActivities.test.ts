import { describe, expect, it } from "vitest";
import { buildMatching, buildSorting, checkCards, isAnswerCard, parseLines } from "@/lib/boardActivities";
import { cleanStroke, moveItem, type Stroke } from "@/lib/whiteboard";
import { pageDigest } from "@/lib/boardSync";

const rng = () => 0.42;
const mk = { by: "host", idp: "x" };

describe("sorting activity", () => {
  const items = buildSorting({ title: "Odd or even?", groups: [{ name: "Even", items: ["2", "8", "14"] }, { name: "Odd", items: parseLines("3, 7\n11") }] }, mk, rng);
  it("lays out a zone per group and a card per item, all valid board items", () => {
    expect(items.filter((s) => s.kind === "zone")).toHaveLength(2);
    expect(items.filter(isAnswerCard)).toHaveLength(6);
    for (const s of items) expect(cleanStroke(s)).toMatchObject(s);
    expect(new Set(items.map((s) => s.id)).size).toBe(items.length);
  });
  it("needs at least two named groups", () => {
    expect(buildSorting({ title: "", groups: [{ name: "Only", items: ["a"] }] }, mk)).toEqual([]);
  });
  it("marks cards in the right zone, the wrong zone, or not placed", () => {
    const zones = items.filter((s) => s.kind === "zone");
    const cards = items.filter(isAnswerCard);
    const into = (c: Stroke, z: Stroke) => moveItem(c, (z.pts[0] + z.pts[2]) / 2 - (c.pts[0] + c.pts[2]) / 2, (z.pts[1] + z.pts[3]) / 2 - (c.pts[1] + c.pts[3]) / 2);
    const right = into(cards[0], zones[cards[0].group!]);
    const wrong = into(cards[1], zones[1 - cards[1].group!]);
    const page = items.map((s) => (s.id === right.id ? right : s.id === wrong.id ? wrong : s));
    const marks = checkCards(page);
    expect(marks.get(right.id)).toBe("ok");
    expect(marks.get(wrong.id)).toBe("no");
    expect(marks.get(cards[2].id)).toBeUndefined();
  });
});

describe("matching activity", () => {
  it("makes fixed prompts, one slot each, and shuffled answer cards", () => {
    const items = buildMatching({ title: "Match", pairs: [{ left: "3 × 4", right: "12" }, { left: "5 × 6", right: "30" }, { left: "", right: "skip" }] }, mk, rng);
    expect(items.filter((s) => s.kind === "card" && s.group == null).map((s) => s.text)).toEqual(["3 × 4", "5 × 6"]);
    expect(items.filter((s) => s.kind === "zone")).toHaveLength(2);
    expect(items.filter(isAnswerCard).map((s) => s.text).sort()).toEqual(["12", "30"]);
  });
});

describe("activity items on the board", () => {
  it("keeps cover boxes and card marks, and notices them changing", () => {
    const cover: Stroke = { id: "c", by: "h", color: "#1657C9", w: 4, kind: "cover", fill: true, pts: [0.1, 0.1, 0.3, 0.3] };
    expect(cleanStroke(cover)).toMatchObject({ kind: "cover", fill: true });
    expect(pageDigest([cover])).not.toBe(pageDigest([{ ...cover, fill: false }])); // revealing is noticed by the self-check
    const card: Stroke = { id: "k", by: "h", color: "#DBEAFE", w: 4, kind: "card", text: "12", group: 1, mark: "ok", pts: [0.1, 0.1, 0.2, 0.17] };
    expect(cleanStroke(card)).toMatchObject({ group: 1, mark: "ok" });
    expect(cleanStroke({ ...card, text: " " })).toBeNull();
    expect(cleanStroke({ ...card, group: 40 })?.group).toBeUndefined();
  });
});
