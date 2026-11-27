import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub, GID } from "./helpers";

// A new game format (boss fight) goes out to a learner's phone, and the teacher
// watches that learner play: live scoreboard, then the learner's own game.
test("the teacher watches a learner play a boss fight, and sees their scores", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who); await server.attach(ctx, who);
    await ctx.route("**/api/board/stars**", (r) => r.fulfill({ json: { rounds: [
      { student_id: GID, name: "Emmanuel", game_id: "times-blitz", difficulty: "easy", score: 120, correct: 9, attempts: 10, created_at: new Date().toISOString() },
    ] } }));
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.getByRole("button", { name: "Games and quizzes" }).click();
  const panel = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await panel.getByRole("button", { name: /Times Table Dragon/ }).click();
  await panel.getByLabel("Let learners play").check();

  const game = learner.getByRole("dialog", { name: "Game: Times Table Dragon" });
  await expect(game).toBeVisible({ timeout: 20_000 });
  await game.getByRole("button", { name: /Let.s play/ }).click();
  await expect(game.getByRole("button").first()).toBeVisible({ timeout: 15_000 });
  await game.screenshot({ path: "test-results/boss-learner.png" });

  await panel.getByRole("button", { name: /Watch learners play/ }).click();
  const watch = teacher.getByRole("complementary", { name: "Learners playing" });
  await expect(watch.getByRole("table", { name: "Live scores" }).getByText("Emmanuel")).toBeVisible({ timeout: 30_000 });
  await watch.getByRole("button", { name: "Watch Emmanuel play" }).click();
  const on = watch.getByLabel("On their screen now");
  await expect(on).toBeVisible();
  await expect(on.locator("p.font-display")).toBeVisible({ timeout: 30_000 });
  await teacher.screenshot({ path: "test-results/boss-watch.png" });

  // Their saved rounds are on the Scores tab.
  await watch.getByRole("button", { name: /Everyone/ }).click();
  await watch.getByRole("tab", { name: "Scores" }).click();
  await expect(watch.getByRole("table", { name: "Saved scores" }).getByText("Emmanuel")).toBeVisible();
});

test("a quiz can be made from any skill", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  let launched: any = null;
  const ctx = await browser.newContext();
  await hub.attach(ctx, "teacher"); await server.attach(ctx, "teacher");
  await ctx.route("**/api/live-quiz", (r) => { if (r.request().method() === "POST") { const b = JSON.parse(r.request().postData() ?? "{}"); if (b.action === "launch") launched = b; } return r.fulfill({ json: { quiz: null } }); });
  const t = await ctx.newPage();
  await t.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(t);
  await t.getByRole("button", { name: "Games and quizzes" }).click();
  const panel = t.getByRole("dialog", { name: "Games and quizzes" });
  await panel.getByRole("tab", { name: /Ready-made quizzes/ }).click();
  await panel.getByLabel("Questions").selectOption("5");
  await panel.getByRole("button", { name: "Launch live quiz" }).click();
  await expect(panel).toBeHidden({ timeout: 20_000 });
  expect(launched.questions).toHaveLength(5);
  for (const q of launched.questions) expect(q.options.length).toBeGreaterThanOrEqual(2);
});
