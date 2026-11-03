import { test, expect, type Browser, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Maths blocks: the teacher puts fraction bars, algebra tiles and a number
// line on the board; the learner sees them, and can move them once allowed.
async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);
  return { teacher, learner };
}
const piece = (p: Page, name: string | RegExp) => p.locator("[data-block][role=button]").filter({ has: p.locator("svg") }).and(p.getByRole("button", { name }));
async function dragBy(p: Page, name: string | RegExp, dx: number, dy: number) {
  const b = (await piece(p, name).first().boundingBox())!;
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(b.x + b.width / 2 + (dx * i) / 8, b.y + b.height / 2 + (dy * i) / 8);
  await p.mouse.up();
}

test("maths blocks: fraction bars, algebra tiles, a number line with counters; learners move them when allowed", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("button", { name: /Maths blocks/ }).first().click();
  const tray = teacher.getByRole("region", { name: "Maths blocks" });
  await expect(tray).toBeVisible();

  await tray.getByRole("button", { name: "Add a 1 bar" }).click();
  await tray.getByRole("button", { name: "Add a 1/2 bar" }).click();
  await tray.getByRole("button", { name: "Add a 1/2 bar" }).click();
  await tray.getByRole("button", { name: "Add a 1/4 bar" }).click();
  await tray.getByRole("button", { name: "Add a x² tile" }).click();
  await tray.getByRole("button", { name: "Add a x tile" }).click();
  await tray.getByRole("button", { name: "Add a x tile" }).click();
  await tray.getByText("Negative").click();
  await tray.getByRole("button", { name: "Add a −1 tile" }).click();
  await tray.getByRole("button", { name: "Add a −x tile" }).click();
  await expect(tray.getByText("x² + x − 1")).toBeVisible();
  await tray.getByRole("button", { name: "Remove zero pairs" }).click();
  await expect(tray.getByText("x² + x − 1")).toBeVisible(); // −x cancelled one x
  await expect(piece(teacher, "−x")).toHaveCount(0);

  await tray.getByRole("button", { name: "Tidy up" }).click();
  await tray.getByRole("button", { name: "Add a number line from 0 to 10" }).click();
  await tray.getByRole("button", { name: "Add a counter (colour 1)" }).click();

  // Tap a tile: turn it and flip its sign.
  await piece(teacher, "x²").click();
  await teacher.getByRole("button", { name: "Flip between positive and negative" }).click();
  await expect(tray.getByText("−x² + x − 1")).toBeVisible();

  // The learner sees the same pieces but can't move them yet.
  await expect(learner.getByRole("button", { name: "1/4" })).toBeVisible({ timeout: 10_000 });
  await expect(learner.getByText("Watch your teacher move the pieces.")).toBeVisible();

  // Allow learners to move them: the learner drags the counter onto the number line.
  await tray.getByText("Learners can move them").click();
  await expect(learner.getByText("You can drag the pieces on the board.")).toBeVisible({ timeout: 10_000 });
  const line = (await piece(learner, /number line 0 to 10/).boundingBox())!;
  const chip = (await piece(learner, /counter/).boundingBox())!;
  await dragBy(learner, /counter/, line.x + line.width * 0.5 - (chip.x + chip.width / 2), line.y + line.height * 0.3 - (chip.y + chip.height / 2));
  await expect(teacher.getByRole("button", { name: /counter at [45]/ })).toBeVisible({ timeout: 10_000 });
  await expect(learner.getByRole("button", { name: /counter at [45]/ })).toBeVisible({ timeout: 10_000 });

  await teacher.locator("[data-board]").first().screenshot({ path: "test-results/math-blocks-teacher.png" });
  await learner.locator("[data-board]").first().screenshot({ path: "test-results/math-blocks-learner.png" });
});
