// SERVER ONLY — a class's homework (assignments) and every learner's work on
// it, for the class results (teacher), "My results" (learner), the parent
// report and the term progress page. Nothing before
// supabase/migration-assignments.sql has been run.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cleanItems } from "@/lib/assignments";
import type { HwEntryRow, HwInfo } from "@/lib/classResults";

export type ClassHomework = HwInfo & { createdAt: string };
export async function classHomework(sessionId: string): Promise<{ homework: ClassHomework[]; entries: HwEntryRow[] }> {
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("board_assignments").select("id, title, items, due_at, for_ids, created_at").eq("session_id", sessionId).order("created_at").limit(100);
  if (error || !data?.length) return { homework: [], entries: [] };
  const homework: ClassHomework[] = data.map((a: any) => ({
    id: a.id, title: String(a.title ?? "Homework"), total: cleanItems(a.items).reduce((s, it) => s + it.marks, 0),
    dueAt: a.due_at ?? null, forIds: Array.isArray(a.for_ids) ? a.for_ids.map(String) : null, createdAt: String(a.created_at ?? ""),
  }));
  const { data: es } = await admin.from("board_assignment_entries").select("assignment_id, student_id, name, score, total, submitted_at, returned_at").in("assignment_id", homework.map((h) => h.id)).limit(10_000);
  const entries: HwEntryRow[] = (es ?? []).map((r: any) => ({
    assignment_id: r.assignment_id, student_id: r.student_id, name: String(r.name ?? ""), score: r.score, total: r.total,
    submitted: !!r.submitted_at || !!r.returned_at, returned: !!r.returned_at, submittedAt: r.submitted_at ?? null,
  }));
  return { homework, entries };
}
