// A learner's marked paper as a PDF: every page of the paper with their
// writing and the teacher's marking on it, the mark for each page, the
// teacher's comments, and the total — to keep, print or send home.
// Runs in the browser (it draws the pages on a canvas).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { drawStrokes, type Stroke } from "@/lib/whiteboard";
import { safe } from "@/lib/examPdf";
import type { PageNote } from "@/lib/examAnnotate";

export type MarkedPageData = { title: string; img: string | null; ink: Stroke[]; teacher: PageNote; mark: number | null; marks: number; text?: string };
export type MarkedPaper = { exam: string; name: string; date: string; pages: MarkedPageData[]; score: number | null; total: number | null };

const A4: [number, number] = [595.28, 841.89], M = 36;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i); i.onerror = () => ok(null);
    i.src = src;
  });
}
function layer(strokes: Stroke[], w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  drawStrokes(c.getContext("2d")!, strokes, w, h);
  return c;
}
// One page, drawn: the paper, their writing, then the teacher's on top.
export async function drawMarkedPage(p: MarkedPageData): Promise<Blob> {
  const img = p.img ? await loadImage(p.img) : null;
  const w = 1240, h = img?.naturalWidth ? Math.round(w * (img.naturalHeight / img.naturalWidth)) : Math.round(w * (800 / 1200));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  if (img) ctx.drawImage(img, 0, 0, w, h);
  ctx.drawImage(layer(p.ink, w, h), 0, 0);
  ctx.drawImage(layer(p.teacher.ink, w, h), 0, 0);
  return new Promise<Blob>((ok, no) => {
    try { c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't draw a page"))), "image/jpeg", 0.85); } catch (e) { no(e instanceof Error ? e : new Error("Couldn't draw a page")); }
  });
}

export async function markedPaperPdf(paper: MarkedPaper, onStep?: (msg: string) => void): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [f, b] = await Promise.all([doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold)]);
  const INK = rgb(0.06, 0.14, 0.15), MUTED = rgb(0.35, 0.42, 0.43), RED = rgb(0.76, 0.27, 0.11);
  for (const [k, p] of paper.pages.entries()) {
    onStep?.(`Page ${k + 1} of ${paper.pages.length}…`);
    const page = doc.addPage(A4);
    let y = A4[1] - M;
    page.drawText(safe(`${paper.name} - ${paper.exam}`).slice(0, 80), { x: M, y: y - 12, size: 12, font: b, color: INK });
    const markText = p.mark == null ? "not marked" : `${p.mark} / ${p.marks}`;
    page.drawText(safe(markText), { x: A4[0] - M - b.widthOfTextAtSize(safe(markText), 16), y: y - 14, size: 16, font: b, color: RED });
    y -= 28;
    const sub = `${p.title} - ${paper.date}${k === 0 && paper.score != null && paper.total != null ? ` - Total: ${paper.score} / ${paper.total}` : ""}`;
    page.drawText(safe(sub).slice(0, 110), { x: M, y: y - 9, size: 9, font: f, color: MUTED });
    y -= 18;
    // The teacher's comment (and anything typed), under the heading.
    const lines: string[] = [];
    const wrap = (label: string, text: string) => {
      let line = label;
      for (const word of safe(text).split(/\s+/).filter(Boolean)) {
        if (f.widthOfTextAtSize(`${line} ${word}`, 10) > A4[0] - 2 * M) { lines.push(line); line = `   ${word}`; } else line = `${line} ${word}`;
      }
      lines.push(line);
    };
    if (p.teacher.note) wrap("Teacher:", p.teacher.note);
    if (p.text?.trim()) wrap("Typed:", p.text.trim());
    for (const l of lines.slice(0, 8)) { page.drawText(l, { x: M, y: y - 10, size: 10, font: l.startsWith("Teacher:") ? b : f, color: INK }); y -= 13; }
    y -= 4;
    const jpg = await doc.embedJpg(new Uint8Array(await (await drawMarkedPage(p)).arrayBuffer()));
    const room = { w: A4[0] - 2 * M, h: y - M }, s = Math.min(room.w / jpg.width, room.h / jpg.height);
    const w = jpg.width * s, h = jpg.height * s;
    page.drawImage(jpg, { x: (A4[0] - w) / 2, y: y - h, width: w, height: h });
    page.drawRectangle({ x: (A4[0] - w) / 2, y: y - h, width: w, height: h, borderColor: rgb(0.8, 0.84, 0.85), borderWidth: 0.6 });
  }
  if (!paper.pages.length) doc.addPage(A4).drawText("No pages were handed in.", { x: M, y: A4[1] - M - 14, size: 12, font: f });
  return doc.save();
}
