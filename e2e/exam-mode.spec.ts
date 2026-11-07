import { readFile } from "fs/promises";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { cleanExamQuestions, cleanPageAnswer, currentPage, isHandMarked, keepsOrder, learnerPaper, markPaper, pageDone, pagesToMark, shownQ, slimAnswers, type ExamQ } from "../lib/exams";

// Exam mode with a stand-in for /api/board/exams that keeps the exam in memory
// and marks with the real marking code.
function examServer() {
  let exam: { id: string; title: string; minutes: number; review: boolean; calculator: boolean; inOrder: boolean; status: "open" | "closed"; endsAt: number; questions: ExamQ[] } | null = null;
  const entries = new Map<string, { name: string; answers: Record<string, unknown>; flags: number; submitted: boolean; score: number | null; total: number | null; marks?: Record<string, number> }>();
  const meta = () => exam && { id: exam.id, title: exam.title, minutes: exam.minutes, review: exam.review, calculator: exam.calculator, inOrder: keepsOrder(exam.questions, exam.inOrder), handMarked: isHandMarked(exam.questions), status: exam.status, endsAt: exam.endsAt, count: exam.questions.length, total: exam.questions.reduce((s, q) => s + q.marks, 0) };
  const close = () => { if (!exam) return; exam.status = "closed"; for (const e of entries.values()) if (!e.submitted) { const m = markPaper(exam.questions, e.answers); Object.assign(e, { submitted: true, score: m.score, total: m.total }); } };
  return async (ctx: BrowserContext, who: "teacher" | "learner", me = { id: "33333333-3333-4333-8333-333333333333", name: "Emmanuel" }) => {
    await ctx.route("**/api/board/exams**", async (r) => {
      if (r.request().method() === "GET") {
        if (!exam) return r.fulfill({ json: { exam: null } });
        const hand = isHandMarked(exam.questions);
        if (who === "teacher") return r.fulfill({ json: { exam: { ...meta(), questions: exam.questions }, entries: [...entries].map(([id, e]) => {
          const m = markPaper(exam!.questions, e.answers, e.marks ?? {});
          return { id, name: e.name, answered: Object.keys(e.answers).length, flags: e.flags, flagLog: [], submitted: e.submitted, score: hand && e.submitted ? m.score : e.score, total: m.total, live: e.submitted ? null : m.score,
            answers: hand ? slimAnswers(exam!.questions, e.answers) : e.answers, startedAt: new Date(Date.now() - 300_000).toISOString(), submittedAt: e.submitted ? new Date().toISOString() : null,
            ...(hand ? { pageMarks: e.marks ?? {}, toMark: pagesToMark(exam!.questions, e.answers, e.marks ?? {}, e.submitted) } : {}) };
        }) } });
        const e = entries.get(me.id);
        const out: any = { exam: meta(), entry: e ? {
          started: true, submitted: e.submitted, flags: e.flags, total: e.total ?? markPaper(exam.questions, e.answers).total,
          answers: hand ? slimAnswers(exam.questions, e.answers, e.submitted ? -1 : currentPage(exam.questions, e.answers)) : e.answers,
          score: hand && e.submitted ? markPaper(exam.questions, e.answers, e.marks ?? {}).score : e.score,
          ...(hand && e.submitted ? { marking: { left: pagesToMark(exam.questions, e.answers, e.marks ?? {}, true).length, pages: exam.questions.length } } : {}),
        } : null };
        if (e && !e.submitted && exam.status === "open") out.paper = learnerPaper(exam.id, me.id, exam.questions, exam.inOrder);
        if (e && exam.status === "closed") { const m = markPaper(exam.questions, e.answers);
          out.analysis = { score: m.score, total: m.total, right: m.right.filter(Boolean).length, wrong: m.right.filter((x) => !x).length, blank: 0, average: 75, best: 100, takers: 4, position: 1, flags: e.flags }; out.review = exam.questions.map((q, i) => ({ q: shownQ(q), kind: q.kind, options: q.options, answer: q.answer, given: e.answers[String(i)] ?? null, right: m.right[i], marks: q.marks })); }
        return r.fulfill({ json: out });
      }
      const b = JSON.parse(r.request().postData() ?? "{}");
      if (b.action === "ai") return r.fulfill({ json: { questions: [
        { q: `${b.topic}: which gas do plants take in?`, kind: "choice", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 1, marks: 1 },
        { q: `${b.topic}: what colour is chlorophyll?`, kind: "typed", options: [], answer: "green", marks: 1 },
      ].slice(0, b.count) } });
      if (b.action === "create") { exam = { id: "exam-1", title: b.title, minutes: b.minutes, review: b.review, calculator: b.calculator !== false, inOrder: b.inOrder === true, status: "open", endsAt: Date.now() + b.minutes * 60_000, questions: cleanExamQuestions(b.questions) }; return r.fulfill({ json: { id: exam.id } }); }
      if (b.action === "close") { close(); return r.fulfill({ json: { ok: true } }); }
      if (b.action === "page-view" || b.action === "mark") {
        const t = entries.get(b.studentId)!;
        if (b.action === "page-view") { const pa = cleanPageAnswer(t.answers[String(b.n)]); return r.fulfill({ json: { ...pa, done: true, mark: t.marks?.[String(b.n)] ?? null } }); }
        t.marks = { ...(t.marks ?? {}), [String(b.n)]: b.mark };
        return r.fulfill({ json: { ok: true } });
      }
      if (b.action === "start") { entries.set(me.id, { name: me.name, answers: {}, flags: 0, submitted: false, score: null, total: null }); return r.fulfill({ json: { ok: true } }); }
      const e = entries.get(me.id)!;
      if (b.action === "answer" || b.action === "page-done") {
        if (exam!.questions[b.n]?.kind === "page") {
          if (pageDone(e.answers[String(b.n)])) return r.fulfill({ status: 409, json: { error: "You've handed in that page." } });
          e.answers[String(b.n)] = { ...cleanPageAnswer(b.value), ...(b.action === "page-done" ? { done: new Date().toISOString() } : {}) };
        } else e.answers[String(b.n)] = b.value;
        return r.fulfill({ json: { ok: true } });
      }
      if (b.action === "flag") { e.flags++; return r.fulfill({ json: { ok: true } }); }
      if (b.action === "submit") { const m = markPaper(exam!.questions, e.answers); Object.assign(e, { submitted: true, score: m.score, total: m.total }); return r.fulfill({ json: { ok: true, score: m.score, total: m.total } }); }
      return r.fulfill({ json: {} });
    });
  };
}

// Paper pages upload to (stand-in) storage.
async function storage(ctx: BrowserContext) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  let n = 0;
  await ctx.route("**/api/live-sessions/slides", (r) => {
    const { count } = JSON.parse(r.request().postData() ?? "{}");
    r.fulfill({ json: { uploads: Array.from({ length: count }, () => { const path = `slides/${SID}/paper-${++n}.jpg`; return { path, token: "t", url: `${base}/storage/v1/object/public/materials/${path}` }; }) } });
  });
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };
  await ctx.route("**/storage/v1/object/upload/sign/**", (r) => r.fulfill(r.request().method() === "OPTIONS" ? { status: 204, headers: cors } : { status: 200, headers: cors, json: { Key: "x" } }));
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors, body: '<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754"><rect width="100%" height="100%" fill="#fff"/><text x="80" y="200" font-size="60">1  Circle the greatest number.</text></svg>' }));
}

async function openClass(browser: Browser) {
  const hub = realtimeHub(), server = classServer(), exams = examServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 820 }, isMobile: true, hasTouch: true } : {});
    await hub.attach(ctx, who); await server.attach(ctx, who); await exams(ctx, who); await storage(ctx);
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
  await panel.getByText("🧮 Calculator allowed").click(); // no calculator in this test
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 10 min\)/ }).click();

  // The learner's phone: the rules, then the paper.
  const exam = learner.getByRole("dialog", { name: "Exam: Algebra check" });
  await expect(exam.getByRole("button", { name: "Start the exam" })).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText(/Leaving this page is reported/)).toBeVisible();
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(exam.getByText("🚫🧮 No calculator")).toBeVisible();
  await expect(exam.getByRole("button", { name: "🧮 Calculator" })).toHaveCount(0);
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
  await expect(panel.getByRole("table").getByText("Handed in", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByRole("cell", { name: "3 / 3" })).toBeVisible();
  await expect(panel.getByText("⚠ 1×")).toBeVisible();
  await panel.screenshot({ path: "test-results/exam-teacher.png" });

  // The learner goes back to the class while others finish: a button brings the exam back.
  await exam.getByRole("button", { name: "Back to the class" }).click();
  await expect(learner.getByRole("button", { name: "📝 My exam" })).toBeVisible();

  // Ending the exam opens the learner's results at once: the analysis and the right answers.
  await panel.getByRole("button", { name: "End exam" }).click();
  const results = exam.getByRole("region", { name: "Your exam results" });
  await expect(results).toBeVisible({ timeout: 20_000 });
  await expect(results.getByText("Class average: 75%")).toBeVisible();
  await expect(results.getByText("🏆 Top of the class")).toBeVisible();
  await expect(results.getByText(/You left the exam page 1 time/)).toBeVisible();
  await expect(exam.getByRole("list", { name: "Your answers" })).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText(/✓ \d\. What is 7 × 8\?/)).toBeVisible();
  await learner.screenshot({ path: "test-results/exam-learner.png", fullPage: true });
  // The teacher downloads the learner's report, and everyone's, as PDFs.
  const one = teacher.waitForEvent("download");
  await panel.getByRole("button", { name: /Download Emmanuel's report \(PDF\)/ }).click();
  const d1 = await one;
  expect(d1.suggestedFilename()).toMatch(/^Emmanuel - .+ report\.pdf$/);
  expect((await readFile((await d1.path())!)).subarray(0, 5).toString()).toBe("%PDF-");
  const all = teacher.waitForEvent("download");
  await panel.getByRole("button", { name: /Download all reports \(PDF\)/ }).click();
  expect((await all).suggestedFilename()).toMatch(/class reports\.pdf$/);
  // Done: the exam and its button are gone.
  await exam.getByRole("button", { name: /Done — back to the class/ }).click();
  await expect(exam).toBeHidden();
  await expect(learner.getByRole("button", { name: "📝 My exam" })).toHaveCount(0);
  await learner.waitForTimeout(11_000); // the next check for the exam doesn't bring it back
  await expect(learner.getByRole("dialog", { name: /Exam:/ })).toHaveCount(0);
});

test("KS2 SATs: a spelling test read aloud, phones following the teacher, graded as a scaled score", async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  const sats = panel.getByRole("region", { name: "KS2 SATs" });
  // A ready-made list fills the box; the teacher writes their own instead.
  await sats.getByRole("button", { name: /Spelling test/ }).click();
  await sats.getByRole("button", { name: /list A \(20\)/ }).click();
  await expect(sats.getByLabel("Spelling sentences")).toHaveValue(/We will \*achieve\* our goal/);
  await sats.getByLabel("Spelling sentences").fill("I did a *rough* sketch before starting my painting.\nThe complicated map caused a lot of *confusion*.\nBats are *nocturnal* animals.");
  await sats.getByRole("button", { name: "Add 3 spellings" }).click();
  await expect(sats.getByText(/✓ 3 spellings added/)).toBeVisible();
  await expect(panel.getByLabel("Title")).toHaveValue("Spelling test");
  await expect(panel.getByLabel("Spelling word 2")).toHaveValue("confusion");
  await expect(panel.getByLabel(/Same order for everyone/)).toBeChecked();
  await panel.getByRole("button", { name: /Start the exam \(3 questions, 15 min\)/ }).click();

  // The learner's phone: in order, the sentence with a gap, and they can hear it.
  const exam = learner.getByRole("dialog", { name: "Exam: Spelling test" });
  await expect(exam.getByText(/The questions are in order/)).toBeVisible({ timeout: 20_000 });
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(exam.getByText("I did a ________ sketch before starting my painting.")).toBeVisible();
  await expect(exam.getByRole("button", { name: "🔊 Hear the sentence" })).toBeVisible();
  await exam.getByLabel("The missing word").fill("rough");

  // The teacher reads spelling 3 — the phone goes to it.
  const reader = panel.getByRole("region", { name: "Read the spellings" });
  await expect(reader.getByText("rough", { exact: true })).toBeVisible({ timeout: 15_000 });
  await reader.getByRole("button", { name: "Read spelling 3" }).click();
  await expect(reader.getByText("nocturnal", { exact: true })).toBeVisible();
  await expect(exam.getByText("Bats are ________ animals.")).toBeVisible({ timeout: 10_000 });
  await exam.getByLabel("The missing word").fill("nocturnel");
  await panel.screenshot({ path: "test-results/sats-spelling-teacher.png" });
  await learner.screenshot({ path: "test-results/sats-spelling-learner.png" });
  await exam.getByRole("button", { name: "Question 2" }).click();
  await exam.getByLabel("The missing word").fill("confusion");
  await learner.waitForTimeout(900);
  await exam.getByRole("button", { name: "Hand in my exam" }).click();
  await expect(exam.getByText("2 / 3")).toBeVisible({ timeout: 15_000 });

  // Graded the SATs way: 67% is the expected standard.
  await expect(panel.getByRole("cell", { name: "2 / 3" })).toBeVisible({ timeout: 15_000 });
  await panel.getByLabel("Grading").selectOption("ks2");
  await expect(panel.getByRole("cell", { name: "EXS" })).toBeVisible();
  await panel.getByRole("button", { name: "End exam" }).click();
  await expect(exam.getByText(/✗ 3\. Bats are ________ animals\./)).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText("Answer: nocturnal")).toBeVisible();
});

test("KS2 SATs: an arithmetic paper, and a real paper uploaded as a PDF with its pages on the phone", async ({ browser }) => {
  test.setTimeout(150_000);
  const maker = await browser.newPage();
  await maker.setContent(["Key stage 2 Mathematics Paper 2", "1 Circle the greatest number. 2 How many tables?"].map((t, i) =>
    `<section style="height:100vh;${i === 0 ? "page-break-after:always;" : ""}font:40px sans-serif;padding:40px">${t}</section>`).join(""));
  const pdf = await maker.pdf({ format: "A4" });
  await maker.close();
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  const sats = panel.getByRole("region", { name: "KS2 SATs" });

  // Arithmetic: a whole paper at once, 30 minutes, no calculator.
  await sats.getByRole("button", { name: /Arithmetic paper/ }).click();
  await expect(panel.getByRole("button", { name: /Start the exam \(36 questions, 30 min\)/ })).toBeVisible();
  await expect(panel.getByLabel("Question 36", { exact: true })).toHaveValue(/=/);
  await expect(panel.getByLabel(/Calculator allowed/)).not.toBeChecked();
  await panel.getByRole("button", { name: "Clear all questions" }).click();

  // A real paper: upload the PDF, then a question for each answer on a page.
  await sats.getByLabel("Upload a SATs paper").setInputFiles({ name: "ks2-mathematics-2022-paper-2.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(sats.getByText(/✓ \d pages ready/)).toBeVisible({ timeout: 60_000 });
  await sats.getByRole("button", { name: "⚡ Answer boxes, marked automatically" }).click();
  await sats.getByRole("button", { name: "Add a question on page 2" }).click();
  await sats.getByRole("button", { name: "Add a question on page 2" }).click();
  await expect(panel.getByLabel("Question 2", { exact: true })).toHaveValue("Question 2");
  await panel.getByLabel("Answer to question 1").fill("9,215,300");
  // Forgetting an answer is caught before the exam starts.
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 40 min\)/ }).click();
  await expect(panel.getByText(/Question 2 has no answer yet/)).toBeVisible();
  await panel.getByLabel("Answer to question 2").fill("5");
  await sats.screenshot({ path: "test-results/sats-builder.png" });
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 40 min\)/ }).click();

  const exam = learner.getByRole("dialog", { name: /^Exam: ks2 mathematics 2022 paper 2/ });
  await expect(exam.getByRole("button", { name: "Start the exam" })).toBeVisible({ timeout: 20_000 });
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(exam.getByText("Question 1 of 2")).toBeVisible();
  await expect(exam.getByRole("img", { name: "The page for Question 1" })).toBeVisible();
  await learner.screenshot({ path: "test-results/sats-paper-learner.png" });
  // The page opens bigger to read.
  await exam.getByRole("button", { name: /tap to see it bigger/ }).click();
  await expect(learner.getByRole("dialog", { name: "The page for Question 1" })).toBeVisible();
  await learner.getByRole("button", { name: "Close" }).click();
  await exam.getByLabel("Your answer").fill("9215300");
  await exam.getByRole("button", { name: "Next →" }).click();
  await exam.getByLabel("Your answer").fill("5");
  await learner.waitForTimeout(900);
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await expect(exam.getByText("2 / 2")).toBeVisible({ timeout: 15_000 });
});

test("a paper the teacher marks by hand: learners write page by page, each page is locked, the teacher marks as they come in", async ({ browser }) => {
  test.setTimeout(150_000);
  const maker = await browser.newPage();
  await maker.setContent(["Cover", "1 Circle the greatest number.", "2 How many tables?", "End of test"].map((t, i) =>
    `<section style="height:1000px;${i < 3 ? "page-break-after:always;" : ""}font:40px sans-serif;padding:40px">${t}</section>`).join(""));
  const pdf = await maker.pdf({ format: "A4" });
  await maker.close();
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  const sats = panel.getByRole("region", { name: "KS2 SATs" });
  await sats.getByLabel("Upload a SATs paper").setInputFiles({ name: "Reasoning paper.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(sats.getByText(/✓ \d pages ready\. Set the marks for each page/)).toBeVisible({ timeout: 60_000 });
  await expect(sats.getByRole("button", { name: "✍️ I mark each page myself" })).toHaveAttribute("aria-pressed", "true");
  // Pages 2 and 3 are in the test (2 and 3 marks); the cover and the last page aren't.
  for (let k = 0; k < 2; k++) await sats.getByRole("button", { name: "More marks for page 2" }).click();
  for (let k = 0; k < 3; k++) await sats.getByRole("button", { name: "More marks for page 3" }).click();
  await expect(sats.getByText("2 pages · 5 marks")).toBeVisible();
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 40 min\)/ }).click();

  // The learner: page 1 of 2 — write on it, type, hand it in.
  const exam = learner.getByRole("dialog", { name: "Exam: Reasoning paper" });
  await expect(exam.getByText(/You can't go back to a page/)).toBeVisible({ timeout: 20_000 });
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(exam.getByText("Page 1 of 2 · 2 marks")).toBeVisible();
  const canvas = exam.getByRole("img", { name: "Write on the page" });
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await learner.mouse.move(box.x + 60, box.y + 80); await learner.mouse.down();
  for (let k = 1; k <= 8; k++) await learner.mouse.move(box.x + 60 + k * 15, box.y + 80 + (k % 2) * 12);
  await learner.mouse.up();
  await exam.getByLabel(/Or type your answers/).fill("9,215,300");
  await expect(exam.getByText("✓ Saved")).toBeVisible({ timeout: 10_000 });
  await exam.getByRole("button", { name: "Hand in page 1 →" }).click();
  await expect(exam.getByText("Page 2 of 2 · 3 marks")).toBeVisible();
  await expect(exam.getByLabel("Page 1, handed in")).toHaveText("🔒");
  await expect(exam.getByLabel(/Or type your answers/)).toHaveValue(""); // a fresh page

  // The teacher marks page 1 straight away, with the learner's writing on it.
  const desk = panel.getByRole("region", { name: "Marking" });
  await expect(desk.getByText("✍️ Marking · 1 page waiting")).toBeVisible({ timeout: 15_000 });
  await expect(desk.getByRole("paragraph").filter({ hasText: /^Emmanuel$/ })).toBeVisible();
  await expect(desk.getByText("9,215,300")).toBeVisible();
  await expect(desk.getByRole("img", { name: "Their writing" })).toBeVisible();
  await teacher.screenshot({ path: "test-results/hand-marking-teacher.png" });
  await desk.getByRole("button", { name: "2 marks" }).click();
  await expect(desk.getByText("✍️ Marking · nothing waiting")).toBeVisible({ timeout: 10_000 });

  // The last page: hand it in and finish. The score shows what's marked so far.
  await exam.getByLabel(/Or type your answers/).fill("5 tables");
  await learner.screenshot({ path: "test-results/hand-marking-learner.png" });
  await exam.getByRole("button", { name: /Hand in the last page & finish/ }).click();
  await expect(exam.getByText("Handed in ✓")).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText("2 / 5")).toBeVisible();
  await expect(exam.getByText(/1 page still to mark/)).toBeVisible();

  // The teacher marks page 2: the marks add up.
  await expect(desk.getByText("✍️ Marking · 1 page waiting")).toBeVisible({ timeout: 15_000 });
  await expect(desk.getByText("5 tables")).toBeVisible();
  await desk.getByRole("button", { name: "1 mark", exact: true }).click();
  await expect(panel.getByRole("cell", { name: /3 \/ 5/ })).toBeVisible({ timeout: 15_000 });
  // Look again and change a mark from the learner's pages.
  await desk.getByText("Each learner's pages").click();
  await desk.getByRole("button", { name: "Emmanuel, page 2: 1 of 3" }).click();
  await expect(desk.getByText("Marked 1 / 3 — change it:")).toBeVisible();
  await desk.getByRole("button", { name: "3 marks" }).click();
  await expect(panel.getByRole("cell", { name: /5 \/ 5/ })).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText("5 / 5")).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText(/marked every page/)).toBeVisible();
});
