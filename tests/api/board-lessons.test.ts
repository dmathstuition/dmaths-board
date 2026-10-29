import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
const staff = vi.fn();
vi.mock("@/lib/boardAccess", async (orig) => ({ ...(await orig<any>()), requireBoardOrStaff: () => staff(), boardTeacherCanUse: async () => true }));

import { GET, POST, DELETE } from "@/app/api/board-lessons/route";

const post = (body: object) => new Request("https://dmaths.test/api/board-lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const lesson = (over: object = {}) => ({ id: "L1", owner_id: "t1", title: "Fractions", subject: "Maths", shared: false, board: { pages: [[]], paper: ["plain"], bg: [null] }, widgets: null, pages: 1, items: 0, ...over });

beforeEach(() => { mockAdmin = makeMockSupabaseClient(); staff.mockReset(); });

describe("lesson library", () => {
  it("is only for tutors and admins", async () => {
    staff.mockResolvedValue(null);
    expect((await GET(new Request("https://dmaths.test/api/board-lessons"))).status).toBe(403);
    expect((await POST(post({ action: "save", title: "x" }))).status).toBe(403);
  });
  it("creates a lesson with a cleaned board", async () => {
    staff.mockResolvedValue({ id: "t1", role: "tutor" });
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { id: "L9" }, error: null });
    const res = await POST(post({ action: "save", title: "  Adding fractions ", board: { pages: [[{ id: "a", by: "t1", color: "#000000", w: 4, pts: [0.1, 0.1] }], "junk"], paper: ["grid"] } }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("L9");
    const row = mockAdmin._qb.insert.mock.calls[0][0];
    expect(row).toMatchObject({ owner_id: "t1", title: "Adding fractions", pages: 2, items: 1 });
    expect(row.board.paper).toEqual(["grid", "plain"]);
  });
  it("lets only the owner (or an admin) change or delete a lesson", async () => {
    staff.mockResolvedValue({ id: "t2", role: "tutor" });
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: lesson({ shared: true }), error: null });
    expect((await POST(post({ action: "save", id: "L1", title: "Mine now" }))).status).toBe(403);
    expect((await DELETE(new Request("https://dmaths.test/api/board-lessons?id=L1", { method: "DELETE" }))).status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
    staff.mockResolvedValue({ id: "a1", role: "admin" });
    expect((await POST(post({ action: "save", id: "L1", shared: false }))).status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalled();
  });
  it("opens shared lessons for other tutors, but not private ones", async () => {
    staff.mockResolvedValue({ id: "t2", role: "tutor" });
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: lesson({ shared: true }), error: null });
    const ok = await GET(new Request("https://dmaths.test/api/board-lessons?id=L1"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).lesson).toMatchObject({ mine: false, canEdit: false });
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: lesson({ shared: false }), error: null });
    expect((await GET(new Request("https://dmaths.test/api/board-lessons?id=L1"))).status).toBe(404);
  });
  it("copies a shared lesson into my library", async () => {
    staff.mockResolvedValue({ id: "t2", role: "tutor" });
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: lesson({ shared: true }), error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { id: "L2" }, error: null });
    const res = await POST(post({ action: "copy", id: "L1" }));
    expect((await res.json()).id).toBe("L2");
    expect(mockAdmin._qb.insert.mock.calls[0][0]).toMatchObject({ owner_id: "t2", title: "Fractions (copy)", shared: false });
  });
  it("explains when the migration hasn't been run", async () => {
    staff.mockResolvedValue({ id: "t1", role: "tutor" });
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'relation "board_lessons" does not exist' } });
    const res = await GET(new Request("https://dmaths.test/api/board-lessons?id=L1"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/migration-board-lessons\.sql/);
  });
});
