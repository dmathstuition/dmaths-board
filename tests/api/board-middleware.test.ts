import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// /app needs a board teacher or admin; /admin needs an admin.
let user: { id: string; app_metadata: Record<string, unknown> } | null = null;
let role = "board_teacher";
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user } }),
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: "aal1", nextLevel: "aal1" } }) },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }),
  }),
}));
import { middleware } from "@/middleware";

const board = () => ({ id: "u1", app_metadata: { product: "dmaths-board" } });
const go = (path: string) => middleware(new NextRequest(`https://dmaths.test${path}`));

beforeEach(() => { user = null; role = "board_teacher"; });

describe("D-Maths Board middleware", () => {
  it("lets signed-in board accounts use the APIs", async () => {
    user = board();
    for (const p of ["/api/board/account", "/api/live-sessions", "/api/live-quiz", "/api/quiz-sets", "/api/board-lessons", "/api/live-sessions/slides", "/api/auth/touch"]) expect((await go(p)).status, p).not.toBe(403);
  });
  it("needs a sign-in and the board role for /app", async () => {
    expect((await go("/app")).headers.get("location")).toMatch(/\/login$/);
    user = { id: "t1", app_metadata: {} }; role = "tutor";
    expect((await go("/app/live")).headers.get("location")).toMatch(/\/login$/);
    role = "admin";
    expect((await go("/app")).headers.get("location")).toBeNull(); // admins may use the board app
    user = board(); role = "board_teacher";
    expect((await go("/app")).headers.get("location")).toBeNull();
  });
  it("keeps the subscribers page for admins", async () => {
    user = board(); role = "board_teacher";
    expect((await go("/admin/board")).headers.get("location")).toMatch(/\/app$/);
    role = "admin";
    expect((await go("/admin/board")).headers.get("location")).toBeNull();
  });
});
