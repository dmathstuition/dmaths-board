import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for the database and storage: which tables still show which pictures.
let used: Record<string, string[]> = {};
let failing: Record<string, string> = {};
const removed: string[][] = [];
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      let url = "";
      const q: any = {
        select: () => q, limit: () => q, neq: () => q,
        contains: (_col: string, v: any) => { url = Array.isArray(v) ? v[0].img : v.bg[0]; return q; },
        then: (ok: (r: unknown) => void) => ok(failing[table] ? { data: null, error: { message: failing[table] } } : { data: (used[table] ?? []).includes(url) ? [{ id: "x" }] : [], error: null }),
      };
      return q;
    },
    storage: { from: () => ({ remove: async (paths: string[]) => { removed.push(paths); return { error: null }; } }) },
  }),
}));
import { removeSlidePictures } from "@/lib/slideStore";

const url = (folder: string, name: string) => `https://x.supabase.co/storage/v1/object/public/materials/slides/${folder}/${name}.jpg`;

describe("deleting uploaded pages from storage", () => {
  beforeEach(() => { used = {}; failing = {}; removed.length = 0; });

  it("deletes this class's pages", async () => {
    const out = await removeSlidePictures([url("class1", "p1"), url("class1", "p2"), url("class1", "p1")], "class1", { examId: "e1" });
    expect(out).toEqual({ removed: 2, kept: 0 });
    expect(removed[0]).toEqual(["slides/class1/p1.jpg", "slides/class1/p2.jpg"]);
  });

  it("never touches another class's pictures, or anything that isn't an uploaded page", async () => {
    const out = await removeSlidePictures([url("class2", "p1"), "https://evil.example/x.jpg", 42], "class1");
    expect(out).toEqual({ removed: 0, kept: 0 });
    expect(removed).toHaveLength(0);
  });

  it("keeps a page another exam, a saved lesson or a board still shows", async () => {
    used = { board_exams: [url("class1", "p1")], board_lessons: [url("class1", "p2")] };
    const out = await removeSlidePictures([url("class1", "p1"), url("class1", "p2"), url("class1", "p3")], "class1", { examId: "e1" });
    expect(out).toEqual({ removed: 1, kept: 2 });
    expect(removed[0]).toEqual(["slides/class1/p3.jpg"]);
  });

  it("keeps everything when it can't tell — but a class with no exams table still deletes", async () => {
    failing = { board_lessons: "timeout" };
    expect(await removeSlidePictures([url("class1", "p1")], "class1")).toEqual({ removed: 0, kept: 1 });
    failing = { board_exams: 'relation "public.board_exams" does not exist' };
    expect(await removeSlidePictures([url("class1", "p1")], "class1")).toEqual({ removed: 1, kept: 0 });
  });
});
