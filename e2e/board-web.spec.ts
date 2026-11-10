import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The web browser on the board: the teacher opens a page full screen, shows it
// on a learner's screen (joined by PIN, no account), and is told when a site
// doesn't allow itself to be shown inside another page.
test("the teacher opens a web page full screen and shows it to learners", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const checked: string[] = [];
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext(who === "learner" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    // Stand-ins for the sites, and for our own check of whether a site can be shown.
    await ctx.route("https://www.desmos.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<h1>Graphing calculator</h1>" }));
    await ctx.route("https://en.wikipedia.org/**", (r) => r.fulfill({ contentType: "text/html", body: `<h1>Search: ${new URL(r.request().url()).searchParams.get("search")}</h1>` }));
    await ctx.route("https://google.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", headers: { "x-frame-options": "DENY" }, body: "no" }));
    await ctx.route("**/api/board/frame-check", async (r) => {
      const { url } = r.request().postDataJSON();
      checked.push(url);
      return r.fulfill({ json: { verdict: url.includes("google.com") ? "blocked" : "ok", url } });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");

  await teacher.getByRole("button", { name: "Class tools" }).click();
  await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name: "Web browser" }).click();
  const web = teacher.getByRole("dialog", { name: "Web browser" });
  await expect(web.getByText("Open a web page in your class")).toBeVisible();

  // It covers the whole screen.
  const box = (await web.boundingBox())!, view = teacher.viewportSize()!;
  expect(Math.round(box.width)).toBe(view.width);
  expect(Math.round(box.height)).toBe(view.height);

  // A quick link opens inside the class, in a sandboxed frame.
  await web.getByRole("button", { name: /Desmos/ }).click();
  const frame = web.locator('iframe[title="Web page: desmos.com"]');
  await expect(frame).toBeVisible();
  await expect(teacher.frameLocator('iframe[title="Web page: desmos.com"]').getByRole("heading", { name: "Graphing calculator" })).toBeVisible();
  expect(await frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
  expect(checked).toEqual(["https://www.desmos.com/calculator"]);

  // Learners see nothing until the teacher shows it.
  const theirs = learner.getByRole("dialog", { name: "Web page from your teacher" });
  await expect(theirs).toHaveCount(0);
  await web.getByRole("checkbox", { name: "Show to learners" }).check();
  await expect(theirs).toBeVisible({ timeout: 20_000 });
  await expect(learner.frameLocator('iframe[title="Web page from your teacher"]').getByRole("heading", { name: "Graphing calculator" })).toBeVisible();
  expect(await theirs.locator("iframe").getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-forms"); // no new tabs for learners
  await theirs.getByRole("button", { name: "Back to the class board" }).click();
  await learner.getByRole("button", { name: /Open desmos.com/ }).click();
  await expect(theirs).toBeVisible();

  // Words are looked up; the learner's page follows.
  await web.getByLabel("Web address").fill("pythagoras theorem");
  await web.getByRole("button", { name: "Go" }).click();
  await expect(teacher.frameLocator('iframe[title="Web page: en.wikipedia.org"]').getByRole("heading", { name: "Search: pythagoras theorem" })).toBeVisible();
  await expect(learner.frameLocator('iframe[title="Web page from your teacher"]').getByRole("heading", { name: "Search: pythagoras theorem" })).toBeVisible({ timeout: 20_000 });

  // A site that refuses: the teacher is told, and it leaves learners' screens.
  await web.getByLabel("Web address").fill("google.com");
  await web.getByRole("button", { name: "Go" }).click();
  await expect(web.getByText("google.com doesn't allow itself to be shown inside another page")).toBeVisible();
  await expect(web.getByRole("link", { name: /Open google.com in a new tab/ })).toHaveAttribute("href", "https://google.com/");
  await expect(theirs).toBeHidden({ timeout: 20_000 });

  // Not a web page at all.
  await web.getByLabel("Web address").fill("javascript:alert(1)");
  await web.getByRole("button", { name: "Go" }).click();
  await expect(web.getByRole("alert")).toContainText("isn't a web address we can open");

  // Back to the page before, hide (it stays open), then close.
  await web.getByRole("button", { name: "Previous page" }).click();
  await expect(teacher.frameLocator('iframe[title="Web page: en.wikipedia.org"]').getByRole("heading")).toBeVisible();
  await expect(theirs).toBeVisible({ timeout: 20_000 });
  await web.getByRole("button", { name: "Hide the web browser" }).click();
  await expect(web).toBeHidden();
  await expect(teacher.getByText("en.wikipedia.org · learners see it")).toBeVisible();
  await teacher.getByRole("button", { name: "Close the web page" }).click();
  await expect(theirs).toBeHidden({ timeout: 20_000 });
});
