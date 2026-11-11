import { describe, expect, it } from "vitest";
import {
  DEFAULT_ATOM, DEFAULT_SORT, DEFAULT_TRANSFORM, GRID, SHAPES, SHAPE_IDS, SORT_PRESETS, atomFacts, buildSort, chargeText, clampAt, cleanAtom, cleanSort, cleanTransform,
  commonN, describe as say, facts, fillShells, imagePts, isStable, mixAgain, moveCard, num, objectPts, offGrid, parseCards, sortGroups, sortScore, transformPt, type Pt, type TransformState,
} from "@/lib/lessonTools";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

const T = (t: Partial<TransformState>): TransformState => ({ ...DEFAULT_TRANSFORM, ...t });

describe("transformations", () => {
  it("reflects in the axes and the usual lines", () => {
    const p: Pt = [3, 1];
    expect(transformPt(T({ mirror: "x" }), p)).toEqual([3, -1]);
    expect(transformPt(T({ mirror: "y" }), p)).toEqual([-3, 1]);
    expect(transformPt(T({ mirror: "y=x" }), p)).toEqual([1, 3]);
    expect(transformPt(T({ mirror: "y=-x" }), p)).toEqual([-1, -3]);
    expect(transformPt(T({ mirror: "x=k", k: 1 }), p)).toEqual([-1, 1]);
    expect(transformPt(T({ mirror: "y=k", k: -2 }), p)).toEqual([3, -5]);
  });
  it("rotates about any centre", () => {
    expect(transformPt(T({ kind: "rotate", turn: 90 }), [3, 1])).toEqual([-1, 3]);
    expect(transformPt(T({ kind: "rotate", turn: 180 }), [3, 1])).toEqual([-3, -1]);
    expect(transformPt(T({ kind: "rotate", turn: 270 }), [3, 1])).toEqual([1, -3]);
    expect(transformPt(T({ kind: "rotate", turn: 90, centre: [1, 1] }), [3, 1])).toEqual([1, 3]);
    // Four quarter turns bring a point home.
    let q: Pt = [4, -2];
    for (let i = 0; i < 4; i++) q = transformPt(T({ kind: "rotate", turn: 90, centre: [-1, 2] }), q);
    expect(q).toEqual([4, -2]);
  });
  it("translates and enlarges", () => {
    expect(transformPt(T({ kind: "translate", by: [-6, 2] }), [3, 1])).toEqual([-3, 3]);
    expect(transformPt(T({ kind: "enlarge", scale: 2 }), [3, 1])).toEqual([6, 2]);
    expect(transformPt(T({ kind: "enlarge", scale: 0.5, centre: [1, 1] }), [3, 5])).toEqual([2, 3]);
    expect(transformPt(T({ kind: "enlarge", scale: -1, centre: [1, 0] }), [3, 1])).toEqual([-1, -1]);
  });
  it("gives the image of the whole shape, and says when it leaves the grid", () => {
    const s = T({ shape: "triangle", at: [2, 1], mirror: "y" });
    expect(objectPts(s)).toEqual([[2, 1], [5, 1], [2, 3]]);
    expect(imagePts(s)).toEqual([[-2, 1], [-5, 1], [-2, 3]]);
    expect(offGrid(s)).toBe(false);
    expect(offGrid(T({ kind: "enlarge", scale: 3, at: [2, 1] }))).toBe(true);
    expect(Object.is(imagePts(T({ at: [0, 0], mirror: "y" }))[0][0], -0)).toBe(false);
  });
  it("describes each transformation in full", () => {
    expect(say(T({ mirror: "y" }))).toBe("Reflection in the y-axis");
    expect(say(T({ mirror: "y=-x" }))).toBe("Reflection in the line y = −x");
    expect(say(T({ mirror: "x=k", k: -2 }))).toBe("Reflection in the line x = −2");
    expect(say(T({ kind: "rotate", turn: 270, centre: [1, -1] }))).toBe("Rotation of 90° clockwise about (1, −1)");
    expect(say(T({ kind: "rotate", turn: 180 }))).toBe("Rotation of 180° about (0, 0)");
    expect(say(T({ kind: "translate", by: [-6, 2] }))).toBe("Translation by the vector (−6, 2): 6 left and 2 up");
    expect(say(T({ kind: "translate", by: [0, -3] }))).toBe("Translation by the vector (0, −3): 3 down");
    expect(say(T({ kind: "enlarge", scale: 0.5, centre: [1, 1] }))).toBe("Enlargement, scale factor ½, centre (1, 1)");
    expect(facts(T({ kind: "enlarge", scale: 3 }))).toContain("area is ×9");
    expect(facts(T({ kind: "enlarge", scale: -2 }))).toContain("negative scale factor");
    expect(facts(T({ kind: "reflect" }))).toContain("congruent");
    expect(num(-0.5)).toBe("−½");
  });
  it("keeps the shape on the grid and cleans what arrives", () => {
    for (const id of SHAPE_IDS) for (const [x, y] of objectPts({ shape: id, at: clampAt(id, [99, 99]) })) { expect(x).toBeLessThanOrEqual(GRID); expect(y).toBeLessThanOrEqual(GRID); }
    expect(clampAt("trapezium", [-20, -20])).toEqual([-GRID, -GRID]);
    const s = cleanTransform({ shape: "dragon", at: [50, "x"], kind: "spin", mirror: "z", turn: 45, scale: 7, centre: [99, -99], by: [1.4, 2.6], k: 3.4 });
    expect(s.shape).toBe("triangle");
    expect(s.at).toEqual(clampAt("triangle", [50, 1]));
    expect([s.kind, s.mirror, s.turn, s.scale, s.k]).toEqual(["reflect", "y", 90, 2, 3]);
    expect(s.centre).toEqual([GRID, -GRID]);
    expect(s.by).toEqual([1, 3]);
    expect(s.show).toBe(true);
    expect(cleanTransform({ show: false, turn: 270, scale: -2 })).toMatchObject({ show: false, turn: 270, scale: -2 });
    expect(SHAPES.lshape.pts).toHaveLength(6);
  });
});

describe("atom builder", () => {
  it("names the atom from its protons and adds up the mass number", () => {
    const na = atomFacts({ p: 11, n: 12, e: 11 });
    expect(na.el.symbol).toBe("Na");
    expect(na.mass).toBe(23);
    expect(na.isotope).toBe("Sodium-23");
    expect(na.charge).toBe(0);
    expect(na.kind).toContain("Neutral atom");
    expect(na.shells).toEqual([2, 8, 1]);
    expect(na.stable).toBe(true);
  });
  it("works out ions and full outer shells", () => {
    const ion = atomFacts({ p: 11, n: 12, e: 10 });
    expect([ion.charge, ion.chargeText, ion.fullOuter]).toEqual([1, "+", true]);
    expect(ion.kind).toBe("Positive ion: it has lost 1 electron");
    const oxide = atomFacts({ p: 8, n: 8, e: 10 });
    expect([oxide.charge, oxide.chargeText]).toEqual([-2, "2−"]);
    expect(oxide.kind).toBe("Negative ion: it has gained 2 electrons");
    expect(chargeText(3)).toBe("3+");
    expect(fillShells(20)).toEqual([2, 8, 8, 2]);
    expect(fillShells(0)).toEqual([]);
  });
  it("knows which isotopes are stable", () => {
    expect(isStable(6, 6)).toBe(true);   // carbon-12
    expect(isStable(6, 7)).toBe(true);   // carbon-13
    expect(isStable(6, 8)).toBe(false);  // carbon-14 is radioactive
    expect(isStable(1, 2)).toBe(false);  // tritium
    expect(isStable(17, 18)).toBe(true); // chlorine-35
    expect(isStable(17, 20)).toBe(true); // chlorine-37
    expect(isStable(19, 21)).toBe(false); // potassium-40
    expect([1, 2, 6, 8, 11, 17, 18, 20].map(commonN)).toEqual([0, 2, 6, 8, 12, 18, 22, 20]);
  });
  it("cleans what arrives", () => {
    expect(cleanAtom({ p: 99, n: -4, e: "3", hide: 1 })).toMatchObject({ p: 20, n: 0, e: 3, hide: true });
    expect(cleanAtom(null)).toMatchObject({ p: DEFAULT_ATOM.p, n: 6, e: 6, on: false });
  });
});

describe("card sort", () => {
  const rnd = () => 0.3;
  it("reads cards typed on lines or with commas", () => {
    expect(parseCards(" 7\n13, 21 ;\n\n7 ")).toEqual(["7", "13", "21"]);
  });
  it("builds a mixed pile that remembers where each card belongs", () => {
    const s = buildSort("Odd or even?", [{ name: "Odd", cards: ["7", "13"] }, { name: "Even", cards: ["8", "14", "7"] }], rnd)!;
    expect(s.groups).toEqual(["Odd", "Even"]);
    expect(s.cards).toHaveLength(4); // the second "7" is a repeat
    expect(s.cards.every((c) => c.g === -1)).toBe(true);
    expect(s.cards.find((c) => c.t === "14")!.a).toBe(1);
    expect(buildSort("x", [{ name: "Only", cards: ["a"] }])).toBeNull();
    expect(buildSort("x", [{ name: "A", cards: [] }, { name: "B", cards: [] }])).toBeNull();
    expect(buildSort("x", Array.from({ length: 6 }, (_, i) => ({ name: `G${i}`, cards: [`c${i}`] })))!.groups).toHaveLength(4);
  });
  it("moves cards, scores them and mixes them again", () => {
    let s = { ...DEFAULT_SORT, ...buildSort("t", [{ name: "Odd", cards: ["7", "13"] }, { name: "Even", cards: ["8"] }], rnd)! };
    const at = (t: string) => s.cards.findIndex((c) => c.t === t);
    s = moveCard(s, at("7"), 0);
    s = moveCard(s, at("13"), 1); // wrong
    expect(sortScore(s)).toMatchObject({ total: 3, placed: 2, right: 1, done: false, allRight: false });
    s = moveCard(moveCard(s, at("13"), 0), at("8"), 1);
    expect(sortScore(s)).toMatchObject({ placed: 3, right: 3, done: true, allRight: true });
    expect(moveCard(s, 0, 9).cards[0].g).toBe(-1);
    const again = mixAgain({ ...s, check: true }, rnd);
    expect(again.check).toBe(false);
    expect(again.cards.every((c) => c.g === -1)).toBe(true);
    expect(sortGroups(s)).toEqual([{ name: "Odd", cards: expect.arrayContaining(["7", "13"]) }, { name: "Even", cards: ["8"] }]);
  });
  it("every ready-made set is fair: each card belongs under exactly one heading", () => {
    for (const p of SORT_PRESETS) {
      const all = p.groups.flatMap((g) => g.cards);
      expect(new Set(all.map((c) => c.toLowerCase())).size, p.title).toBe(all.length);
      expect(buildSort(p.title, p.groups)!.cards).toHaveLength(all.length);
    }
  });
  it("cleans what arrives", () => {
    const s = cleanSort({ on: true, title: "T", groups: ["A", "B"], cards: [{ t: "x", a: 5, g: 9 }, { t: "", a: 0, g: 0 }, { t: "y", a: 1, g: -3 }], check: 1 });
    expect(s.cards).toEqual([{ t: "x", a: 1, g: 1 }, { t: "y", a: 1, g: -1 }]);
    expect(s.check).toBe(true);
    expect(cleanSort({ on: true, groups: ["only one"] })).toMatchObject({ on: true, groups: DEFAULT_SORT.groups });
    expect(DEFAULT_SORT.cards).toHaveLength(10);
  });
});

describe("on the board", () => {
  it("the three tools travel with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, transform: { ...DEFAULT_WIDGETS.transform, on: true, kind: "rotate" }, atom: { ...DEFAULT_WIDGETS.atom, p: 11 }, sort: { ...DEFAULT_WIDGETS.sort, check: true } });
    expect(w.transform).toMatchObject({ on: true, kind: "rotate" });
    expect(w.atom.p).toBe(11);
    expect(w.sort.check).toBe(true);
    const old = cleanWidgets({}); // a board saved before these tools existed
    expect([old.transform.on, old.atom.on, old.sort.on]).toEqual([false, false, false]);
    expect(old.sort.cards.length).toBeGreaterThan(0);
  });
});
