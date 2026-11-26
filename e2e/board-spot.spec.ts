import { test, expect, type Page, type Locator } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Spot the mistake: the A.I. writes a worked solution with one wrong line; the
// teacher checks it and sends it; the learner never gets the answer, taps a
// line (and can change their mind); the teacher sees the picks, reveals it,
// and the learner sees whether they found it, why it's wrong and the fix.
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page | Locator, name: string) => { if (SHOTS) { await (p as Page).waitForTimeout?.(300); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const SPOT = { title: "Expanding brackets", question: "Expand 3(x + 4)", lines: ["3(x + 4)", "= 3 × x + 4", "= 3x + 4", "Answer: 3x + 4"], wrong: 1, why: "The 3 has to multiply the 4 as well, not just x.", fix: "= 3 × x + 3 × 4" };

test("the teacher sends a worked solution with one mistake; learners find it; the teacher reveals it", async ({ browser }) => {
  test.setTimeout(150_000);
  const hub = realtimeHub(), server = classServer();
  const asked: any[] = [];
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
    await hub.attach(ctx, who); await server.attach(ctx, who);
    if (who === "teacher") await ctx.route("**/api/quiz-sets", (r) => { asked.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { spot: SPOT } }); });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1200);

  // The teacher asks the A.I. and checks what it wrote.
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: "Spot the mistake" }).click();
  const t = teacher.getByRole("dialog", { name: "Spot the mistake" });
  await t.getByLabel("Topic").fill("Expanding brackets");
  await t.getByRole("group", { name: "Level" }).getByRole("button", { name: "JSS 1–3" }).click();
  await t.getByRole("button", { name: "✨ Write one with the A.I." }).click();
  expect(asked.find((b) => b.action === "ai-spot")).toMatchObject({ topic: "Expanding brackets", level: "JSS 1–3", kind: "any" });
  await expect(t.getByLabel("Line 2 is the mistake")).toBeChecked();
  await t.getByLabel("Line 3", { exact: true }).fill("= 3x + 4"); // the teacher can change a line
  await shot(t, "spot-teacher-draft");
  await t.getByRole("button", { name: /▶ Send to the class/ }).click();

  // The learner sees the working — and no answer.
  const l = learner.getByRole("dialog", { name: "Spot the mistake — find the wrong line" });
  await expect(l.getByText("Expand 3(x + 4)")).toBeVisible({ timeout: 20_000 });
  await expect(l.getByText(/has to multiply the 4/)).toHaveCount(0);
  await expect(l.getByText("= 3 × x + 3 × 4")).toHaveCount(0);
  await l.getByRole("button", { name: /^Line 3:/ }).click();           // a wrong guess…
  await expect(l.getByText("✓ You picked line 3")).toBeVisible();
  await l.getByRole("button", { name: /^Line 2:/ }).click();           // …then the right one
  await expect(l.getByText("✓ You picked line 2")).toBeVisible();
  await shot(learner, "spot-learner");

  // The teacher sees the picks come in (numbers only until revealed).
  await expect(t.getByText("1 of 1 picked a line")).toBeVisible({ timeout: 20_000 });
  await expect(t.getByLabel("1 picked line 2")).toBeVisible();
  await expect(t.getByLabel("0 picked line 3")).toBeVisible();
  await expect(t.getByText(/🎉/)).toHaveCount(0);
  await shot(t, "spot-teacher-live");
  await t.getByRole("button", { name: "🔍 Reveal the mistake" }).click();
  await expect(t.getByText("🎉 1 found it: Emmanuel")).toBeVisible();
  await expect(t.getByText("✗ the mistake")).toBeVisible();

  // The learner sees the result, the reason and the fix.
  await expect(l.getByText("🎉 You found it!")).toBeVisible({ timeout: 20_000 });
  await expect(l.getByText(/has to multiply the 4 as well/)).toBeVisible();
  await expect(l.getByText("= 3 × x + 3 × 4")).toBeVisible();
  await expect(l.getByRole("button", { name: /^Line 3:/ })).toBeDisabled(); // no changing it now
  await shot(learner, "spot-learner-revealed");
  // New one clears it for the next.
  await t.getByRole("button", { name: "New one" }).click();
  await expect(l).toHaveCount(0, { timeout: 20_000 });
});
