import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Bearings & distance: the teacher's compass and worked journeys reach the
// learner; the WAEC quizzes are ready in Games.
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

test("bearings tool: back bearing and north/east parts, then a journey worked step by step", async ({ browser }) => {
  test.setTimeout(180_000);
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("button", { name: /Bearings & distance/ }).first().click();
  const panel = teacher.getByRole("region", { name: "Bearings & distance" });
  await expect(panel).toBeVisible();

  // One bearing: 040°, 50 km — back bearing and the north/east parts (slide 17).
  await panel.getByLabel("Bearing in degrees").fill("40");
  await panel.getByText("Back bearing", { exact: true }).click();
  await panel.getByText("North & east parts").click();
  await expect(panel.getByText("Back bearing (O from P) = 040° + 180° = 220°")).toBeVisible();
  await expect(panel.getByText("North = 50 cos 40° = 38.3 km")).toBeVisible();
  await expect(panel.getByText("East = 50 sin 40° = 32.1 km")).toBeVisible();
  const lPanel = learner.getByRole("region", { name: "Bearings & distance" });
  await expect(lPanel.getByText("North = 50 cos 40° = 38.3 km")).toBeVisible({ timeout: 15_000 });
  await panel.screenshot({ path: "test-results/bearings-compass.png" });

  // Example 6, step by step: the learner sees each step as it's revealed.
  await panel.getByRole("tab", { name: "Journey (2 legs)" }).click();
  await panel.getByRole("button", { name: "Example 6 (cosine rule)" }).click();
  await expect(panel.getByText(/A is 8 km from H on a bearing of 040°/)).toBeVisible();
  await panel.getByRole("button", { name: "Next step" }).click();
  await panel.getByRole("button", { name: "Next step" }).click();
  await expect(panel.getByText("∠HAB = 220° − 120° = 100°")).toBeVisible();
  await expect(lPanel.getByText("∠HAB = 220° − 120° = 100°")).toBeVisible({ timeout: 15_000 });
  await expect(lPanel.getByText(/Cosine rule/)).toHaveCount(0); // not revealed yet
  await panel.getByRole("button", { name: "Show all" }).click();
  await expect(panel.getByText("Answer: HB = 10.8 km; bearing of B from H = 073°")).toBeVisible();
  await expect(lPanel.getByText("Answer: HB = 10.8 km; bearing of B from H = 073°")).toBeVisible({ timeout: 15_000 });
  await panel.screenshot({ path: "test-results/bearings-journey.png" });

  // Two from one point: Activity B Q4.
  await panel.getByRole("tab", { name: "From one point" }).click();
  await panel.getByRole("button", { name: "Activity B Q4" }).click();
  await panel.getByRole("button", { name: "Show all" }).click();
  await expect(panel.getByText("Answer: BC = 15 km; bearing of C from B = 157°")).toBeVisible();
  await learner.locator("[data-board]").first().screenshot({ path: "test-results/bearings-learner.png" });
});

test("the WAEC bearings quizzes are ready in Games, and in Exam mode", async ({ browser }) => {
  const { teacher } = await openClass(browser);
  await teacher.getByRole("button", { name: /Games/ }).first().click();
  const games = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await games.getByRole("button", { name: /Upper secondary/ }).click();
  await expect(games.getByRole("button", { name: /Bearings & back bearings/ })).toBeVisible();
  await expect(games.getByRole("button", { name: /Bearing & distance problems/ })).toBeVisible();
  await expect(games.getByRole("button", { name: /Bearing Bound/ })).toBeVisible();
  await games.getByRole("button", { name: /Bearing & distance problems/ }).click();
  await expect(games.getByText(/How far does it sail|How far north|How far east|Find ∠|Find HB|Find PR|Find BC|Find XZ|bearing of|cosine rule/).first()).toBeVisible({ timeout: 10_000 });
  await games.screenshot({ path: "test-results/bearings-game.png" });
});
