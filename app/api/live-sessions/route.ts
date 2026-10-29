import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser, sessionViewer, type SessionViewer } from "@/lib/sessionAccess";
import { staffCanAccessClass } from "@/lib/authRole";
import { limit } from "@/lib/ratelimit";
import { notifyUser } from "@/lib/notify";
import { boardTeacherCanUse, BOARD_MIGRATION_MSG, BOARD_MISSING } from "@/lib/boardAccess";
import { cleanBoard, cleanStrokes, itemCount } from "@/lib/whiteboard";
import {
  SEEN_EVERY_MS, boardJoinPath, canWrite, isBoardSession, seatTable, cleanCode, formatCode, isOpen, joinPath, makeCode, participantList, shortName, writerIds,
  type ParticipantRow, type SessionRow,
} from "@/lib/liveSession";

// Interactive class sessions (in-app board + live quiz, no video).
//   GET            → my sessions (host) or sessions I've joined / can join (learner)
//   GET ?id=       → one session as this viewer may see it (+ saved board)
//   POST { action } → create · join · end · write · allWrite · remove (host) / join (learner)
//   PUT  { id, board: { pages, paper }, toLessonLog? } → host saves the board (old clients send { strokes })
export const dynamic = "force-dynamic";

const MISSING = /live_session|quiz_sets/i;
const missing = () => NextResponse.json({ error: "Interactive classes need migration-live-sessions.sql — run it in Supabase." }, { status: 500 });
const fail = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return MISSING.test(msg) ? missing() : NextResponse.json({ error: msg }, { status: 500 });
};
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function namesFor(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await supabaseAdmin().from("profiles").select("id, first_name, last_name").in("id", ids);
  return new Map((data ?? []).map((p: any) => [p.id, shortName(p)]));
}

const summary = (s: SessionRow & { classes?: { subject?: string } | null }) => ({
  id: s.id, code: s.code, title: s.title, status: isOpen(s) ? "live" : "ended", classId: s.class_id,
  subject: s.classes?.subject ?? null, createdAt: s.created_at, endedAt: s.ended_at, link: isBoardSession(s) ? boardJoinPath(s.code) : joinPath(s.code),
  kind: s.kind ?? "academy",
});

// Participants, with raised hands when migration-class-management.sql has run.
async function seatRows(session: SessionRow) {
  const admin = supabaseAdmin(), sessionId = session.id;
  if (isBoardSession(session)) { // D-Maths Board: guests, shaped like participant rows
    const { data, error } = await admin.from("live_session_guests").select("id, name, can_write, removed, joined_at, last_seen, hand_raised_at").eq("session_id", sessionId).limit(500);
    return { data: (data ?? []).map((g: any) => ({ student_id: g.id, name: g.name, can_write: g.can_write, removed: g.removed, joined_at: g.joined_at, last_seen: g.last_seen, hand_raised_at: g.hand_raised_at })), error };
  }
  const full = await admin.from("live_session_participants").select("student_id, can_write, removed, joined_at, last_seen, hand_raised_at").eq("session_id", sessionId);
  if (!full.error || !/hand_raised_at/i.test(full.error.message)) return full;
  return admin.from("live_session_participants").select("student_id, can_write, removed, joined_at, last_seen").eq("session_id", sessionId);
}

async function view(v: SessionViewer, withBoard: boolean) {
  const admin = supabaseAdmin();
  const s = v.session;
  const [{ data: rows, error }, boardRow, { data: host }, { data: cls }] = await Promise.all([
    seatRows(s),
    withBoard ? admin.from("live_sessions").select("board").eq("id", s.id).maybeSingle() : Promise.resolve({ data: null }),
    s.host_id ? admin.from("profiles").select("first_name, last_name").eq("id", s.host_id).maybeSingle() : Promise.resolve({ data: null }),
    s.class_id ? admin.from("classes").select("subject").eq("id", s.class_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error) throw new Error(error.message);
  const seats = (rows ?? []) as ParticipantRow[];
  const names = isBoardSession(s) ? new Map(seats.map((r: any) => [r.student_id, String(r.name ?? "Student")])) : await namesFor(seats.map((r) => r.student_id));
  const people = participantList(seats, names, s.all_can_write);
  return {
    session: {
      ...summary(s), allCanWrite: s.all_can_write, hostId: s.host_id, subject: cls?.subject ?? null,
      hostName: host ? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() || "Your teacher" : "Your teacher",
    },
    me: { id: v.id, name: v.name, host: v.host, canWrite: canWrite(s, v, v.seat), handUp: !!seats.find((r) => r.student_id === v.id)?.hand_raised_at },
    writers: writerIds(s, seats),
    // Only the host gets the class list. A learner's screen just needs how many
    // are here — far less to send to every phone in a big class, and classmates'
    // names stay private.
    here: people.filter((p) => p.online).length,
    people: v.host ? people : [],
    ...(withBoard ? { board: (boardRow as any)?.data?.board ?? [] } : {}),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const admin = supabaseAdmin();
  try {
    const me = await currentUser();
    if (id) {
      const v = await sessionViewer(id, me); // a D-Maths Board guest has no account (me = null)
      if (!v) return bad("You're not in this class. Join with the PIN from your tutor.", 403);
      // Mark the learner as here (throttled).
      if (v.seat && Date.now() - new Date(v.seat.last_seen).getTime() > SEEN_EVERY_MS) {
        const t = seatTable(v.session);
        await admin.from(t.table).update({ last_seen: new Date().toISOString() }).eq("session_id", id).eq(t.key, v.id);
      }
      return NextResponse.json({ ...(await view(v, url.searchParams.get("board") === "1")), serverNow: Date.now() });
    }
    if (!me) return bad("Sign in first.", 401);

    if (me.role === "admin" || me.role === "tutor" || me.role === "board_teacher") {
      // ?board=1: the D-Maths Board app lists only your own board classes.
      const boardOnly = url.searchParams.get("board") === "1";
      const list = (cols: string) => {
        let q = admin.from("live_sessions").select(cols).order("created_at", { ascending: false }).limit(30);
        if (me.role !== "admin" || boardOnly) q = q.eq("host_id", me.id);
        if (boardOnly) q = q.eq("kind", "board");
        return q;
      };
      const base = "id, code, host_id, class_id, title, status, all_can_write, created_at, ended_at, classes(subject)";
      let { data, error } = await list(`${base}, kind`);
      if (error && !boardOnly && BOARD_MISSING.test(error.message)) ({ data, error } = await list(base)); // board migration not run yet
      if (error) throw new Error(error.message);
      return NextResponse.json({ sessions: (data ?? []).map((s: any) => ({ ...summary(s), mine: s.host_id === me.id })) });
    }

    // Learner: sessions I joined, plus live ones for my classes I haven't joined yet.
    const [{ data: seats, error }, { data: myClasses }] = await Promise.all([
      admin.from("live_session_participants").select("session_id, removed, joined_at").eq("student_id", me.id).order("joined_at", { ascending: false }).limit(20),
      admin.from("class_students").select("class_id").eq("student_id", me.id),
    ]);
    if (error) throw new Error(error.message);
    const joinedIds = (seats ?? []).filter((r: any) => !r.removed).map((r: any) => r.session_id);
    const classIds = (myClasses ?? []).map((c: any) => c.class_id);
    const [{ data: joined }, { data: forClasses }] = await Promise.all([
      joinedIds.length ? admin.from("live_sessions").select("id, code, host_id, class_id, title, status, all_can_write, created_at, ended_at, classes(subject)").in("id", joinedIds) : Promise.resolve({ data: [] as any[] }),
      classIds.length ? admin.from("live_sessions").select("id, code, host_id, class_id, title, status, all_can_write, created_at, ended_at, classes(subject)").in("class_id", classIds).eq("status", "live") : Promise.resolve({ data: [] as any[] }),
    ]);
    const joinedSet = new Set(joinedIds);
    const all = new Map<string, any>();
    for (const s of [...(joined ?? []), ...(forClasses ?? [])]) all.set(s.id, { ...summary(s), joined: joinedSet.has(s.id) });
    const sessions = [...all.values()].sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ sessions });
  } catch (e) { return fail(e); }
}

async function newSession(row: Record<string, unknown>) {
  const admin = supabaseAdmin();
  for (let i = 0; i < 6; i++) {
    const { data, error } = await admin.from("live_sessions").insert({ ...row, code: makeCode() }).select("*").single();
    if (!error) return data as SessionRow;
    if (error.code !== "23505") throw new Error(error.message);   // PIN clash → try another
  }
  throw new Error("Couldn't make a free PIN — try again.");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  try {
    const me = await currentUser();
    if (!me && action !== "hand") return bad("Sign in first.", 401);

    if (action === "create" && (me?.role === "board_teacher" || (me?.role === "admin" && body?.board === true))) {
      // D-Maths Board: needs a running trial or paid year (admins always may); students join as guests.
      if (me.role !== "admin" && !(await boardTeacherCanUse(me.id))) return bad("Your D-Maths Board trial or year has ended — renew to start a class.", 402);
      if (!(await limit(`board-create:${me.id}`, 20, 60 * 60_000))) return bad("You've started a lot of classes — wait a while.", 429);
      const title = String(body?.title ?? "").trim().slice(0, 80) || "Interactive class";
      try {
        const s = await newSession({ host_id: me.id, class_id: null, title, kind: "board" });
        await admin.from("audit_log").insert({ actor_id: me.id, action: "board_session_started", detail: { sessionId: s.id, title } });
        return NextResponse.json({ session: summary(s) });
      } catch (e) { return BOARD_MISSING.test(e instanceof Error ? e.message : "") ? bad(BOARD_MIGRATION_MSG, 500) : fail(e); }
    }
    // A D-Maths Board learner has no account (they joined with the PIN), but
    // may still raise a hand — their class pass is checked below.
    if (!me && action !== "hand") return bad("Sign in first.", 401);

    if (action === "create") {
      if (me.role !== "admin" && me.role !== "tutor") return bad("Only tutors and admins can start an interactive class.", 403);
      const classId = body?.classId ? String(body.classId) : null;
      let subject = "";
      if (classId) {
        if (!(await staffCanAccessClass({ id: me.id, role: me.role as "admin" | "tutor" }, classId))) return bad("That isn't one of your classes.", 403);
        const { data: cls } = await admin.from("classes").select("subject").eq("id", classId).maybeSingle();
        subject = cls?.subject ?? "";
      }
      const title = String(body?.title ?? "").trim().slice(0, 80) || (subject ? `${subject} — interactive class` : "Interactive class");
      const s = await newSession({ host_id: me.id, class_id: classId, title });
      await admin.from("audit_log").insert({ actor_id: me.id, action: "live_session_started", detail: { sessionId: s.id, classId, title } });
      // Let the class know (bell + push) so they can tap straight in.
      if (classId && body?.notify !== false) {
        const { data: roster } = await admin.from("class_students").select("student_id").eq("class_id", classId);
        await Promise.all((roster ?? []).map((r: any) => notifyUser(admin, r.student_id, {
          title: "Your interactive class has started", body: `${title} · PIN ${formatCode(s.code)}`, link: joinPath(s.code),
        }).catch(() => {})));
      }
      return NextResponse.json({ session: summary(s) });
    }

    if (action === "join") {
      if (me.role !== "student") return bad("Learners join from their portal. Tutors open the class from Interactive class.", 403);
      if (!(await limit(`live-join:${me.id}`, 20, 60_000))) return bad("Too many tries — wait a minute.", 429);
      const code = cleanCode(body?.code);
      if (!code) return bad("Enter the 6-digit PIN your tutor shared.");
      const { data: s, error } = await admin.from("live_sessions").select("*").eq("code", code).eq("status", "live").maybeSingle();
      if (error) throw new Error(error.message);
      if (!s || !isOpen(s)) return bad("No live class with that PIN. Check the number with your tutor.", 404);
      if (isBoardSession(s)) return bad("That PIN is for a D-Maths Board class — join it at dmaths.academy/join.", 409);
      const { data: seat } = await admin.from("live_session_participants").select("removed").eq("session_id", s.id).eq("student_id", me.id).maybeSingle();
      if (seat?.removed) return bad("The host removed you from this class.", 403);
      const now = new Date().toISOString();
      if (seat) await admin.from("live_session_participants").update({ last_seen: now }).eq("session_id", s.id).eq("student_id", me.id);
      else {
        const { error: insErr } = await admin.from("live_session_participants").insert({ session_id: s.id, student_id: me.id, joined_at: now, last_seen: now });
        if (insErr && insErr.code !== "23505") throw new Error(insErr.message);
      }
      return NextResponse.json({ id: s.id });
    }

    const id = String(body?.id ?? "");
    const v = await sessionViewer(id, me);
    if (!v) return bad("Session not found.", 404);
    const seats = seatTable(v.session);

    // A learner raises or lowers their hand.
    if (action === "hand" && !v.host) {
      if (!isOpen(v.session)) return bad("This class has ended.", 409);
      const { error } = await admin.from(seats.table)
        .update({ hand_raised_at: body?.up ? new Date().toISOString() : null }).eq("session_id", id).eq(seats.key, v.id);
      if (error) return /hand_raised_at/i.test(error.message) ? bad("Raise hand needs migration-class-management.sql — ask the admin.", 500) : bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    if (!v.host) return bad("Only the host can do that.", 403);

    if (action === "lowerHand" || action === "lowerAll") {
      let q = admin.from(seats.table).update({ hand_raised_at: null }).eq("session_id", id);
      if (action === "lowerHand") q = q.eq(seats.key, String(body?.studentId ?? ""));
      const { error } = await q;
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // Delete a finished class for good (its board, quizzes and attendance go with it).
    if (action === "delete") {
      if (!v.host) return bad("Only the host or an admin can delete this class.", 403);
      // A class left running past its time counts as ended too (it shows under past classes).
      if (isOpen(v.session)) return bad("End the class before deleting it.", 409);
      const { error } = await admin.from("live_sessions").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await admin.from("audit_log").insert({ actor_id: me.id, action: "live_session_deleted", detail: { sessionId: id, title: v.session.title, classId: v.session.class_id } });
      return NextResponse.json({ ok: true });
    }

    // Carry on with a class that was ended — or left running and timed out (the
    // teacher closed the tab without ending it). Same board, people and results;
    // the clock for the class restarts. Keeps the PIN unless another class took it.
    if (action === "reopen") {
      if (isOpen(v.session)) return NextResponse.json({ ok: true, code: v.session.code });
      if (me.role === "board_teacher" && !(await boardTeacherCanUse(me.id))) return bad("Your D-Maths Board trial or subscription has ended — renew to continue this class.", 402);
      if (!(await limit(`live-reopen:${me.id}`, 20, 60 * 60_000))) return bad("Too many tries — wait a while.", 429);
      const patch = { status: "live", ended_at: null, created_at: new Date().toISOString() };
      let code = v.session.code;
      let { error } = await admin.from("live_sessions").update(patch).eq("id", id);
      for (let i = 0; error?.code === "23505" && i < 6; i++) { // the PIN is in use by another live class
        code = makeCode();
        ({ error } = await admin.from("live_sessions").update({ ...patch, code }).eq("id", id));
      }
      if (error) throw new Error(error.message);
      await admin.from("audit_log").insert({ actor_id: me.id, action: "live_session_reopened", detail: { sessionId: id, classId: v.session.class_id } });
      return NextResponse.json({ ok: true, code });
    }

    if (action === "end") {
      const now = new Date().toISOString();
      await admin.from("live_sessions").update({ status: "ended", ended_at: now }).eq("id", id);
      await admin.from("live_quizzes").update({ status: "ended", ended_at: now }).eq("session_id", id).neq("status", "ended");
      await admin.from("audit_log").insert({ actor_id: me.id, action: "live_session_ended", detail: { sessionId: id, classId: v.session.class_id } });
      return NextResponse.json({ ok: true });
    }
    if (action === "allWrite") {
      await admin.from("live_sessions").update({ all_can_write: !!body?.value }).eq("id", id);
      return NextResponse.json({ ok: true });
    }
    if (action === "write" || action === "remove") {
      const studentId = String(body?.studentId ?? "");
      const patch = action === "write" ? { can_write: !!body?.value } : { removed: true, can_write: false };
      const { error } = await admin.from(seats.table).update(patch).eq("session_id", id).eq(seats.key, studentId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    if (action === "everyoneOff") {
      await admin.from("live_sessions").update({ all_can_write: false }).eq("id", id);
      await admin.from(seats.table).update({ can_write: false }).eq("session_id", id);
      return NextResponse.json({ ok: true });
    }
    return bad("Unknown action.");
  } catch (e) { return fail(e); }
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  try {
    const v = await sessionViewer(id);
    if (!v?.host) return bad("Only the host can save the board.", 403);
    const admin = supabaseAdmin();
    // Pages (new boards) or a single list of strokes (older clients).
    const board = body?.board ? cleanBoard(body.board) : cleanBoard(cleanStrokes(body?.strokes));
    const items = itemCount(board);
    const { error } = await admin.from("live_sessions").update({ board }).eq("id", id);
    if (error) throw new Error(error.message);

    let logged = false;
    if (body?.toLessonLog && v.session.class_id) {
      const { data: cls } = await admin.from("classes").select("subject").eq("id", v.session.class_id).maybeSingle();
      const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
      const { error: noteErr } = await admin.from("lesson_notes").insert({
        class_id: v.session.class_id, subject: cls?.subject ?? "", taught_on: today, author_id: v.id,
        topic: `${v.session.title} — whiteboard`,
        notes: `Board from the interactive class (${board.pages.length} page${board.pages.length === 1 ? "" : "s"}, ${items} items). Learners who joined can reopen it from Interactive class → Past classes.`,
      });
      logged = !noteErr;
    }
    return NextResponse.json({ ok: true, saved: items, logged });
  } catch (e) { return fail(e); }
}
