import { describe, it, expect, vi, beforeEach } from "vitest";

// "Remove slides" clears the pictures from storage — only this class's own,
// and never one a saved lesson or another class's board still shows.
const remove = vi.fn(async () => ({ data: [], error: null as null | { message: string } }));
let usedElsewhere = new Set<string>();
const query = (table: string) => {
  let url = "";
  const q: any = {
    select: () => q, limit: () => q, neq: () => q,
    contains: (_c: string, v: { bg: string[] }) => { url = v.bg[0]; return q; },
    then: (ok: any) => ok({ data: usedElsewhere.has(`${table}:${url}`) ? [{ id: "x" }] : [], error: null }),
  };
  return q;
};
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => ({ from: (t: string) => query(t), storage: { from: () => ({ remove }) } }) }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true, limit: async () => true, clientKey: (_r: unknown, s: string) => s }));
const viewer = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: any[]) => viewer(...a) }));
vi.mock("@/lib/boardAccess", async (orig) => ({ ...(await orig<any>()), requireBoardOrStaff: async () => null, boardTeacherCanUse: async () => true }));
import { DELETE } from "@/app/api/live-sessions/slides/route";

const SID = "11111111-1111-1111-1111-111111111111";
const url = (folder: string, f: string) => `https://abc.supabase.co/storage/v1/object/public/materials/slides/${folder}/${f}.jpg`;
const del = (body: object) => DELETE(new Request("https://dmaths.test/api/live-sessions/slides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => { remove.mockClear(); usedElsewhere = new Set(); viewer.mockReset(); });

describe("removing slides from storage", () => {
  it("deletes this class's slide pictures", async () => {
    viewer.mockResolvedValue({ id: "t1", host: true });
    const res = await del({ sessionId: SID, urls: [url(SID, "a-01"), url(SID, "a-02")] });
    expect(await res.json()).toEqual({ removed: 2, kept: 0 });
    expect(remove).toHaveBeenCalledWith([`slides/${SID}/a-01.jpg`, `slides/${SID}/a-02.jpg`]);
  });
  it("never touches another class's or a lesson's pictures", async () => {
    viewer.mockResolvedValue({ id: "t1", host: true });
    const res = await del({ sessionId: SID, urls: [url("lesson-abc", "x-01"), url("22222222-2222-2222-2222-222222222222", "y-01"), "https://evil.example/x.jpg"] });
    expect(await res.json()).toEqual({ removed: 0, kept: 0 });
    expect(remove).not.toHaveBeenCalled();
  });
  it("keeps a picture a saved lesson still uses", async () => {
    viewer.mockResolvedValue({ id: "t1", host: true });
    usedElsewhere.add(`board_lessons:${url(SID, "a-01")}`);
    const res = await del({ sessionId: SID, urls: [url(SID, "a-01"), url(SID, "a-02")] });
    expect(await res.json()).toEqual({ removed: 1, kept: 1 });
    expect(remove).toHaveBeenCalledWith([`slides/${SID}/a-02.jpg`]);
  });
  it("only the class's teacher can remove them", async () => {
    viewer.mockResolvedValue({ id: "g1", host: false });
    expect((await del({ sessionId: SID, urls: [url(SID, "a-01")] })).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });
});
