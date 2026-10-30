import { describe, it, expect } from "vitest";
import { buildBoardStats, type StatsInput } from "@/lib/boardStats";

const NOW = Date.parse("2026-10-30T12:00:00Z");
const ago = (days: number, hours = 0) => new Date(NOW - days * 86_400_000 - hours * 3_600_000).toISOString();
const ahead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

const input = (): StatsInput => ({
  accounts: [
    { user_id: "a", created_at: ago(60), email_verified_at: ago(60), trial_ends_at: ago(53), paid_until: ahead(5), suspended: false, school: "Kings" },
    { user_id: "b", created_at: ago(2), email_verified_at: ago(2), trial_ends_at: ahead(2), paid_until: null, suspended: false },
    { user_id: "c", created_at: ago(40), email_verified_at: ago(40), trial_ends_at: ago(33), paid_until: null, suspended: false },
    { user_id: "d", created_at: ago(1), email_verified_at: null, trial_ends_at: null, paid_until: null, suspended: false },
  ],
  people: [
    { id: "a", first_name: "Ada", last_name: "Obi", email: "ada@x.ng" },
    { id: "b", first_name: "Ben", last_name: "", email: "ben@x.ng" },
    { id: "admin", first_name: "Owner", last_name: "", email: "o@x.ng" },
  ],
  payments: [
    { user_id: "a", amount_ngn: 5000, paid_at: ago(35) }, // September
    { user_id: "a", amount_ngn: 5000, paid_at: ago(0, 2) },
  ],
  sessions: [
    { id: "s1", host_id: "a", created_at: ago(3), ended_at: ago(3, -1), status: "ended", title: "Fractions" },
    { id: "s2", host_id: "a", created_at: ago(0, 1), ended_at: null, status: "live", title: null },
    { id: "s3", host_id: "b", created_at: ago(1), ended_at: ago(1, -0.5), status: "ended" },
    { id: "s4", host_id: "admin", created_at: ago(1), ended_at: null, status: "live" }, // an admin's test class
    { id: "s5", host_id: "a", created_at: ago(45), ended_at: ago(45, -1), status: "ended" },
  ],
  guests: [
    { session_id: "s1", joined_at: ago(3) }, { session_id: "s1", joined_at: ago(3) }, { session_id: "s1", joined_at: ago(3) },
    { session_id: "s3", joined_at: ago(1) },
    { session_id: "s4", joined_at: ago(1) },
  ],
  quizzes: [{ session_id: "s1", created_at: ago(3) }, { session_id: "s4", created_at: ago(1) }],
  lessons: [{ owner_id: "a", created_at: ago(10) }, { owner_id: "admin", created_at: ago(10) }],
});

describe("admin dashboard numbers", () => {
  const s = buildBoardStats(input(), NOW);

  it("counts teachers by plan state", () => {
    expect(s.kpis.teachers).toBe(4);
    expect(s.kpis.byState).toEqual({ active: 1, trial: 1, expired: 1, unverified: 1, suspended: 0 });
  });

  it("adds up revenue for all time, 30 days and this month", () => {
    expect(s.kpis.revenueTotal).toBe(10000);
    expect(s.kpis.revenue30).toBe(5000);
    expect(s.kpis.revenueThisMonth).toBe(5000);
    expect(s.monthly).toHaveLength(12);
    expect(s.monthly.at(-1)).toEqual({ month: "2026-10", revenue: 5000, payments: 1 });
    expect(s.monthly.at(-2)).toEqual({ month: "2026-09", revenue: 5000, payments: 1 });
  });

  it("leaves out classes that aren't run by board teachers", () => {
    expect(s.kpis.classes30).toBe(3);
    expect(s.kpis.classesTotal).toBe(4);
    expect(s.kpis.liveNow).toBe(1);
    expect(s.kpis.students30).toBe(4);
    expect(s.kpis.quizzes30).toBe(1);
    expect(s.kpis.lessonsTotal).toBe(1);
  });

  it("works out class averages from finished classes", () => {
    expect(s.kpis.avgStudentsPerClass30).toBe(1.3); // 4 students over 3 classes
    expect(s.kpis.avgMinutes30).toBe(45); // 60 and 30 minutes
  });

  it("builds 12 weeks with the newest last", () => {
    expect(s.weekly).toHaveLength(12);
    expect(s.weekly.at(-1)).toMatchObject({ signups: 2, classes: 3, students: 4 });
    expect(s.weekly.reduce((n, w) => n + w.classes, 0)).toBe(4); // includes the class 45 days ago
  });

  it("shows the funnel from sign-up to paying", () => {
    expect(s.funnel).toEqual({ signedUp: 4, verified: 3, ranClass: 2, paid: 1 });
  });

  it("ranks the most active teachers", () => {
    expect(s.topTeachers.map((t) => [t.name, t.classes30, t.students30])).toEqual([["Ada Obi", 2, 3], ["Ben", 1, 1]]);
    expect(s.topTeachers[0]).toMatchObject({ school: "Kings", state: "active" });
  });

  it("lists trials ending within 3 days and plans within 7", () => {
    expect(s.endingSoon.map((t) => [t.id, t.state, t.daysLeft])).toEqual([["b", "trial", 2], ["a", "active", 5]]);
  });

  it("lists recent activity, newest first", () => {
    expect(s.recent[0]).toMatchObject({ kind: "class", text: "Ada Obi started a class" });
    expect(s.recent.some((e) => e.kind === "payment" && e.text === "Ada Obi paid ₦5,000")).toBe(true);
    expect(s.recent.some((e) => e.text.includes("Fractions") && e.text.includes("3 students"))).toBe(true);
  });

  it("copes with an empty board", () => {
    const e = buildBoardStats({ accounts: [], people: [], payments: [], sessions: [], guests: [], quizzes: [], lessons: [] }, NOW);
    expect(e.kpis.teachers).toBe(0);
    expect(e.kpis.avgMinutes30).toBe(0);
    expect(e.topTeachers).toEqual([]);
  });
});
