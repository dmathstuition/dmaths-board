import { describe, expect, it } from "vitest";
import {
  CURVE, DEFAULT_FORCES, DEFAULT_PARTICLES, DEFAULT_PH, INDICATORS, MATTER_FACTS, PH_ITEMS, SCENES, SUBSTANCES, cleanForces, cleanParticles, cleanPh, curvePoint, energyAt, indicatorColour, itemsNear, matterAt,
  motionText, phClass, resultant, sceneState, strengthText, substance, tempRange, workingText,
} from "@/lib/sciencePlus";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

describe("particle model", () => {
  const water = substance("water");
  it("knows the state at any temperature", () => {
    expect([-20, 0, 25, 100, 130].map((t) => matterAt(water, t))).toEqual(["solid", "melting", "liquid", "boiling", "gas"]);
    expect(matterAt(substance("oxygen"), 20)).toBe("gas");
    expect(matterAt(substance("iron"), 20)).toBe("solid");
    expect(matterAt(substance("wax"), 80)).toBe("liquid");
    expect(substance("nonsense").id).toBe("water");
  });
  it("gives every substance a sensible thermometer", () => {
    for (const s of SUBSTANCES) {
      const [lo, hi] = tempRange(s);
      expect(s.melt).toBeLessThan(s.boil);
      expect(lo).toBeLessThan(s.melt); expect(hi).toBeGreaterThan(s.boil); expect(lo).toBeGreaterThanOrEqual(-273);
      expect(energyAt(s, lo)).toBe(0); expect(energyAt(s, hi)).toBe(1);
      expect(matterAt(s, lo)).toBe("solid"); expect(matterAt(s, hi)).toBe("gas");
    }
    expect(tempRange(water)).toEqual([-50, 150]);
  });
  it("puts the dot on the heating curve, flat while it melts and boils", () => {
    expect(curvePoint(water, -50)).toEqual([0, 0]);
    expect(curvePoint(water, 0)).toEqual([0.335, 0.3]);
    expect(curvePoint(water, 100)).toEqual([0.71, 0.7]);
    expect(curvePoint(water, 150)).toEqual([1, 1]);
    const [x, y] = curvePoint(water, 50);
    expect(x).toBeCloseTo(0.52); expect(y).toBeCloseTo(0.5);
    expect(CURVE[1][1]).toBe(CURVE[2][1]); expect(CURVE[3][1]).toBe(CURVE[4][1]); // the two flat parts
    expect(Object.values(MATTER_FACTS).every((f) => f.length === 3)).toBe(true);
  });
  it("cleans what arrives", () => {
    expect(cleanParticles({ on: 1, sub: "iron", temp: 99999 })).toMatchObject({ on: true, sub: "iron", temp: tempRange(substance("iron"))[1] });
    expect(cleanParticles({ sub: "lava", temp: "x" })).toMatchObject({ sub: "water", temp: -25 });
    expect(matterAt(water, DEFAULT_PARTICLES.temp)).toBe("solid");
  });
});

describe("pH scale", () => {
  it("colours each indicator correctly", () => {
    expect([1, 4, 6, 7, 9, 13].map((p) => indicatorColour("universal", p).name)).toEqual(["red", "orange", "yellow", "green", "blue", "purple"]);
    expect([3, 7, 11].map((p) => indicatorColour("litmus", p).name)).toEqual(["red", "purple", "blue"]);
    expect([7, 8, 9, 13].map((p) => indicatorColour("phenolphthalein", p).name)).toEqual(["colourless", "colourless", "pink", "pink"]);
    expect([2, 4, 7].map((p) => indicatorColour("methyl-orange", p).name)).toEqual(["red", "orange", "yellow"]);
    for (const ind of INDICATORS) for (let p = 0; p <= 14; p += 0.5) expect(indicatorColour(ind, p).colour).toMatch(/^#[0-9A-F]{6}$/);
  });
  it("sorts acids, alkalis and neutral", () => {
    expect([1, 2.5, 3, 6.5, 7, 7.5, 11, 11.5, 14].map(phClass)).toEqual(["Strong acid", "Strong acid", "Weak acid", "Weak acid", "Neutral", "Weak alkali", "Weak alkali", "Strong alkali", "Strong alkali"]);
    expect(strengthText(4)).toBe("Each step on the scale is ×10, so pH 4 is 1,000 times more acidic than pure water.");
    expect(strengthText(9)).toContain("100 times more alkaline");
    expect(strengthText(7)).toContain("Neutral");
    expect(strengthText(3.5)).toBe("The lower the pH, the stronger the acid.");
  });
  it("has everyday examples all along the scale", () => {
    expect(new Set(PH_ITEMS.map((i) => i.name)).size).toBe(PH_ITEMS.length);
    for (const i of PH_ITEMS) { expect(i.ph).toBeGreaterThanOrEqual(0); expect(i.ph).toBeLessThanOrEqual(14); expect(i.ph * 2).toBe(Math.round(i.ph * 2)); }
    expect(itemsNear(2).map((i) => i.name)).toEqual(["Stomach acid", "Lemon juice"]);
    expect(itemsNear(7).map((i) => i.name)).toContain("Pure water");
  });
  it("cleans what arrives", () => {
    expect(cleanPh({ on: 1, ph: 3.24, ind: "cabbage", hide: 1, item: "Vinegar" })).toMatchObject({ on: true, ph: 3, ind: "universal", hide: true, item: "Vinegar" });
    expect(cleanPh({ ph: 99, item: "Vinegar" })).toMatchObject({ ph: 14, item: "" }); // vinegar isn't pH 14
    expect(cleanPh(null)).toEqual(DEFAULT_PH);
  });
});

describe("forces", () => {
  const F = (f: Partial<typeof DEFAULT_FORCES>) => ({ ...DEFAULT_FORCES, ...f });
  it("finds the resultant along one line", () => {
    const r = resultant(F({ up: 50, down: 50, right: 30, left: 10, mass: 5 }));
    expect(r).toMatchObject({ x: 20, y: 0, size: 20, balanced: false, where: "to the right", accel: 4 });
    expect(motionText(F({ up: 50, down: 50, right: 30, left: 10, mass: 5 }))).toBe("The forces are unbalanced. Resultant force = 20 N to the right. It accelerates that way: a = F ÷ m = 20 ÷ 5 = 4 m/s².");
    expect(resultant(F({ up: 300, down: 800, right: 0, left: 0, mass: 80 }))).toMatchObject({ size: 500, where: "downwards", accel: 6.25 });
  });
  it("knows balanced forces mean no change in motion", () => {
    const f = F({ up: 50, down: 50, right: 30, left: 30 });
    expect(resultant(f)).toMatchObject({ size: 0, balanced: true, accel: 0 });
    expect(motionText(f)).toContain("balanced: the resultant force is 0 N");
    expect(workingText(f)).toEqual(["Across: 30 − 30 = 0 N (balanced)", "Up and down: 50 − 50 = 0 N (balanced)"]);
    expect(workingText(F({ up: 0, down: 0, left: 0, right: 0 }))).toEqual(["No forces are acting."]);
  });
  it("combines forces at right angles", () => {
    const r = resultant(F({ up: 40, down: 0, right: 30, left: 0, mass: 10 }));
    expect(r.size).toBe(50);
    expect(r.where).toBe("upwards and to the right, 53° from the horizontal");
    expect(r.accel).toBe(5);
  });
  it("every scene starts sensibly", () => {
    for (const s of SCENES) {
      expect(Object.values(s.f).every((n) => n % s.by === 0), s.id).toBe(true);
      expect(cleanForces({ ...sceneState(s.id) })).toMatchObject({ scene: s.id, mass: s.mass, ...s.f });
    }
    expect(resultant({ ...sceneState("tug") }).balanced).toBe(true);
    expect(resultant({ ...sceneState("rocket") })).toMatchObject({ where: "upwards", accel: 5 });
  });
  it("cleans what arrives", () => {
    expect(cleanForces({ on: 1, scene: "ufo", up: -5, down: 1e9, mass: 0, show: false })).toMatchObject({ on: true, scene: "box", up: 0, down: 20000, mass: 1, show: false });
  });
});

describe("on the board", () => {
  it("the three tools travel with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, particles: { ...DEFAULT_WIDGETS.particles, on: true, temp: 60 }, ph: { ...DEFAULT_WIDGETS.ph, ph: 2 }, forces: { ...DEFAULT_WIDGETS.forces, right: 55 } });
    expect(w.particles).toMatchObject({ on: true, temp: 60 });
    expect([w.ph.ph, w.forces.right]).toEqual([2, 55]);
    expect(cleanWidgets(undefined)).toEqual(DEFAULT_WIDGETS);
  });
});
