import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// A class of 100: every live message reaches every screen and the live
// service caps messages per second, so the board's background repeats slow
// down as the class grows (lib/classScale). The class still works.
async function openClass(browser: Browser, crowd: number, upBroken = false) {
  const hub = realtimeHub("normal", { upBroken }), server = classServer(crowd);
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

test("in a class of 100, class work answers and signals go to the teacher only", async ({ browser }) => {
  test.setTimeout(240_000);
  const { teacher, learner, hub } = await openClass(browser, 99);
  await expect(teacher.getByText(/100 learners here/)).toBeVisible({ timeout: 15_000 });

  // "Got it" reaches the teacher.
  await learner.getByRole("button", { name: /Got it/ }).click();
  await expect(teacher.getByRole("button", { name: /1 got it, 0 lost/ })).toBeVisible({ timeout: 15_000 });

  // Class work: the big-class warning shows; the learner's typed answer reaches the teacher.
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await expect(panel.getByText(/Big class: each learner/)).toBeVisible();
  await panel.getByPlaceholder(/quarter of a circle/).fill("Expand 3(x + 4)");
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await learner.getByRole("tab", { name: /Type/ }).click({ timeout: 20_000 });
  await learner.getByLabel("Type your answer").fill("3x + 12");
  await learner.getByRole("button", { name: /Hand in my work/ }).click();
  await expect(panel.getByText("Handed in", { exact: true })).toBeVisible({ timeout: 30_000 });


  // They went on the teacher's own channel — not to all 100 screens.
  expect(hub.stats.upEvents.get("ab-answer") ?? 0).toBeGreaterThan(0);
  expect(hub.stats.upEvents.get("pulse") ?? 0).toBeGreaterThan(0);
  expect(hub.stats.events.get("ab-answer") ?? 0).toBe(0);
  expect(hub.stats.events.get("pulse") ?? 0).toBe(0);
});

test("if the teacher-only route doesn't work, the class carries on the old way", async ({ browser }) => {
  test.setTimeout(240_000);
  const { teacher, learner, hub } = await openClass(browser, 99, true);
  await learner.getByRole("button", { name: /Got it/ }).click();
  await expect(teacher.getByRole("button", { name: /1 got it, 0 lost/ })).toBeVisible({ timeout: 20_000 });
  expect(hub.stats.upEvents.get("pulse") ?? 0).toBe(0); // learners were never told to use it
  expect(hub.stats.events.get("pulse") ?? 0).toBeGreaterThan(0);
});
