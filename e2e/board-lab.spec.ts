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
  await expect(lab.getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });

  // Learners can open it on their own phones.
  await lab.getByLabel("Let learners try it").check();
  await expect(learner.getByRole("dialog", { name: /Experiment: Simple Pendulum/ })).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });
  // The teacher sees how far they've got, live.
  await learner.getByRole("button", { name: "Do this step for me" }).click();
  await lab.getByRole("button", { name: /Learners' progress/ }).click();
  const tracker = lab.getByRole("region", { name: "Learners' progress" });
  await expect(tracker.getByText(/Step 2:/)).toBeVisible({ timeout: 20_000 });
  await expect(tracker.getByText("1 trying")).toBeVisible();
  await tracker.getByRole("button", { name: "Back to the experiment" }).click();
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
  // Its controls work: turn the length dial and the reading changes.
  const slider = lab.getByLabel("Length of the pendulum");
  await slider.scrollIntoViewIfNeeded();
  await expect(lab.locator("output").filter({ hasText: /^0\.3 m$/ })).toBeVisible();
  await slider.focus();
  await p.keyboard.press("ArrowRight");
  await p.keyboard.press("ArrowRight");
  await expect(lab.locator("output").filter({ hasText: /^0\.4 m$/ })).toBeVisible();
  await lab.getByRole("button", { name: "Done" }).click();
  await expect(lab.getByRole("heading", { name: "Release it and time 10 swings" })).toBeVisible();
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

// A virtual practical on the lab bench, done by hand: drag the meters into the
// circuit, switch on, turn the dial, read the ammeter and write it down.
test("a bench practical: Ohm's law done step by step", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  const p = await ctx.newPage();
  await p.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(p);
  await p.getByRole("button", { name: "Laboratory" }).click();
  const lab = p.getByRole("dialog", { name: "Laboratory" });
  await expect(lab.getByRole("region", { name: "Virtual practicals" })).toBeVisible();
  await lab.getByRole("button", { name: "Ohm's Law", exact: true }).click();
  const bench = lab.getByRole("group", { name: /Lab bench/ });
  await expect(bench).toBeVisible({ timeout: 30_000 });

  // Drag the ammeter from the shelf into the gap in the circuit.
  const from = (await bench.locator('[data-item="ammeter"]').boundingBox())!;
  const to = (await bench.locator('[data-item="slotA"]').boundingBox())!;
  await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await p.mouse.down();
  await p.mouse.move(from.x + from.width / 2 - 20, from.y + from.height / 2 + 40, { steps: 4 });
  await p.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await p.mouse.up();
  await expect(lab.getByRole("heading", { name: "Connect the voltmeter in parallel" })).toBeVisible();

  // Or tap the voltmeter, then where it goes.
  await bench.locator('[data-item="voltmeter"]').click();
  await bench.getByRole("button", { name: /Put it on the leads/ }).click();
  await lab.getByRole("button", { name: "Switch on" }).click();

  // Turn the dial: the wrong value is pointed out; the right one is accepted.
  const dial = lab.getByLabel("Power supply output");
  await dial.fill("2");
  await lab.getByRole("button", { name: "Done" }).click();
  await expect(lab.getByRole("alert")).toContainText("turn it to 1 V");
  await dial.fill("1");
  await lab.getByRole("button", { name: "Done" }).click();

  // Read the ammeter and write it in the notebook.
  const field = lab.getByLabel("Current at 1.0 V");
  await field.fill("5");
  await lab.getByRole("button", { name: "Check" }).click();
  await expect(lab.getByText(/tries left/)).toBeVisible();
  const reading = (await bench.locator('[data-item="ammeter"] text').allTextContents()).find((t) => /^\d\.\d{3}$/.test(t))!;
  await field.fill(reading);
  await lab.getByRole("button", { name: "Check" }).click();
  await expect(lab.getByText("✓ Right")).toBeVisible();
  await expect(lab.getByRole("heading", { name: "Set the p.d. to 2.0 V" })).toBeVisible();

  // The rest, done for us; then the results, graph and conclusion.
  for (let i = 0; i < 40 && !(await lab.getByText("✓ Practical complete").isVisible()); i++) {
    const doIt = lab.getByRole("button", { name: "Do this step for me" });
    if (await doIt.isVisible()) await doIt.click();
    else await lab.getByRole("button", { name: "Show me the answer" }).click();
    await p.waitForTimeout(900);
  }
  await expect(lab.getByText("✓ Practical complete")).toBeVisible();
  const notebook = lab.getByRole("complementary", { name: "Lab notebook" });
  await expect(notebook.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true");
  await expect(notebook.getByRole("img", { name: /Current against p\.d\./ })).toBeVisible();
  await expect(notebook.getByText(reading)).toBeVisible();

  // It goes on the board like any experiment.
  await expect(lab.getByRole("button", { name: "Put the apparatus on the board" })).toBeEnabled();
});
