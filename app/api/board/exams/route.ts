import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { AI_EXAM_SYSTEM, GRACE_MS, aiExamPrompt, cleanAiExam, cleanExamQuestions, cleanGiven, MAX_BOOKLET, MAX_WRITTEN, cleanPageAnswer, cleanPageMarks, currentPage, isHandMarked, keepsOrder, learnerPaper, markPaper, needsMarking, pageBlank, pageDone, pagesToMark, shownQ, slimAnswers, teacherMax, workingKey, type ExamQ } from "@/lib/exams";
import { isWarmUp, missedSpellings } from "@/lib/sats";
import { nameKey } from "@/lib/stars";
import { isSlideUrl } from "@/lib/whiteboard";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { removeSlidePictures } from "@/lib/slideStore";

// Exam mode (supabase/migration-exams-stars.sql). Each learner takes the test
// on their own phone, in their own order; the answers stay on the server
// until the exam ends, and marking happens here.
//   GET  ?sessionId=                → the class's exam: the teacher gets everything and every
//                                     learner's progress; a learner gets their own paper
//   POST { action: "create", sessionId, title, minutes, review, questions }   (teacher)
//        { action: "close" | "extend", examId, minutes? }                      (teacher)
//        { action: "ai", sessionId, topic, level, count, kind, difficulty }     (teacher: the A.I writes questions → { questions })
//        { action: "start" | "submit", examId }                                (learner)
//        { action: "answer", examId, n, value }   n = question number          (learner)
//        { action: "flag", examId, reason }       left the exam page            (learner)
//        { action: "page-done", examId, n }       hand in page n: it's locked   (learner)
//        { action: "mark", examId, studentId, n, mark }   the teacher's mark for a page (null clears)
//        { action: "page-view", examId, studentId, n }    a learner's page, writing and all (teacher)
//        { action: "wipe-paper", examId }         once it's over: delete the paper's pages from
//                                                 storage and the writing on them (marks and scores stay)
//        { action: "extra", examId, studentId, on }       extra time (25%) for one learner (teacher)
//        { action: "working", examId, n, value }  working shown for a method mark (learner)
//   GET  ?sessionId=&warmups=1      → the teacher's daily warm-ups, for the tracker
//   GET  ?sessionId=&list=1         → the class's exams (teacher), for the results after the class
//   GET  ?sessionId=&examId=        → that exam, as above, instead of the latest
// Papers marked by hand: learners write on each page and hand it in; the
// teacher's marks (board_exam_entries.page_marks) add up to the score — so do
// method marks. Extra time: each learner's own deadline is ends_at + extra_ms,
// and the exam stays open until the last one has passed. Personal spelling
// words: board_exams.personal_words of each learner's earlier misses go on the
// end of their test (board_exam_entries.extra_qs). A reading paper: the
// booklet's pages (board_exams.booklet) are shown beside the questions.
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MISSING = /board_exam/i;
const dbFail = (msg: string) => MISSING.test(msg) ? bad("Exam mode needs supabase/migration-exams-stars.sql — run it in Supabase.", 501) : bad(msg, 500);

type ExamRow = { booklet?: string[] | null; host_id?: string | null; personal_words?: number | null; id: string; session_id: string; title: string; questions: ExamQ[]; minutes: number; review: boolean; calculator?: boolean | null; in_order?: boolean | null; status: "open" | "closed"; created_at: string; ends_at: string; closed_at: string | null };
type EntryRow = { exam_id: string; student_id: string; name: string; answers: Record<string, unknown>; flags: number; flag_log: { at: string; reason: string }[]; started_at: string; submitted_at: string | null; score: number | null; total: number | null; page_marks?: Record<string, number> | null; extra_ms?: number | null; extra_qs?: ExamQ[] | null };
// This learner's questions: everyone's, then their own spelling words.
const qsFor = (e: ExamRow, r: EntryRow | null) => (r?.extra_qs?.length ? [...e.questions, ...cleanExamQuestions(r.extra_qs)] : e.questions);
const marksOf = (e: ExamRow, r: EntryRow) => cleanPageMarks(qsFor(e, r), r.page_marks);
const extraOf = (r: EntryRow | null) => Math.max(0, Math.round(Number(r?.extra_ms) || 0));
const deadline = (e: ExamRow, r: EntryRow | null) => new Date(e.ends_at).getTime() + extraOf(r);
const timeUp = (e: ExamRow, r: EntryRow | null, now = Date.now()) => e.status === "closed" || now > deadline(e, r) + GRACE_MS;
const bookletOf = (e: ExamRow) => (Array.isArray(e.booklet) ? e.booklet.filter(isSlideUrl).slice(0, MAX_BOOKLET) : []);
const NEEDS_EXTRA = "Extra time needs the latest supabase/migration-learner-tools.sql — run it in Supabase once.";
const NEEDS_MARKS = "Marking pages needs the latest supabase/migration-learner-tools.sql — run it in Supabase once.";

// The main time is over: nobody new can start.
const over = (e: ExamRow, now = Date.now()) => e.status === "closed" || now > new Date(e.ends_at).getTime() + GRACE_MS;

async function latestExam(sessionId: string): Promise<ExamRow | null> {
  const { data, error } = await supabaseAdmin().from("board_exams").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamRow | null;
}
async function examById(id: string): Promise<ExamRow | null> {
  const { data, error } = await supabaseAdmin().from("board_exams").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExamRow | null;
}
async function handIn(e: ExamRow, row: EntryRow) {
  const m = markPaper(qsFor(e, row), row.answers ?? {}, marksOf(e, row));
  await supabaseAdmin().from("board_exam_entries").update({ submitted_at: new Date().toISOString(), score: m.score, total: m.total }).eq("exam_id", e.id).eq("student_id", row.student_id);
  return m;
}
// The teacher ends the exam (or starts another): every paper is handed in and marked.
async function closeExam(e: ExamRow) {
  const admin = supabaseAdmin();
  if (e.status !== "closed") await admin.from("board_exams").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", e.id);
  const { data } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).is("submitted_at", null);
  for (const row of (data ?? []) as EntryRow[]) await handIn(e, row);
  e.status = "closed";
}
// Time's up: hand in each paper whose own time (with any extra time) is over;
// the exam ends when nobody has time left.
async function settle(e: ExamRow, now = Date.now()) {
  if (e.status !== "open" || !over(e, now)) return;
  const { data } = await supabaseAdmin().from("board_exam_entries").select("*").eq("exam_id", e.id).is("submitted_at", null);
  let left = 0;
  for (const row of (data ?? []) as EntryRow[]) {
    if (timeUp(e, row, now)) await handIn(e, row); else left++;
  }
  if (!left) await closeExam(e);
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const sessionId = params.get("sessionId") ?? "";
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v) return bad("Join the class first.", 403);
  try {
    // The teacher's daily warm-ups (any class of theirs), for the tracker.
    if (params.get("warmups") === "1") {
      if (!v.host) return bad("Only the teacher can see this.", 403);
      const admin = supabaseAdmin();
      const { data: exams, error } = await admin.from("board_exams").select("id, title, created_at").eq("host_id", v.id).order("created_at", { ascending: false }).limit(200);
      if (error) return dbFail(error.message);
      const warm = (exams ?? []).filter((x: any) => isWarmUp(String(x.title ?? ""))).slice(0, 40);
      if (!warm.length) return NextResponse.json({ rows: [] });
      const { data: es } = await admin.from("board_exam_entries").select("exam_id, name, score, total, started_at, submitted_at").in("exam_id", warm.map((x: any) => x.id)).limit(5000);
      const at = new Map(warm.map((x: any) => [x.id, String(x.created_at)]));
      const rows = (es ?? []).filter((r: any) => r.submitted_at).map((r: any) => ({
        at: at.get(r.exam_id) ?? "", name: String(r.name ?? ""), score: r.score, total: r.total,
        secs: r.started_at ? Math.max(0, Math.round((Date.parse(r.submitted_at) - Date.parse(r.started_at)) / 1000)) : null,
      }));
      return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }
    if (params.get("list") === "1") {
      if (!v.host) return bad("Only the teacher can see this.", 403);
      const { data: list, error } = await supabaseAdmin().from("board_exams").select("id, title, status, created_at, questions").eq("session_id", sessionId).order("created_at").limit(20);
      if (error) return dbFail(error.message);
      return NextResponse.json({ exams: (list ?? []).map((x: any) => ({ id: x.id, title: x.title, status: x.status, createdAt: x.created_at, count: (x.questions ?? []).length })) }, { headers: { "Cache-Control": "no-store" } });
    }
    const examId = params.get("examId");
    const e = examId ? await examById(examId) : await latestExam(sessionId);
    if (!e || e.session_id !== sessionId) return NextResponse.json({ exam: null });
    await settle(e);
    const admin = supabaseAdmin();
    const meta = { id: e.id, title: e.title, minutes: e.minutes, review: e.review, calculator: e.calculator !== false, inOrder: keepsOrder(e.questions, !!e.in_order), handMarked: isHandMarked(e.questions), personal: Math.max(0, Number(e.personal_words) || 0), booklet: bookletOf(e), spelling: e.questions.some((q) => q.kind === "spell"), status: e.status, endsAt: new Date(e.ends_at).getTime(), count: e.questions.length, total: e.questions.reduce((s, q) => s + q.marks, 0) };
    if (v.host) {
      const { data } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).limit(500);
      const hand = needsMarking(e.questions);
      const entries = ((data ?? []) as EntryRow[]).map((r) => {
        const qs = qsFor(e, r), marks = marksOf(e, r), m = markPaper(qs, r.answers ?? {}, marks);
        return {
          id: r.student_id, name: r.name, extraMs: extraOf(r), ...(r.extra_qs?.length ? { extraQs: qs.slice(e.questions.length) } : {}),
          answered: qs.filter((q, i) => { const v = (r.answers ?? {})[String(i)]; return q.kind === "page" ? pageDone(v) : v != null && v !== ""; }).length,
          flags: r.flags, flagLog: (r.flag_log ?? []).slice(-10), submitted: !!r.submitted_at, score: r.submitted_at ? m.score : null, total: m.total,
          live: r.submitted_at ? null : m.score, // what they'd get now
          answers: hand ? slimAnswers(qs, r.answers ?? {}, -1, true) : r.answers ?? {}, // the writing is fetched one page at a time
          startedAt: r.started_at ?? null, submittedAt: r.submitted_at ?? null, // for the teacher's reports
          ...(hand ? { pageMarks: marks, toMark: pagesToMark(qs, r.answers ?? {}, marks, !!r.submitted_at) } : {}),
        };
      });
      const about = { className: v.session.title ?? "", teacher: v.fullName || v.name, createdAt: e.created_at ?? null };
      return NextResponse.json({ exam: { ...meta, questions: e.questions, ...about }, entries }, { headers: { "Cache-Control": "no-store" } });
    }
    const { data: mine } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).eq("student_id", v.id).maybeSingle();
    const entry = mine as EntryRow | null;
    // An exam that ended more than 2 hours ago and they never started: nothing to show.
    if (!entry && e.status === "closed") return NextResponse.json({ exam: null });
    const given0 = entry?.answers ?? {};
    const myQs = qsFor(e, entry);
    const hand = needsMarking(myQs);
    const myMarks = entry ? marksOf(e, entry) : {};
    const out: any = { exam: meta, entry: entry ? {
      started: true, submitted: !!entry.submitted_at, flags: entry.flags, extraMs: extraOf(entry),
      answers: isHandMarked(myQs) ? slimAnswers(myQs, given0, entry.submitted_at ? -1 : currentPage(myQs, given0)) : given0,
      score: entry.submitted_at ? markPaper(myQs, given0, myMarks).score : entry.score, total: entry.total ?? markPaper(myQs, given0).total,
      // Marked by hand (pages, method marks): how far the teacher has got.
      ...(hand && entry.submitted_at ? { marking: { left: pagesToMark(myQs, given0, myMarks, true).length, pages: myQs.filter((q) => q.kind === "page").length } } : {}),
    } : null };
    if (entry && !entry.submitted_at && e.status === "open") { out.paper = learnerPaper(e.id, v.id, myQs, !!e.in_order); out.personalFrom = e.questions.length; }
    // Once it's over: how they did, against the class — and (if the teacher
    // allows it) their answers against the right ones.
    if (entry && e.status === "closed") {
      const given = entry.answers ?? {};
      const m = markPaper(myQs, given, myMarks);
      const blank = myQs.filter((q, i) => (q.kind === "page" ? pageBlank(given[String(i)]) : given[String(i)] == null || given[String(i)] === "")).length;
      const { data: all } = await admin.from("board_exam_entries").select("score, total").eq("exam_id", e.id).not("submitted_at", "is", null).limit(500);
      const pcts = (all ?? []).filter((x: any) => x.total).map((x: any) => (x.score / x.total) * 100);
      const better = pcts.filter((p) => p > (m.score / Math.max(1, m.total)) * 100).length;
      out.analysis = {
        score: m.score, total: m.total, right: m.right.filter(Boolean).length, wrong: m.right.filter((r, i) => !r && !(myQs[i].kind === "page" ? pageBlank(given[String(i)]) : given[String(i)] == null || given[String(i)] === "")).length, blank,
        average: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null, best: pcts.length ? Math.round(Math.max(...pcts)) : null,
        takers: pcts.length, position: pcts.length ? better + 1 : null, flags: entry.flags,
      };
      if (e.review) out.review = myQs.map((q, i) => ({
        q: shownQ(q), kind: q.kind, options: q.options, answer: q.answer, right: m.right[i], marks: q.marks,
        given: q.kind === "page" ? (myMarks[String(i)] ?? (pageBlank(given[String(i)]) ? 0 : null)) : given[String(i)] ?? null, // a page: the teacher's mark
        ...(q.method && myMarks[String(i)] != null ? { method: myMarks[String(i)] } : {}),
        ...(q.kind === "written" ? { mark: myMarks[String(i)] ?? (String(given[String(i)] ?? "").trim() ? null : 0) } : {}),
      }));
    }
    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) { return dbFail(String(err?.message ?? err)); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  try {
    if (action === "ai") {
      const v = await sessionViewer(String(body?.sessionId ?? "")).catch(() => null);
      if (!v?.host) return bad("Only the class's teacher can set an exam.", 403);
      const topic = String(body?.topic ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
      if (topic.length < 3) return bad("Say what the questions should be on, e.g. \"Simultaneous equations\".");
      if (!rateLimit(`exam-ai:${v.id}`, 6, 60_000)) return bad("Give the A.I a minute before asking again.", 429);
      if (!rateLimit(`exam-ai-day:${v.id}`, 60, 86_400_000)) return bad("That's today's A.I question limit — try again tomorrow.", 429);
      const kind = ["choice", "typed"].includes(body?.kind) ? body.kind : "mixed";
      const ask = { topic, level: String(body?.level ?? "").slice(0, 60), count: Math.max(1, Math.min(30, Math.round(Number(body?.count) || 10))), kind,
        difficulty: ["easy", "medium", "hard"].includes(body?.difficulty) ? body.difficulty : "medium" } as const;
      let questions: ExamQ[];
      try {
        const reply = await aiChat({ system: AI_EXAM_SYSTEM, user: aiExamPrompt(ask), maxTokens: Math.min(6000, 400 + ask.count * 220) });
        questions = cleanAiExam(extractJson(reply), kind).slice(0, ask.count);
      } catch (err) { return aiErrorResponse(err); }
      if (!questions.length) return bad("The A.I reply wasn't usable — try again, or word the topic differently.", 502);
      return NextResponse.json({ questions });
    }
    if (action === "create") {
      const sessionId = String(body?.sessionId ?? "");
      const v = await sessionViewer(sessionId).catch(() => null);
      if (!v?.host) return bad("Only the class's teacher can set an exam.", 403);
      if (v.session.status !== "live") return bad("This class has ended.", 409);
      if (!rateLimit(`exam-create:${v.id}`, 10, 60_000)) return bad("Wait a moment and try again.", 429);
      const questions = cleanExamQuestions(body?.questions);
      if (!questions.length) return bad("Add at least one question.");
      const minutes = Math.max(1, Math.min(180, Math.round(Number(body?.minutes) || 20)));
      const open = await latestExam(sessionId);
      if (open?.status === "open") await closeExam(open); // one exam at a time
      const calculator = body?.calculator !== false;
      const row = {
        session_id: sessionId, host_id: v.id, title: String(body?.title ?? "Class test").slice(0, 120) || "Class test",
        questions, minutes, review: body?.review !== false, status: "open", ends_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      };
      const inOrder = body?.inOrder === true;
      const personal = questions.some((q) => q.kind === "spell") ? Math.max(0, Math.min(10, Math.round(Number(body?.personal) || 0))) : 0;
      const booklet = (Array.isArray(body?.booklet) ? body.booklet : []).filter(isSlideUrl).slice(0, MAX_BOOKLET);
      let { data, error } = await admin.from("board_exams").insert({ ...row, calculator, ...(inOrder ? { in_order: true } : {}), ...(personal ? { personal_words: personal } : {}), ...(booklet.length ? { booklet } : {}) }).select("id").single();
      let note: string | undefined;
      if (error && /booklet/i.test(error.message)) {
        ({ data, error } = await admin.from("board_exams").insert({ ...row, calculator, ...(inOrder ? { in_order: true } : {}), ...(personal ? { personal_words: personal } : {}) }).select("id").single());
        note = "The exam started without the reading booklet — run supabase/migration-learner-tools.sql once to show it beside the questions.";
      }
      if (error && /personal_words/i.test(error.message)) {
        ({ data, error } = await admin.from("board_exams").insert({ ...row, calculator, ...(inOrder ? { in_order: true } : {}) }).select("id").single());
        note = "The test started without each learner's own words — run supabase/migration-learner-tools.sql once to add them.";
      }
      // Before migration-learner-tools.sql there are no calculator / in_order columns:
      // the calculator stays on, and only papers and spelling tests keep their order.
      if (error && /in_order/i.test(error.message)) {
        ({ data, error } = await admin.from("board_exams").insert({ ...row, calculator }).select("id").single());
        if (!keepsOrder(questions)) note = "The exam started, but each phone has its own question order — run supabase/migration-learner-tools.sql once to keep the same order for everyone.";
      }
      if (error && /calculator/i.test(error.message)) {
        ({ data, error } = await admin.from("board_exams").insert(row).select("id").single());
        if (!calculator) note = "The exam started, but the calculator couldn't be switched off — run supabase/migration-learner-tools.sql once to allow that.";
      }
      if (error || !data) return dbFail(error?.message ?? "insert failed");
      return NextResponse.json({ id: data.id, note });
    }

    const e = await examById(String(body?.examId ?? ""));
    if (!e) return bad("That exam isn't there any more.", 404);
    const v = await sessionViewer(e.session_id).catch(() => null);
    if (!v) return bad("Join the class first.", 403);

    if (action === "wipe-paper") {
      if (!v.host) return bad("Only the teacher can delete the paper.", 403);
      if (e.status === "open" && !over(e)) return bad("End the exam first, then delete the paper.", 409);
      if (!rateLimit(`exam-wipe:${v.id}`, 10, 60_000)) return bad("Wait a minute.", 429);
      if (e.status === "open") await closeExam(e);
      const urls = [...e.questions.map((q) => q.img).filter(Boolean) as string[], ...bookletOf(e)];
      // The pictures go first: if storage refuses, nothing else changes and the teacher can try again.
      const gone = await removeSlidePictures(urls, e.session_id.replace(/[^a-z0-9-]/gi, "").slice(0, 48), { examId: e.id });
      if (gone.error) return bad(`Storage refused: ${gone.error}`, 502);
      // The writing on the pages goes too (it can't be shown without them); whether a
      // page was blank, its typed answers, and every mark stay for the results.
      const { data: rows } = await admin.from("board_exam_entries").select("student_id, answers").eq("exam_id", e.id).limit(1000);
      for (const r of (rows ?? []) as Pick<EntryRow, "student_id" | "answers">[]) {
        let changed = false;
        const answers = { ...(r.answers ?? {}) };
        e.questions.forEach((q, i) => {
          const a = answers[String(i)] as any;
          if (q.kind !== "page" || !a || typeof a !== "object" || !Array.isArray(a.ink) || !a.ink.length) return;
          answers[String(i)] = { ink: [], text: String(a.text ?? ""), done: a.done ?? null, blank: pageBlank(a), wiped: true };
          changed = true;
        });
        if (changed) await admin.from("board_exam_entries").update({ answers }).eq("exam_id", e.id).eq("student_id", r.student_id);
      }
      const questions = e.questions.map(({ img: _img, ...q }) => q);
      const { error } = await admin.from("board_exams").update({ questions, ...(bookletOf(e).length ? { booklet: [] } : {}) }).eq("id", e.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true, removed: gone.removed, kept: gone.kept });
    }

    if (action === "close" || action === "extend") {
      if (!v.host) return bad("Only the teacher can do that.", 403);
      if (action === "close") { await closeExam(e); return NextResponse.json({ ok: true }); }
      if (e.status !== "open") return bad("This exam has ended.", 409);
      const add = Math.max(1, Math.min(60, Math.round(Number(body?.minutes) || 5)));
      const ends = Math.max(Date.now(), new Date(e.ends_at).getTime()) + add * 60_000;
      const { error } = await admin.from("board_exams").update({ ends_at: new Date(ends).toISOString(), minutes: Math.min(180, e.minutes + add) }).eq("id", e.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "extra") {
      if (!v.host) return bad("Only the teacher can give extra time.", 403);
      if (e.status !== "open") return bad("This exam has ended.", 409);
      const ms = body?.on === false ? 0 : Math.round(e.minutes * 0.25 * 60_000); // 25%, as in the national tests
      const { error } = await admin.from("board_exam_entries").update({ extra_ms: ms }).eq("exam_id", e.id).eq("student_id", String(body?.studentId ?? ""));
      if (error) return /extra_ms/i.test(error.message) ? bad(NEEDS_EXTRA, 501) : dbFail(error.message);
      return NextResponse.json({ ok: true, extraMs: ms });
    }

    if (action === "mark" || action === "page-view") {
      if (!v.host) return bad("Only the teacher can do that.", 403);
      const n = Math.round(Number(body?.n));
      const { data: row, error: rowErr } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).eq("student_id", String(body?.studentId ?? "")).maybeSingle();
      if (rowErr) return dbFail(rowErr.message);
      const r = row as EntryRow | null;
      if (!r) return bad("That learner isn't taking this exam.", 404);
      const qs = qsFor(e, r), q = qs[n];
      if (!q || teacherMax(q) <= 0) return bad("Which question?");
      const marks = marksOf(e, r);
      if (action === "page-view") {
        // A page: the writing on it; a method mark: their working and their answer.
        const v0 = (r.answers ?? {})[q.kind === "page" ? String(n) : q.kind === "written" ? "" : workingKey(n)];
        const p = cleanPageAnswer(v0);
        const text = q.kind === "page" ? p.text : String((r.answers ?? {})[String(n)] ?? "");
        return NextResponse.json({ ink: p.ink, text, done: pageDone(v0) || !!r.submitted_at, mark: marks[String(n)] ?? null }, { headers: { "Cache-Control": "no-store" } });
      }
      if (!rateLimit(`exam-mark:${v.id}`, 300, 60_000)) return bad("Slow down a little.", 429);
      if (body?.mark == null) delete marks[String(n)];
      else {
        const m = Math.round(Number(body.mark));
        if (!(m >= 0 && m <= teacherMax(q))) return bad(`A mark from 0 to ${teacherMax(q)}.`);
        marks[String(n)] = m;
      }
      const score = markPaper(qs, r.answers ?? {}, marks).score;
      const { error } = await admin.from("board_exam_entries").update({ page_marks: marks, ...(r.submitted_at ? { score } : {}) }).eq("exam_id", e.id).eq("student_id", r.student_id);
      if (error) return /page_marks/i.test(error.message) ? bad(NEEDS_MARKS, 501) : dbFail(error.message);
      return NextResponse.json({ ok: true, score, marks });
    }

    if (v.host) return bad("The teacher doesn't take the exam.", 403);
    if (!rateLimit(`exam:${v.id}`, 240, 60_000)) return bad("Slow down a little.", 429);
    const { data: row } = await admin.from("board_exam_entries").select("*").eq("exam_id", e.id).eq("student_id", v.id).maybeSingle();
    const entry = row as EntryRow | null;

    if (action === "start") {
      if (over(e)) return bad("This exam has ended.", 409);
      if (!entry) {
        const row = { exam_id: e.id, student_id: v.id, name: v.name.slice(0, 60) };
        const mine: ExamQ[] = await personalWords(e, v.name).catch(() => []);
        const withWords: Record<string, unknown> = mine.length ? { ...row, extra_qs: mine } : row;
        let { error } = await admin.from("board_exam_entries").insert(withWords as typeof row);
        if (error && /extra_qs/i.test(error.message)) ({ error } = await admin.from("board_exam_entries").insert(row));
        if (error && !/duplicate/i.test(error.message)) return dbFail(error.message);
      }
      return NextResponse.json({ ok: true });
    }
    if (!entry) return bad("Start the exam first.", 409);

    if (action === "flag") {
      const reason = String(body?.reason ?? "left the exam page").slice(0, 60);
      if (entry.submitted_at || e.status !== "open") return NextResponse.json({ ok: true });
      const log = [...(entry.flag_log ?? []), { at: new Date().toISOString(), reason }].slice(-50);
      await admin.from("board_exam_entries").update({ flags: entry.flags + 1, flag_log: log }).eq("exam_id", e.id).eq("student_id", v.id);
      return NextResponse.json({ ok: true });
    }
    if (entry.submitted_at) return bad("You've already handed in this exam.", 409);
    if (timeUp(e, entry)) { await handIn(e, entry); await settle(e); return bad("Time's up — your answers have been handed in.", 409); }
    const myQs = qsFor(e, entry);

    if (action === "working") {
      const n = Math.round(Number(body?.n));
      if (!myQs[n]?.method) return bad("That question doesn't need working.");
      const answers = { ...(entry.answers ?? {}), [workingKey(n)]: { ink: cleanPageAnswer(body?.value).ink } };
      const { error } = await admin.from("board_exam_entries").update({ answers }).eq("exam_id", e.id).eq("student_id", v.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "answer" || action === "page-done") {
      const n = Math.round(Number(body?.n));
      if (!(n >= 0 && n < myQs.length)) return bad("Which question?");
      const q = myQs[n], had = (entry.answers ?? {})[String(n)];
      let value: unknown;
      if (q.kind === "page") {
        if (pageDone(had)) return bad("You've handed in that page.", 409);
        value = action === "page-done" ? { ...cleanPageAnswer(body?.value ?? had), done: new Date().toISOString() } : cleanPageAnswer(body?.value);
      } else {
        if (action === "page-done") return bad("That isn't a page.");
        value = q.kind === "written" ? String(body?.value ?? "").replace(/\r/g, "").slice(0, MAX_WRITTEN) : cleanGiven(body?.value);
      }
      const answers = { ...(entry.answers ?? {}), [String(n)]: value };
      const { error } = await admin.from("board_exam_entries").update({ answers }).eq("exam_id", e.id).eq("student_id", v.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "submit") {
      const m = await handIn(e, entry);
      await settle(e);
      return NextResponse.json({ ok: true, score: m.score, total: m.total });
    }
    return bad("Unknown request.");
  } catch (err: any) { return dbFail(String(err?.message ?? err)); }
}

// The words this learner (matched by name) got wrong in this teacher's earlier
// spelling tests and hasn't spelt right since: they go on the end of the test.
async function personalWords(e: ExamRow, name: string): Promise<ExamQ[]> {
  const max = Math.max(0, Math.min(10, Number(e.personal_words) || 0));
  if (!max || !e.host_id || !e.questions.some((q) => q.kind === "spell")) return [];
  const admin = supabaseAdmin();
  const { data: exams } = await admin.from("board_exams").select("id, questions, created_at").eq("host_id", e.host_id).lt("created_at", e.created_at).order("created_at", { ascending: false }).limit(40);
  const tests = ((exams ?? []) as { id: string; questions: ExamQ[] }[]).filter((x) => Array.isArray(x.questions) && x.questions.some((q) => q.kind === "spell")).slice(0, 15);
  if (!tests.length) return [];
  const { data: rows } = await admin.from("board_exam_entries").select("exam_id, name, answers, extra_qs").in("exam_id", tests.map((x) => x.id)).limit(3000);
  const me = nameKey(name);
  const history = tests.flatMap((t) => ((rows ?? []) as any[]).filter((r) => r.exam_id === t.id && nameKey(String(r.name ?? "")) === me)
    .map((r) => ({ questions: [...t.questions, ...cleanExamQuestions(r.extra_qs ?? [])], answers: r.answers ?? {} })));
  return missedSpellings(history, e.questions.filter((q) => q.kind === "spell").map((q) => String(q.answer)), max);
}
