import { describe, expect, it } from "vitest";
import {
  DIAGRAMS, DIAGRAM_IDS, ELEMENTS, FAMILIES, brightness, canAdd, cleanCircuit, cleanLabels, cleanPTable, element, elementColour, labelRows, labelShown,
  metalKind, nextHidden, shells, solveCircuit, voltTargets, type Part,
} from "@/lib/scienceTools";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

const el = (sym: string) => ELEMENTS.find((e) => e.symbol === sym)!;

describe("periodic table", () => {
  it("has all 118 elements, each once, in order", () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => e.name)).size).toBe(118);
    ELEMENTS.forEach((e, i) => { expect(e.z).toBe(i + 1); expect(e.mass).toBeGreaterThan(0); expect(FAMILIES[e.family], e.symbol).toBeTruthy(); expect(e.symbol).toMatch(/^[A-Z][a-z]?$/); });
    expect(element(26)).toMatchObject({ symbol: "Fe", name: "Iron", mass: 55.85 });
    expect(element(79)!.name).toBe("Gold");
    expect(element(0)).toBeNull();
  });
  it("puts every element in its group and period", () => {
    const at = (s: string) => [el(s).period, el(s).group];
    expect(at("H")).toEqual([1, 1]); expect(at("He")).toEqual([1, 18]);
    expect(at("Li")).toEqual([2, 1]); expect(at("B")).toEqual([2, 13]); expect(at("Ne")).toEqual([2, 18]);
    expect(at("Na")).toEqual([3, 1]); expect(at("Al")).toEqual([3, 13]); expect(at("Cl")).toEqual([3, 17]);
    expect(at("K")).toEqual([4, 1]); expect(at("Fe")).toEqual([4, 8]); expect(at("Cu")).toEqual([4, 11]); expect(at("Zn")).toEqual([4, 12]); expect(at("Br")).toEqual([4, 17]);
    expect(at("Ag")).toEqual([5, 11]); expect(at("I")).toEqual([5, 17]);
    expect(at("Ba")).toEqual([6, 2]); expect(at("Hf")).toEqual([6, 4]); expect(at("Au")).toEqual([6, 11]); expect(at("Hg")).toEqual([6, 12]); expect(at("Pb")).toEqual([6, 14]); expect(at("Rn")).toEqual([6, 18]);
    expect(at("Ra")).toEqual([7, 2]); expect(at("Rf")).toEqual([7, 4]); expect(at("Og")).toEqual([7, 18]);
    // The two rows underneath.
    expect(el("La")).toMatchObject({ period: 6, group: null, row: 8, col: 3 });
    expect(el("Lu")).toMatchObject({ row: 8, col: 17 });
    expect(el("U")).toMatchObject({ period: 7, group: null, row: 9, col: 6 });
    // No two elements share a square.
    expect(new Set(ELEMENTS.map((e) => `${e.row},${e.col}`)).size).toBe(118);
    ELEMENTS.forEach((e) => { expect(e.col).toBeGreaterThanOrEqual(1); expect(e.col).toBeLessThanOrEqual(18); });
  });
  it("knows families, states and metals", () => {
    expect(ELEMENTS.filter((e) => e.family === "am").map((e) => e.symbol)).toEqual(["Li", "Na", "K", "Rb", "Cs", "Fr"]);
    expect(ELEMENTS.filter((e) => e.family === "ha").map((e) => e.symbol)).toEqual(["F", "Cl", "Br", "I", "At", "Ts"]);
    expect(ELEMENTS.filter((e) => e.family === "ng").map((e) => e.symbol)).toEqual(["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"]);
    expect(ELEMENTS.filter((e) => e.family === "la")).toHaveLength(15);
    expect(ELEMENTS.filter((e) => e.state === "liquid").map((e) => e.symbol)).toEqual(["Br", "Hg"]);
    expect(ELEMENTS.filter((e) => e.state === "gas").map((e) => e.symbol)).toEqual(["H", "He", "N", "O", "F", "Ne", "Cl", "Ar", "Kr", "Xe", "Rn"]);
    expect([metalKind(el("Na")), metalKind(el("Si")), metalKind(el("O")), metalKind(el("Fe")), metalKind(el("Ar"))]).toEqual(["Metal", "Metalloid", "Non-metal", "Metal", "Non-metal"]);
    expect(elementColour(el("Na"), "none")).toBe("#F1F5F9");
    expect(elementColour(el("Na"), "family")).toBe(FAMILIES.am.colour);
  });
  it("fills electron shells for the first 20", () => {
    expect(shells(1)).toEqual([1]); expect(shells(2)).toEqual([2]); expect(shells(11)).toEqual([2, 8, 1]);
    expect(shells(17)).toEqual([2, 8, 7]); expect(shells(18)).toEqual([2, 8, 8]); expect(shells(20)).toEqual([2, 8, 8, 2]);
    expect(shells(21)).toBeNull();
  });
  it("cleans what arrives", () => {
    expect(cleanPTable({ on: 1, sel: 999, colour: "rainbow", hide: 1 })).toMatchObject({ on: true, sel: 118, colour: "family", hide: true, reveal: false });
    expect(cleanPTable(null).sel).toBe(0);
  });
});

describe("circuit builder", () => {
  const bulb: Part = { kind: "bulb" }, res: Part = { kind: "resistor" }, sw = (open: boolean): Part => ({ kind: "switch", open }), amm: Part = { kind: "ammeter" };
  const run = (cells: number, branches: Part[][], volt = "", closed = true) => solveCircuit({ cells, closed, branches, volt });
  it("one bulb on one cell is normal brightness", () => {
    const s = run(1, [[bulb]]);
    expect(s.volts).toBe(1.5);
    expect(s.total).toBeCloseTo(0.25);
    expect(s.branches[0].parts[0].brightness).toBe("normal");
  });
  it("bulbs in series share the voltage and are dimmer", () => {
    const s = run(2, [[bulb, bulb]], "p0.0");
    expect(s.total).toBeCloseTo(0.25);                 // 3 V ÷ 12 Ω
    expect(s.voltmeter).toBeCloseTo(1.5);              // half the battery each
    expect(s.branches[0].parts.map((p) => p.brightness)).toEqual(["normal", "normal"]);
    expect(run(1, [[bulb, bulb]]).branches[0].parts[0].brightness).toBe("dim");
    expect(run(1, [[bulb, bulb]]).total).toBeCloseTo(0.125);
  });
  it("bulbs in parallel each get the full voltage, and the currents add", () => {
    const s = run(1, [[bulb], [bulb]], "b1");
    expect(s.branches.map((b) => b.amps)).toEqual([0.25, 0.25]);
    expect(s.total).toBeCloseTo(0.5);
    expect(s.voltmeter).toBe(1.5);
    expect(s.branches.every((b) => b.parts[0].brightness === "normal")).toBe(true);
  });
  it("an open switch stops its own branch only — and has the whole voltage across it", () => {
    const s = run(2, [[bulb, sw(true)], [res, amm]], "p0.1");
    expect(s.branches[0].amps).toBe(0);
    expect(s.branches[0].parts[0].brightness).toBe("off");
    expect(s.branches[1].amps).toBeCloseTo(0.3);       // 3 V ÷ 10 Ω
    expect(s.total).toBeCloseTo(0.3);
    expect(s.voltmeter).toBe(3);
    expect(run(2, [[bulb, sw(false)]]).total).toBeCloseTo(0.5);
  });
  it("the main switch stops everything", () => {
    const s = run(3, [[bulb], [res]], "b0", false);
    expect(s.total).toBe(0);
    expect(s.voltmeter).toBe(0);
    expect(run(3, [[bulb]], "battery", false).voltmeter).toBe(4.5); // the battery still has its voltage
  });
  it("a branch with nothing to resist the current is a short circuit", () => {
    const s = run(2, [[bulb], [amm]]);
    expect(s.short).toBe(true);
    expect(s.total).toBe(0);
    expect(run(2, [[bulb], []]).short).toBe(false);    // an empty branch isn't wired in yet
    expect(run(2, [[bulb], [sw(true)]]).short).toBe(false);
    expect(run(2, [[bulb], [sw(false)]]).short).toBe(true);
  });
  it("more cells make a bulb brighter", () => {
    expect([1, 2, 3, 6].map((n) => run(n, [[bulb]]).branches[0].parts[0].brightness)).toEqual(["normal", "bright", "very bright", "very bright"]);
    expect(brightness(0)).toBe("off");
  });
  it("limits what can be added, and where the voltmeter can go", () => {
    expect(canAdd([bulb, bulb, bulb, bulb], "bulb")).toBe(false);
    expect(canAdd([sw(false)], "switch")).toBe(false);
    expect(canAdd([sw(false)], "bulb")).toBe(true);
    expect(voltTargets({ branches: [[bulb, res]] }).map((t) => t.id)).toEqual(["battery", "p0.0", "p0.1"]);
    expect(voltTargets({ branches: [[bulb], [res]] }).map((t) => t.id)).toEqual(["battery", "b0", "p0.0", "b1", "p1.0"]);
  });
  it("cleans what arrives", () => {
    const c = cleanCircuit({ on: true, cells: 99, branches: [[{ kind: "bulb" }, { kind: "bomb" }, { kind: "switch", open: 1 }], "junk", [], [], []], volt: "p9.9" });
    expect(c.cells).toBe(6);
    expect(c.branches).toEqual([[{ kind: "bulb" }, { kind: "switch", open: true }], [], []]);
    expect(c.volt).toBe("");
    expect(cleanCircuit({ branches: [[{ kind: "bulb" }]], volt: "p0.0" }).volt).toBe("p0.0");
    expect(cleanCircuit(null).branches).toEqual([[{ kind: "bulb" }]]);
  });
});

describe("label the diagram", () => {
  it("every diagram has labels with a name, a note and a place on the drawing", () => {
    expect(DIAGRAM_IDS).toEqual(["animal-cell", "plant-cell", "heart", "flower", "bunsen"]);
    for (const id of DIAGRAM_IDS) {
      const d = DIAGRAMS[id];
      expect(d.labels.length, id).toBeGreaterThanOrEqual(5);
      expect(new Set(d.labels.map((l) => l.name)).size, id).toBe(d.labels.length);
      for (const l of d.labels) {
        expect(l.note.length, `${id} ${l.name}`).toBeGreaterThan(10);
        expect(l.at[0] > 150 && l.at[0] < 450 && l.at[1] > 20 && l.at[1] < 350, `${id} ${l.name}`).toBe(true);
      }
      // Boxes on one side never overlap (at least 26 apart).
      const rows = labelRows(id);
      for (const side of ["l", "r"] as const) {
        const ys = d.labels.map((l, i) => (l.side === side ? rows[i] : null)).filter((y): y is number => y != null).sort((a, b) => a - b);
        for (let k = 1; k < ys.length; k++) expect(ys[k] - ys[k - 1], `${id} ${side}`).toBeGreaterThanOrEqual(26);
      }
    }
  });
  it("covers the names for a quiz and uncovers them one at a time, top to bottom", () => {
    let s = cleanLabels({ on: true, diagram: "bunsen", hide: true, shown: [] });
    expect(labelShown(s, 0)).toBe(false);
    const first = nextHidden(s)!;
    expect(DIAGRAMS.bunsen.labels[first].name).toBe("Outer flame"); // the highest on the drawing
    s = { ...s, shown: [first] };
    expect(labelShown(s, first)).toBe(true);
    expect(DIAGRAMS.bunsen.labels[nextHidden(s)!].name).toBe("Inner blue cone");
    expect(nextHidden({ ...s, shown: DIAGRAMS.bunsen.labels.map((_, i) => i) })).toBeNull();
    expect(nextHidden({ ...s, hide: false })).toBeNull();
    expect(labelShown({ hide: false, shown: [] }, 3)).toBe(true);
  });
  it("cleans what arrives", () => {
    const s = cleanLabels({ diagram: "dragon", shown: [0, 0, 99, -1, "2"], hide: 1 });
    expect(s.diagram).toBe("plant-cell");
    expect(s.shown).toEqual([0, 2]);
    expect(s.hide).toBe(true);
  });
});

describe("on the board", () => {
  it("the three science tools travel with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, ptable: { ...DEFAULT_WIDGETS.ptable, on: true, sel: 11 }, circuit: { ...DEFAULT_WIDGETS.circuit, cells: 99 }, labels: { ...DEFAULT_WIDGETS.labels, diagram: "heart" } });
    expect(w.ptable.on).toBe(true);
    expect(w.ptable.sel).toBe(11);
    expect(w.circuit.cells).toBeLessThanOrEqual(6);
    expect(w.labels.diagram).toBe("heart");
    const old = cleanWidgets({}); // a board saved before these tools existed
    expect(old.ptable.on).toBe(false);
    expect(old.circuit.branches.length).toBeGreaterThan(0);
    expect(old.labels.diagram).toBe("plant-cell");
  });
});
