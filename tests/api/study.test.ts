import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
const detail = {
  learner: "Ada", title: "Bearings", work: [{ question: "Expand 3(x + 4)", mark: 0, max: 2, feedback: "", answer: { text: "3x + 4", imgs: [] } }, { question: "Full marks one", mark: 2, max: 2, feedback: "", answer: null }],
  quizzes: [{ title: "Quiz", items: [
    { q: "Back bearing of 065°?", options: ["245°", "115°", "295°", "065°"], answer: 0, choice: 1, correct: false },
    { q: "Due east?", options: ["090°", "180°"], answer: 0, choice: 0, correct: true },
  ] }],
};
vi.mock("@/lib/learnerResults", () => ({ learnerDetail: async () => detail }));
let aiOn = true;
const aiChat = vi.fn();
vi.mock("@/lib/ai", async (orig) => ({ ...(await orig<any>()), aiConfigured: () => aiOn, aiChat: (...a: any[]) => aiChat(...a) }));

import { practiceFor } from "@/lib/studyServer";
import { GET, POST } from "@/app/api/study/route";
import { signReport } from "@/lib/classReportLink";

const token = (g = "g-1") => signReport({ s: "s-1", g, c: "", h: "" });
beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  mockAdmin._qb._setDirectResolve({ data: [], error: { message: 'relation "board_exams" does not exist' } }); // no exams, no cache table
  aiOn = true; aiChat.mockReset();
});

describe("fix my mistakes (server)", () => {
  it("finds the learner's wrong quiz answers and marked-down class work, and asks the A.I once", async () => {
    aiChat.mockResolvedValue(JSON.stringify({ fixes: [
      { n: 1, explain: ["065° + 180° = 245°"], similar: [{ q: "Back bearing of 120°?", options: ["300°", "060°", "240°", "120°"], answer: 0, working: ["120° + 180° = 300°"] }] },
      { n: 2, similar: [{ q: "Expand 5(x + 2)", options: ["5x + 10", "5x + 2", "x + 10", "5x + 7"], answer: 0, working: ["5x + 10"] }] },
    ] }));
    const r = (await practiceFor("s-1", "g-1"))!;
    expect(r.missed).toBe(2);
    expect(r.ai).toBe(true);
    expect(r.items.map((x) => x.from)).toEqual(["Quiz Q1", "Like Quiz Q1", "Like Class work"]);
    expect(aiChat.mock.calls[0][0].user).toContain("Expand 3(x + 4)");
    await practiceFor("s-1", "g-1");
    expect(aiChat).toHaveBeenCalledTimes(1); // kept, not asked again
  });

  it("still gives a practice set when the A.I is off or fails", async () => {
    aiOn = false;
    const off = (await practiceFor("s-2", "g-2"))!;
    expect(off.ai).toBe(false);
    expect(off.items.map((x) => x.kind)).toEqual(["retry"]);
    aiOn = true; aiChat.mockRejectedValue(new Error("busy"));
    expect((await practiceFor("s-3", "g-3"))!.items.length).toBe(1);
  });

  it("only opens with a valid results link", async () => {
    expect((await GET(new Request("https://x.test/api/study?what=practice&t=nope"))).status).toBe(403);
    expect((await GET(new Request(`https://x.test/api/study?what=practice&t=${encodeURIComponent(token(""))}`))).status).toBe(403);
  });

  it("gives stars for a finished round, up to 3 rounds a class", async () => {
    const post = (right: number, total: number) => POST(new Request("https://x.test/api/study", { method: "POST", body: JSON.stringify({ t: token(), right, total }) }));
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { name: "Ada" }, error: null });
    mockAdmin._qb._setDirectResolve({ data: null, error: null, count: 0 } as any);
    (mockAdmin._qb as any).then = (res: any) => Promise.resolve({ data: null, error: null, count: 0 }).then(res);
    const ok = await post(7, 9);
    expect(await ok.json()).toEqual({ ok: true, stars: 7 });
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(expect.objectContaining({ game_id: "practice", correct: 7, attempts: 9, student_id: "g-1", session_id: "s-1" }));
    (mockAdmin._qb as any).then = (res: any) => Promise.resolve({ data: null, error: null, count: 3 }).then(res);
    expect(await (await post(5, 5)).json()).toMatchObject({ ok: true, stars: 0 });
  });
});
