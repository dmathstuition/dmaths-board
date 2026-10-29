// Shared whiteboard — item format, validation and drawing. Points are stored
// normalised (0–1) so the board looks the same on a phone, a laptop and a
// projector. A board has several pages, each with its own paper.

export type ItemKind = "pen" | "hl" | "line" | "arrow" | "rect" | "ellipse" | "text" | "note" | "tri" | "dline" | "darrow" | "stamp" | "image" | "card" | "zone" | "cover";
// Freehand strokes keep `pts` as x,y,x,y…; shapes use two corners [x1,y1,x2,y2];
// text and notes use one point [x,y] plus `text` (w = size step).
// Activities: a `card` learners drag into a `zone`; both carry `group` (which
// zone a card belongs in) and `mark` shows a checked card. A `cover` hides
// what's under it while `fill` is set. `t` = when the item was made (replay).
export type Stroke = {
  id: string; by: string; color: string; w: number; erase?: boolean; pts: number[]; kind?: ItemKind; text?: string; fill?: boolean;
  group?: number; mark?: "ok" | "no"; t?: number;
};

export const BOARD_W = 1600, BOARD_H = 1000;
export const COLORS = ["#0B1220", "#FFFFFF", "#1657C9", "#0EA5E9", "#DC2626", "#EC4899", "#16A34A", "#84CC16", "#D97706", "#7C3AED"] as const;
export const NOTE_COLORS = ["#FEF08A", "#FBCFE8", "#BAE6FD", "#BBF7D0", "#FED7AA"] as const;
export const SIZES = [2, 4, 8, 14, 24] as const;

export type Paper = "plain" | "grid" | "maths" | "axes" | "dots" | "lines" | "handwriting" | "chalk" | "dark";
export const PAPERS: { id: Paper; label: string; dark?: boolean }[] = [
  { id: "plain", label: "Plain" }, { id: "grid", label: "Grid" }, { id: "maths", label: "Maths squares" }, { id: "axes", label: "Coordinate plane" },
  { id: "dots", label: "Dots" }, { id: "lines", label: "Lined" }, { id: "handwriting", label: "Handwriting lines" }, { id: "chalk", label: "Blackboard", dark: true }, { id: "dark", label: "Dark", dark: true },
];
export const isPaper = (v: unknown): v is Paper => PAPERS.some((p) => p.id === v);
export const paperIsDark = (p: Paper) => !!PAPERS.find((x) => x.id === p)?.dark;

// `bg` is an uploaded slide picture behind a page (null for none).
export type Board = { v: 2; pages: Stroke[][]; paper: Paper[]; bg: (string | null)[] };
// Only slide pictures uploaded through /api/live-sessions/slides are shown.
export const isSlideUrl = (v: unknown): v is string =>
  typeof v === "string" && v.length < 600 && /^https:\/\/[^\s"'<>]+\/storage\/v1\/object\/public\/materials\/slides\/[\w./-]+\.(jpg|jpeg|png|webp)$/i.test(v);
// Pages per board (slides included). Raised from 20 to 50: the whole board is
// saved and re-sent as one piece, so keep this modest for learners on mobile data.
export const BOARD_MAX_PAGES = 50;
const MAX_STROKES = 4000, MAX_POINTS = 4000, MAX_PAGES = BOARD_MAX_PAGES, MAX_TEXT = 500;
const KINDS: ItemKind[] = ["pen", "hl", "line", "arrow", "rect", "ellipse", "text", "note", "tri", "dline", "darrow", "stamp", "image", "card", "zone", "cover"];
export const SHAPE_KINDS: ItemKind[] = ["line", "dline", "arrow", "darrow", "rect", "ellipse", "tri"];
export const FILLABLE: ItemKind[] = ["rect", "ellipse", "tri"];
export const STAMPS = ["tick", "cross", "star", "heart", "smiley", "question"] as const;
export type StampId = (typeof STAMPS)[number];
// A stamp's size in board units for a size step.
export const stampSize = (w: number) => Math.round(48 + w * 4);

export const roundPt = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;

export function cleanStroke(v: unknown): Stroke | null {
  const s = v as any;
  if (!s || typeof s !== "object") return null;
  const color = /^#[0-9a-f]{6}$/i.test(String(s.color)) ? String(s.color) : "#0B1220";
  const w = Math.max(1, Math.min(60, Number(s.w) || 4));
  const kind: ItemKind = KINDS.includes(s.kind) ? s.kind : "pen";
  let pts: number[] = Array.isArray(s.pts) ? s.pts.slice(0, MAX_POINTS * 2).map((n: unknown) => roundPt(Number(n) || 0)) : [];
  if (pts.length % 2) pts = pts.slice(0, -1);
  const out: Stroke = { id: String(s.id ?? "").slice(0, 40) || Math.random().toString(36).slice(2), by: String(s.by ?? "").slice(0, 40), color, w, erase: !!s.erase, pts };
  if (kind !== "pen") out.kind = kind;
  if (s.t != null && Number.isFinite(Number(s.t))) out.t = Math.max(0, Math.round(Number(s.t)));
  if (kind === "card" || kind === "zone" || kind === "cover") {
    if (pts.length < 4) return null;
    out.pts = pts.slice(0, 4); out.erase = false;
    const text = String(s.text ?? "").replace(/\r/g, "").slice(0, 120);
    if (kind === "card" && !text.trim()) return null;
    if (text) out.text = text;
    if (Number.isInteger(s.group) && s.group >= 0 && s.group < 12) out.group = s.group;
    if (kind === "card" && (s.mark === "ok" || s.mark === "no")) out.mark = s.mark;
    if (kind === "cover" && s.fill) out.fill = true;
    return out;
  }
  if (kind === "image") {
    if (!isSlideUrl(s.text) || pts.length < 4) return null;
    out.text = String(s.text); out.pts = pts.slice(0, 4); out.erase = false;
    return out;
  }
  if (kind === "stamp") {
    if (!(STAMPS as readonly string[]).includes(String(s.text)) || pts.length < 2) return null;
    out.text = String(s.text); out.pts = pts.slice(0, 2); out.erase = false;
    return out;
  }
  if (kind === "text" || kind === "note") {
    const text = String(s.text ?? "").replace(/\r/g, "").slice(0, MAX_TEXT);
    if (!text.trim() || pts.length < 2) return null;
    out.text = text; out.pts = pts.slice(0, 2); out.erase = false;
    return out;
  }
  if (SHAPE_KINDS.includes(kind)) {
    if (pts.length < 4) return null;
    out.pts = pts.slice(0, 4); out.erase = false;
    if (s.fill && FILLABLE.includes(kind)) out.fill = true;
    return out;
  }
  if (pts.length < 2) return null;
  return out;
}
export function cleanStrokes(v: unknown): Stroke[] {
  if (!Array.isArray(v)) return [];
  return v.slice(-MAX_STROKES).map(cleanStroke).filter((s): s is Stroke => !!s);
}

// Saved boards: the old format was one array of strokes; the new one has pages.
export function cleanBoard(v: unknown): Board {
  if (Array.isArray(v)) return { v: 2, pages: [cleanStrokes(v)], paper: ["plain"], bg: [null] };
  const b = v as any;
  const pages: Stroke[][] = Array.isArray(b?.pages) && b.pages.length ? b.pages.slice(0, MAX_PAGES).map(cleanStrokes) : [[]];
  const paper: Paper[] = pages.map((_, i) => (isPaper(b?.paper?.[i]) ? b.paper[i] : "plain"));
  const bg = pages.map((_, i) => (isSlideUrl(b?.bg?.[i]) ? b.bg[i] : null));
  return { v: 2, pages, paper, bg };
}
export const itemCount = (b: Board) => b.pages.reduce((n, p) => n + p.length, 0);

// Text size in board units for a size step (2 → small, 24 → huge).
export const fontFor = (w: number) => Math.round(20 + w * 3);
export const NOTE_W = 230, NOTE_H = 170;

// Wrap text to a width with a measuring function (testable without a canvas).
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const next = line ? `${line} ${word}` : word;
      if (measure(next) <= maxWidth || !line) line = next;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

// Pictures on the board are looked up by URL; null while still loading.
export type ImageSource = (url: string) => CanvasImageSource & { width: number; height: number } | null;

// Draw items onto a canvas context sized w×h (device pixels).
// `matrix` draws through a zoomed view (see lib/boardView.ts).
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number, img?: ImageSource, matrix?: [number, number, number, number, number, number]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (matrix) ctx.setTransform(...matrix);
  const scale = w / BOARD_W;
  for (const s of strokes) drawItem(ctx, s, w, h, scale, img);
}

export function drawItem(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number, scale = w / BOARD_W, img?: ImageSource) {
  const kind = s.kind ?? "pen";
  ctx.save();
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const X = (i: number) => s.pts[i] * w, Y = (i: number) => s.pts[i + 1] * h;

  if (kind === "pen" || kind === "hl") {
    const hl = kind === "hl";
    if (hl) ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, s.w * scale * (s.erase ? 3 : hl ? 4 : 1));
    if (s.pts.length === 2) {
      ctx.beginPath(); ctx.arc(X(0), Y(0), ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // Smooth handwriting: curve through the midpoints between samples.
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      const n = s.pts.length;
      for (let i = 2; i < n - 2; i += 2) ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 2)) / 2, (Y(i) + Y(i + 2)) / 2);
      ctx.lineTo(X(n - 2), Y(n - 2));
      ctx.stroke();
    }
  } else if (kind === "line" || kind === "arrow" || kind === "dline" || kind === "darrow") {
    ctx.lineWidth = Math.max(1, s.w * scale);
    const [x1, y1, x2, y2] = [X(0), Y(0), X(2), Y(2)];
    if (kind === "dline") ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2.5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    const head = (fx: number, fy: number, tx: number, ty: number) => {
      const a = Math.atan2(ty - fy, tx - fx), hd = Math.max(10 * scale, ctx.lineWidth * 3.5);
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(tx - hd * Math.cos(a - 0.45), ty - hd * Math.sin(a - 0.45));
      ctx.lineTo(tx - hd * Math.cos(a + 0.45), ty - hd * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    };
    if (kind === "arrow" || kind === "darrow") head(x1, y1, x2, y2);
    if (kind === "darrow") head(x2, y2, x1, y1);
  } else if (kind === "rect" || kind === "ellipse" || kind === "tri") {
    ctx.lineWidth = Math.max(1, s.w * scale);
    const x = Math.min(X(0), X(2)), y = Math.min(Y(0), Y(2)), rw = Math.abs(X(2) - X(0)), rh = Math.abs(Y(2) - Y(0));
    ctx.beginPath();
    if (kind === "rect") ctx.rect(x, y, rw, rh);
    else if (kind === "ellipse") ctx.ellipse(x + rw / 2, y + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
    else { ctx.moveTo(x + rw / 2, y); ctx.lineTo(x + rw, y + rh); ctx.lineTo(x, y + rh); ctx.closePath(); }
    if (s.fill) { ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.stroke();
  } else if (kind === "image" && s.text) {
    const x = Math.min(X(0), X(2)), y = Math.min(Y(0), Y(2)), bw = Math.abs(X(2) - X(0)), bh = Math.abs(Y(2) - Y(0));
    const im = img?.(s.text);
    if (im && im.width) {
      const k = Math.min(bw / im.width, bh / im.height), iw = im.width * k, ih = im.height * k;
      ctx.drawImage(im, x + (bw - iw) / 2, y + (bh - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = "rgba(148,163,184,.18)"; ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = "#94A3B8"; ctx.lineWidth = Math.max(1, 2 * scale); ctx.setLineDash([8 * scale, 6 * scale]); ctx.strokeRect(x, y, bw, bh);
    }
  } else if (kind === "card" || kind === "zone" || kind === "cover") {
    drawActivity(ctx, s, X(0), Y(0), X(2), Y(2), scale);
  } else if (kind === "stamp" && s.text) {
    drawStamp(ctx, s.text as StampId, X(0), Y(0), stampSize(s.w) * scale);
  } else if (kind === "text" && s.text) {
    const size = fontFor(s.w) * scale;
    ctx.font = `600 ${size}px Poppins, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    const lines = wrapText(s.text, (1 - s.pts[0]) * w - 8 * scale, (t) => ctx.measureText(t).width);
    lines.forEach((ln, i) => ctx.fillText(ln, X(0), Y(0) + i * size * 1.25));
  } else if (kind === "note" && s.text) {
    const nw = NOTE_W * scale, nh = NOTE_H * scale, x = Math.min(X(0), w - nw), y = Math.min(Y(0), h - nh);
    ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 10 * scale; ctx.shadowOffsetY = 4 * scale;
    ctx.fillStyle = s.color; ctx.fillRect(x, y, nw, nh);
    ctx.shadowColor = "transparent";
    const size = 22 * scale;
    ctx.fillStyle = "#1E1B4B"; ctx.font = `600 ${size}px Poppins, system-ui, sans-serif`; ctx.textBaseline = "top";
    wrapText(s.text, nw - 24 * scale, (t) => ctx.measureText(t).width).slice(0, 6)
      .forEach((ln, i) => ctx.fillText(ln, x + 12 * scale, y + 12 * scale + i * size * 1.25, nw - 24 * scale));
  }
  ctx.restore();
}

// Reward stamps, drawn as shapes so they look the same everywhere.
function drawStamp(ctx: CanvasRenderingContext2D, id: StampId, cx: number, cy: number, size: number) {
  const r = size / 2;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = size * 0.08; ctx.shadowOffsetY = size * 0.03;
  const disc = (fill: string) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = "transparent"; };
  if (id === "tick") {
    disc("#16A34A");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = size * 0.12;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.38); ctx.lineTo(cx + r * 0.5, cy - r * 0.35); ctx.stroke();
  } else if (id === "cross") {
    disc("#DC2626");
    ctx.strokeStyle = "#fff"; ctx.lineWidth = size * 0.12;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.38, cy - r * 0.38); ctx.lineTo(cx + r * 0.38, cy + r * 0.38);
    ctx.moveTo(cx + r * 0.38, cy - r * 0.38); ctx.lineTo(cx - r * 0.38, cy + r * 0.38); ctx.stroke();
  } else if (id === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath(); ctx.fillStyle = "#FACC15"; ctx.fill(); ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#CA8A04"; ctx.lineWidth = size * 0.05; ctx.stroke();
  } else if (id === "heart") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.85);
    ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.05, cx - r * 0.55, cy - r * 1.05, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.55, cy - r * 1.05, cx + r * 1.3, cy - r * 0.05, cx, cy + r * 0.85);
    ctx.fillStyle = "#EC4899"; ctx.fill(); ctx.shadowColor = "transparent";
  } else if (id === "smiley") {
    disc("#FACC15");
    ctx.strokeStyle = "#78350F"; ctx.fillStyle = "#78350F"; ctx.lineWidth = size * 0.06;
    ctx.beginPath(); ctx.arc(cx - r * 0.33, cy - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.arc(cx + r * 0.33, cy - r * 0.2, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    disc("#1657C9");
    ctx.fillStyle = "#fff"; ctx.font = `800 ${size * 0.7}px Poppins, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + size * 0.03);
  }
}

// ── Selecting and moving items ──
export type Bounds = { x1: number; y1: number; x2: number; y2: number };
export function itemBounds(s: Stroke): Bounds {
  const kind = s.kind ?? "pen";
  if (kind === "note") {
    const w = NOTE_W / BOARD_W, h = NOTE_H / BOARD_H, x = Math.min(s.pts[0], 1 - w), y = Math.min(s.pts[1], 1 - h);
    return { x1: x, y1: y, x2: x + w, y2: y + h };
  }
  if (kind === "stamp") {
    const hw = stampSize(s.w) / 2 / BOARD_W, hh = stampSize(s.w) / 2 / BOARD_H;
    return { x1: s.pts[0] - hw, y1: s.pts[1] - hh, x2: s.pts[0] + hw, y2: s.pts[1] + hh };
  }
  if (kind === "text") {
    const f = fontFor(s.w), lines = String(s.text ?? "").split("\n");
    const longest = Math.max(1, ...lines.map((l) => l.length));
    return { x1: s.pts[0], y1: s.pts[1], x2: Math.min(1, s.pts[0] + (longest * f * 0.56) / BOARD_W), y2: Math.min(1, s.pts[1] + (lines.length * f * 1.25) / BOARD_H) };
  }
  let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
  for (let i = 0; i + 1 < s.pts.length; i += 2) {
    x1 = Math.min(x1, s.pts[i]); x2 = Math.max(x2, s.pts[i]); y1 = Math.min(y1, s.pts[i + 1]); y2 = Math.max(y2, s.pts[i + 1]);
  }
  return { x1, y1, x2, y2 };
}
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), (py - (ay + t * dy)) * (BOARD_H / BOARD_W));
};
// The topmost item under a point (erasures can't be picked).
export function hitTest(items: Stroke[], x: number, y: number, tol = 0.012): Stroke | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const s = items[i];
    if (s.erase) continue;
    const kind = s.kind ?? "pen";
    const pad = tol + s.w / BOARD_W / 2;
    if (kind === "pen" || kind === "hl" || kind === "line" || kind === "arrow" || kind === "dline" || kind === "darrow") {
      if (s.pts.length === 2 && Math.hypot(x - s.pts[0], y - s.pts[1]) <= pad) return s;
      for (let j = 0; j + 3 < s.pts.length; j += 2) if (segDist(x, y, s.pts[j], s.pts[j + 1], s.pts[j + 2], s.pts[j + 3]) <= pad * (kind === "hl" ? 3 : 1)) return s;
      continue;
    }
    const b = itemBounds(s);
    if (x >= b.x1 - tol && x <= b.x2 + tol && y >= b.y1 - tol && y <= b.y2 + tol) return s;
  }
  return null;
}
// Move an item, keeping it on the board.
export function moveItem(s: Stroke, dx: number, dy: number): Stroke {
  const b = itemBounds(s);
  const mx = Math.max(-b.x1, Math.min(1 - b.x2, dx)), my = Math.max(-b.y1, Math.min(1 - b.y2, dy));
  return { ...s, pts: s.pts.map((v, i) => roundPt(v + (i % 2 ? my : mx))) };
}

// Make an item bigger or smaller (k > 1 grows), about its centre.
export function scaleItem(s: Stroke, k: number): Stroke {
  const kind = s.kind ?? "pen";
  if (kind === "text" || kind === "stamp") return { ...s, w: Math.max(1, Math.min(60, Math.round(s.w * k * 10) / 10)) };
  if (kind === "note") return s;
  const b = itemBounds(s), cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
  const grown = { ...s, pts: s.pts.map((v, i) => roundPt(i % 2 ? cy + (v - cy) * k : cx + (v - cx) * k)) };
  const nb = itemBounds(grown);
  if (nb.x2 - nb.x1 < 0.01 && nb.y2 - nb.y1 < 0.01) return s; // too small to pick up again
  return grown;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Cards, drop zones and cover boxes.
function drawActivity(ctx: CanvasRenderingContext2D, s: Stroke, ax: number, ay: number, bx: number, by: number, scale: number) {
  const x = Math.min(ax, bx), y = Math.min(ay, by), w = Math.abs(bx - ax), h = Math.abs(by - ay), r = Math.min(14 * scale, h / 3);
  const font = (px: number, weight = 700) => `${weight} ${px}px Poppins, system-ui, sans-serif`;
  if (s.kind === "zone") {
    ctx.fillStyle = s.color; ctx.globalAlpha = 0.07; roundRect(ctx, x, y, w, h, r); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = s.color; ctx.lineWidth = Math.max(1, 3 * scale); ctx.setLineDash([12 * scale, 8 * scale]); roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.setLineDash([]);
    if (s.text) {
      const size = 26 * scale; ctx.fillStyle = s.color; ctx.font = font(size, 800); ctx.textBaseline = "top";
      ctx.fillText(s.text, x + 14 * scale, y + 12 * scale, w - 28 * scale);
    }
    return;
  }
  if (s.kind === "cover") {
    if (!s.fill) { // revealed: just a faint outline so the tutor can cover it again
      ctx.strokeStyle = s.color; ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(1, 2 * scale); ctx.setLineDash([6 * scale, 6 * scale]);
      roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      return;
    }
    ctx.shadowColor = "rgba(0,0,0,.2)"; ctx.shadowBlur = 10 * scale; ctx.shadowOffsetY = 4 * scale;
    ctx.fillStyle = s.color; roundRect(ctx, x, y, w, h, r); ctx.fill(); ctx.shadowColor = "transparent";
    const label = s.text || "?", size = Math.min(h * 0.45, (label === "?" ? 64 : 30) * scale);
    ctx.fillStyle = "#fff"; ctx.font = font(size, 800); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2, w - 20 * scale);
    return;
  }
  // card
  ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 8 * scale; ctx.shadowOffsetY = 3 * scale;
  ctx.fillStyle = s.color; roundRect(ctx, x, y, w, h, r); ctx.fill(); ctx.shadowColor = "transparent";
  ctx.strokeStyle = s.mark === "ok" ? "#16A34A" : s.mark === "no" ? "#DC2626" : "rgba(15,23,42,.18)";
  ctx.lineWidth = Math.max(1, (s.mark ? 4 : 1.5) * scale); roundRect(ctx, x, y, w, h, r); ctx.stroke();
  const size = Math.min(h * 0.42, 24 * scale);
  ctx.fillStyle = "#0B1220"; ctx.font = font(size); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(s.text ?? "", x + w / 2, y + h / 2, w - 16 * scale);
  if (s.mark) {
    const br = 13 * scale, cx = x + w - br * 0.6, cy = y + br * 0.6;
    ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.fillStyle = s.mark === "ok" ? "#16A34A" : "#DC2626"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * scale; ctx.lineCap = "round"; ctx.beginPath();
    if (s.mark === "ok") { ctx.moveTo(cx - br * 0.45, cy); ctx.lineTo(cx - br * 0.1, cy + br * 0.38); ctx.lineTo(cx + br * 0.5, cy - br * 0.38); }
    else { ctx.moveTo(cx - br * 0.4, cy - br * 0.4); ctx.lineTo(cx + br * 0.4, cy + br * 0.4); ctx.moveTo(cx + br * 0.4, cy - br * 0.4); ctx.lineTo(cx - br * 0.4, cy + br * 0.4); }
    ctx.stroke();
  }
}
