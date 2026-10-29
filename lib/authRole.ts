// Shared authorization helpers for staff (admin + tutor) API routes.
// Keeps the "who is this and what learners may they touch" logic in one place
// so every tutor-scoped route computes the roster identically.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type StaffRole = "admin" | "tutor";

export type Staff = { id: string; role: StaffRole };

// Resolve the caller and confirm they're staff. Returns null when not signed in
// or not an admin/tutor — callers turn that into a 401/403.
export async function requireStaff(): Promise<Staff | null> {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "tutor") return null;
  return { id: user.id, role: me.role as StaffRole };
}

// The set of learner ids a tutor is responsible for: the union of every learner
// on the roster of a class assigned to them PLUS any directly-assigned learners.
// Admins aren't scoped — this is only meaningful for tutors.
export async function getRoster(tutorId: string): Promise<string[]> {
  const admin = supabaseAdmin();
  const ids = new Set<string>();

  // Direct assignments.
  const { data: direct } = await admin
    .from("teacher_students").select("student_id").eq("teacher_id", tutorId);
  (direct ?? []).forEach((r: any) => ids.add(r.student_id));

  // Learners in the tutor's classes.
  const { data: classes } = await admin
    .from("classes").select("id").eq("tutor_id", tutorId);
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (classIds.length) {
    const { data: roster } = await admin
      .from("class_students").select("student_id").in("class_id", classIds);
    (roster ?? []).forEach((r: any) => ids.add(r.student_id));
  }

  return [...ids];
}

// True if `studentId` is within this staff member's reach: admins reach everyone,
// tutors only their roster. Use to authorize a per-learner action.
export async function staffCanAccessStudent(staff: Staff, studentId: string): Promise<boolean> {
  if (staff.role === "admin") return true;
  const roster = await getRoster(staff.id);
  return roster.includes(studentId);
}

// True if this staff member may act on a class: admins on any class, tutors only
// on classes assigned to them. Use for recording / attendance actions.
export async function staffCanAccessClass(staff: Staff, classId: string): Promise<boolean> {
  if (staff.role === "admin") return true;
  const { data } = await supabaseAdmin()
    .from("classes").select("tutor_id").eq("id", classId).maybeSingle();
  return data?.tutor_id === staff.id;
}
