import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/boardAccess", () => ({ requireBoardOrStaff: async () => staff }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
vi.mock("@/lib/ratelimit", () => ({ limit: async () => true }));
const aiChat = vi.fn();
vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
  return { ...actual, aiChat: (...a: unknown[]) => aiChat(...a) };
});
let staff: { id: string; role: string } | null = { id: "t1", role: "board_teacher" };
import { POST } from "@/app/api/quiz-sets/route";
const post = (body: unknown) => POST(new Request("https://dmaths.test/api/quiz-sets", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => { aiChat.mockReset(); staff = { id: "t1", role: "board_teacher" }; });

describe("POST /api/quiz-sets ai-work", () => {
  it("writes class work with answers for the teacher", async () => {
    aiChat.mockResolvedValue('```json\n{"items":[{"q":"Solve 3x = 12","a":"x = 4","w":"Divide by 3"}]}\n```');
    const res = await post({ action: "ai-work", topic: "Linear equations", level: "JSS 1–3", count: 5, hard: "easy" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ q: "Solve 3x = 12", a: "x = 4", w: "Divide by 3" }] });
    expect(aiChat.mock.calls[0][0].user).toContain("Write 5 questions, all easy");
  });
  it("needs a topic, a teacher, and a usable reply", async () => {
    expect((await post({ action: "ai-work", topic: " " })).status).toBe(400);
    aiChat.mockResolvedValue("Sorry, I can't.");
    expect((await post({ action: "ai-work", topic: "Ratio" })).status).toBe(502);
    staff = null;
    expect((await post({ action: "ai-work", topic: "Ratio" })).status).toBe(403);
  });
});
