// SERVER ONLY — permanently delete a D-Maths Board teacher's account.
//
// What goes: their sign-in, profile, subscription, saved lessons, quiz sets,
// question bank, and every class they hosted (with its learners, marks,
// quizzes, exams and game scores), plus the slide pictures stored for them.
// What stays: a line in the audit log with who they were and what they paid,
// so the payment history isn't lost from the books.
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DeleteResult = { ok: true; classes: number; lessons: number; files: number } | { ok: false; error: string; status: number };

const rows = async <T,>(p: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> => { const { data, error } = await p; return error ? [] : data ?? []; };

// Remove every file in one storage folder (best effort; up to 1000 at a time).
async function clearFolder(folder: string): Promise<number> {
  const store = supabaseAdmin().storage.from("materials") as any;
  if (typeof store.list !== "function" || typeof store.remove !== "function") return 0;
  let gone = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await store.list(folder, { limit: 1000 }).catch(() => ({ data: null, error: true }));
    if (error || !data?.length) break;
    const paths = data.filter((f: any) => f?.name).map((f: any) => `${folder}/${f.name}`);
    if (!paths.length) break;
    const r = await store.remove(paths).catch(() => ({ error: true }));
    if (r?.error) break;
    gone += paths.length;
    if (data.length < 1000) break;
  }
  return gone;
}

export async function deleteBoardTeacher(userId: string, actorId: string): Promise<DeleteResult> {
  const admin = supabaseAdmin();
  if (!userId || userId === actorId) return { ok: false, error: "You can't delete your own account here.", status: 400 };
  const { data: p } = await admin.from("profiles").select("id, role, first_name, last_name, email").eq("id", userId).maybeSingle();
  if (!p) return { ok: false, error: "No account with that id.", status: 404 };
  if (p.role === "admin") return { ok: false, error: "Admin accounts can't be deleted here.", status: 403 };
  const { data: acc } = await admin.from("board_accounts").select("school, phone, created_at").eq("user_id", userId).maybeSingle();

  const [sessions, lessons, payments] = await Promise.all([
    rows<{ id: string }>(admin.from("live_sessions").select("id").eq("host_id", userId).limit(5000)),
    rows<{ id: string }>(admin.from("board_lessons").select("id").eq("owner_id", userId).limit(5000)),
    rows<{ reference: string; amount_ngn: number; paid_at: string }>(admin.from("board_payments").select("reference, amount_ngn, paid_at").eq("user_id", userId).limit(5000)),
  ]);

  // Slide pictures: one folder per class and per saved lesson.
  let files = 0;
  for (const f of [...sessions.map((s) => s.id), ...lessons.map((l) => `lesson-${l.id}`)]) {
    files += await clearFolder(`slides/${f.replace(/[^a-z0-9-]/gi, "").slice(0, 48)}`).catch(() => 0);
  }

  // Their classes (learners, marks, quizzes, exams and scores go with them),
  // and what would otherwise be left with no owner.
  if (sessions.length) {
    const { error } = await admin.from("live_sessions").delete().eq("host_id", userId);
    if (error) return { ok: false, error: `Couldn't delete their classes: ${error.message}`, status: 500 };
  }
  await admin.from("quiz_sets").delete().eq("owner_id", userId);
  await admin.from("question_bank").delete().eq("owner_id", userId);
  // The audit log keeps its lines, just without the link to them (it would block the delete).
  await admin.from("audit_log").update({ actor_id: null }).eq("actor_id", userId);

  // The sign-in itself: the profile, subscription, lessons and payments go with it.
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr && !/not.?found/i.test(authErr.message ?? "")) return { ok: false, error: `Couldn't delete the sign-in: ${authErr.message}`, status: 500 };
  if (authErr) await admin.from("profiles").delete().eq("id", userId); // no sign-in left: remove the profile directly

  await admin.from("audit_log").insert({
    actor_id: actorId, action: "board_teacher_deleted",
    detail: {
      userId, email: p.email ?? "", name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(), school: acc?.school ?? null, joined: acc?.created_at ?? null,
      classes: sessions.length, lessons: lessons.length, files,
      paidTotalNgn: payments.reduce((n, x) => n + (Number(x.amount_ngn) || 0), 0),
      payments: payments.slice(0, 200).map((x) => ({ reference: x.reference, amountNgn: x.amount_ngn, paidAt: x.paid_at })),
    },
  });
  return { ok: true, classes: sessions.length, lessons: lessons.length, files };
}
