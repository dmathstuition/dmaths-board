import crypto from "node:crypto";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { GID, SID, agree, classServer, realtimeHub } from "./helpers";
import { viewFor, type AnswerRow, type QuizRow } from "../lib/liveQuiz";

// Learner tools: ask the teacher privately, easier reading, the confidence
// check (live quiz and class work), Fix my mistakes and flashcards.

// A live quiz on a tiny server: one question, answered by the learner.
function quizServer() {
  const quiz: QuizRow = { id: "q-1", title: "Bearings", status: "question", current: 0, started_at: new Date().toISOString(), created_at: new Date().toISOString(),
    questions: [{ q: "The bearing of B from A is 065°. Find the bearing of A from B.", options: ["245°", "115°", "295°", "065°"], answer: 0, seconds: 60 }] };
  const answers: AnswerRow[] = [];
  return async (ctx: BrowserContext, who: "teacher" | "learner") => {
    const viewer = who === "teacher" ? { host: true, id: "h" } : { host: false, id: GID };
    await ctx.route("**/api/live-quiz**", async (r) => {
      if (r.request().method() === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}");
        if (b.action === "answer") answers.push({ idx: b.idx, student_id: GID, choice: b.choice, correct: b.choice === quiz.questions[b.idx].answer, ms: 1000, points: 900 });
        if (b.action === "reveal") quiz.status = "reveal";
      }
      return r.fulfill({ json: { quiz: viewFor(quiz, answers, new Map([[GID, "Emmanuel"]]), viewer, 1), serverNow: Date.now() } });
    });
  };
}

async function openClass(browser: Browser, withQuiz = false) {
  const hub = realtimeHub(), server = classServer(), quiz = withQuiz ? quizServer() : null;
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    if (quiz) await quiz(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    if (!withQuiz) await expect(page.locator("canvas").first()).toBeVisible(); // a running quiz takes over both screens
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);
  return { teacher, learner, hub };
}

test("ask the teacher privately: only the teacher sees it; a private reply, then shown to the class without a name", async ({ browser }) => {
  const { teacher, learner, hub } = await openClass(browser);
  await learner.getByRole("button", { name: "Ask my teacher privately" }).click();
  const ask = learner.getByRole("dialog", { name: "Ask your teacher privately" });
  await ask.getByLabel("Your question").fill("Why do we add 180° for a back bearing?");
  await ask.getByRole("button", { name: "Send to my teacher" }).click();
  await expect(ask.getByText("✓ Your teacher has it")).toBeVisible({ timeout: 15_000 });
  expect(hub.stats.events.get("ask") ?? 0).toBe(0); // never sent to every screen
  await ask.getByRole("button", { name: "Close" }).click();

  await expect(teacher.getByRole("button", { name: "Private questions, 1 waiting" })).toBeVisible({ timeout: 15_000 });
  await teacher.getByRole("button", { name: /Private questions/ }).click();
  const inbox = teacher.getByRole("dialog", { name: "Private questions" });
  await expect(inbox.getByText("Why do we add 180° for a back bearing?")).toBeVisible();
  await expect(inbox.getByText(/^Emmanuel ·/)).toBeVisible();
  await inbox.getByLabel("Reply to Emmanuel").fill("The north lines are parallel, so turning round is a half-turn: 180°.");
  await inbox.getByRole("button", { name: /Reply privately to Emmanuel/ }).click();
  const note = learner.getByRole("status").filter({ hasText: "Your teacher replied" });
  await expect(note.getByText(/half-turn: 180°/)).toBeVisible({ timeout: 15_000 });
  await inbox.screenshot({ path: "test-results/ask-teacher.png" });

  await inbox.getByRole("button", { name: /Show to class \(no name\) with answer/ }).click();
  const shown = learner.getByRole("dialog", { name: "A question from the class" });
  await expect(shown.getByText("Why do we add 180° for a back bearing?")).toBeVisible({ timeout: 15_000 });
  await expect(shown.getByText("Emmanuel")).toHaveCount(0);
  await inbox.getByRole("button", { name: "Stop showing" }).click();
  await expect(shown).toBeHidden({ timeout: 15_000 });
});

test("easier to read: bigger text and the easy-read font, kept on this phone", async ({ browser }) => {
  const { learner } = await openClass(browser);
  await learner.getByRole("button", { name: /Reading settings/ }).first().click();
  const panel = learner.getByRole("dialog", { name: "Reading settings" });
  await panel.getByRole("radio", { name: "A++" }).click();
  await panel.getByText("Easy-read font").click();
  await expect(learner.locator("html")).toHaveAttribute("data-text-size", "3");
  await expect(learner.locator("html")).toHaveAttribute("data-easy-read", "1");
  expect(await learner.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/Atkinson|easy/i);
  await learner.screenshot({ path: "test-results/reading-big.png" });
  await learner.reload({ waitUntil: "networkidle" });
  await expect(learner.locator("html")).toHaveAttribute("data-text-size", "3");
});

test("confidence check in a live quiz: the teacher sees who was sure but wrong", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, true);
  await teacher.getByRole("tab", { name: /Live quiz/ }).click();
  await learner.getByRole("button", { name: /115°/ }).click();
  await expect(learner.getByText("Answer locked in")).toBeVisible({ timeout: 15_000 });
  await learner.getByRole("button", { name: "😎 Sure" }).click();
  await teacher.getByRole("button", { name: "Skip timer" }).click();
  const panel = teacher.getByRole("region", { name: "Confidence check" });
  await expect(panel.getByText("Sure but wrong")).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText("Emmanuel")).toBeVisible();
  await panel.screenshot({ path: "test-results/quiz-confidence.png" });
});

test("confidence check in class work: the badge, then 'sure but wrong' once it's marked", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.context().route("**/api/live-sessions/results", (r) => r.fulfill({ json: { ok: true } }));
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("Expand 3(x + 4)");
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await learner.getByRole("tab", { name: /Type/ }).click({ timeout: 20_000 });
  await learner.getByLabel("Type your answer").fill("3x + 4");
  await learner.getByRole("button", { name: "😎 Sure" }).click();
  await learner.getByRole("button", { name: /Hand in my work/ }).click();
  await expect(panel.getByLabel("Sure", { exact: true })).toBeVisible({ timeout: 20_000 });
  await panel.getByRole("button", { name: "Mark Learner A wrong" }).first().click();
  await expect(panel.getByText(/Sure but wrong: Learner A/)).toBeVisible({ timeout: 10_000 }); // names stay hidden when "Hide names" is on
});

// The learner's results link, signed as the test server signs it.
function resultsToken() {
  const b64 = (s: string) => Buffer.from(s).toString("base64url");
  const body = b64(JSON.stringify({ s: SID, g: GID, c: "", h: "" }));
  return `${body}.${crypto.createHmac("sha256", "e2e-placeholder").update(`class-report:${body}`).digest("base64url").slice(0, 32)}`;
}

test("fix my mistakes: try again, see the working, earn stars; then flashcards", async ({ page }) => {
  const posted: any[] = [];
  await page.route("**/api/study**", async (r) => {
    if (r.request().method() === "POST") { posted.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { ok: true, stars: 1 } }); }
    if (new URL(r.request().url()).searchParams.get("what") === "cards") return r.fulfill({ json: { title: "Bearings", ai: true, cards: [
      { front: "Bearings are measured from…", back: "North, clockwise, with three figures", tag: "Key fact" },
      { front: "Back bearing of 065°?", back: "245° (add 180°)", tag: "Practice" },
    ] } });
    return r.fulfill({ json: { learner: "Emmanuel", title: "Bearings", missed: 1, ai: true, items: [
      { q: "The bearing of B from A is 065°. Find the bearing of A from B.", options: ["115°", "245°", "295°", "065°"], answer: 1, working: ["Under 180°, so add 180°", "065° + 180° = 245°"], from: "Quiz Q1", kind: "retry" },
      { q: "The bearing of Q from P is 120°. Find the bearing of P from Q.", options: ["300°", "060°", "240°", "120°"], answer: 0, working: ["120° + 180° = 300°"], from: "Like Quiz Q1", kind: "similar" },
    ] } });
  });
  const t = encodeURIComponent(resultsToken());
  await page.goto(`/practice?t=${t}`);
  await expect(page.getByText(/1 of 2 · Try again — Quiz Q1/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("radio", { name: /115°/ }).click();
  await expect(page.getByText("Not quite — the answer is B: 245°")).toBeVisible();
  await expect(page.getByText("065° + 180° = 245°")).toBeVisible();
  await page.screenshot({ path: "test-results/practice.png", fullPage: true });
  await page.getByRole("button", { name: "Next question →" }).click();
  await page.getByRole("radio", { name: /300°/ }).click();
  await expect(page.getByText("✓ Right!")).toBeVisible();
  await page.getByRole("button", { name: "See my score" }).click();
  await expect(page.getByText("1 of 2 right")).toBeVisible();
  await expect(page.getByText(/⭐ \+1 star/)).toBeVisible();
  expect(posted).toEqual([{ t: decodeURIComponent(t), right: 1, total: 2 }]);

  await page.getByRole("link", { name: "📇 Flashcards" }).click();
  await expect(page.getByText("Bearings are measured from…")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await expect(page.getByText("North, clockwise, with three figures")).toBeVisible();
  await page.screenshot({ path: "test-results/flashcards.png", fullPage: true });
  await page.getByRole("button", { name: "✓ Got it" }).click();
  await page.getByRole("button", { name: "Turn over", exact: true }).click();
  await page.getByRole("button", { name: "✓ Got it" }).click();
  await expect(page.getByText("You know all 2 cards!")).toBeVisible();
});

test("calculator on the learner's phone in class work, until the teacher switches it off", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("A 6 m ladder makes 60° with the ground. How high does it reach?");
  await expect(panel.getByText("Learners can use a calculator on their phone")).toBeVisible();
  await panel.getByRole("button", { name: "Send to learners" }).click();

  // The learner works it out: 6 × sin 60.
  await learner.getByRole("button", { name: "🧮 Calculator" }).click({ timeout: 20_000 });
  const calc = learner.getByRole("dialog", { name: "Calculator" });
  for (const k of ["6", "Times", "sin", "6", "0", ")", "Equals"]) await calc.getByRole("button", { name: k, exact: true }).click();
  await expect(calc.getByLabel("Answer")).toHaveText("5.1961524227");
  await calc.getByRole("button", { name: "SHIFT" }).click();
  await expect(calc.getByRole("button", { name: "sin⁻¹" })).toBeVisible();
  await calc.screenshot({ path: "test-results/phone-calculator.png" });
  await calc.getByRole("button", { name: "Close the calculator" }).click();

  // Switched off: the button goes.
  await panel.getByLabel("🧮 Calculator").uncheck();
  await expect(learner.getByRole("button", { name: "🧮 Calculator" })).toHaveCount(0, { timeout: 15_000 });
});
