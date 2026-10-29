import { describe, it, expect } from "vitest";
import {
  quadRoots, quadValue, vertex, discriminant,
  unitPoint, quadrant, ASTC,
  translate, reflect, rotate, enlarge, polygonArea, type Pt,
  flightTime, projectileRange, maxHeight, projectilePos,
  SPRINGS, springExtension, beyondLimit,
  MEDIA, refractedAngle, criticalAngle,
  METALS, bubbleRate, safeToTest,
  finalGasVolume, rateConstant, gasVolumeAt,
  boyleVolume, charlesVolume, pressureAt, toKelvin,
  osmosisMassChange, ISOTONIC,
  ENZYMES, enzymeActivity, digestionTime,
  CELL_PARTS, partsOf,
} from "@/lib/lab/sims";

describe("quadratics", () => {
  it("roots make y zero and come out sorted", () => {
    for (const [a, b, c] of [[1, -5, 6], [2, 3, -2], [-1, 2, 8], [1, -6, 9]]) {
      const r = quadRoots(a, b, c);
      r.forEach((x) => expect(quadValue(a, b, c, x)).toBeCloseTo(0, 9));
      expect([...r].sort((m, n) => m - n)).toEqual(r);
    }
    expect(quadRoots(1, -6, 9)).toEqual([3]);
    expect(quadRoots(1, 0, 4)).toEqual([]);
    expect(quadRoots(0, 2, -4)).toEqual([2]);
  });
  it("discriminant and vertex", () => {
    expect(discriminant(1, -5, 6)).toBe(1);
    expect(vertex(1, -2, -3)).toEqual({ x: 1, y: -4 });
  });
});

describe("unit circle", () => {
  it("gives exact-ish points and quadrants", () => {
    expect(unitPoint(90)).toEqual({ x: 0, y: 1 });
    expect(unitPoint(30).y).toBeCloseTo(0.5, 12);
    expect(quadrant(45)).toBe(1);
    expect(quadrant(135)).toBe(2);
    expect(quadrant(200)).toBe(3);
    expect(quadrant(300)).toBe(4);
    expect(quadrant(180)).toBeNull();
    expect(ASTC[2]).toBe("Sin");
  });
  it("signs agree with ASTC", () => {
    for (let d = 1; d < 360; d += 7) {
      const q = quadrant(d);
      if (!q) continue;
      const { x, y } = unitPoint(d);
      const pos = { sin: y > 0, cos: x > 0, tan: y / x > 0 };
      if (q === 1) expect(pos).toEqual({ sin: true, cos: true, tan: true });
      if (q === 2) expect(pos).toEqual({ sin: true, cos: false, tan: false });
      if (q === 3) expect(pos).toEqual({ sin: false, cos: false, tan: true });
      if (q === 4) expect(pos).toEqual({ sin: false, cos: true, tan: false });
    }
  });
});

describe("transformations", () => {
  const tri: Pt[] = [[1, 1], [4, 1], [1, 3]];
  it("maps points correctly", () => {
    expect(translate(tri, -2, 3)).toEqual([[-1, 4], [2, 4], [-1, 6]]);
    expect(reflect([[2, 5]], "x-axis")).toEqual([[2, -5]]);
    expect(reflect([[2, 5]], "y-axis")).toEqual([[-2, 5]]);
    expect(reflect([[2, 5]], "y=x")).toEqual([[5, 2]]);
    expect(reflect([[2, 5]], "y=-x")).toEqual([[-5, -2]]);
    expect(rotate([[2, 1]], 90)).toEqual([[-1, 2]]);
    expect(rotate([[2, 1]], 180)).toEqual([[-2, -1]]);
    expect(rotate([[2, 1]], 270)).toEqual([[1, -2]]);
    expect(enlarge([[1, 2]], 3)).toEqual([[3, 6]]);
  });
  it("isometries keep area; enlargement scales it by k²", () => {
    const a = polygonArea(tri);
    expect(a).toBe(3);
    expect(polygonArea(reflect(tri, "y=x"))).toBe(a);
    expect(polygonArea(rotate(tri, 90))).toBe(a);
    expect(polygonArea(enlarge(tri, -2))).toBe(4 * a);
  });
});

describe("projectiles", () => {
  it("lands at the range after the flight time, with max range at 45°", () => {
    const v = 20, g = 9.81;
    for (const a of [15, 30, 45, 60, 75]) {
      const T = flightTime(v, a, g);
      expect(projectilePos(v, a, T, g).x).toBeCloseTo(projectileRange(v, a, g), 9);
      expect(projectilePos(v, a, T / 2, g).y).toBeCloseTo(maxHeight(v, a, g), 9);
    }
    expect(projectileRange(v, 30)).toBeCloseTo(projectileRange(v, 60), 9);
    expect(projectileRange(v, 45)).toBeGreaterThan(projectileRange(v, 40));
    expect(projectileRange(v, 45)).toBeGreaterThan(projectileRange(v, 50));
  });
});

describe("Hooke's law", () => {
  it("is proportional up to the limit, then stretches more per newton", () => {
    for (const s of SPRINGS) {
      expect(springExtension(s.limitN / 2, s.k, s.limitN)).toBeCloseTo(s.limitN / 2 / s.k, 12);
      const atLimit = springExtension(s.limitN, s.k, s.limitN);
      const beyond = springExtension(s.limitN + 1, s.k, s.limitN) - atLimit;
      expect(beyond).toBeGreaterThan(1 / s.k);
      expect(beyondLimit(s.limitN, s.limitN)).toBe(false);
      expect(beyondLimit(s.limitN + 1, s.limitN)).toBe(true);
      // the most the rig allows still fits the 44 cm ruler
      expect(springExtension(Math.round(s.limitN * 1.6), s.k, s.limitN)).toBeLessThan(0.44);
    }
  });
});

describe("refraction", () => {
  it("obeys Snell's law and total internal reflection", () => {
    const glass = MEDIA.find((m) => m.label === "Glass")!.n;
    const t2 = refractedAngle(1, glass, 40)!;
    expect(Math.sin((40 * Math.PI) / 180)).toBeCloseTo(glass * Math.sin((t2 * Math.PI) / 180), 9);
    expect(t2).toBeLessThan(40); // bends towards the normal entering glass
    const c = criticalAngle(glass, 1)!;
    expect(c).toBeCloseTo(41.81, 1);
    expect(refractedAngle(glass, 1, c - 1)).not.toBeNull();
    expect(refractedAngle(glass, 1, c + 1)).toBeNull();
    expect(criticalAngle(1, glass)).toBeNull();
    expect(refractedAngle(1.33, 1.33, 25)).toBeCloseTo(25, 9);
  });
});

describe("reactivity", () => {
  it("is ordered most → least reactive and unsafe tests are flagged", () => {
    for (let i = 1; i < METALS.length; i++) expect(METALS[i].acid).toBeLessThanOrEqual(METALS[i - 1].acid);
    expect(bubbleRate(METALS.find((m) => m.symbol === "Cu")!, "acid")).toBe(0);
    expect(safeToTest(METALS[0], "acid")).toBe(false);
    expect(safeToTest(METALS[0], "water")).toBe(true);
    expect(safeToTest(METALS.find((m) => m.symbol === "Mg")!, "acid")).toBe(true);
  });
});

describe("rates of reaction", () => {
  it("final volume follows the limiting reagent and fits the syringe", () => {
    expect(finalGasVolume(0.25, 2)).toBeCloseTo(60, 9);   // marble limiting
    expect(finalGasVolume(0.5, 0.5)).toBeCloseTo(60, 9);  // acid limiting
    expect(finalGasVolume(0.5, 2)).toBeLessThanOrEqual(120);
  });
  it("rate rises with concentration, temperature and surface area", () => {
    expect(rateConstant(2, 20, "chips")).toBeCloseTo(2 * rateConstant(1, 20, "chips"), 12);
    expect(rateConstant(1, 30, "chips")).toBeCloseTo(2 * rateConstant(1, 20, "chips"), 12);
    expect(rateConstant(1, 20, "powder")).toBeGreaterThan(rateConstant(1, 20, "small"));
    expect(gasVolumeAt(0, 60, 0.05)).toBe(0);
    expect(gasVolumeAt(1e6, 60, 0.05)).toBeCloseTo(60, 9);
  });
});

describe("gas laws", () => {
  it("keeps pV, V/T and p/T constant", () => {
    expect(100 * 50).toBeCloseTo(200 * boyleVolume(200, 100, 50), 9);
    expect(charlesVolume(600, 300, 50)).toBe(100);
    expect(pressureAt(150, 300, 100)).toBe(50);
    expect(toKelvin(-273)).toBe(0);
  });
});

describe("osmosis", () => {
  it("crosses zero at the isotonic point and levels off", () => {
    expect(osmosisMassChange(ISOTONIC)).toBeCloseTo(0, 12);
    expect(osmosisMassChange(0)).toBeGreaterThan(0);
    expect(osmosisMassChange(0.8)).toBeLessThan(0);
    expect(osmosisMassChange(1)).toBe(osmosisMassChange(1.5));
  });
});

describe("enzymes", () => {
  it("peaks at the optimum and denatures when hot", () => {
    for (const e of ENZYMES) {
      const best = enzymeActivity(e.optimumT, e.optimumPH, e.optimumPH, e.optimumT);
      expect(best).toBeCloseTo(1, 12);
      expect(enzymeActivity(20, e.optimumPH, e.optimumPH)).toBeLessThan(best);
      expect(enzymeActivity(60, e.optimumPH, e.optimumPH)).toBeLessThan(0.05);
      expect(enzymeActivity(e.optimumT, e.optimumPH + 4, e.optimumPH)).toBeLessThan(0.1);
    }
    expect(digestionTime(1)).toBe(1);
    expect(digestionTime(0.01)).toBe(20);
  });
});

describe("cells", () => {
  it("plant cells have three extra parts", () => {
    const plant = partsOf("plant").map((p) => p.id), animal = partsOf("animal").map((p) => p.id);
    expect(plant.filter((id) => !animal.includes(id)).sort()).toEqual(["chloroplasts", "vacuole", "wall"]);
    expect(animal.every((id) => plant.includes(id))).toBe(true);
    expect(new Set(CELL_PARTS.map((p) => p.id)).size).toBe(CELL_PARTS.length);
  });
});
