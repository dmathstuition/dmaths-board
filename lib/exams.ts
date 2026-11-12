// Exam mode: a timed test each learner takes on their own phone. Pure helpers
// shared by the server (marking — learners never receive the answers while
// the exam is open) and the teacher's screen (building the test).
import { question as numericQuestion, type Difficulty, type Skill } from "@/lib/games/generators";
import { choiceQuestion, type ChoiceSkill } from "@/lib/games/senior";
import { moreChoice, MORE_CHOICE, type MoreChoiceSkill } from "@/lib/games/moreMaths";
import { CLASS_GAMES } from "@/lib/games/catalog";
import { isSlideUrl, type Stroke } from "@/lib/whiteboard";
import { cleanAnswerStrokes } from "@/lib/answerBoards";

// kind "spell": a spelling test word. q is the whole sentence with the word in
// it (the teacher reads it out); learners see it with a gap. hear: learners may
// play the sentence on their own phone. img: a page of a real paper (uploaded
// like a slide) shown with the question.
// kind "page": a whole page of an uploaded paper that learners write on and the
// teacher marks by hand (marks = the most the page can earn).
// method (typed, 2+ marks): learners show their working; a wrong answer with
// working goes to the teacher, who can give the method marks (all but one).
// kind "written": a written answer (a reading paper's 1-, 2- and 3-mark
// questions) the teacher marks; answer = their mark-scheme notes (learners only
// see them afterwards).
// kind "graph": learners plot points on a grid and draw the line of best fit
// (an IGCSE practical paper). grid: the axes; answer: the points and line
// expected, as JSON ({"p":[[x,y],…],"m":gradient,"c":intercept}). Marked
// automatically: the plots, then the line.
export type Grid = { x: string; y: string; x0: number; x1: number; y0: number; y1: number; curve?: boolean }; // curve: join the points with a smooth curve (no straight line to mark)
// kind "bench": a practical test — the learner does the practical (bench.slug)
// on their own bench and records their readings; marked against their own
// bench by the server (lib/lab/benchExam.ts), which keeps the mark as `got`.
export type ExamQ = { q: string; kind: "choice" | "typed" | "spell" | "page" | "written" | "graph" | "bench"; options: string[]; answer: number | string; marks: number; img?: string; hear?: boolean; method?: boolean; grid?: Grid; bench?: { slug: string } };
export const MAX_BENCH_MARKS = 40;
export const MAX_EXAM_QUESTIONS = 60;
export const MAX_PAGE_MARKS = 20;
export const MAX_WRITTEN = 1500; // a written answer, in characters
export const MAX_BOOKLET = 40;   // pages in a reading booklet
export const EXAM_MINUTES = [5, 10, 15, 20, 30, 40, 45, 60, 90] as const;
// How long after the end an answer still counts (a slow connection).
export const GRACE_MS = 20_000;

const str = (v: unknown, n: number) => String(v ?? "").replace(/\r/g, "").slice(0, n);

export function cleanExamQuestions(v: unknown): ExamQ[] {
  if (!Array.isArray(v)) return [];
  const out: ExamQ[] = [];
  for (const raw of v.slice(0, MAX_EXAM_QUESTIONS)) {
    const x = raw as any;
    const q = str(x?.q, 400).trim();
    if (!q) continue;
    const marks = Math.max(1, Math.min(10, Math.round(Number(x?.marks) || 1)));
    const img = isSlideUrl(x?.img) ? { img: x.img as string } : {};
    if (x?.kind === "page") {
      if (img.img) out.push({ q, kind: "page", options: [], answer: "", marks: Math.max(1, Math.min(MAX_PAGE_MARKS, Math.round(Number(x?.marks) || 1))), img: img.img });
      continue;
    }
    if (x?.kind === "bench") {
      const slug = str(x?.bench?.slug, 60).trim();
      if (/^[a-z0-9-]+$/.test(slug)) out.push({ q, kind: "bench", options: [], answer: "", marks: Math.max(1, Math.min(MAX_BENCH_MARKS, Math.round(Number(x?.marks) || 1))), bench: { slug } });
      continue;
    }
    if (x?.kind === "graph") {
      const grid = cleanGrid(x?.grid), key = cleanGraphKey(x?.answer);
      if (grid && key) out.push({ q, kind: "graph", options: [], answer: JSON.stringify(key), marks: Math.max(2, marks), grid, ...img });
      continue;
    }
    if (x?.kind === "written") {
      out.push({ q, kind: "written", options: [], answer: str(x?.answer, 400).trim(), marks });
      continue;
    }
    if (x?.kind === "spell") {
      const answer = str(x?.answer, 60).trim();
      if (answer && /^[\p{L}' -]+$/u.test(answer)) out.push({ q, kind: "spell", options: [], answer, marks, ...(x?.hear === false ? {} : { hear: true }) });
      continue;
    }
    if (x?.kind === "typed") {
      const answer = str(x?.answer, 120).trim();
      if (answer) out.push({ q, kind: "typed", options: [], answer, marks, ...img, ...(x?.method === true && marks >= 2 ? { method: true } : {}) });
      continue;
    }
    const options = (Array.isArray(x?.options) ? x.options : []).map((o: unknown) => str(o, 160).trim()).filter(Boolean).slice(0, 6);
    const answer = Math.round(Number(x?.answer));
    if (options.length >= 2 && answer >= 0 && answer < options.length) out.push({ q, kind: "choice", options, answer, marks, ...img });
  }
  return out;
}

// ── Each learner gets the questions, and each question's options, in their own order ──
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(n: number, r: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// The order this learner sees: question numbers, and for each question the option numbers.
// inOrder: everyone gets the paper as it was set (a real paper, a spelling test).
export function learnerOrder(examId: string, studentId: string, qs: Pick<ExamQ, "options">[], inOrder = false): { order: number[]; opts: number[][] } {
  if (inOrder) return { order: qs.map((_, i) => i), opts: qs.map((q) => q.options.map((_, i) => i)) };
  const r = rng(hash(`${examId}|${studentId}`));
  return { order: shuffled(qs.length, r), opts: qs.map((q) => shuffled(q.options.length, r)) };
}
// Spelling tests and real papers always keep their order (the teacher reads the
// words out in turn; a paper's pictures go with its numbering).
export const keepsOrder = (qs: ExamQ[], asked = false) => asked || qs.some((q) => q.kind === "spell" || !!q.img);

// A spelling sentence with its word taken out: "I did a ________ sketch."
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function gapped(q: Pick<ExamQ, "q" | "answer">): string {
  const w = String(q.answer).trim();
  const re = new RegExp(`(^|[^\\p{L}])${escapeRe(w)}(?=$|[^\\p{L}])`, "iu");
  return re.test(q.q) ? q.q.replace(re, "$1________") : `${q.q} ________`;
}
// How the word is read out, as in the national test: the word, the sentence, the word.
export const spokenSpelling = (q: Pick<ExamQ, "q" | "answer">, n?: number) =>
  `${n ? `Spelling ${n}. ` : ""}The word is ${String(q.answer).trim()}. ${q.q.trim()} The word is ${String(q.answer).trim()}.`;
// A question's words as a learner (or a report) should see them.
export const shownQ = (q: ExamQ) => (q.kind === "spell" ? gapped(q) : q.q);

// What a learner's phone gets while the exam is open: no answers (a spelling
// word only goes to the phone when the teacher lets learners hear it there).
export type LearnerQ = { n: number; q: string; kind: ExamQ["kind"]; options: { i: number; text: string }[]; marks: number; img?: string; say?: string; method?: boolean; grid?: Grid; bench?: { slug: string } };
export function learnerPaper(examId: string, studentId: string, qs: ExamQ[], inOrder = false): LearnerQ[] {
  const { order, opts } = learnerOrder(examId, studentId, qs, keepsOrder(qs, inOrder));
  return order.map((n) => {
    const x = qs[n];
    return {
      n, q: shownQ(x), kind: x.kind, marks: x.marks, options: opts[n].map((i) => ({ i, text: x.options[i] })),
      ...(x.img ? { img: x.img } : {}), ...(x.grid ? { grid: x.grid } : {}), ...(x.bench ? { bench: x.bench } : {}), ...(x.kind === "spell" && x.hear ? { say: spokenSpelling(x, n + 1) } : {}), ...(x.method ? { method: true } : {}),
    };
  });
}

// ── Marking ──
// Typed answers: spaces, case and the minus sign don't matter; numbers are
// compared as numbers (0.50 = 0.5 = 1/2). A teacher's answer may list
// alternatives separated by | ("4 | four").
const tidy = (s: string) => s.toLowerCase().replace(/[−–]/g, "-").replace(/×/g, "*").replace(/\s+/g, "").replace(/^x=/, "").replace(/[.,]$/, "");
function asNumber(s: string): number | null {
  // A mixed number: "1 3/4".
  const mixed = s.trim().replace(/[−–]/g, "-").match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed && Number(mixed[4])) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]));
  const t = tidy(s).replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const f = t.match(/^(-?\d+)\/(\d+)$/);
  if (f && Number(f[2])) return Number(f[1]) / Number(f[2]);
  return null;
}
export function typedRight(given: string, answer: string): boolean {
  const g = tidy(given);
  if (!g) return false;
  return answer.split("|").some((alt) => {
    const a = tidy(alt);
    if (!a) return false;
    // A range, for a reading read off a scale: "23.40..23.50" (both ends count).
    const range = a.match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
    if (range) { const gn = asNumber(given); return gn != null && gn >= Number(range[1]) - 1e-9 && gn <= Number(range[2]) + 1e-9; }
    // Numbers as numbers ("13/8" isn't "1 3/8", though both lose their spaces).
    const gn = asNumber(given), an = asNumber(alt);
    if (gn != null && an != null) return Math.abs(gn - an) < 1e-9 * Math.max(1, Math.abs(an));
    return g === a;
  });
}
// ── Graphs ──
const finite = (v: unknown) => (typeof v === "number" ? Number.isFinite(v) : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
export function cleanGrid(v: unknown): Grid | null {
  const g = v as Partial<Grid> | null;
  if (!g || ![g.x0, g.x1, g.y0, g.y1].every(finite)) return null;
  const x0 = Number(g.x0), x1 = Number(g.x1), y0 = Number(g.y0), y1 = Number(g.y1);
  if (!(x1 > x0 && y1 > y0)) return null;
  return { x: str(g.x, 60).trim() || "x", y: str(g.y, 60).trim() || "y", x0, x1, y0, y1, ...(g.curve ? { curve: true } : {}) };
}
export type GraphKey = { p: [number, number][]; m: number; c: number };
function cleanGraphKey(v: unknown): GraphKey | null {
  let k: any = v;
  if (typeof v === "string") { try { k = JSON.parse(v); } catch { return null; } }
  const p = (Array.isArray(k?.p) ? k.p : []).filter((q: any) => Array.isArray(q) && finite(q[0]) && finite(q[1])).slice(0, 20).map((q: any) => [Number(q[0]), Number(q[1])] as [number, number]);
  if (p.length < 2 || !finite(k?.m) || !finite(k?.c)) return null;
  return { p, m: Number(k.m), c: Number(k.c) };
}
// What a learner drew: their points, and their line (two points on it).
export type GraphGiven = { p: [number, number][]; l: [[number, number], [number, number]] | null };
export const MAX_GRAPH_POINTS = 20;
export function parseGraphGiven(v: unknown): GraphGiven {
  let k: any = v;
  if (typeof v === "string") { try { k = JSON.parse(v); } catch { k = null; } }
  const pt = (q: any): [number, number] | null => (Array.isArray(q) && finite(q[0]) && finite(q[1]) ? [Math.round(Number(q[0]) * 1e4) / 1e4, Math.round(Number(q[1]) * 1e4) / 1e4] : null);
  const p = (Array.isArray(k?.p) ? k.p : []).map(pt).filter(Boolean).slice(0, MAX_GRAPH_POINTS) as [number, number][];
  const a = Array.isArray(k?.l) ? pt(k.l[0]) : null, b = Array.isArray(k?.l) ? pt(k.l[1]) : null;
  return { p, l: a && b && (a[0] !== b[0] || a[1] !== b[1]) ? [a, b] : null };
}
// Kept as a short string, like any other answer.
export const cleanGraphGiven = (v: unknown): string => { const g = parseGraphGiven(v); return g.p.length || g.l ? JSON.stringify(g) : ""; };
// How close a plot must be: a little over half a small square on a 10 × 10 grid of big squares (5 small in each).
export const PLOT_TOL = 0.012;
// The marks a graph earns: the plots (all but one mark: lose one for each point
// missed), then one for a line of best fit — its slope within 10% and passing
// close to the middle of the points.
export function graphMarks(q: Pick<ExamQ, "kind" | "answer" | "marks" | "grid">, given: unknown): number {
  if (q.kind !== "graph" || !q.grid) return 0;
  const key = cleanGraphKey(q.answer), g = parseGraphGiven(given);
  if (!key) return 0;
  const { x0, x1, y0, y1 } = q.grid, tx = PLOT_TOL * (x1 - x0), ty = PLOT_TOL * (y1 - y0);
  const missed = key.p.filter(([x, y]) => !g.p.some(([a, b]) => Math.abs(a - x) <= tx && Math.abs(b - y) <= ty)).length;
  const plots = Math.max(0, q.marks - (q.grid.curve ? 0 : 1) - missed);
  let line = 0;
  if (g.l && !q.grid.curve) {
    const [[ax, ay], [bx, by]] = g.l;
    if (bx !== ax) {
      const m = (by - ay) / (bx - ax), mx = key.p.reduce((s, p) => s + p[0], 0) / key.p.length, my = key.p.reduce((s, p) => s + p[1], 0) / key.p.length;
      const slopeOk = Math.abs(m - key.m) <= Math.max(0.1 * Math.abs(key.m), 0.02 * (y1 - y0) / (x1 - x0));
      const throughMiddle = Math.abs(ay + m * (mx - ax) - my) <= 0.03 * (y1 - y0);
      if (slopeOk && throughMiddle) line = 1;
    }
  }
  return Math.min(q.marks, plots + line);
}
export function graphGivenText(v: unknown): string {
  const g = parseGraphGiven(v);
  if (!g.p.length && !g.l) return "";
  return `${g.p.length} point${g.p.length === 1 ? "" : "s"} plotted${g.l ? ", line drawn" : ", no line"}`;
}
const num4 = (n: number) => String(Math.round(n * 1000) / 1000);
export function graphAnswerText(q: Pick<ExamQ, "answer" | "grid">): string {
  const k = cleanGraphKey(q.answer);
  return k ? `Points: ${k.p.map(([x, y]) => `(${num4(x)}, ${num4(y)})`).join(" ")}${(q as ExamQ).grid?.curve ? "; a smooth curve through them" : `; best-fit line, gradient ≈ ${num4(k.m)}`}` : "";
}

// A typed answer as a person reads it: the first form, a range as "23.40 to 23.50".
export const shownAnswer = (a: unknown) => String(a ?? "").split("|")[0].trim().replace(/^(-?[\d.]+)\.\.(-?[\d.]+)$/, "$1 to $2");
// ── Practical tests ──
// The marks the server worked out for a learner's bench (never the learner's own say).
export function benchGot(q: Pick<ExamQ, "marks">, given: unknown): number {
  const g = given && typeof given === "object" ? (given as { got?: unknown }).got : null;
  return Math.max(0, Math.min(q.marks, Math.round(Number(g) || 0)));
}
// A learner's own copy while the exam is open: their bench without its mark.
export function hideBenchMarks(qs: Pick<ExamQ, "kind">[], answers: Record<string, unknown>): Record<string, unknown> {
  const out = { ...answers };
  qs.forEach((q, i) => { const v = out[String(i)]; if (q.kind === "bench" && v && typeof v === "object") { const { got: _g, ...rest } = v as Record<string, unknown>; out[String(i)] = rest; } });
  return out;
}
export function benchGivenText(v: unknown): string {
  const g = v && typeof v === "object" ? (v as { step?: number; of?: number; values?: Record<string, string> }) : null;
  if (!g) return "";
  const n = Object.values(g.values ?? {}).filter((x) => String(x ?? "").trim()).length;
  return `Did ${Math.min(Number(g.step) || 0, Number(g.of) || 0)} of ${Number(g.of) || 0} steps · recorded ${n} reading${n === 1 ? "" : "s"}`;
}

export const cleanGiven = (v: unknown): string | number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 10 ? v : typeof v === "string" ? v.slice(0, 120) : null;

// ── Pages marked by the teacher ──
// What a learner wrote on a page: their writing (as board strokes, 0–1 across
// the page) and anything typed. done: when they handed the page in — after
// that it's locked, and it waits for the teacher's mark.
export type PageAnswer = { ink: Stroke[]; text: string; done?: string };
export const MAX_PAGE_TEXT = 1000;
export function cleanPageAnswer(v: unknown): PageAnswer {
  const x = (v && typeof v === "object" ? v : {}) as any;
  return { ink: cleanAnswerStrokes(x.ink), text: typeof x.text === "string" ? x.text.replace(/\r/g, "").slice(0, MAX_PAGE_TEXT) : "" };
}
const asPage = (v: unknown) => (v && typeof v === "object" ? (v as Partial<PageAnswer>) : null);
export const pageDone = (v: unknown) => !!asPage(v)?.done;
export const pageBlank = (v: unknown) => { const p = asPage(v) as any; if (!p) return true; if (typeof p.blank === "boolean") return p.blank; return !(p.ink ?? []).some((s: Stroke) => !s.erase) && !String(p.text ?? "").trim(); };
export const isHandMarked = (qs: Pick<ExamQ, "kind">[]) => qs.some((q) => q.kind === "page");
// Questions the teacher marks: pages, and method marks.
export const needsMarking = (qs: Pick<ExamQ, "kind" | "method">[]) => qs.some((q) => q.kind === "page" || q.kind === "written" || q.method);
// The most the teacher can give: a whole page, or a method mark (all but one of the marks).
export const teacherMax = (q: ExamQ) => (q.kind === "page" || q.kind === "written" ? q.marks : q.method ? q.marks - 1 : 0);
export const writtenBlank = (v: unknown) => (typeof v === "object" && v ? !!(v as { blank?: boolean }).blank : !String(v ?? "").trim());
// Where a learner's working for question n is kept, next to their answer.
export const workingKey = (n: number) => `w${n}`;
export const workingBlank = (v: unknown) => { const p = asPage(v) as any; if (!p) return true; if (typeof p.blank === "boolean") return p.blank; return !(p.ink ?? []).some((s: Stroke) => !s.erase); };
// The teacher's marks, by question number: only whole numbers a page can earn.
export function cleanPageMarks(qs: ExamQ[], v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, m] of Object.entries(v as Record<string, unknown>)) {
    const q = qs[Number(k)];
    const n = Math.round(Number(m));
    if (q && teacherMax(q) > 0 && m != null && Number.isFinite(n) && n >= 0) out[k] = Math.min(teacherMax(q), n);
  }
  return out;
}
// Answers without the writing (it's big): for lists the teacher polls, and for
// a learner's own copy (all but the page they're on).
// short: written answers cut down too (the teacher's lists; the whole answer opens on the marking desk).
export function slimAnswers(qs: ExamQ[], answers: Record<string, unknown>, keep = -1, short = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers ?? {})) {
    if (k.startsWith("w")) { out[k] = { blank: workingBlank(v) }; continue; } // working for a method mark
    const q = qs[Number(k)];
    if (q?.kind === "written") { const t = String(v ?? ""); out[k] = short && t.length > 120 ? `${t.slice(0, 120)}…` : t; continue; }
    if (q?.kind !== "page" || Number(k) === keep) { out[k] = v; continue; }
    const p = asPage(v);
    out[k] = { done: p?.done ?? null, blank: pageBlank(v), text: String(p?.text ?? "").slice(0, 300) };
  }
  return out;
}
// The page a learner is on: the first one they haven't handed in.
export const currentPage = (qs: ExamQ[], answers: Record<string, unknown>) => qs.findIndex((q, i) => q.kind === "page" && !pageDone(answers?.[String(i)]));
// Pages handed in with something on them and no mark yet (blank pages earn 0 by themselves).
// …and method marks to give: once handed in, a wrong answer with working.
export function pagesToMark(qs: ExamQ[], answers: Record<string, unknown>, marks: Record<string, number>, submitted = false): number[] {
  return qs.map((_, i) => i).filter((i) => {
    const q = qs[i], v = answers?.[String(i)];
    if (marks[String(i)] != null) return false;
    if (q.kind === "page") return (submitted || pageDone(v)) && !pageBlank(v);
    if (q.kind === "written") return submitted && !writtenBlank(v); // a blank answer earns 0 by itself
    return !!q.method && submitted && !isRight(q, v) && !workingBlank(answers?.[workingKey(i)]);
  });
}

// Spelling: letter for letter (capitals, spaces round it and a full stop don't matter).
const spellTidy = (s: string) => s.normalize("NFC").replace(/[‘’ʼ]/g, "'").replace(/\s+/g, " ").trim().replace(/[.!?,]+$/, "").toLowerCase();
export const spelledRight = (given: string, word: string) => !!spellTidy(given) && spellTidy(given) === spellTidy(word);

export function isRight(q: ExamQ, given: unknown): boolean {
  if (given == null || q.kind === "page" || q.kind === "written") return false;
  if (q.kind === "graph") return graphMarks(q, given) === q.marks;
  if (q.kind === "bench") return benchGot(q, given) === q.marks;
  if (q.kind === "choice") return Number(given) === q.answer;
  if (q.kind === "spell") return spelledRight(String(given), String(q.answer));
  return typedRight(String(given), String(q.answer));
}
// Question by question, for a learner looking back at an exam: what they gave,
// the answer, and the marks they got (a page: the teacher's mark).
export type ReviewItem = { q: string; kind: ExamQ["kind"]; given: string; answer: string; got: number; marks: number; right: boolean; pending?: boolean };
export function reviewItems(qs: ExamQ[], answers: Record<string, unknown>, pageMarks: Record<string, number> = {}): ReviewItem[] {
  return qs.map((q, i) => {
    const v = answers?.[String(i)], mark = pageMarks?.[String(i)];
    const given = q.kind === "page" ? (pageBlank(v) ? "" : "Written on the page") : q.kind === "written" ? String(v ?? "").trim()
      : q.kind === "choice" ? (v == null || v === "" ? "" : q.options[Number(v)] ?? "") : q.kind === "graph" ? graphGivenText(v) : q.kind === "bench" ? benchGivenText(v) : String(v ?? "").trim();
    const answer = q.kind === "page" ? "" : q.kind === "graph" ? graphAnswerText(q) : q.kind === "bench" ? "Each reading marked against your own bench" : q.kind === "written" ? String(q.answer ?? "").trim() : q.kind === "choice" ? q.options[Number(q.answer)] ?? "" : shownAnswer(q.answer);
    const right = q.kind !== "page" && isRight(q, v);
    const got = q.kind === "page" || q.kind === "written" ? Math.min(q.marks, Math.max(0, Number(mark) || 0)) : q.kind === "graph" ? graphMarks(q, v) : q.kind === "bench" ? benchGot(q, v) : right ? q.marks : q.method ? Math.min(teacherMax(q), Math.max(0, Number(mark) || 0)) : 0;
    const pending = q.kind === "page" ? mark == null && !pageBlank(v) : q.kind === "written" ? mark == null && !writtenBlank(v) : !!q.method && !right && mark == null && !workingBlank(answers?.[workingKey(i)]);
    return { q: shownQ(q), kind: q.kind, given, answer, got, marks: q.marks, right: got === q.marks && q.marks > 0, ...(pending ? { pending: true } : {}) };
  });
}

// pageMarks: the teacher's marks for pages (added up with everything marked automatically).
export function markPaper(qs: ExamQ[], answers: Record<string, unknown>, pageMarks: Record<string, number> = {}): { score: number; total: number; right: boolean[] } {
  const given = (q: ExamQ, i: number) => Math.max(0, Math.min(teacherMax(q), Math.round(Number(pageMarks?.[String(i)]) || 0)));
  const got = qs.map((q, i) => (q.kind === "page" || q.kind === "written" ? given(q, i) : q.kind === "graph" ? graphMarks(q, answers?.[String(i)]) : q.kind === "bench" ? benchGot(q, answers?.[String(i)]) : isRight(q, answers?.[String(i)]) ? q.marks : q.method ? given(q, i) : 0));
  return { score: got.reduce((a, b) => a + b, 0), total: qs.reduce((s, q) => s + q.marks, 0), right: qs.map((q, i) => q.marks > 0 && got[i] === q.marks) };
}

// ── Make questions from a maths topic (the arcade games' question makers) ──
export const EXAM_TOPICS = CLASS_GAMES.filter((g) => (g.subject ?? "maths") === "maths" && (g.kind === "quiz" || g.kind === "choice" || g.kind === "balloon"))
  .map((g) => ({ id: g.id, title: g.title, skill: g.skill, choice: g.kind === "choice", stage: g.stage }));

export function topicQuestions(topicId: string, d: Difficulty, count: number, r: () => number = Math.random): ExamQ[] {
  const t = EXAM_TOPICS.find((x) => x.id === topicId);
  if (!t) return [];
  const out: ExamQ[] = [], seen = new Set<string>();
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    if (t.choice) {
      const c = MORE_CHOICE.includes(t.skill) ? moreChoice(t.skill as MoreChoiceSkill, d, r) : choiceQuestion(t.skill as ChoiceSkill, d, r);
      const q = [c.lead, c.prompt].filter((s) => s && s !== "?").join(": ");
      if (seen.has(q)) continue; seen.add(q);
      out.push({ q, kind: "choice", options: c.options, answer: c.options.indexOf(c.answer), marks: 1 });
    } else {
      const n = numericQuestion(t.skill as Skill, d, r);
      const q = n.ask ? `${n.prompt} — ${n.ask}` : n.prompt.includes("?") ? n.prompt : `${n.prompt} = ?`;
      if (seen.has(q)) continue; seen.add(q);
      out.push({ q, kind: "typed", options: [], answer: String(n.answer), marks: 1 });
    }
  }
  return out;
}

// "12:05" left.
export function clockLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── The A.I writes the questions ──
export type AiExamAsk = { topic: string; level: string; count: number; kind: "mixed" | "choice" | "typed"; difficulty: Difficulty };
export const AI_EXAM_SYSTEM = `You are an experienced Nigerian teacher setting a class test (WAEC/NECO/JAMB/BECE/Common Entrance style, British spelling, Naira for money).
Reply with JSON only, in exactly this shape:
{"questions":[{"q":"...","kind":"choice","options":["...","...","...","..."],"answer":0,"marks":1},{"q":"...","kind":"typed","answer":"...","marks":2}]}
Rules:
- "choice": exactly 4 options (each max 80 characters), exactly one correct; "answer" is its 0-based index — vary its position; wrong options are common mistakes.
- "typed": the answer is short (a number, a word, or a short expression, max 30 characters) so it can be marked automatically. If more than one form is right, separate them with " | " (e.g. "0.5 | 1/2").
- "marks": 1 to 5, more for harder questions.
- Questions (max 300 characters) are clear on their own, rise in difficulty, and every answer is certainly correct — check each one.
- Plain text only: write x², x³, √, π, ÷, ×, ≤, ≥, ½ as characters. No LaTeX, no markdown, no emojis.`;
export function aiExamPrompt(a: AiExamAsk): string {
  const kinds = a.kind === "choice" ? "all multiple choice" : a.kind === "typed" ? "all typed answers" : "a mix of multiple choice and typed answers";
  return `Class: ${a.level || "secondary school"}. Topic: ${a.topic}. Write ${a.count} ${a.difficulty} questions, ${kinds}.`;
}
// Whatever the A.I sent back, as exam questions (bad ones dropped).
export function cleanAiExam(raw: unknown, kind: AiExamAsk["kind"] = "mixed"): ExamQ[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.questions) ? (raw as any).questions : [];
  const qs = cleanExamQuestions(list.map((x: any) => ({ ...x, kind: x?.kind === "typed" || (!Array.isArray(x?.options) && typeof x?.answer === "string") ? "typed" : "choice" })));
  return kind === "mixed" ? qs : qs.filter((q) => q.kind === kind);
}
