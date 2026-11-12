import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { GID, SID, agree, classServer, realtimeHub } from "./helpers";
import { nextPatch, viewFor, type AnswerRow, type QuizRow } from "../lib/liveQuiz";

// Live quiz game styles: tug of war, boss battle, race and team battle. One
// real learner (on a phone) plus three classmates whose answers the pretend
// server fills in at each reveal.
const SHOTS = process.env.QUIZGAME_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(2600); await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); } };
const CROWD = ["crowd-0", "crowd-1", "crowd-2"]; // Learner 1, 2 and 3

function quizServer() {
  let n = 0;
  const fresh = (): QuizRow => ({ id: `quiz-${++n}`, title: "Quick sums", status: "lobby", current: -1, started_at: null, created_at: new Date().toISOString(), questions: [
    { q: "2 + 2 = ?", options: ["4", "5", "6", "7"], answer: 0, seconds: 60 },
    { q: "3 × 3 = ?", options: ["6", "9", "12", "8"], answer: 1, seconds: 60 },
  ] });
  let quiz = fresh(), answers: AnswerRow[] = [];
  const names = new Map([[GID, "Emmanuel"], ...CROWD.map((id, i) => [id, `Learner ${i + 1}`] as [string, string])]);
  // Learner 1 is always right, Learner 2 always wrong, Learner 3 right on the first question only.
  const crowd = (idx: number) => {
    const right = [true, false, idx % 2 === 0];
    CROWD.forEach((id, i) => { if (!answers.some((a) => a.idx === idx && a.student_id === id)) answers.push({ idx, student_id: id, choice: right[i] ? quiz.questions[idx].answer : 3, correct: right[i], ms: 2000, points: right[i] ? [700, 0, 600][i] : 0 }); });
  };
  return async (ctx: BrowserContext, who: "teacher" | "learner") => {
    const viewer = who === "teacher" ? { host: true, id: "h" } : { host: false, id: GID };
    await ctx.route("**/api/live-quiz**", async (r) => {
      if (r.request().method() === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}"), now = new Date().toISOString();
        if (b.action === "launch") { quiz = fresh(); answers = []; }
        if (b.action === "answer" && !answers.some((a) => a.idx === b.idx && a.student_id === GID)) answers.push({ idx: b.idx, student_id: GID, choice: b.choice, correct: b.choice === quiz.questions[b.idx].answer, ms: 1500, points: b.choice === quiz.questions[b.idx].answer ? 900 : 0 });
        if (b.action === "next") Object.assign(quiz, nextPatch(quiz, now) ?? {});
        if (b.action === "reveal" && quiz.status === "question") { crowd(quiz.current); quiz.status = "reveal"; }
        if (b.action === "end") { if (quiz.status === "question") crowd(quiz.current); Object.assign(quiz, { status: "ended", ended_at: now }); }
      }
      return r.fulfill({ json: { quiz: viewFor(quiz, answers, names, viewer, 4), serverNow: Date.now() } });
    });
  };
}

test("tug of war, boss battle, race and team battle on the live quiz", async ({ browser }) => {
  test.setTimeout(240_000);
  const hub = realtimeHub(), server = classServer(3), quiz = quizServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "teacher" ? { viewport: { width: 1280, height: 900 }, deviceScaleFactor: SHOTS ? 1.5 : 1 } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await quiz(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  teacher.on("dialog", (d) => d.accept());
  await teacher.getByRole("tab", { name: /Live quiz/ }).click().catch(() => {});
  const style = teacher.getByRole("radiogroup", { name: "Game style" });

  // One question: the learner answers, the teacher shows the answer, then the game.
  const play = async (q: number, tap: string, step: string, shotName?: string) => {
    await expect(learner.getByRole("button", { name: new RegExp(`: ${tap}$`) })).toBeVisible({ timeout: 20_000 });
    if (shotName) { await shot(teacher, `${shotName}-question`); await shot(learner, `${shotName}-question-phone`); }
    await learner.getByRole("button", { name: new RegExp(`: ${tap}$`) }).click();
    await expect(learner.getByText("Answer locked in")).toBeVisible({ timeout: 20_000 });
    await teacher.getByRole("button", { name: "Skip timer" }).click();
    await expect(learner.getByText("Correct!")).toBeVisible({ timeout: 20_000 });
    if (shotName) await shot(learner, `${shotName}-phone`);
    await teacher.getByRole("button", { name: step }).click();
  };
  const launchAnother = async () => {
    await teacher.getByRole("button", { name: "Play another quiz" }).click();
    await teacher.getByRole("button", { name: /Ready-made quizzes/ }).click();
    await teacher.getByRole("button", { name: "Launch", exact: true }).first().click();
    await expect(style).toBeVisible({ timeout: 20_000 });
  };

  // ── Tug of war: Red is Emmanuel and Learner 2; Blue is Learners 1 and 3 ──
  await expect(style).toBeVisible({ timeout: 20_000 });
  await style.getByRole("radio", { name: /Tug of war/ }).click();
  await expect(teacher.getByRole("region", { name: "Team Red" })).toContainText("Emmanuel");
  await expect(teacher.getByRole("region", { name: "Team Red" })).toContainText("Learner 2");
  await expect(teacher.getByRole("region", { name: "Team Blue" })).toContainText("Learner 1");
  await expect(learner.getByText("🔴 Team Red").first()).toBeVisible({ timeout: 20_000 }); // the learner knows their team before it starts
  await shot(teacher, "tug-lobby");
  await shot(learner, "tug-lobby-phone");
  await expect(teacher.getByLabel("How to play")).toContainText("Two teams, one rope");
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  // The question is a stage of the story, with the live rope while they answer.
  await expect(teacher.getByLabel("Round 1 of 2: Take the strain")).toBeVisible({ timeout: 20_000 });
  await expect(teacher.getByLabel(/^Rope: level/)).toBeVisible();
  await expect(learner.getByLabel("Round 1 of 2: Take the strain")).toBeVisible({ timeout: 20_000 });
  await play(0, "4", "Pull! →", "tug");
  await expect(learner.getByText("Your team heaves! 💪")).toBeVisible();
  const tug = teacher.getByRole("img", { name: /^Tug of war after 1 of 2 questions/ });
  await expect(tug).toHaveAccessibleName(/Team Blue is pulling ahead/, { timeout: 20_000 });
  await shot(teacher, "tug");
  await teacher.getByRole("button", { name: "Next question →" }).click();
  await expect(teacher.getByLabel("Round 2 of 2: Final pull! 🪢")).toBeVisible({ timeout: 20_000 });
  await expect(teacher.getByLabel(/^Rope: Team Blue is ahead/)).toBeVisible();
  await play(1, "9", "Podium 🏆");
  await expect(teacher.getByText("Team Blue wins the tug of war!")).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText("Team Blue won the tug of war this time")).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "tug-end");

  // ── Boss battle ──
  await launchAnother();
  await style.getByRole("radio", { name: /Boss battle/ }).click();
  await expect(learner.getByText("Boss battle")).toBeVisible({ timeout: 20_000 });
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  await expect(teacher.getByLabel("The Number Dragon: 100 health; 3 hearts left")).toBeVisible({ timeout: 20_000 });
  await play(0, "4", "Fight the boss! →", "boss");
  await expect(learner.getByText("You struck the dragon! 💥")).toBeVisible();
  // Three of four were right: 54 damage, and no heart lost.
  await expect(teacher.getByRole("img", { name: "Boss battle after 1 of 2 questions: the Number Dragon has 46 health; the class has 3 hearts left" })).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByRole("img", { name: /the Number Dragon has 46 health/ })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "boss");
  await teacher.getByRole("button", { name: "End quiz" }).click();
  await expect(teacher.getByText(/The Number Dragon got away/).first()).toBeVisible({ timeout: 20_000 });

  // ── Race ──
  await launchAnother();
  await style.getByRole("radio", { name: /Race/ }).click();
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  await play(0, "4", "Race on! →", "race");
  const race = teacher.getByRole("region", { name: "Race" });
  await expect(race.getByRole("listitem").first()).toHaveAccessibleName("Emmanuel: 1st place, 45% of the way", { timeout: 20_000 });
  await expect(race.getByRole("listitem", { name: /^Learner 1: 2nd place/ })).toBeVisible();
  await expect(learner.getByRole("region", { name: "Race" }).getByRole("listitem", { name: /^Emmanuel: 1st place/ })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "race");
  await teacher.getByRole("button", { name: "End quiz" }).click();

  // ── Space race ──
  await launchAnother();
  await style.getByRole("radio", { name: /Space race/ }).click();
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  await play(0, "4", "Blast off! →", "space");
  const space = teacher.getByRole("region", { name: "Space race" });
  await expect(space.getByRole("listitem").first()).toHaveAccessibleName("Emmanuel: 1st place, 45% of the way to the stars", { timeout: 20_000 });
  await expect(learner.getByRole("region", { name: "Space race" }).getByRole("listitem", { name: /^Emmanuel: 1st place/ })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "space");
  await teacher.getByRole("button", { name: "Next question →" }).click();
  await expect(teacher.getByLabel("Stage 2 of 2: Final approach to the stars ⭐")).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByLabel("Your game")).toContainText("You: 1st of 4", { timeout: 20_000 });
  await play(1, "9", "Podium 🏆", "space2");
  await expect(teacher.getByText("Emmanuel reaches the stars first! 🚀")).toBeVisible({ timeout: 20_000 });

  // ── Treasure hunt ──
  await launchAnother();
  await style.getByRole("radio", { name: /Treasure hunt/ }).click();
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  await expect(teacher.getByLabel("Island 1 of 2: Parrot Bay")).toBeVisible({ timeout: 20_000 });
  await play(0, "4", "Open the chests! →", "treasure");
  await expect(learner.getByText("Chest unlocked! 💰")).toBeVisible();
  const hunt = teacher.getByRole("region", { name: "Treasure hunt" });
  await expect(hunt.getByRole("listitem", { name: /^Learner 2: 4th place, 0 gold, last chest: Empty chest$/ })).toBeVisible({ timeout: 20_000 });
  await expect(hunt.getByRole("listitem", { name: /^Emmanuel: \d(st|nd|rd|th) place, \d+ gold, last chest: / })).toBeVisible();
  await expect(learner.getByLabel("Your chest")).toContainText("gold", { timeout: 20_000 });
  await shot(teacher, "treasure");
  await shot(learner, "treasure-phone");
  await teacher.getByRole("button", { name: "End quiz" }).click();
  await expect(teacher.getByText(/found the most treasure/).first()).toBeVisible({ timeout: 20_000 });

  // ── Team battle ──
  await launchAnother();
  await style.getByRole("radio", { name: /Team battle/ }).click();
  await teacher.getByRole("button", { name: "▶ Start" }).click();
  await play(0, "4", "Attack! →", "battle");
  await expect(teacher.getByRole("img", { name: /^Team battle after 1 of 2 questions: Team Red has 41 health, Team Blue has 59 health$/ })).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByRole("img", { name: /Team Red has 41 health/ })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "battle");
  await teacher.getByRole("button", { name: "End quiz" }).click();
  await expect(teacher.getByText("Team Blue wins the battle!")).toBeVisible({ timeout: 20_000 });
});
