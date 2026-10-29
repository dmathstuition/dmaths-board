import { describe, it, expect, vi, beforeEach } from "vitest";

const sendPush = vi.fn(async () => {});
vi.mock("@/lib/push/send", () => ({ sendPush: (...a: any[]) => (sendPush as any)(...a) }));

function fakeDb(opts: { admins: string[]; learner?: any; failInsert?: boolean }) {
  const inserts: any[] = [];
  const db: any = {
    from: (table: string) => {
      const q: any = {
        _f: {} as Record<string, unknown>,
        select: () => q,
        eq: (k: string, v: unknown) => { q._f[k] = v; return q; },
        maybeSingle: async () => ({ data: table === "profiles" ? opts.learner ?? null : null, error: null }),
        insert: async (rows: any) => { if (opts.failInsert) throw new Error("db down"); inserts.push(...rows); return { error: null }; },
        then: (res: any) => Promise.resolve({ data: table === "profiles" && q._f.role === "admin" ? opts.admins.map((id) => ({ id })) : [], error: null }).then(res),
      };
      return q;
    },
  };
  return { db, inserts };
}

beforeEach(() => { vi.resetModules(); sendPush.mockClear(); });

describe("telling admins about learners' marked work", () => {
  it("words the title with the score and percentage", async () => {
    const { activityTitle } = await import("@/lib/adminActivity");
    expect(activityTitle("Ada Obi", { activity: "Times-table speed test", score: "18/20", percent: 90 })).toBe("Ada Obi scored 18/20 (90%) in Times-table speed test");
    expect(activityTitle("Ada Obi", { activity: "assignment: Essay" })).toBe("Ada Obi finished assignment: Essay");
  });
  it("puts it in every admin's bell, linking to the learner", async () => {
    const { notifyAdminsOfActivity } = await import("@/lib/adminActivity");
    const { db, inserts } = fakeDb({ admins: ["a1", "a2"], learner: { first_name: "Ada", last_name: "Obi", role: "student" } });
    await notifyAdminsOfActivity(db, { studentId: "s1", activity: "Daily Mix", score: "8/10", percent: 80 });
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({ user_id: "a1", title: "🎯 Ada Obi scored 8/10 (80%) in Daily Mix", link: "/admin/students/s1" });
    expect(sendPush).toHaveBeenCalledTimes(2);
  });
  it("buzzes phones at most once per learner every few minutes; the bell gets every result", async () => {
    const { notifyAdminsOfActivity } = await import("@/lib/adminActivity");
    const { db, inserts } = fakeDb({ admins: ["a1"], learner: { first_name: "Ada", role: "student" } });
    for (let i = 0; i < 3; i++) await notifyAdminsOfActivity(db, { studentId: "s2", activity: "Game: Bonds", score: `${i}/5` });
    expect(inserts).toHaveLength(3);
    expect(sendPush).toHaveBeenCalledTimes(1);
  });
  it("ignores staff trying things out, and never throws", async () => {
    const { notifyAdminsOfActivity } = await import("@/lib/adminActivity");
    const staff = fakeDb({ admins: ["a1"], learner: { first_name: "Tutor", role: "tutor" } });
    await notifyAdminsOfActivity(staff.db, { studentId: "t1", activity: "Practice", score: "1/1" });
    expect(staff.inserts).toHaveLength(0);
    const broken = fakeDb({ admins: ["a1"], learner: { role: "student" }, failInsert: true });
    await expect(notifyAdminsOfActivity(broken.db, { studentId: "s3", activity: "Practice" })).resolves.toBeUndefined();
  });
});
