import { describe, it, expect } from "vitest";
import {
  simplify, equivalent, compareFractions, addFractions,
  interiorSum, interiorAngle, exteriorAngle, sidesFromExterior,
  fallTime, fallSpeed, gFromDrop, timedDrop, PLANETS,
  tempRise, shcFrom, BLOCKS,
  universalColour, indicatorColour, phCategory, SUBSTANCES,
  heartRate, recoveryRate, recoveryTime, maxHeartRate,
} from "@/lib/lab/sims";

describe("fraction wall", () => {
  it("simplifies, compares and adds", () => {
    expect(simplify(6, 8)).toEqual([3, 4]);
    expect(equivalent([1, 2], [3, 6])).toBe(true);
    expect(equivalent([2, 3], [3, 4])).toBe(false);
    expect(compareFractions([2, 3], [3, 4])).toBe(-1);
    expect(compareFractions([5, 10], [1, 2])).toBe(0);
    expect(addFractions([1, 3], [1, 6])).toEqual([1, 2]);
  });
});

describe("angles in polygons", () => {
  it("matches the rules", () => {
    expect(interiorSum(3)).toBe(180);
    expect(interiorSum(6)).toBe(720);
    expect(interiorAngle(6)).toBe(120);
    expect(exteriorAngle(8)).toBe(45);
    for (let n = 3; n <= 12; n++) expect(interiorAngle(n) + exteriorAngle(n)).toBeCloseTo(180);
    expect(sidesFromExterior(40)).toBe(9);
    expect(sidesFromExterior(50)).toBeNull();
  });
});

describe("free fall", () => {
  it("t = √(2h/g) and g comes back out", () => {
    expect(fallTime(4.905, 9.81)).toBeCloseTo(1, 5);
    expect(fallSpeed(5, 9.81)).toBeCloseTo(9.9, 1);
    expect(gFromDrop(2, fallTime(2, 9.81))).toBeCloseTo(9.81, 5);
    const t = timedDrop(2, 9.81, 0.08, () => 1);
    expect(t).toBeCloseTo(fallTime(2, 9.81) + 0.08, 5);
    expect(fallTime(2, PLANETS[1].g)).toBeGreaterThan(fallTime(2, PLANETS[0].g));
  });
});

describe("specific heat capacity", () => {
  it("ΔT = Pt/(mc) and c comes back out", () => {
    const al = BLOCKS.find((b) => b.id === "aluminium")!;
    const rise = tempRise(50, 600, 1, al.c);
    expect(rise).toBeCloseTo(33.33, 1);
    expect(shcFrom(50, 600, 1, rise)).toBeCloseTo(900, 5);
    // Heat lost to the room makes the measured c too high.
    expect(shcFrom(50, 600, 1, tempRise(50, 600, 1, al.c, 0.2))).toBeGreaterThan(900);
    expect(tempRise(50, 600, 1, 4200)).toBeLessThan(rise);
  });
});

describe("pH & indicators", () => {
  it("gives the textbook colours", () => {
    expect(universalColour(1).name).toBe("red");
    expect(universalColour(7).name).toBe("green");
    expect(universalColour(13).name).toBe("purple");
    expect(indicatorColour("litmus", 3).name).toBe("red");
    expect(indicatorColour("litmus", 11).name).toBe("blue");
    expect(indicatorColour("phenolphthalein", 7).name).toBe("colourless");
    expect(indicatorColour("phenolphthalein", 12).name).toBe("pink");
    expect(indicatorColour("methyl-orange", 2).name).toBe("red");
    expect(indicatorColour("methyl-orange", 9).name).toBe("yellow");
    expect(phCategory(7)).toBe("neutral");
    expect(phCategory(13.8)).toBe("strong alkali");
    expect(SUBSTANCES.every((s, i) => i === 0 || s.ph >= SUBSTANCES[i - 1].ph)).toBe(true);
  });
});

describe("exercise & heart rate", () => {
  it("rises with intensity and recovers", () => {
    expect(maxHeartRate(14)).toBe(206);
    expect(heartRate(70, 14, 0, 300)).toBeCloseTo(70);
    const jog = heartRate(70, 14, 0.6, 300), sprint = heartRate(70, 14, 0.95, 300);
    expect(sprint).toBeGreaterThan(jog);
    expect(sprint).toBeLessThanOrEqual(maxHeartRate(14));
    expect(recoveryRate(170, 70, 600)).toBeLessThan(80);
    expect(recoveryTime(170, 70, 0.9)).toBeLessThan(recoveryTime(170, 70, 0.1));
    expect(recoveryTime(72, 70)).toBe(0);
  });
});
