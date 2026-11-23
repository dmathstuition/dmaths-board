import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { TEACHER_TOUR } from "../components/live/TeacherTour";

// A teacher's first time in a class: a short tour that points at the real
// buttons, once; "❓ Tour" runs it again.
const SHOTS = process.env.LAB_SHOTS || "";

async function firstTime(browser: Browser, phone = false) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem("tour-test", "1")); // a teacher who hasn't seen it
  await realtimeHub().attach(ctx, "teacher"); await classServer().attach(ctx, "teacher");
  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  return page;
}

test("the first-time tour walks through the class screen, once, and can be taken again", async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await firstTime(browser);
  const tour = page.getByRole("dialog", { name: "Quick tour" });
  await expect(tour).toBeVisible({ timeout: 15_000 });
  await expect(tour.getByRole("heading")).toHaveText(TEACHER_TOUR[0].title);
  await expect(tour.getByRole("button", { name: "Show me" })).toBeFocused();
  await tour.getByRole("button", { name: "Show me" }).click();
  // Every step after the welcome points at a real button on the screen.
  for (let i = 1; i < TEACHER_TOUR.length; i++) {
    await expect(tour.getByRole("heading")).toHaveText(TEACHER_TOUR[i].title);
    await expect(tour.getByText(`${i + 1} of ${TEACHER_TOUR.length}`)).toBeVisible();
    await expect(page.locator(".tour-spot")).toBeVisible();
    if (SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/tour-${i + 1}.png` }); }
    if (i === 2) { await tour.getByRole("button", { name: "Back" }).click(); await expect(tour.getByRole("heading")).toHaveText(TEACHER_TOUR[1].title); await tour.getByRole("button", { name: "Next" }).click(); }
    if (i < TEACHER_TOUR.length - 1) await tour.getByRole("button", { name: "Next" }).click();
  }
  await tour.getByRole("button", { name: "Start teaching 🎉" }).click();
  await expect(tour).toHaveCount(0);

  // Only the first time.
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Take the quick tour" })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(tour).toHaveCount(0);
  // Again on request; Escape (or Skip) ends it, and the board's own keys don't fire meanwhile.
  await page.getByRole("button", { name: "Take the quick tour" }).click();
  await expect(tour).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tour.getByRole("heading")).toHaveText(TEACHER_TOUR[1].title);
  await page.keyboard.press("Escape");
  await expect(tour).toHaveCount(0);
});

test("on a phone, the tour card sits along the bottom under the button it shows", async ({ browser }) => {
  const page = await firstTime(browser, true);
  const tour = page.getByRole("dialog", { name: "Quick tour" });
  await expect(tour).toBeVisible({ timeout: 15_000 });
  await tour.getByRole("button", { name: "Show me" }).click();
  await tour.getByRole("button", { name: "Next" }).click(); // Upload slides
  await expect(page.locator(".tour-spot")).toBeVisible();
  const card = (await tour.boundingBox())!, vp = page.viewportSize()!;
  expect(card.x).toBeGreaterThanOrEqual(0); expect(card.x + card.width).toBeLessThanOrEqual(vp.width);
  expect(card.y + card.height).toBeGreaterThan(vp.height - 40);
  if (SHOTS) { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/tour-phone.png` }); }
  await tour.getByRole("button", { name: "Skip tour" }).click();
  await expect(tour).toHaveCount(0);
});
