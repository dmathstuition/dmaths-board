import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true, limit: async () => true, clientKey: (_r: unknown, s: string) => s }));
const viewer = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: any[]) => viewer(...a) }));
import { GET, POST, DELETE } from "@/app/api/live-sessions/results/route";

const post = (body: object) => new Request("https://dmaths.test/api/live-sessions/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const host = { id: "t1", host: true };
beforeEach(() => { mockAdmin = makeMockSupabaseClient(); viewer.mockReset(); });

describe("class results API", () => {
  it("lets only the class's teacher give marks, and keeps them in range", async () => {
    viewer.mockResolvedValue({ id: "g1", host: false });
    expect((await POST(post({ id: "s1", action: "mark", roundId: "r1", studentId: "g1", mark: 1, max: 1 }))).status).toBe(403);
    viewer.mockResolvedValue(host);
    const res = await POST(post({ id: "s1", action: "mark", roundId: "r1", studentId: "g1", name: "Ada", question: "7 × 8?", mark: 9, max: 5 }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: "s1", round_id: "r1", student_id: "g1", mark: 5, max_mark: 5, name: "Ada" }),
      { onConflict: "session_id,round_id,student_id" },
    );
  });
  it("says plainly when the database update hasn't been run", async () => {
    viewer.mockResolvedValue(host);
    mockAdmin._qb._setDirectResolve({ error: { message: 'relation "live_class_marks" does not exist' } });
    expect((await POST(post({ id: "s1", action: "mark", roundId: "r1", studentId: "g1", mark: 1, max: 1 }))).status).toBe(501);
  });
  it("shows results and deletes them, for the teacher only", async () => {
    viewer.mockResolvedValue({ id: "g1", host: false });
    expect((await GET(new Request("https://dmaths.test/api/live-sessions/results?id=s1"))).status).toBe(403);
    expect((await DELETE(new Request("https://dmaths.test/api/live-sessions/results?id=s1", { method: "DELETE" }))).status).toBe(403);
    viewer.mockResolvedValue(host);
    const del = await DELETE(new Request("https://dmaths.test/api/live-sessions/results?id=s1", { method: "DELETE" }));
    expect(del.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("live_class_marks");
    expect(mockAdmin.from).toHaveBeenCalledWith("live_quizzes");
    expect(mockAdmin._qb.delete).toHaveBeenCalledTimes(2);
  });
});
