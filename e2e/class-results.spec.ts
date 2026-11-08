import { test, expect, type Browser } from "@playwright/test";
import { SID, GID, agree, classServer, realtimeHub } from "./helpers";

// Marking class work on answer boards, and the class results (class work +
// live quiz) that the teacher can download and delete.
async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer();
  const store = { marks: [] as any[], deleted: false };
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext();
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/live-sessions/results**", (r) => {
      const m = r.request().method();
      if (m === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}");
        store.marks = store.marks.filter((x) => !(x.round_id === b.roundId && x.student_id === b.studentId));
        if (b.action === "mark") store.marks.push({ round_id: b.roundId, student_id: b.studentId, name: b.name, question: b.question, mark: b.mark, max_mark: b.max });
        return r.fulfill({ json: { ok: true } });
      }
      if (m === "DELETE") { store.marks = []; store.deleted = true; return r.fulfill({ json: { ok: true } }); }
      // One live quiz in this class: 3 questions asked, the learner got 2 right.
      return r.fulfill({ json: store.deleted ? { ready: true, marks: [], quizzes: [], answers: [] } : {
        ready: true, marks: store.marks,
        quizzes: [{ id: "q1", title: "Bonds", asked: 3 }],
        answers: [{ quiz_id: "q1", student_id: GID, correct: true, points: 900 }, { quiz_id: "q1", student_id: GID, correct: true, points: 700 }, { quiz_id: "q1", student_id: GID, correct: false, points: 0 }],
      } });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);
  return { teacher, learner, store };
}

test("the teacher marks class work, the learner sees it, and results add up with the quiz", async ({ browser }) => {
  const { teacher, learner, store } = await openClass(browser);
  await teacher.getByRole("button", { name: "Answer boards" }).first().click();
  const panel = teacher.getByRole("dialog", { name: "Answer boards" });
  await panel.getByPlaceholder(/quarter of a circle/).fill("What is 7 × 8?");
  await panel.getByRole("button", { name: "Typing only" }).click();
  await panel.getByRole("button", { name: "Send to learners" }).click();
  await learner.getByLabel("Type your answer").fill("56");
  await expect(panel.getByText("56", { exact: true })).toBeVisible({ timeout: 20_000 });

  // Mark it correct: the learner sees it on their board before the round ends.
  await panel.getByRole("button", { name: /Mark .* correct/ }).click();
  await expect(learner.getByText("Correct — well done!")).toBeVisible({ timeout: 20_000 });
  expect(store.marks).toEqual([expect.objectContaining({ student_id: GID, mark: 1, max_mark: 1, question: "What is 7 × 8?" })]);
  // Change of mind: wrong instead.
  await panel.getByRole("button", { name: /Mark .* wrong/ }).click();
  await expect(learner.getByText("Not quite — have another look.")).toBeVisible({ timeout: 20_000 });
  await panel.getByRole("button", { name: /Mark .* correct/ }).click();
  await expect(learner.getByText("Correct — well done!")).toBeVisible({ timeout: 20_000 });
  await panel.getByRole("button", { name: "End", exact: true }).click();

  // Results: class work 1/1 + quiz 2/3 = 3/4.
  await teacher.getByRole("tab", { name: /Results/ }).click();
  const results = teacher.getByRole("region", { name: "Class results" });
  const row = results.getByRole("row", { name: /Emmanuel/ });
  await expect(row).toContainText("1 / 1");
  await expect(row).toContainText("2 / 3");
  await expect(row).toContainText("3 / 4");
  await expect(row).toContainText("75%");

  // Download, then delete.
  const download = teacher.waitForEvent("download");
  await results.getByRole("button", { name: "Download (Excel)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^class-results-.*\.csv$/);
  teacher.once("dialog", (d) => d.accept());
  await results.getByRole("button", { name: "Delete results" }).click();
  await expect(results.getByText("Results deleted.")).toBeVisible();
  expect(store.deleted).toBe(true);
});

test("after class the teacher sends each parent a report by email or WhatsApp", async ({ browser }) => {
  const { teacher } = await openClass(browser);
  const sent: any[] = [];
  await teacher.context().route("**/api/live-sessions/report**", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ json: { ready: true, contacts: {} } });
    const b = JSON.parse(r.request().postData() ?? "{}");
    sent.push(b);
    if (b.action === "links") return r.fulfill({ json: { links: Object.fromEntries(b.studentIds.map((id: string) => [id, `https://dmaths.academy/report?t=${id}`])) } });
    return r.fulfill({ json: { ok: true } });
  });
  await teacher.getByRole("tab", { name: /Results/ }).click();
  const report = teacher.getByRole("region", { name: "Class report to parents" });
  await report.getByPlaceholder(/Adding fractions/).fill("Number bonds to 10");
  await report.getByPlaceholder(/Exercise 4B/).fill("Page 12");
  await report.getByRole("button", { name: "Prepare reports" }).click();
  await expect(report.getByRole("button", { name: "Reports ready ✓" })).toBeVisible();

  // An email address: the server sends it.
  const contact = report.getByPlaceholder("Parent's email or WhatsApp");
  await contact.fill("mum@example.com");
  await contact.blur();
  await expect.poll(() => sent.some((b) => b.action === "contact" && b.contact === "mum@example.com")).toBe(true);
  await report.getByRole("button", { name: "Email", exact: true }).click();
  await expect(report.getByRole("button", { name: "Emailed ✓" })).toBeVisible();
  expect(sent.find((b) => b.action === "email")).toMatchObject({ to: "mum@example.com", covered: "Number bonds to 10", homework: "Page 12" });

  // A phone number: a WhatsApp message to that parent, with the marks and the link.
  await contact.fill("0803 123 4567");
  await contact.blur();
  const wa = await report.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
  expect(wa).toContain("https://wa.me/2348031234567?text=");
  const text = decodeURIComponent(wa!.split("text=")[1]);
  expect(text).toContain("Class report for Emmanuel");
  expect(text).toContain("What we covered: Number bonds to 10");
  expect(text).toContain("Live quiz: 2 / 3 correct");
  expect(text).toContain(`https://dmaths.academy/report?t=`);
});

test("exam results show in the class results (teacher) and in My results (learner)", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  const qs = [
    { q: "7 × 8 =", kind: "typed", options: [], answer: "56", marks: 1 },
    { q: "2,416 × 37 =", kind: "typed", options: [], answer: "89392", marks: 2, method: true },
  ];
  // The class's exam, and the learner's paper in it (scored 2 of 3).
  for (const page of [teacher, learner]) {
    await page.context().route("**/api/live-sessions/results**", (r) => r.fulfill({ json: {
      ready: true, marks: [], quizzes: [], answers: [],
      exams: [{ id: "x1", title: "Arithmetic check", total: 3 }],
      examEntries: [{ exam_id: "x1", student_id: GID, name: "Emmanuel", score: 2, total: 3, submitted: true }],
    } }));
  }
  await teacher.context().route("**/api/board/exams**", (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get("list") === "1") return r.fulfill({ json: { exams: [{ id: "x1", title: "Arithmetic check", status: "closed", createdAt: new Date().toISOString(), count: 2 }] } });
    return r.fulfill({ json: {
      exam: { id: "x1", title: "Arithmetic check", status: "closed", endsAt: Date.now() - 60_000, count: 2, total: 3, questions: qs, className: "Division", teacher: "Mrs Ade", createdAt: new Date().toISOString() },
      entries: [{ id: GID, name: "Emmanuel", answered: 2, flags: 0, flagLog: [], submitted: true, score: 2, total: 3, live: null, answers: { 0: "56", 1: "89000", w1: { blank: false } }, pageMarks: { 1: 1 }, toMark: [], startedAt: null, submittedAt: new Date().toISOString() }],
    } });
  });
  await learner.context().route("**/api/live-sessions/my-results**", (r) => r.fulfill({ json: { link: "/report?t=abc", detail: {
    title: "Division", date: "9 Nov 2026", teacher: "Mrs Ade", learner: "Emmanuel", board: true, live: true, classAverage: 60,
    row: { id: GID, name: "Emmanuel", work: 0, workMax: 0, quizCorrect: 0, quizAsked: 0, quizPoints: 0, exam: 2, examMax: 3, total: 2, totalMax: 3, percent: 67 },
    work: [], quizzes: [],
    exams: [{ title: "Arithmetic check", score: 2, total: 3, submitted: true, items: [
      { q: "7 × 8 =", kind: "typed", given: "56", answer: "56", got: 1, marks: 1, right: true },
      { q: "2,416 × 37 =", kind: "typed", given: "89000", answer: "89392", got: 1, marks: 2, right: false },
    ] }],
  } } }));

  // The teacher: the exam is in each learner's total, and in full below.
  await teacher.getByRole("tab", { name: /Results/ }).click();
  const results = teacher.getByRole("region", { name: "Class results" });
  await expect(results.getByText(/plus the exam \(Arithmetic check\)/)).toBeVisible();
  const row = results.getByRole("row", { name: /Emmanuel/ }).first();
  await expect(row).toContainText("2 / 3");
  await expect(row).toContainText("67%");
  const exams = results.getByRole("region", { name: "Exam results" });
  await expect(exams.getByText(/Arithmetic check · 2 questions · 3 marks · 1 handed in · average 67%/)).toBeVisible();
  await expect(exams.getByRole("row", { name: /Emmanuel/ })).toContainText("2 / 3 (67%)");
  const pdf = teacher.waitForEvent("download");
  await exams.getByRole("button", { name: "Download Emmanuel's exam report (PDF)" }).click();
  expect((await pdf).suggestedFilename()).toBe("Emmanuel - Arithmetic check report.pdf");

  // The learner: the exam in their results, question by question.
  await learner.getByRole("button", { name: /My results/ }).click();
  const mine = learner.getByRole("region", { name: "Exams" });
  await expect(mine.getByText("2 / 3 (67%)")).toBeVisible({ timeout: 15_000 });
  await mine.getByText(/See each question \(1 of 2 right\)/).click();
  await expect(mine.getByText(/You: 89000 · Answer: 89392 · 1 \/ 2 for your working/)).toBeVisible();
});
