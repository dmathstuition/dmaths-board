import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The equation balancer, ray diagrams and the food web builder: the teacher
// works them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.SCIMORE_SHOTS || "";
const shot = async (p: Page, name: string) => {
  if (!SHOTS) return;
  await p.locator("[data-board]").first().evaluate((el) => el.scrollIntoView({ block: "end" }));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SHOTS}/${name}.png` });
};

test("chemical equations, ray diagrams and food web, seen live by a learner", async ({ browser }) => {
  const hub = realtimeHub(), server = classServer();
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: SHOTS ? 1.5 : 1 });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  const tool = async (name: string | RegExp) => {
    await teacher.getByRole("button", { name: "Class tools" }).click();
    await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name }).click();
  };

  // ── Chemical equations: H2 + O2 → H2O ──
  await tool(/^Chemical equations/);
  const bal = teacher.getByRole("region", { name: "Balance the equation" }), theirBal = learner.getByRole("region", { name: "Balance the equation" });
  await expect(bal.getByRole("status")).toContainText("Not balanced yet: the O atoms don't match");
  await bal.getByRole("button", { name: "More H2O" }).click();
  await expect(bal.getByRole("status")).toContainText("the H atoms don't match");
  await expect(bal.getByRole("row", { name: /^H 2 4/ })).toBeVisible();
  await bal.getByRole("button", { name: "More H2", exact: true }).click();
  await expect(bal.getByRole("status")).toContainText("Balanced! Every atom");
  await expect(theirBal.getByRole("status")).toContainText("Balanced!", { timeout: 20_000 });
  await expect(theirBal.getByRole("group", { name: "Equation: 2 H2 plus 1 O2 gives 2 H2O" })).toBeVisible();
  await expect(theirBal.getByRole("button")).toHaveCount(0); // learners watch; the teacher works it
  await shot(teacher, "balancer");
  // Doubling everything still balances, but isn't the simplest.
  for (const f of ["H2", "H2", "O2", "H2O", "H2O"]) await bal.getByRole("button", { name: `More ${f}`, exact: true }).click();
  await expect(bal.getByRole("status")).toContainText("divide every number by 2");
  // Another equation, and the answer on request.
  await bal.getByLabel("Equation", { exact: true }).selectOption({ label: "Rusting" });
  await expect(bal.getByRole("status")).toContainText("Not balanced yet");
  await bal.getByRole("button", { name: "Show the answer" }).click();
  await expect(theirBal.getByRole("group", { name: "Equation: 4 Fe plus 3 O2 gives 2 Fe2O3" })).toBeVisible({ timeout: 20_000 });
  // The teacher's own equation; nonsense is turned away.
  await bal.getByLabel("Type your own equation").fill("H2 -> O2");
  await bal.getByRole("button", { name: "Use it" }).click();
  await expect(bal.getByRole("alert")).toContainText("I can't use that");
  await bal.getByLabel("Type your own equation").fill("Mg + HCl -> MgCl2 + H2");
  await bal.getByRole("button", { name: "Use it" }).click();
  await bal.getByRole("button", { name: "More HCl" }).click();
  await expect(theirBal.getByRole("status")).toContainText("Balanced!", { timeout: 20_000 });
  await bal.getByRole("button", { name: "Hide the atom count" }).click();
  await expect(theirBal.getByRole("table", { name: "Atom count" })).toHaveCount(0, { timeout: 20_000 });
  await bal.getByRole("button", { name: "Close Balance the equation" }).click();

  // ── Ray diagrams: a convex lens, f = 15 cm, object at 30 cm (2F) ──
  await tool(/^Ray diagrams/);
  const ray = teacher.getByRole("region", { name: "Ray diagrams" }), theirRay = learner.getByRole("region", { name: "Ray diagrams" });
  const img = ray.getByLabel("Image", { exact: true });
  await expect(img).toContainText("Real, inverted and the same size");
  await expect(ray.getByLabel("Object", { exact: true })).toContainText("at 2F");
  // Drag the object 10 cm closer: between F and 2F, so the image is magnified.
  const pic = (await ray.getByRole("img", { name: /^Convex lens/ }).boundingBox())!, perCm = (pic.width / 620) * 4, obj = (await ray.locator("g[data-object]").boundingBox())!;
  await teacher.mouse.move(obj.x + obj.width / 2, obj.y + obj.height / 2);
  await teacher.mouse.down();
  await teacher.mouse.move(obj.x + obj.width / 2 + 10 * perCm, obj.y + obj.height / 2, { steps: 8 });
  await teacher.mouse.up();
  await expect(img).toContainText("Real, inverted and magnified");
  await expect(img).toContainText("Image 60 cm from the lens");
  await expect(theirRay.getByLabel("Image", { exact: true })).toContainText("Magnification ×3", { timeout: 20_000 });
  await shot(teacher, "rays-lens");
  // Inside F it becomes a magnifying glass.
  for (let i = 0; i < 10; i++) await ray.getByRole("button", { name: "Distance: one less" }).click();
  await expect(img).toContainText("Virtual, upright and magnified");
  await shot(teacher, "rays-virtual");
  await ray.getByRole("button", { name: "Concave lens" }).click();
  await expect(img).toContainText("Virtual, upright and diminished");
  await ray.getByRole("button", { name: "Concave mirror" }).click();
  await ray.getByRole("button", { name: "10 cm" }).click();
  for (let i = 0; i < 10; i++) await ray.getByRole("button", { name: "Distance: one more" }).click();
  await expect(img).toContainText("Real, inverted and the same size"); // at C
  await expect(ray.getByLabel("Object", { exact: true })).toContainText("at C");
  await shot(teacher, "rays-mirror");
  await ray.getByRole("button", { name: "Plane mirror" }).click();
  await expect(theirRay.getByLabel("Image", { exact: true })).toContainText("Virtual, upright and the same size", { timeout: 20_000 });
  // Predict first.
  await ray.getByRole("button", { name: "Hide the image (predict first)" }).click();
  await expect(theirRay.getByLabel("Image", { exact: true })).toContainText("Where will the image be?", { timeout: 20_000 });
  await expect(theirRay.getByRole("button")).toHaveCount(0);
  await ray.getByRole("button", { name: "Close Ray diagrams" }).click();

  // ── Food web: the savanna ──
  await tool(/^Food web/);
  const web = teacher.getByRole("region", { name: "Food web" }), theirWeb = learner.getByRole("region", { name: "Food web" });
  const node = (name: string | RegExp) => web.getByRole("button", { name });
  await expect(web.getByLabel("Arrows", { exact: true })).toContainText("0 of 11 arrows drawn");
  await node("Grass", ).first().click();
  await node("Zebra").click();
  await expect(web.getByRole("status")).toContainText("Yes: zebra eats grass");
  await expect(web.getByLabel("Arrows", { exact: true })).toContainText("1 of 11");
  // The wrong way round, and something that isn't eaten.
  await node("Lion").click();
  await node("Zebra").click();
  await expect(web.getByRole("status")).toContainText("Other way round");
  await node(/^Grass$/).click();
  await node("Lion").click();
  await expect(web.getByRole("status")).toContainText("lion doesn't eat grass");
  await expect(web.getByLabel("Arrows", { exact: true })).toContainText("1 of 11");
  await expect(theirWeb.getByLabel("Arrows", { exact: true })).toContainText("1 of 11", { timeout: 20_000 });
  await web.getByRole("button", { name: "Draw every arrow" }).click();
  await expect(web.getByLabel("Arrows", { exact: true })).toContainText("the web is complete");
  await web.getByRole("button", { name: "Name the feeding levels" }).click();
  await shot(teacher, "foodweb");
  // Take the lion out.
  await node("Lion").click();
  await web.getByRole("button", { name: "Take the lion out" }).click();
  const what = theirWeb.getByLabel("What happens");
  await expect(what).toContainText("Without the lion", { timeout: 20_000 });
  await expect(what).toContainText("Zebra may rise");
  await expect(what).toContainText("Grass may fall");
  await expect(theirWeb.getByRole("img", { name: "Lion, taken out" })).toBeVisible();
  await expect(theirWeb.getByRole("img", { name: "Zebra, may rise" })).toBeVisible();
  await expect(theirWeb.getByRole("button")).toHaveCount(0);
  await shot(teacher, "foodweb-removed");
  await shot(learner, "learner-foodweb");
  await web.getByRole("button", { name: "Put everything back" }).click();
  await web.getByLabel("Habitat").selectOption({ label: "Pond" });
  await expect(theirWeb.getByRole("img", { name: "Heron" })).toBeVisible({ timeout: 20_000 });
  await expect(web.getByLabel("Arrows", { exact: true })).toContainText("0 of 12 arrows drawn");
});
