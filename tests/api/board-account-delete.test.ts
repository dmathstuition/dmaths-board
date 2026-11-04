import { describe, it, expect, vi, beforeEach } from "vitest";

const teacher = { id: "t-1", email: "ada@school.ng", firstName: "Ada", lastName: "Obi", account: {}, access: {} };
let signedIn: any = teacher;
vi.mock("@/lib/boardAccess", () => ({ currentBoardTeacher: async () => signedIn }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({}) }));
const browserSignOut = vi.fn(async () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => ({ auth: { signOut: browserSignOut } }) }));
const signIn = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: (...a: any[]) => signIn(...a), signOut: async () => ({}) } }) }));
const del = vi.fn();
vi.mock("@/lib/boardDelete", () => ({ deleteBoardTeacher: (...a: any[]) => del(...a) }));
let allowed = true;
vi.mock("@/lib/ratelimit", () => ({ limit: async () => allowed }));

import { DELETE } from "@/app/api/board/account/route";
const req = (body: object) => new Request("https://dmaths.test/api/board/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  signedIn = teacher; allowed = true;
  signIn.mockReset(); del.mockReset(); browserSignOut.mockClear();
  signIn.mockResolvedValue({ data: { user: { id: "t-1" } }, error: null });
  del.mockResolvedValue({ ok: true, classes: 2, lessons: 1, files: 4 });
});

describe("a teacher deleting their own account", () => {
  it("needs them signed in, DELETE typed, and their password", async () => {
    signedIn = null;
    expect((await DELETE(req({ password: "x", confirm: "DELETE" }))).status).toBe(401);
    signedIn = teacher;
    expect((await DELETE(req({ password: "x", confirm: "delete it" }))).status).toBe(400);
    expect((await DELETE(req({ password: "", confirm: "DELETE" }))).status).toBe(400);
    signIn.mockResolvedValueOnce({ data: {}, error: { message: "Invalid login credentials" } });
    const wrong = await DELETE(req({ password: "nope", confirm: "DELETE" }));
    expect(wrong.status).toBe(403);
    expect((await wrong.json()).error).toMatch(/password/);
    expect(del).not.toHaveBeenCalled();
  });

  it("checks the password against their own email, deletes, and signs this browser out", async () => {
    const res = await DELETE(req({ password: "Mangoes-at-7pm", confirm: " delete " }));
    expect(res.status).toBe(200);
    expect(signIn).toHaveBeenCalledWith({ email: "ada@school.ng", password: "Mangoes-at-7pm" });
    expect(del).toHaveBeenCalledWith("t-1", "t-1", { self: true });
    expect(browserSignOut).toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ ok: true, classes: 2 });
  });

  it("slows down repeated tries", async () => {
    allowed = false;
    expect((await DELETE(req({ password: "x", confirm: "DELETE" }))).status).toBe(429);
    expect(signIn).not.toHaveBeenCalled();
  });
});
