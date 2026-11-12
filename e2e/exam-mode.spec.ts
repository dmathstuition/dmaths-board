import { readFile } from "fs/promises";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";
import { keptOf, redoExtraMs, redoPaper, triesOf, withoutTries } from "../lib/examRedo";
import { cleanExamQuestions, cleanPageAnswer, currentPage, isHandMarked, keepsOrder, learnerPaper, markPaper, needsMarking, pageDone, pagesToMark, shownQ, slimAnswers, workingKey, type ExamQ } from "../lib/exams";

// Exam mode with a stand-in for /api/board/exams that keeps the exam in memory
// and marks with the real marking code.
const OWN_WORD: ExamQ = { q: "It is necessary to wear a helmet.", kind: "spell", options: [], answer: "necessary", marks: 1, hear: true };
function examServer() {
  let exam: { booklet: string[]; id: string; title: string; minutes: number; review: boolean; calculator: boolean; inOrder: boolean; personal: number; status: "open" | "closed"; endsAt: number; questions: ExamQ[] } | null = null;
  type E = { name: string; answers: Record<string, unknown>; flags: number; submitted: boolean; score: number | null; total: number | null; marks?: Record<string, number>; extraMs: number; extraQs: ExamQ[] };
  const entries = new Map<string, E>();
  const qsOf = (e: E) => [...exam!.questions, ...e.extraQs];
  const meta = () => exam && { booklet: exam.booklet, id: exam.id, title: exam.title, minutes: exam.minutes, review: exam.review, calculator: exam.calculator, inOrder: keepsOrder(exam.questions, exam.inOrder), handMarked: isHandMarked(exam.questions), personal: exam.personal, spelling: exam.questions.some((q) => q.kind === "spell"), status: exam.status, endsAt: exam.endsAt, count: exam.questions.length, total: exam.questions.reduce((s, q) => s + q.marks, 0) };
  const close = () => { if (!exam) return; exam.status = "closed"; for (const e of entries.values()) if (!e.submitted) { const m = markPaper(qsOf(e), e.answers, e.marks ?? {}); Object.assign(e, { submitted: true, score: m.score, total: m.total }); } };
  return async (ctx: BrowserContext, who: "teacher" | "learner", me = { id: "33333333-3333-4333-8333-333333333333", name: "Emmanuel" }) => {
    await ctx.route("**/api/board/exams**", async (r) => {
      if (r.request().method() === "GET") {
        if (new URL(r.request().url()).searchParams.get("warmups") === "1") return r.fulfill({ json: { rows: [
          { at: "2026-11-02T09:00:00Z", name: "Emmanuel", score: 5, total: 10, secs: 540 }, { at: "2026-11-03T09:00:00Z", name: "Emmanuel", score: 6, total: 10, secs: 500 },
          { at: "2026-11-04T09:00:00Z", name: "Emmanuel", score: 6, total: 10, secs: 470 }, { at: "2026-11-05T09:00:00Z", name: "Emmanuel", score: 9, total: 10, secs: 400 },
          { at: "2026-11-02T09:00:00Z", name: "Grace", score: 8, total: 10, secs: 300 },
        ] } });
        if (!exam) return r.fulfill({ json: { exam: null } });
        const hand = needsMarking(exam.questions);
        if (who === "teacher") return r.fulfill({ json: { exam: { ...meta(), questions: exam.questions }, entries: [...entries].map(([id, e]) => {
          const qs = qsOf(e), m = markPaper(qs, e.answers, e.marks ?? {});
          return { id, name: e.name, extraMs: e.extraMs, ...(e.extraQs.length ? { extraQs: e.extraQs } : {}), answered: Object.keys(e.answers).filter((k) => /^\d+$/.test(k)).length, flags: e.flags, flagLog: [], submitted: e.submitted, score: e.submitted ? m.score : null, total: m.total, live: e.submitted ? null : m.score,
            answers: hand ? slimAnswers(qs, withoutTries(e.answers)) : withoutTries(e.answers), tries: triesOf(e.answers), startedAt: new Date(Date.now() - 300_000).toISOString(), submittedAt: e.submitted ? new Date().toISOString() : null,
            ...(hand ? { pageMarks: e.marks ?? {}, toMark: pagesToMark(qs, e.answers, e.marks ?? {}, e.submitted) } : {}) };
        }) } });
        const e = entries.get(me.id);
        if (!e && exam.status === "closed") return r.fulfill({ json: { exam: null } });
        const qs = e ? qsOf(e) : exam.questions;
        const tries = triesOf(e?.answers), last = tries[tries.length - 1];
        const out: any = { exam: meta(), entry: e ? {
          started: true, submitted: e.submitted, flags: e.flags, extraMs: e.extraMs, total: markPaper(qs, e.answers).total,
          attempt: tries.length + 1, ...(last ? { lastTry: { score: last.score, total: last.total, mode: last.mode }, keep: keptOf(e.answers) } : {}),
          answers: isHandMarked(qs) ? slimAnswers(qs, withoutTries(e.answers), e.submitted ? -1 : currentPage(qs, e.answers)) : withoutTries(e.answers),
          score: e.submitted ? markPaper(qs, e.answers, e.marks ?? {}).score : null,
          ...(hand && e.submitted ? { marking: { left: pagesToMark(qs, e.answers, e.marks ?? {}, true).length, pages: qs.filter((q) => q.kind === "page").length } } : {}),
        } : null };
        if (e && !e.submitted && exam.status === "open") { out.paper = learnerPaper(exam.id, tries.length ? `${me.id}:${tries.length}` : me.id, qs, exam.inOrder); out.personalFrom = exam.questions.length; }
        if (e && exam.status === "closed") { const m = markPaper(qs, e.answers, e.marks ?? {});
          out.analysis = { score: m.score, total: m.total, right: m.right.filter(Boolean).length, wrong: m.right.filter((x) => !x).length, blank: 0, average: 75, best: 100, takers: 4, position: 1, flags: e.flags }; out.review = qs.map((q, i) => ({ q: shownQ(q), kind: q.kind, options: q.options, answer: q.answer, given: e.answers[String(i)] ?? null, right: m.right[i], marks: q.marks })); }
        return r.fulfill({ json: out });
      }
      const b = JSON.parse(r.request().postData() ?? "{}");
      if (b.action === "ai") return r.fulfill({ json: { questions: [
        { q: `${b.topic}: which gas do plants take in?`, kind: "choice", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], answer: 1, marks: 1 },
        { q: `${b.topic}: what colour is chlorophyll?`, kind: "typed", options: [], answer: "green", marks: 1 },
      ].slice(0, b.count) } });
      if (b.action === "create") { const questions = cleanExamQuestions(b.questions); exam = { booklet: Array.isArray(b.booklet) ? b.booklet : [], id: "exam-1", title: b.title, minutes: b.minutes, review: b.review, calculator: b.calculator !== false, inOrder: b.inOrder === true, personal: questions.some((q) => q.kind === "spell") ? Number(b.personal) || 0 : 0, status: "open", endsAt: Date.now() + b.minutes * 60_000, questions }; return r.fulfill({ json: { id: exam.id } }); }
      if (b.action === "close") { close(); return r.fulfill({ json: { ok: true } }); }
      if (b.action === "wipe-paper") {
        const n = exam!.questions.filter((q) => q.img).length;
        exam!.questions = exam!.questions.map(({ img: _img, ...q }) => q);
        return r.fulfill({ json: { ok: true, removed: n, kept: 0 } });
      }
      if (b.action === "redo") {
        let sent = 0;
        for (const id of b.studentIds ?? []) {
          const t = entries.get(id); if (!t?.submitted) continue;
          const next = redoPaper(qsOf(t), t.answers, t.marks ?? {}, b.mode === "wrong" ? "wrong" : "fresh", new Date().toISOString(), t.flags);
          Object.assign(t, { answers: next.answers, marks: next.marks, submitted: false, score: null, total: null, flags: 0, extraMs: redoExtraMs(Date.now(), b.minutes, exam!.endsAt, t.extraMs) });
          sent++;
        }
        if (sent && exam!.status === "closed") exam!.status = "open";
        return r.fulfill({ json: { ok: true, sent, writing: [], mode: b.mode, minutes: b.minutes } });
      }
      if (b.action === "collect") {
        const t = entries.get(b.studentId)!;
        if (!t.submitted) { const m = markPaper(qsOf(t), t.answers, t.marks ?? {}); Object.assign(t, { submitted: true, score: m.score, total: m.total }); }
        return r.fulfill({ json: { ok: true, score: t.score, total: t.total } });
      }
      if (b.action === "extra") { const t = entries.get(b.studentId)!; t.extraMs = b.on === false ? 0 : Math.round(exam!.minutes * 0.25 * 60_000); return r.fulfill({ json: { ok: true, extraMs: t.extraMs } }); }
      if (b.action === "page-view" || b.action === "mark") {
        const t = entries.get(b.studentId)!, q = qsOf(t)[b.n];
        if (b.action === "page-view") {
          const pa = cleanPageAnswer(t.answers[q.kind === "page" ? String(b.n) : workingKey(b.n)]);
          return r.fulfill({ json: { ink: pa.ink, text: q.kind === "page" ? pa.text : String(t.answers[String(b.n)] ?? ""), done: true, mark: t.marks?.[String(b.n)] ?? null } });
        }
        t.marks = { ...(t.marks ?? {}), [String(b.n)]: b.mark };
        return r.fulfill({ json: { ok: true } });
      }
      if (b.action === "start") { entries.set(me.id, { name: me.name, answers: {}, flags: 0, submitted: false, score: null, total: null, extraMs: 0, extraQs: exam!.personal ? [OWN_WORD] : [] }); return r.fulfill({ json: { ok: true } }); }
      const e = entries.get(me.id)!;
      if (b.action === "working") { e.answers[workingKey(b.n)] = { ink: cleanPageAnswer(b.value).ink }; return r.fulfill({ json: { ok: true } }); }
      if (b.action === "answer" || b.action === "page-done") {
        if (keptOf(e.answers).includes(b.n)) return r.fulfill({ status: 409, json: { error: "You got that one right last time — it's kept." } });
        if (qsOf(e)[b.n]?.kind === "page") {
          if (pageDone(e.answers[String(b.n)])) return r.fulfill({ status: 409, json: { error: "You've handed in that page." } });
          e.answers[String(b.n)] = { ...cleanPageAnswer(b.value), ...(b.action === "page-done" ? { done: new Date().toISOString() } : {}) };
        } else e.answers[String(b.n)] = b.value;
        return r.fulfill({ json: { ok: true } });
      }
      if (b.action === "flag") { e.flags++; return r.fulfill({ json: { ok: true } }); }
      if (b.action === "submit") { const m = markPaper(qsOf(e), e.answers, e.marks ?? {}); Object.assign(e, { submitted: true, score: m.score, total: m.total }); return r.fulfill({ json: { ok: true, score: m.score, total: m.total } }); }
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
  // A moment's blur (a keyboard, a notification) isn't leaving…
  await learner.evaluate(() => { window.dispatchEvent(new Event("blur")); setTimeout(() => window.dispatchEvent(new Event("focus")), 300); });
  await learner.waitForTimeout(3000);
  await expect(exam.getByText(/You left the exam page/)).toHaveCount(0);
  // …but going to another app or tab is reported.
  await learner.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });
  await expect(exam.getByText(/You left the exam page/)).toBeVisible();
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
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
  // After the class's words: one they got wrong before, heard on their own phone.
  await exam.getByRole("button", { name: "Question 4" }).click();
  await expect(exam.getByText("⭐ Your own word — listen on your phone")).toBeVisible();
  await expect(exam.getByText("It is ________ to wear a helmet.")).toBeVisible();
  await expect(exam.getByRole("button", { name: "🔊 Hear the sentence" })).toBeVisible();
  await exam.getByLabel("The missing word").fill("necessary");
  await learner.waitForTimeout(900);
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  await expect(exam.getByText("3 / 4")).toBeVisible({ timeout: 15_000 });

  // Graded the SATs way: 75% is the expected standard.
  await expect(panel.getByRole("cell", { name: "3 / 4" })).toBeVisible({ timeout: 15_000 });
  await panel.getByLabel("Grading").selectOption("ks2");
  await expect(panel.getByRole("cell", { name: "EXS" })).toBeVisible();
  await panel.getByRole("button", { name: "End exam" }).click();
  await expect(exam.getByText(/✗ 3\. Bats are ________ animals\./)).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText("Answer: nocturnal")).toBeVisible();
  await expect(exam.getByRole("button", { name: "✏️ Practise my spellings" })).toBeVisible();
});

test("extra time for one learner, and a method mark for working on a long multiplication", async ({ browser }) => {
  test.setTimeout(150_000);
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  // Extra time for this learner is remembered and given when they start.
  await panel.getByPlaceholder(/Names, separated by commas/).fill("Grace, emmanuel");
  await panel.getByLabel("Title").fill("Long multiplication");
  await panel.getByRole("button", { name: "10 min", exact: true }).click();
  await panel.getByRole("button", { name: "+ Typed-answer question" }).click();
  await panel.getByLabel("Question 1", { exact: true }).fill("2,416 × 37 =");
  await panel.getByLabel("Answer to question 1").fill("89392");
  await panel.getByLabel("Marks for question 1").selectOption("2");
  await panel.getByLabel("Method mark for question 1").check();
  await panel.getByRole("button", { name: "+ Typed-answer question" }).click();
  await panel.getByLabel("Question 2", { exact: true }).fill("9 × 8 =");
  await panel.getByLabel("Answer to question 2").fill("72");
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 10 min\)/ }).click();

  const exam = learner.getByRole("dialog", { name: "Exam: Long multiplication" });
  await expect(exam.getByRole("button", { name: "Start the exam" })).toBeVisible({ timeout: 20_000 });
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await expect(panel.getByRole("button", { name: "Extra time for Emmanuel" })).toHaveText("⏱ +2.5 min", { timeout: 15_000 });
  await expect(exam.getByText("+ extra time")).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByRole("timer")).toContainText(/1[12]:\d\d/);
  // A wrong answer, with working shown.
  for (let i = 0; i < 2; i++) {
    if (await exam.getByText("2,416 × 37 =").isVisible()) {
      await exam.getByLabel("Your answer").fill("89000");
      const pad = exam.getByRole("img", { name: "Write on the page" });
      const box = (await pad.boundingBox())!;
      await learner.mouse.move(box.x + 30, box.y + 30); await learner.mouse.down();
      for (let k = 1; k <= 6; k++) await learner.mouse.move(box.x + 30 + k * 20, box.y + 40);
      await learner.mouse.up();
      await expect(exam.getByText("✓ Saved")).toBeVisible({ timeout: 10_000 });
    } else await exam.getByLabel("Your answer").fill("72");
    if (i === 0) await exam.getByRole("button", { name: "Next →" }).click();
  }
  await learner.waitForTimeout(900);
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  await expect(exam.getByText("1 / 3")).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText(/1 page still to mark|still to mark/)).toBeVisible();

  // The teacher sees the working and gives the method mark.
  const desk = panel.getByRole("region", { name: "Marking" });
  await expect(desk.getByText("Method mark for the working:")).toBeVisible({ timeout: 15_000 });
  await expect(desk.getByText("89000")).toBeVisible();
  await expect(desk.getByRole("img", { name: "Their writing" })).toBeVisible();
  await teacher.screenshot({ path: "test-results/method-mark-teacher.png" });
  await desk.getByRole("button", { name: "1 mark", exact: true }).click();
  await expect(desk.getByText("✍️ Marking · nothing waiting")).toBeVisible({ timeout: 10_000 });
  await expect(panel.getByRole("cell", { name: /2 \/ 3/ })).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText("2 / 3")).toBeVisible({ timeout: 20_000 });
});

test("the daily warm-up, and the tracker of each learner's warm-ups", async ({ browser }) => {
  const { teacher } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  const sats = panel.getByRole("region", { name: "KS2 SATs" });
  await sats.getByRole("button", { name: /Daily warm-up/ }).click();
  await expect(panel.getByRole("button", { name: /Start the exam \(10 questions, 10 min\)/ })).toBeVisible();
  await expect(panel.getByLabel("Title")).toHaveValue(/^Warm-up \d{1,2} [A-Z][a-z]{2}$/);
  await sats.getByRole("button", { name: "📈 Warm-up tracker" }).click();
  const tracker = sats.getByRole("region", { name: "Warm-up tracker" });
  const row = tracker.getByRole("row", { name: /Emmanuel/ });
  await expect(row).toContainText("65%");
  await expect(row).toContainText("▲");
  await expect(row.getByTitle(/90% in 6:40/)).toHaveText("9");
  await expect(tracker.getByRole("row", { name: /Grace/ })).toContainText("80%");
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
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
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
  await expect(learner.getByRole("alertdialog")).toContainText("You can't go back to it");
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
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
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  // Handing pages in is not leaving the exam.
  await expect(exam.getByText(/You left the exam page/)).toHaveCount(0);
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

  // Marking done: end the exam and delete the uploaded paper. The marks stay.
  await panel.getByRole("button", { name: "End exam" }).click();
  await panel.getByRole("button", { name: "🗑 Delete the paper (2 pages)" }).click();
  await expect(panel.getByText(/The paper is deleted \(2 pages\)\. Marks and scores are kept\./)).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByRole("button", { name: /Delete the paper/ })).toHaveCount(0);
  await expect(panel.getByRole("cell", { name: /5 \/ 5/ })).toBeVisible();
  await desk.getByRole("button", { name: "Emmanuel, page 2: 3 of 3" }).click();
  await expect(desk.getByText(/pages were deleted — only what was typed is left/)).toBeVisible();
});

test("a reading paper: the booklet beside the questions (tabs on a phone), written answers marked on the desk", async ({ browser }) => {
  test.setTimeout(150_000);
  const maker = await browser.newPage();
  await maker.setContent(["The Lost Key — a story", "Sam looked under the mat…"].map((t, i) =>
    `<section style="height:1000px;${i === 0 ? "page-break-after:always;" : ""}font:40px serif;padding:40px">${t}</section>`).join(""));
  const pdf = await maker.pdf({ format: "A4" });
  await maker.close();
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  const sats = panel.getByRole("region", { name: "KS2 SATs" });
  await sats.getByLabel("Upload the reading booklet").setInputFiles({ name: "reading booklet.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(sats.getByText(/✓ Reading booklet ready \(\d pages\)/)).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByLabel("Title")).toHaveValue("Reading paper");
  // A 3-mark written answer with the teacher's notes, and a tick-one question.
  await panel.getByRole("button", { name: "+ Written answer (you mark it)" }).click();
  await panel.getByLabel("Question 1", { exact: true }).fill("Why did Sam hide the key? Give two reasons from the text.");
  await panel.getByLabel("Marks for question 1").selectOption("3");
  await panel.getByLabel("Mark scheme notes for question 1").fill("1 mark per reason; 1 for using the text");
  await panel.getByRole("button", { name: "+ Multiple-choice question" }).click();
  await panel.getByLabel("Question 2", { exact: true }).fill("Where was the key?");
  for (const [k, v] of ["Under the mat", "In a drawer"].entries()) await panel.getByLabel(`Question 2, option ${k + 1}`).fill(v);
  for (const k of [3, 4]) await panel.getByLabel(`Question 2, option ${k}`).fill(`Option ${k}`);
  await panel.getByLabel("Option 1 is the answer").check();
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 60 min\)/ }).click();

  // On a phone: a tab for the booklet, one for the questions.
  const exam = learner.getByRole("dialog", { name: "Exam: Reading paper" });
  await expect(exam.getByRole("button", { name: "Start the exam" })).toBeVisible({ timeout: 20_000 });
  await exam.getByRole("button", { name: "Start the exam" }).click();
  await exam.getByRole("tab", { name: "📖 Reading booklet" }).click();
  await expect(exam.getByRole("img", { name: "Reading booklet, page 1" })).toBeVisible();
  await expect(exam.getByText("Why did Sam hide the key?", { exact: false })).toBeHidden();
  await learner.screenshot({ path: "test-results/reading-phone-booklet.png" });
  await exam.getByRole("tab", { name: "✍️ Questions" }).click();
  await expect(exam.getByText(/Why did Sam hide the key\?/)).toBeVisible();
  await exam.getByLabel(/Your answer \(3 marks/).fill("She was scared the dog would find it, and the text says she wanted to keep it safe.");
  // On a tablet: side by side.
  await learner.setViewportSize({ width: 1100, height: 800 });
  await expect(exam.getByRole("img", { name: "Reading booklet, page 1" })).toBeVisible();
  await expect(exam.getByText(/Why did Sam hide the key\?/)).toBeVisible();
  await expect(exam.getByRole("tab", { name: "📖 Reading booklet" })).toBeHidden();
  await learner.screenshot({ path: "test-results/reading-tablet.png" });
  await learner.waitForTimeout(900);
  await exam.getByRole("button", { name: "Next →" }).click();
  await exam.getByRole("radio", { name: /Under the mat/ }).click();
  await exam.getByRole("button", { name: "Hand in", exact: true }).click();
  await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  await expect(exam.getByText("1 / 4")).toBeVisible({ timeout: 15_000 });

  // The teacher marks the written answer with their notes beside it.
  const desk = panel.getByRole("region", { name: "Marking" });
  await expect(desk.getByText("Q1 · written answer, out of 3 marks")).toBeVisible({ timeout: 15_000 });
  await expect(desk.getByLabel("Emmanuel's answer")).toContainText("scared the dog would find it");
  await expect(desk.getByText("1 mark per reason; 1 for using the text")).toBeVisible();
  await teacher.screenshot({ path: "test-results/reading-marking.png" });
  await desk.getByRole("button", { name: "2 marks" }).click();
  await expect(panel.getByRole("cell", { name: /3 \/ 4/ })).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText("3 / 4")).toBeVisible({ timeout: 20_000 });
});

test("send a learner back to redo: only the wrong ones (right answers kept), a message to everyone, then the whole paper again after it ended", async ({ browser }) => {
  test.setTimeout(150_000);
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Exam mode" }).click();
  const panel = teacher.getByRole("dialog", { name: "Exam mode" });
  await panel.getByLabel("Title").fill("Redo check");
  await panel.getByRole("button", { name: "10 min", exact: true }).click();
  await panel.getByRole("button", { name: "+ Multiple-choice question" }).click();
  await panel.getByLabel("Question 1", { exact: true }).fill("What is 7 × 8?");
  for (const [k, v] of ["54", "56", "58", "64"].entries()) await panel.getByLabel(`Question 1, option ${k + 1}`).fill(v);
  await panel.getByLabel("Option 2 is the answer").check();
  await panel.getByRole("button", { name: "+ Typed-answer question" }).click();
  await panel.getByLabel("Question 2", { exact: true }).fill("Solve 3x + 2 = 14");
  await panel.getByLabel("Answer to question 2").fill("4");
  await panel.getByLabel("Marks for question 2").selectOption("2");
  await panel.getByRole("button", { name: /Start the exam \(2 questions, 10 min\)/ }).click();

  // First try: the multiple choice right, the equation wrong.
  const exam = learner.getByRole("dialog", { name: "Exam: Redo check" });
  await exam.getByRole("button", { name: "Start the exam" }).click({ timeout: 20_000 });
  const answerBoth = async (typed: string) => {
    for (let i = 0; i < 2; i++) {
      await expect(exam.getByText(new RegExp(`Question ${i + 1} of 2`))).toBeVisible({ timeout: 15_000 });
      if (await exam.getByText("What is 7 × 8?").isVisible()) { if (!(await exam.getByText(/it.s kept/).isVisible())) await exam.getByRole("radio", { name: /56/ }).click(); }
      else await exam.getByLabel("Your answer").fill(typed);
      if (i === 0) await exam.getByRole("button", { name: "Next →" }).click();
    }
    await learner.waitForTimeout(900);
    await exam.getByRole("button", { name: "Hand in", exact: true }).click();
    await learner.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  };
  await answerBoth("5");
  await expect(exam.getByText("1 / 3")).toBeVisible({ timeout: 15_000 });

  // The teacher: question by question, hardest first — pick who missed it, send them back.
  await expect(panel.getByRole("cell", { name: "1 / 3" })).toBeVisible({ timeout: 15_000 });
  const breakdown = panel.getByRole("region", { name: "Question by question" });
  await expect(breakdown.getByText(/^0% right/)).toBeVisible();
  await expect(breakdown.getByRole("listitem").first()).toContainText("Q2");
  await breakdown.getByRole("button", { name: "Pick the 1 who missed it" }).click();
  await expect(panel.getByLabel("Pick Emmanuel")).toBeChecked();
  await panel.getByRole("button", { name: "🔁 Send 1 back to redo" }).click();
  const sheet = teacher.getByRole("dialog", { name: "Send back to redo" });
  await expect(sheet.getByRole("radio", { name: /Only the ones they got wrong/ })).toHaveAttribute("aria-checked", "true");
  await sheet.getByRole("button", { name: "5 min" }).click();
  await expect(sheet.getByText(/or the rest of the exam, if that.s longer/)).toBeVisible();
  await sheet.screenshot({ path: "test-results/exam-redo-sheet.png" });
  await sheet.getByRole("button", { name: "Send back" }).click();
  await expect(panel.getByText(/Emmanuel is doing it again — only the ones they got wrong, 5 min/)).toBeVisible();
  await expect(panel.getByText("🔁 Try 2")).toBeVisible();

  // A message to everyone taking it.
  await panel.getByLabel("Message to everyone taking the exam").fill("Question 2: x is a whole number");
  await panel.getByRole("button", { name: "📣 Send to everyone" }).click();

  // The phone: try 2, the right answer kept and locked, only the wrong one to fix.
  await expect(exam.getByText(/Try 2 — your teacher sent this back\. The one you got right is kept/)).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByText("📣 Your teacher: Question 2: x is a whole number")).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByRole("button", { name: /kept from last time/ })).toHaveCount(1);
  await expect(exam.getByRole("timer")).toContainText(/9:\d\d/); // the exam had longer left than the 5 minutes picked
  await learner.screenshot({ path: "test-results/exam-redo-learner.png" });
  await exam.getByRole("button", { name: "OK" }).click();
  await answerBoth("4");
  await expect(exam.getByText("3 / 3")).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText(/Try 2 · last time 1 \/ 3 — up 2/)).toBeVisible();

  // The teacher sees the new mark against the last one.
  await expect(panel.getByRole("cell", { name: /3 \/ 3.*was 1 \/ 3.*\+2/ })).toBeVisible({ timeout: 15_000 });
  await panel.screenshot({ path: "test-results/exam-redo-teacher.png" });

  // After it has ended: the whole paper again, then the teacher collects it.
  await panel.getByRole("button", { name: "End exam" }).click();
  await expect(panel.getByRole("button", { name: "New exam" })).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Send Emmanuel back to redo" }).click();
  await sheet.getByRole("radio", { name: /The whole paper again/ }).click();
  await expect(sheet.getByText(/The exam opens again just for them/)).toBeVisible();
  await sheet.getByRole("button", { name: "Send back" }).click();
  await expect(panel.getByRole("button", { name: "End exam" })).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText(/Try 3 — your teacher sent this back\. Start again from the top/)).toBeVisible({ timeout: 20_000 });
  await expect(exam.getByRole("button", { name: /kept from last time/ })).toHaveCount(0);
  await panel.getByRole("button", { name: "Hand in Emmanuel's paper now" }).click();
  await teacher.getByRole("alertdialog").getByRole("button", { name: "Yes, hand it in" }).click();
  await expect(panel.getByRole("cell", { name: /0 \/ 3.*was 3 \/ 3/ })).toBeVisible({ timeout: 15_000 });
  await expect(exam.getByText("Handed in ✓")).toBeVisible({ timeout: 20_000 });
});
