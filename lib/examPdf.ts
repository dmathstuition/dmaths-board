// BROWSER — exam reports as PDF files (pdf-lib), made on the teacher's device:
// one learner's report, or the whole class (a summary page, then a page per
// learner). Content comes from lib/examReport.ts.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ordinal, type ClassReport, type LearnerReport } from "@/lib/examReport";

export type ReportMeta = { className: string; examTitle: string; date: string; teacher?: string };

const A4: [number, number] = [595.28, 841.89];
const M = 40; // margin
const TEAL = rgb(0.055, 0.431, 0.447), DEEP = rgb(0.039, 0.31, 0.322), INK = rgb(0.059, 0.137, 0.149), MUTED = rgb(0.33, 0.42, 0.43);
const MINT = rgb(0.886, 0.953, 0.949), RULE = rgb(0.867, 0.906, 0.906), GREEN = rgb(0.086, 0.5, 0.24), RED = rgb(0.76, 0.27, 0.11), LIME = rgb(0.776, 0.953, 0.361);

// The standard PDF fonts only have Western characters: write maths symbols in words.
const SWAP: Record<string, string> = {
  "−": "-", "–": "-", "—": "-", "√": "sqrt", "θ": "theta", "π": "pi", "∠": "angle ", "≈": "~", "≤": "<=", "≥": ">=", "≠": "!=",
  "’": "'", "‘": "'", "“": '"', "”": '"', "…": "...", "³": "^3", "→": "->", "₂": "2", "₁": "1", "α": "alpha", "β": "beta", "Δ": "delta", "∞": "infinity",
};
export function safe(s: string): string {
  return String(s ?? "").replace(/[^\x20-\x7E\xA0-\xFF]/g, (c) => SWAP[c] ?? (c === "\n" ? " " : "?"));
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(tryLine, size) <= width) { line = tryLine; continue; }
    if (line) lines.push(line);
    // A single word too long for the column: cut it.
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

type Ctx = { doc: PDFDocument; page: PDFPage; y: number; f: PDFFont; b: PDFFont; meta: ReportMeta };
function newPage(c: Ctx, heading: string) {
  c.page = c.doc.addPage(A4);
  const [w, h] = A4;
  c.page.drawRectangle({ x: 0, y: h - 74, width: w, height: 74, color: TEAL });
  c.page.drawText("D-Maths Board  |  Exam report", { x: M, y: h - 30, size: 10, font: c.b, color: LIME });
  c.page.drawText(safe(heading).slice(0, 70), { x: M, y: h - 52, size: 18, font: c.b, color: rgb(1, 1, 1) });
  const sub = safe(`${c.meta.examTitle}  |  ${c.meta.className}  |  ${c.meta.date}`);
  c.page.drawText(sub.slice(0, 110), { x: M, y: h - 67, size: 9, font: c.f, color: rgb(0.85, 0.95, 0.95) });
  c.page.drawText(safe(`Made on D-Maths Board (dmaths.academy)${c.meta.teacher ? `  |  Teacher: ${c.meta.teacher}` : ""}`), { x: M, y: 22, size: 8, font: c.f, color: MUTED });
  c.y = h - 96;
}
const need = (c: Ctx, h: number, heading: string) => { if (c.y - h < 40) newPage(c, heading); };
function text(c: Ctx, s: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) {
  const size = o.size ?? 10, font = o.bold ? c.b : c.f, x = o.x ?? M, width = o.width ?? A4[0] - M * 2;
  for (const line of wrap(s, font, size, width)) {
    c.page.drawText(line, { x, y: c.y - size, size, font, color: o.color ?? INK });
    c.y -= size * 1.35;
  }
  c.y -= o.gap ?? 0;
}
function boxes(c: Ctx, cells: [string, string][]) {
  const w = (A4[0] - M * 2 - (cells.length - 1) * 8) / cells.length, h = 50;
  cells.forEach(([label, value], i) => {
    const x = M + i * (w + 8);
    c.page.drawRectangle({ x, y: c.y - h, width: w, height: h, color: MINT });
    c.page.drawText(safe(label).toUpperCase(), { x: x + 8, y: c.y - 14, size: 7, font: c.b, color: DEEP });
    const v = safe(value);
    let size = 17; while (size > 9 && c.b.widthOfTextAtSize(v, size) > w - 14) size--;
    c.page.drawText(v, { x: x + 8, y: c.y - 38, size, font: c.b, color: INK });
  });
  c.y -= h + 12;
}

// A table with wrapped cells; repeats its header row on a new page.
function table(c: Ctx, heading: string, cols: { title: string; w: number; align?: "right" }[], rows: { cells: string[]; colors?: (ReturnType<typeof rgb> | undefined)[]; bold?: boolean[] }[]) {
  const size = 8.5, line = size * 1.3, pad = 4;
  const head = () => {
    need(c, 24, heading);
    let x = M;
    c.page.drawRectangle({ x: M, y: c.y - 16, width: A4[0] - M * 2, height: 16, color: DEEP });
    for (const col of cols) { c.page.drawText(safe(col.title), { x: x + pad, y: c.y - 11.5, size: 7.5, font: c.b, color: rgb(1, 1, 1) }); x += col.w; }
    c.y -= 16;
  };
  head();
  rows.forEach((r, ri) => {
    const wrapped = r.cells.map((cell, i) => wrap(cell, r.bold?.[i] ? c.b : c.f, size, cols[i].w - pad * 2));
    const h = Math.max(...wrapped.map((l) => l.length)) * line + pad * 2;
    if (c.y - h < 40) { newPage(c, heading); head(); }
    if (ri % 2) c.page.drawRectangle({ x: M, y: c.y - h, width: A4[0] - M * 2, height: h, color: rgb(0.97, 0.98, 0.98) });
    let x = M;
    wrapped.forEach((lines, i) => {
      lines.forEach((t, k) => {
        const font = r.bold?.[i] ? c.b : c.f;
        const tx = cols[i].align === "right" ? x + cols[i].w - pad - font.widthOfTextAtSize(t, size) : x + pad;
        c.page.drawText(t, { x: tx, y: c.y - pad - size - k * line + 1.5, size, font, color: r.colors?.[i] ?? INK });
      });
      x += cols[i].w;
    });
    c.y -= h;
    c.page.drawLine({ start: { x: M, y: c.y }, end: { x: A4[0] - M, y: c.y }, thickness: 0.5, color: RULE });
  });
  c.y -= 10;
}

function learnerPages(c: Ctx, r: LearnerReport) {
  newPage(c, r.name);
  boxes(c, [
    ["Score", `${r.score} / ${r.total}`], ["Percent", `${r.percent}%`], ["Grade", r.grade],
    ["Position", r.position ? `${ordinal(r.position)} of ${r.of}` : "-"],
  ]);
  boxes(c, [
    ["Class average", r.classAverage == null ? "-" : `${r.classAverage}%`], ["Best in class", r.best == null ? "-" : `${r.best}%`],
    ["Right / wrong / blank", `${r.right} / ${r.wrong} / ${r.blank}`], ["Time taken", r.minutes == null ? (r.submitted ? "-" : "Not handed in") : `${r.minutes} min`],
  ]);
  text(c, "Comment", { bold: true, size: 11, color: DEEP, gap: 2 });
  text(c, r.remark, { size: 10, gap: 6 });
  if (r.focus.length) {
    text(c, "To work on next", { bold: true, size: 11, color: DEEP, gap: 2 });
    r.focus.forEach((f) => text(c, `- ${f}`, { size: 9.5 }));
    c.y -= 6;
  }
  if (r.flags > 0) {
    text(c, `Left the exam page ${r.flags} time${r.flags === 1 ? "" : "s"}`, { bold: true, size: 10, color: RED });
    text(c, r.flagLog.map((f) => `${new Date(f.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ${f.reason}`).join("; "), { size: 8.5, color: MUTED, gap: 6 });
  }
  text(c, "Question by question", { bold: true, size: 11, color: DEEP, gap: 4 });
  table(c, r.name, [
    { title: "Q", w: 24 }, { title: "Question", w: 205 }, { title: "Their answer", w: 95 }, { title: "Correct answer", w: 95 }, { title: "Mark", w: 46 }, { title: "Class got it", w: 50, align: "right" },
  ], r.items.map((it) => ({
    cells: [String(it.n), it.q, it.blank ? "(no answer)" : it.given, it.correct, it.right ? `Right +${it.marks}` : it.blank ? "Blank" : "Wrong", it.classRight == null ? "-" : `${it.classRight}%`],
    colors: [MUTED, undefined, it.right ? GREEN : it.blank ? MUTED : RED, undefined, it.right ? GREEN : it.blank ? MUTED : RED, MUTED],
    bold: [false, false, false, false, true, false],
  })));
}

async function start(meta: ReportMeta): Promise<Ctx> {
  const doc = await PDFDocument.create();
  doc.setTitle(safe(`${meta.examTitle} — report`)); doc.setCreator("D-Maths Board"); doc.setProducer("D-Maths Board");
  const [f, b] = await Promise.all([doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold)]);
  return { doc, page: null as unknown as PDFPage, y: 0, f, b, meta };
}

export async function learnerPdf(meta: ReportMeta, r: LearnerReport): Promise<Uint8Array> {
  const c = await start(meta);
  learnerPages(c, r);
  return c.doc.save();
}

export async function classPdf(meta: ReportMeta, cr: ClassReport): Promise<Uint8Array> {
  const c = await start(meta);
  newPage(c, "Class summary");
  boxes(c, [["Took the exam", String(cr.takers)], ["Average", cr.average == null ? "-" : `${cr.average}%`], ["Best", cr.best == null ? "-" : `${cr.best}%`], ["Credit pass (C6+)", `${cr.passed} of ${cr.takers}`]]);
  // Grades as bars.
  text(c, "Grades", { bold: true, size: 11, color: DEEP, gap: 4 });
  const most = Math.max(1, ...cr.grades.map((g) => g.count)), barW = A4[0] - M * 2 - 70;
  for (const g of cr.grades) {
    c.page.drawText(g.grade, { x: M, y: c.y - 10, size: 9, font: c.b, color: INK });
    if (g.count) c.page.drawRectangle({ x: M + 28, y: c.y - 11, width: Math.max(2, (g.count / most) * barW), height: 9, color: g.grade.startsWith("F") || g.grade.startsWith("E") || g.grade.startsWith("D") ? RED : TEAL });
    c.page.drawText(String(g.count), { x: M + 34 + (g.count / most) * barW, y: c.y - 10, size: 9, font: c.f, color: MUTED });
    c.y -= 14;
  }
  c.y -= 8;
  text(c, "Question analysis — reteach the ones most of the class missed", { bold: true, size: 11, color: DEEP, gap: 4 });
  table(c, "Class summary", [{ title: "Q", w: 24 }, { title: "Question", w: 290 }, { title: "Correct answer", w: 115 }, { title: "Class got it", w: 86, align: "right" }],
    cr.items.map((it) => ({
      cells: [String(it.n), it.q, it.correct, it.classRight == null ? "-" : `${it.classRight}%${(it.classRight ?? 100) < 50 ? "  reteach" : ""}`],
      colors: [MUTED, undefined, undefined, (it.classRight ?? 100) < 50 ? RED : GREEN], bold: [false, false, false, true],
    })));
  text(c, "Results", { bold: true, size: 11, color: DEEP, gap: 4 });
  table(c, "Class summary", [{ title: "Position", w: 52 }, { title: "Learner", w: 190 }, { title: "Score", w: 70, align: "right" }, { title: "Percent", w: 60, align: "right" }, { title: "Grade", w: 50 }, { title: "Left the page", w: 93, align: "right" }],
    cr.learners.map((l) => ({
      cells: [l.position ? ordinal(l.position) : "-", l.name, `${l.score} / ${l.total}`, `${l.percent}%`, l.grade, l.flags ? `${l.flags}x` : "No"],
      colors: [MUTED, undefined, undefined, undefined, l.percent >= 50 ? GREEN : RED, l.flags ? RED : MUTED], bold: [false, true, false, false, true, false],
    })));
  for (const l of cr.learners) learnerPages(c, l);
  return c.doc.save();
}

// Save a PDF on this device.
export function savePdf(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename.replace(/[^\w .-]+/g, "").trim().slice(0, 90) || "report.pdf";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
