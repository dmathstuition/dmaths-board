import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Games and ready-made (UK curriculum) quizzes on the board.
async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer();
  let launched: any = null;
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/live-quiz", (r) => {
      if (r.request().method() === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}");
        if (b.action === "launch") launched = b;
        return r.fulfill({ json: { quiz: null } });
      }
      return r.fulfill({ json: { quiz: null } });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  return { teacher, learner, launched: () => launched };
}

test("an early-years game plays on the board and on learners' phones", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Games and quizzes" }).click();
  const panel = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await panel.getByRole("button", { name: "Early years (EYFS)" }).click();
  await panel.getByRole("button", { name: /Count to 10/ }).click();
  await expect(panel.getByRole("button", { name: /Let.s play/ })).toBeVisible();

  // Learners get it on their phones…
  await panel.getByLabel("Let learners play").check();
  const game = learner.getByRole("dialog", { name: "Game: Count to 10" });
  await expect(game).toBeVisible({ timeout: 20_000 });
  await game.getByRole("button", { name: /Let.s play/ }).click();
  await expect(game.getByText(/How many|Which number/).first()).toBeVisible({ timeout: 15_000 });
  // …and can go back to the class board, and back to the game.
  await game.getByRole("button", { name: /Back to the class board/ }).first().click();
  await expect(learner.getByRole("button", { name: /Play Count to 10/ })).toBeVisible();

  // The teacher ends it: gone on the board and on the learner's phone.
  await panel.getByRole("button", { name: "Hide games" }).click();
  await teacher.getByRole("button", { name: "End the game" }).click();
  await expect(teacher.getByRole("button", { name: "End the game" })).toHaveCount(0);
  await expect(learner.getByRole("button", { name: /Play Count to 10/ })).toHaveCount(0, { timeout: 20_000 });
});

test("a ready-made quiz launches as a live quiz", async ({ browser }) => {
  const { teacher, launched } = await openClass(browser);
  await teacher.getByRole("button", { name: "Games and quizzes" }).click();
  const panel = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await panel.getByRole("tab", { name: /Ready-made quizzes/ }).click();
  await panel.getByRole("button", { name: "Key Stage 1" }).click();
  await panel.getByRole("button", { name: "Launch Number bonds to 10 as a live quiz" }).click();
  await expect(panel).toBeHidden({ timeout: 20_000 });
  const body = launched();
  expect(body).toMatchObject({ action: "launch", sessionId: SID, title: "Number bonds to 10 (Year 1)" });
  expect(body.questions).toHaveLength(9);
  expect(body.questions[0].options[body.questions[0].answer]).toBe("4"); // 6 + ? = 10
  // The class moves to the live quiz.
  await expect(teacher.getByRole("tab", { name: /Live quiz/ })).toHaveAttribute("aria-selected", "true");
  // The quiz tab lists the ready-made quizzes too.
  await expect(teacher.getByText(/Ready-made quizzes — early years/)).toBeVisible();
});

test("upper-school maths games: the teacher picks one for SSS and learners play it", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Games and quizzes" }).click();
  const panel = teacher.getByRole("dialog", { name: "Games and quizzes" });
  await panel.getByRole("button", { name: /Upper secondary/ }).click();
  const upper = panel.getByRole("region", { name: /Senior secondary/ });
  for (const t of ["Surd Smash", "Integration Island", "Straight-Line Sprint", "Circle Circuit", "Function Machine"]) await expect(upper.getByRole("button", { name: new RegExp(t) })).toBeVisible();
  await panel.screenshot({ path: "test-results/games-upper.png" });
  await panel.getByRole("radio", { name: "hard" }).click();
  await panel.getByRole("button", { name: /Straight-Line Sprint/ }).click();
  await panel.getByLabel("Let learners play").check();

  const game = learner.getByRole("dialog", { name: "Game: Straight-Line Sprint" });
  await expect(game).toBeVisible({ timeout: 20_000 });
  await game.getByRole("button", { name: /Let.s play/ }).click();
  // A straight-line question with answers to pick (1–4 on a keyboard).
  await expect(game.getByText(/gradient|y-axis|lines meet|line with gradient/i).first()).toBeVisible({ timeout: 15_000 });
  await learner.keyboard.press("1");
  await learner.screenshot({ path: "test-results/games-learner.png" });
});
