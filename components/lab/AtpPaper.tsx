"use client";
// The exam builder's "IGCSE practical paper" (lib/lab/atp.ts): choose the
// science, optionally the practicals, and a fresh Alternative to Practical
// paper is made — its figures (instrument close-ups, results tables) drawn
// here as pictures and uploaded like a paper's pages, so every phone shows
// them with the questions.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { ExamQ } from "@/lib/exams";
import type { Table } from "@/lib/lab/bench/types";
import { ALL_PRACTICALS } from "@/lib/lab/bench/all";
import { ATP_SUBJECTS, buildAtp, type AtpFigure, type AtpPaper, type AtpSubject } from "@/lib/lab/atp";
import { BenchDefs, closeup } from "@/components/lab/bench/Apparatus";
import { sendSlides } from "@/components/live/board/slides";

export const canZoom = (it: Parameters<typeof closeup>[0]) => { try { return !!closeup(it); } catch { return false; } };

const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const toJpeg = (c: HTMLCanvasElement) => new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't draw a figure"))), "image/jpeg", 0.9));

// An instrument's scale, close up — the bench's own lens, drawn big on a white page.
async function lensPicture(f: Extract<AtpFigure, { kind: "lens" }>): Promise<Blob> {
  const c = closeup(f.item);
  if (!c) throw new Error("No close-up for that instrument");
  // Drawn just as the bench's lens draws it (radius 115), then enlarged.
  const W = 900, H = 700, cx = 450, cy = 370, r = 280, LENS = 115, k = r / LENS;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:700px;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(
      <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: FONT }}>
        <rect width={W} height={H} fill="#fff" />
        <BenchDefs />
        <circle cx={cx} cy={cy} r={r + 8} fill="#0B1220" stroke="#334155" strokeWidth={6} />
        <g transform={`translate(${cx},${cy}) scale(${k})`}>
          <clipPath id="atp-lens"><circle cx={0} cy={0} r={LENS} /></clipPath>
          <g clipPath="url(#atp-lens)"><rect x={-LENS} y={-LENS} width={2 * LENS} height={2 * LENS} fill="#22355F" />{c.draw(0, 0, LENS)}</g>
        </g>
        <text x={W / 2} y={44} textAnchor="middle" fontSize={30} fontWeight={800} fill="#0F172A">{f.caption}</text>
      </svg>,
    ));
    const svg = host.innerHTML;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error("Couldn't draw a figure")); img.src = url; });
      const cv = document.createElement("canvas"); cv.width = W * 1.5; cv.height = H * 1.5;
      const ctx = cv.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      return await toJpeg(cv);
    } finally { URL.revokeObjectURL(url); }
  } finally { root.unmount(); host.remove(); }
}

// A results table, ruled like the paper's, with the cells to fill in left empty.
async function tablePicture(f: Extract<AtpFigure, { kind: "table" }>): Promise<Blob> {
  const t: Table = f.table, blanks = new Set(f.blanks.map(([r, c]) => `${r}:${c}`));
  const cv = document.createElement("canvas"), ctx = cv.getContext("2d")!;
  const size = 26, padX = 22, rowH = 58, top = 96;
  ctx.font = `700 ${size}px ${FONT}`;
  const cell = (v: string | number) => String(v);
  const widths = t.columns.map((h, ci) => Math.max(140, ctx.measureText(h).width + padX * 2, ...t.rows.map((r) => ctx.measureText(cell(r[ci] ?? "")).width + padX * 2)));
  const W = Math.max(900, widths.reduce((a, b) => a + b, 0) + 80), H = top + rowH * (t.rows.length + 1) + 50;
  cv.width = W; cv.height = H;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0F172A"; ctx.font = `800 30px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(f.caption, W / 2, 46);
  const x0 = (W - widths.reduce((a, b) => a + b, 0)) / 2;
  const rows: (string | number)[][] = [t.columns, ...t.rows];
  rows.forEach((r, ri) => {
    let x = x0;
    const y = top + ri * rowH;
    widths.forEach((w, ci) => {
      const blank = ri > 0 && blanks.has(`${ri - 1}:${ci}`);
      ctx.fillStyle = ri === 0 ? "#E2E8F0" : blank ? "#FFFBEB" : "#fff";
      ctx.fillRect(x, y, w, rowH);
      ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, rowH);
      if (!blank) { ctx.fillStyle = "#0F172A"; ctx.font = `${ri === 0 || ci === 0 ? 800 : 600} ${size}px ${FONT}`; ctx.fillText(cell(r[ci] ?? ""), x + w / 2, y + rowH / 2); }
      x += w;
    });
  });
  return toJpeg(cv);
}

const pictureOf = (f: AtpFigure) => (f.kind === "lens" ? lensPicture(f) : tablePicture(f));

// Draw every figure and upload them; the paper's questions get their pictures.
export async function paperQuestions(paper: AtpPaper, sessionId: string, onStep: (m: string) => void): Promise<ExamQ[]> {
  const files: File[] = [];
  for (const [i, f] of paper.figures.entries()) {
    onStep(`Drawing figure ${i + 1} of ${paper.figures.length}…`);
    files.push(new File([await pictureOf(f)], `atp-${f.id.replace(/\W+/g, "-")}.jpg`, { type: "image/jpeg" }));
  }
  const urls = files.length ? await sendSlides({ sessionId }, files, 40, (m) => onStep(m.replace(/slides?/g, (w) => (w === "slide" ? "figure" : "figures")))) : [];
  if (urls.some((u) => !u)) throw new Error("Some figures didn't upload — check the internet and try again");
  const urlOf = new Map(paper.figures.map((f, i) => [f.id, urls[i]!]));
  return paper.questions.map(({ fig, ...q }) => ({ ...q, ...(fig && urlOf.get(fig) ? { img: urlOf.get(fig) } : {}) }));
}

export default function AtpBuilder({ sessionId, onPaper }: { sessionId: string; onPaper: (qs: ExamQ[], p: AtpPaper) => void }) {
  const [subject, setSubject] = useState<AtpSubject>("physics");
  const [picks, setPicks] = useState<string[]>([]);
  const [choose, setChoose] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const pool = ALL_PRACTICALS.filter((p) => p.subject === subject);
  async function make() {
    setNote(null); setBusy("Setting the paper…");
    try {
      const paper = buildAtp(subject, { picks: picks.length ? picks : undefined, zoomable: canZoom });
      if (!paper.questions.length) throw new Error("Those practicals don't give enough questions — choose others");
      const qs = await paperQuestions(paper, sessionId, setBusy);
      onPaper(qs, paper);
      setNote(`✓ ${paper.title}: ${paper.questions.length} questions, ${paper.marks} marks, ${paper.minutes} minutes — from ${paper.used.map((s) => pool.find((p) => p.slug === s)?.title ?? s).join(", ")}, then a planning question. Check it below. Readings, tables and graphs mark themselves; written answers come to you with the mark scheme.`);
    } catch (e) {
      setNote(`Couldn't make the paper (${e instanceof Error ? e.message : e}).`);
    } finally { setBusy(null); }
  }
  return (
    <section aria-label="IGCSE practical paper" className="mt-4 rounded-xl bg-[#F0F9FF] p-3 ring-1 ring-[#BAE6FD]">
      <p className="text-xs font-black text-[#075985]">🧪 IGCSE practical paper — Alternative to Practical (Paper 6 style)</p>
      <p className="mt-0.5 text-[11px] font-semibold text-[#075985]/80">Made from the lab&apos;s practicals, with new readings every time: read instruments from diagrams, complete the results table, plot the graph, work out the gradient, evaluate the method, and plan an experiment. One hour, about 40 marks.</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Science">
        {(Object.keys(ATP_SUBJECTS) as AtpSubject[]).map((s) => (
          <button key={s} type="button" aria-pressed={subject === s} onClick={() => { setSubject(s); setPicks([]); }}
            className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 ${subject === s ? "bg-[#0369A1] text-white ring-[#0369A1]" : "bg-white text-[#075985] ring-[#BAE6FD]"}`}>{ATP_SUBJECTS[s].label} {ATP_SUBJECTS[s].code}</button>
        ))}
        <button type="button" onClick={() => setChoose((v) => !v)} aria-expanded={choose} className="min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-[#075985] ring-1 ring-[#BAE6FD]">{picks.length ? `${picks.length} practical${picks.length === 1 ? "" : "s"} chosen` : "Choose the practicals (optional)"}</button>
        <button type="button" onClick={make} disabled={!!busy} className="min-h-[40px] rounded-xl bg-[#0369A1] px-4 text-xs font-black text-white disabled:opacity-60">{busy ? "Making the paper…" : "Make the paper"}</button>
      </div>
      {choose && (
        <fieldset className="mt-2 grid gap-1 rounded-lg bg-white p-2 ring-1 ring-[#BAE6FD] sm:grid-cols-2">
          <legend className="sr-only">Practicals to use</legend>
          {pool.map((p) => (
            <label key={p.slug} className="flex items-center gap-2 text-xs font-bold text-ink/80">
              <input type="checkbox" checked={picks.includes(p.slug)} onChange={(e) => setPicks((cur) => (e.target.checked ? [...cur, p.slug].slice(0, 4) : cur.filter((x) => x !== p.slug)))} className="h-4 w-4 accent-[#0369A1]" />{p.title}
            </label>
          ))}
          <p className="text-[11px] text-ink/55 sm:col-span-2">Up to 4. Leave them all unticked and the paper picks practicals with a graph to plot.</p>
        </fieldset>
      )}
      {(busy || note) && <p role="status" className="mt-2 text-xs font-bold text-[#075985]">{busy ?? note}</p>}
    </section>
  );
}
