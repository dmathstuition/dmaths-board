import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
let adminId: string | null = "admin-1";
vi.mock("@/lib/boardAdmin", () => ({ requireBoardAdmin: async () => adminId }));

import { POST } from "@/app/api/board/admin/route";
import { deleteBoardTeacher } from "@/lib/boardDelete";

const req = (body: object) => new Request("https://dmaths.test/api/board/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const teacher = { id: "t-1", role: "board_teacher", first_name: "Ada", last_name: "Obi", email: "ada@school.ng" };

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  adminId = "admin-1";
  (mockAdmin._storage as any).list = vi.fn().mockResolvedValue({ data: [{ name: "a.jpg" }, { name: "b.jpg" }], error: null });
  (mockAdmin._storage as any).remove = vi.fn().mockResolvedValue({ data: [], error: null });
});
const calls = (m: string) => (mockAdmin._qb[m] as any).mock.calls;
const tablesFor = (m: string) => {
  // which table each delete/update ran on: the from() call just before it
  const order = (mockAdmin.from as any).mock.invocationCallOrder as number[], tables = (mockAdmin.from as any).mock.calls.map((c: any[]) => c[0]);
  return (mockAdmin._qb[m] as any).mock.invocationCallOrder.map((n: number) => tables[order.filter((o) => o < n).length - 1]);
};

describe("deleting a D-Maths Board teacher", () => {
  it("only admins can, and only by typing the teacher's email", async () => {
    adminId = null;
    expect((await POST(req({ userId: "t-1", action: "delete", confirm: "ada@school.ng" }))).status).toBe(403);
    adminId = "admin-1";
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { user_id: "t-1" }, error: null }).mockResolvedValueOnce({ data: { email: "ada@school.ng" }, error: null });
    const r = await POST(req({ userId: "t-1", action: "delete", confirm: "someone@else.ng" }));
    expect(r.status).toBe(400);
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("removes their classes, files and sign-in, and keeps what they paid in the audit log", async () => {
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: { user_id: "t-1" }, error: null })            // route: their board account
      .mockResolvedValueOnce({ data: { email: "Ada@School.ng" }, error: null })    // route: their email
      .mockResolvedValueOnce({ data: teacher, error: null })                       // profile
      .mockResolvedValueOnce({ data: { school: "Grace High" }, error: null });     // board account
    mockAdmin._qb._setDirectResolve({ data: [{ id: "s-1", reference: "PSK-1", amount_ngn: 5000, paid_at: "2026-10-01" }] });
    const res = await POST(req({ userId: "t-1", action: "delete", confirm: " ada@school.ng " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, classes: 1, lessons: 1 });
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("t-1");
    expect(tablesFor("delete")).toEqual(expect.arrayContaining(["live_sessions", "quiz_sets", "question_bank"]));
    expect(calls("update")).toContainEqual([{ actor_id: null }]); // unblocks the delete; the log lines stay
    expect((mockAdmin._storage as any).remove).toHaveBeenCalledWith(["slides/s-1/a.jpg", "slides/s-1/b.jpg"]);
    const log = calls("insert").map((c: any[]) => c[0]).find((x: any) => x.action === "board_teacher_deleted");
    expect(log).toMatchObject({ actor_id: "admin-1", detail: { userId: "t-1", email: "ada@school.ng", school: "Grace High", paidTotalNgn: 5000 } });
    expect(log.detail.payments).toEqual([{ reference: "PSK-1", amountNgn: 5000, paidAt: "2026-10-01" }]);
  });

  it("won't delete an admin, or the admin doing the deleting", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { ...teacher, role: "admin" }, error: null });
    expect(await deleteBoardTeacher("t-1", "admin-1")).toMatchObject({ ok: false, status: 403 });
    expect(await deleteBoardTeacher("admin-1", "admin-1")).toMatchObject({ ok: false, status: 400 });
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("stops if their classes can't be deleted, before touching the sign-in", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: teacher, error: null }).mockResolvedValueOnce({ data: null, error: null });
    let n = 0;
    mockAdmin._qb.then = (resolve: any) => Promise.resolve(++n <= 3 ? { data: [{ id: "s-1" }], error: null } : { data: null, error: { message: "boom" } }).then(resolve);
    expect(await deleteBoardTeacher("t-1", "admin-1")).toMatchObject({ ok: false, status: 500 });
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
