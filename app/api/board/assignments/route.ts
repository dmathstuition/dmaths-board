import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { hashSecret, randomToken } from "@/lib/boardAccess";
import { cleanGuestName } from "@/lib/boardPlan";
import { homeworkPath, readHomework } from "@/lib/homeworkLink";
import { cleanPageNote } from "@/lib/examAnnotate";
import { cleanContact } from "@/lib/classReport";
import {
  MAX_FEEDBACK, MAX_INSTRUCTIONS, MAX_TITLE, canWork, cleanAnswer, cleanFiles, cleanItems, cleanMarks, isFor, isLate, isNoteKey,
  itemMark, learnerItems, scoreOf, statusOf, type Assignment, type Entry,
} from "@/lib/assignments";

// Assignments (lib/assignments.ts). The teacher sets them in a class (during it
// or after it ends); each learner does theirs through a personal link that
// doesn't run out (lib/homeworkLink.ts), or from the class while they're in it.
//
// Teacher (the class's host):
//   GET  ?sessionId=                       → the class's assignments, with how far everyone has got
//   GET  ?sessionId=&id=                   → one assignment: everything, and every learner's progress and link
//   GET  ?sessionId=&id=&studentId=        → one learner's work, to mark
//   POST { action: "create", sessionId, title, instructions, items, files, dueAt, lateOk, review, forIds }
//        { action: "settings", sessionId, id, dueAt?, status?, lateOk?, review?, title? }
//        { action: "delete", sessionId, id }
//        { action: "mark", sessionId, id, studentId, n, mark }          (null clears it)
//        { action: "annotate", sessionId, id, studentId, key, ink, note } (key: "n", or "n.i" for an uploaded picture)
//        { action: "return", sessionId, id, studentId, feedback }       marked: back to the learner
//        { action: "redo", sessionId, id, studentId, feedback }         sent back to try again
//        { action: "add-learner", sessionId, name }                     someone who missed the class → their link
// Learner (?t= their link, or in class with sessionId):
//   GET  ?t=  | ?sessionId=                → their assignments in this class, and their link
//   GET  ?t=&id=                           → one assignment and their work on it (answers only once marked)
//   POST { action: "answer", t | sessionId, id, n, value }  · "submit" · "unsubmit"
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MISSING = /board_assignment/i;
const NEEDS = "Assignments need supabase/migration-assignments.sql — run it in Supabase once.";
const dbFail = (msg: string) => (MISSING.test(msg) ? bad(NEEDS, 501) : bad(msg, 500));

type Who = { teacher: boolean; sessionId: string; id: string; name: string };
// The teacher (host) or a learner — by their link, or their class pass while in class.
async function whoIs(t: string | null, sessionId: string | null): Promise<Who | null> {
  if (t) {
    const h = readHomework(t);
    if (!h) return null;
    const { data: g } = await supabaseAdmin().from("live_session_guests").select("id, name, removed").eq("id", h.g).eq("session_id", h.s).maybeSingle();
    if (!g || g.removed) return null;
    return { teacher: false, sessionId: h.s, id: g.id, name: g.name };
  }
  if (!sessionId) return null;
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v) return null;
  return { teacher: v.host, sessionId, id: v.id, name: v.name };
}

const toAssignment = (r: any): Assignment => ({
  id: r.id, sessionId: r.session_id, title: r.title, instructions: r.instructions ?? "", items: cleanItems(r.items), files: cleanFiles(r.files),
  forIds: Array.isArray(r.for_ids) ? r.for_ids.map(String) : null, dueAt: r.due_at ?? null, lateOk: r.late_ok !== false, review: r.review !== false,
  status: r.status === "closed" ? "closed" : "open", createdAt: r.created_at, remind: r.remind !== false, remindedAt: r.reminded_at ?? null,
});
const toEntry = (r: any): Entry => ({
  studentId: r.student_id, name: r.name ?? "", answers: r.answers ?? {}, marks: r.marks ?? {}, notes: r.notes ?? {}, feedback: r.feedback ?? "",
  startedAt: r.started_at ?? null, submittedAt: r.submitted_at ?? null, returnedAt: r.returned_at ?? null, tries: r.tries ?? 0, sentBack: !!r.sent_back,
});

async function assignmentIn(sessionId: string, id: string): Promise<Assignment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabaseAdmin().from("board_assignments").select("*").eq("id", id).eq("session_id", sessionId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAssignment(data) : null;
}
async function entryOf(id: string, studentId: string): Promise<Entry | null> {
  const { data, error } = await supabaseAdmin().from("board_assignment_entries").select("*").eq("assignment_id", id).eq("student_id", studentId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toEntry(data) : null;
}
// The class's learners (not removed), oldest first.
async function learnersOf(sessionId: string): Promise<{ id: string; name: string; parentEmail: boolean }[]> {
  const admin = supabaseAdmin();
  let { data, error }: { data: any[] | null; error: any } = await admin.from("live_session_guests").select("id, name, removed, joined_at, parent_contact").eq("session_id", sessionId).order("joined_at", { ascending: true }).limit(500);
  if (error) ({ data } = await admin.from("live_session_guests").select("id, name, removed, joined_at").eq("session_id", sessionId).order("joined_at", { ascending: true }).limit(500)); // before parent contacts were kept
  return (data ?? []).filter((g: any) => !g.removed).map((g: any) => ({ id: g.id, name: g.name, parentEmail: cleanContact(g.parent_contact)?.kind === "email" }));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t"), sessionId = url.searchParams.get("sessionId"), id = url.searchParams.get("id") ?? "", studentId = url.searchParams.get("studentId") ?? "";
  try {
    const who = await whoIs(t, sessionId);
    if (!who) return bad(t ? "This homework link doesn't work any more — ask your teacher for a new one." : "Join the class first.", 403);
    if (!rateLimit(`hw-get:${who.id}`, 120, 60_000)) return bad("Wait a moment and try again.", 429);
    const admin = supabaseAdmin();
    const { data: session } = await admin.from("live_sessions").select("title, host_id").eq("id", who.sessionId).maybeSingle();
    const { data: host } = session?.host_id ? await admin.from("profiles").select("first_name, last_name").eq("id", session.host_id).maybeSingle() : { data: null };
    const teacher = host ? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() || "Your teacher" : "Your teacher";
    const klass = { title: session?.title ?? "Class", teacher };

    if (!who.teacher) {
      const link = homeworkPath({ s: who.sessionId, g: who.id });
      if (id) {
        const a = await assignmentIn(who.sessionId, id);
        if (!a || !isFor(a, who.id)) return bad("That assignment isn't for you.", 404);
        const e = await entryOf(a.id, who.id);
        const returned = !!e?.returnedAt;
        const marks = returned ? a.items.map((it, n) => itemMark(it, e!.answers[String(n)], e!.marks[String(n)])) : null;
        const score = returned ? scoreOf(a.items, e!.answers, e!.marks) : null;
        return NextResponse.json({
          klass, link, name: who.name,
          assignment: { ...a, items: learnerItems(a.items, returned && a.review), forIds: undefined },
          entry: e ? { answers: e.answers, submittedAt: e.submittedAt, returnedAt: e.returnedAt, sentBack: e.sentBack, tries: e.tries,
            feedback: returned || e.sentBack ? e.feedback : "", notes: returned || e.sentBack ? e.notes : {}, marks, score: score?.score ?? null, total: score?.total ?? null } : null,
          status: statusOf(a, e), can: canWork(a, e),
        }, { headers: { "Cache-Control": "no-store" } });
      }
      const { data: rows, error } = await admin.from("board_assignments").select("*").eq("session_id", who.sessionId).order("created_at", { ascending: false }).limit(100);
      if (error) return dbFail(error.message);
      const mine = (rows ?? []).map(toAssignment).filter((a) => isFor(a, who.id));
      const { data: es } = mine.length ? await admin.from("board_assignment_entries").select("*").eq("student_id", who.id).in("assignment_id", mine.map((a) => a.id)) : { data: [] };
      const byId = new Map((es ?? []).map((r: any) => [r.assignment_id, toEntry(r)]));
      return NextResponse.json({
        klass, link, name: who.name,
        assignments: mine.map((a) => {
          const e = byId.get(a.id) ?? null, sc = e?.returnedAt ? scoreOf(a.items, e.answers, e.marks) : null;
          return { id: a.id, title: a.title, dueAt: a.dueAt, lateOk: a.lateOk, status: a.status, count: a.items.length, state: statusOf(a, e), score: sc?.score ?? null, total: sc?.total ?? null, createdAt: a.createdAt };
        }),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    // ── The teacher ──
    if (id && studentId) {
      const a = await assignmentIn(who.sessionId, id);
      if (!a) return bad("Assignment not found.", 404);
      const e = await entryOf(a.id, studentId);
      const learners = await learnersOf(who.sessionId);
      const name = e?.name || learners.find((l) => l.id === studentId)?.name || "Learner";
      return NextResponse.json({ assignment: a, entry: e, name, status: statusOf(a, e), score: e ? scoreOf(a.items, e.answers, e.marks) : null });
    }
    const learners = await learnersOf(who.sessionId);
    const origin = url.origin;
    if (id) {
      const a = await assignmentIn(who.sessionId, id);
      if (!a) return bad("Assignment not found.", 404);
      const { data: es, error } = await admin.from("board_assignment_entries").select("*").eq("assignment_id", a.id).limit(500);
      if (error) return dbFail(error.message);
      const byId = new Map((es ?? []).map((r: any) => [r.student_id, toEntry(r)]));
      const people = [...learners.filter((l) => isFor(a, l.id)), ...[...byId.values()].filter((e) => !learners.some((l) => l.id === e.studentId)).map((e) => ({ id: e.studentId, name: e.name, parentEmail: false }))];
      return NextResponse.json({
        assignment: a, klass,
        learners: people.map((p) => {
          const e = byId.get(p.id) ?? null, sc = e ? scoreOf(a.items, e.answers, e.marks) : null;
          return { id: p.id, name: e?.name || p.name, state: statusOf(a, e), submittedAt: e?.submittedAt ?? null, returnedAt: e?.returnedAt ?? null,
            late: !!e?.submittedAt && isLate(a, e.submittedAt), score: sc?.score ?? null, total: sc?.total ?? a.items.reduce((s, it) => s + it.marks, 0), toMark: sc?.toMark.length ?? 0,
            tries: e?.tries ?? 0, parentEmail: p.parentEmail, link: `${origin}${homeworkPath({ s: who.sessionId, g: p.id })}` };
        }),
      });
    }
    const { data: rows, error } = await admin.from("board_assignments").select("*").eq("session_id", who.sessionId).order("created_at", { ascending: false }).limit(100);
    if (error) return dbFail(error.message);
    const list = (rows ?? []).map(toAssignment);
    const { data: es } = list.length ? await admin.from("board_assignment_entries").select("assignment_id, student_id, submitted_at, returned_at, sent_back").in("assignment_id", list.map((a) => a.id)) : { data: [] };
    return NextResponse.json({
      klass, learners,
      assignments: list.map((a) => {
        const mine = (es ?? []).filter((r: any) => r.assignment_id === a.id);
        const handed = mine.filter((r: any) => r.submitted_at && !r.returned_at);
        return { id: a.id, title: a.title, dueAt: a.dueAt, status: a.status, count: a.items.length, createdAt: a.createdAt,
          counts: { for: a.forIds ? a.forIds.length : learners.length, started: mine.length, handedIn: handed.length, late: handed.filter((r: any) => isLate(a, r.submitted_at)).length, returned: mine.filter((r: any) => r.returned_at).length } };
      }),
    });
  } catch (e) { return dbFail(e instanceof Error ? e.message : String(e)); }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  try {
    const who = await whoIs(body?.t ? String(body.t) : null, body?.sessionId ? String(body.sessionId) : null);
    if (!who) return bad(body?.t ? "This homework link doesn't work any more — ask your teacher for a new one." : "Join the class first.", 403);
    const admin = supabaseAdmin();
    const id = String(body?.id ?? "");

    // ── The learner ──
    if (!who.teacher) {
      if (!rateLimit(`hw-post:${who.id}`, 240, 60_000)) return bad("Slow down a little — wait a moment.", 429);
      const a = await assignmentIn(who.sessionId, id);
      if (!a || !isFor(a, who.id)) return bad("That assignment isn't for you.", 404);
      const e = await entryOf(a.id, who.id);
      const now = new Date().toISOString();
      if (action === "answer") {
        const can = canWork(a, e);
        if (!can.ok) return bad(can.why!, 409);
        const n = Math.round(Number(body?.n));
        const it = a.items[n];
        if (!it) return bad("Which question?");
        const answers = { ...(e?.answers ?? {}), [String(n)]: cleanAnswer(it, body?.value) };
        const { error } = e
          ? await admin.from("board_assignment_entries").update({ answers, name: who.name, updated_at: now }).eq("assignment_id", a.id).eq("student_id", who.id)
          : await admin.from("board_assignment_entries").insert({ assignment_id: a.id, student_id: who.id, name: who.name, answers, started_at: now, updated_at: now });
        if (error) return dbFail(error.message);
        return NextResponse.json({ ok: true });
      }
      if (action === "submit") {
        const can = canWork(a, e);
        if (!can.ok) return bad(can.why!, 409);
        const sc = scoreOf(a.items, e?.answers ?? {}, e?.marks ?? {});
        const patch = { submitted_at: now, sent_back: false, updated_at: now, score: sc.score, total: sc.total, name: who.name };
        const { error } = e
          ? await admin.from("board_assignment_entries").update(patch).eq("assignment_id", a.id).eq("student_id", who.id)
          : await admin.from("board_assignment_entries").insert({ assignment_id: a.id, student_id: who.id, answers: {}, started_at: now, ...patch });
        if (error) return dbFail(error.message);
        return NextResponse.json({ ok: true, late: isLate(a, now) });
      }
      if (action === "unsubmit") {
        // Take it back to change something — until the teacher has marked it.
        if (!e?.submittedAt) return NextResponse.json({ ok: true });
        const can = canWork(a, { submittedAt: null, returnedAt: e.returnedAt });
        if (!can.ok) return bad(can.why!, 409);
        const { error } = await admin.from("board_assignment_entries").update({ submitted_at: null, updated_at: now }).eq("assignment_id", a.id).eq("student_id", who.id);
        if (error) return dbFail(error.message);
        return NextResponse.json({ ok: true });
      }
      return bad("Unknown action.");
    }

    // ── The teacher ──
    if (!rateLimit(`hw-teach:${who.id}`, 300, 60_000)) return bad("Slow down a little — wait a moment.", 429);
    if (action === "create") {
      const items = cleanItems(body?.items);
      if (!items.length) return bad("Add at least one question or task.");
      const title = String(body?.title ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) || "Assignment";
      const due = body?.dueAt ? new Date(String(body.dueAt)) : null;
      if (due && Number.isNaN(due.getTime())) return bad("That due date can't be read.");
      const forIds = Array.isArray(body?.forIds) && body.forIds.length ? [...new Set(body.forIds.map(String))].slice(0, 500) : null;
      const row = {
        session_id: who.sessionId, host_id: who.id, title, instructions: String(body?.instructions ?? "").replace(/\r/g, "").slice(0, MAX_INSTRUCTIONS).trim(),
        items, files: cleanFiles(body?.files), for_ids: forIds, due_at: due?.toISOString() ?? null, late_ok: body?.lateOk !== false, review: body?.review !== false,
      };
      let { data, error } = await admin.from("board_assignments").insert({ ...row, remind: body?.remind !== false }).select("id").single();
      // Set up before reminders were added: save it without the reminder setting.
      if (error && /remind/i.test(error.message)) ({ data, error } = await admin.from("board_assignments").insert(row).select("id").single());
      if (!data && !error) return bad("Couldn't save it — try again.", 500);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true, id: data!.id });
    }
    if (action === "add-learner") {
      // Someone who missed the class: a place in it (no PIN needed), and their link.
      const name = cleanGuestName(body?.name);
      if (name.length < 2) return bad("Type the learner's name.");
      const { data, error } = await admin.from("live_session_guests").insert({ session_id: who.sessionId, name, token_hash: hashSecret(randomToken()) }).select("id").single();
      if (error || !data) return bad("Couldn't add them — try again.", 500);
      return NextResponse.json({ ok: true, id: data.id, link: `${new URL(req.url).origin}${homeworkPath({ s: who.sessionId, g: data.id })}` });
    }
    const a = await assignmentIn(who.sessionId, id);
    if (!a) return bad("Assignment not found.", 404);
    if (action === "settings") {
      const patch: Record<string, unknown> = {};
      if (body?.status === "open" || body?.status === "closed") patch.status = body.status;
      if (typeof body?.lateOk === "boolean") patch.late_ok = body.lateOk;
      if (typeof body?.review === "boolean") patch.review = body.review;
      if (typeof body?.remind === "boolean") patch.remind = body.remind;
      if (typeof body?.title === "string" && body.title.trim()) patch.title = body.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
      if (body && "dueAt" in body) {
        const d = body.dueAt ? new Date(String(body.dueAt)) : null;
        if (d && Number.isNaN(d.getTime())) return bad("That due date can't be read.");
        patch.due_at = d?.toISOString() ?? null;
      }
      const { error } = await admin.from("board_assignments").update(patch).eq("id", a.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete") {
      const { error } = await admin.from("board_assignments").delete().eq("id", a.id);
      if (error) return dbFail(error.message);
      return NextResponse.json({ ok: true });
    }
    const studentId = String(body?.studentId ?? "");
    const e = await entryOf(a.id, studentId);
    if (!e) return bad("They haven't started this yet.", 404);
    const now = new Date().toISOString();
    const save = async (patch: Record<string, unknown>) => {
      const { error } = await admin.from("board_assignment_entries").update({ ...patch, updated_at: now }).eq("assignment_id", a.id).eq("student_id", studentId);
      return error ? dbFail(error.message) : null;
    };
    if (action === "mark") {
      const n = Math.round(Number(body?.n));
      if (!a.items[n]) return bad("Which question?");
      const marks = { ...e.marks };
      if (body?.mark == null) delete marks[String(n)]; else marks[String(n)] = Number(body.mark);
      const clean = cleanMarks(a.items, marks), sc = scoreOf(a.items, e.answers, clean);
      return (await save({ marks: clean, score: sc.score, total: sc.total })) ?? NextResponse.json({ ok: true, score: sc.score, total: sc.total, toMark: sc.toMark });
    }
    if (action === "annotate") {
      const key = String(body?.key ?? "");
      if (!isNoteKey(key, a.items)) return bad("Which page?");
      const notes = { ...e.notes }, p = cleanPageNote({ ink: body?.ink, note: body?.note });
      if (!p.ink.length && !p.note) delete notes[key]; else notes[key] = p;
      return (await save({ notes })) ?? NextResponse.json({ ok: true });
    }
    if (action === "return") {
      const sc = scoreOf(a.items, e.answers, e.marks);
      if (sc.toMark.length) return bad(`Mark ${sc.toMark.map((n) => `Q${n + 1}`).join(", ")} first.`, 409);
      return (await save({ returned_at: now, submitted_at: e.submittedAt ?? now, sent_back: false, score: sc.score, total: sc.total,
        feedback: String(body?.feedback ?? e.feedback).replace(/\r/g, "").slice(0, MAX_FEEDBACK).trim() })) ?? NextResponse.json({ ok: true, score: sc.score, total: sc.total });
    }
    if (action === "redo") {
      return (await save({ submitted_at: null, returned_at: null, sent_back: true, tries: e.tries + 1,
        feedback: String(body?.feedback ?? e.feedback).replace(/\r/g, "").slice(0, MAX_FEEDBACK).trim() })) ?? NextResponse.json({ ok: true });
    }
    return bad("Unknown action.");
  } catch (e) { return dbFail(e instanceof Error ? e.message : String(e)); }
}
