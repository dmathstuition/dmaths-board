import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let viewer: any = null;
const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: async () => viewer }));
vi.mock("@/lib/ratelimit", () => ({ limit: async () => true, rateLimit: () => true }));
vi.mock("@/lib/email", () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }));
vi.mock("@/lib/classReportData", () => ({
  learnerReport: async (_s: string, g: string) => (g === "g1" ? {
    title: "Fractions", date: "20 Oct 2026", teacher: "Mr Bello", learner: "Ada", board: true,
    row: { id: "g1", name: "Ada", work: 4, workMax: 5, quizCorrect: 3, quizAsked: 4, quizPoints: 900, total: 7, totalMax: 9, percent: 78 },
  } : null),
}));

import { GET, POST } from "@/app/api/live-sessions/report/route";
import { readReport } from "@/lib/classReportLink";

const post = (body: unknown) => POST(new Request("https://x/api", { method: "POST", body: JSON.stringify(body) }));
const host = { id: "t1", role: "board_teacher", host: true, session: { id: "s1", kind: "board", status: "ended", created_at: "" }, seat: null };

beforeEach(() => { mockAdmin = makeMockSupabaseClient(); viewer = host; sendEmail.mockClear(); });

describe("class reports to parents", () => {
  it("only the class's teacher", async () => {
    viewer = { ...host, host: false };
    expect((await post({ id: "s1", action: "links", studentIds: ["g1"] })).status).toBe(403);
    expect((await GET(new Request("https://x/api?id=s1"))).status).toBe(403);
  });
  it("makes a signed report link for each learner, carrying what was covered", async () => {
    const r = await post({ id: "s1", action: "links", studentIds: ["g1", "g2"], covered: "Adding fractions", homework: "Ex 4B" });
    const { links } = await r.json();
    const t = new URL(links.g1).searchParams.get("t");
    expect(new URL(links.g1).pathname).toBe("/report");
    expect(readReport(t)).toEqual({ s: "s1", g: "g1", c: "Adding fractions", h: "Ex 4B" });
  });
  it("emails a parent the learner's report with the link", async () => {
    const r = await post({ id: "s1", action: "email", studentId: "g1", to: "Mum@Example.com", covered: "Adding fractions" });
    expect(r.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith("notice", "mum@example.com", expect.objectContaining({
      title: "Class report: Ada — Fractions",
      body: expect.stringContaining("Total: 7 / 9 (78%)"),
      linkUrl: expect.stringContaining("/report?t="),
    }));
  });
  it("refuses a bad address and an unknown learner", async () => {
    expect((await post({ id: "s1", action: "email", studentId: "g1", to: "0803 123 4567" })).status).toBe(400);
    expect((await post({ id: "s1", action: "email", studentId: "nobody", to: "a@b.co" })).status).toBe(404);
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("keeps a parent's contact, tidied, and refuses rubbish", async () => {
    expect((await post({ id: "s1", action: "contact", studentId: "g1", contact: "0803 123 4567" })).status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith({ parent_contact: "+2348031234567" });
    expect((await post({ id: "s1", action: "contact", studentId: "g1", contact: "hello" })).status).toBe(400);
  });
  it("lists the parents' contacts for the teacher", async () => {
    mockAdmin._qb._setDirectResolve({ data: [{ id: "g1", parent_contact: "mum@example.com" }, { id: "g2", parent_contact: null }] });
    const j = await (await GET(new Request("https://x/api?id=s1"))).json();
    expect(j).toEqual({ ready: true, contacts: { g1: "mum@example.com" } });
  });
});
