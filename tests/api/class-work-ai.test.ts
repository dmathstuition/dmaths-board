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

describe("POST /api/quiz-sets ai-spot and ai-tiers", () => {
  it("writes a spot-the-mistake task with its key, and checks it", async () => {
    aiChat.mockResolvedValue('{"title":"T","question":"Expand 3(x+4)","lines":["3(x+4)","3x + 4","Answer 3x + 4"],"wrong":1,"why":"3 × 4 too","fix":"3x + 12"}');
    const res = await post({ action: "ai-spot", topic: "Expanding brackets", level: "JSS 1–3", kind: "arithmetic slip" });
    expect(res.status).toBe(200);
    expect((await res.json()).spot).toMatchObject({ wrong: 1, fix: "3x + 12" });
    expect(aiChat.mock.calls[0][0].user).toContain("Kind of mistake: arithmetic slip");
    aiChat.mockResolvedValue('{"lines":["a","b","c"],"wrong":7}'); // the wrong line isn't one of the lines
    expect((await post({ action: "ai-spot", topic: "Ratio" })).status).toBe(502);
    expect((await post({ action: "ai-spot", topic: " " })).status).toBe(400);
  });
  it("writes the same question at three levels", async () => {
    aiChat.mockResolvedValue(JSON.stringify({ easier: { q: "Solve x + 2 = 5", a: "3" }, same: { q: "Solve x + 4 = 9", a: "5" }, harder: { q: "Solve 3x + 4 = 19", a: "5" } }));
    const res = await post({ action: "ai-tiers", question: "Solve x + 3 = 7", level: "JSS 1–3" });
    expect((await res.json()).tiers.harder.q).toBe("Solve 3x + 4 = 19");
    expect(aiChat.mock.calls.at(-1)![0].user).toContain("Solve x + 3 = 7");
    expect((await post({ action: "ai-tiers", question: "" })).status).toBe(400);
  });
});
