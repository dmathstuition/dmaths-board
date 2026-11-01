import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { cleanExamQuestions, learnerPaper, markPaper, type ExamQ } from "../lib/exams";

// Exam mode with a stand-in for /api/board/exams that keeps the exam in memory
// and marks with the real marking code.
function examServer() {
  let exam: { id: string; title: string; minutes: number; review: boolean; status: "open" | "closed"; endsAt: number; questions: ExamQ[] } | null = null;
  const entries = new Map<string, { name: string; answers: Record<string, unknown>; flags: number; submitted: boolean; score: number | null; total: number | null }>();
  const meta = () => exam && { id: exam.id, title: exam.title, minutes: exam.minutes, review: exam.review, status: exam.status, endsAt: exam.endsAt, count: exam.questions.length, total: exam.questions.reduce((s, q) => s + q.marks, 0) };
  const close = () => { if (!exam) return; exam.status = "closed"; for (const e of entries.values()) if (!e.submitted) { const m = markPaper(exam.questions, e.answers); Object.assign(e, { submitted: true, score: m.score, total: m.total }); } };
  return async (ctx: BrowserContext, who: "teacher" | "learner", me = { id: "33333333-3333-4333-8333-333333333333", name: "Emmanuel" }) => {
    await ctx.route("**/api/board/exams**", async (r) => {
      if (r.request().method() === "GET") {
        if (!exam) return r.fulfill({ json: { exam: null } });
        if (who === "teacher") return r.fulfill({ json: { exam: { ...meta(), questions: exam.questions }, entries: [...entries].map(([id, e]) => ({ id, name: e.name, answered: Object.keys(e.answers).length, flags: e.flags, flagLog: [], submitted: e.submitted, score: e.score, total: e.total, live: null })) } });
        const e = entries.get(me.id);
        const out: any = { exam: meta(), entry: e ? { started: true, submitted: e.submitted, answers: e.answers, flags: e.flags, score: e.score, total: e.total } : null };
        if (e && !e.submitted && exam.status === "open") out.paper = learnerPaper(exam.id, me.id, exam.questions);
        if (e && exam.status === "closed") { const m = markPaper(exam.questions, e.answers); out.review = exam.questions.map((q, i) => ({ q: q.q, kind: q.kind, options: q.options, answer: q.answer, given: e.answers[String(i)] ?? null, right: m.right[i], marks: q.marks })); }
        return r.fulfill({ json: out });
      }
      const b = JSON.parse(r.request().postData() ?? "{}");
      if (b.action === "ai") return r.fulfill({ json: { questions: [
        { q: `${b.topic}: which gas do plants take in?`, kind: "choice", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 1, marks: 1 },
        { q: `${b.topic}: what colour is chlorophyll?`, kind: "typed", options: [], answer: "green", marks: 1 },
      ].slice(0, b.count) } });
      if (b.action === "create") { exam = { id: "exam-1", title: b.title, minutes: b.minutes, review: b.review, status: "open", endsAt: Date.now() + b.minutes * 60_000, questions: cleanExamQuestions(b.questions) }; return r.fulfill({ json: { id: exam.id } }); }
      if (b.action === "close") { close(); return r.fulfill({ json: { ok: true } }); }
      if (b.action === "start") { entries.set(me.id, { name: me.name, answers: {}, flags: 0, submitted: false, score: null, total: null }); return r.fulfill({ json: { ok: true } }); }
      const e = entries.get(me.id)!;
      if (b.action === "answer") { e.answers[String(b.n)] = b.value; return r.fulfill({ json: { ok: true } }); }
      if (b.action === "flag") { e.flags++; return r.fulfill({ json: { ok: true } }); }
      if (b.action === "submit") { const m = markPaper(exam!.questions, e.answers); Object.assign(e, { submitted: true, score: m.score, total: m.total }); return r.fulfill({ json: { ok: true, score: m.score, total: m.total } }); }
      return r.fulfill({ json: {} });
    });
  };
}

async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer(), exams = examServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : {});
    await hub.attach(ctx, who); await server.attach(ctx, who); await exams(ctx, who);
    const page = await ctx.newPage();
    page.on("dialog", (d) => d.accept());
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1500);
  return { teacher, learner };
}

test("exam mode: a timed test on a learner's phone, leaving the page flagged, marked automatically", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  await panel.getByLabel("Title").fill("Algebra check");
  await panel.getByRole("button", { name: "10 min", exact: true }).click();
  await panel.getByRole("button", { name: "+ Multiple-choice question" }).click();
  await panel.getByLabel("Question 1", { exact: true }).fill("What is 7 × 8?");
  for (const [k, v] of ["54", "56", "58", "64"].entries()) await panel.getByLabel(`Question 1, option ${k + 1}`).fill(v);
  await panel.getByLabel("Option 2 is the answer").check();
  await panel.getByRole("button", { name: "+ Typed-answer question" }).click();
  await panel.getByLabel("Question 2", { exact: true }).fill("Solve 3x + 2 = 14");
  await panel.getByLabel("Answer to question 2").fill("4");
  await panel.getByLabel("Marks for question 2").selectOption("2");
  // The A.I writes questions on any subject; they can be checked and removed.
  await panel.getByPlaceholder(/Simultaneous equations by elimination/).fill("Photosynthesis");
  await panel.getByPlaceholder(/SS2, JSS1/).fill("JSS2");
  await panel.getByLabel("How many A.I questions").fill("2");
  await panel.getByRole("button", { name: "✨ Write 2 questions" }).click();
  await expect(panel.getByText(/The A.I wrote 2 questions/)).toBeVisible();
  await expect(panel.getByLabel("Question 3", { exact: true })).toHaveValue(/which gas do plants take in/);
  await expect(panel.getByLabel("Answer to question 4")).toHaveValue("green");
  await panel.getByRole("button", { name: /Remove question 4/ }).click();
  await panel.getByRole("button", { name: /Remove question 3/ }).click();
  // And some questions made from a topic.
  await panel.getByLabel("Topic").selectOption({ label: "Pythagoras Pursuit" });
  await panel.getByLabel("How many", { exact: true }).fill("2");
  await panel.getByRole("button", { name: "Add 2 questions" }).click();
  await expect(panel.getByLabel("Question 4", { exact: true })).toHaveValue(/Right-angled triangle|ladder|distance/);
  await panel.getByRole("button", { name: /Remove question 4/ }).click();
  await panel.getByRole("button", { name: /Remove question 3/ }).click();
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 10 min\)/ }).click();

  // The learner's phone: the rules, then the paper.
  const exam = learner.getByRole("dialog", { name: "Exam: Algebra check" });
  await expect(exam.getByRole("button", { name: "Start the exam" })).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText(/Leaving this page is reported/)).toBeVisible();
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(exam.getByRole("timer")).toContainText(/9:5\d|10:00/);
  // Answer whichever question comes first on this phone, then the other.
  for (let i = 0; i < 2; i++) {
    if (await exam.getByText("What is 7 × 8?").isVisible()) await exam.getByRole("radio", { name: /56/ }).click();
    else await exam.getByLabel("Your answer").fill("x = 4");
    if (i === 0) await exam.getByRole("button", { name: "Next →" }).click();
  }
  await learner.waitForTimeout(900); // the typed answer saves after a short pause
  // Switching away from the exam is reported.
  await learner.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(exam.getByText(/You left the exam page/)).toBeVisible();
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await expect(exam.getByText("3 / 3")).toBeVisible({ timeout: 15_000 });

  // The teacher sees it marked, with the warning.
  await expect(panel.getByText("Handed in", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByRole("cell", { name: "3 / 3" })).toBeVisible();
  await expect(panel.getByText("⚠ 1×")).toBeVisible();
  await panel.screenshot({ path: "test-results/exam-teacher.png" });

  // Ending the exam shows the learner the right answers.
  await panel.getByRole("button", { name: "End exam" }).click();
  await expect(exam.getByRole("list", { name: "Your answers" })).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText(/✓ \d\. What is 7 × 8\?/)).toBeVisible();
  await learner.screenshot({ path: "test-results/exam-learner.png" });
});
