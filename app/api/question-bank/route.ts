import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { validateQuestion, normaliseQuestion, summariseGroups, type BankQuestion } from "@/lib/questionBank";
import { isAcademySubject } from "@/lib/subjects";

// Full column list (with the newer exam / group_name) and the original base set
// to fall back to when those columns haven't been migrated yet.
const COLS_FULL = "id, subject, level, topic, exam, group_name, question, code, image_url, options, answer, owner_id, created_at";
const COLS_BASE = "id, subject, level, topic, question, code, options, answer, owner_id, created_at";

// The CBT question bank. Staff only — a learner reading this table would have
// every answer, so there is no read path for them anywhere in the app.
//
// Admins manage the whole bank; a tutor may edit or delete only the questions
// they wrote, though they can read and reuse everyone's.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*question_bank/i.test(m)
    ? "The question bank needs migration-question-bank.sql — run it in Supabase."
    : m;

async function owns(admin: ReturnType<typeof supabaseAdmin>, staff: { id: string; role: string }, id: string) {
  if (staff.role === "admin") return true;
  const { data } = await admin.from("question_bank").select("owner_id").eq("id", id).maybeSingle();
  return data?.owner_id === staff.id;
}

// Narrow a set of ids to the ones this staff member may act on: admins own the
// whole bank, tutors only the questions they wrote.
async function ownedIds(admin: ReturnType<typeof supabaseAdmin>, staff: { id: string; role: string }, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 5000);
  if (!unique.length) return [];
  if (staff.role === "admin") return unique;
  const { data } = await admin.from("question_bank").select("id, owner_id").in("id", unique);
  return (data ?? []).filter((r: any) => r.owner_id === staff.id).map((r: any) => r.id as string);
}

// GET — browse, filtered. Returns rows in the shape the CBT builder expects.
export async function GET(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject")?.trim() ?? "";
  const level = url.searchParams.get("level")?.trim() ?? "";
  const topic = url.searchParams.get("topic")?.trim() ?? "";
  const group = url.searchParams.get("group")?.trim() ?? "";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
  const admin = supabaseAdmin();

  // Groups overview: every named set with its question count, across the whole
  // bank (not just one page). Returns [] when the column isn't migrated.
  if (url.searchParams.get("groups")) {
    const { data, error } = await admin.from("question_bank").select("group_name").limit(10000);
    if (error) return NextResponse.json({ groups: [] });
    return NextResponse.json({ groups: summariseGroups(data ?? []) });
  }

  const build = (cols: string) => {
    let q = admin.from("question_bank").select(cols).order("created_at", { ascending: false }).limit(limit);
    if (subject) q = q.eq("subject", subject);
    if (level) q = q.eq("level", level);
    if (topic) q = q.ilike("topic", `%${topic}%`);
    if (cols === COLS_FULL && group) q = q.eq("group_name", group);
    return q;
  };

  let { data, error } = await build(COLS_FULL);
  // Fall back to the base columns if exam / group_name aren't migrated yet.
  if (error && /column/i.test(error.message)) ({ data, error } = await build(COLS_BASE));
  if (error) return NextResponse.json({ error: explain(error.message), questions: [] }, { status: 200 });
  return NextResponse.json({ questions: data ?? [] });
}

// POST — save one question, or a whole batch straight from the CBT builder.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const level = String(b?.level ?? "").trim().slice(0, 40);
  const topic = String(b?.topic ?? "").trim().slice(0, 80);
  const exam = String(b?.exam ?? "").trim().slice(0, 60);
  const group_name = String(b?.group_name ?? "").trim().slice(0, 80);

  const incoming: Partial<BankQuestion>[] = Array.isArray(b?.questions)
    ? b.questions
    : b?.question ? [b as Partial<BankQuestion>] : [];
  if (!incoming.length) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  // Validate the lot before writing any of it — a half-saved batch is worse
  // than a rejected one.
  for (const q of incoming) {
    const problem = validateQuestion(q);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const rows = incoming.map((q) => ({
    ...normaliseQuestion(q),
    subject, level,
    // A question may carry its own topic (e.g. a mixed A.I mock paper); fall back
    // to the batch-level topic when it doesn't.
    topic: String((q as any).topic ?? "").trim().slice(0, 80) || topic,
    exam, group_name,
    owner_id: staff.id,
  }));

  // Return the full inserted rows so the client can show them immediately,
  // without depending on a re-fetch (which the browser can serve from cache).
  const admin = supabaseAdmin();
  let { data, error } = await admin.from("question_bank").insert(rows).select(COLS_FULL);
  // If the newer columns aren't migrated yet, save without them.
  if (error && /column .*(exam|group_name|image_url)/i.test(error.message)) {
    const stripped = rows.map(({ exam: _e, group_name: _g, image_url: _i, ...r }) => r);
    ({ data, error } = await admin.from("question_bank").insert(stripped).select(COLS_BASE));
  }
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, saved: data?.length ?? rows.length, rows: data ?? [] });
}

// PATCH — edit one question you own, OR bulk re-tag many at once.
// Bulk shape: { ids: string[], set: { subject?, level?, group_name? } } — only
// the fields present in `set` are changed, on the ids you're allowed to touch.
export async function PATCH(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);

  if (Array.isArray(b?.ids)) {
    const admin = supabaseAdmin();
    const ids = await ownedIds(admin, staff, b.ids.map((x: any) => String(x)));
    if (!ids.length) return NextResponse.json({ error: "Nothing you can re-tag was selected." }, { status: 403 });

    const set: Record<string, any> = {};
    const s = b?.set ?? {};
    if (typeof s.subject === "string" && s.subject.trim()) set.subject = s.subject.trim().slice(0, 80);
    if (typeof s.level === "string") set.level = s.level.trim().slice(0, 40);
    if (typeof s.group_name === "string") set.group_name = s.group_name.trim().slice(0, 80);
    if (!Object.keys(set).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

    let { error } = await admin.from("question_bank").update(set).in("id", ids);
    if (error && /column .*group_name/i.test(error.message) && "group_name" in set) {
      delete set.group_name;
      if (Object.keys(set).length) ({ error } = await admin.from("question_bank").update(set).in("id", ids));
      else error = null;
    }
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  const id = String(b?.id ?? "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  if (!(await owns(admin, staff, id))) {
    return NextResponse.json({ error: "That question isn't yours." }, { status: 403 });
  }

  const problem = validateQuestion(b);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const patch: Record<string, any> = {
    ...normaliseQuestion(b),
    subject: String(b?.subject ?? "").trim().slice(0, 80),
    level: String(b?.level ?? "").trim().slice(0, 40),
    topic: String(b?.topic ?? "").trim().slice(0, 80),
    exam: String(b?.exam ?? "").trim().slice(0, 60),
    group_name: String(b?.group_name ?? "").trim().slice(0, 80),
  };
  let { error } = await admin.from("question_bank").update(patch).eq("id", id);
  if (error && /column .*(exam|group_name|image_url)/i.test(error.message)) {
    delete patch.exam; delete patch.group_name; delete patch.image_url;
    ({ error } = await admin.from("question_bank").update(patch).eq("id", id));
  }
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove questions you own. Three shapes, in priority order:
//   ?legacy=1   admin-only: every question tagged with a former (non-academy)
//               subject — the "delete the old banks in bulk" action.
//   ?ids=a,b,c  the selected rows (filtered to the ones you may delete).
//   ?id=…       a single question.
// Tests already built keep their own copy, so this never touches a sat paper.
export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const admin = supabaseAdmin();

  // Purge every legacy-subject question (admins only — it can span the bank).
  if (url.searchParams.get("legacy")) {
    if (staff.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
    const { data, error } = await admin.from("question_bank").select("id, subject").limit(20000);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    const legacy = (data ?? []).filter((r: any) => !isAcademySubject(String(r.subject ?? ""))).map((r: any) => r.id as string);
    if (!legacy.length) return NextResponse.json({ ok: true, deleted: 0 });
    const { error: delErr } = await admin.from("question_bank").delete().in("id", legacy);
    if (delErr) return NextResponse.json({ error: explain(delErr.message) }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: legacy.length });
  }

  // Multi-select delete.
  const idsParam = url.searchParams.get("ids");
  if (idsParam) {
    const ids = await ownedIds(admin, staff, idsParam.split(",").map((s) => s.trim()));
    if (!ids.length) return NextResponse.json({ error: "Nothing you can delete was selected." }, { status: 403 });
    const { error } = await admin.from("question_bank").delete().in("id", ids);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  const id = url.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!(await owns(admin, staff, id))) {
    return NextResponse.json({ error: "That question isn't yours." }, { status: 403 });
  }
  const { error } = await admin.from("question_bank").delete().eq("id", id);
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: 1 });
}
