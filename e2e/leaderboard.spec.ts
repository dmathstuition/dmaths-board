import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { leaderboard, type StarRows } from "../lib/stars";

// The leaderboard: the teacher opens it, puts it on everyone's screen, and the
// learner sees it with their own name picked out. A learner's game round is
// sent in for their stars.
const rows: StarRows = {
  sessions: [{ id: "s1", at: "" }, { id: SID, at: "" }],
  guests: [{ id: "g1", session_id: "s1", name: "Emmanuel" }, { id: "g2", session_id: SID, name: "Emmanuel" }, { id: "g3", session_id: SID, name: "Zainab" }],
  marks: [], exams: [{ session_id: SID, student_id: "g3", name: "Zainab", score: 9, total: 10 }],
  quiz: Array.from({ length: 6 }, () => ({ session_id: "s1", student_id: "g1", correct: true })),
  games: [],
};

test("the leaderboard goes on everyone's screen; game rounds count for stars", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const posted: any[] = [];
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who); await server.attach(ctx, who);
    await ctx.route("**/api/board/stars**", (r) => {
      if (r.request().method() === "POST") { posted.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { ok: true } }); }
      const scope = new URL(r.request().url()).searchParams.get("scope");
      return r.fulfill({ json: { list: leaderboard(scope === "class" ? { ...rows, guests: rows.guests.filter((g) => g.session_id === SID), quiz: [] } : rows, SID), classes: 2 } });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);

  await teacher.getByRole("button", { name: "Leaderboard" }).click();
  const lb = teacher.getByRole("dialog", { name: "Leaderboard" });
  await expect(lb.getByText("Emmanuel")).toBeVisible();
  await expect(lb.getByText("⭐ 8")).toBeVisible(); // 2 classes + 6 quiz answers
  await expect(lb.getByText("⭐ 5")).toBeVisible(); // Zainab: came + 4 for 90%
  await lb.getByRole("tab", { name: "This class" }).click();
  await expect(lb.getByText("Zainab")).toBeVisible();
  await lb.screenshot({ path: "test-results/leaderboard-teacher.png" });
  await lb.getByRole("tab", { name: "All my classes" }).click();
  await lb.getByRole("button", { name: "Show on everyone’s screen" }).click();

  const card = learner.getByRole("dialog", { name: "Class leaderboard" });
  await expect(card.getByText("Emmanuel (you)")).toBeVisible({ timeout: 20_000 });
  await learner.screenshot({ path: "test-results/leaderboard-learner.png" });
  await lb.getByRole("button", { name: "Stop showing" }).click();
  await expect(card).toBeHidden({ timeout: 20_000 });

  // A game sent to phones: a finished round is sent in for stars.
  await lb.getByRole("button", { name: "Close the leaderboard" }).click();
  await teacher.getByRole("button", { name: "Games and quizzes" }).click();
  const games = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await games.getByRole("button", { name: /Upper secondary/ }).click();
  await games.getByRole("button", { name: /Surd Smash/ }).click();
  await games.getByLabel("Let learners play").check();
  const game = learner.getByRole("dialog", { name: "Game: Surd Smash" });
  await expect(game).toBeVisible({ timeout: 20_000 });
  await game.getByRole("button", { name: /Let.s play/ }).click();
  await expect(game.getByText(/Simplify|Rationalise/).first()).toBeVisible({ timeout: 15_000 });
  await learner.keyboard.press("1");
  // Finish the round early by running its clock out.
  await learner.evaluate(() => { const real = Date.now; Date.now = () => real() + 200_000; });
  await expect.poll(() => posted.length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(posted[0]).toMatchObject({ sessionId: SID, gameId: "surd-smash", difficulty: "easy" });
});
