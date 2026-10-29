import { test, expect, type Browser } from "@playwright/test";
import { SID, agree, classServer, ink, realtimeHub, scribble, within, type Net } from "./helpers";

// A teacher and a learner in one class, in two separate browsers. Whatever the
// network does, writing must reach the other side:
//   normal        — the live connection works
//   drop          — 60% of the learner's live messages are lost
//   learner-dead  — the learner's live connection is refused (backup route + saved board)
//   teacher-dead  — the teacher's live connection is refused
async function openClass(browser: Browser, net: Net) {
  const hub = realtimeHub(net), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await expect(teacher.locator("canvas").first()).toBeVisible();
  await expect(learner.locator("canvas").first()).toBeVisible();
  await teacher.waitForTimeout(2000);
  return { teacher, learner, hub, server };
}

for (const net of ["normal", "drop", "learner-dead", "teacher-dead"] as const) {
  test(`writing reaches both sides (${net})`, async ({ browser }) => {
    const { teacher, learner, hub, server } = await openClass(browser, net);

    // The learner writes; the teacher must see it.
    const teacherBefore = await ink(teacher);
    await scribble(learner, 3, 120);
    const written = await ink(learner);
    expect(written).toBeGreaterThan(300);
    const up = await within(25, async () => (await ink(teacher)) - teacherBefore > written * 0.6);
    expect(up, `learner → teacher never arrived (relayed ${hub.stats.relayed}, dropped ${hub.stats.dropped}, backup posts ${server.stats.backupPosts})`).toBeGreaterThanOrEqual(0);

    // The teacher writes; the learner must see it.
    const learnerBefore = await ink(learner);
    await scribble(teacher, 1, 260);
    const down = await within(25, async () => (await ink(learner)) - learnerBefore > 300);
    expect(down, "teacher → learner never arrived").toBeGreaterThanOrEqual(0);

    test.info().annotations.push({ type: "timing", description: `learner→teacher ${up}s, teacher→learner ${down}s` });
    if (net === "normal") expect(up).toBeLessThan(5);
  });
}

// A learner on the full-screen board (how phones always show it) raises a
// hand; the teacher sees it and lowers it, and the learner's hand comes down.
test("a learner can raise a hand from the full-screen board", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, "normal");
  await learner.getByRole("button", { name: "Full screen" }).click();
  await learner.getByRole("button", { name: "Raise my hand" }).click();
  await expect(learner.getByRole("button", { name: "Lower my hand" })).toBeVisible();
  await expect(learner.getByText(/Your hand is up/).first()).toBeVisible();
  // The teacher sees it straight away (the live ping), not only on the next poll.
  await expect(teacher.getByRole("button", { name: /Lower Emmanuel's hand/ }).first()).toBeVisible({ timeout: 4000 });
  await teacher.getByRole("button", { name: /Lower Emmanuel's hand/ }).first().click();
  await expect(learner.getByRole("button", { name: "Raise my hand" })).toBeVisible({ timeout: 12_000 });
});

test("a learner is told when their hand couldn't go up", async ({ browser }) => {
  const { learner } = await openClass(browser, "normal");
  await learner.context().route("**/api/live-sessions", (r) =>
    r.request().method() === "POST" ? r.fulfill({ status: 409, json: { error: "This class has ended." } }) : r.fallback());
  await learner.getByRole("button", { name: "Raise my hand" }).click();
  await expect(learner.getByText(/Couldn.t raise your hand: This class has ended/).first()).toBeVisible();
  await expect(learner.getByRole("button", { name: "Raise my hand" })).toBeVisible();
});

// "Got it / I'm lost": the teacher sees who is following.
test("learners tell the teacher they've got it or are lost", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, "normal");
  await learner.getByRole("button", { name: /Got it/ }).click();
  await expect(teacher.getByRole("button", { name: /1 got it, 0 lost/ })).toBeVisible({ timeout: 10_000 });
  await learner.getByRole("button", { name: /I'm lost/ }).click();
  await expect(teacher.getByRole("button", { name: /0 got it, 1 lost/ })).toBeVisible({ timeout: 10_000 });
  await teacher.getByRole("button", { name: /0 got it, 1 lost/ }).click();
  await expect(teacher.getByRole("dialog", { name: "Who is following" }).getByText("Emmanuel")).toBeVisible();
  await teacher.getByRole("button", { name: "Clear all" }).click();
  await expect(learner.getByRole("button", { name: /I'm lost/ })).toHaveAttribute("aria-pressed", "false", { timeout: 10_000 });
});

test("a quick poll: learners vote, the teacher sees the count and can show the results", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, "normal");
  await teacher.getByRole("button", { name: "Quick poll" }).click();
  await teacher.getByPlaceholder(/Is 0.5 the same/).fill("Is 0.5 the same as a half?");
  await teacher.getByRole("button", { name: "Ask the class" }).click();
  const card = learner.getByRole("dialog", { name: "Quick poll" });
  await expect(card.getByText("Is 0.5 the same as a half?")).toBeVisible({ timeout: 10_000 });
  await card.getByRole("button", { name: "Yes" }).click();
  await expect(teacher.getByText(/1 of 1 voted/)).toBeVisible({ timeout: 10_000 });
  await teacher.getByRole("button", { name: "Show results to class" }).click();
  await expect(card.getByText("Yes (you)")).toBeVisible({ timeout: 10_000 });
  await teacher.getByRole("button", { name: "End", exact: true }).click();
  await expect(card).toHaveCount(0, { timeout: 10_000 });
});

test("group boards: a group draws together and the teacher brings it to the main board", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser, "normal");
  await teacher.getByRole("button", { name: "Group boards" }).click();
  await teacher.getByPlaceholder(/three shapes/).fill("Draw a square");
  await teacher.getByRole("button", { name: "Start groups" }).click();
  const pad = learner.getByRole("img", { name: /Your group's board/ });
  await expect(pad).toBeVisible({ timeout: 10_000 });
  await expect(learner.getByText("Draw a square")).toBeVisible();
  const b = (await pad.boundingBox())!;
  await learner.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
  await learner.mouse.down();
  for (const [x, y] of [[0.6, 0.3], [0.6, 0.7], [0.3, 0.7], [0.3, 0.3]]) await learner.mouse.move(b.x + b.width * x, b.y + b.height * y, { steps: 6 });
  await learner.mouse.up();
  // The teacher brings that group's work onto a new page of the main board.
  const card = teacher.locator("div.ring-2", { hasText: "Emmanuel" });
  await within(15, async () => {
    await card.getByRole("button", { name: "To main board" }).click();
    return (await teacher.getByText(/work is on a new page/).count()) > 0;
  });
  await expect(teacher.getByText(/work is on a new page of the main board/)).toBeVisible();
  await teacher.getByRole("button", { name: "End groups" }).click();
  await expect(pad).toHaveCount(0, { timeout: 10_000 });
  await expect(learner.getByText(/Page 2\/2/).first()).toBeVisible({ timeout: 15_000 });
});

// A board with more than 20 pages (e.g. a long slide deck). Learners used to
// keep only 20, so their board never matched the teacher's: they asked for the
// whole board again and again, the class's live connection was flooded and
// writing stopped reaching anyone. The learner must keep seeing the writing,
// and the board must stay quiet once everyone is in step.
test("a board with more than 20 pages keeps working and doesn't flood the class", async ({ browser }) => {
  const { teacher, learner, hub } = await openClass(browser, "normal");
  const add = teacher.getByRole("button", { name: "Add a page" });
  for (let i = 0; i < 23; i++) await add.click();
  await expect(teacher.getByText(/Page 24\/24/)).toBeVisible();
  await expect(learner.getByText(/Page 24\/24/).first()).toBeVisible({ timeout: 20_000 });
  await teacher.waitForTimeout(4000); // let everyone settle
  const before = { req: hub.stats.events.get("board-sync-req") ?? 0, all: hub.stats.relayed };
  await teacher.waitForTimeout(12_000);
  const syncReqs = (hub.stats.events.get("board-sync-req") ?? 0) - before.req;
  const perSecond = (hub.stats.relayed - before.all) / 12;
  expect(syncReqs, "learner keeps asking for the whole board").toBeLessThanOrEqual(1);
  expect(perSecond, "live messages per second while idle").toBeLessThan(3);
  // Writing still reaches the learner.
  const learnerBefore = await ink(learner);
  await scribble(teacher, 2, 140);
  const seen = await within(15, async () => (await ink(learner)) - learnerBefore > 300);
  expect(seen).toBeGreaterThanOrEqual(0);
});
