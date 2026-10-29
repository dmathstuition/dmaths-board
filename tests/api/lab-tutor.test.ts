import { describe, it, expect, vi, beforeEach } from "vitest";

let user: any = { id: "s1" };
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }));
const aiChat = vi.fn(async () => "**Timing ten** swings cuts reaction-time error.");
vi.mock("@/lib/ai", () => ({ aiChat: (...a: any[]) => (aiChat as any)(...a), aiErrorResponse: () => new Response("{}", { status: 502 }) }));
import { POST } from "@/app/api/lab-tutor/route";

const req = (body: unknown) => new Request("https://x/api/lab-tutor", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { user = { id: `s-${Math.random()}` }; aiChat.mockClear(); });

describe("/api/lab-tutor", () => {
  it("needs a signed-in user and a real experiment", async () => {
    user = null;
    expect((await POST(req({ slug: "pendulum", question: "why?" }))).status).toBe(401);
    user = { id: "s2" };
    expect((await POST(req({ slug: "nope", question: "why ten swings?" }))).status).toBe(400);
  });
  it("answers in speakable text, grounded in the experiment's guide", async () => {
    const j = await (await POST(req({ slug: "pendulum", question: "Why time ten swings?", step: 3 }))).json();
    expect(j.answer).toBe("Timing ten swings cuts reaction-time error.");
    const { system } = (aiChat.mock.calls[0] as any)[0];
    expect(system).toContain("Simple Pendulum");
    expect(system).toContain("The learner is on step 3.");
    expect(system).toContain("Time 10 swings");
  });
});
