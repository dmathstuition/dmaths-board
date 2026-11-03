import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// A class of 100: every live message reaches every screen and the live
// service caps messages per second, so the board's background repeats slow
// down as the class grows (lib/classScale). The class still works.
async function openClass(browser: Browser, crowd: number) {
  const hub = realtimeHub(), server = classServer(crowd);
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(2500);
  return { teacher, learner, hub };
}
async function quietCount(hub: ReturnType<typeof realtimeHub>, page: import("@playwright/test").Page, ms: number) {
  const before = new Map(hub.stats.events), total = hub.stats.relayed;
  await page.waitForTimeout(ms);
  const diff = (ev: string) => (hub.stats.events.get(ev) ?? 0) - (before.get(ev) ?? 0);
  return { total: hub.stats.relayed - total, digest: diff("board-digest"), round: diff("ab-round"), pulse: diff("pulse") };
}
test("a class of 100 sends far fewer background messages, and still works", async ({ browser }) => {
  test.setTimeout(240_000);
  const small = await openClass(browser, 0);
  const s = await quietCount(small.hub, small.teacher, 24_000);
  const big = await openClass(browser, 99);
  await expect(big.teacher.getByText(/100 learners here/)).toBeVisible({ timeout: 15_000 });
  await big.teacher.waitForTimeout(6000); // the class size reaches the learner's screen too
  const b = await quietCount(big.hub, big.teacher, 24_000);
  console.log("small class", s, "big class", b);
  expect(s.digest).toBeGreaterThanOrEqual(10);
  expect(b.digest).toBeLessThanOrEqual(Math.ceil(s.digest / 4));

  // The big class still works: the teacher's writing reaches the learner.
  const c = big.teacher.locator("canvas").first(), box = (await c.boundingBox())!;
  await big.teacher.mouse.move(box.x + 100, box.y + 100); await big.teacher.mouse.down();
  for (let i = 1; i < 10; i++) await big.teacher.mouse.move(box.x + 100 + i * 20, box.y + 100 + i * 8);
  await big.teacher.mouse.up();
  await expect.poll(async () => big.learner.evaluate(() => {
    const cv = document.querySelector("canvas") as HTMLCanvasElement; const g = cv.getContext("2d")!;
    const d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n;
  }), { timeout: 15_000 }).toBeGreaterThan(50);
});
