// "Neat shapes": turn a rough hand-drawn line, circle, triangle or rectangle
// into a clean one. Works on a finished pen stroke; returns the tidy item, or
// null to keep the stroke exactly as drawn (handwriting, scribbles, small marks).
//
// Points are board coordinates (0–1 across and down). The maths runs in board
// pixels (BOARD_W × BOARD_H) so circles stay round on a 16:10 board.
import { BOARD_W, BOARD_H, type Stroke } from "@/lib/whiteboard";

type P = [number, number];
const MIN_SIZE = 0.06 * BOARD_W; // smaller than this is handwriting: leave it alone

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(p: P, a: P, b: P): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
  if (!len2) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

// Ramer–Douglas–Peucker: keep only the corners of an open path.
function rdp(pts: P[], eps: number): P[] {
  if (pts.length < 3) return pts.slice();
  let worst = 0, at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, at + 1), eps).slice(0, -1), ...rdp(pts.slice(at), eps)];
}

// The corners of a closed loop: split it at the point farthest from the start.
function corners(pts: P[], eps: number): P[] {
  let far = 0, at = 0;
  pts.forEach((p, i) => { const d = dist(p, pts[0]); if (d > far) { far = d; at = i; } });
  const a = rdp(pts.slice(0, at + 1), eps), b = rdp([...pts.slice(at), pts[0]], eps);
  let v = [...a.slice(0, -1), ...b.slice(0, -1)];
  // Merge corners that sit almost on top of each other, and drop "corners" on a straight run.
  v = v.filter((p, i) => dist(p, v[(i + 1) % v.length]) > eps * 1.2);
  let changed = true;
  while (changed && v.length > 3) {
    changed = false;
    for (let i = 0; i < v.length; i++) {
      const prev = v[(i - 1 + v.length) % v.length], next = v[(i + 1) % v.length];
      if (segDist(v[i], prev, next) < eps) { v.splice(i, 1); changed = true; break; }
    }
  }
  return v;
}

const angleAt = (prev: P, p: P, next: P) => {
  const a = Math.atan2(prev[1] - p[1], prev[0] - p[0]), b = Math.atan2(next[1] - p[1], next[0] - p[0]);
  let d = Math.abs(a - b) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
};
const deg = (a: P, b: P) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
const nearAxis = (d: number, tol: number) => { const m = ((d % 90) + 90) % 90; return m < tol || m > 90 - tol; };

const toBoard = (p: P): [number, number] => [Math.round((p[0] / BOARD_W) * 10000) / 10000, Math.round((p[1] / BOARD_H) * 10000) / 10000];

// A straight-edged outline as a pen line: many points along each side, so it
// draws crisp on every device and still works with select, move and erase.
function outline(v: P[]): number[] {
  const out: number[] = [];
  for (let i = 0; i <= v.length; i++) {
    const a = v[i % v.length], b = v[(i + 1) % v.length];
    const steps = i === v.length ? 1 : Math.max(2, Math.ceil(dist(a, b) / 6));
    for (let k = 0; k < steps; k++) {
      if (i === v.length && k > 0) break;
      const t = k / steps;
      out.push(...toBoard([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
    }
  }
  return out;
}

export type NeatKind = "line" | "ellipse" | "rect" | "triangle" | "quad";

export function recognizeShape(s: Stroke): { kind: NeatKind; item: Stroke } | null {
  if ((s.kind && s.kind !== "pen") || s.erase || s.pts.length < 12) return null;
  const pts: P[] = [];
  for (let i = 0; i + 1 < s.pts.length; i += 2) pts.push([s.pts[i] * BOARD_W, s.pts[i + 1] * BOARD_H]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
  const diag = Math.hypot(x2 - x1, y2 - y1);
  if (diag < MIN_SIZE) return null;
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += dist(pts[i - 1], pts[i]);
  const first = pts[0], last = pts[pts.length - 1], chord = dist(first, last);
  const base = { id: s.id, by: s.by, color: s.color, w: s.w, ...(s.t != null ? { t: s.t } : {}) };

  // A straight line: the path is barely longer than start-to-end, and never strays far.
  if (chord / length > 0.93 && Math.max(...pts.map((p) => segDist(p, first, last))) < 0.06 * chord) {
    let [a, b] = [first, last];
    const d = deg(a, b);
    if (nearAxis(d, 7)) { // nearly flat or upright: make it exactly so
      const m = ((d % 180) + 180) % 180;
      if (m < 7 || m > 173) b = [b[0], a[1]]; else a = [b[0], a[1]];
    }
    return { kind: "line", item: { ...base, kind: "line", pts: [...toBoard(a), ...toBoard(b)] } };
  }

  // Everything else must come back to where it started.
  if (chord > 0.25 * diag) return null;
  const loop = pts.slice(0, -1);
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = (x2 - x1) / 2, ry = (y2 - y1) / 2;
  if (rx < 4 || ry < 4) return null;

  const v = corners(loop, 0.09 * diag);
  // How far the drawing is, on average, from a candidate outline.
  const fitPoly = (poly: P[]) => loop.reduce((n, p) => n + Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length]))), 0) / loop.length / diag;

  if (v.length === 3 && fitPoly(v) < 0.04) {
    return { kind: "triangle", item: { ...base, pts: outline(v) } };
  }
  if (v.length === 4 && fitPoly(v) < 0.04) {
    const right = v.every((p, i) => Math.abs(angleAt(v[(i + 3) % 4], p, v[(i + 1) % 4]) - 90) < 22);
    if (right && v.every((p, i) => nearAxis(deg(p, v[(i + 1) % 4]), 12))) {
      return { kind: "rect", item: { ...base, kind: "rect", pts: [...toBoard([x1, y1]), ...toBoard([x2, y2])] } };
    }
    return { kind: "quad", item: { ...base, pts: outline(v) } };
  }

  // A circle or oval: every point sits close to the oval that fills the drawing's box.
  const err = loop.reduce((n, [x, y]) => n + Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1), 0) / loop.length;
  if (err < 0.12 && v.length >= 4) {
    let [ex, ey] = [rx, ry];
    if (Math.abs(rx - ry) / Math.max(rx, ry) < 0.15) ex = ey = (rx + ry) / 2; // nearly round: make it a circle
    return { kind: "ellipse", item: { ...base, kind: "ellipse", pts: [...toBoard([cx - ex, cy - ey]), ...toBoard([cx + ex, cy + ey])] } };
  }
  return null;
}
