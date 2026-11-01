import { describe, expect, it } from "vitest";
import { SOLIDS, netBounds, project, solidFacts, solidMesh, solidNet } from "@/lib/solids";
import { cleanWidgets } from "@/lib/boardTools";

describe("3D shapes", () => {
  it("works out volume and surface area", () => {
    expect(solidFacts("cube", 3, 0, 0)).toMatchObject({ volume: 27, area: 54 });
    expect(solidFacts("cuboid", 6, 4, 3)).toMatchObject({ volume: 72, area: 108 });
    expect(solidFacts("prism", 3, 4, 10)).toMatchObject({ volume: 60, area: 132 }); // 2×6 + (3+4+5)×10
    expect(solidFacts("cylinder", 2, 0, 5).volume).toBeCloseTo(20 * Math.PI);
    expect(solidFacts("cone", 3, 0, 4).area).toBeCloseTo(9 * Math.PI + 15 * Math.PI); // slant 5
    expect(solidFacts("pyramid", 6, 0, 4)).toMatchObject({ volume: 48, area: 96 }); // slant 5
    expect(solidFacts("sphere", 3, 0, 0).volume).toBeCloseTo(36 * Math.PI);
    expect(solidFacts("cylinder", 2, 0, 5).lines[0]).toContain("20π");
  });

  it("every shape has a mesh, and a net except the sphere", () => {
    for (const s of SOLIDS) {
      const mesh = solidMesh(s.k, 4, 3, 5);
      expect(mesh.length, s.k).toBeGreaterThan(3);
      expect(mesh.flat().every((p) => p.every(Number.isFinite))).toBe(true);
      const net = solidNet(s.k, 4, 3, 5);
      if (s.k === "sphere") expect(net).toEqual([]);
      else { const b = netBounds(net); expect(b.x2).toBeGreaterThan(b.x1); }
    }
    expect(solidNet("cube", 2, 2, 2)).toHaveLength(6);
  });

  it("turning keeps distances (a rotation)", () => {
    const p = project([3, 4, 12], 37, 21);
    expect(Math.hypot(...p)).toBeCloseTo(13);
  });

  it("the cone's net is a sector of the right angle", () => {
    const [sector] = solidNet("cone", 3, 0, 4); // slant 5: 360 × 3/5 = 216°
    expect(sector.kind === "sector" && sector.to - sector.from).toBeCloseTo(216);
  });

  it("keeps the compasses and the 3D shape tidy when shared", () => {
    const w = cleanWidgets({ compass: { on: true, x: 2, y: 0.5, r: 99, rot: -90 }, solid: { on: true, shape: "rocket", a: -1, pitch: 200 } });
    expect(w.compass).toMatchObject({ on: true, x: 1, r: 20, rot: 270 });
    expect(w.solid).toMatchObject({ on: true, shape: "cuboid", a: 0.5, pitch: 89 });
  });
});
