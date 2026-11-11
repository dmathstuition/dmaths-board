import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETUP, DEFAULT_SQUARE, QUICK_MS, TABLES, TIMED_OUT, ask, cellId, cellShown, cleanDone, cleanDrill, cleanMastery, cleanSetup, cleanSquare, factKey, factText, family, learn,
  levelOf, mark, masteryCount, masteryStoreKey, newDrill, questionsFor, randomHidden, seconds, weakFacts, type Drill, type Mastery,
} from "@/lib/tablesDrill";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

const drill = (d: Partial<Drill> = {}): Drill => ({ id: "d1", setup: { tables: [7], ops: ["times"], count: 10, limit: 0 }, seed: 42, open: true, own: {}, ...d });

describe("times-table square", () => {
  it("gives the fact family", () => {
    expect(family(7, 8)).toEqual(["7 × 8 = 56", "8 × 7 = 56", "56 ÷ 7 = 8", "56 ÷ 8 = 7"]);
    expect(family(6, 6)).toEqual(["6 × 6 = 36", "36 ÷ 6 = 6"]);
  });
  it("covers and uncovers answers", () => {
    const s = { ...DEFAULT_SQUARE, hide: true, shown: [cellId(7, 8)] };
    expect(cellShown(s, 7, 8)).toBe(true);
    expect(cellShown(s, 8, 7)).toBe(false);
    expect(cellShown({ ...s, hide: false }, 8, 7)).toBe(true);
  });
  it("picks a covered fact, from the lit table when there is one", () => {
    const all = { ...DEFAULT_SQUARE, hide: true, table: 7, shown: [] as number[] };
    for (let i = 0; i < 20; i++) expect(randomHidden(all)![0]).toBe(7);
    const one = { ...all, shown: TABLES.concat(1).filter((c) => c !== 9).map((c) => cellId(7, c)) };
    expect(randomHidden(one)).toEqual([7, 9]);
    expect(randomHidden({ ...all, shown: Array.from({ length: 12 }, (_, i) => cellId(7, i + 1)) })).toBeNull();
  });
  it("cleans what arrives", () => {
    const s = cleanSquare({ on: 1, table: 99, sel: [7, 13], hide: 1, shown: [cellId(7, 8), cellId(7, 8), 3, 13, 999, "x"] });
    expect(s).toMatchObject({ on: true, table: 12, sel: null, hide: true, shown: [cellId(7, 8)] });
    expect(cleanSquare({ sel: [3, 4] }).sel).toEqual([3, 4]);
  });
});

describe("drill questions", () => {
  it("asks each kind of question", () => {
    expect(ask(7, 8, "times")).toMatchObject({ text: "7 × 8 =", ans: 56 });
    expect(ask(7, 8, "times", true)).toMatchObject({ text: "8 × 7 =", ans: 56 });
    expect(ask(7, 8, "divide")).toMatchObject({ text: "56 ÷ 7 =", ans: 8 });
    expect(ask(7, 8, "missing")).toMatchObject({ text: "7 × ? = 56", ans: 8 });
    expect(factText({ a: 7, b: 8 })).toBe("7 × 8 = 56");
  });
  it("gives the same questions on the teacher's screen and the learner's", () => {
    expect(questionsFor(drill(), "amy")).toEqual(questionsFor(drill(), "amy"));
    expect(questionsFor(drill(), "amy")).not.toEqual(questionsFor(drill(), "ben"));
    expect(questionsFor(drill({ seed: 43 }), "amy")).not.toEqual(questionsFor(drill(), "amy"));
  });
  it("uses only the chosen tables, and every fact before any repeats", () => {
    const qs = questionsFor(drill({ setup: { tables: [7], ops: ["times"], count: 20, limit: 0 } }), "amy");
    expect(qs).toHaveLength(20);
    expect(qs.every((q) => q.a === 7 && q.b >= 2 && q.b <= 12)).toBe(true);
    expect(new Set(qs.slice(0, 11).map((q) => q.b)).size).toBe(11);
    for (let i = 1; i < qs.length; i++) expect(qs[i].b === qs[i - 1].b).toBe(false);
    const mixed = questionsFor(drill({ setup: { tables: [3, 4], ops: ["times", "divide", "missing"], count: 30, limit: 0 } }), "amy");
    expect(new Set(mixed.map((q) => q.op)).size).toBe(3);
    expect(mixed.every((q) => [3, 4].includes(q.a))).toBe(true);
  });
  it("gives a learner their own weak facts when they have some", () => {
    const d = drill({ own: { amy: [[7, 8], [6, 9]] } });
    expect(questionsFor(d, "amy").every((q) => (q.a === 7 && q.b === 8) || (q.a === 6 && q.b === 9))).toBe(true);
    expect(questionsFor(d, "ben").every((q) => q.a === 7)).toBe(true);
  });
  it("cleans a drill and its setup", () => {
    expect(cleanSetup({ tables: [7, 7, 99, "3"], ops: ["divide", "magic"], count: 15, limit: 6 })).toEqual({ tables: [3, 7], ops: ["divide"], count: 10, limit: 6 });
    expect(cleanSetup(null)).toEqual(DEFAULT_SETUP);
    expect(cleanDrill({ id: "" })).toBeNull();
    const d = cleanDrill({ id: "x", setup: {}, seed: "5", open: 1, own: { amy: [[7, 8], [1, 99], "junk"], ben: [] } })!;
    expect(d).toMatchObject({ id: "x", seed: 5, open: true, own: { amy: [[7, 8]] } });
    const fresh = newDrill({ tables: [6], ops: ["times"], count: 20, limit: 10 }, 1000);
    expect(fresh.open).toBe(true);
    expect(fresh.setup.count).toBe(20);
  });
});

describe("marking", () => {
  const qs = [ask(7, 8, "times"), ask(7, 9, "times"), ask(7, 6, "divide"), ask(7, 8, "missing")];
  it("counts right, wrong, quick and timed-out answers", () => {
    const m = mark(qs, [[56, 2000], [64, 3000], [6, 9000]]);
    expect(m).toMatchObject({ n: 3, total: 4, right: 2, wrong: 1, quick: 1, avgMs: 5500, finished: false });
    expect(m.missed.map(factText)).toEqual(["7 × 9 = 63"]);
    const end = mark(qs, [[56, 2000], [TIMED_OUT, 6000], [6, 1000], [9, 1000]]);
    expect(end.finished).toBe(true);
    expect(end.missed.map(factText)).toEqual(["7 × 9 = 63", "7 × 8 = 56"]);
    expect(mark(qs, []).avgMs).toBe(0);
  });
  it("cleans the answers a learner sends", () => {
    expect(cleanDone([[56, 1200], ["x", -5], [1e9, 1e9], [3, 4]], 3)).toEqual([[56, 1200], [TIMED_OUT, 0], [999, 600_000]]);
    expect(cleanDone("junk", 5)).toEqual([]);
  });
});

describe("what a learner knows", () => {
  const qs = [ask(7, 8, "times"), ask(8, 7, "times"), ask(6, 9, "times"), ask(3, 4, "times")];
  it("treats 7 × 8 and 8 × 7 as one fact", () => {
    expect(factKey(8, 7)).toBe("7x8");
  });
  it("learns from each answer", () => {
    let m: Mastery = learn({}, qs, [[56, 2000], [54, 3000], [54, QUICK_MS + 1], [12, 1000]]);
    expect(levelOf(m["7x8"])).toBe("wrong"); // right, then wrong
    expect(levelOf(m["6x9"])).toBe("slow");
    expect(levelOf(m["3x4"])).toBe("quick");
    expect(levelOf(m["2x2"])).toBe("new");
    expect(weakFacts(m)).toEqual([[7, 8], [6, 9]]);
    // A later drill: only the new answers count.
    m = learn(m, [ask(7, 8, "times"), ask(6, 9, "times")], [[56, 1000], [54, 1000]], 0);
    expect(levelOf(m["7x8"])).toBe("quick");
    expect(m["7x8"]).toMatchObject({ r: 2, w: 1 });
    expect(levelOf(m["6x9"])).toBe("quick"); // the usual time is now an average of the two
    expect(learn(m, qs, [[56, 1], [56, 1]], 2)).toEqual(m);
    expect(weakFacts(m)).toEqual([]);
  });
  it("counts how much of the chosen tables is known", () => {
    const m = learn({}, qs, [[56, 2000], [56, 2000], [0, 1], [12, 9000]]);
    expect(masteryCount(m, [7])).toMatchObject({ quick: 1, new: 10, total: 11 });
    expect(masteryCount(m).total).toBe(66);
    expect(masteryCount(m)).toMatchObject({ quick: 1, slow: 1, wrong: 1 });
  });
  it("cleans a stored record and names its key", () => {
    expect(cleanMastery({ "7x8": { r: 2, w: "1", ms: 900, ok: 1 }, junk: { r: 1 }, "7x9": null })).toEqual({ "7x8": { r: 2, w: 1, ms: 900, ok: true } });
    expect(cleanMastery("x")).toEqual({});
    expect(masteryStoreKey("  Emmanuel   Obi ")).toBe("dm-tables:emmanuel obi");
    expect(seconds(2340)).toBe("2.3 s");
  });
});

describe("on the board", () => {
  it("the square travels with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, tsquare: { ...DEFAULT_WIDGETS.tsquare, on: true, table: 7, sel: [7, 8] } });
    expect(w.tsquare).toMatchObject({ on: true, table: 7, sel: [7, 8] });
    expect(cleanWidgets({}).tsquare.on).toBe(false);
  });
});
