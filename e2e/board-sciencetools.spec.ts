import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The periodic table, the circuit builder and label-the-diagram: the teacher
// works them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.SCITOOL_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(600); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };

test("periodic table, circuit builder and label the diagram, seen live by a learner", async ({ browser }) => {
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
    if (String(name).includes("Periodic")) await shot(teacher, "menu");
    await teacher.getByRole("dialog", { name: "Class tools" }).getByRole("button", { name }).click();
  };

  // ── Periodic table ──
  await tool(/^Periodic table/);
  const pt = teacher.getByRole("region", { name: "Periodic table" }), theirPt = learner.getByRole("region", { name: "Periodic table" });
  await expect(pt.getByRole("button", { name: /atomic number \d+$/ })).toHaveCount(118);
  await pt.getByRole("button", { name: "Sodium, Na, atomic number 11" }).click();
  const card = pt.getByLabel("Element details");
  await expect(card).toContainText("Sodium");
  await expect(card).toContainText("Alkali metal");
  await expect(card).toContainText("2, 8, 1");
  await expect(theirPt.getByLabel("Element details")).toContainText("Sodium", { timeout: 20_000 });
  await expect(theirPt.getByRole("button", { name: /atomic number/i })).toHaveCount(0); // learners watch; the teacher works it
  await shot(teacher, "ptable");
  await pt.getByRole("button", { name: "Solid, liquid, gas" }).click();
  await expect(pt.getByRole("list", { name: "Key" })).toContainText("Liquid");
  await expect(theirPt.getByRole("list", { name: "Key" })).toContainText("Liquid", { timeout: 20_000 });
  // Quiz: names hidden until the teacher reveals.
  await pt.getByRole("button", { name: "Hide names (quiz)" }).click();
  await expect(pt.getByRole("button", { name: /^Sodium/ })).toHaveCount(0);
  await pt.getByRole("button", { name: "Atomic number 17", exact: true }).click();
  await expect(card).toContainText("Which element is this?");
  await expect(card).toContainText("group 17, period 3");
  await expect(theirPt.getByLabel("Element details")).toContainText("Which element is this?", { timeout: 20_000 });
  await expect(theirPt.getByLabel("Element details")).not.toContainText("Chlorine");
  await shot(learner, "learner-ptable-quiz");
  await card.getByRole("button", { name: "Reveal" }).click();
  await expect(theirPt.getByLabel("Element details")).toContainText("Chlorine", { timeout: 20_000 });
  await pt.getByRole("button", { name: "Close Periodic table" }).click();
  await expect(theirPt).toBeHidden({ timeout: 20_000 });

  // ── Circuit builder ──
  await tool(/^Circuit builder/);
  const cir = teacher.getByRole("region", { name: "Circuit builder" }), theirCir = learner.getByRole("region", { name: "Circuit builder" });
  const read = cir.getByLabel("Readings"), theirRead = theirCir.getByLabel("Readings");
  await expect(read).toContainText("Battery 3 V");
  await expect(read).toContainText("Current from the battery 0.5 A");
  await cir.getByRole("button", { name: "Two bulbs in series" }).click();
  await expect(read).toContainText("Current from the battery 0.25 A");
  await expect(read).toContainText("In series");
  await cir.getByRole("button", { name: "Two bulbs in parallel" }).click();
  await expect(read).toContainText("Current from the battery 1 A");
  await expect(read).toContainText("Branch 2: 0.5 A");
  // Drag a resistor from the tray onto branch 2.
  const from = (await cir.getByRole("button", { name: "Resistor" }).boundingBox())!, to = (await cir.locator('rect[data-branch="1"]').boundingBox())!;
  await teacher.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await teacher.mouse.down();
  await teacher.mouse.move(to.x + to.width / 2, to.y + to.height * 0.8, { steps: 8 });
  await teacher.mouse.up();
  await expect(read).toContainText("Branch 2: 0.19 A");
  await expect(theirRead).toContainText("Current from the battery 0.69 A", { timeout: 20_000 });
  // Tap, then tap: a switch on branch 1, opened.
  await cir.getByRole("button", { name: "Switch", exact: true }).click();
  await cir.getByRole("button", { name: "Put the switch on branch 1" }).click();
  await cir.getByRole("button", { name: "Switch, closed, branch 1" }).click();
  await cir.getByRole("button", { name: "Open the switch" }).click();
  await expect(read).toContainText("Branch 1: switch open, 0 A");
  await expect(theirRead).toContainText("Branch 1: switch open, 0 A", { timeout: 20_000 });
  // Three cells, and a voltmeter across the resistor: 10 Ω of the branch's 16 Ω gets 2.81 V of the 4.5 V.
  await cir.getByRole("button", { name: "More cells" }).click();
  await expect(read).toContainText("Battery 4.5 V");
  await cir.getByLabel("Voltmeter across").selectOption({ label: "resistor 2 on branch 2" });
  await expect(read).toContainText("Voltmeter 2.81 V");
  await expect(theirRead).toContainText("Battery 4.5 V", { timeout: 20_000 });
  await expect(theirCir.getByRole("button", { name: /Main switch|Bulb|Resistor/ })).toHaveCount(0);
  await shot(teacher, "circuit");
  await shot(learner, "learner-circuit");
  await cir.getByRole("button", { name: "Main switch, closed" }).click();
  await expect(read).toContainText("no current flows");
  await cir.getByRole("button", { name: "Main switch, open" }).click();
  // A branch with only an ammeter is a short circuit.
  await cir.getByRole("button", { name: "Clear" }).click();
  await cir.getByRole("button", { name: "Ammeter" }).click();
  await cir.getByRole("button", { name: "Put the ammeter on branch 1" }).click();
  await expect(read.getByRole("alert")).toContainText("Short circuit");
  await expect(theirRead).toContainText("Short circuit", { timeout: 20_000 });
  await cir.getByRole("button", { name: "Close Circuit builder" }).click();

  // ── Label the diagram ──
  await tool(/^Label the diagram/);
  const lab = teacher.getByRole("region", { name: "Label the diagram" }), theirLab = learner.getByRole("region", { name: "Label the diagram" });
  await expect(lab.getByRole("img", { name: "Label 1: Cell wall" })).toBeVisible();
  await expect(lab.getByRole("img", { name: /^Label \d+: / })).toHaveCount(7);
  await shot(teacher, "labels-plant");
  await lab.getByRole("button", { name: "Hide the names (quiz)" }).click();
  await expect(lab.getByRole("button", { name: /^Label \d+, covered$/ })).toHaveCount(7);
  await expect(theirLab.getByRole("img", { name: /^Label \d+, covered$/ })).toHaveCount(7, { timeout: 20_000 });
  await expect(theirLab).not.toContainText("Cell wall");
  await lab.getByRole("button", { name: "Reveal the next one" }).click(); // top of the drawing first
  await expect(lab.getByRole("button", { name: "Label 5: Chloroplast" })).toBeVisible();
  await lab.getByRole("button", { name: "Label 1, covered" }).click();
  await lab.getByRole("button", { name: "What each part does" }).click();
  await expect(lab.getByRole("list", { name: "What each part does" })).toContainText("Made of cellulose");
  await expect(theirLab.getByRole("img", { name: "Label 1: Cell wall" })).toBeVisible({ timeout: 20_000 });
  await expect(theirLab.getByRole("img", { name: /^Label \d+, covered$/ })).toHaveCount(5);
  await expect(theirLab).not.toContainText("Vacuole");
  await shot(learner, "learner-labels-quiz");
  for (const [name, n] of [["Heart", 10], ["Flower", 9], ["Bunsen burner", 7], ["Animal cell", 5]] as const) {
    await lab.getByRole("button", { name, exact: true }).click();
    await expect(lab.getByRole("button", { name: /^Label \d+, covered$/ })).toHaveCount(n);
    await lab.getByRole("button", { name: "Quiz on — show all names" }).click();
    await expect(lab.getByRole("img", { name: /^Label \d+: / })).toHaveCount(n);
    await shot(teacher, `labels-${name.toLowerCase().replace(/ /g, "-")}`);
    await lab.getByRole("button", { name: "Hide the names (quiz)" }).click();
  }
  await expect(theirLab.getByRole("img", { name: /^Label \d+, covered$/ })).toHaveCount(5, { timeout: 20_000 });
});
