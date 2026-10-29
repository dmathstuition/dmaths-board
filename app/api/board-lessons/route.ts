import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireBoardOrStaff } from "@/lib/boardAccess";
import { rateLimit } from "@/lib/ratelimit";
import { cleanBoard, itemCount } from "@/lib/whiteboard";
import { cleanWidgets } from "@/lib/boardTools";

// The lesson library: whiteboards prepared before class (tutors and admins).
//   GET              → my lessons + lessons other tutors shared (no board data)
//   GET ?id=         → one lesson with its board (owner, admin, or shared)
//   POST { action: "save", id?, title, subject, shared, board?, widgets? } → create / update (owner or admin)
//   POST { action: "copy", id } → a copy of a lesson I can open, in my library
//   DELETE ?id=      → delete (owner or admin)
export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MISSING = /board_lessons/i;
const fail = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return MISSING.test(msg) && /exist|schema|relation/i.test(msg)
    ? bad("The lesson library needs migration-board-lessons.sql — run it in Supabase.", 500)
    : bad(msg, 500);
};
const LIST = "id, owner_id, title, subject, shared, pages, items, updated_at";
const cleanTitle = (v: unknown, d = "Untitled lesson") => String(v ?? "").trim().slice(0, 100) || d;

async function load(id: string) {
  const { data, error } = await supabaseAdmin().from("board_lessons").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function GET(req: Request) {
  const me = await requireBoardOrStaff();
  if (!me) return bad("Sign in with an active account to use the lesson library.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    if (id) {
      const l = await load(id);
      // D-Maths Board teachers only ever see their own lessons (shared ones are the academy's).
      if (!l || (l.owner_id !== me.id && me.role !== "admin" && (!l.shared || me.role === "board_teacher"))) return bad("That lesson isn't available.", 404);
      return NextResponse.json({ lesson: { ...l, board: cleanBoard(l.board), widgets: l.widgets ? cleanWidgets(l.widgets) : null, mine: l.owner_id === me.id, canEdit: l.owner_id === me.id || me.role === "admin" } });
    }
    const admin = supabaseAdmin();
    const [mine, shared] = await Promise.all([
      admin.from("board_lessons").select(LIST).eq("owner_id", me.id).order("updated_at", { ascending: false }).limit(200),
      me.role === "board_teacher" ? Promise.resolve({ data: [] as any[] })
        : admin.from("board_lessons").select(LIST).eq("shared", true).neq("owner_id", me.id).order("updated_at", { ascending: false }).limit(200),
    ]);
    if (mine.error) throw new Error(mine.error.message);
    const others = (shared.data ?? []) as any[];
    const ids = [...new Set(others.map((l) => l.owner_id))];
    const { data: owners } = ids.length ? await admin.from("profiles").select("id, first_name, last_name").in("id", ids) : { data: [] as any[] };
    const name = new Map((owners ?? []).map((p: any) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A tutor"]));
    return NextResponse.json({
      mine: mine.data ?? [],
      shared: others.map((l) => ({ ...l, ownerName: name.get(l.owner_id) ?? "A tutor" })),
    });
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  const me = await requireBoardOrStaff();
  if (!me) return bad("Sign in with an active account to use the lesson library.", 403);
  if (!rateLimit(`board-lessons:${me.id}`, 60, 60_000)) return bad("Too many saves — wait a moment.", 429);
  const body = await req.json().catch(() => null);
  const admin = supabaseAdmin();
  try {
    if (body?.action === "copy") {
      const l = await load(String(body.id ?? ""));
      if (!l || (l.owner_id !== me.id && me.role !== "admin" && (!l.shared || me.role === "board_teacher"))) return bad("That lesson isn't available.", 404);
      const { data, error } = await admin.from("board_lessons").insert({
        owner_id: me.id, title: cleanTitle(`${l.title} (copy)`), subject: l.subject, shared: false,
        board: cleanBoard(l.board), widgets: l.widgets, pages: l.pages, items: l.items,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ id: data.id });
    }
    if (body?.action !== "save") return bad("Unknown action.");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = cleanTitle(body.title);
    if (body.subject !== undefined) patch.subject = String(body.subject ?? "").trim().slice(0, 60);
    if (body.shared !== undefined) patch.shared = me.role !== "board_teacher" && !!body.shared; // sharing is between academy tutors
    if (body.board !== undefined) {
      const board = cleanBoard(body.board);
      Object.assign(patch, { board, pages: board.pages.length, items: itemCount(board) });
    }
    if (body.widgets !== undefined) patch.widgets = body.widgets ? cleanWidgets(body.widgets) : null;
    const id = String(body.id ?? "");
    if (id) {
      const l = await load(id);
      if (!l) return bad("That lesson no longer exists.", 404);
      if (l.owner_id !== me.id && me.role !== "admin") return bad("Only the tutor who made this lesson can change it — make a copy instead.", 403);
      const { error } = await admin.from("board_lessons").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ id });
    }
    const { data, error } = await admin.from("board_lessons").insert({ owner_id: me.id, title: "Untitled lesson", ...patch }).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data.id });
  } catch (e) { return fail(e); }
}

export async function DELETE(req: Request) {
  const me = await requireBoardOrStaff();
  if (!me) return bad("Sign in with an active account to use the lesson library.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    const l = await load(id);
    if (!l) return NextResponse.json({ ok: true });
    if (l.owner_id !== me.id && me.role !== "admin") return bad("Only the tutor who made this lesson can delete it.", 403);
    const { error } = await supabaseAdmin().from("board_lessons").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) { return fail(e); }
}
