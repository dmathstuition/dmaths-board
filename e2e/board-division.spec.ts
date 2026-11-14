import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { tryPlan } from "../lib/division";

// Division, broken down: the teacher works one division five ways, a step at a
// time (learners see each step), can ask the class before each answer, and
// sends it to every phone for learners to do themselves.
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };

test("division broken down five ways, asked first, and done by learners on their phones", async ({ browser }) => {
  test.setTimeout(150_000);
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
    await hub.attach(ctx, who); await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: /^Division, broken down/ }).click();
  const div = teacher.getByRole("region", { name: /^Division: / }), theirs = learner.getByRole("region", { name: /^Division: / });
  const step = div.getByLabel("Step", { exact: true });

  // Short division (the bus stop), 96 ÷ 4: a digit at a time, carrying.
  await expect(step).toContainText("Short division · step 1 of");
  await div.getByRole("button", { name: "Next step ▶" }).click();
  await expect(step).toContainText("4 into 9 goes 2 (2 × 4 = 8), remainder 1. Carry the 1.");
  await expect(theirs.getByLabel("Step", { exact: true })).toContainText("4 into 9 goes 2", { timeout: 20_000 }); // learners see each step
  // Ask the class first: the question, then the answer when the teacher shows it.
  await div.getByLabel(/Ask the class first/).check();
  await div.getByRole("button", { name: "Next step ▶" }).click();
  await expect(step).toContainText("🤔 How many 4s in 16?");
  await expect(theirs.getByLabel("Step", { exact: true })).toContainText("How many 4s in 16?", { timeout: 20_000 });
  await shot(teacher, "division-ask");
  await div.getByRole("button", { name: "Show the answer" }).click();
  await expect(step).toContainText("4 into 16 goes 4 (4 × 4 = 16).");
  await div.getByLabel(/Ask the class first/).uncheck();
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("96 ÷ 4 = 24");
  await expect(step).toContainText("Check: 24 × 4 = 96 ✓");

  // The remainder as a fraction, or carried on as a decimal.
  await div.getByLabel("Divide", { exact: true }).fill("57");
  await div.getByLabel("by", { exact: true }).fill("5");
  await div.getByRole("group", { name: "Remainder as" }).getByRole("button", { name: "Fraction" }).click();
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("57 ÷ 5 = 11 2/5");
  await div.getByRole("group", { name: "Remainder as" }).getByRole("button", { name: "Decimal" }).click();
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("57 ÷ 5 = 11.4");
  await expect(step).toContainText("Check: 11 × 5 + 2 = 57 ✓");
  await shot(teacher, "division-short-decimal");
  await div.getByRole("group", { name: "Remainder as" }).getByRole("button", { name: "Remainder" }).click();

  // Sharing: 14 counters into 4 groups.
  await div.getByRole("tab", { name: "Sharing" }).click();
  await div.getByLabel("Divide", { exact: true }).fill("14");
  await div.getByLabel("by", { exact: true }).fill("4");
  await div.getByRole("button", { name: "Next step ▶" }).click();
  await expect(step).toContainText("Round 1: one more in each group — 1 in each. 10 left.");
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(div.getByRole("img", { name: "4 groups with 3 each; 2 left to share" })).toBeVisible();
  await expect(step).toContainText("14 ÷ 4 = 3 r 2");
  await shot(teacher, "division-sharing");
  // Grouping: jumps back on a number line.
  await div.getByRole("tab", { name: "Grouping" }).click();
  await div.getByLabel("Divide", { exact: true }).fill("23");
  await div.getByLabel("by", { exact: true }).fill("5");
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(div.getByRole("img", { name: "4 jumps of 5 back from 23, landing on 3" })).toBeVisible();
  await shot(teacher, "division-grouping");
  // Chunking: big, easy multiples.
  await div.getByRole("tab", { name: "Chunking" }).click();
  await div.getByLabel("Divide", { exact: true }).fill("432");
  await div.getByLabel("by", { exact: true }).fill("6");
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(div.getByRole("table", { name: "Chunks taken away" })).toContainText("50 + 20 + 2 = 72 lots of 6");
  await shot(teacher, "division-chunking");
  // Long division.
  await div.getByRole("tab", { name: "Long division" }).click();
  await div.getByLabel("Divide", { exact: true }).fill("5362");
  await div.getByLabel("by", { exact: true }).fill("13");
  await div.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("5362 ÷ 13 = 412 r 6");
  await shot(teacher, "division-long");

  // Learners try one on their phones — short division, a question at a time.
  await div.getByRole("tab", { name: "Short division" }).click();
  await div.getByLabel("Divide", { exact: true }).fill("57");
  await div.getByLabel("by", { exact: true }).fill("5");
  await div.getByRole("button", { name: "📱 Learners try 57 ÷ 5" }).click();
  const mine = learner.getByRole("dialog", { name: "Your turn: 57 ÷ 5" });
  await expect(mine).toBeVisible({ timeout: 20_000 });
  const plan = tryPlan(57, 5);
  for (const [i, p] of plan.entries()) {
    await expect(mine.getByText(p.ask)).toBeVisible();
    if (i === 0) { await mine.getByLabel("Your answer").fill("3"); await mine.getByRole("button", { name: "Check" }).click(); await expect(mine.getByRole("status")).toContainText("Not quite — try again."); }
    await mine.getByLabel("Your answer").fill(String(p.answer));
    await mine.getByRole("button", { name: "Check" }).click();
    if (i === 1) await shot(learner, "division-learner");
  }
  await expect(mine.getByText("✓ 57 ÷ 5 = 11 r 2")).toBeVisible();
  await expect(mine.getByText("Check: 11 × 5 + 2 = 57 ✓")).toBeVisible();
  await expect(div.getByText("✓ 1 finished · 0 with no mistakes")).toBeVisible({ timeout: 20_000 }); // the teacher sees it
  await shot(learner, "division-learner-done");
  // They can go on with their own.
  await mine.getByRole("button", { name: "Try another one" }).click();
  await expect(learner.getByRole("dialog", { name: /^Your turn: \d+ ÷ \d+$/ }).getByText(/^How many \d+s in \d+\?$/)).toBeVisible();
});
