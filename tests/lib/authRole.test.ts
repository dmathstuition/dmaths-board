import { describe, it, expect, vi, beforeEach } from "vitest";

// Table-aware mock: each from(table) resolves to that table's rows (filters are
// ignored — getRoster's own set-union logic is what we're exercising).
const tables: Record<string, any[]> = {};
function chain(rows: any[]) {
  const qb: any = {
    select: () => qb,
    eq: () => qb,
    in: () => qb,
    then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return qb;
}

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({ from: (t: string) => chain(tables[t] ?? []) }),
}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => ({}) }));

import { getRoster, staffCanAccessStudent } from "@/lib/authRole";

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
});

describe("getRoster", () => {
  it("unions directly-assigned learners with learners in the tutor's classes", async () => {
    tables.teacher_students = [{ student_id: "s1" }];
    tables.classes = [{ id: "c1" }];
    tables.class_students = [{ student_id: "s2" }, { student_id: "s1" }]; // s1 duplicated

    const roster = await getRoster("tut-1");
    expect(roster.sort()).toEqual(["s1", "s2"]); // de-duplicated union
  });

  it("returns only direct assignments when the tutor has no classes", async () => {
    tables.teacher_students = [{ student_id: "s9" }];
    tables.classes = [];
    const roster = await getRoster("tut-1");
    expect(roster).toEqual(["s9"]);
  });

  it("returns an empty roster when nothing is assigned", async () => {
    const roster = await getRoster("tut-1");
    expect(roster).toEqual([]);
  });
});

describe("staffCanAccessStudent", () => {
  it("admins reach every learner without a roster lookup", async () => {
    const ok = await staffCanAccessStudent({ id: "admin-1", role: "admin" }, "anyone");
    expect(ok).toBe(true);
  });

  it("a tutor reaches only learners in their roster", async () => {
    tables.teacher_students = [{ student_id: "s1" }];
    tables.classes = [];
    expect(await staffCanAccessStudent({ id: "tut-1", role: "tutor" }, "s1")).toBe(true);
    expect(await staffCanAccessStudent({ id: "tut-1", role: "tutor" }, "s2")).toBe(false);
  });
});
