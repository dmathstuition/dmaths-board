import { test, expect } from "@playwright/test";
import { SID, GID, agree, classServer, realtimeHub } from "./helpers";

// Reopening a class that was ended: the saved board — slides and all — must
// come back, even when learners' writing from before reaches the teacher's
// screen first (the backup route hands it all over at once on opening).
test("a reopened class keeps its slides when learners' writing arrives first", async ({ browser }) => {
  test.setTimeout(90_000);
  const ctx = await browser.newContext();
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const slide = `${base}/storage/v1/object/public/materials/slides/${SID}/lesson-01.jpg`;
  const mine = { id: "t-1", by: "h", kind: "pen", color: "#111111", w: 4, pts: [0.1, 0.1, 0.3, 0.3], t: 1 };
  const theirs = { id: "l-1", by: GID, kind: "pen", color: "#DC2626", w: 4, pts: [0.5, 0.5, 0.7, 0.6], t: 2 };
  const saved = { v: 2, pages: [[mine], []], paper: ["plain", "plain"], bg: [slide, `${base}/storage/v1/object/public/materials/slides/${SID}/lesson-02.jpg`] };
  let lastSave: any = null, loads = 0;
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: { "access-control-allow-origin": "*" },
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#FEF3C7"/></svg>' }));
  // The saved board is slow to arrive (and fails once); the learners' writing is quick.
  await ctx.route("**/api/live-sessions?**", async (r) => {
    if (!r.request().url().includes("board=1")) return r.fallback();
    if (++loads === 1) return r.fulfill({ status: 503, json: { error: "busy" } });
    await new Promise((ok) => setTimeout(ok, 2500));
    const res = await r.fetch().catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    return r.fulfill({ json: { ...j, board: saved } });
  });
  await ctx.route("**/api/live-sessions/inbox**", (r) => r.fulfill({ json: r.request().method() === "POST" ? { ok: true }
    : { items: [{ item_id: theirs.id, kind: "add", sender: GID, page: 0, item: theirs, at: new Date().toISOString() }] } }));
  await ctx.route("**/api/live-sessions", (r) => {
    if (r.request().method() === "PUT") lastSave = JSON.parse(r.request().postData() ?? "{}").board;
    return r.fulfill({ json: { ok: true } });
  });

  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "domcontentloaded" });
  await agree(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  // The slide is behind page 1, and the board says 2 pages.
  await expect(page.getByRole("img", { name: "Slide 1" })).toBeAttached({ timeout: 20_000 });
  await expect(page.getByText("Page 1/2")).toBeVisible();
  // What gets saved keeps both slides, the teacher's writing, and the learner's.
  await expect.poll(() => lastSave, { timeout: 20_000 }).not.toBeNull();
  expect(lastSave.bg).toEqual(saved.bg);
  expect(lastSave.pages[0].map((s: { id: string }) => s.id).sort()).toEqual(["l-1", "t-1"]);
  expect(loads).toBeGreaterThanOrEqual(2);
});
