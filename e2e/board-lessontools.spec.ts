import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The transformations grid, the atom builder and the card sort: the teacher
// works them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.LESSONTOOL_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(600); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };

test("transformations, atom builder and card sort, seen live by a learner", async ({ browser }) => {
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
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
    await teacher.mouse.move(from.x, from.y);
    await teacher.mouse.down();
    await teacher.mouse.move(to.x, to.y, { steps: 8 });
    await teacher.mouse.up();
  };

  // ── Transformations: a triangle at (1, 1), (4, 1), (1, 3) ──
  await tool(/^Transformations/);
  const tf = teacher.getByRole("region", { name: "Transformations" }), theirTf = learner.getByRole("region", { name: "Transformations" });
  const says = tf.getByLabel("Description"), row = (r: string) => tf.getByRole("row", { name: r });
  await expect(says).toContainText("Reflection in the y-axis");
  await expect(row("A (1, 1) (−1, 1)")).toBeVisible();
  await expect(theirTf.getByRole("row", { name: "B (4, 1) (−4, 1)" })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "transform-reflect");
  await tf.getByRole("button", { name: "Rotate" }).click();
  await expect(says).toContainText("Rotation of 90° anticlockwise about (0, 0)");
  await expect(row("C (1, 3) (−3, 1)")).toBeVisible();
  await tf.getByRole("button", { name: "90° clockwise" }).click();
  await expect(row("A (1, 1) (1, −1)")).toBeVisible();
  await tf.getByRole("button", { name: "Centre x: one more" }).click();
  await expect(says).toContainText("about (1, 0)");
  await expect(row("A (1, 1) (2, 0)")).toBeVisible();
  await shot(teacher, "transform-rotate");
  await tf.getByRole("button", { name: "Translate" }).click();
  await expect(says).toContainText("Translation by the vector (−6, 2): 6 left and 2 up");
  await expect(row("A (1, 1) (−5, 3)")).toBeVisible();
  await tf.getByRole("button", { name: "Enlarge" }).click();
  await expect(says).toContainText("Enlargement, scale factor 2, centre (1, 0)");
  await expect(says).toContainText("area is ×4");
  await expect(row("B (4, 1) (7, 2)")).toBeVisible();
  await expect(theirTf.getByRole("row", { name: "B (4, 1) (7, 2)" })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "transform-enlarge");
  await tf.getByRole("button", { name: "×−1" }).click();
  await expect(row("B (4, 1) (−2, −1)")).toBeVisible();
  // Predict first: the image is hidden from everyone until the teacher shows it.
  await tf.getByRole("button", { name: "Hide the image (predict first)" }).click();
  await expect(theirTf.getByLabel("Description")).toContainText("Where will the image be?", { timeout: 20_000 });
  await expect(theirTf.getByRole("row", { name: "A (1, 1) ?" })).toBeVisible();
  await expect(theirTf.getByRole("button", { name: "Rotate" })).toHaveCount(0); // learners watch; the teacher works it
  await tf.getByRole("button", { name: "Show the image" }).click();
  // Drag the shape one square left and one up: its corner A is now on the mirror line, so it doesn't move.
  await tf.getByRole("button", { name: "Reflect" }).click();
  const grid = (await tf.getByRole("img", { name: /^Grid:/ }).boundingBox())!, cell = (grid.width / 380) * 22, box = (await tf.locator("path[data-object]").boundingBox())!;
  const hold = { x: box.x + box.width * 0.25, y: box.y + box.height * 0.7 };
  await drag(hold, { x: hold.x - cell, y: hold.y - cell });
  await expect(row("A (0, 2) (0, 2)")).toBeVisible();
  await expect(row("B (3, 2) (−3, 2)")).toBeVisible();
  await tf.getByRole("button", { name: "Move the shape down" }).click();
  await expect(theirTf.getByRole("row", { name: "B (3, 1) (−3, 1)" })).toBeVisible({ timeout: 20_000 });
  await tf.getByRole("button", { name: "Close Transformations" }).click();
  await expect(theirTf).toBeHidden({ timeout: 20_000 });

  // ── Atom builder: carbon-12 to start ──
  await tool(/^Atom builder/);
  const atom = teacher.getByRole("region", { name: "Atom builder" }), theirAtom = learner.getByRole("region", { name: "Atom builder" });
  const about = atom.getByLabel("About this atom"), theirAbout = theirAtom.getByLabel("About this atom");
  await expect(about).toContainText("Carbon-12");
  await expect(about).toContainText("This isotope is stable.");
  await atom.getByRole("button", { name: "Neutrons: one more" }).click();
  await atom.getByRole("button", { name: "Neutrons: one more" }).click();
  await expect(about).toContainText("Carbon-14");
  await expect(about).toContainText("unstable: it is radioactive");
  await atom.getByLabel("Jump to an element").selectOption({ label: "11. Sodium" });
  await expect(about).toContainText("Sodium-23");
  await expect(about).toContainText("2, 8, 1");
  await atom.getByRole("button", { name: "Electrons: one less" }).click();
  await expect(about).toContainText("Positive ion: it has lost 1 electron");
  await expect(about).toContainText("outer shell is full");
  await expect(about.getByLabel("Nuclear symbol: mass number 23, atomic number 11, Na, charge +")).toBeVisible();
  await expect(theirAbout).toContainText("Positive ion", { timeout: 20_000 });
  await expect(theirAtom.getByRole("img", { name: "Atom with 11 protons, 12 neutrons and 10 electrons in shells 2, 8" })).toBeVisible();
  await expect(theirAtom.getByRole("button", { name: /one more/ })).toHaveCount(0);
  await shot(teacher, "atom");
  await atom.getByRole("button", { name: "Hide the name (quiz)" }).click();
  await expect(theirAbout).toContainText("Which element is this?", { timeout: 20_000 });
  await expect(theirAbout).not.toContainText("Sodium");
  await shot(learner, "learner-atom-quiz");
  await atom.getByRole("button", { name: "Make it neutral" }).click();
  await expect(about).toContainText("Neutral atom");
  await atom.getByRole("button", { name: "Close Atom builder" }).click();

  // ── Card sort: odd or even ──
  await tool(/^Card sort/);
  const sort = teacher.getByRole("region", { name: "Card sort" }), theirSort = learner.getByRole("region", { name: "Card sort" });
  const score = sort.getByLabel("Score"), bin = (p: Page | typeof sort, name: string) => p.getByRole("group", { name, exact: true });
  await expect(sort).toContainText("Odd or even?");
  await expect(score).toHaveText("0 of 10 sorted");
  // Tap, then tap.
  await sort.getByRole("button", { name: "7", exact: true }).click();
  await sort.getByRole("button", { name: "Put 7 under Odd" }).click();
  await expect(bin(sort, "Odd")).toContainText("7");
  // Drag.
  const from = (await sort.getByRole("button", { name: "8", exact: true }).boundingBox())!, to = (await bin(sort, "Even").boundingBox())!;
  await drag({ x: from.x + from.width / 2, y: from.y + from.height / 2 }, { x: to.x + to.width / 2, y: to.y + to.height * 0.7 });
  await expect(bin(sort, "Even")).toContainText("8");
  // A wrong one.
  await sort.getByRole("button", { name: "13", exact: true }).click();
  await sort.getByRole("button", { name: "Put 13 under Even" }).click();
  await expect(score).toHaveText("3 of 10 sorted");
  await sort.getByRole("button", { name: "Check answers" }).click();
  await expect(score).toHaveText("2 of 10 right");
  await expect(bin(theirSort, "Even").getByLabel("wrong")).toHaveCount(1, { timeout: 20_000 });
  await expect(bin(theirSort, "Odd").getByLabel("correct")).toHaveCount(1);
  await expect(theirSort.getByRole("button")).toHaveCount(0);
  await shot(teacher, "sort");
  await shot(learner, "learner-sort");
  await sort.getByRole("button", { name: "Mix them up again" }).click();
  await expect(score).toHaveText("0 of 10 sorted");
  await sort.getByLabel("Ready-made set").selectOption({ label: "Metal or non-metal?" });
  await expect(theirSort).toContainText("Metal or non-metal?", { timeout: 20_000 });
  await expect(theirSort.getByRole("group", { name: "Cards to sort" })).toContainText("Sodium");
  // Write my own.
  await sort.getByRole("button", { name: "Write my own" }).click();
  await sort.getByRole("button", { name: "Clear all" }).click();
  await sort.getByRole("button", { name: "Start sorting" }).click();
  await expect(sort.getByRole("alert")).toContainText("at least two headings");
  await sort.getByLabel("Question").fill("Acid or alkali?");
  await sort.getByLabel("Heading 1", { exact: true }).fill("Acid");
  await sort.getByLabel("Cards for heading 1").fill("Lemon juice\nVinegar");
  await sort.getByLabel("Heading 2", { exact: true }).fill("Alkali");
  await sort.getByLabel("Cards for heading 2").fill("Soap\nBleach");
  await shot(teacher, "sort-write");
  await sort.getByRole("button", { name: "Start sorting" }).click();
  await expect(score).toHaveText("0 of 4 sorted");
  await expect(theirSort).toContainText("Acid or alkali?", { timeout: 20_000 });
  for (const [card, head] of [["Lemon juice", "Acid"], ["Vinegar", "Acid"], ["Soap", "Alkali"], ["Bleach", "Alkali"]]) {
    await sort.getByRole("button", { name: card, exact: true }).click();
    await sort.getByRole("button", { name: `Put ${card} under ${head}` }).click();
  }
  await sort.getByRole("button", { name: "Check answers" }).click();
  await expect(score).toHaveText("4 of 4 right — all correct!");
  await expect(theirSort.getByLabel("Score")).toHaveText("4 of 4 right — all correct!", { timeout: 20_000 });
});
