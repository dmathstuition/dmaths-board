// The A.I lesson maker: the prompt, checking the A.I's reply, and laying the
// lesson out as board pages (a title page, one page per idea, worked examples
// with numbered steps, "Try it" questions and a practice page). Pure: no network.
import { BOARD_W, BOARD_H, fontFor, type Board, type Stroke, type Paper } from "@/lib/whiteboard";

export type AiLessonPage = { heading: string; points: string[]; example?: { question: string; steps: string[]; answer: string }; tryIt?: string };
export type AiLesson = { title: string; subject: string; objectives: string[]; pages: AiLessonPage[]; practice: string[]; quiz: { q: string; options: string[]; answer: number }[] };

export const AI_LESSON_SYSTEM = `You are an experienced Nigerian secondary-school teacher preparing a live whiteboard lesson (WAEC/NECO/JAMB/BECE/Common Entrance style, British spelling, Naira for money).
Reply with JSON only, in exactly this shape:
{"title":"...","subject":"...","objectives":["..."],
 "pages":[{"heading":"...","points":["..."],"example":{"question":"...","steps":["..."],"answer":"..."},"tryIt":"..."}],
 "practice":["..."],
 "quiz":[{"q":"...","options":["...","...","...","..."],"answer":0}]}
Rules:
- 3 objectives. 4 to 6 pages that build up the topic step by step, from the idea to harder examples.
- Each page: a short heading (max 50 characters), 2 to 4 points (each max 110 characters), and usually one worked example with 2 to 6 short steps (each max 90 characters) and a final answer. "tryIt" is one short question for the class (max 100 characters), on some pages only.
- "practice": 4 to 6 questions of rising difficulty (each max 110 characters).
- "quiz": 6 multiple-choice questions, 4 options each (max 60 characters), exactly one correct, "answer" is the 0-based index, vary its position.
- Plain text only: write x², x³, √, π, ÷, ×, ≤, ≥, ½, ¼ as characters. No LaTeX, no markdown, no emojis.`;

const str = (v: unknown, max: number) => String(v ?? "").replace(/[\r\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

// Keep only what the board can show; null when the reply isn't a usable lesson.
export function cleanAiLesson(raw: unknown): AiLesson | null {
  const r = raw as any;
  if (!r || typeof r !== "object") return null;
  const pages: AiLessonPage[] = (Array.isArray(r.pages) ? r.pages : []).slice(0, 8).map((p: any) => {
    const page: AiLessonPage = { heading: str(p?.heading, 60), points: list(p?.points, 5, 140) };
    const steps = list(p?.example?.steps, 7, 110);
    if (str(p?.example?.question, 160) && steps.length) page.example = { question: str(p.example.question, 160), steps, answer: str(p?.example?.answer, 100) };
    const t = str(p?.tryIt, 120);
    if (t) page.tryIt = t;
    return page;
  }).filter((p: AiLessonPage) => p.heading && (p.points.length || p.example));
  if (!pages.length) return null;
  const quiz = (Array.isArray(r.quiz) ? r.quiz : []).slice(0, 10).map((q: any) => {
    const options = list(q?.options, 4, 80);
    const answer = Math.round(Number(q?.answer));
    return { q: str(q?.q, 200), options, answer };
  }).filter((q: { q: string; options: string[]; answer: number }) => q.q && q.options.length === 4 && q.answer >= 0 && q.answer < 4);
  return {
    title: str(r.title, 90) || pages[0].heading,
    subject: str(r.subject, 40),
    objectives: list(r.objectives, 4, 120),
    pages,
    practice: list(r.practice, 8, 140),
    quiz,
  };
}

// ── Laying it out on the board ──
const INK = "#0B1220", TEAL = "#0E6E72", PEN = "#C2451C", MUTED = "#556B6E";
const LEFT = 0.05, TOP = 0.06, BOTTOM = 0.93;

// Roughly how tall a text item will be (board units, 0–1), using the same font
// sizes and wrapping width the board uses.
export function textHeight(text: string, w: number, x = LEFT): number {
  const size = fontFor(w);
  const perLine = Math.max(8, Math.floor(((1 - x) * BOARD_W - 8) / (size * 0.56)));
  const lines = text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil(para.length / perLine)), 0);
  return (lines * size * 1.25) / BOARD_H;
}

let seq = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`;

export function lessonToBoard(l: AiLesson, by: string, now = Date.now()): Board {
  const pages: Stroke[][] = [];
  const paper: Paper[] = [];
  let page: Stroke[] = [];
  let y = TOP;
  const text = (t: string, w: number, color = INK, x = LEFT) => {
    page.push({ id: makeId("ai"), by, color, w, erase: false, kind: "text", pts: [x, Math.round(y * 1000) / 1000], text: t, t: now });
    y += textHeight(t, w, x) + 0.02;
  };
  let kind: Paper = "plain"; // the paper of the page being filled
  const newPage = (next: Paper = "plain") => { if (page.length) { pages.push(page); paper.push(kind); } page = []; y = TOP; kind = next; };
  const fits = (t: string, w: number) => y + textHeight(t, w) <= BOTTOM;

  // Title page.
  y = 0.18;
  text(l.title, 14, TEAL);
  if (l.subject) text(l.subject, 4, MUTED);
  if (l.objectives.length) {
    y += 0.03;
    text("By the end of this lesson you will be able to:", 4, INK);
    text(l.objectives.map((o) => `•  ${o}`).join("\n"), 3, INK);
  }

  for (const p of l.pages) {
    newPage();
    text(p.heading, 9, TEAL);
    for (const pt of p.points) {
      const t = `•  ${pt}`;
      if (!fits(t, 4)) { newPage(); text(`${p.heading} (continued)`, 7, TEAL); }
      text(t, 4);
    }
    if (p.example) {
      const steps = p.example.steps.map((s, i) => `${i + 1}.  ${s}`).join("\n");
      const block = textHeight(`Example: ${p.example.question}`, 4) + textHeight(steps, 3) + 0.12;
      if (y + block > BOTTOM) { newPage(); text(`${p.heading}: worked example`, 7, TEAL); }
      y += 0.01;
      text(`Example: ${p.example.question}`, 4, PEN);
      text(steps, 3);
      if (p.example.answer) text(`Answer: ${p.example.answer}`, 4, TEAL);
    }
    if (p.tryIt) {
      const t = `Try it: ${p.tryIt}`;
      if (!fits(t, 5)) { newPage(); text(`${p.heading}: your turn`, 7, TEAL); }
      y += 0.01;
      text(t, 5, PEN);
    }
  }

  if (l.practice.length) {
    newPage("lines");
    text("Practice", 9, TEAL);
    text(l.practice.map((q, i) => `${i + 1}.  ${q}`).join("\n\n"), 4);
  }
  newPage();
  return { v: 2, pages: pages.length ? pages : [[]], paper: paper.length ? paper : ["plain"], bg: pages.map(() => null) };
}
