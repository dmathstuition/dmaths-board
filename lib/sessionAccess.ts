// Who may use an interactive class session: its host (the tutor who started
// it, or any admin) and learners who joined with the PIN and weren't removed.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { shortName, type ParticipantRow, type SessionRow } from "@/lib/liveSession";
import { readGuestPass, sameSecret } from "@/lib/boardAccess";

export type Me = { id: string; role: string; name: string; fullName: string };
export type SessionViewer = Me & { host: boolean; session: SessionRow; seat: ParticipantRow | null };

export async function currentUser(): Promise<Me | null> {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return null;
  const { data: p } = await supabaseAdmin().from("profiles").select("role, first_name, last_name").eq("id", user.id).maybeSingle();
  if (!p) return null;
  return { id: user.id, role: p.role, name: shortName(p, p.role === "student" ? "Learner" : "Tutor"), fullName: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() };
}

export async function sessionViewer(sessionId: string, me?: Me | null): Promise<SessionViewer | null> {
  if (!sessionId) return null;
  const user = me === undefined ? await currentUser() : me;
  const admin = supabaseAdmin();
  const cols = "id, code, host_id, class_id, title, status, all_can_write, created_at, ended_at";
  let { data: session, error } = await admin.from("live_sessions").select(`${cols}, kind`).eq("id", sessionId).maybeSingle();
  // Before migration-dmaths-board.sql there's no kind column: every class is an academy class.
  if (error && /kind/i.test(error.message)) ({ data: session, error } = await admin.from("live_sessions").select(cols).eq("id", sessionId).maybeSingle() as any);
  if (error) throw new Error(error.message);
  if (!session) return null;
  if (!user) return guestViewer(session as SessionRow);
  if (user.role === "admin" || session.host_id === user.id) return { ...user, host: true, session: session as SessionRow, seat: null };
  // D-Maths Board classes are joined as a guest (PIN + name), even by someone signed in.
  if (session.kind === "board") return guestViewer(session as SessionRow);
  if (user.role !== "student") return null;
  const { data: seat } = await admin.from("live_session_participants").select("student_id, can_write, removed, joined_at, last_seen")
    .eq("session_id", sessionId).eq("student_id", user.id).maybeSingle();
  if (!seat || seat.removed) return null;
  return { ...user, host: false, session: session as SessionRow, seat: seat as ParticipantRow };
}

// A student in a D-Maths Board class: no account, just the secret pass this
// device got when they joined with the PIN (an httpOnly cookie; only its hash
// is stored). Removed guests and passes for another class get nothing.
export async function guestViewer(session: SessionRow): Promise<SessionViewer | null> {
  if (session.kind !== "board") return null;
  const pass = readGuestPass();
  if (!pass || pass.sessionId !== session.id) return null;
  const { data: g } = await supabaseAdmin().from("live_session_guests").select("*").eq("id", pass.guestId).eq("session_id", session.id).maybeSingle();
  if (!g || g.removed || !sameSecret(pass.token, g.token_hash)) return null;
  const seat: ParticipantRow = { student_id: g.id, can_write: g.can_write, removed: g.removed, joined_at: g.joined_at, last_seen: g.last_seen, hand_raised_at: g.hand_raised_at };
  return { id: g.id, role: "guest", name: g.name, fullName: g.name, host: false, session, seat };
}
