// SERVER ONLY — the learner's study tools for one class: the questions they
// got wrong ("Fix my mistakes") and the lesson's revision flashcards. A.I
// results are kept (board_ai_cache, or this server's memory before
// supabase/migration-learner-tools.sql) so each is written only once.
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { learnerDetail } from "@/lib/learnerResults";
import { cleanExamQuestions, markPaper, shownQ, type ExamQ } from "@/lib/exams";
import { missedSpellings } from "@/lib/sats";
import { nameKey } from "@/lib/stars";
import { aiChat, aiConfigured, extractJson } from "@/lib/ai";
import { PRACTICE_SYSTEM, buildPractice, practicePrompt, MAX_MISSED, type Missed, type PracticeItem } from "@/lib/practice";
import { FLASHCARD_SYSTEM, cleanCards, flashcardPrompt, questionCards, type Card, type LessonText } from "@/lib/flashcards";

const memory = new Map<string, { at: number; data: unknown }>();
const DAY = 86_400_000;
async function cached<T>(key: string, make: () => Promise<{ data: T; keep: boolean }>): Promise<T> {
  const mem = memory.get(key);
  if (mem && Date.now() - mem.at < DAY) return mem.data as T;
  const admin = supabaseAdmin();
  const { data: row, error } = await admin.from("board_ai_cache").select("data").eq("key", key).maybeSingle();
  if (!error && row?.data) { memory.set(key, { at: Date.now(), data: row.data }); return row.data as T; }
  const made = await make();
  if (made.keep) {
    memory.set(key, { at: Date.now(), data: made.data });
    if (memory.size > 500) memory.delete(memory.keys().next().value as string);
    if (!error) await admin.from("board_ai_cache").upsert({ key, data: made.data as any }).then(() => {}, () => {});
  }
  return made.data;
}
const hash = (v: unknown) => crypto.createHash("sha256").update(JSON.stringify(v)).digest("base64url").slice(0, 16);

// Everything this learner got wrong in this class.
export async function missedFor(sessionId: string, studentId: string): Promise<{ learner: string; title: string; missed: Missed[] } | null> {
  const d = await learnerDetail(sessionId, studentId);
  if (!d) return null;
  const missed: Missed[] = [];
  // Exams: question by question.
  const admin = supabaseAdmin();
  const exams = await admin.from("board_exams").select("id, title, questions").eq("session_id", sessionId).order("created_at").limit(10);
  if (!exams.error && exams.data?.length) {
    const { data: entries } = await admin.from("board_exam_entries").select("exam_id, answers").eq("student_id", studentId).in("exam_id", exams.data.map((e: any) => e.id));
    for (const e of exams.data as { id: string; title: string; questions: ExamQ[] }[]) {
      const entry: any = (entries ?? []).find((x: any) => x.exam_id === e.id);
      if (!entry) continue;
      const qs = Array.isArray(e.questions) ? e.questions : [];
      const m = markPaper(qs, entry.answers ?? {});
      qs.forEach((q, i) => {
        if (m.right[i] || q.kind === "page" || q.kind === "written") return; // a page marked by hand has no single answer to practise
        const v = entry.answers?.[String(i)];
        const given = q.kind === "choice" ? (v == null || v === "" ? "" : q.options[Number(v)] ?? "") : String(v ?? "");
        missed.push({ from: `Exam Q${i + 1}`, q: shownQ(q), options: q.kind === "choice" ? q.options : [], answer: q.kind === "choice" ? q.options[Number(q.answer)] ?? null : String(q.answer).split("|")[0].trim(), given });
      });
    }
  }
  // Live quizzes.
  d.quizzes.forEach((quiz) => quiz.items.forEach((it, i) => {
    if (it.correct) return;
    missed.push({ from: `Quiz Q${i + 1}`, q: it.q, options: it.options, answer: it.options[it.answer] ?? null, given: it.choice == null ? "" : it.options[it.choice] ?? "" });
  }));
  // Class work the teacher marked down (the right answer isn't written anywhere).
  for (const w of d.work) {
    if (w.mark == null || w.mark >= w.max || !w.question.trim()) continue;
    missed.push({ from: "Class work", q: w.question, options: [], answer: null, given: w.answer?.text ?? "" });
  }
  return { learner: d.learner, title: d.title, missed };
}

export async function practiceFor(sessionId: string, studentId: string): Promise<{ learner: string; title: string; missed: number; items: PracticeItem[]; ai: boolean } | null> {
  const m = await missedFor(sessionId, studentId);
  if (!m) return null;
  const missed = m.missed.slice(0, MAX_MISSED);
  if (!missed.length) return { learner: m.learner, title: m.title, missed: 0, items: [], ai: false };
  const seed = `${sessionId}|${studentId}`;
  const set = await cached<{ items: PracticeItem[]; ai: boolean }>(`practice:${sessionId}:${studentId}:${hash(missed)}`, async () => {
    if (!aiConfigured()) return { data: { items: buildPractice(missed, null, seed), ai: false }, keep: false };
    try {
      const reply = await aiChat({ system: PRACTICE_SYSTEM, user: practicePrompt(missed), maxTokens: Math.min(6000, 600 + missed.length * 700) });
      const items = buildPractice(missed, extractJson(reply), seed);
      const ai = items.some((x) => x.kind === "similar");
      return { data: { items, ai }, keep: ai };
    } catch (e) {
      console.warn("practice ai failed", (e as Error)?.message);
      return { data: { items: buildPractice(missed, null, seed), ai: false }, keep: false };
    }
  });
  return { learner: m.learner, title: m.title, missed: m.missed.length, ...set };
}

// What the lesson covered, for flashcards.
export async function lessonText(sessionId: string): Promise<LessonText | null> {
  const admin = supabaseAdmin();
  const { data: s } = await admin.from("live_sessions").select("title, board").eq("id", sessionId).maybeSingle();
  if (!s) return null;
  const questions: LessonText["questions"] = [];
  const [quizzes, exams, marks] = await Promise.all([
    admin.from("live_quizzes").select("questions").eq("session_id", sessionId).limit(20),
    admin.from("board_exams").select("questions").eq("session_id", sessionId).limit(10),
    admin.from("live_class_marks").select("question").eq("session_id", sessionId).limit(500),
  ]);
  for (const qz of quizzes.data ?? []) for (const q of (Array.isArray((qz as any).questions) ? (qz as any).questions : [])) questions.push({ q: String(q?.q ?? ""), answer: Array.isArray(q?.options) ? String(q.options[Number(q.answer)] ?? "") || null : null, from: "Quiz" });
  if (!exams.error) for (const ex of exams.data ?? []) for (const q of (Array.isArray((ex as any).questions) ? (ex as any).questions : []) as ExamQ[]) {
    if (q.kind === "page" || q.kind === "written") continue;
    questions.push({ q: shownQ(q), answer: q.kind === "choice" ? q.options[Number(q.answer)] ?? null : String(q.answer).split("|")[0].trim(), from: "Exam" });
  }
  for (const m of marks.data ?? []) if ((m as any).question) questions.push({ q: String((m as any).question), answer: null, from: "Class work" });
  // Words and maths written on the board.
  const board: string[] = [];
  const pages = Array.isArray((s as any).board?.pages) ? (s as any).board.pages : Array.isArray((s as any).board) ? [(s as any).board] : [];
  for (const page of pages) for (const it of (Array.isArray(page) ? page : [])) {
    if (it && typeof it.text === "string" && it.text.trim() && ["text", "note", "math"].includes(it.kind)) board.push(it.text.trim().slice(0, 300));
  }
  const uniq = (xs: string[]) => [...new Set(xs)];
  return { title: String((s as any).title ?? ""), questions: questions.filter((q) => q.q.trim()), board: uniq(board).slice(0, 60) };
}

export async function flashcardsFor(sessionId: string): Promise<{ title: string; cards: Card[]; ai: boolean } | null> {
  const l = await lessonText(sessionId);
  if (!l) return null;
  const base = questionCards(l);
  if (!l.questions.length && !l.board.length) return { title: l.title, cards: [], ai: false };
  return cached<{ title: string; cards: Card[]; ai: boolean }>(`cards:${sessionId}:${hash([l.questions.map((q) => q.q), l.board])}`, async () => {
    if (!aiConfigured()) return { data: { title: l.title, cards: base, ai: false }, keep: false };
    try {
      const reply = await aiChat({ system: FLASHCARD_SYSTEM, user: flashcardPrompt(l), maxTokens: 3000 });
      const cards = cleanCards(extractJson(reply));
      if (cards.length >= 4) return { data: { title: l.title, cards, ai: true }, keep: true };
    } catch (e) { console.warn("flashcards ai failed", (e as Error)?.message); }
    return { data: { title: l.title, cards: base, ai: false }, keep: false };
  });
}

// A learner's own spelling list: words they got wrong in this teacher's
// spelling tests (matched by name, so it follows them from class to class)
// and haven't spelt right since — for look, cover, write, check.
export async function spellingFor(sessionId: string, studentId: string): Promise<{ learner: string; words: { word: string; sentence: string }[] } | null> {
  const admin = supabaseAdmin();
  const [{ data: guest }, { data: session }] = await Promise.all([
    admin.from("live_session_guests").select("name").eq("id", studentId).eq("session_id", sessionId).maybeSingle(),
    admin.from("live_sessions").select("host_id").eq("id", sessionId).maybeSingle(),
  ]);
  if (!guest || !session?.host_id) return null;
  const learner = String(guest.name ?? "");
  const { data: exams, error } = await admin.from("board_exams").select("id, questions, created_at").eq("host_id", session.host_id).order("created_at", { ascending: false }).limit(60);
  if (error) return { learner, words: [] };
  const tests = ((exams ?? []) as { id: string; questions: ExamQ[] }[]).filter((x) => Array.isArray(x.questions) && x.questions.some((q) => q.kind === "spell")).slice(0, 20);
  if (!tests.length) return { learner, words: [] };
  let rows = await admin.from("board_exam_entries").select("exam_id, name, answers, extra_qs").in("exam_id", tests.map((x) => x.id)).limit(5000);
  if (rows.error) rows = await admin.from("board_exam_entries").select("exam_id, name, answers").in("exam_id", tests.map((x) => x.id)).limit(5000) as typeof rows;
  const me = nameKey(learner);
  const history = tests.flatMap((t) => ((rows.data ?? []) as any[]).filter((r) => r.exam_id === t.id && nameKey(String(r.name ?? "")) === me)
    .map((r) => ({ questions: [...t.questions, ...cleanExamQuestions(r.extra_qs ?? [])], answers: r.answers ?? {} })));
  return { learner, words: missedSpellings(history, [], 30).map((q) => ({ word: String(q.answer), sentence: q.q })) };
}
