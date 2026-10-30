// Numbers for the admin dashboard, worked out from plain rows so they can be
// tested without a database. Weeks are rolling 7-day blocks ending now; months
// are calendar months in Lagos time (UTC+1).
import { boardAccess, type BoardState } from "@/lib/boardPlan";

const DAY = 86_400_000;
const LAGOS = 3_600_000; // UTC+1, no daylight saving

export type StatsInput = {
  accounts: { user_id: string; created_at: string; email_verified_at: string | null; trial_ends_at: string | null; paid_until: string | null; suspended: boolean | null; school?: string | null }[];
  people: { id: string; first_name: string | null; last_name: string | null; email: string | null }[];
  payments: { user_id: string; amount_ngn: number; paid_at: string }[];
  sessions: { id: string; host_id: string | null; created_at: string; ended_at: string | null; status: string; title?: string | null }[];
  guests: { session_id: string; joined_at: string }[];
  quizzes: { session_id: string | null; created_at: string }[];
  lessons: { owner_id: string; created_at: string }[];
};

export type BoardStats = {
  generatedAt: string;
  kpis: {
    teachers: number; byState: Record<BoardState, number>;
    revenueTotal: number; revenue30: number; revenueThisMonth: number;
    classesTotal: number; classes30: number; liveNow: number;
    studentsTotal: number; students30: number; avgStudentsPerClass30: number; avgMinutes30: number;
    quizzes30: number; lessonsTotal: number; activeTeachers30: number;
  };
  weekly: { start: string; signups: number; classes: number; students: number }[];
  monthly: { month: string; revenue: number; payments: number }[];
  funnel: { signedUp: number; verified: number; ranClass: number; paid: number };
  topTeachers: { id: string; name: string; email: string; school: string; classes30: number; students30: number; lastClass: string | null; state: BoardState }[];
  endingSoon: { id: string; name: string; email: string; state: BoardState; until: string | null; daysLeft: number }[];
  recent: { at: string; kind: "signup" | "payment" | "class"; text: string }[];
};

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);
const monthKey = (ms: number) => new Date(ms + LAGOS).toISOString().slice(0, 7);

export function buildBoardStats(d: StatsInput, now = Date.now()): BoardStats {
  const person = new Map(d.people.map((p) => [p.id, p]));
  const nameOf = (id: string) => {
    const p = person.get(id);
    return `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || p?.email || "Teacher";
  };
  const emailOf = (id: string) => person.get(id)?.email ?? "";
  const teacherIds = new Set(d.accounts.map((a) => a.user_id));
  const since30 = now - 30 * DAY;

  // Accounts by state.
  const byState: Record<BoardState, number> = { unverified: 0, trial: 0, active: 0, expired: 0, suspended: 0 };
  const access = new Map(d.accounts.map((a) => [a.user_id, boardAccess(a, now)]));
  for (const a of access.values()) byState[a.state]++;

  // Money.
  const payments = d.payments.filter((p) => Number.isFinite(p.amount_ngn));
  const sum = (xs: { amount_ngn: number }[]) => xs.reduce((n, p) => n + p.amount_ngn, 0);
  const thisMonth = monthKey(now);

  // Classes: only those run by board teachers (an admin's test classes are left out).
  const sessions = d.sessions.filter((s) => s.host_id && teacherIds.has(s.host_id));
  const sessionIds = new Set(sessions.map((s) => s.id));
  const guests = d.guests.filter((g) => sessionIds.has(g.session_id));
  const perSession = new Map<string, number>();
  for (const g of guests) perSession.set(g.session_id, (perSession.get(g.session_id) ?? 0) + 1);
  const recentSessions = sessions.filter((s) => t(s.created_at) >= since30);
  const lengths = recentSessions
    .map((s) => (s.ended_at ? (t(s.ended_at) - t(s.created_at)) / 60_000 : NaN))
    .filter((m) => Number.isFinite(m) && m > 0 && m <= 6 * 60);
  const students30 = guests.filter((g) => t(g.joined_at) >= since30).length;

  // Rolling weeks, oldest first.
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const end = now - (11 - i) * 7 * DAY, start = end - 7 * DAY;
    const inWeek = (iso: string) => { const x = t(iso); return x > start && x <= end; };
    return {
      start: new Date(start).toISOString(),
      signups: d.accounts.filter((a) => inWeek(a.created_at)).length,
      classes: sessions.filter((s) => inWeek(s.created_at)).length,
      students: guests.filter((g) => inWeek(g.joined_at)).length,
    };
  });

  // Calendar months, oldest first.
  const months: string[] = [];
  const cur = new Date(now + LAGOS);
  for (let i = 11; i >= 0; i--) {
    const m = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() - i, 1));
    months.push(m.toISOString().slice(0, 7));
  }
  const monthly = months.map((month) => {
    const ps = payments.filter((p) => monthKey(t(p.paid_at)) === month);
    return { month, revenue: sum(ps), payments: ps.length };
  });

  // Funnel: signed up → confirmed email → ran a class → paid.
  const hosts = new Set(sessions.map((s) => s.host_id as string));
  const payers = new Set(payments.map((p) => p.user_id));
  const funnel = {
    signedUp: d.accounts.length,
    verified: d.accounts.filter((a) => a.email_verified_at).length,
    ranClass: d.accounts.filter((a) => hosts.has(a.user_id)).length,
    paid: d.accounts.filter((a) => payers.has(a.user_id)).length,
  };

  // Most active teachers in the last 30 days.
  const school = new Map(d.accounts.map((a) => [a.user_id, a.school ?? ""]));
  const last = new Map<string, string>();
  for (const s of sessions) if (!last.has(s.host_id!) || t(s.created_at) > t(last.get(s.host_id!))) last.set(s.host_id!, s.created_at);
  const active = new Map<string, { classes: number; students: number }>();
  for (const s of recentSessions) {
    const r = active.get(s.host_id!) ?? { classes: 0, students: 0 };
    r.classes++; r.students += perSession.get(s.id) ?? 0;
    active.set(s.host_id!, r);
  }
  const topTeachers = [...active.entries()]
    .sort((a, b) => b[1].classes - a[1].classes || b[1].students - a[1].students)
    .slice(0, 10)
    .map(([id, r]) => ({ id, name: nameOf(id), email: emailOf(id), school: school.get(id) ?? "", classes30: r.classes, students30: r.students, lastClass: last.get(id) ?? null, state: access.get(id)?.state ?? "unverified" }));

  // Trials ending within 3 days, paid plans within 7: people to follow up.
  const endingSoon = d.accounts
    .map((a) => ({ a, x: access.get(a.user_id)! }))
    .filter(({ x }) => (x.state === "trial" && x.daysLeft <= 3) || (x.state === "active" && x.daysLeft <= 7))
    .sort((p, q) => t(p.x.until) - t(q.x.until))
    .map(({ a, x }) => ({ id: a.user_id, name: nameOf(a.user_id), email: emailOf(a.user_id), state: x.state, until: x.until, daysLeft: x.daysLeft }));

  const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
  const recent = [
    ...d.accounts.map((a) => ({ at: a.created_at, kind: "signup" as const, text: `${nameOf(a.user_id)} signed up${a.school ? ` (${a.school})` : ""}` })),
    ...payments.map((p) => ({ at: p.paid_at, kind: "payment" as const, text: `${nameOf(p.user_id)} paid ${naira(p.amount_ngn)}` })),
    ...sessions.map((s) => ({ at: s.created_at, kind: "class" as const, text: `${nameOf(s.host_id!)} started ${s.title ? `“${s.title}”` : "a class"}${perSession.get(s.id) ? ` · ${perSession.get(s.id)} students` : ""}` })),
  ].sort((a, b) => t(b.at) - t(a.at)).slice(0, 20);

  return {
    generatedAt: new Date(now).toISOString(),
    kpis: {
      teachers: d.accounts.length, byState,
      revenueTotal: sum(payments),
      revenue30: sum(payments.filter((p) => t(p.paid_at) >= since30)),
      revenueThisMonth: sum(payments.filter((p) => monthKey(t(p.paid_at)) === thisMonth)),
      classesTotal: sessions.length, classes30: recentSessions.length,
      liveNow: sessions.filter((s) => s.status === "live" && now - t(s.created_at) < 12 * 3_600_000).length,
      studentsTotal: guests.length, students30,
      avgStudentsPerClass30: recentSessions.length ? Math.round((recentSessions.reduce((n, s) => n + (perSession.get(s.id) ?? 0), 0) / recentSessions.length) * 10) / 10 : 0,
      avgMinutes30: lengths.length ? Math.round(lengths.reduce((n, m) => n + m, 0) / lengths.length) : 0,
      quizzes30: d.quizzes.filter((q) => q.session_id && sessionIds.has(q.session_id) && t(q.created_at) >= since30).length,
      lessonsTotal: d.lessons.filter((l) => teacherIds.has(l.owner_id)).length,
      activeTeachers30: active.size,
    },
    weekly, monthly, funnel, topTeachers, endingSoon, recent,
  };
}
