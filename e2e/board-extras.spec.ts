import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Class chat with reactions, the focus tools and watching a video together —
// with a learner who joined by PIN (no account).

// A stand-in for YouTube's embedded player: it speaks the same postMessage protocol.
const FAKE_PLAYER = `<!doctype html><body style="margin:0;background:#111;color:#fff;font:16px sans-serif">
<button id="play">play</button><button id="pause">pause</button><button id="jump">jump</button><pre id="s"></pre>
<script>
let state = 5, t = 0, last = Date.now(), on = false;
const now = () => (state === 1 ? t + (Date.now() - last) / 1000 : t);
const tell = () => { if (on) parent.postMessage(JSON.stringify({ event: "infoDelivery", info: { playerState: state, currentTime: now() } }), "*"); document.getElementById("s").textContent = state + " " + now().toFixed(1); };
const set = (s) => { t = now(); last = Date.now(); state = s; tell(); };
window.__yt = { get state() { return state; }, get time() { return now(); } };
addEventListener("message", (e) => { let d; try { d = JSON.parse(e.data); } catch { return; }
  if (d.event === "listening") { on = true; parent.postMessage(JSON.stringify({ event: "onReady" }), "*"); tell(); }
  if (d.event === "command") { if (d.func === "playVideo") set(1); if (d.func === "pauseVideo") set(2); if (d.func === "seekTo") { t = d.args[0]; last = Date.now(); tell(); } } });
setInterval(tell, 250);
document.getElementById("play").onclick = () => set(1); document.getElementById("pause").onclick = () => set(2);
document.getElementById("jump").onclick = () => { t = 90; last = Date.now(); tell(); };
</script></body>`;

async function openClass(browser: import("@playwright/test").Browser) {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("https://www.youtube-nocookie.com/embed/**", (r) => r.fulfill({ contentType: "text/html", body: FAKE_PLAYER }));
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  return { teacher: await open("teacher"), learner: await open("learner") };
}
const player = (p: Page) => p.frames().find((f) => f.url().includes("/embed/"))!;

test("class chat: the teacher approves messages, replies, sees reactions and can stop a learner posting", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  // Off until the teacher turns it on.
  await expect(learner.getByRole("button", { name: /Class chat|Reactions/ })).toHaveCount(0);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: "Class chat" }).click();
  const chat = teacher.getByRole("dialog", { name: "Class chat" });
  await chat.getByRole("button", { name: "Approve first" }).click();
  await chat.getByLabel(/Reactions/).check();

  await learner.getByRole("button", { name: "Class chat" }).click({ timeout: 20_000 });
  const sheet = learner.getByRole("dialog", { name: "Class chat" });
  await sheet.getByLabel("Your message").fill("Is it 56?");
  await sheet.getByRole("button", { name: "Send" }).click();
  await expect(sheet.getByText("your teacher will check it first")).toBeVisible();
  await expect(sheet.getByRole("list", { name: "Messages" }).getByText("Is it 56?")).toHaveCount(0); // not shown yet

  await expect(chat.getByText("Waiting for you (1)")).toBeVisible({ timeout: 20_000 });
  await chat.getByRole("button", { name: "Show Emmanuel's message to the class" }).click();
  await expect(sheet.getByRole("list", { name: "Messages" }).getByText("Is it 56?")).toBeVisible({ timeout: 20_000 });

  await chat.getByLabel("Your message").fill("Yes — well done!");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(sheet.getByText("Mr B (teacher):")).toBeVisible({ timeout: 20_000 });
  await expect(sheet.getByText("Yes — well done!")).toBeVisible();

  await sheet.getByRole("button", { name: "React 👏" }).click();
  await expect(teacher.locator(".react-float", { hasText: "👏" }).first()).toBeAttached({ timeout: 20_000 });

  await chat.getByRole("button", { name: "Stop Emmanuel posting" }).click();
  await expect(sheet.getByRole("list", { name: "Messages" }).getByText("Is it 56?")).toHaveCount(0, { timeout: 20_000 });
  await learner.waitForTimeout(2200);
  await sheet.getByLabel("Your message").fill("again");
  await sheet.getByRole("button", { name: "Send" }).click();
  await teacher.waitForTimeout(1500);
  await expect(chat.getByText("Can't post: Emmanuel")).toBeVisible();
  await expect(chat.getByText("again", { exact: true })).toHaveCount(0);       // not in the messages
  await expect(chat.getByText(/Waiting for you/)).toHaveCount(0);              // nor waiting to be approved

  await chat.getByRole("button", { name: "Off", exact: true }).click();
  await chat.getByLabel(/Reactions/).uncheck();
  await expect(sheet).toBeHidden({ timeout: 20_000 });
});

test("focus tools: lock screens, see who is looking away, call the roll", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: /^Focus tools/ }).click();
  const focus = teacher.getByRole("dialog", { name: "Focus tools" });

  await focus.getByLabel("Message on their screens").fill("Pens down, eyes on me");
  await focus.getByRole("button", { name: "Lock screens" }).click();
  const locked = learner.getByRole("alertdialog", { name: /locked the screen/ });
  await expect(locked.getByText("Pens down, eyes on me")).toBeVisible({ timeout: 20_000 });
  await focus.getByRole("button", { name: "Unlock screens" }).click();
  await expect(locked).toBeHidden({ timeout: 20_000 });

  // The learner switches to another app.
  await expect(focus.getByText("Everyone has the class in front of them.")).toBeVisible();
  await learner.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(focus.getByText("Looking away (1)")).toBeVisible({ timeout: 20_000 });
  await expect(focus.getByRole("region", { name: "Looking away" }).or(focus.locator('section[aria-label="Looking away"]')).getByText(/Emmanuel/)).toBeVisible();
  await learner.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(focus.getByText("Looking away (0)")).toBeVisible({ timeout: 20_000 });

  await focus.getByRole("button", { name: "Call the roll" }).click();
  await expect(focus.getByText(/s left · 0 of 1 here/)).toBeVisible();
  const roll = learner.getByRole("dialog", { name: "Roll call" });
  await roll.getByRole("button", { name: /I'm here/ }).click({ timeout: 20_000 });
  await expect(roll.getByText("You're marked here")).toBeVisible();
  await expect(focus.getByText(/1 of 1 here/)).toBeVisible({ timeout: 20_000 });
  await expect(focus.getByText("Everyone answered.")).toBeVisible();
});

test("watch a video together: the learner's video follows the teacher's", async ({ browser }) => {
  const { teacher, learner } = await openClass(browser);
  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: "Watch a video together" }).click();
  const setup = teacher.getByRole("dialog", { name: "Watch a video together" });
  await setup.getByLabel("YouTube link").fill("not a link");
  await setup.getByRole("button", { name: "Show to the class" }).click();
  await expect(setup.getByRole("alert")).toContainText("doesn't look like a YouTube link");
  await setup.getByLabel("YouTube link").fill("https://youtu.be/dQw4w9WgXcQ");
  await setup.getByRole("button", { name: "Show to the class" }).click();

  const mine = teacher.getByRole("dialog", { name: "Video for the class" });
  await expect(mine.getByText("Paused for the class")).toBeVisible();
  const theirs = learner.getByRole("dialog", { name: "Video from your teacher" });
  await expect(theirs).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => !!player(learner) && !!player(teacher), { timeout: 20_000 }).toBe(true);

  // The teacher presses play: the learner's video plays too.
  await teacher.frameLocator('iframe[title="Video for the class"]').locator("#play").click();
  await expect(mine.getByText("Playing for the class")).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => player(learner).evaluate(() => (window as any).__yt.state), { timeout: 20_000 }).toBe(1);
  // The teacher jumps ahead: the learner's video jumps.
  await teacher.frameLocator('iframe[title="Video for the class"]').locator("#jump").click();
  await expect.poll(() => player(learner).evaluate(() => (window as any).__yt.time), { timeout: 20_000 }).toBeGreaterThan(85);
  // The learner drags their own video back: it returns to the class's place.
  await player(learner).evaluate(() => (document.getElementById("pause") as HTMLButtonElement).click());
  await expect.poll(() => player(learner).evaluate(() => (window as any).__yt.state), { timeout: 20_000 }).toBe(1);
  // The teacher pauses, hides it (it stays in the corner), then ends it.
  await teacher.frameLocator('iframe[title="Video for the class"]').locator("#pause").click();
  await expect.poll(() => player(learner).evaluate(() => (window as any).__yt.state), { timeout: 20_000 }).toBe(2);
  await expect(theirs.getByText("paused by your teacher")).toBeVisible();
  await mine.getByRole("button", { name: "Hide" }).click();
  await expect(mine.getByRole("button", { name: "Open" })).toBeVisible();
  await theirs.getByRole("button", { name: "Back to the class board" }).click();
  await learner.getByRole("button", { name: "Watch the video" }).click();
  await mine.getByRole("button", { name: "End" }).click();
  await expect(theirs).toBeHidden({ timeout: 20_000 });
});
