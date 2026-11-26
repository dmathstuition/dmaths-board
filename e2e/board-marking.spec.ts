import { test, expect, type Page, type Locator } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Marking a learner's answer board: the tutor ticks, crosses and writes on it,
// the learner sees the marking on their phone straight away, and one tap gives
// the mark from the ticks (kept with their board and the marking).
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page | Locator, name: string) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };
async function drag(p: Page, c: Locator, from: [number, number], to: [number, number]) {
  const b = (await c.boundingBox())!;
  await p.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(b.x + b.width * (from[0] + ((to[0] - from[0]) * i) / 8), b.y + b.height * (from[1] + ((to[1] - from[1]) * i) / 8));
  await p.mouse.up();
}
const tap = async (p: Page, c: Locator, at: [number, number]) => { const b = (await c.boundingBox())!; await p.mouse.click(b.x + b.width * at[0], b.y + b.height * at[1]); };

test("the tutor marks a learner's board; the learner sees it at once; a mark from the ticks", async ({ browser }) => {
  test.setTimeout(120_000);
  const hub = realtimeHub(), server = classServer();
  const kept: any[] = [], asked: any[] = [];
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 420, height: 860 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
    await hub.attach(ctx, who); await server.attach(ctx, who);
    if (who === "teacher") await ctx.route("**/api/quiz-sets", (r) => { asked.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { items: [
      { q: "Work out 3/4 of 20, then 1/5 of 20", a: "15 and 4", w: "20 ÷ 4 × 3 = 15; 20 ÷ 5 = 4" },
      { q: "Work out 2/3 of 18", a: "12", w: "18 ÷ 3 × 2 = 12" },
    ] } }); });
    await ctx.route("**/api/live-sessions/results", (r) => { kept.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { ok: true } }); });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);

  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  // The A.I. writes questions on the topic, with answers for the tutor only.
  await panel.getByText("✨ A.I. questions on a topic").click();
  await panel.getByPlaceholder(/Simultaneous equations/).fill("Fractions of amounts");
  await panel.getByRole("group", { name: "Level" }).getByRole("button", { name: "JSS 1–3" }).click();
  await panel.getByRole("button", { name: "✨ Make questions" }).click();
  const list = panel.getByRole("list", { name: "A.I. questions" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list).toContainText("🔑 15 and 4");
  expect(asked.find((b) => b.action === "ai-work")).toMatchObject({ action: "ai-work", topic: "Fractions of amounts", level: "JSS 1–3", count: 8, hard: "mixed" });
  await shot(panel, "ai-questions");
  await list.getByRole("button", { name: /Ask the class: Work out 3\/4/ }).click();
  await expect(panel.getByPlaceholder(/quarter of a circle/)).toHaveValue("Work out 3/4 of 20, then 1/5 of 20");
  await panel.getByRole("button", { name: "2 marks" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();

  // The learner writes two answers on their board.
  const mine = learner.getByRole("dialog", { name: "Your answer board" });
  await expect(mine.getByText("Work out 3/4 of 20")).toBeVisible({ timeout: 20_000 });
  await expect(mine.getByText(/15 and 4/)).toHaveCount(0); // never the answer
  const pad = mine.getByRole("img", { name: /Your answer — draw here/ });
  await drag(learner, pad, [0.1, 0.3], [0.35, 0.35]);
  await drag(learner, pad, [0.1, 0.7], [0.35, 0.72]);
  await expect(panel.getByText(/1 of 1 answered/)).toBeVisible({ timeout: 20_000 });

  // The tutor opens it and marks: two ticks, a cross, a word in red pen.
  await panel.getByRole("button", { name: /Open .*answer/ }).click();
  const one = teacher.getByRole("dialog", { name: "One answer" });
  const board = one.getByRole("img", { name: "Mark on the page" }).first(); // the learner's board (the correction board is below it)
  await expect(one.getByLabel("Answer key")).toContainText("🔑 Answer: 15 and 4");
  await one.getByRole("button", { name: /Tick/ }).click();
  await tap(teacher, board, [0.45, 0.32]); await tap(teacher, board, [0.45, 0.7]);
  await one.getByRole("button", { name: /Cross/ }).click();
  await tap(teacher, board, [0.55, 0.7]);
  await one.getByRole("button", { name: /Undo/ }).first().click(); // the cross goes, both strokes of it
  await expect(one.getByLabel("Tick count")).toContainText("✓ 2");
  await expect(one.getByLabel("Tick count")).not.toContainText("✗");
  await one.getByRole("button", { name: /Cross/ }).click();
  await tap(teacher, board, [0.6, 0.72]);
  await one.getByRole("button", { name: /Pen/ }).click();
  await drag(teacher, board, [0.6, 0.85], [0.85, 0.88]);
  await expect(one.getByLabel("Tick count")).toContainText("✓ 2");
  await expect(one.getByLabel("Tick count")).toContainText("✗ 1");
  await shot(one, "mark-teacher");

  // The learner sees it on their board, straight away.
  await expect(mine.getByText(/Your tutor marked your board/)).toContainText("✓ 2", { timeout: 20_000 });
  await expect(mine.getByText(/Your tutor marked your board/)).toContainText("✗ 1");
  await expect(mine.getByRole("img", { name: "Your tutor's marking" })).toBeVisible();
  await shot(learner, "mark-learner");

  // A mark from the ticks: their board shows it, and it's kept with the board and the marking.
  await one.getByRole("button", { name: "Give 2 / 2 (one per tick)" }).click();
  await expect(mine.getByText(/2\s*\/\s*2/).first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => kept.find((b) => b.action === "mark")).toBeTruthy();
  const m = kept.find((b) => b.action === "mark");
  expect(m.mark).toBe(2);
  expect(m.answer.strokes.length).toBe(2);
  expect(m.answer.ink.filter((s: { id: string }) => s.id.startsWith("tk-")).length).toBe(2);
});
