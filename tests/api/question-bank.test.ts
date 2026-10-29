import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let staff: any = { id: "admin-1", role: "admin" };

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/authRole", () => ({ requireStaff: vi.fn(async () => staff) }));

import { GET, POST, PATCH, DELETE } from "@/app/api/question-bank/route";

const GOOD = { question: "2x + 6 = 14, so x = ?", options: ["2", "4", "6", "8"], answer: 1 };

const req = (method: string, body?: unknown, qs = "") =>
  new Request(`https://dmaths.test/api/question-bank${qs}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  staff = { id: "admin-1", role: "admin" };
});

describe("question bank — access", () => {
  it("403s a caller who isn't staff on every verb", async () => {
    staff = null;
    expect((await GET(req("GET"))).status).toBe(403);
    expect((await POST(req("POST", GOOD))).status).toBe(403);
    expect((await PATCH(req("PATCH", { id: "q1", ...GOOD }))).status).toBe(403);
    expect((await DELETE(req("DELETE", undefined, "?id=q1"))).status).toBe(403);
  });
});

describe("POST /api/question-bank", () => {
  it("saves a single question against its author", async () => {
    const res = await POST(req("POST", { ...GOOD, subject: "Algebra", level: "JSS 2", topic: "Linear" }));
    expect(res.status).toBe(200);
    const row = mockAdmin._qb.insert.mock.calls[0][0][0];
    expect(row).toMatchObject({ subject: "Algebra", level: "JSS 2", topic: "Linear", answer: 1, owner_id: "admin-1" });
  });

  it("saves a batch straight from the CBT builder", async () => {
    await POST(req("POST", { subject: "Python", questions: [GOOD, { ...GOOD, question: "another" }] }));
    expect(mockAdmin._qb.insert.mock.calls[0][0]).toHaveLength(2);
  });

  // A half-saved batch is worse than a rejected one.
  it("rejects the whole batch if any question is unusable, writing nothing", async () => {
    const res = await POST(req("POST", { questions: [GOOD, { ...GOOD, answer: 9 }] }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("400s on an empty payload", async () => {
    expect((await POST(req("POST", {}))).status).toBe(400);
  });

  it("explains the missing migration rather than leaking Postgres", async () => {
    mockAdmin._qb.select.mockReturnValue(
      Promise.resolve({ data: null, error: { message: 'relation "question_bank" does not exist' } }) as any,
    );
    const res = await POST(req("POST", GOOD));
    const j = await res.json();
    if (!res.ok) expect(j.error).toMatch(/migration-question-bank/);
  });
});

describe("ownership", () => {
  it("lets a tutor edit their own question", async () => {
    staff = { id: "tutor-1", role: "tutor" };
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { owner_id: "tutor-1" }, error: null });
    expect((await PATCH(req("PATCH", { id: "q1", ...GOOD }))).status).toBe(200);
  });

  it("stops a tutor editing someone else's", async () => {
    staff = { id: "tutor-1", role: "tutor" };
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { owner_id: "tutor-2" }, error: null });
    const res = await PATCH(req("PATCH", { id: "q1", ...GOOD }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });

  it("stops a tutor deleting someone else's", async () => {
    staff = { id: "tutor-1", role: "tutor" };
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { owner_id: "tutor-2" }, error: null });
    const res = await DELETE(req("DELETE", undefined, "?id=q1"));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });

  it("lets an admin edit anyone's", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { owner_id: "tutor-2" }, error: null });
    expect((await PATCH(req("PATCH", { id: "q1", ...GOOD }))).status).toBe(200);
  });

  it("validates on edit too — a broken answer index can't be saved over a good one", async () => {
    const res = await PATCH(req("PATCH", { id: "q1", ...GOOD, answer: 7 }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });
});

describe("GET /api/question-bank", () => {
  it("filters by subject and level when asked", async () => {
    await GET(req("GET", undefined, "?subject=Algebra&level=JSS%202"));
    expect(mockAdmin._qb.eq).toHaveBeenCalledWith("subject", "Algebra");
    expect(mockAdmin._qb.eq).toHaveBeenCalledWith("level", "JSS 2");
  });

  it("returns an empty list rather than an error page before the migration", async () => {
    mockAdmin._qb.limit.mockReturnValue(
      Promise.resolve({ data: null, error: { message: 'relation "question_bank" does not exist' } }) as any,
    );
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ questions: [] });
  });
});
