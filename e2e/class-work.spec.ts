import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Class work: the tutor sets a picture for everyone and a different question
// for one learner; the learner sees their own question, writes on the picture,
// and snaps a photo of work done on paper; the tutor sees it all.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };

async function storage(ctx: BrowserContext, who: string, asked: any[]) {
  let n = 0;
  await ctx.route("**/api/live-sessions/slides", (r) => {
    const body = JSON.parse(r.request().postData() ?? "{}");
    asked.push(body);
    const path = `slides/${SID}/${body.answer ? "answer-" : ""}${who}-${++n}.jpg`;
    r.fulfill({ json: { uploads: [{ path, token: "t", url: `${base}/storage/v1/object/public/materials/${path}` }] } });
  });
  await ctx.route("**/storage/v1/object/upload/sign/**", (r) =>
    r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: cors }) : r.fulfill({ status: 200, headers: cors, json: { Key: "x" } }));
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors,
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#FEF3C7"/></svg>' }));
}

async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer();
  const asked: Record<string, any[]> = { teacher: [], learner: [] };
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await storage(ctx, who, asked[who]);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);
  return { teacher, learner, asked };
}

test("different class work for each learner, a picture to write on, and a photo of paper work", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacher, learner, asked } = await openClass(browser);
  // A real picture file (as a phone camera gives).
  const maker = await browser.newPage();
  await maker.setContent('<div style="width:640px;height:400px;background:#DBEAFE;font:bold 60px sans-serif">My working</div>');
  const png = await maker.screenshot({ clip: { x: 0, y: 0, width: 640, height: 400 } });
  await maker.close();

  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByRole("button", { name: "Different for each learner" }).click();
  await panel.getByPlaceholder(/quarter of a circle/).fill("Solve 3x = 12");
  await panel.getByLabel("Class work for Emmanuel").fill("Solve 2x + 3 = 11");
  await panel.getByLabel(/Add a picture for everyone/).setInputFiles({ name: "sheet.png", mimeType: "image/png", buffer: png });
  await expect(panel.getByRole("button", { name: /Remove: Add a picture/ })).toBeVisible({ timeout: 30_000 });
  await panel.getByRole("button", { name: "Send to learners" }).click();

  // The learner sees their own question, not the one for everyone, with the picture to write on.
  await expect(learner.getByText("Solve 2x + 3 = 11")).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByText("This class work is just for you")).toBeVisible();
  await expect(learner.getByText("Solve 3x = 12")).toHaveCount(0);
  await expect(learner.getByRole("img", { name: /write on it/ })).toBeVisible();

  // They snap a photo of their paper work.
  await learner.getByLabel("Snap a photo of my work").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await expect(learner.getByText("✓ Your tutor can see your photo")).toBeVisible({ timeout: 30_000 });
  expect(asked.learner.some((b) => b.answer === true && b.count === 1)).toBe(true);

  // The tutor sees the photo and the task it answers.
  await expect(panel.getByRole("img", { name: "Their work" })).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText("Task: Solve 2x + 3 = 11")).toBeVisible();
  await expect(panel.getByText(/1 of 1 answered/)).toBeVisible();
  await panel.screenshot({ path: "test-results/class-work-teacher.png" });

  // Shown to the class: the learner sees it on their board.
  await panel.getByRole("button", { name: /Open .*answer/ }).click();
  await teacher.getByRole("button", { name: /Show to class/ }).click();
  await expect(learner.getByText(/The tutor is showing/)).toBeVisible({ timeout: 20_000 });

  // Removing the photo takes it back.
  await learner.getByRole("button", { name: "Remove page 1" }).click();
  await expect(panel.getByRole("img", { name: "Their work" })).toHaveCount(0, { timeout: 20_000 });
  await learner.screenshot({ path: "test-results/class-work-learner.png" });
});

test("handing in: a time limit, two photo pages, hand in, feedback, send back, and closing answers", async ({ browser }) => {
  test.setTimeout(150_000);
  const { teacher, learner } = await openClass(browser);
  const saved: any[] = [];
  await teacher.context().route("**/api/live-sessions/results", (r) => { saved.push(JSON.parse(r.request().postData() ?? "{}")); return r.fulfill({ json: { ok: true } }); });
  const maker = await browser.newPage();
  await maker.setContent('<div style="width:640px;height:400px;background:#DCFCE7;font:bold 60px sans-serif">Page</div>');
  const png = await maker.screenshot({ clip: { x: 0, y: 0, width: 640, height: 400 } });
  await maker.close();

  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("Expand 3(x + 4)");
  await panel.getByRole("button", { name: "5 min", exact: true }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();

  // The learner sees the clock, types, adds two pages of working and hands in.
  await expect(learner.getByRole("timer")).toContainText(/4:5\d|5:00/, { timeout: 20_000 });
  await expect(learner.getByRole("button", { name: /Hand in my work/ })).toBeDisabled();
  await learner.getByRole("tab", { name: /Type/ }).click();
  await learner.getByLabel("Type your answer").fill("3x + 12");
  await learner.getByLabel("Snap a photo of my work").setInputFiles({ name: "p1.png", mimeType: "image/png", buffer: png });
  await expect(learner.getByText("✓ Your tutor can see your photo")).toBeVisible({ timeout: 30_000 });
  await learner.getByLabel("Snap a photo of my work").setInputFiles({ name: "p2.png", mimeType: "image/png", buffer: png });
  await expect(learner.getByText("✓ Your tutor can see your 2 photos")).toBeVisible({ timeout: 30_000 });
  await learner.getByRole("button", { name: /Hand in my work/ }).click();
  await expect(learner.getByText(/Handed in — your tutor has your work/)).toBeVisible();
  await expect(learner.getByLabel("Type your answer")).not.toBeEditable();

  // The tutor sees it handed in, with both pages, and writes feedback.
  await expect(panel.getByText("Handed in", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/1 handed in/)).toBeVisible();
  await expect(panel.getByText("2 pages")).toBeVisible();
  await panel.getByRole("button", { name: /Open .*answer/ }).click();
  const one = teacher.getByRole("dialog", { name: "One answer" });
  await one.getByRole("button", { name: "Show your working" }).click();
  await one.getByRole("button", { name: "Send feedback" }).click();
  await expect(learner.getByText("Show your working")).toBeVisible({ timeout: 20_000 });
  expect(saved.find((b) => b.action === "note")).toMatchObject({ feedback: "Show your working", answer: { text: "3x + 12" } });
  expect(saved.find((b) => b.action === "note").answer.imgs).toHaveLength(2);

  // Sent back: the learner can change their answer again.
  await one.getByRole("button", { name: /Send back to try again/ }).click();
  await expect(learner.getByText(/Your tutor sent this back/)).toBeVisible({ timeout: 20_000 });
  await expect(learner.getByLabel("Type your answer")).toBeEditable();
  await learner.getByLabel("Type your answer").fill("3x + 12 (3 × x and 3 × 4)");
  await learner.getByRole("button", { name: /Hand in my work/ }).click();
  await one.getByRole("button", { name: "Mark Learner A correct" }).click();
  expect(saved.find((b) => b.action === "mark")).toMatchObject({ mark: 1, feedback: "Show your working" });
  await one.getByRole("button", { name: "Back to all answers" }).click();

  // Closing answers locks everyone's board.
  await panel.getByRole("button", { name: "Close answers" }).click();
  await expect(learner.getByRole("button", { name: "Change my answer" })).toHaveCount(0, { timeout: 20_000 });
  await panel.getByRole("button", { name: "Reopen answers" }).click();
  await expect(learner.getByRole("button", { name: "Change my answer" })).toBeVisible({ timeout: 20_000 });
  await learner.screenshot({ path: "test-results/hand-in-learner.png" });
});

test("a learner sees their own results, question by question, with a link to keep", async ({ browser }) => {
  const { learner } = await openClass(browser);
  const PIC = `${base}/storage/v1/object/public/materials/slides/${SID}/answer-x-1.jpg`;
  await learner.context().route("**/api/live-sessions/my-results**", (r) => r.fulfill({ json: {
    link: "/report?t=abc.def",
    detail: {
      title: "Algebra", date: "1 Nov 2026", teacher: "Mr B", learner: "Emmanuel", board: true, live: true, classAverage: 60,
      row: { id: "g", name: "Emmanuel", work: 3, workMax: 4, quizCorrect: 1, quizAsked: 2, quizPoints: 900, total: 4, totalMax: 6, percent: 67 },
      work: [
        { question: "Expand 3(x + 4)", mark: 1, max: 1, feedback: "Great method!", answer: { text: "3x + 12", imgs: [PIC] } },
        { question: "Factorise 6x + 9", mark: 2, max: 3, feedback: "", answer: null },
      ],
      quizzes: [{ title: "Quick check", items: [
        { q: "2x = 10, x = ?", options: ["4", "5", "6", "20"], answer: 1, choice: 1, correct: true },
        { q: "x + 3 = 1, x = ?", options: ["-2", "2", "4", "-4"], answer: 0, choice: 1, correct: false },
      ] }],
    },
  } }));
  await learner.getByRole("button", { name: /My results/ }).click();
  const box = learner.getByRole("region", { name: "My results" });
  await expect(box.getByText("4 / 6")).toBeVisible();
  await expect(box.getByText("60%")).toBeVisible(); // the class average
  await expect(box.getByText("Great method!")).toBeVisible();
  await expect(box.getByText("2 / 3")).toBeVisible();
  await expect(box.getByText("Answer: -2")).toBeVisible();
  await expect(box.getByRole("link", { name: "Open my report" })).toHaveAttribute("href", /\/report\?t=abc\.def$/);
  await box.screenshot({ path: "test-results/my-results.png" });
});
