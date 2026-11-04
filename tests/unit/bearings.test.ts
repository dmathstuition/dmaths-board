import { describe, expect, it } from "vitest";
import { PRESETS, backBearing, backBearingLine, fromOnePoint, journey, pad3, parts, r1 } from "@/lib/bearings";

// Every answer here is from the lesson slides (Trigonometry, Bearings & Distance).
describe("bearings and distance, as on the lesson slides", () => {
  it("writes bearings with three figures and finds back bearings", () => {
    expect(pad3(45)).toBe("045");
    expect(pad3(7)).toBe("007");
    expect(pad3(360)).toBe("000");
    expect([115, 308, 90, 70, 250, 65, 305, 215].map((b) => pad3(backBearing(b)))).toEqual(["295", "128", "270", "250", "070", "245", "125", "035"]);
    expect(backBearingLine(65)).toBe("065° + 180° = 245°");
    expect(backBearingLine(305)).toBe("305° − 180° = 125°");
  });

  it("splits a journey into north and east parts (slide 17, Activity B Q3)", () => {
    const a = parts(50, 40);
    expect([a.ns, r1(a.nsLen), a.ew, r1(a.ewLen)]).toEqual(["North", 38.3, "East", 32.1]);
    expect(a.lines[0]).toBe("North = 50 cos 40° = 38.3");
    const b = parts(20, 130);
    expect([b.ns, r1(b.nsLen), b.ew, r1(b.ewLen), b.alpha]).toEqual(["South", 12.9, "East", 15.3, 50]);
    expect(parts(10, 250).ns + parts(10, 250).ew).toBe("SouthWest");
    expect(parts(10, 300).ns + parts(10, 300).ew).toBe("NorthWest");
  });

  it("Example 5: a right angle at Q → Pythagoras, 19.2 km on 101°", () => {
    const s = journey(12, 50, 15, 140, ["P", "Q", "R"]);
    expect(r1(s.length)).toBe(19.2);
    expect(pad3(s.bearing)).toBe("101");
    expect(s.steps).toEqual([
      "Back bearing of P from Q = 050° + 180° = 230°",
      "∠PQR = 230° − 140° = 90°",
      "∠PQR = 90°, so use Pythagoras: PR² = 12² + 15² = 369",
      "PR = 19.2 km",
      "tan P = 15 ÷ 12, so P = 51.3°",
      "Bearing of R from P = 050° + 51.3° = 101.3° ≈ 101°",
    ]);
  });

  it("Example 6: cosine rule, HB = 10.8 km on 073°", () => {
    const s = journey(8, 40, 6, 120);
    expect(r1(s.length)).toBe(10.8);
    expect(pad3(s.bearing)).toBe("073");
    expect(s.steps[1]).toBe("∠HAB = 220° − 120° = 100°");
    expect(s.steps[2]).toMatch(/^Cosine rule: HB² = 8² \+ 6² − 2\(8\)\(6\) cos 100° = 116\.67$/);
    expect(s.steps[4]).toMatch(/H = 33\.2°$/);
    expect(s.steps[5]).toBe("Bearing of B from H = 040° + 33.2° = 073.2° ≈ 073°");
  });

  it("Activity B Q5 and Homework 2", () => {
    const q5 = journey(15, 70, 9, 200, ["X", "Y", "Z"]);
    expect([r1(q5.length), pad3(q5.bearing)]).toEqual([11.5, "107"]);
    expect(q5.steps[1]).toBe("∠XYZ = 250° − 200° = 50°");
    const hw = journey(25, 65, 18, 130, ["P", "Q", "R"]);
    expect([r1(hw.length), pad3(hw.bearing)]).toEqual([36.5, "092"]);
    expect(hw.steps[1]).toBe("∠PQR = 245° − 130° = 115°");
  });

  it("Activity B Q4: two points from A → BC = 15 km, C from B on 157°", () => {
    const s = fromOnePoint(9, 30, 12, 120);
    expect([r1(s.length), pad3(s.bearing)]).toEqual([15, "157"]);
    expect(s.steps[0]).toBe("∠BAC = 120° − 030° = 90°");
    expect(s.steps.at(-2)).toBe("Back bearing of A from B = 030° + 180° = 210°");
    expect(s.steps.at(-1)).toBe("Bearing of C from B = 210° − 53.1° = 156.9° ≈ 157°");
  });

  it("works across north (angles wrapping past 360°) and when the turn is the other way", () => {
    expect(fromOnePoint(10, 330, 10, 30).steps[0]).toBe("∠BAC = 360° − (330° − 030°) = 60°");
    // The answer always matches the points themselves.
    for (const p of PRESETS) {
      const x = p.kind === "journey" ? journey(p.d1, p.b1, p.d2, p.b2, p.names) : fromOnePoint(p.d1, p.b1, p.d2, p.b2, p.names);
      expect(x.steps.at(-1)).toContain(`≈ ${pad3(x.bearing)}°`);
    }
    const west = journey(10, 200, 8, 330);
    expect(west.steps.at(-1)).toMatch(/≈ \d{3}°$/);
  });
});
