import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Slides from a PDF on a patchy connection: the PDF helper fails to download
// the first time, every slide's first upload attempt fails, and the 4th slide
// fails every way it's tried (storage and our server) until the board retries
// it by itself with a fresh ticket. Every slide must land on the board without
// the teacher uploading again.
test("PDF slides upload on a flaky connection", async ({ browser }) => {
  // A 6-page "PowerPoint saved as PDF".
  const maker = await browser.newPage();
  await maker.setContent(Array.from({ length: 6 }, (_, i) =>
    `<section style="width:100%;height:100vh;${i < 5 ? "page-break-after:always;" : ""}display:flex;align-items:center;justify-content:center;background:${i % 2 ? "#E0F2FE" : "#FEF3C7"};font:bold 80px sans-serif">Slide ${i + 1}</section>`).join(""));
  const pdf = await maker.pdf({ width: "1280px", height: "720px", printBackground: true });
  await maker.close();

  const ctx = await browser.newContext();
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  let workerTries = 0;
  const firstTry = new Set<string>();
  let ticketCalls = 0;
  await ctx.route("**/api/live-sessions/slides/upload", (r) => r.fulfill({ status: 503, json: { error: "busy" } }));
  await ctx.route("**/pdf.worker.min.mjs", (r) => (++workerTries === 1 ? r.abort("failed") : r.continue()));
  await ctx.route("**/api/live-sessions/slides", (r) => {
    const { count } = JSON.parse(r.request().postData() ?? "{}");
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    ticketCalls++;
    r.fulfill({ json: { uploads: Array.from({ length: count }, (_, i) => {
      const path = `slides/${SID}/r${ticketCalls}-t-${String(i + 1).padStart(2, "0")}.jpg`;
      return { path, token: `tok${i}`, url: `${base}/storage/v1/object/public/materials/${path}` };
    }) } });
  });
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };
  await ctx.route("**/storage/v1/object/upload/sign/**", (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const u = r.request().url();
    if (u.includes("r1-t-04.jpg")) return r.fulfill({ status: 500, headers: cors, body: "boom" });               // never works
    if (!firstTry.has(u)) { firstTry.add(u); return r.fulfill({ status: 503, headers: cors, body: "busy" }); } // flaky first try
    return r.fulfill({ status: 200, headers: cors, json: { Key: "materials/x" } });
  });
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors, body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="100%" height="100%" fill="#eef"/></svg>' }));

  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  // Notices fade after a few seconds, so keep a record of every one shown.
  await page.evaluate(() => {
    const w = window as any; w.__notes = "";
    new MutationObserver(() => { const m = document.body.innerText.match(/[^\n]*slides? (added|didn.t upload)[^\n]*|Couldn.t[^\n]*/g); if (m) w.__notes += " | " + m.join(" | "); })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  await page.setInputFiles('input[type=file][accept*="pdf"]', { name: "lesson.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect.poll(() => page.evaluate(() => (window as any).__notes as string), { timeout: 120_000 }).toMatch(/slides? added/);
  const notes = await page.evaluate(() => (window as any).__notes as string);
  expect(notes).not.toMatch(/didn.t upload/);
  expect(notes).toMatch(/\b([6-9]) slides added — draw on them/);
  expect(ticketCalls).toBe(2); // the automatic second round
  expect(workerTries).toBeGreaterThanOrEqual(1);
});

// Insert a picture: a normal photo; a network where storage can't be reached
// at all (it must go through our server instead); and a photo the browser
// can't open (it must say what to do).
async function teacherBoard(browser: import("@playwright/test").Browser, storage: "ok" | "blocked") {
  const ctx = await browser.newContext();
  await realtimeHub().attach(ctx, "teacher");
  await classServer().attach(ctx, "teacher");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const seen = { tickets: 0, direct: 0, relay: 0 };
  await ctx.route("**/api/live-sessions/slides", (r) => {
    seen.tickets++;
    const { count } = JSON.parse(r.request().postData() ?? "{}");
    r.fulfill({ json: { uploads: Array.from({ length: count }, (_, i) => ({ path: `slides/${SID}/p-${seen.tickets}-${i}.jpg`, token: "t", url: `${base}/storage/v1/object/public/materials/slides/${SID}/p-${seen.tickets}-${i}.jpg` })) } });
  });
  await ctx.route("**/api/live-sessions/slides/upload", (r) => { seen.relay++; return r.fulfill({ json: { ok: true } }); });
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST" };
  await ctx.route("**/storage/v1/object/upload/sign/**", (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    seen.direct++;
    return storage === "blocked" ? r.abort("connectionrefused") : r.fulfill({ status: 200, headers: cors, json: { Key: "x" } });
  });
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", headers: cors, body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#09c"/></svg>' }));
  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.evaluate(() => {
    const w = window as any; w.__notes = "";
    new MutationObserver(() => { const m = document.body.innerText.match(/[^\n]*(Picture added|Couldn.t add the picture|slides? added|didn.t upload)[^\n]*/g); if (m) w.__notes += " | " + m.join(" | "); })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  const notes = () => page.evaluate(() => (window as any).__notes as string);
  return { page, seen, notes };
}
async function photo(browser: import("@playwright/test").Browser) {
  const p = await browser.newPage();
  await p.setContent('<div style="width:600px;height:400px;background:linear-gradient(#09c,#fc0)"></div>');
  const png = await p.screenshot({ clip: { x: 0, y: 0, width: 600, height: 400 } });
  await p.close();
  return png;
}

test("a picture goes on the board", async ({ browser }) => {
  const { page, notes } = await teacherBoard(browser, "ok");
  await page.setInputFiles('input[type=file][accept^="image"]', { name: "photo.png", mimeType: "image/png", buffer: await photo(browser) });
  await expect.poll(notes, { timeout: 60_000 }).toContain("Picture added");
});

test("pictures and slides still upload when storage can't be reached", async ({ browser }) => {
  const { page, seen, notes } = await teacherBoard(browser, "blocked");
  await page.setInputFiles('input[type=file][accept^="image"]', { name: "photo.jpg", mimeType: "image/png", buffer: await photo(browser) });
  await expect.poll(notes, { timeout: 90_000 }).toContain("Picture added");
  expect(seen.relay).toBeGreaterThanOrEqual(1);
  // Slides too — and now straight through the server, without waiting on storage again.
  await page.setInputFiles('input[type=file][accept*="pdf"]', [
    { name: "a.png", mimeType: "image/png", buffer: await photo(browser) },
    { name: "b.png", mimeType: "image/png", buffer: await photo(browser) },
  ]);
  await expect.poll(notes, { timeout: 90_000 }).toMatch(/2 slides added/);
});

test("a photo the phone can't open says what to do", async ({ browser }) => {
  const { page, notes } = await teacherBoard(browser, "ok");
  await page.setInputFiles('input[type=file][accept^="image"]', { name: "IMG_2041.heic", mimeType: "image/heic", buffer: Buffer.from("not really a picture") });
  await expect.poll(notes, { timeout: 30_000 }).toMatch(/Couldn.t add the picture \(This phone can.t open HEIC photos/);
});

test("all the uploaded slides can be removed in one go", async ({ browser }) => {
  const { page, notes } = await teacherBoard(browser, "ok");
  await page.setInputFiles('input[type=file][accept*="pdf"]', [
    { name: "a.png", mimeType: "image/png", buffer: await photo(browser) },
    { name: "b.png", mimeType: "image/png", buffer: await photo(browser) },
    { name: "c.png", mimeType: "image/png", buffer: await photo(browser) },
  ]);
  await expect.poll(notes, { timeout: 90_000 }).toMatch(/3 slides added/);
  await expect(page.locator('img[alt^="Slide"]')).toHaveCount(1); // the page on show
  const cleared = page.waitForRequest((r) => r.url().endsWith("/api/live-sessions/slides") && r.method() === "DELETE");
  page.once("dialog", (d) => { expect(d.message()).toContain("Remove all 3 slide pages"); d.accept(); });
  await page.getByRole("button", { name: "Remove all slides" }).click();
  // …and asks the server to clear the three pictures from storage.
  const body = JSON.parse((await cleared).postData() ?? "{}");
  expect(body).toMatchObject({ sessionId: SID });
  expect(body.urls).toHaveLength(3);
  await expect(page.locator('img[alt^="Slide"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove all slides" })).toHaveCount(0);
  await expect(page.getByText(/Page 1\/1/)).toBeVisible();
});
