import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
const viewer = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: any[]) => viewer(...a), currentUser: vi.fn(async () => ({ id: "t1", role: "tutor" })) }));

import { POST } from "@/app/api/live-sessions/route";

const req = (body: object) => new Request("https://dmaths.test/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const session = (over: object = {}) => ({ id: "s1", code: "123456", host_id: "t1", class_id: null, title: "Algebra", status: "ended", all_can_write: false, created_at: "", ended_at: "", ...over });

beforeEach(() => { mockAdmin = makeMockSupabaseClient(); viewer.mockReset(); });

describe("deleting an interactive class", () => {
  it("lets the host delete a finished class", async () => {
    viewer.mockResolvedValue({ id: "t1", role: "tutor", host: true, session: session(), seat: null });
    const res = await POST(req({ action: "delete", id: "s1" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.delete).toHaveBeenCalled();
  });
  it("won't delete a class that's still running", async () => {
    viewer.mockResolvedValue({ id: "t1", role: "tutor", host: true, session: session({ status: "live", created_at: new Date().toISOString() }), seat: null });
    const res = await POST(req({ action: "delete", id: "s1" }));
    expect(res.status).toBe(409);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });
  it("won't let a learner delete it", async () => {
    viewer.mockResolvedValue({ id: "l1", role: "student", host: false, session: session(), seat: {} });
    const res = await POST(req({ action: "delete", id: "s1" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });
});
