import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => jar.set(k, v) })) }));
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
let signedIn: string | null = null;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => ({ auth: { getUser: async () => ({ data: { user: signedIn ? { id: signedIn, email: "t@school.ng" } : null } }) } }) }));
const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }));
const verifyTransaction = vi.fn();
vi.mock("@/lib/paystack", async (orig) => ({ ...(await orig<any>()), verifyTransaction: (...a: any[]) => verifyTransaction(...a) }));

import { POST as signup } from "@/app/api/board/signup/route";
import { POST as verify } from "@/app/api/board/verify/route";
import { POST as payVerify } from "@/app/api/board/pay/verify/route";
import { POST as join } from "@/app/api/board/join/route";
import { hashSecret } from "@/lib/boardAccess";

const req = (path: string, body: object, ip = "1.2.3.4") => new Request(`https://dmaths.test${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });
let ip = 0;
const fresh = () => `10.0.0.${++ip}`;
const good = { firstName: "Ada", lastName: "Obi", email: "Ada@School.ng", password: "Mangoes-at-7pm-2026", school: "Grace High", agree: true };

beforeEach(() => { mockAdmin = makeMockSupabaseClient(); jar.clear(); signedIn = null; sendEmail.mockClear(); verifyTransaction.mockReset(); });

describe("D-Maths Board sign-up", () => {
  it("creates a board teacher (not an academy role) and emails a code", async () => {
    const res = await signup(req("/api/board/signup", good, fresh()));
    expect(res.status).toBe(200);
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "ada@school.ng" }));
    expect(mockAdmin._qb.insert.mock.calls[0][0]).toMatchObject({ role: "board_teacher", first_name: "Ada", email: "ada@school.ng" });
    const acc = mockAdmin._qb.insert.mock.calls[1][0];
    expect(acc.verify_code_hash).toMatch(/^[0-9a-f]{64}$/); // only a hash of the code is stored
    expect(sendEmail).toHaveBeenCalledWith("notice", "ada@school.ng", expect.objectContaining({ title: expect.stringMatching(/code: \d{6}/) }));
  });
  it("refuses weak passwords, bad emails and missing consent", async () => {
    expect((await signup(req("/api/board/signup", { ...good, password: "password123" }, fresh()))).status).toBe(400);
    expect((await signup(req("/api/board/signup", { ...good, email: "nope" }, fresh()))).status).toBe(400);
    expect((await signup(req("/api/board/signup", { ...good, agree: false }, fresh()))).status).toBe(400);
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("quietly ignores bots and slows down repeated sign-ups", async () => {
    expect((await signup(req("/api/board/signup", { ...good, website: "spam" }, fresh()))).status).toBe(200);
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    const same = fresh();
    for (let i = 0; i < 5; i++) await signup(req("/api/board/signup", { ...good, password: "x" }, same));
    expect((await signup(req("/api/board/signup", good, same))).status).toBe(429);
  });
  it("removes the half-made login if the profile can't be saved", async () => {
    mockAdmin._qb._setDirectResolve({ error: { message: 'invalid input value for enum user_role: "board_teacher"' } });
    const res = await signup(req("/api/board/signup", good, fresh()));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/migration-dmaths-board\.sql/);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalled();
  });
});

describe("email code", () => {
  const account = (over: object = {}) => ({ email_verified_at: null, trial_ends_at: null, paid_until: null, verify_attempts: 0,
    verify_expires_at: new Date(Date.now() + 600_000).toISOString(), verify_code_hash: hashSecret("u1:123456"), ...over });
  const teacher = (acc: object) => {
    signedIn = "u1";
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: { role: "board_teacher", first_name: "Ada", last_name: "Obi", email: "t@school.ng", is_active: true }, error: null })
      .mockResolvedValueOnce({ data: acc, error: null });
  };
  it("starts the 7-day trial with the right code", async () => {
    teacher(account());
    const res = await verify(req("/api/board/verify", { code: "123456" }));
    expect(res.status).toBe(200);
    const patch = mockAdmin._qb.update.mock.calls[0][0];
    expect(patch.email_verified_at).toBeTruthy();
    expect(Date.parse(patch.trial_ends_at) - Date.now()).toBeGreaterThan(6.9 * 86_400_000);
  });
  it("sends the welcome email with the WhatsApp group once sign-up is complete", async () => {
    teacher(account());
    const res = await verify(req("/api/board/verify", { code: "123456" }));
    expect((await res.json()).whatsapp).toMatch(/^https:\/\/chat\.whatsapp\.com\//);
    expect(sendEmail).toHaveBeenCalledWith("notice", "t@school.ng", expect.objectContaining({
      title: "Welcome to D-Maths Board", body: expect.stringContaining("https://chat.whatsapp.com/"), linkUrl: expect.stringContaining("chat.whatsapp.com"),
    }));
  });
  it("a wrong code sends no welcome email", async () => {
    teacher(account());
    await verify(req("/api/board/verify", { code: "000000" }));
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("counts wrong codes and refuses expired ones", async () => {
    teacher(account());
    expect((await verify(req("/api/board/verify", { code: "000000" }))).status).toBe(400);
    expect(mockAdmin._qb.update.mock.calls[0][0]).toEqual({ verify_attempts: 1 });
    teacher(account({ verify_attempts: 5 }));
    expect((await verify(req("/api/board/verify", { code: "123456" }))).status).toBe(429);
    teacher(account({ verify_expires_at: new Date(Date.now() - 1000).toISOString() }));
    expect((await verify(req("/api/board/verify", { code: "123456" }))).status).toBe(410);
  });
  it("is only for signed-in board teachers", async () => {
    expect((await verify(req("/api/board/verify", { code: "123456" }))).status).toBe(401);
  });
});

describe("₦5,000 monthly payments", () => {
  const teacher = () => {
    signedIn = "u1";
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: { role: "board_teacher", first_name: "Ada", last_name: "Obi", email: "t@school.ng", is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { email_verified_at: "2026-10-01T00:00:00Z", trial_ends_at: "2026-10-08T00:00:00Z", paid_until: null }, error: null });
  };
  const ref = "dmb-6f1d5a2e-0b8b-4c56-9d1e-2b7c0c7a9e11";
  const txn = (over: object = {}) => ({ status: "success", reference: ref, amount: 500000, currency: "NGN", metadata: { kind: "dmaths-board", userId: "u1" }, ...over });
  it("adds a month only after Paystack confirms the payment", async () => {
    teacher();
    verifyTransaction.mockResolvedValue({ ok: true, data: txn() });
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })                       // not applied before
      .mockResolvedValueOnce({ data: { role: "board_teacher" }, error: null })  // payer is a board teacher
      .mockResolvedValueOnce({ data: { paid_until: null, trial_ends_at: null }, error: null });
    const res = await payVerify(req("/api/board/pay/verify", { reference: ref }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert.mock.calls[0][0]).toMatchObject({ reference: ref, user_id: "u1", amount_ngn: 5000 });
  });
  it("refuses someone else's payment, a short payment, or a made-up reference", async () => {
    teacher();
    verifyTransaction.mockResolvedValue({ ok: true, data: txn({ metadata: { kind: "dmaths-board", userId: "someone-else" } }) });
    expect((await payVerify(req("/api/board/pay/verify", { reference: ref }))).status).toBe(403);
    teacher();
    verifyTransaction.mockResolvedValue({ ok: true, data: txn({ amount: 100000 }) });
    expect((await payVerify(req("/api/board/pay/verify", { reference: ref }))).status).toBe(400);
    teacher();
    expect((await payVerify(req("/api/board/pay/verify", { reference: "anything" }))).status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });
  it("never applies the same payment twice", async () => {
    teacher();
    verifyTransaction.mockResolvedValue({ ok: true, data: txn() });
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { paid_until: "2027-10-08T00:00:00Z" }, error: null }); // already applied
    const res = await payVerify(req("/api/board/pay/verify", { reference: ref }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });
});

describe("students joining with a PIN", () => {
  const live = { id: "11111111-1111-4111-8111-111111111111", status: "live", created_at: new Date().toISOString(), kind: "board" };
  it("gives a guest pass (only its hash stored) for a live board class", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: live, error: null });
    mockAdmin._qb._setDirectResolve({ data: null, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null });
    const res = await join(req("/api/board/join", { code: "123 456", name: "Ada <b>" }, fresh()));
    expect(res.status).toBe(200);
    const row = mockAdmin._qb.insert.mock.calls[0][0];
    expect(row).toMatchObject({ session_id: live.id, name: "Ada b" });
    const cookie = jar.get("dmb_guest")!;
    const token = cookie.split(".")[2];
    expect(row.token_hash).toBe(hashSecret(token));
    expect(row.token_hash).not.toContain(token);
  });
  it("keeps a parent's contact for class reports, and checks it", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: live, error: null });
    mockAdmin._qb._setDirectResolve({ data: null, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null });
    expect((await join(req("/api/board/join", { code: "123456", name: "Ada", parent: "0803 123 4567" }, fresh()))).status).toBe(200);
    expect(mockAdmin._qb.insert.mock.calls[0][0]).toMatchObject({ parent_contact: "+2348031234567" });
    expect((await join(req("/api/board/join", { code: "123456", name: "Ada", parent: "not a contact" }, fresh()))).status).toBe(400);
  });
  it("still joins before the parent-contact migration has run", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: live, error: null });
    mockAdmin._qb._setDirectResolve({ data: null, error: null });
    mockAdmin._qb.single
      .mockResolvedValueOnce({ data: null, error: { message: 'column "parent_contact" does not exist' } })
      .mockResolvedValueOnce({ data: { id: "22222222-2222-4222-8222-222222222222" }, error: null });
    expect((await join(req("/api/board/join", { code: "123456", name: "Ada", parent: "mum@example.com" }, fresh()))).status).toBe(200);
    expect(mockAdmin._qb.insert.mock.calls[1][0]).not.toHaveProperty("parent_contact");
  });
  it("won't join academy classes, ended classes or nameless students", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { ...live, kind: "academy" }, error: null });
    expect((await join(req("/api/board/join", { code: "123456", name: "Ada" }, fresh()))).status).toBe(404);
    expect((await join(req("/api/board/join", { code: "123456", name: "A" }, fresh()))).status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });
  it("slows down PIN guessing", async () => {
    const same = fresh();
    for (let i = 0; i < 15; i++) await join(req("/api/board/join", { code: "12", name: "Ada" }, same));
    expect((await join(req("/api/board/join", { code: "123456", name: "Ada" }, same))).status).toBe(429);
  });
});
