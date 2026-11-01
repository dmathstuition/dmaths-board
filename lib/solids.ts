// 3D shapes for the board: their measurements (volume, surface area, with the
// working), a mesh to draw them turning in 3D, and their nets. Pure.

export type SolidKind = "cube" | "cuboid" | "prism" | "cylinder" | "cone" | "pyramid" | "sphere";
export const SOLIDS: { k: SolidKind; label: string; dims: ("a" | "b" | "c")[]; names: Record<string, string> }[] = [
  { k: "cube", label: "Cube", dims: ["a"], names: { a: "side" } },
  { k: "cuboid", label: "Cuboid", dims: ["a", "b", "c"], names: { a: "length", b: "width", c: "height" } },
  { k: "prism", label: "Triangular prism", dims: ["a", "b", "c"], names: { a: "base", b: "height of triangle", c: "length" } },
  { k: "cylinder", label: "Cylinder", dims: ["a", "c"], names: { a: "radius", c: "height" } },
  { k: "cone", label: "Cone", dims: ["a", "c"], names: { a: "radius", c: "height" } },
  { k: "pyramid", label: "Square pyramid", dims: ["a", "c"], names: { a: "base side", c: "height" } },
  { k: "sphere", label: "Sphere", dims: ["a"], names: { a: "radius" } },
];
export const isSolid = (v: unknown): v is SolidKind => SOLIDS.some((s) => s.k === v);

const r2 = (n: number) => Math.round(n * 100) / 100;
// "48π ≈ 150.8" — a multiple of π shown both ways.
const withPi = (k: number) => `${r2(k)}π ≈ ${r2(k * Math.PI)}`;

export type Facts = { volume: number; area: number; lines: string[] };
// Volume and surface area with the formula and the working, for the class to follow.
export function solidFacts(kind: SolidKind, a: number, b: number, c: number, unit = "cm"): Facts {
  const u3 = `${unit}³`, u2 = `${unit}²`;
  switch (kind) {
    case "cube": return { volume: a ** 3, area: 6 * a * a, lines: [`V = a³ = ${a}³ = ${r2(a ** 3)} ${u3}`, `SA = 6a² = 6 × ${a}² = ${r2(6 * a * a)} ${u2}`] };
    case "cuboid": { const v = a * b * c, s = 2 * (a * b + b * c + a * c); return { volume: v, area: s, lines: [`V = l × w × h = ${a} × ${b} × ${c} = ${r2(v)} ${u3}`, `SA = 2(lw + wh + lh) = 2(${r2(a * b)} + ${r2(b * c)} + ${r2(a * c)}) = ${r2(s)} ${u2}`] }; }
    case "prism": {
      const tri = (a * b) / 2, hyp = Math.hypot(a, b), v = tri * c, s = 2 * tri + (a + b + hyp) * c;
      return { volume: v, area: s, lines: [`V = ½ × base × height × length = ½ × ${a} × ${b} × ${c} = ${r2(v)} ${u3}`, `SA = 2 triangles + 3 rectangles = ${r2(2 * tri)} + ${r2((a + b + hyp) * c)} = ${r2(s)} ${u2}`, `(slanted side = √(${a}² + ${b}²) = ${r2(hyp)} ${unit})`] };
    }
    case "cylinder": return { volume: Math.PI * a * a * c, area: 2 * Math.PI * a * a + 2 * Math.PI * a * c, lines: [`V = πr²h = π × ${a}² × ${c} = ${withPi(a * a * c)} ${u3}`, `SA = 2πr² + 2πrh = ${withPi(2 * a * a + 2 * a * c)} ${u2}`] };
    case "cone": {
      const l = Math.hypot(a, c);
      return { volume: (Math.PI * a * a * c) / 3, area: Math.PI * a * a + Math.PI * a * l, lines: [`V = ⅓πr²h = ⅓ × π × ${a}² × ${c} = ${withPi((a * a * c) / 3)} ${u3}`, `slant l = √(r² + h²) = √(${a}² + ${c}²) = ${r2(l)} ${unit}`, `SA = πr² + πrl = ${withPi(a * a + a * l)} ${u2}`] };
    }
    case "pyramid": {
      const s = Math.hypot(c, a / 2), v = (a * a * c) / 3, area = a * a + 2 * a * s;
      return { volume: v, area, lines: [`V = ⅓ × base area × h = ⅓ × ${a}² × ${c} = ${r2(v)} ${u3}`, `slant height = √(h² + (a/2)²) = ${r2(s)} ${unit}`, `SA = a² + 4 × ½ × a × slant = ${r2(area)} ${u2}`] };
    }
    case "sphere": return { volume: (4 / 3) * Math.PI * a ** 3, area: 4 * Math.PI * a * a, lines: [`V = ⁴⁄₃πr³ = ⁴⁄₃ × π × ${a}³ = ${withPi((4 / 3) * a ** 3)} ${u3}`, `SA = 4πr² = ${withPi(4 * a * a)} ${u2}`] };
  }
}

// ── 3D: faces as lists of points, centred on the origin ──
export type V3 = [number, number, number];
export function solidMesh(kind: SolidKind, a: number, b: number, c: number, seg = 28): V3[][] {
  const box = (l: number, w: number, h: number): V3[][] => {
    const x = l / 2, y = h / 2, z = w / 2;
    const p = (i: number, j: number, k: number): V3 => [i ? x : -x, j ? y : -y, k ? z : -z];
    return [
      [p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)], [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
      [p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)], [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)],
      [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)],
    ];
  };
  const ring = (r: number, y: number): V3[] => Array.from({ length: seg }, (_, i) => { const t = (i / seg) * Math.PI * 2; return [r * Math.cos(t), y, r * Math.sin(t)]; });
  switch (kind) {
    case "cube": return box(a, a, a);
    case "cuboid": return box(a, b, c);
    case "prism": {
      // A right-angled triangle (base a, height b) pushed along length c.
      const z = c / 2, t = (k: number): V3[] => [[-a / 2, -b / 2, k], [a / 2, -b / 2, k], [-a / 2, b / 2, k]];
      const [f, g] = [t(-z), t(z)];
      return [f, g, [f[0], f[1], g[1], g[0]], [f[1], f[2], g[2], g[1]], [f[2], f[0], g[0], g[2]]];
    }
    case "cylinder": {
      const lo = ring(a, -c / 2), hi = ring(a, c / 2);
      return [lo, hi, ...lo.map((p, i) => [p, lo[(i + 1) % seg], hi[(i + 1) % seg], hi[i]])];
    }
    case "cone": {
      const lo = ring(a, -c / 2), tip: V3 = [0, c / 2, 0];
      return [lo, ...lo.map((p, i) => [p, lo[(i + 1) % seg], tip])];
    }
    case "pyramid": {
      const h = a / 2, y = -c / 2, base: V3[] = [[-h, y, -h], [h, y, -h], [h, y, h], [-h, y, h]], tip: V3 = [0, c / 2, 0];
      return [base, ...base.map((p, i) => [p, base[(i + 1) % 4], tip])];
    }
    case "sphere": {
      const rows = 10, faces: V3[][] = [];
      const at = (i: number, j: number): V3 => { const ph = (i / rows) * Math.PI, th = (j / seg) * Math.PI * 2; return [a * Math.sin(ph) * Math.cos(th), a * Math.cos(ph), a * Math.sin(ph) * Math.sin(th)]; };
      for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) faces.push([at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)]);
      return faces;
    }
  }
}

// Turn (yaw about the vertical, then pitch) and project to 2D. z is depth (bigger = nearer).
export function project(p: V3, yawDeg: number, pitchDeg: number): V3 {
  const y1 = (yawDeg * Math.PI) / 180, p1 = (pitchDeg * Math.PI) / 180;
  const x = p[0] * Math.cos(y1) + p[2] * Math.sin(y1), z = -p[0] * Math.sin(y1) + p[2] * Math.cos(y1);
  const y = p[1] * Math.cos(p1) - z * Math.sin(p1), z2 = p[1] * Math.sin(p1) + z * Math.cos(p1);
  return [x, -y, z2];
}

// ── Nets: flat shapes (polygons and circles) laid out in the plane ──
export type NetPart = { kind: "poly"; pts: [number, number][]; label?: string } | { kind: "circle"; cx: number; cy: number; r: number; label?: string } | { kind: "sector"; cx: number; cy: number; r: number; from: number; to: number; label?: string };
export function solidNet(kind: SolidKind, a: number, b: number, c: number): NetPart[] {
  const rect = (x: number, y: number, w: number, h: number, label?: string): NetPart => ({ kind: "poly", pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], label });
  switch (kind) {
    case "cube": case "cuboid": {
      const [l, w, h] = kind === "cube" ? [a, a, a] : [a, b, c];
      // A cross: top, front, bottom, back down the middle; sides either side of the front.
      return [rect(w, 0, l, w, "top"), rect(w, w, l, h, "front"), rect(w, w + h, l, w, "bottom"), rect(w, 2 * w + h, l, h, "back"), rect(0, w, w, h, "side"), rect(w + l, w, w, h, "side")];
    }
    case "prism": {
      const hyp = Math.hypot(a, b);
      return [rect(0, b, c, a, "base"), rect(0, b + a, c, hyp, "slope"), rect(0, b + a + hyp, c, b, "back"),
        { kind: "poly", pts: [[0, b], [0, b + a], [-b, b]], label: "end" }, { kind: "poly", pts: [[c, b], [c, b + a], [c + b, b]], label: "end" }];
    }
    case "cylinder": { const w = 2 * Math.PI * a; return [rect(0, 2 * a, w, c, "curved side"), { kind: "circle", cx: w / 2, cy: a, r: a, label: "top" }, { kind: "circle", cx: w / 2, cy: 3 * a + c, r: a, label: "base" }]; }
    case "cone": {
      const l = Math.hypot(a, c), ang = (360 * a) / l;
      return [{ kind: "sector", cx: l, cy: l, r: l, from: 90 - ang / 2, to: 90 + ang / 2, label: `${Math.round(ang)}° sector` }, { kind: "circle", cx: l, cy: 2 * l + a, r: a, label: "base" }];
    }
    case "pyramid": {
      const s = Math.hypot(c, a / 2);
      return [rect(s, s, a, a, "base"),
        { kind: "poly", pts: [[s, s], [s + a, s], [s + a / 2, 0]] }, { kind: "poly", pts: [[s, s + a], [s + a, s + a], [s + a / 2, 2 * s + a]] },
        { kind: "poly", pts: [[s, s], [s, s + a], [0, s + a / 2]] }, { kind: "poly", pts: [[s + a, s], [s + a, s + a], [2 * s + a, s + a / 2]] }];
    }
    case "sphere": return [];
  }
}

// The box around a net, to fit it on screen.
export function netBounds(parts: NetPart[]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const add = (x: number, y: number) => { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); };
  for (const p of parts) {
    if (p.kind === "poly") p.pts.forEach(([x, y]) => add(x, y));
    else { add(p.cx - p.r, p.cy - p.r); add(p.cx + p.r, p.cy + p.r); }
  }
  return { x1, y1, x2, y2 };
}

// Compasses: a circle of `cm` centimetres on a board (the ruler's scale: 32 board units to the cm).
export const BOARD_CM = 32;
