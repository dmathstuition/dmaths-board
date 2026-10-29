import { describe, it, expect } from "vitest";
import {
  outcomes, theoretical, sample, relativeFrequencies,
  mean, median, modes, range, hypotenuse, isPythagoreanTriple,
  pendulumPeriod, pendulumAngle, current, power, bulbBrightness,
  titrationPH, equivalenceVolume, indicatorColor,
  photosynthesisRate, limitingFactor, submergedFraction, floats,
  type ProbMode,
} from "@/lib/lab/sims";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("probability", () => {
  const modesList: ProbMode[] = ["coin", "die", "twoDice", "spinner"];

  it("theoretical probabilities line up with outcomes and sum to 1", () => {
    for (const m of modesList) {
      expect(theoretical(m)).toHaveLength(outcomes(m).length);
      expect(sum(theoretical(m))).toBeCloseTo(1, 10);
    }
  });

  it("two dice: 7 is the most likely sum (6/36), 2 and 12 the least", () => {
    const p = theoretical("twoDice");
    expect(p[7 - 2]).toBeCloseTo(6 / 36);
    expect(p[0]).toBeCloseTo(1 / 36);
    expect(p[10]).toBeCloseTo(1 / 36);
  });

  it("samples land inside the outcome range", () => {
    for (const m of modesList) {
      for (const r of [0, 0.25, 0.5, 0.999999]) {
        const { index } = sample(m, () => r);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(outcomes(m).length);
      }
    }
  });

  it("two-dice sample reports faces that add up to the outcome", () => {
    const { index, faces } = sample("twoDice", () => 0.99);
    expect(faces).toEqual([6, 6]);
    expect(index + 2).toBe(12);
  });

  it("experimental frequency approaches theory with many trials (law of large numbers)", () => {
    let seed = 42;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[sample("die", rng).index]++;
    relativeFrequencies(counts).forEach((f) => expect(f).toBeCloseTo(1 / 6, 1));
  });

  it("relative frequencies are all zero before any trials", () => {
    expect(relativeFrequencies([0, 0])).toEqual([0, 0]);
  });
});

describe("statistics", () => {
  const data = [2, 3, 3, 5, 7, 10];
  it("mean, median, mode, range", () => {
    expect(mean(data)).toBe(5);
    expect(median(data)).toBe(4);
    expect(median([1, 9, 3])).toBe(3);
    expect(modes(data)).toEqual([3]);
    expect(modes([1, 2, 3])).toEqual([]);
    expect(modes([1, 1, 2, 2])).toEqual([1, 2]);
    expect(range(data)).toBe(8);
    expect(mean([])).toBe(0);
  });
});

describe("pythagoras", () => {
  it("3-4-5 is a triple; 2-3 is not", () => {
    expect(hypotenuse(3, 4)).toBe(5);
    expect(isPythagoreanTriple(3, 4)).toBe(true);
    expect(isPythagoreanTriple(5, 12)).toBe(true);
    expect(isPythagoreanTriple(2, 3)).toBe(false);
  });
});

describe("pendulum", () => {
  it("a 1 m pendulum on Earth swings in about 2.006 s", () => {
    expect(pendulumPeriod(1, 9.81)).toBeCloseTo(2.006, 3);
  });
  it("quadrupling the length doubles the period", () => {
    expect(pendulumPeriod(4, 9.81) / pendulumPeriod(1, 9.81)).toBeCloseTo(2, 10);
  });
  it("starts at the amplitude and is back after one period", () => {
    const T = pendulumPeriod(0.5, 9.81);
    expect(pendulumAngle(20, 0.5, 9.81, 0)).toBeCloseTo(20);
    expect(pendulumAngle(20, 0.5, 9.81, T / 2)).toBeCloseTo(-20);
    expect(pendulumAngle(20, 0.5, 9.81, T)).toBeCloseTo(20);
  });
});

describe("ohm's law", () => {
  it("I = V / R and P = V² / R", () => {
    expect(current(12, 4)).toBe(3);
    expect(power(12, 4)).toBe(36);
    expect(current(5, 0)).toBe(0);
  });
  it("brightness is clamped to 0–1 and grows with power", () => {
    expect(bulbBrightness(0)).toBe(0);
    expect(bulbBrightness(1000)).toBe(1);
    expect(bulbBrightness(5)).toBeGreaterThan(bulbBrightness(1));
  });
});

describe("titration", () => {
  it("starts acidic at pH 1 for 0.1 M HCl", () => {
    expect(titrationPH(25, 0.1, 0, 0.1)).toBeCloseTo(1, 5);
  });
  it("is neutral (pH 7) exactly at equivalence", () => {
    const veq = equivalenceVolume(25, 0.1, 0.1);
    expect(veq).toBe(25);
    expect(titrationPH(25, 0.1, veq, 0.1)).toBeCloseTo(7, 5);
  });
  it("jumps steeply around equivalence and ends basic", () => {
    expect(titrationPH(25, 0.1, 24.9, 0.1)).toBeLessThan(5);
    expect(titrationPH(25, 0.1, 25.1, 0.1)).toBeGreaterThan(9);
    expect(titrationPH(25, 0.1, 50, 0.1)).toBeGreaterThan(12);
  });
  it("indicators change colour on the right side of their range", () => {
    expect(indicatorColor("phenolphthalein", 4)).toBe(indicatorColor("phenolphthalein", 7));
    expect(indicatorColor("phenolphthalein", 11)).not.toBe(indicatorColor("phenolphthalein", 7));
    expect(indicatorColor("methylOrange", 2)).toMatch(/^rgba\(220, 38, 38/);
    expect(indicatorColor("methylOrange", 9)).toMatch(/^rgba\(250, 204, 21/);
  });
});

describe("photosynthesis", () => {
  it("no light means no bubbles", () => {
    expect(photosynthesisRate(0, 80, 25)).toBe(0);
  });
  it("more light helps while light is the limiting factor", () => {
    expect(limitingFactor(10, 90, 30)).toBe("light");
    expect(photosynthesisRate(40, 90, 30)).toBeGreaterThan(photosynthesisRate(10, 90, 30));
  });
  it("CO₂ limits when light is plentiful", () => {
    expect(limitingFactor(100, 5, 30)).toBe("CO₂");
  });
  it("enzymes denature when too hot", () => {
    expect(limitingFactor(100, 100, 50)).toBe("temperature");
    expect(photosynthesisRate(100, 100, 50)).toBeLessThan(photosynthesisRate(100, 100, 35));
  });
});

describe("density", () => {
  it("objects less dense than the liquid float, partly submerged", () => {
    expect(floats(0.92, 1.0)).toBe(true);
    expect(submergedFraction(0.92, 1.0)).toBeCloseTo(0.92);
  });
  it("denser objects sink (fully submerged)", () => {
    expect(floats(7.87, 1.0)).toBe(false);
    expect(submergedFraction(7.87, 1.0)).toBe(1);
  });
  it("iron floats on mercury", () => {
    expect(floats(7.87, 13.6)).toBe(true);
  });
});
