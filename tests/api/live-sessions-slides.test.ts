import { describe, it, expect, vi, beforeEach } from "vitest";

const createSignedUploadUrl = vi.fn(async (path: string) => ({ data: { token: `tok-${path}`, signedUrl: "x", path }, error: null as null | { message: string } }));
const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://abc.supabase.co/storage/v1/object/public/materials/${path}` } }));
const lessonOwner = vi.fn(async () => ({ data: { owner_id: "t1" } as any }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({
  storage: { from: () => ({ createSignedUploadUrl, getPublicUrl }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: lessonOwner }) }) }),
}) }));
const staff = vi.fn();
vi.mock("@/lib/boardAccess", async (orig) => ({ ...(await orig<any>()), requireBoardOrStaff: () => staff(), boardTeacherCanUse: async () => true }));
const viewer = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: any[]) => viewer(...a) }));

import { POST } from "@/app/api/live-sessions/slides/route";
import { cleanBoard, isSlideUrl } from "@/lib/whiteboard";

const req = (body: object) => new Request("https://dmaths.test/api/live-sessions/slides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const host = (id = "t1") => ({ id, role: "tutor", host: true, session: { id: "s1" }, seat: null });

beforeEach(() => { viewer.mockReset(); createSignedUploadUrl.mockClear(); });

describe("preparing class slide uploads", () => {
  it("hands out one upload permission per slide, with links the board accepts", async () => {
    viewer.mockResolvedValue(host());
    const res = await POST(req({ sessionId: "s1", count: 3, type: "image/jpeg" }));
    expect(res.status).toBe(200);
    const { uploads } = await res.json();
    expect(uploads).toHaveLength(3);
    expect(uploads.every((u: any) => isSlideUrl(u.url) && u.token.startsWith("tok-slides/s1/"))).toBe(true);
    expect(uploads[2].path).toMatch(/^slides\/s1\/.+-03\.jpg$/);
  });
  it("only the host can add slides", async () => {
    viewer.mockResolvedValue({ ...host("l1"), role: "student", host: false });
    expect((await POST(req({ sessionId: "s1", count: 1 }))).status).toBe(403);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("takes up to 50 slides at a time", async () => {
    viewer.mockResolvedValue(host("t3"));
    const res = await POST(req({ sessionId: "s1", count: 50, type: "image/jpeg" }));
    expect(res.status).toBe(200);
    expect((await res.json()).uploads).toHaveLength(50);
  });
  it("refuses other file types and too many slides", async () => {
    viewer.mockResolvedValue(host("t2"));
    expect((await POST(req({ sessionId: "s1", count: 1, type: "application/vnd.ms-powerpoint" }))).status).toBe(415);
    expect((await POST(req({ sessionId: "s1", count: 51 }))).status).toBe(400);
    expect((await POST(req({ sessionId: "s1", count: 0 }))).status).toBe(400);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
  it("reports a storage problem clearly", async () => {
    viewer.mockResolvedValue(host("t3"));
    createSignedUploadUrl.mockResolvedValueOnce({ data: null as any, error: { message: "Bucket not found" } });
    const res = await POST(req({ sessionId: "s1", count: 2 }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Bucket not found/);
  });
});

describe("slides for a library lesson", () => {
  it("lets the lesson's owner upload, into the lesson's own folder", async () => {
    staff.mockResolvedValue({ id: "t1", role: "tutor" });
    const res = await POST(req({ lessonId: "abc-123", count: 2 }));
    expect(res.status).toBe(200);
    const { uploads } = await res.json();
    expect(uploads[0].path).toMatch(/^slides\/lesson-abc-123\/.+-01\.jpg$/);
    expect(uploads.every((u: any) => isSlideUrl(u.url))).toBe(true);
  });
  it("refuses another tutor", async () => {
    staff.mockResolvedValue({ id: "t9", role: "tutor" });
    expect((await POST(req({ lessonId: "abc-123", count: 1 }))).status).toBe(403);
  });
});

describe("slide pictures on the board", () => {
  it("keeps only slide links from our storage", () => {
    const ok = "https://abc.supabase.co/storage/v1/object/public/materials/slides/s1/1-01.jpg";
    expect(isSlideUrl(ok)).toBe(true);
    expect(isSlideUrl("https://evil.example/x.jpg")).toBe(false);
    expect(isSlideUrl("javascript:alert(1)")).toBe(false);
    expect(isSlideUrl("https://abc.supabase.co/storage/v1/object/public/materials/notes/x.jpg")).toBe(false);
    const b = cleanBoard({ pages: [[], []], paper: ["plain", "grid"], bg: [ok, "https://evil.example/x.jpg"] });
    expect(b.bg).toEqual([ok, null]);
    expect(cleanBoard([]).bg).toEqual([null]);
  });
});
