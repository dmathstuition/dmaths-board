import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The particle model, the pH scale, forces and the five newer diagrams to
// label: the teacher works them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.SCIPLUS_SHOTS || "";
const shot = async (p: Page, name: string) => {
  if (!SHOTS) return;
  await p.locator("[data-board]").first().evaluate((el) => el.scrollIntoView({ block: "end" }));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${SHOTS}/${name}.png` });
};

test("particle model, pH scale, forces and the newer diagrams, seen live by a learner", async ({ browser }) => {
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
  const both = (title: string) => [teacher.getByRole("region", { name: title }), learner.getByRole("region", { name: title })] as const;

  // ── Particle model: ice to start ──
  await tool(/^Particle model/);
  const [pm, theirPm] = both("Particle model"), state = pm.getByLabel("State", { exact: true }), theirState = theirPm.getByLabel("State", { exact: true });
  await expect(state).toContainText("Solid");
  await expect(state).toContainText("−25 °C");
  await expect(state).toContainText("They vibrate about fixed places.");
  await shot(teacher, "particles-solid");
  await pm.getByRole("button", { name: "Melting point" }).click();
  await expect(state).toContainText("Melting");
  await expect(state).toContainText("The temperature stays the same until it has all melted.");
  await pm.getByRole("button", { name: "Temperature: one more" }).click();
  await expect(theirState).toContainText("Liquid", { timeout: 20_000 });
  await expect(theirState).toContainText("They slide past one another.");
  await shot(teacher, "particles-liquid");
  await pm.getByRole("button", { name: "Boiling point" }).click();
  await expect(state).toContainText("Boiling");
  await pm.getByRole("button", { name: "Heat it" }).click();
  await expect(theirState).toContainText("Gas", { timeout: 20_000 });
  await expect(theirPm.getByRole("img", { name: /^Particles of water at 110 °C: gas\. Far apart\./ })).toBeVisible();
  await expect(theirPm.getByRole("img", { name: "Heating curve for water: melts at 0 °C, boils at 100 °C" })).toBeVisible();
  await expect(theirPm.getByRole("button")).toHaveCount(0); // learners watch; the teacher works it
  await shot(teacher, "particles-gas");
  await pm.getByLabel("Substance").selectOption({ label: "Iron" });
  await expect(theirState).toContainText("Solid", { timeout: 20_000 });
  await pm.getByRole("button", { name: "Close Particle model" }).click();

  // ── pH scale ──
  await tool(/^pH scale/);
  const [ph, theirPh] = both("pH scale"), reading = ph.getByLabel("Reading"), theirReading = theirPh.getByLabel("Reading");
  await expect(reading).toContainText("pH 7");
  await expect(reading).toContainText("Neutral");
  await expect(reading).toContainText("universal indicator turns green");
  await ph.getByRole("button", { name: "pH 2: red" }).click();
  await expect(reading).toContainText("Strong acid");
  await expect(ph.getByLabel("Strength")).toContainText("100,000 times more acidic than pure water");
  await expect(theirPh.getByLabel("Examples")).toContainText("lemon juice", { timeout: 20_000 });
  await shot(teacher, "ph-acid");
  await ph.getByLabel("Put in the beaker").selectOption({ label: "Bleach" });
  await expect(reading).toContainText("pH 12.5");
  await expect(reading).toContainText("Strong alkali");
  await expect(reading).toContainText("Bleach: universal indicator turns purple");
  await ph.getByRole("button", { name: "Phenolphthalein" }).click();
  await expect(theirReading).toContainText("phenolphthalein turns pink", { timeout: 20_000 });
  await ph.getByRole("button", { name: "Litmus" }).click();
  await expect(theirReading).toContainText("litmus turns blue", { timeout: 20_000 });
  await ph.getByRole("button", { name: "pH: one less" }).click();
  await expect(reading).toContainText("pH 12");
  // Quiz: the number is covered on every screen.
  await ph.getByRole("button", { name: "Hide the pH (quiz)" }).click();
  await expect(theirReading).toContainText("pH ?", { timeout: 20_000 });
  await expect(theirReading).toContainText("Acid, alkali or neutral?");
  await expect(theirPh).not.toContainText("Strong alkali");
  await expect(theirPh.getByRole("button")).toHaveCount(0);
  await shot(learner, "learner-ph-quiz");
  await ph.getByRole("button", { name: "Close pH scale" }).click();

  // ── Forces: a box pushed with 30 N against 10 N of friction ──
  await tool(/^Forces/);
  const [fc, theirFc] = both("Forces"), res = fc.getByLabel("Resultant", { exact: true }), theirRes = theirFc.getByLabel("Resultant", { exact: true });
  await expect(res).toContainText("Resultant force = 20 N to the right");
  await expect(res).toContainText("a = F ÷ m = 20 ÷ 5 = 4 m/s²");
  await shot(teacher, "forces-box");
  for (let i = 0; i < 4; i++) await fc.getByRole("button", { name: "← Friction: one more" }).click();
  await expect(res).toContainText("The forces are balanced: the resultant force is 0 N");
  await expect(theirRes).toContainText("balanced", { timeout: 20_000 });
  await fc.getByLabel("Scene").selectOption({ label: "Skydiver" });
  await expect(res).toContainText("Resultant force = 500 N downwards");
  await expect(res).toContainText("6.25 m/s²");
  await shot(teacher, "forces-skydiver");
  for (let i = 0; i < 5; i++) await fc.getByRole("button", { name: "↑ Air resistance: one more" }).click();
  await expect(theirRes).toContainText("the resultant force is 0 N", { timeout: 20_000 }); // terminal velocity
  await fc.getByRole("button", { name: "Hide the resultant (predict first)" }).click();
  await expect(theirRes).toContainText("What is the resultant force?", { timeout: 20_000 });
  await expect(theirFc.getByRole("button")).toHaveCount(0);
  await fc.getByRole("button", { name: "Show the resultant" }).click();
  await fc.getByLabel("Scene").selectOption({ label: "Rocket" });
  await expect(theirRes).toContainText("Resultant force = 5000 N upwards", { timeout: 20_000 });
  await fc.getByRole("button", { name: "Close Forces" }).click();

  // ── The five newer diagrams ──
  await tool(/^Label the diagram/);
  const [lab, theirLab] = both("Label the diagram");
  for (const [name, n] of [["Digestive system", 9], ["Eye", 9], ["Leaf (cut across)", 10], ["Skeleton", 10], ["Tooth", 9]] as const) {
    await lab.getByRole("button", { name, exact: true }).click();
    await expect(lab.getByRole("img", { name: /^Label \d+: / })).toHaveCount(n);
    await shot(teacher, `diagram-${name.toLowerCase().split(" ")[0]}`);
  }
  await expect(theirLab.getByRole("img", { name: "Label 1: Enamel" })).toBeVisible({ timeout: 20_000 });
  await lab.getByRole("button", { name: "Hide the names (quiz)" }).click();
  await expect(theirLab.getByRole("img", { name: /^Label \d+, covered$/ })).toHaveCount(9, { timeout: 20_000 });
});
