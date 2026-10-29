import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// A teacher and a learner in one class, where the learner's phone clock can be
// set wrong (as a phone set by hand, or to another time zone, often is).
async function openClass(browser: Browser, learnerClockAheadMs = 0) {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    if (who === "learner" && learnerClockAheadMs) {
      await ctx.addInitScript((ahead) => { const real = Date.now.bind(Date); Date.now = () => real() + ahead; }, learnerClockAheadMs);
    }
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

test("the class timer counts down on a learner's phone whose clock is 5 minutes fast", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, 5 * 60_000);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: /^Timer/ }).click();
  await teacher.getByRole("timer").getByRole("button", { name: "Start" }).click();

  const timer = learner.getByRole("timer");
  await expect(timer).toBeVisible({ timeout: 20_000 });
  await learner.waitForTimeout(2500);
  await expect(timer).not.toContainText("Time's up");
  await expect(timer).toContainText(/0:5\d|1:00/);
});

test("learners can type their answer on an answer board", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("Solve 3x = 12");
  await panel.getByRole("button", { name: "Typing only" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();

  const box = learner.getByLabel("Type your answer");
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText("Solve 3x = 12")).toBeVisible();
  await box.fill("x = 4, because 3 × 4 = 12");
  await expect(panel.getByText("x = 4, because 3 × 4 = 12")).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/1 of 1 answered/)).toBeVisible();
});

test("with 'drawing or typing', a learner can switch between the two", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByRole("button", { name: "Send to learners" }).click(); // "Drawing or typing" is the default
  await expect(learner.getByRole("tab", { name: /Draw/ })).toBeVisible({ timeout: 20_000 });
  await learner.getByRole("tab", { name: /Type/ }).click();
  await learner.getByLabel("Type your answer").fill("Half");
  await expect(panel.getByText("Half", { exact: true })).toBeVisible({ timeout: 20_000 });
});

test("an exercise keeps going when the teacher leaves full screen", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Full screen" }).click();
  await expect(teacher.getByRole("button", { name: "Exit full screen" })).toBeVisible();
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("What is 7 × 8?");
  await panel.getByRole("button", { name: "Typing only" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await learner.getByLabel("Type your answer").fill("56");
  await expect(panel.getByText("56", { exact: true })).toBeVisible({ timeout: 20_000 });

  // Out of full screen (hide the panel first, as a teacher would): the round and the answer are still there.
  await panel.getByRole("button", { name: /Hide — answers keep coming in/ }).click();
  await teacher.getByRole("button", { name: "Exit full screen" }).click();
  await expect(teacher.getByRole("button", { name: "Full screen" })).toBeVisible();
  await teacher.getByRole("button", { name: /Answers \(1\)/ }).click();
  const after = teacher.getByRole("dialog", { name: "Answer boards" });
  await expect(after.getByText(/What is 7 × 8\?/)).toBeVisible();
  await expect(after.getByText("56", { exact: true })).toBeVisible();
  // …and the learner is still answering the same question.
  await expect(learner.getByLabel("Type your answer")).toHaveValue("56");

  // Straight back into full screen with the panel open: still there.
  await after.getByRole("button", { name: /Hide — answers keep coming in/ }).click();
  await teacher.getByRole("button", { name: "Full screen" }).click();
  await expect(teacher.getByRole("button", { name: /Answers \(1\)/ })).toBeVisible();
});
