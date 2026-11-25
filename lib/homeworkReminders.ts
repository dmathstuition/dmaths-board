// SERVER ONLY — the evening homework reminder: for each assignment due within
// the next day or so (and not reminded yet), an email to the parent of every
// learner who hasn't handed it in — the parent's email is the one given when
// the learner joined the class. Once per assignment. Runs from the daily cron
// (/api/cron/homework-reminders). Parents who gave a WhatsApp number instead
// get the teacher's one-tap WhatsApp reminder.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { cleanContact } from "@/lib/classReport";
import { homeworkPath } from "@/lib/homeworkLink";
import { REMIND_WINDOW_H, dueSoon, reminderEmail, reminderTargets } from "@/lib/assignments";

export async function sendHomeworkReminders(admin: SupabaseClient, now = Date.now()): Promise<{ assignments: number; sent: number }> {
  const { data: due, error } = await admin.from("board_assignments").select("id, session_id, title, due_at, for_ids, remind, reminded_at, status")
    .eq("status", "open").is("reminded_at", null).gt("due_at", new Date(now).toISOString()).lte("due_at", new Date(now + REMIND_WINDOW_H * 3_600_000).toISOString()).limit(500);
  if (error || !due?.length) return { assignments: 0, sent: 0 }; // none, or the migration isn't in yet
  let assignments = 0, sent = 0;
  for (const a of due as any[]) {
    if (a.remind === false || !dueSoon(a.due_at, now)) continue;
    // Claim it first, so two runs never send it twice.
    const { data: claimed, error: claimErr } = await admin.from("board_assignments").update({ reminded_at: new Date(now).toISOString() }).eq("id", a.id).is("reminded_at", null).select("id");
    if (claimErr || !claimed?.length) continue;
    assignments++;
    const [{ data: guests }, { data: entries }, { data: session }] = await Promise.all([
      admin.from("live_session_guests").select("id, name, removed, parent_contact").eq("session_id", a.session_id).limit(500),
      admin.from("board_assignment_entries").select("student_id, submitted_at, returned_at").eq("assignment_id", a.id).limit(500),
      admin.from("live_sessions").select("title, host_id").eq("id", a.session_id).maybeSingle(),
    ]);
    const { data: host } = session?.host_id ? await admin.from("profiles").select("first_name, last_name").eq("id", session.host_id).maybeSingle() : { data: null };
    const teacher = host ? `${host.first_name ?? ""} ${host.last_name ?? ""}`.trim() : "";
    const people = (guests ?? []).map((g: any) => { const c = cleanContact(g.parent_contact); return { ...g, email: c?.kind === "email" ? c.value : null }; });
    const forIds = Array.isArray(a.for_ids) ? a.for_ids.map(String) : null;
    for (const g of reminderTargets({ forIds }, people, entries ?? [])) {
      const link = `${siteBaseUrl()}${homeworkPath({ s: a.session_id, g: g.id })}`;
      const m = reminderEmail({ learner: g.name, title: a.title, dueAt: a.due_at, teacher, klass: session?.title || "class", link });
      const ok = await sendEmail("notice", g.email!, { firstName: "", title: m.title, body: m.body, loginUrl: link, linkUrl: link, linkText: "Open the homework" }).catch(() => false);
      if (ok) sent++;
    }
  }
  return { assignments, sent };
}
