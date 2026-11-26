import { test, expect, type Page, type Locator } from "@playwright/test";
import { SID, GID, agree, classServer, realtimeHub } from "./helpers";

// An answer-board round, then two things the teacher can do with it:
//   • Adaptive follow-up: the A.I. writes the question at three levels; each
//     learner gets the one that suits how they did.
//   • Swap & mark: learners mark each other's work, without names, against the
//     teacher's answer key; the teacher accepts the peer marks in one tap.
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page | Locator, name: string) => { if (SHOTS) { await (p as Page).waitForTimeout?.(300); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
const BOLA = { id: "88888888-8888-4888-8888-888888888888", name: "Bola" };
const TIERS = {
  easier: { q: "Solve x + 2 = 5", a: "x = 3", w: "Take 2 from both sides" },
  same: { q: "Solve x + 4 = 9", a: "x = 5", w: "Take 4 from both sides" },
  harder: { q: "Solve 3x + 4 = 19", a: "x = 5", w: "Take 4, then divide by 3" },
};

test("follow-up questions by level, then learners swap and mark each other's work", async ({ browser }) => {
  test.setTimeout(240_000);
  const hub = realtimeHub(), server = classServer(0, [BOLA]);
  const asked: any[] = [];
  const open = async (who: "teacher" | "ada" | "bola") => {
    const ctx = await browser.newContext(who === "teacher" ? { viewport: { width: 1366, height: 900 } } : { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
    await hub.attach(ctx, who === "teacher" ? "teacher" : "learner"); await server.attach(ctx, who === "teacher" ? "teacher" : "learner", who === "bola" ? BOLA : undefined);
    await ctx.route("**/api/live-sessions/results", (r) => r.fulfill({ json: { ok: true } }));
    if (who === "teacher") await ctx.route("**/api/quiz-sets", (r) => { asked.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { tiers: TIERS } }); });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), ada = await open("ada"), bola = await open("bola");
  await teacher.waitForTimeout(1500);
  const answer = async (p: Page, text: string) => {
    const mine = p.getByRole("dialog", { name: "Your answer board" });
    await mine.getByRole("tab", { name: "⌨️ Type" }).click();
    await mine.getByLabel("Type your answer").fill(text);
  };

  // ── Round 1: the same question for everyone, marked ──
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("Solve x + 3 = 7");
  await panel.getByRole("button", { name: "2 marks" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await expect(ada.getByText("Solve x + 3 = 7")).toBeVisible({ timeout: 20_000 });
  await expect(bola.getByText("Solve x + 3 = 7")).toBeVisible({ timeout: 20_000 });
  await answer(ada, "x = 4"); await answer(bola, "x = 10");
  await expect(panel.getByText(/2 of 2 answered/)).toBeVisible({ timeout: 20_000 });
  await panel.getByLabel("Hide names").uncheck();
  await panel.getByLabel("Mark for Emmanuel").selectOption("2");
  await panel.getByLabel("Mark for Bola").selectOption("0");

  // ── Adaptive follow-up: harder for Emmanuel (2/2), easier for Bola (0/2) ──
  await panel.getByText("🎯 Follow-up for each learner").click();
  await expect(panel.getByText(/2 of 2 marked/)).toBeVisible();
  await panel.getByRole("button", { name: "✨ Write the 3 follow-ups" }).click();
  expect(asked.find((b) => b.action === "ai-tiers")).toMatchObject({ question: "Solve x + 3 = 7" });
  await expect(panel.getByLabel("Harder question")).toHaveValue(TIERS.harder.q);
  await expect(panel.getByText(/Easier · 1 learner/)).toBeVisible();
  await shot(panel, "adaptive-teacher");
  await panel.getByRole("button", { name: /▶ Send to each learner/ }).click();
  await expect(panel.getByText(/Easier: Bola/)).toBeVisible();
  await expect(panel.getByText(/Harder: Emmanuel/)).toBeVisible();
  await expect(ada.getByText(TIERS.harder.q)).toBeVisible({ timeout: 20_000 });
  await expect(ada.getByText(TIERS.easier.q)).toHaveCount(0);
  await expect(bola.getByText(TIERS.easier.q)).toBeVisible({ timeout: 20_000 });
  await expect(bola.getByText(TIERS.harder.q)).toHaveCount(0);
  await shot(bola, "adaptive-learner-easier");

  // ── Round 2 answers; the teacher's key for each level is beside the question when opening their work ──
  await answer(ada, "x = 5"); await answer(bola, "x = 3");
  await expect(panel.getByText(/2 of 2 answered/)).toBeVisible({ timeout: 20_000 });
  await panel.getByRole("button", { name: "Open Bola's answer" }).click();
  await expect(teacher.getByLabel("Answer key", { exact: true })).toContainText("x = 3");
  await teacher.getByRole("button", { name: "Back to all answers" }).click();

  // ── Swap & mark ──
  await panel.locator("summary", { hasText: "Swap & mark" }).click();
  await expect(panel.getByLabel("Answer key for peer marking")).toHaveValue("x = 5"); // the key from the A.I. for the "same" question
  await panel.getByRole("button", { name: /🔀 Swap & mark \(2\)/ }).click();
  const adaMarks = ada.getByRole("dialog", { name: "Mark a classmate's work" });
  const bolaMarks = bola.getByRole("dialog", { name: "Mark a classmate's work" });
  await expect(adaMarks.getByLabel("Their answer").getByText("x = 3")).toBeVisible({ timeout: 20_000 });   // Emmanuel marks Bola's, without the name
  await expect(bolaMarks.getByLabel("Their answer").getByText("x = 5")).toBeVisible({ timeout: 20_000 });
  await expect(bolaMarks.getByText("✅ Your tutor's answer")).toBeVisible();
  await expect(adaMarks.getByText("Bola")).toHaveCount(0);
  await shot(ada, "peer-learner");
  await adaMarks.getByRole("button", { name: "0 out of 2" }).click();             // Bola's x = 3 is wrong
  await adaMarks.getByLabel("A short comment (optional)").fill("check the 4");
  await adaMarks.getByRole("button", { name: "Send my mark" }).click();
  await expect(adaMarks.getByText(/✓ Sent 0 \/ 2/)).toBeVisible();
  await bolaMarks.getByRole("button", { name: "2 out of 2" }).click();             // Emmanuel's x = 5 is right
  await bolaMarks.getByRole("button", { name: "Send my mark" }).click();

  // The teacher sees both, beside their own marks (none yet for this round).
  await expect(panel.getByText("2 of 2 peer-marked")).toBeVisible({ timeout: 20_000 });
  const list = panel.getByRole("list", { name: "Peer marks" });
  await expect(list.getByLabel("Peer mark for Emmanuel", { exact: true })).toHaveText("peer 2 / 2");
  await expect(list.getByLabel("Peer mark for Bola", { exact: true })).toHaveText("peer 0 / 2");
  await expect(list).toContainText("check the 4");
  await shot(panel, "peer-teacher");
  await panel.getByRole("button", { name: "✓ Use all peer marks" }).click();
  await expect(panel.getByRole("combobox", { name: /^Mark for Emmanuel/ })).toHaveValue("2");
  await expect(panel.getByRole("combobox", { name: /^Mark for Bola/ })).toHaveValue("0");
});
