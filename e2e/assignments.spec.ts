import { test, expect, type BrowserContext, type Page, type Locator } from "@playwright/test";
import { SID, GID, agree, classServer, realtimeHub } from "./helpers";
import { canWork, cleanAnswer, cleanItems, isFor, isLate, itemMark, learnerItems, scoreOf, statusOf, type Assignment, type Entry } from "../lib/assignments";

// Assignments: the teacher sets homework in class (multiple choice, a short
// answer, a board to write on, and photos of paper work); the learner sees it
// in class, opens their own link, does it and hands it in; the teacher marks
// it on their board and photo and returns it; the learner sees their mark,
// the marking and the worked solution.
const SHOTS = process.env.LAB_SHOTS || "";
const shot = async (p: Page | Locator, name: string) => { if (SHOTS) { await (p as Page).waitForTimeout?.(300); await p.screenshot({ path: `${SHOTS}/${name}.png`, ...("viewportSize" in p ? { fullPage: true } : {}) }); } };
const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };

// The assignments server, in memory, built on the same rules as the real one.
function homeworkServer() {
  const list: Assignment[] = [];
  const entries = new Map<string, Entry>();
  const people = [{ id: GID, name: "Emmanuel" }];
  const tok = (g: string) => `tok-${g}`;
  async function attach(ctx: BrowserContext, who: "teacher" | "learner") {
    await ctx.route("**/api/board/assignments**", async (r) => {
      const url = new URL(r.request().url()), post = r.request().method() === "POST";
      const b = post ? JSON.parse(r.request().postData() ?? "{}") : Object.fromEntries(url.searchParams);
      const json = (j: unknown, status = 200) => r.fulfill({ status, json: j });
      const klass = { title: "Division", teacher: "Mr B" };
      const a = list.find((x) => x.id === b.id);
      if (who === "learner") {
        const me = GID, e = a ? entries.get(`${a.id}:${me}`) ?? null : null;
        const link = `/homework?t=${tok(me)}`;
        if (!post && !b.id) return json({ klass, link, name: "Emmanuel", assignments: list.filter((x) => isFor(x, me)).map((x) => {
          const en = entries.get(`${x.id}:${me}`) ?? null, sc = en?.returnedAt ? scoreOf(x.items, en.answers, en.marks) : null;
          return { id: x.id, title: x.title, dueAt: x.dueAt, lateOk: x.lateOk, status: x.status, count: x.items.length, state: statusOf(x, en), score: sc?.score ?? null, total: sc?.total ?? null };
        }) });
        if (!a) return json({ error: "That assignment isn't for you." }, 404);
        if (!post) {
          const back = !!e?.returnedAt, sc = back ? scoreOf(a.items, e!.answers, e!.marks) : null;
          return json({ klass, link, name: "Emmanuel", assignment: { ...a, items: learnerItems(a.items, back && a.review) }, status: statusOf(a, e), can: canWork(a, e),
            entry: e ? { ...e, feedback: back || e.sentBack ? e.feedback : "", notes: back ? e.notes : {}, marks: back ? a.items.map((it, n) => itemMark(it, e.answers[String(n)], e.marks[String(n)])) : null, score: sc?.score ?? null, total: sc?.total ?? null } : null });
        }
        const now = new Date().toISOString();
        const mine = e ?? { studentId: me, name: "Emmanuel", answers: {}, marks: {}, notes: {}, feedback: "", startedAt: now, submittedAt: null, returnedAt: null, tries: 0, sentBack: false };
        if (b.action === "answer") { const can = canWork(a, e); if (!can.ok) return json({ error: can.why }, 409); mine.answers = { ...mine.answers, [String(b.n)]: cleanAnswer(a.items[b.n], b.value) }; }
        if (b.action === "submit") { mine.submittedAt = now; mine.sentBack = false; }
        if (b.action === "unsubmit") mine.submittedAt = null;
        entries.set(`${a.id}:${me}`, mine);
        return json({ ok: true, late: isLate(a, now) });
      }
      // The teacher.
      if (post && b.action === "create") {
        const id = `00000000-0000-4000-8000-00000000000${list.length + 1}`;
        list.unshift({ id, sessionId: SID, title: b.title, instructions: b.instructions ?? "", items: cleanItems(b.items), files: b.files ?? [], forIds: b.forIds ?? null,
          dueAt: b.dueAt ?? null, lateOk: b.lateOk !== false, review: b.review !== false, status: "open", createdAt: new Date().toISOString() });
        return json({ ok: true, id });
      }
      if (!post && !b.id) return json({ klass, learners: people, assignments: list.map((x) => {
        const es = [...entries.entries()].filter(([k]) => k.startsWith(`${x.id}:`)).map(([, v]) => v);
        return { id: x.id, title: x.title, dueAt: x.dueAt, status: x.status, count: x.items.length, createdAt: x.createdAt,
          counts: { for: 1, started: es.length, handedIn: es.filter((v) => v.submittedAt && !v.returnedAt).length, late: 0, returned: es.filter((v) => v.returnedAt).length } };
      }) });
      if (!a) return json({ error: "Assignment not found." }, 404);
      if (!post && b.studentId) { const e = entries.get(`${a.id}:${b.studentId}`) ?? null; return json({ assignment: a, entry: e, name: "Emmanuel", status: statusOf(a, e) }); }
      if (!post) return json({ assignment: a, klass, learners: people.map((p) => {
        const e = entries.get(`${a.id}:${p.id}`) ?? null, sc = e ? scoreOf(a.items, e.answers, e.marks) : null;
        return { id: p.id, name: p.name, state: statusOf(a, e), submittedAt: e?.submittedAt ?? null, returnedAt: e?.returnedAt ?? null, late: false, score: sc?.score ?? null, total: sc?.total ?? 0, toMark: sc?.toMark.length ?? 0, tries: e?.tries ?? 0, link: `${url.origin}/homework?t=${tok(p.id)}` };
      }) });
      const e = entries.get(`${a.id}:${b.studentId}`)!;
      if (b.action === "mark") { if (b.mark == null) delete e.marks[String(b.n)]; else e.marks[String(b.n)] = b.mark; const sc = scoreOf(a.items, e.answers, e.marks); return json({ ok: true, ...sc }); }
      if (b.action === "annotate") { e.notes[b.key] = { ink: b.ink, note: b.note }; return json({ ok: true }); }
      if (b.action === "return") { const sc = scoreOf(a.items, e.answers, e.marks); if (sc.toMark.length) return json({ error: "Mark them all first." }, 409); e.returnedAt = new Date().toISOString(); e.feedback = b.feedback; return json({ ok: true, ...sc }); }
      return json({ error: "Unknown action." }, 400);
    });
    // Photos of work: tickets, storage, and the pictures themselves.
    let n = 0;
    await ctx.route("**/api/live-sessions/slides", (r) => {
      const body = JSON.parse(r.request().postData() ?? "{}");
      r.fulfill({ json: { uploads: Array.from({ length: body.count }, () => { const path = `slides/${SID}/${body.homework ? "hw-" : ""}${who}-${++n}.jpg`; return { path, token: "t", url: `${base}/storage/v1/object/public/materials/${path}` }; }) } });
    });
    await ctx.route("**/storage/v1/object/upload/sign/**", (r) => r.request().method() === "OPTIONS" ? r.fulfill({ status: 204, headers: cors }) : r.fulfill({ status: 200, headers: cors, json: { Key: "x" } }));
    await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors,
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="100%" height="100%" fill="#FEF9C3"/><text x="40" y="120" font-size="60">My working</text></svg>' }));
  }
  return { attach, entries };
}

async function drag(p: Page, c: Locator, from: [number, number], to: [number, number]) {
  const b = (await c.boundingBox())!;
  await p.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(b.x + b.width * (from[0] + ((to[0] - from[0]) * i) / 8), b.y + b.height * (from[1] + ((to[1] - from[1]) * i) / 8));
  await p.mouse.up();
}
const tap = async (p: Page, c: Locator, at: [number, number]) => { await c.scrollIntoViewIfNeeded(); const b = (await c.boundingBox())!; await p.mouse.click(b.x + b.width * at[0], b.y + b.height * at[1]); };

test("homework: set in class, done at home on the learner's link, marked and returned", async ({ browser }) => {
  test.setTimeout(180_000);
  const hub = realtimeHub(), server = classServer(), hw = homeworkServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
    await hub.attach(ctx, who); await server.attach(ctx, who); await hw.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await teacher.waitForTimeout(1200);

  // ── The teacher sets it ──
  await teacher.getByRole("tab", { name: "📚 Homework" }).click();
  const hub2 = teacher.getByRole("region", { name: "Assignments" });
  await expect(hub2.getByText("No assignments yet")).toBeVisible();
  await hub2.getByRole("button", { name: "＋ New assignment" }).click();
  const make = teacher.getByRole("region", { name: "New assignment" });
  await make.getByPlaceholder(/Fractions — homework 3/).fill("Division practice");
  await make.getByRole("button", { name: /＋ Multiple choice/ }).click();
  const q1 = make.getByRole("group", { name: "Question 1: Multiple choice" });
  await q1.getByLabel("Question 1", { exact: true }).fill("What is 84 ÷ 4?");
  for (const [i, t] of ["20", "21", "22"].entries()) await q1.getByLabel(`Choice ${String.fromCharCode(65 + i)} for question 1`).fill(t);
  await q1.getByLabel("Choice B is right").check();
  await q1.getByLabel("Worked solution for question 1").fill("84 ÷ 4: 8 ÷ 4 = 2, 4 ÷ 4 = 1, so 21");
  await make.getByRole("button", { name: /＋ Short answer/ }).click();
  const q2 = make.getByRole("group", { name: "Question 2: Short answer" });
  await q2.getByLabel("Question 2", { exact: true }).fill("Work out 96 ÷ 8");
  await q2.getByLabel("Answer for question 2").fill("12");
  await make.getByRole("button", { name: /＋ Digital board/ }).click();
  await make.getByRole("group", { name: "Question 3: Digital board" }).getByLabel("Question 3", { exact: true }).fill("Show 156 ÷ 12 by short division");
  await make.getByRole("button", { name: /＋ Upload work/ }).click();
  await make.getByRole("group", { name: "Question 4: Upload work" }).getByLabel("Question 4", { exact: true }).fill("Do exercise 5C, numbers 1–6, in your book");
  await make.getByRole("button", { name: "In 3 days" }).click();
  await expect(make.getByText(/4 · 12 marks/)).toBeVisible(); // 1 + 1 + 5 + 5
  await shot(make, "hw-new");
  await make.getByRole("button", { name: "📚 Send to learners" }).click();
  const one = teacher.getByRole("region", { name: "Assignment: Division practice" });
  await expect(one.getByText("Due in 3 days")).toBeVisible();
  await expect(one.getByRole("list", { name: "Learners" })).toContainText("Emmanuel");
  await expect(one.getByRole("list", { name: "Learners" })).toContainText("Not started");

  // ── The learner sees it in class, and opens their link ──
  const banner = learner.getByRole("region", { name: "Homework" });
  await expect(banner).toContainText("New homework!", { timeout: 20_000 });
  await expect(banner).toContainText("Division practice");
  const href = await banner.getByRole("link", { name: "Open my homework" }).getAttribute("href");
  expect(href).toMatch(/^\/homework\?t=tok-.+&id=/);
  await learner.goto(href!, { waitUntil: "networkidle" });
  await expect(learner.getByRole("heading", { name: "Division practice" })).toBeVisible();
  await expect(learner.getByText(/84 ÷ 4: 8 ÷ 4/)).toHaveCount(0); // no worked solution before it's marked

  const lq = (n: number) => learner.getByRole("article", { name: `Question ${n}` });
  await lq(1).getByRole("radio", { name: /21/ }).click();
  await lq(2).getByLabel("Answer to question 2").fill("12");
  const pad = lq(3).getByRole("img", { name: /Write on the page/ });
  await pad.scrollIntoViewIfNeeded();
  await drag(learner, pad, [0.1, 0.3], [0.5, 0.35]);
  await drag(learner, pad, [0.1, 0.6], [0.4, 0.62]);
  const maker = await browser.newPage();
  await maker.setContent('<div style="width:600px;height:800px;background:#FEF3C7;font:bold 50px sans-serif">5C: 1) 7 2) 9</div>');
  const png = await maker.screenshot({ clip: { x: 0, y: 0, width: 600, height: 800 } });
  await maker.close();
  await lq(4).getByLabel("Upload your work for question 4").setInputFiles({ name: "page.png", mimeType: "image/png", buffer: png });
  await expect(lq(4).getByRole("img", { name: "Your page 1" })).toBeVisible({ timeout: 30_000 });
  await expect(learner.getByText("4 of 4 answered")).toBeVisible();
  await expect(learner.getByText("✓ All saved")).toBeVisible({ timeout: 10_000 });
  await shot(learner, "hw-learner");
  await learner.getByRole("button", { name: "✅ Hand in" }).click();
  await learner.getByRole("button", { name: "Yes, hand it in" }).click();
  await expect(learner.getByText(/Handed in .* your teacher will mark it/)).toBeVisible();
  expect(Object.keys([...hw.entries.values()][0].answers)).toEqual(["0", "1", "2", "3"]);

  // ── The teacher marks it ──
  await expect(one.getByRole("button", { name: /Start marking \(1\)/ })).toBeVisible({ timeout: 20_000 });
  await one.getByRole("button", { name: /Start marking/ }).click();
  const desk = teacher.getByRole("region", { name: "Marking Emmanuel's work" });
  await expect(desk.getByLabel("Score so far")).toContainText("2");
  await expect(desk.getByText("To mark: Q3, Q4")).toBeVisible();
  const board = desk.getByRole("article", { name: "Question 3" }).getByRole("img", { name: "Mark on the page" });
  await tap(teacher, board, [0.6, 0.32]); await tap(teacher, board, [0.55, 0.6]);
  await desk.getByRole("button", { name: "4 marks for question 3" }).click();
  const photo = desk.getByRole("article", { name: "Question 4" }).getByRole("img", { name: "Mark on the page" });
  await tap(teacher, photo, [0.7, 0.1]);
  await desk.getByRole("button", { name: "5 marks for question 4" }).click();
  await expect(desk.getByLabel("Score so far")).toContainText("11");
  await desk.getByRole("button", { name: "Excellent work! ⭐" }).click();
  await shot(desk, "hw-marking");
  await desk.getByRole("button", { name: /Return to Emmanuel \(11\/12\)/ }).click();
  await expect(one.getByRole("list", { name: "Learners" })).toContainText("Marked & returned", { timeout: 20_000 });
  const e = [...hw.entries.values()][0];
  expect(e.marks).toEqual({ 2: 4, 3: 5 });
  expect(e.notes["2"].ink.filter((s: { id: string }) => s.id.startsWith("tk-")).length).toBe(2);
  expect(e.notes["3.0"].ink.length).toBe(1);

  // ── The learner sees it marked ──
  await learner.reload({ waitUntil: "networkidle" });
  const mark = learner.getByRole("region", { name: "Your mark" });
  await expect(mark).toContainText("11");
  await expect(mark).toContainText("Excellent work!");
  await expect(lq(1).getByText(/84 ÷ 4: 8 ÷ 4/)).toBeVisible(); // the worked solution, now
  await expect(lq(3).getByRole("img", { name: "The teacher's marking" })).toBeVisible();
  await expect(lq(3).getByText("4 / 5")).toBeVisible();
  await shot(learner, "hw-returned");
  // Back to the list: it says it's marked.
  await learner.getByRole("button", { name: "← My homework" }).click();
  await expect(learner.getByRole("list", { name: "My assignments" })).toContainText("11 / 12");
});
