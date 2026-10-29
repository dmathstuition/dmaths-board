// Zooming and moving around the whiteboard. A view is the part of the board
// on screen: `z` = zoom (1 = whole board), `x`,`y` = its top-left corner as a
// fraction of the board. Everything stored on the board stays in whole-board
// fractions; only what's on screen changes.

export type View = { z: number; x: number; y: number };
export const HOME: View = { z: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1, MAX_ZOOM = 5;

const clampNum = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r4 = (n: number) => Math.round(n * 10000) / 10000;

// Keep the zoom in range and the view on the board.
export function clampView(v: View): View {
  const z = clampNum(Number.isFinite(v.z) ? v.z : 1, MIN_ZOOM, MAX_ZOOM);
  const span = 1 / z;
  return { z: r4(z), x: r4(clampNum(Number.isFinite(v.x) ? v.x : 0, 0, 1 - span)), y: r4(clampNum(Number.isFinite(v.y) ? v.y : 0, 0, 1 - span)) };
}
export const isHome = (v: View) => v.z <= 1.0001;

// A point on screen (fractions of the board area on screen) → on the board, and back.
export const toBoard = (v: View, sx: number, sy: number): [number, number] => [v.x + sx / v.z, v.y + sy / v.z];
export const toScreen = (v: View, bx: number, by: number): [number, number] => [(bx - v.x) * v.z, (by - v.y) * v.z];

// Zoom by `k`, keeping the board point under (sx, sy) on screen where it is.
export function zoomAt(v: View, k: number, sx = 0.5, sy = 0.5): View {
  const [bx, by] = toBoard(v, sx, sy);
  const z = clampNum(v.z * k, MIN_ZOOM, MAX_ZOOM);
  return clampView({ z, x: bx - sx / z, y: by - sy / z });
}
// Move the view by a screen distance (fractions of the board area on screen).
export const panBy = (v: View, dsx: number, dsy: number): View => clampView({ ...v, x: v.x - dsx / v.z, y: v.y - dsy / v.z });

// Two fingers: from where they started (and the view then) to where they are now.
export function pinch(start: View, a0: [number, number], b0: [number, number], a1: [number, number], b1: [number, number]): View {
  const d0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]) || 1e-6, d1 = Math.hypot(b1[0] - a1[0], b1[1] - a1[1]);
  const m0: [number, number] = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2], m1: [number, number] = [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2];
  const [bx, by] = toBoard(start, m0[0], m0[1]); // the board point between the fingers stays between them
  const z = clampNum(start.z * (d1 / d0), MIN_ZOOM, MAX_ZOOM);
  return clampView({ z, x: bx - m1[0] / z, y: by - m1[1] / z });
}

export function cleanView(v: unknown): View {
  const o = v as Partial<View> | null;
  return clampView({ z: Number(o?.z) || 1, x: Number(o?.x) || 0, y: Number(o?.y) || 0 });
}

// Canvas transform for drawing the board through a view onto a w×h canvas.
export const viewMatrix = (v: View, w: number, h: number): [number, number, number, number, number, number] => [v.z, 0, 0, v.z, -v.x * w * v.z, -v.y * h * v.z];
