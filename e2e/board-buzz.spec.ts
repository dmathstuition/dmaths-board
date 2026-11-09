import { test, expect } from "@playwright/test";
import { GID, SID, agree, classServer, realtimeHub } from "./helpers";

// The buzzer and rewards: the teacher opens a buzzer round, a learner buzzes
// in, the teacher sees who was first and rewards them — the learner's screen
// celebrates, and the reward is saved as a star.
test("buzz in first, then get a reward", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const saved: unknown[] = [];
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/board/rewards**", async (r) => {
      if (r.request().method() === "POST") saved.push(r.request().postDataJSON());
      return r.fulfill({ json: { ok: true, counts: { [GID]: saved.length } } });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");

  await teacher.getByRole("button", { name: "Buzzer" }).click();
  const panel = teacher.getByRole("dialog", { name: "Buzzer" });
  await panel.getByPlaceholder(/What is 7/).fill("What is 7 × 8?");
  await panel.getByRole("button", { name: "Open the buzzer" }).click();

  const buzzer = learner.getByRole("region", { name: "Buzzer" });
  await expect(buzzer.getByText("What is 7 × 8?")).toBeVisible({ timeout: 20_000 });
  await buzzer.getByRole("button", { name: "Buzz" }).click();
  await expect(buzzer.getByRole("button", { name: "Buzz" })).toBeDisabled();

  await expect(panel.getByRole("list", { name: "Who buzzed" }).getByText("Emmanuel")).toBeVisible({ timeout: 20_000 });
  await expect(buzzer.getByText("You were first!")).toBeVisible({ timeout: 20_000 });

  await panel.getByRole("button", { name: "Reward Emmanuel" }).click();
  await expect(learner.getByText("You got a reward!")).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText("First to buzz")).toBeVisible();
  expect(saved).toEqual([{ sessionId: SID, to: [GID], reason: "First to buzz" }]);

  // Rewards from their own panel: the whole class.
  await panel.getByRole("button", { name: "End" }).click();
  await expect(buzzer).toBeHidden({ timeout: 20_000 });
  await teacher.getByRole("button", { name: "Rewards" }).click();
  const rewards = teacher.getByRole("dialog", { name: "Rewards" });
  await rewards.getByRole("button", { name: "Hard work" }).click();
  await rewards.getByRole("button", { name: /Whole class/ }).click();
  await expect(learner.getByText("Well done, everyone!")).toBeVisible({ timeout: 20_000 });
  await expect(rewards.getByText("🏆 2")).toBeVisible();
});
