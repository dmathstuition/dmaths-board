import { describe, expect, it } from "vitest";
import { areaUnder, compassTurn, countRate, criticalAngle, current, firstResonance, gradientAt, gratingAngle, heatWater, image, indicatorColour, minDeviation, money, observe, readsRight, refract, scaleValue, shape, solid, stats, stretch, throwsOf, vesselFill, type Dims } from "@/lib/lab/room/engines";
import { ALL_ITEMS, MISSING, ROOMS, SECTIONS } from "@/lib/lab/room/inventory";
import { NEEDS, checkPlan, riskAssessment } from "@/lib/lab/room/plans";
import { LAB } from "@/lib/lab/catalog";
import { seeded } from "@/lib/lab/bench/run";

const d = (o: Partial<Dims>): Dims => ({ a: 4, b: 3, c: 5, h: 2, r: 1, n: 6, angle: 90, ...o });

describe("the lab room's inventory", () => {
  it("has every room, every section filled, and no gaps", () => {
    expect(MISSING).toEqual([]);
    for (const s of ["physics", "chemistry", "biology", "maths"] as const) {
      expect(ROOMS[s].length).toBeGreaterThan(150);
      for (const sec of SECTIONS[s]) expect(ROOMS[s].some((x) => x.sections.includes(sec)), `${s} / ${sec}`).toBe(true);
    }
    expect(new Set(ALL_ITEMS.map((x) => x.id)).size).toBe(ALL_ITEMS.length);
  });
  it("describes how to use every piece, safely", () => {
    for (const it of ALL_ITEMS) {
      expect(it.about.length, it.id).toBeGreaterThan(5);
      expect(it.use.length, it.id).toBeGreaterThan(5);
      expect(it.safety.length, it.id).toBeGreaterThan(5);
    }
  });
  it("knows the apparatus for every bench practical", () => {
    for (const e of LAB.filter((x) => x.practical)) {
      const n = NEEDS[e.slug];
      expect(n, e.slug).toBeTruthy();
      expect(n.subject).toBe(e.subject);
      for (const name of n.needs) expect(ROOMS[n.subject].some((x) => x.name === name), `${e.slug}: ${name}`).toBe(true);
    }
  });
  it("checks a plan against a practical, and makes a risk assessment", () => {
    const id = (n: string) => ROOMS.chemistry.find((x) => x.name === n)!.id;
    const c = checkPlan("chemistry", [id("Burette"), id("Conical flask"), id("Hydrochloric acid")], "titration")!;
    expect(c.ready).toBe(false);
    expect(c.missing).toContain("Volumetric pipette");
    expect(checkPlan("chemistry", NEEDS.titration.needs.map(id), "titration")!.ready).toBe(true);
    const r = riskAssessment([ROOMS.chemistry.find((x) => x.name === "Hydrochloric acid")!]);
    expect(r.rows.map((x) => x.hazard)).toContain("corrosive");
    expect(r.missingSafety).toContain("Safety goggles");
  });
});

describe("apparatus behave like the real thing", () => {
  it("scales give readings on their divisions", () => {
    for (let k = 1; k < 30; k++) { const v = scaleValue({ min: 0, max: 50, lc: 0.1 }, seeded(k)); expect(Math.abs(v * 10 - Math.round(v * 10))).toBeLessThan(1e-9); }
    expect(readsRight(23.45, 23.4, 0.1)).toBe(true);
    expect(readsRight(23.6, 23.4, 0.1)).toBe(false);
    expect(vesselFill(250, 300, 12.5)).toMatchObject({ inside: 250, overflow: 50 });
  });
  it("lenses, mirrors and glass", () => {
    const i = image(10, 30);
    expect(i.v).toBeCloseTo(15); expect(i.m).toBeCloseTo(-0.5); expect(i.nature).toMatch(/Real, inverted, diminished/);
    expect(image(10, 5).nature).toMatch(/Virtual, upright, magnified/);
    expect(image(-10, 20).real).toBe(false);
    expect(refract(30, 1.5)).toBeCloseTo(19.47, 1);
    expect(criticalAngle(1.5)).toBeCloseTo(41.8, 1);
    expect(minDeviation(1.5)).toBeCloseTo(37.2, 1);
    expect(gratingAngle(300, 600)).toBeCloseTo(10.37, 1);
    expect(gratingAngle(3000, 600)).toBeNull();
  });
  it("circuits", () => {
    expect(current("resistor", 10, { V: 5 }).I).toBeCloseTo(0.5);
    expect(current("diode", 0, { V: -2 }).I).toBe(0);
    expect(current("led", 0, { V: 1 }).I).toBe(0);
    const hot = current("thermistor", 10_000, { V: 5, T: 80 }).R!, cold = current("thermistor", 10_000, { V: 5, T: 10 }).R!;
    expect(hot).toBeLessThan(cold);
    expect(current("ldr", 0, { V: 5, lux: 1000 }).R!).toBeLessThan(current("ldr", 0, { V: 5, lux: 10 }).R!);
    expect(current("fuse", 3, { V: 12 }).note).toMatch(/Blown/);
    const lamp = (V: number) => current("lamp", 0, { V }).R!;
    expect(lamp(6)).toBeGreaterThan(lamp(1)); // a filament's resistance rises
  });
  it("heat, springs, magnets, radiation and sound", () => {
    expect(heatWater(1000, 60, 1, 20, 1).T).toBeCloseTo(34.3, 1);
    expect(heatWater(2000, 600, 0.5).T).toBe(100);
    expect(stretch(25, 6, 5).x).toBeCloseTo(0.2);
    expect(stretch(25, 6, 8).past).toBe(true);
    expect(compassTurn(10, 5)).toBeGreaterThan(compassTurn(10, 20));
    expect(countRate("alpha", "paper", 3, seeded(1), 100).corrected).toBeLessThan(0.5);
    expect(countRate("beta", "none", 3, seeded(1), 100).corrected).toBeGreaterThan(100);
    expect(countRate("beta", "aluminium", 3, seeded(1), 100).corrected).toBeLessThan(0.5);
    expect(firstResonance(512)).toBeCloseTo(0.158, 2);
  });
  it("chemistry tests give the textbook observations", () => {
    const R = (n: string) => ROOMS.chemistry.find((x) => x.name === n)!.spec as any;
    expect(observe(R("Copper(II) sulfate"), "sodium hydroxide (aq)")).toMatch(/light blue precipitate/);
    expect(observe(R("Iron(III) chloride"), "sodium hydroxide (aq)")).toMatch(/red-brown/);
    expect(observe(R("Zinc sulfate"), "sodium hydroxide (aq)")).toMatch(/dissolves in excess/);
    expect(observe(R("Sodium chloride"), "silver nitrate (aq)")).toMatch(/white precipitate/);
    expect(observe(R("Magnesium sulfate"), "barium chloride (aq)")).toMatch(/white precipitate/);
    expect(observe(R("Calcium carbonate"), "dilute hydrochloric acid")).toMatch(/carbon dioxide/);
    expect(observe(R("Potassium chloride"), "flame test")).toMatch(/lilac/);
    expect(observe(R("Hydrogen"), "lighted splint")).toMatch(/squeaky pop/);
    expect(observe(R("Oxygen"), "glowing splint")).toMatch(/relights/);
    expect(observe(R("Carbon dioxide"), "limewater")).toMatch(/milky/);
    expect(observe(R("Ammonia gas"), "damp litmus paper")).toMatch(/blue/);
    expect(observe(R("Ethene"), "bromine water")).toMatch(/Decolourised/);
    expect(indicatorColour("phenolphthalein", 3).name).toBe("colourless");
    expect(indicatorColour("phenolphthalein", 12).name).toMatch(/pink/);
    expect(indicatorColour("methyl-orange", 2).name).toBe("red");
    expect(indicatorColour("methyl-orange", 9).name).toBe("yellow");
    expect(indicatorColour("universal", 7).name).toBe("green");
  });
  it("maths: shapes, solids, probability, money, graphs, statistics", () => {
    expect(shape("square", d({ a: 4 }))).toMatchObject({ area: 16, perimeter: 16 });
    expect(shape("scalene", d({ a: 1, b: 2, c: 5 })).note).toMatch(/can't make a triangle/);
    expect(shape("polygon", d({ n: 6, a: 2 })).angleSum).toBe(720);
    for (const k of ["cube", "cuboid", "square-pyramid", "tri-prism", "octahedron", "dodecahedron", "icosahedron", "tetrahedron"] as const) { const s = solid(k, d({})); expect(s.F + s.Vx - s.E, k).toBe(2); }
    expect(solid("sphere", d({ r: 3 })).V).toBeCloseTo(113.1, 1);
    const t = throwsOf("dice", 6, 600, seeded(4));
    expect(t.tally.reduce((a, b) => a + b, 0)).toBe(600);
    expect(money("compound", 10000, 10, 2).result).toBeCloseTo(12100);
    expect(money("simple", 10000, 5, 3).result).toBeCloseTo(11500);
    expect(gradientAt((x) => x * x, 3)).toBeCloseTo(6, 4);
    expect(areaUnder((x) => x * x, 0, 3)).toBeCloseTo(9, 6);
    expect(stats([2, 4, 4, 5, 7, 9])).toMatchObject({ mean: 31 / 6, median: 4.5, modes: [4], range: 7 });
  });
});
