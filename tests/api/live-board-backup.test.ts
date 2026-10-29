import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

// The backup route for live-class writing, the class problem log, and the
// "Check my class" endpoint.
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true, limit: async () => true, clientKey: (_r: unknown, s: string) => s }));
const viewer = vi.fn();
const me = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: any[]) => viewer(...a), currentUser: () => me() }));

import * as inbox from "@/app/api/live-sessions/inbox/route";
import * as diag from "@/app/api/live-sessions/diag/route";
import * as check from "@/app/api/live-sessions/check/route";

const post = (url: string, body: object) => new Request(`https://dmaths.test${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const live = { id: "s1", status: "live", all_can_write: true, created_at: new Date().toISOString() };
const learner = (id = "g1") => ({ id, host: false, session: live, seat: { can_write: true, removed: false } });
const stroke = (by = "g1") => ({ id: "st1", by, color: "#1657c9", w: 4, pts: [0.1, 0.1, 0.2, 0.2] });

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  viewer.mockReset(); me.mockReset();
});

describe("backup route for writing", () => {
  it("stores a learner's own writing for the teacher to collect", async () => {
    viewer.mockResolvedValue(learner());
    const res = await inbox.POST(post("/api/live-sessions/inbox", { id: "s1", page: 2, kind: "add", item: stroke() }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("live_board_inbox");
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: "s1", item_id: "st1", kind: "add", sender: "g1", page: 2 }),
      { onConflict: "session_id,item_id,kind" },
    );
  });

  it("won't take writing signed as someone else", async () => {
    viewer.mockResolvedValue(learner("g1"));
    const res = await inbox.POST(post("/api/live-sessions/inbox", { id: "s1", item: stroke("g2") }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.upsert).not.toHaveBeenCalled();
  });

  it("won't take writing from a learner who may not write", async () => {
    viewer.mockResolvedValue({ ...learner(), session: { ...live, all_can_write: false }, seat: { can_write: false, removed: false } });
    expect((await inbox.POST(post("/api/live-sessions/inbox", { id: "s1", item: stroke() }))).status).toBe(403);
  });

  it("says plainly when the database update hasn't been run", async () => {
    viewer.mockResolvedValue(learner());
    mockAdmin._qb._setDirectResolve({ error: { message: 'relation "live_board_inbox" does not exist' } });
    const res = await inbox.POST(post("/api/live-sessions/inbox", { id: "s1", item: stroke() }));
    expect(res.status).toBe(501);
  });

  it("only the teacher collects, and only what's new", async () => {
    viewer.mockResolvedValue(learner());
    expect((await inbox.GET(new Request("https://dmaths.test/api/live-sessions/inbox?id=s1"))).status).toBe(403);
    viewer.mockResolvedValue({ id: "t1", host: true, session: live });
    mockAdmin._qb._setDirectResolve({ data: [{ item_id: "st1" }] });
    const since = "2026-10-16T10:00:00.000Z";
    const res = await inbox.GET(new Request(`https://dmaths.test/api/live-sessions/inbox?id=s1&since=${since}`));
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(1);
    expect(mockAdmin._qb.gt).toHaveBeenCalledWith("at", since);
  });
});

describe("class problem log", () => {
  it("records a known problem with clipped details", async () => {
    me.mockResolvedValue({ id: "t1", role: "tutor" });
    const res = await diag.POST(post("/api/live-sessions/diag", { event: "upload-failed", sessionId: "s1", message: "x".repeat(1000), extra: { files: 2, nested: { no: 1 } } }));
    expect(res.status).toBe(200);
    const row = mockAdmin._qb.insert.mock.calls[0][0];
    expect(row).toMatchObject({ actor_id: "t1", action: "live_problem" });
    expect(row.detail.message).toHaveLength(300);
    expect(row.detail.extra).toEqual({ files: 2 });
  });

  it("ignores events it doesn't know", async () => {
    const res = await diag.POST(post("/api/live-sessions/diag", { event: "anything-goes" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });
});

describe("Check my class", () => {
  it("names each database update that hasn't been run", async () => {
    mockAdmin.from.mockImplementation((table: string) => ({
      select: () => ({ limit: async () => ({ error: table === "live_board_inbox" ? { message: "missing" } : null }) }),
    }));
    const res = await check.GET(new Request("https://dmaths.test/api/live-sessions/check"));
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.database.filter((d: any) => !d.ready).map((d: any) => d.file)).toEqual(["migration-board-inbox.sql"]);
  });

  it("gives only teachers a test upload", async () => {
    me.mockResolvedValue({ id: "g1", role: "student" });
    expect((await check.POST(post("/api/live-sessions/check", { action: "upload" }))).status).toBe(403);
    me.mockResolvedValue({ id: "t1", role: "board_teacher" });
    const store = { list: vi.fn(async () => ({ data: [{ name: "old.jpg" }] })), remove: vi.fn(async () => ({})), createSignedUploadUrl: vi.fn(async (p: string) => ({ data: { token: "tok", path: p }, error: null })), getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x/${p}` } }) };
    mockAdmin.storage.from.mockReturnValue(store);
    const res = await check.POST(post("/api/live-sessions/check", { action: "upload" }));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.path).toMatch(/^slides\/_check\/.+\.jpg$/);
    expect(store.remove).toHaveBeenCalledWith(["slides/_check/old.jpg"]);
  });
});

describe("uploading a slide through the server", () => {
  const form = (fields: Record<string, string | Blob>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.append(k, v);
    return new Request("https://dmaths.test/api/live-sessions/slides/upload", { method: "POST", body: f });
  };
  const jpg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], { type: "image/jpeg" });

  it("stores the picture with its upload ticket", async () => {
    const { POST } = await import("@/app/api/live-sessions/slides/upload/route");
    const uploadToSignedUrl = vi.fn(async () => ({ data: {}, error: null }));
    mockAdmin.storage.from.mockReturnValue({ uploadToSignedUrl });
    const res = await POST(form({ path: "slides/abc-123/1700-x-01.jpg", token: "tok", file: jpg() }));
    expect(res.status).toBe(200);
    expect(uploadToSignedUrl).toHaveBeenCalledWith("slides/abc-123/1700-x-01.jpg", "tok", expect.any(Blob), expect.objectContaining({ contentType: "image/jpeg" }));
  });

  it("refuses paths outside the slides folder and non-pictures", async () => {
    const { POST } = await import("@/app/api/live-sessions/slides/upload/route");
    const uploadToSignedUrl = vi.fn();
    mockAdmin.storage.from.mockReturnValue({ uploadToSignedUrl });
    expect((await POST(form({ path: "uploads/../secret.jpg", token: "t", file: jpg() }))).status).toBe(400);
    expect((await POST(form({ path: "slides/a/b.jpg", token: "t", file: new Blob(["x"], { type: "text/html" }) }))).status).toBe(415);
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });
});
