import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Times tables: the square the teacher works on the board, and the drill a
// learner (joined by PIN) answers on their own screen while the teacher's
// screen marks it and remembers the weak facts.
const SHOTS = process.env.TABLES_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(500); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };
// The answer to a drill question as it's written: "7 × 8 =", "56 ÷ 7 =", "7 × ? = 56".
const solve = (t: string) => { const n = t.match(/\d+/g)!.map(Number); return t.includes("÷") ? n[0] / n[1] : t.includes("?") ? n[1] / n[0] : n[0] * n[1]; };

test("times-table square and drill, with a learner answering on their own screen", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: SHOTS ? 1.5 : 1 });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/board/drill", (r) => r.fulfill({ json: { ok: true } }));
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  const tool = async (name: string | RegExp) => {
    await teacher.getByRole("button", { name: "Class tools" }).click();
    await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name }).click();
  };

  // ── The square ──
  await tool(/^Times-table square/);
  const sq = teacher.getByRole("region", { name: "Times-table square" }), theirSq = learner.getByRole("region", { name: "Times-table square" });
  await sq.getByRole("button", { name: "7 times 8 is 56" }).click();
  await expect(sq.getByLabel("Fact", { exact: true })).toContainText("7 × 8 = 56");
  await expect(sq.getByRole("list", { name: "Fact family" })).toContainText("56 ÷ 7 = 8");
  await expect(sq.getByRole("img", { name: "7 rows of 8 dots" })).toBeVisible();
  await expect(theirSq.getByLabel("Fact", { exact: true })).toContainText("7 × 8 = 56", { timeout: 20_000 });
  await sq.getByLabel("Light up a table").selectOption({ label: "7 times table" });
  await expect(sq.getByRole("list", { name: "The 7 times table" })).toContainText("7 × 12 = 84");
  await shot(teacher, "square");
  // Quiz: the answers are covered on every screen until the teacher reveals one.
  await sq.getByRole("button", { name: "Hide the answers (quiz)" }).click();
  await expect(sq.getByRole("button", { name: "7 times 8, covered" })).toBeVisible();
  await sq.getByRole("button", { name: "Ask a random fact" }).click();
  await expect(sq.getByLabel("Fact", { exact: true })).toContainText(/7 × \d+ = \?/);
  await expect(theirSq.getByLabel("Fact", { exact: true })).toContainText(/7 × \d+ = \?/, { timeout: 20_000 });
  await expect(theirSq.getByRole("list", { name: "The 7 times table" })).toContainText("7 × 12 = ?");
  await expect(theirSq.getByRole("button")).toHaveCount(0); // learners watch; the teacher works it
  await shot(learner, "learner-square-quiz");
  await sq.getByRole("button", { name: "Reveal the answer" }).click();
  await expect(theirSq.getByLabel("Fact", { exact: true })).toContainText(/7 × \d+ = \d+/, { timeout: 20_000 });
  await sq.getByRole("button", { name: "Close Times-table square" }).click();
  await expect(theirSq).toBeHidden({ timeout: 20_000 });

  // ── The drill: the 7 times table, ten questions ──
  await tool("Times-table drill");
  const dlg = teacher.getByRole("dialog", { name: "Times-table drill" }), theirs = learner.getByRole("dialog", { name: "Times-table drill" });
  await dlg.getByRole("button", { name: "7 times table", exact: true }).click();
  for (const t of [2, 5, 10]) await dlg.getByRole("button", { name: `${t} times table`, exact: true }).click();
  await expect(dlg.getByRole("button", { name: "7 times table", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(dlg.getByRole("button", { name: "2 times table", exact: true })).toHaveAttribute("aria-pressed", "false");
  await shot(teacher, "drill-setup");
  await dlg.getByRole("button", { name: "Start the drill" }).click();
  await expect(theirs).toBeVisible({ timeout: 20_000 });

  let missed = "";
  for (let i = 0; i < 10; i++) {
    await expect(theirs.getByText(`Question ${i + 1} of 10`)).toBeVisible({ timeout: 8000 });
    await expect(theirs.getByRole("button", { name: "1", exact: true })).toBeEnabled({ timeout: 8000 });
    const q = (await theirs.locator("[data-drill-q]").getAttribute("data-drill-q"))!;
    expect(q).toMatch(/7/);
    const wrong = i === 2; // one slip, on the third question
    if (wrong) missed = q;
    if (i === 0) await shot(learner, "learner-question");
    for (const d of String(solve(q) + (wrong ? 1 : 0))) await theirs.getByRole("button", { name: d, exact: true }).click();
    await theirs.getByRole("button", { name: "Enter" }).click();
    await expect(theirs.getByRole("status")).toContainText(wrong ? "Not " : "Correct");
    if (wrong) await shot(learner, "learner-wrong");
  }
  await expect(theirs.getByLabel("Score")).toHaveText("9 out of 10", { timeout: 8000 });
  await expect(theirs.getByRole("list", { name: "Facts to practise" }).getByRole("listitem")).toHaveCount(1);
  await shot(learner, "learner-summary");
  // The teacher's screen has marked it and remembers the slip.
  const row = dlg.getByRole("listitem", { name: "Emmanuel" });
  await expect(row.getByLabel("Progress")).toContainText("Finished: 9 out of 10", { timeout: 20_000 });
  await expect(row.getByLabel("Missed")).toContainText(`= ${solve(missed)}`);
  await expect(row.getByRole("img", { name: /9 quick, 0 slow, 1 to practise/ })).toBeVisible();
  await shot(teacher, "drill-results");
  await learner.getByRole("button", { name: "Back to the board" }).click();
  await expect(theirs).toBeHidden();
  await dlg.getByRole("button", { name: "End the drill" }).click();

  // ── A second drill on just the weak fact ──
  await dlg.getByRole("button", { name: "Drill each learner's weak facts" }).click();
  await expect(row).toContainText("their weak facts");
  await expect(theirs).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 10; i++) {
    await expect(theirs.getByText(`Question ${i + 1} of 10`)).toBeVisible({ timeout: 8000 });
    await expect(theirs.getByRole("button", { name: "1", exact: true })).toBeEnabled({ timeout: 8000 });
    const q = (await theirs.locator("[data-drill-q]").getAttribute("data-drill-q"))!;
    expect(q.match(/\d+/g)!.map(Number).reduce((a, b) => a * b)).toBe(missed.match(/\d+/g)!.map(Number).reduce((a, b) => a * b)); // the same fact, either way round
    await learner.keyboard.type(String(solve(q))); // a keyboard works too
    await learner.keyboard.press("Enter");
    await expect(theirs.getByRole("status")).toContainText("Correct");
  }
  await expect(theirs.getByLabel("Score")).toHaveText("10 out of 10", { timeout: 8000 });
  await expect(row.getByLabel("Progress")).toContainText("Finished: 10 out of 10", { timeout: 20_000 });
  await expect(row.getByRole("img", { name: /0 to practise/ })).toBeVisible();
});
