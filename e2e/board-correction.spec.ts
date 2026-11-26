import { test, expect, type Page, type Locator } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The correction space: the teacher marks two learners below full marks, writes
// and draws the right working for one, then sends a fresh correction to
// everyone who missed. It shows under each learner's mark, and is kept with it.
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page | Locator, name: string) => { if (SHOTS) { await (p as Page).waitForTimeout?.(300); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const BOLA = { id: "88888888-8888-4888-8888-888888888888", name: "Bola" };
async function drag(p: Page, c: Locator, from: [number, number], to: [number, number]) {
  await c.scrollIntoViewIfNeeded();
  const b = (await c.boundingBox())!;
  await p.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(b.x + b.width * (from[0] + ((to[0] - from[0]) * i) / 8), b.y + b.height * (from[1] + ((to[1] - from[1]) * i) / 8));
  await p.mouse.up();
}

test("the teacher writes a correction for a learner who missed, then for everyone who missed", async ({ browser }) => {
  test.setTimeout(200_000);
  const hub = realtimeHub(), server = classServer(0, [BOLA]);
  const kept: any[] = [];
  const open = async (who: "teacher" | "ada" | "bola") => {
    const ctx = await browser.newContext(who === "teacher" ? { viewport: { width: 1366, height: 900 } } : { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
    await hub.attach(ctx, who === "teacher" ? "teacher" : "learner"); await server.attach(ctx, who === "teacher" ? "teacher" : "learner", who === "bola" ? BOLA : undefined);
    await ctx.route("**/api/live-sessions/results", (r) => { kept.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { ok: true } }); });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), ada = await open("ada"), bola = await open("bola");
  await teacher.waitForTimeout(1500);
  const answer = async (p: Page, text: string) => {
    const mine = p.getByRole("dialog", { name: "Your answer board" });
    await mine.getByRole("tab", { name: "⌨️ Type" }).click();
    await mine.getByLabel("Type your answer").fill(text);
  };

  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("Solve 3x = 12");
  await panel.getByRole("button", { name: "2 marks" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await expect(ada.getByText("Solve 3x = 12")).toBeVisible({ timeout: 20_000 });
  await answer(ada, "x = 36"); await answer(bola, "x = 9");
  await expect(panel.getByText(/2 of 2 answered/)).toBeVisible({ timeout: 20_000 });
  await panel.getByLabel("Hide names").uncheck();
  await panel.getByRole("combobox", { name: /^Mark for Emmanuel/ }).selectOption("0");
  await panel.getByRole("combobox", { name: /^Mark for Bola/ }).selectOption("1");

  // A correction for Emmanuel: typed, and drawn on the correction board.
  await panel.getByRole("button", { name: "Open Emmanuel's answer" }).click();
  const space = teacher.getByRole("region", { name: "Correction space" });
  await space.getByLabel("Correction for Emmanuel").fill("3x = 12, so x = 12 ÷ 3 = 4 (divide, don't multiply)");
  await drag(teacher, space.getByRole("img", { name: "Mark on the page" }), [0.2, 0.4], [0.6, 0.45]);
  await shot(space, "correction-teacher");
  await space.getByRole("button", { name: "Send to Emmanuel" }).click();
  await expect(space.getByRole("button", { name: "✓ Sent" })).toBeVisible();
  const fixA = ada.getByRole("region", { name: "Correction from your tutor" });
  await expect(fixA).toContainText("x = 12 ÷ 3 = 4", { timeout: 20_000 });
  await expect(fixA.getByRole("img", { name: "The teacher's marking" })).toBeVisible();
  await expect(bola.getByRole("region", { name: "Correction from your tutor" })).toHaveCount(0); // not for Bola
  await shot(ada, "correction-learner");
  expect(kept.find((b) => b.studentId && b.answer?.fix?.text?.includes("x = 12 ÷ 3 = 4"))?.answer.fix.ink.length).toBeGreaterThan(0); // kept with the mark
  await teacher.getByRole("button", { name: "Back to all answers" }).click();
  await expect(panel.getByLabel("Correction sent")).toHaveCount(1);

  // One for everyone who missed (both of them).
  await panel.getByRole("button", { name: "Open Bola's answer" }).click();
  await expect(space.getByRole("button", { name: "Send to all 2 who missed" })).toBeVisible();
  await space.getByLabel("Correction for Bola").fill("Divide both sides by 3: x = 4");
  await space.getByRole("button", { name: "Send to all 2 who missed" }).click();
  await expect(bola.getByRole("region", { name: "Correction from your tutor" })).toContainText("Divide both sides by 3", { timeout: 20_000 });
  await expect(ada.getByRole("region", { name: "Correction from your tutor" })).toContainText("Divide both sides by 3", { timeout: 20_000 });
  await teacher.getByRole("button", { name: "Back to all answers" }).click();
  await expect(panel.getByLabel("Correction sent")).toHaveCount(2);
});
