import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The lab rooms: every piece of apparatus, to try out, pick, and plan a
// practical with — then start the real practical.
const SHOTS = process.env.LAB_SHOTS;
async function openLab(browser: import("@playwright/test").Browser, mobile = false) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  const p = await ctx.newPage();
  await p.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(p);
  await p.getByRole("button", { name: "Laboratory" }).click();
  return p;
}
const room = (p: Page) => p.getByRole("region", { name: "Lab room" });

test("lab room: try apparatus out — read a scale, test a reagent, wire a part", async ({ browser }) => {
  test.setTimeout(120_000);
  const p = await openLab(browser);
  const lab = p.getByRole("dialog", { name: "Laboratory" });
  await lab.getByRole("region", { name: "Lab rooms" }).getByRole("button", { name: "Physics Lab Room" }).click();
  await expect(room(p)).toBeVisible({ timeout: 30_000 });
  await expect(room(p).getByRole("tab", { name: "Physics lab" })).toHaveAttribute("aria-selected", "true");

  // A scale: read it, and a wrong reading is put right.
  await room(p).getByPlaceholder(/Search/).fill("metre rule");
  await room(p).getByRole("button", { name: "About the Metre rule" }).click();
  const sheet = p.getByRole("dialog", { name: "Metre rule" });
  await expect(sheet.getByText("0–100 cm")).toBeVisible();
  await sheet.getByLabel("Your reading").fill("999");
  await sheet.getByRole("button", { name: "Check" }).click();
  const told = await sheet.getByRole("status").textContent();
  const right = told!.match(/it reads ([\d.]+) cm/)![1];
  await sheet.getByLabel("Your reading").fill(right);
  await sheet.getByRole("button", { name: "Check" }).click();
  await expect(sheet.getByRole("status")).toContainText(`✓ ${right} cm ± 0.05 cm`);
  if (SHOTS) await sheet.screenshot({ path: `${SHOTS}/room-scale.png` });
  await sheet.getByRole("button", { name: "Close" }).click();

  // A circuit part: an LDR's resistance falls in bright light.
  await room(p).getByPlaceholder(/Search/).fill("LDR");
  await room(p).getByRole("button", { name: "About the LDR" }).click();
  const ldr = p.getByRole("dialog", { name: "LDR" });
  await expect(ldr.getByRole("img", { name: "Current against p.d." })).toBeVisible();
  await ldr.getByRole("slider", { name: "Light" }).press("End");
  await expect(ldr.getByText(/brighter the light, the lower its resistance/)).toBeVisible();
  await ldr.getByRole("button", { name: "Close" }).click();

  // Chemistry: copper(II) sulfate with sodium hydroxide.
  await room(p).getByRole("tab", { name: "Chemistry lab" }).click();
  await room(p).getByPlaceholder(/Search/).fill("copper(II) sulfate");
  await room(p).getByRole("button", { name: "About the Copper(II) sulfate" }).click();
  const cu = p.getByRole("dialog", { name: "Copper(II) sulfate" });
  await cu.getByRole("button", { name: "sodium hydroxide (aq)" }).click();
  await expect(cu.getByRole("status")).toContainText("light blue precipitate");
  await cu.getByRole("button", { name: "flame test" }).click();
  await expect(cu.getByRole("status")).toContainText("blue-green flame");
  if (SHOTS) await cu.screenshot({ path: `${SHOTS}/room-reagent.png` });
  await cu.getByRole("button", { name: "Close" }).click();

  // Maths: a cone's volume changes with its measurements.
  await room(p).getByRole("tab", { name: "Mathematics lab" }).click();
  await room(p).getByRole("group", { name: "Shelves" }).getByRole("button", { name: "3D solids" }).click();
  await room(p).getByRole("button", { name: "About the Cone" }).click();
  const cone = p.getByRole("dialog", { name: "Cone" });
  await expect(cone.getByText("Volume", { exact: true })).toBeVisible();
  await expect(cone.getByText("83.78 cm³")).toBeVisible(); // r = 4, h = 5: ⅓πr²h
});

test("lab room: pick apparatus, plan a titration — checked, risk-assessed — and start it", async ({ browser }) => {
  test.setTimeout(150_000);
  const p = await openLab(browser, true);
  const lab = p.getByRole("dialog", { name: "Laboratory" });
  await lab.getByRole("region", { name: "Lab rooms" }).getByRole("button", { name: "Chemistry Lab Room" }).click();
  await expect(room(p)).toBeVisible({ timeout: 30_000 });
  // On a phone too, the 3D lab is the first thing in the room.
  await expect(room(p).getByRole("img", { name: /My bench in 3D/ }).locator("canvas")).toBeVisible({ timeout: 30_000 });
  if (SHOTS) { await p.waitForTimeout(1500); await p.screenshot({ path: `${SHOTS}/room-shelves.png` }); }

  // Pick two things from the shelves.
  await room(p).getByPlaceholder(/Search/).fill("burette");
  await room(p).getByRole("button", { name: "Pick the Burette", exact: true }).click();
  await room(p).getByPlaceholder(/Search/).fill("hydrochloric");
  await room(p).getByRole("button", { name: "Pick the Hydrochloric acid" }).click();
  await expect(room(p).getByRole("button", { name: "Put back the Hydrochloric acid", exact: true })).toBeVisible();

  // Plan: the titration needs more — add what's missing.
  await room(p).getByRole("button", { name: "Plan my practical" }).click();
  const plan = p.getByRole("dialog", { name: "Plan my practical" });
  await expect(plan.getByLabel("My apparatus").getByText("Burette")).toBeVisible();
  await plan.getByLabel("Which practical are you planning?").selectOption({ label: "Acid–Alkali Titration" });
  await expect(plan.getByText(/2 of 8\. Still needed: .*Volumetric pipette/)).toBeVisible();
  await expect(plan.getByRole("button", { name: "▶ Start the practical" })).toBeDisabled();
  await plan.getByRole("button", { name: "＋ Add them" }).click();
  await expect(plan.getByText("✓ You have all 8 pieces of apparatus this practical needs.")).toBeVisible();
  // The risk assessment comes from the acid and alkali picked.
  const risk = plan.getByRole("region", { name: "Risk assessment" });
  await expect(risk.getByRole("cell", { name: "corrosive", exact: true })).toBeVisible();
  await plan.getByLabel("Aim").fill("To find the concentration of hydrochloric acid.");
  await plan.getByLabel("Step 1", { exact: true }).fill("Rinse the burette with the acid and fill it to 0.00 cm³.");
  await plan.getByRole("button", { name: "＋ Add a step" }).click();
  await plan.getByLabel("Step 2", { exact: true }).fill("Pipette 25.0 cm³ of sodium hydroxide into the conical flask.");
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/room-plan.png`, fullPage: true });

  // The plan is kept on this device.
  await plan.getByRole("button", { name: "Back to the shelves" }).click();
  await room(p).getByRole("button", { name: "Plan my practical" }).click();
  await expect(plan.getByLabel("Step 2", { exact: true })).toHaveValue(/Pipette 25.0/);

  // Start the real practical.
  await plan.getByRole("button", { name: "▶ Start the practical" }).click();
  await expect(lab.getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });
  await expect(lab.getByText("Acid–Alkali Titration").first()).toBeVisible();
});

test("lab room shared with learners: a learner plans on their phone and starts the practical themselves", async ({ browser }) => {
  test.setTimeout(150_000);
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 860 } });
    await hub.attach(ctx, who); await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.getByRole("button", { name: "Laboratory" }).click();
  const lab = teacher.getByRole("dialog", { name: "Laboratory" });
  await lab.getByRole("region", { name: "Lab rooms" }).getByRole("button", { name: "Biology Lab Room" }).click();
  await expect(room(teacher)).toBeVisible({ timeout: 30_000 });
  await lab.getByLabel("Let learners try it").check();

  const mine = learner.getByRole("dialog", { name: /Experiment: Biology Lab Room/ });
  await expect(mine).toBeVisible({ timeout: 20_000 });
  await expect(room(learner)).toBeVisible({ timeout: 30_000 });
  await room(learner).getByRole("button", { name: "Plan my practical" }).click();
  const plan = learner.getByRole("dialog", { name: "Plan my practical" });
  await plan.getByLabel("Which practical are you planning?").selectOption({ label: "Testing a Leaf for Starch" });
  await plan.getByRole("button", { name: "＋ Add them" }).click();
  await expect(plan.getByText(/You have all 7 pieces/)).toBeVisible();
  await expect(plan.getByRole("region", { name: "Risk assessment" }).getByRole("cell", { name: "flammable", exact: true })).toBeVisible(); // the ethanol
  await plan.getByRole("button", { name: "▶ Start the practical" }).click();
  await expect(learner.getByRole("dialog", { name: /Experiment: Testing a Leaf for Starch/ }).getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });
  // Only on their phone: the teacher is still in the lab room. And back again.
  await expect(room(teacher)).toBeVisible();
  await learner.getByRole("button", { name: "Back to the lab room" }).click();
  await expect(room(learner)).toBeVisible({ timeout: 20_000 });
});

test("free bench: apparatus react — a precipitate, heating to boiling, a lamp lighting", async ({ browser }) => {
  test.setTimeout(180_000);
  const p = await openLab(browser);
  const lab = p.getByRole("dialog", { name: "Laboratory" });
  await lab.getByRole("region", { name: "Lab rooms" }).getByRole("button", { name: "Chemistry Lab Room" }).click();
  await expect(room(p)).toBeVisible({ timeout: 30_000 });
  // The 3D lab is the first thing in the room, with a few things already out on the bench.
  const plan = room(p).getByRole("region", { name: "Lab bench" });
  await expect(plan.getByRole("img", { name: /My bench in 3D/ }).locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect(plan.locator('[data-bench-item="chemistry-bunsen-burner"]')).toBeVisible();
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/room-3d.png` });
  const pick = async (search: string, name: string) => { await room(p).getByPlaceholder(/Search/).fill(search); const b = room(p).getByRole("button", { name: `Pick the ${name}`, exact: true }); await expect(b.or(room(p).getByRole("button", { name: `Put back the ${name}`, exact: true }))).toBeVisible(); if (await b.isVisible()) await b.click(); };
  for (const [q, n] of [["copper(II) sulfate", "Copper(II) sulfate"], ["sodium hydroxide", "Sodium hydroxide"], ["test tube", "Test tube"], ["distilled", "Distilled water"], ["beaker", "Beaker"], ["bunsen", "Bunsen burner"], ["thermometer", "Thermometer"]]) await pick(q, n);
  const tile = (id: string) => plan.locator(`[data-bench-item="chemistry-${id}"]`);
  const use = async (a: string, b: string) => { await tile(a).getByRole("button").first().click(); await tile(b).getByRole("button").first().click(); };
  // The bench is in 3D (drawn with WebGL); the pieces are also listed as buttons under it.
  // Copper(II) sulfate, then sodium hydroxide: a light blue precipitate.
  await use("copper-ii-sulfate", "test-tube");
  await expect(plan.getByRole("status", { name: "What happened" })).toContainText("Copper(II) sulfate poured in");
  await use("sodium-hydroxide", "test-tube");
  await expect(plan.getByRole("status", { name: "What happened" })).toContainText("light blue");
  await p.waitForTimeout(1200);
  if (SHOTS) await plan.getByRole("img", { name: /My bench in 3D/ }).screenshot({ path: `${SHOTS}/bench-ppt.png` });
  // Water in a beaker, on the Bunsen, thermometer in: it heats to 100 °C and boils.
  await use("distilled-water", "beaker");
  await use("beaker", "bunsen-burner");
  await use("thermometer", "beaker");
  await plan.getByRole("toolbar", { name: "Bench controls" }).getByRole("button", { name: "×20" }).click();
  await expect(tile("thermometer")).toContainText("100 °C", { timeout: 60_000 });
  await expect(plan.getByRole("region", { name: "My observations" })).toContainText("boiling at 100 °C");
  if (SHOTS) await plan.getByRole("img", { name: /My bench in 3D/ }).screenshot({ path: `${SHOTS}/bench-boil.png` });
  // Trying something silly is explained, not ignored.
  await use("sodium-hydroxide", "bunsen-burner");
  await expect(plan.getByRole("status", { name: "What happened" })).toContainText("Nothing happens");

  // Physics: a cell, switch, lamp and ammeter — close the switch and the lamp lights.
  await room(p).getByRole("tab", { name: "Physics lab" }).click();
  for (const [q, n] of [["batteries", "Batteries"], ["switch", "Switch"], ["electric bulb", "Electric bulb"], ["ammeter", "Ammeter"]]) await pick(q, n);
  const ph = (id: string) => plan.locator(`[data-bench-item="physics-${id}"]`);
  const join = async (a: string, b: string) => { await ph(a).getByRole("button").first().click(); await ph(b).getByRole("button").first().click(); };
  await join("switch", "batteries"); await join("electric-bulb", "switch"); await join("ammeter", "electric-bulb");
  await expect(plan.getByText("The switch is open")).toBeVisible();
  await ph("switch").getByRole("button", { name: "Close it" }).click();
  await expect(ph("ammeter")).toContainText(/0\.\d\d A/, { timeout: 10_000 });
  if (SHOTS) { await p.waitForTimeout(800); await plan.getByRole("img", { name: /My bench in 3D/ }).screenshot({ path: `${SHOTS}/bench-circuit.png` }); }
  // The flat view is still there, with the same bench.
  await plan.getByRole("group", { name: "View" }).getByRole("button", { name: "▦ Flat" }).click();
  await expect(plan.getByLabel("My bench", { exact: true })).toBeVisible();
  await expect(ph("ammeter")).toContainText(/0\.\d\d A/);
});

test("the teacher sets a practical; a learner plans it on their phone and hands it in; the teacher replies", async ({ browser }) => {
  test.setTimeout(180_000);
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 860 } });
    await hub.attach(ctx, who); await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.getByRole("button", { name: "Laboratory" }).click();
  const lab = teacher.getByRole("dialog", { name: "Laboratory" });
  await lab.getByRole("region", { name: "Lab rooms" }).getByRole("button", { name: "Chemistry Lab Room" }).click();
  const set = room(teacher).getByRole("region", { name: "Set a practical" });
  await set.getByLabel("Set a practical for the class to plan").selectOption({ label: "Acid–Alkali Titration" });
  await set.getByLabel("Note (optional)").fill("Include a risk assessment");
  await set.getByRole("button", { name: "Set it for the class" }).click();
  await expect(set.getByText("Set for the class:")).toBeVisible();

  // The learner's phone: the room opens with what was set.
  const banner = learner.getByRole("status", { name: "Set by your teacher" });
  await expect(banner).toContainText("Acid–Alkali Titration", { timeout: 30_000 });
  await expect(banner).toContainText("Include a risk assessment");
  await banner.getByRole("button", { name: "Plan it" }).click();
  const plan = learner.getByRole("dialog", { name: "Plan my practical" });
  await expect(plan.getByLabel("Which practical are you planning?")).toHaveValue("titration");
  await plan.getByRole("button", { name: "＋ Add them" }).click();
  await plan.getByLabel("Aim").fill("To find the concentration of hydrochloric acid.");
  await plan.getByRole("button", { name: "📤 Hand in my plan" }).click();
  await expect(plan.getByText(/✓ Handed in at/)).toBeVisible();

  // The teacher sees it, and replies.
  await lab.getByRole("button", { name: /Learners' plans · 1/ }).click({ timeout: 30_000 });
  const plans = lab.getByRole("region", { name: "Learners' plans" });
  await plans.getByRole("button", { name: /Acid–Alkali Titration/ }).click();
  await expect(plans.getByText("🧰 8/8")).toBeVisible();
  await expect(plans.getByText(/Missing from the plan: the variables/)).toBeVisible();
  if (SHOTS) await teacher.screenshot({ path: `${SHOTS}/teacher-plans.png` });
  await plans.getByRole("textbox", { name: /Reply to/ }).fill("Say what you will change and measure.");
  await plans.getByRole("button", { name: /💬 Send to/ }).click();
  await expect(plan.getByText("💬 Your teacher: Say what you will change and measure.")).toBeVisible({ timeout: 30_000 });
  await plans.getByRole("button", { name: "✓ Approve" }).click();
  await expect(plan.getByText(/✓ Your teacher: Good plan/)).toBeVisible({ timeout: 30_000 });
  if (SHOTS) await learner.screenshot({ path: `${SHOTS}/learner-reply.png` });
});
