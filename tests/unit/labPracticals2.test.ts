import { describe, it, expect } from "vitest";
import {
  momentNcm, netMoment, balanced, beamTilt, balancingDistance,
  imageDistance, magnification, imageNature,
  heatingStages, heatingState, WATER,
  wavelength, wavePeriod, waveY, WAVE_MEDIA,
  chargeC, copperDepositedG,
  DYES, INKS, rf, spotPositions,
  FLAME_IONS, flameColour,
  FOODS, FOOD_TESTS, foodTestResult,
  transpirationRate, bubbleDistanceMm,
  punnett, crossRatios,
  centralAngle, inscribedAngle, onMajorArc,
  intersection,
  solidVolume, solidSurface,
} from "@/lib/lab/sims";

describe("moments", () => {
  it("balances when clockwise = anticlockwise", () => {
    const loads = [{ massG: 100, distCm: 30, side: "left" as const }, { massG: 150, distCm: 20, side: "right" as const }];
    expect(balanced(loads)).toBe(true);
    expect(beamTilt(loads)).toBe(0);
    expect(momentNcm(100, 30)).toBeCloseTo(29.43, 2);
  });
  it("tilts towards the heavier moment and caps the angle", () => {
    const right = [{ massG: 500, distCm: 40, side: "right" as const }];
    expect(netMoment(right)).toBeGreaterThan(0);
    expect(beamTilt(right)).toBe(14);
    expect(beamTilt([{ massG: 500, distCm: 40, side: "left" as const }])).toBe(-14);
  });
  it("finds the balancing distance", () => {
    expect(balancingDistance(momentNcm(200, 25), 100)).toBeCloseTo(50, 6);
  });
});

describe("convex lens", () => {
  it("obeys 1/f = 1/u + 1/v", () => {
    for (const [u, f] of [[30, 10], [15, 10], [20, 10], [5, 10]]) {
      const v = imageDistance(u, f)!;
      expect(1 / u + 1 / v).toBeCloseTo(1 / f, 9);
    }
  });
  it("describes the image", () => {
    expect(imageNature(20, 10)).toEqual({ real: true, inverted: true, size: "same size" });
    expect(imageNature(30, 10)?.size).toBe("diminished");
    expect(imageNature(15, 10)?.size).toBe("magnified");
    const virt = imageNature(5, 10)!;
    expect(virt.real).toBe(false);
    expect(virt.inverted).toBe(false);
    expect(magnification(5, 10)).toBeCloseTo(-2, 9);
    expect(imageDistance(10, 10)).toBeNull();
  });
});

describe("heating curve", () => {
  it("passes through each phase at the right energy", () => {
    const m = 0.5, s = heatingStages(m, -20);
    expect(s.warmIce).toBeCloseTo(0.5 * WATER.cIce * 20);
    expect(heatingState(0, m).tempC).toBe(-20);
    expect(heatingState(s.warmIce + 1000, m).phase).toBe("melting");
    expect(heatingState(s.warmIce + 1000, m).tempC).toBe(0);
    expect(heatingState((s.melted + s.toBoil) / 2, m).tempC).toBeCloseTo(50, 6);
    expect(heatingState(s.toBoil + 10, m).phase).toBe("boiling");
    expect(heatingState(s.boiledAway + 2010 * 0.5 * 10, m).tempC).toBeCloseTo(110, 6);
  });
  it("temperature never decreases as energy is added", () => {
    let last = -Infinity;
    for (let e = 0; e < 1_600_000; e += 5000) {
      const t = heatingState(e, 0.5).tempC;
      expect(t).toBeGreaterThanOrEqual(last - 1e-9);
      last = t;
    }
  });
});

describe("waves", () => {
  it("v = fλ", () => {
    for (const m of WAVE_MEDIA) expect(wavelength(m.speed, 5) * 5).toBeCloseTo(m.speed, 9);
    expect(wavePeriod(4)).toBe(0.25);
    expect(waveY(0, 0, 2, 4, 1)).toBeCloseTo(0, 9);
    expect(waveY(1, 0, 2, 4, 1)).toBeCloseTo(2, 9); // λ = 4, so x = 1 is a crest
  });
});

describe("electrolysis", () => {
  it("deposits copper in proportion to charge", () => {
    expect(chargeC(2, 600)).toBe(1200);
    expect(copperDepositedG(1, 2 * 96_500)).toBeCloseTo(63.5, 6);
    expect(copperDepositedG(2, 600)).toBeCloseTo(2 * copperDepositedG(1, 600), 9);
  });
});

describe("chromatography", () => {
  it("spots move a fixed fraction of the solvent front", () => {
    for (const d of DYES) {
      const [p] = spotPositions([d.id], 8);
      expect(rf(p.cm, 8)).toBeCloseTo(d.rf, 9);
    }
    expect(INKS.every((i) => i.dyes.length > 0)).toBe(true);
    expect(rf(1, 0)).toBe(0);
  });
});

describe("flame tests", () => {
  it("each ion has a unique colour", () => {
    expect(new Set(FLAME_IONS.map((f) => f.colourName)).size).toBe(FLAME_IONS.length);
    expect(flameColour("Na⁺")).toBe("golden yellow");
    expect(flameColour("Zz")).toBeNull();
  });
});

describe("food tests", () => {
  it("Benedict's needs heating; water is negative for all", () => {
    expect(foodTestResult("glucose", "benedicts", false)).toBe(false);
    expect(foodTestResult("glucose", "benedicts", true)).toBe(true);
    for (const t of FOOD_TESTS) expect(foodTestResult("water", t.id, true)).toBe(false);
    expect(foodTestResult("bread", "iodine", false)).toBe(true);
    expect(FOODS.length).toBeGreaterThan(5);
  });
});

describe("transpiration", () => {
  it("responds in the right direction to each factor", () => {
    const base = transpirationRate(60, 1, 60, 25);
    expect(transpirationRate(100, 1, 60, 25)).toBeGreaterThan(base);
    expect(transpirationRate(60, 3, 60, 25)).toBeGreaterThan(base);
    expect(transpirationRate(60, 1, 90, 25)).toBeLessThan(base);
    expect(transpirationRate(60, 1, 60, 35)).toBeGreaterThan(base);
    expect(bubbleDistanceMm(base, 0)).toBe(0);
  });
});

describe("genetics", () => {
  it("gives the classic ratios", () => {
    expect(crossRatios("Aa", "Aa")).toEqual({ AA: 1, Aa: 2, aa: 1, dominant: 3, recessive: 1 });
    expect(crossRatios("AA", "aa")).toMatchObject({ Aa: 4, dominant: 4 });
    expect(crossRatios("Aa", "aa")).toMatchObject({ Aa: 2, aa: 2 });
    expect(punnett("Aa", "Aa").flat()).toContain("Aa");
    expect(punnett("aa", "Aa").flat().every((g) => g === "Aa" || g === "aa")).toBe(true);
  });
});

describe("circle theorems", () => {
  it("angle at the centre is twice the angle at the circumference", () => {
    for (const [a, b, p] of [[200, 340, 90], [180, 300, 60], [10, 130, 250]]) {
      expect(onMajorArc(a, b, p)).toBe(true);
      expect(centralAngle(a, b)).toBeCloseTo(2 * inscribedAngle(a, b, p), 6);
    }
  });
  it("angle in a semicircle is 90°", () => {
    expect(inscribedAngle(0, 180, 77)).toBeCloseTo(90, 6);
  });
  it("on the minor arc the angle is 180° minus half the centre angle", () => {
    expect(onMajorArc(200, 340, 270)).toBe(false);
    expect(inscribedAngle(200, 340, 270)).toBeCloseTo(180 - centralAngle(200, 340) / 2, 6);
  });
});

describe("straight lines", () => {
  it("solves, and spots parallel and identical lines", () => {
    expect(intersection(2, 1, -1, 4)).toEqual({ x: 1, y: 3 });
    expect(intersection(2, 1, 2, 5)).toBe("parallel");
    expect(intersection(2, 1, 2, 1)).toBe("same");
  });
});

describe("mensuration", () => {
  it("uses the standard formulas", () => {
    expect(solidVolume("cylinder", 7, 10)).toBeCloseTo(1539.38, 2);
    expect(solidVolume("cone", 3, 4)).toBeCloseTo(37.70, 2);
    expect(solidSurface("cone", 3, 4)).toBeCloseTo(Math.PI * 3 * 8, 9);
    expect(solidVolume("sphere", 3, 0)).toBeCloseTo(113.10, 2);
    expect(solidVolume("cuboid", 2, 3, 4)).toBe(24);
    expect(solidSurface("cuboid", 2, 3, 4)).toBe(52);
    expect(solidVolume("cone", 3, 4) * 3).toBeCloseTo(solidVolume("cylinder", 3, 4), 9);
  });
});
