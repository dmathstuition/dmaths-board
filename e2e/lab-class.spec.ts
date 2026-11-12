import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// A practical lesson like a real lab: the teacher shows how (learners watch the
// teacher's bench live), gives the task, then each learner does it on their
// own phone and writes what they see — while the teacher follows each one and
// sends help.
const SHOTS = process.env.LAB_SHOTS;

test("watch the teacher, then your turn: the task, observations, and help from the teacher", async ({ browser }) => {
  test.setTimeout(180_000);
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
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
  await lab.getByPlaceholder(/Search/).fill("titration");
  await lab.getByRole("button", { name: /Acid–Alkali Titration/ }).click();
  await expect(lab.getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });

  // 1. Watch me: the learner's phone shows the teacher's bench, live — nothing to press.
  await lab.getByRole("button", { name: "👀 Watch me" }).click();
  const mine = learner.getByRole("dialog", { name: /Experiment: Acid–Alkali Titration/ });
  await expect(mine.getByRole("status", { name: "Watch your teacher" })).toBeVisible({ timeout: 30_000 });
  await expect(mine.getByRole("group", { name: /Lab bench/ })).toBeVisible({ timeout: 30_000 });
  await expect(mine.getByText(/Step 1 of \d+ · your teacher is doing it/)).toBeVisible();
  await expect(mine.getByRole("button", { name: "Restart" })).toHaveCount(0);
  await expect(mine.getByRole("button", { name: "Do this step for me" })).toHaveCount(0);
  await lab.getByRole("button", { name: "Do this step for me" }).click();
  await expect(mine.getByText(/Step 2 of \d+ · your teacher is doing it/)).toBeVisible({ timeout: 20_000 });
  await expect(mine.getByText("What happened:")).toBeVisible();
  if (SHOTS) await learner.screenshot({ path: `${SHOTS}/class-watch.png` });

  // 2. Their turn, with a task.
  await lab.getByRole("button", { name: "✋ Their turn" }).click();
  const task = lab.getByRole("form", { name: "Task for learners" });
  await task.getByRole("textbox").fill("Write an observation after each step, with units.");
  await task.getByRole("button", { name: "Give the task" }).click();
  await expect(mine.getByRole("status", { name: "Your task" })).toContainText("Write an observation after each step", { timeout: 20_000 });
  await expect(mine.getByText(/^Step 1 of \d+$/)).toBeVisible({ timeout: 20_000 });

  // The learner does step 1 themselves: pick up, then put it in place.
  await mine.getByRole("button", { name: /^Pick up the/ }).click();
  await mine.getByRole("button", { name: /^Put it on the/ }).dispatchEvent("click"); // a tall, thin target: tapped where it is
  // Then writes what they saw before going on — and is shown how to make it better.
  const write = mine.getByRole("region", { name: "Record your observation" });
  await expect(write).toBeVisible({ timeout: 20_000 });
  await write.getByRole("textbox", { name: "My observation" }).fill("It changed");
  await write.getByRole("button", { name: "Save my observation" }).click();
  const told = mine.getByRole("region", { name: "Your observation" });
  await expect(told).toContainText(/from and to/);
  await expect(told).toContainText("The notebook says:");
  await expect(mine.getByText(/^Step 2 of \d+$/)).toBeVisible();
  if (SHOTS) await learner.screenshot({ path: `${SHOTS}/class-observe.png` });

  // 3. The teacher follows them: their observation, and a word of help.
  await lab.getByRole("button", { name: /Learners' progress/ }).click();
  const tracker = lab.getByRole("region", { name: "Learners' progress" });
  await expect(tracker.getByText(/📝 1 observation · 1 to improve/)).toBeVisible({ timeout: 20_000 });
  await tracker.getByRole("button", { expanded: false }).first().click();
  await expect(tracker.getByText(/It changed/)).toBeVisible();
  await tracker.getByRole("textbox", { name: /Message to/ }).fill("Say what colour it changed from and to.");
  await tracker.getByRole("button", { name: "Send", exact: true }).click();
  if (SHOTS) await teacher.screenshot({ path: `${SHOTS}/class-tracker.png` });
  const help = mine.getByRole("status", { name: "From your teacher" });
  await expect(help).toContainText("Say what colour it changed from and to.", { timeout: 20_000 });
  await help.getByRole("button", { name: "OK" }).click();
  await expect(help).toHaveCount(0);

  // More observations can be written in the notebook any time.
  await mine.getByRole("tab", { name: /Observations/ }).click();
  await mine.getByRole("textbox", { name: "New observation" }).fill("The solution in the flask was colourless.");
  await mine.getByRole("button", { name: "Add it" }).click();
  await expect(mine.getByText("The solution in the flask was colourless.")).toBeVisible();
  await expect(mine.getByRole("tab", { name: "Observations · 2" })).toBeVisible();

  // Showing again keeps the learner's own work.
  await lab.getByRole("button", { name: "👀 Watch me" }).click();
  await expect(mine.getByRole("status", { name: "Watch your teacher" })).toBeVisible({ timeout: 20_000 });
  await lab.getByRole("button", { name: "✋ Their turn" }).click();
  await expect(mine.getByRole("tab", { name: "Observations · 2" })).toBeVisible({ timeout: 20_000 });
});
