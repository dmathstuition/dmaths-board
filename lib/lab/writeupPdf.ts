// BROWSER (and tests) — a practical's write-up as a PDF (pdf-lib): the page a
// learner keeps in their practical file. Aim, safety, method, results (with
// any repeats), the graph, observations, conclusion, and the exam-style
// questions with the learner's answers.
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { safe } from "@/lib/examPdf";
import { tablesOf } from "@/lib/lab/bench/run";
import type { Graph, Practical, Table } from "@/lib/lab/bench/types";
import type { ExamQ } from "@/lib/lab/bench/exam";

export type WriteupInput = {
  p: Practical; s: any; values: Record<string, string>; notes: Record<number, string>;
  step: number;            // how far they got
  shown: string[];         // readings filled in for them
  name?: string; date: string; school?: string;
  exam?: { q: ExamQ; picked: string | null }[] | null; // their answers, once marked
  mine?: string[];         // observations they wrote themselves
};

const A4: [number, number] = [595.28, 841.89];
const M = 44;
const TEAL = rgb(0.055, 0.431, 0.447), DEEP = rgb(0.039, 0.31, 0.322), INK = rgb(0.059, 0.137, 0.149), MUTED = rgb(0.38, 0.45, 0.47);
const MINT = rgb(0.933, 0.969, 0.965), RULE = rgb(0.8, 0.86, 0.86), GREEN = rgb(0.086, 0.5, 0.24), RED = rgb(0.72, 0.11, 0.11), LIME = rgb(0.776, 0.953, 0.361);
const SERIES = [rgb(0.73, 0.11, 0.11), rgb(0.15, 0.39, 0.92), rgb(0.09, 0.64, 0.29), rgb(0.58, 0.2, 0.92)];
const SUBJECT: Record<string, string> = { maths: "Mathematics", physics: "Physics", chemistry: "Chemistry", biology: "Biology" };

// Science writing uses a few characters the standard PDF fonts don't have.
const MORE: Record<string, string> = { "Ω": " ohm", "λ": "lambda", "ρ": "rho", "μ": "µ", "⁺": "+", "⁻": "-", "⁰": "0", "⁴": "4", "²⁺": "2+", "³⁺": "3+",
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "✓": "", "≈": "~" };
export const pdfText = (s: string) => safe(String(s ?? "").replace(/²⁺|³⁺|[Ωλρμ⁺⁻⁰⁴₀-₉✓≈]/g, (c) => MORE[c] ?? c));

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = pdfText(text).split(/\s+/).filter(Boolean), lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) <= width) { line = t; continue; }
    if (line) lines.push(line);
    let rest = w;
    while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
      let k = rest.length;
      while (k > 1 && font.widthOfTextAtSize(rest.slice(0, k), size) > width) k--;
      lines.push(rest.slice(0, k)); rest = rest.slice(k);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type Ctx = { doc: PDFDocument; page: PDFPage; y: number; f: PDFFont; b: PDFFont; i: PDFFont; title: string; pages: number };
const W = A4[0] - M * 2;
function newPage(c: Ctx) {
  c.page = c.doc.addPage(A4); c.pages++;
  const [w, h] = A4;
  if (c.pages === 1) return void (c.y = h - M);
  c.page.drawText(pdfText(`${c.title} - continued`), { x: M, y: h - 30, size: 9, font: c.b, color: MUTED });
  c.page.drawLine({ start: { x: M, y: h - 36 }, end: { x: w - M, y: h - 36 }, thickness: 0.5, color: RULE });
  c.y = h - 50;
}
const need = (c: Ctx, h: number) => { if (c.y - h < 46) newPage(c); };
function text(c: Ctx, s: string, o: { size?: number; font?: PDFFont; color?: RGB; x?: number; width?: number; gap?: number } = {}) {
  const size = o.size ?? 10, font = o.font ?? c.f, x = o.x ?? M, width = o.width ?? W;
  for (const line of wrap(s, font, size, width)) {
    need(c, size * 1.4);
    c.page.drawText(line, { x, y: c.y - size, size, font, color: o.color ?? INK });
    c.y -= size * 1.38;
  }
  c.y -= o.gap ?? 0;
}
function heading(c: Ctx, s: string) {
  need(c, 40); c.y -= 6;
  c.page.drawRectangle({ x: M, y: c.y - 17, width: 3, height: 15, color: TEAL });
  c.page.drawText(pdfText(s), { x: M + 9, y: c.y - 14, size: 12.5, font: c.b, color: DEEP });
  c.y -= 24;
}

function table(c: Ctx, t: Table) {
  const n = t.columns.length, size = 8.5, line = size * 1.3, pad = 4;
  // The first column (a label) gets more room when it holds words.
  const first = t.rows.some((r) => String(r[0] ?? "").length > 12) ? Math.min(W * 0.45, W / n * 1.8) : W / n;
  const widths = t.columns.map((_, i) => (i === 0 ? first : (W - first) / Math.max(1, n - 1)));
  const fit = n === 1 ? [W] : widths;
  text(c, t.title, { size: 9.5, font: c.b, gap: 2 });
  const row = (cells: (string | number)[], head: boolean) => {
    const wrapped = cells.map((cell, k) => wrap(String(cell ?? ""), head || k === 0 ? c.b : c.f, size, fit[k] - pad * 2));
    const h = Math.max(...wrapped.map((l) => l.length)) * line + pad * 2;
    need(c, h);
    if (head) c.page.drawRectangle({ x: M, y: c.y - h, width: W, height: h, color: MINT });
    let x = M;
    wrapped.forEach((lines, k) => {
      lines.forEach((s, j) => c.page.drawText(s, { x: x + pad, y: c.y - pad - size - j * line + 1.5, size, font: head || k === 0 ? c.b : c.f, color: INK }));
      c.page.drawRectangle({ x, y: c.y - h, width: fit[k], height: h, borderColor: RULE, borderWidth: 0.6 });
      x += fit[k];
    });
    c.y -= h;
  };
  row(t.columns, true);
  t.rows.forEach((r) => row(r, false));
  c.y -= 10;
}

// A graph as it's drawn in an exercise book: grid, axes, crosses, line of best fit.
function niceStep(x: number) { const k = 10 ** Math.floor(Math.log10(x)), f = x / k; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * k; }
const tidy = (v: number) => String(Number(v.toFixed(6)));
function graph(c: Ctx, g: Graph) {
  const gw = W * 0.78, gh = 230, left = M + 46, bottom = 34;
  need(c, gh + bottom + 30);
  text(c, g.title, { size: 9.5, font: c.b, gap: 4 });
  const series = g.more ? [{ label: g.label ?? "", points: g.points }, ...g.more] : [{ label: "", points: g.points }];
  const all = [...series.flatMap((s) => s.points), ...(g.line ?? [])];
  const axis = (vals: number[]) => { let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals); if (hi === lo) hi = lo + 1; const st = niceStep((hi - lo) / 6); return { lo: Math.floor(lo / st + 1e-9) * st, hi: Math.ceil(hi / st - 1e-9) * st, st }; };
  const ax = axis(all.map((p) => p[0])), ay = axis(all.map((p) => p[1]));
  const y0 = c.y - gh;
  const X = (v: number) => left + ((v - ax.lo) / (ax.hi - ax.lo)) * (gw - 46);
  const Y = (v: number) => y0 + ((v - ay.lo) / (ay.hi - ay.lo)) * (gh - 10);
  for (let v = ax.lo; v <= ax.hi + ax.st / 2; v += ax.st) {
    const x = X(v); c.page.drawLine({ start: { x, y: Y(ay.lo) }, end: { x, y: Y(ay.hi) }, thickness: 0.4, color: rgb(0.8, 0.9, 0.9) });
    const s = tidy(v); c.page.drawText(s, { x: x - c.f.widthOfTextAtSize(s, 7.5) / 2, y: Y(ay.lo) - 11, size: 7.5, font: c.f, color: MUTED });
  }
  for (let v = ay.lo; v <= ay.hi + ay.st / 2; v += ay.st) {
    const y = Y(v); c.page.drawLine({ start: { x: X(ax.lo), y }, end: { x: X(ax.hi), y }, thickness: 0.4, color: rgb(0.8, 0.9, 0.9) });
    const s = tidy(v); c.page.drawText(s, { x: X(ax.lo) - 4 - c.f.widthOfTextAtSize(s, 7.5), y: y - 2.5, size: 7.5, font: c.f, color: MUTED });
  }
  const zx = Math.min(Math.max(0, ax.lo), ax.hi), zy = Math.min(Math.max(0, ay.lo), ay.hi);
  c.page.drawLine({ start: { x: X(zx), y: Y(ay.lo) }, end: { x: X(zx), y: Y(ay.hi) }, thickness: 1.1, color: INK });
  c.page.drawLine({ start: { x: X(ax.lo), y: Y(zy) }, end: { x: X(ax.hi), y: Y(zy) }, thickness: 1.1, color: INK });
  if (g.line) c.page.drawLine({ start: { x: X(g.line[0][0]), y: Y(g.line[0][1]) }, end: { x: X(g.line[1][0]), y: Y(g.line[1][1]) }, thickness: 1.2, color: TEAL });
  series.forEach((s, k) => {
    const col = SERIES[k % SERIES.length];
    if (g.more) s.points.forEach((p, i) => { if (i) c.page.drawLine({ start: { x: X(s.points[i - 1][0]), y: Y(s.points[i - 1][1]) }, end: { x: X(p[0]), y: Y(p[1]) }, thickness: 0.8, color: col, opacity: 0.5 }); });
    for (const [px, py] of s.points) {
      const x = X(px), y = Y(py);
      c.page.drawLine({ start: { x: x - 3.5, y: y - 3.5 }, end: { x: x + 3.5, y: y + 3.5 }, thickness: 1.2, color: col });
      c.page.drawLine({ start: { x: x - 3.5, y: y + 3.5 }, end: { x: x + 3.5, y: y - 3.5 }, thickness: 1.2, color: col });
    }
    if (g.more) {
      const ky = y0 + gh - 8 - k * 12;
      c.page.drawRectangle({ x: left + gw - 40, y: ky, width: 7, height: 7, color: col });
      c.page.drawText(pdfText(s.label), { x: left + gw - 29, y: ky, size: 8, font: c.b, color: INK });
    }
  });
  const xl = pdfText(g.x);
  c.page.drawText(xl, { x: X((ax.lo + ax.hi) / 2) - c.b.widthOfTextAtSize(xl, 8.5) / 2, y: y0 - 26, size: 8.5, font: c.b, color: INK });
  c.page.drawText(pdfText(g.y), { x: M + 14, y: y0 + gh / 2 - c.b.widthOfTextAtSize(pdfText(g.y), 8.5) / 2, size: 8.5, font: c.b, color: INK, rotate: degrees(90) });
  c.y = y0 - bottom - 8;
}

export async function makeWriteup(o: WriteupInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfText(`${o.p.title} - practical write-up`)); doc.setCreator("D-Maths Board"); doc.setProducer("D-Maths Board");
  const c: Ctx = { doc, page: null as unknown as PDFPage, y: 0, f: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique), title: o.p.title, pages: 0 };
  newPage(c);
  const [pw, ph] = A4, finished = o.step >= o.p.steps.length;
  // Header band
  c.page.drawRectangle({ x: 0, y: ph - 96, width: pw, height: 96, color: TEAL });
  c.page.drawText("D-Maths Board  |  Practical write-up", { x: M, y: ph - 30, size: 9.5, font: c.b, color: LIME });
  const title = wrap(o.p.title, c.b, 20, W)[0];
  c.page.drawText(title, { x: M, y: ph - 56, size: 20, font: c.b, color: rgb(1, 1, 1) });
  c.page.drawText(pdfText(`${SUBJECT[o.p.subject] ?? o.p.subject}  |  ${o.date}${o.school ? `  |  ${o.school}` : ""}`), { x: M, y: ph - 76, size: 9.5, font: c.f, color: rgb(0.86, 0.96, 0.95) });
  c.y = ph - 118;
  // Name line (blank to write in by hand when it isn't known)
  c.page.drawText("Name:", { x: M, y: c.y - 10, size: 10, font: c.b, color: INK });
  if (o.name) c.page.drawText(pdfText(o.name).slice(0, 60), { x: M + 38, y: c.y - 10, size: 10, font: c.f, color: INK });
  else c.page.drawLine({ start: { x: M + 38, y: c.y - 12 }, end: { x: M + 260, y: c.y - 12 }, thickness: 0.6, color: MUTED });
  c.page.drawText("Class:", { x: M + 290, y: c.y - 10, size: 10, font: c.b, color: INK });
  c.page.drawLine({ start: { x: M + 326, y: c.y - 12 }, end: { x: pw - M, y: c.y - 12 }, thickness: 0.6, color: MUTED });
  c.y -= 26;
  if (!finished) text(c, `Not finished yet: ${o.step} of ${o.p.steps.length} steps done.`, { font: c.b, color: RED, gap: 2 });

  heading(c, "Aim");
  text(c, o.p.aim, { gap: 2 });
  heading(c, "Safety");
  o.p.safety.forEach((s) => text(c, `-  ${s}`, { x: M + 4, width: W - 4 }));
  heading(c, "Method");
  let n = 0, group: string | undefined;
  o.p.steps.forEach((st) => {
    if (st.action.type === "record") return; // readings and calculations go under Results
    if (st.group && st.group !== group) { group = st.group; text(c, st.group, { size: 9, font: c.b, color: MUTED }); }
    n++; text(c, `${n}.  ${st.title}`, { x: M + 4, width: W - 4 });
  });

  heading(c, "Results");
  tablesOf(o.p, o.s, o.values, o.step).forEach((t) => table(c, t));
  // Readings and answers worked out on the way (the calculations).
  const worked = o.p.steps.slice(0, o.step).flatMap((st) => (st.action.type === "record" ? st.action.fields : []))
    .filter((f) => o.values[f.key] != null && !f.options);
  if (worked.length) table(c, { title: "Readings and calculations", columns: ["", "Value"], rows: worked.map((f) => [f.label, `${o.values[f.key]}${f.unit ? ` ${f.unit}` : ""}${o.shown.includes(f.key) ? "  (given)" : ""}`]) });
  const g = o.p.graph?.(o.s, o.values);
  if (g && g.points.length) graph(c, g);

  const seen = Object.entries(o.notes).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, v]) => v);
  if (o.mine?.length) { heading(c, "My observations"); o.mine.forEach((s) => text(c, `-  ${s}`, { x: M + 4, width: W - 4, size: 9.5 })); }
  if (seen.length) { heading(c, o.mine?.length ? "From the protocol" : "Observations"); seen.forEach((s) => text(c, `-  ${s}`, { x: M + 4, width: W - 4, size: 9.5 })); }
  const answers = o.p.steps.slice(0, o.step).flatMap((st) => (st.action.type === "record" ? st.action.fields : [])).filter((f) => f.options && o.values[f.key] != null);
  if (answers.length) { heading(c, "Findings"); answers.forEach((f) => text(c, `${f.label}: ${o.values[f.key]}${o.shown.includes(f.key) ? "  (given)" : ""}`, { size: 9.5 })); }

  heading(c, "Conclusion");
  text(c, finished ? o.p.conclusion(o.s, o.values) : "Finish the practical to write the conclusion.", { gap: 2 });

  if (o.exam?.length) {
    const score = o.exam.filter((x) => x.picked === x.q.right).length;
    heading(c, `Exam-style questions  (${score} / ${o.exam.length})`);
    o.exam.forEach((x, k) => {
      const ok = x.picked === x.q.right;
      text(c, `${k + 1}.  ${x.q.q}`, { font: c.b, size: 9.5 });
      text(c, `Your answer: ${x.picked ?? "(none)"}   ${ok ? "- right" : "- wrong"}`, { x: M + 14, width: W - 14, size: 9, color: ok ? GREEN : RED });
      if (!ok) text(c, `Answer: ${x.q.right}`, { x: M + 14, width: W - 14, size: 9 });
      text(c, x.q.why, { x: M + 14, width: W - 14, size: 8.5, font: c.i, color: MUTED, gap: 4 });
    });
  }

  if (o.shown.length) text(c, `"(given)": the answer was filled in after three tries, or by "Show me the answer".`, { size: 8, color: MUTED });
  // Footer on every page
  doc.getPages().forEach((pg, k, all) => {
    pg.drawText(pdfText(`Made on D-Maths Board (dmaths.academy)  |  Virtual practical: ${o.p.title}`), { x: M, y: 24, size: 7.5, font: c.f, color: MUTED });
    const s = `Page ${k + 1} of ${all.length}`;
    pg.drawText(s, { x: pw - M - c.f.widthOfTextAtSize(s, 7.5), y: 24, size: 7.5, font: c.f, color: MUTED });
  });
  return doc.save();
}

// Save it on the device.
export function downloadPdf(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = `${name.replace(/[^\w\s.-]+/g, "").trim() || "practical"}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
