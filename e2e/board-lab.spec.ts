import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The laboratory on the board: the teacher opens an experiment, puts it on the
// board as a page everyone can annotate, and lets learners try it themselves.
test("an experiment goes on the board and learners can try it", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };
  let uploaded = 0;
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/live-sessions/slides", (r) => r.fulfill({ json: { uploads: [{ path: `slides/${SID}/lab-1.jpg`, token: "t", url: `${base}/storage/v1/object/public/materials/slides/${SID}/lab-1.jpg` }] } }));
    await ctx.route("**/storage/v1/object/upload/sign/**", (r) => { if (r.request().method() !== "OPTIONS") uploaded++; return r.fulfill({ status: r.request().method() === "OPTIONS" ? 204 : 200, headers: cors, json: { Key: "x" } }); });
    await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors, body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#0B1220"/></svg>' }));
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");

  await teacher.getByRole("button", { name: "Laboratory" }).click();
  const lab = teacher.getByRole("dialog", { name: "Laboratory" });
  await lab.getByPlaceholder(/Search/).fill("pendulum");
  await lab.getByRole("button", { name: /Simple Pendulum/ }).click();
  await expect(lab.getByText("Apparatus", { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Learners can open it on their own phones.
  await lab.getByLabel("Let learners try it").check();
  await expect(learner.getByRole("dialog", { name: /Experiment: Simple Pendulum/ })).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText("Apparatus", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await learner.getByRole("button", { name: "Back to the class board" }).click();
  await expect(learner.getByRole("button", { name: /Try Simple Pendulum/ })).toBeVisible();

  // The apparatus becomes a board page, on the teacher's board and the learner's.
  await lab.getByRole("button", { name: "Put the apparatus on the board" }).click();
  await expect(lab).toBeHidden({ timeout: 60_000 });
  expect(uploaded).toBeGreaterThanOrEqual(1);
  await expect(teacher.locator('img[alt^="Slide"]').first()).toBeAttached({ timeout: 20_000 });
  await expect(learner.locator('img[alt^="Slide"]').first()).toBeAttached({ timeout: 30_000 });
});

// On a phone held upright in full screen the board turns sideways; the lab must
// still open upright and full size, its controls must work, and it must close.
for (const device of [
  { name: "phone held upright", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: "laptop", viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
]) test(`the lab works and closes in full screen (${device.name})`, async ({ browser }) => {
  const { name: _n, ...opts } = device;
  const ctx = await browser.newContext(opts);
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  const p = await ctx.newPage();
  await p.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(p);
  await p.getByRole("button", { name: "Full screen" }).click();
  await expect(p.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  await p.getByRole("button", { name: "Laboratory" }).click();

  const lab = p.getByRole("dialog", { name: "Laboratory" });
  // Upright and covering the whole screen (not turned, not cut to the board).
  const box = (await lab.boundingBox())!;
  expect(Math.round(box.width)).toBe(device.viewport.width);
  expect(Math.round(box.height)).toBe(device.viewport.height);
  expect(await lab.evaluate((el) => { let n: Element | null = el; while (n) { if (getComputedStyle(n).transform !== "none") return false; n = n.parentElement; } return true; })).toBe(true);

  await lab.getByPlaceholder(/Search/).fill("pendulum");
  await lab.getByRole("button", { name: /Simple Pendulum/ }).click();
  // Its controls work: move the length slider and the reading changes.
  const slider = lab.locator('input[type="range"]').first();
  await slider.scrollIntoViewIfNeeded();
  await expect(lab.getByText(/^1\.00 m$/)).toBeVisible();
  await slider.focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  await expect(lab.getByText(/^1\.00 m$/)).toBeHidden();
  await lab.getByRole("radio", { name: /Moon/ }).click();
  await expect(lab.getByText("1.62").first()).toBeVisible();
  // Hide keeps it running; End removes it completely.
  await lab.getByRole("button", { name: "Hide the lab" }).click();
  await expect(lab).toBeHidden();
  await p.getByRole("button", { name: "End the experiment" }).click();
  await expect(p.getByRole("button", { name: "End the experiment" })).toHaveCount(0);
  await expect(p.getByText("Simple Pendulum")).toHaveCount(0);
  // Esc closes it too.
  await p.getByRole("button", { name: "Laboratory" }).click();
  await expect(lab).toBeVisible();
  await p.keyboard.press("Escape");
  await expect(lab).toBeHidden();
  await expect(p.getByRole("button", { name: "Exit full screen" })).toBeVisible(); // still in full screen
});
