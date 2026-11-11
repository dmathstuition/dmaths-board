import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Column methods, the bar model, the function machine, probability and angle
// facts: the teacher works them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.MATHSMORE_SHOTS || "";
const shot = async (p: Page, name: string) => {
  if (!SHOTS) return;
  await p.locator("[data-board]").first().evaluate((el) => el.scrollIntoView({ block: "end" }));
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${SHOTS}/${name}.png` });
};

test("column methods, bar model, function machine, probability and angle facts, seen live by a learner", async ({ browser }) => {
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

  // ── Column methods: 478 + 356 to start ──
  await tool(/^Column methods/);
  const [col, theirCol] = both("Column methods"), step = col.getByLabel("Step", { exact: true }), theirStep = theirCol.getByLabel("Step", { exact: true });
  await expect(step).toContainText("Step 1 of 5");
  await col.getByRole("button", { name: "Next step ▶" }).click();
  await expect(step).toContainText("Ones: 8 + 6 = 14. Write 4 and carry 1 to the tens.");
  await expect(theirStep).toContainText("Ones: 8 + 6 = 14", { timeout: 20_000 });
  await expect(theirCol.getByRole("button")).toHaveCount(0); // learners watch; the teacher works it
  await col.getByRole("button", { name: "Next step ▶" }).click();
  await shot(teacher, "column-add");
  await col.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("So 478 + 356 = 834.");
  await col.getByRole("button", { name: "Subtraction" }).click();
  await col.getByLabel("First number").fill("523");
  await col.getByLabel("Second number").fill("278");
  await col.getByRole("button", { name: "Next step ▶" }).click();
  await expect(step).toContainText("exchange 1 ten for 10 ones");
  await col.getByRole("button", { name: "Show it all" }).click();
  await expect(theirStep).toContainText("So 523 − 278 = 245.", { timeout: 20_000 });
  await shot(teacher, "column-sub");
  await col.getByRole("button", { name: "Long multiplication" }).click();
  await col.getByLabel("First number").fill("243");
  await col.getByLabel("Times").fill("36");
  await col.getByRole("button", { name: "Show it all" }).click();
  await expect(step).toContainText("So 243 × 36 = 8748.");
  await shot(teacher, "column-mul");
  await col.getByRole("button", { name: "Long division" }).click();
  await col.getByLabel("First number").fill("5362");
  await col.getByLabel("Divide by").fill("7");
  await expect(step).toContainText("How many 7s are in 5362?");
  await col.getByRole("button", { name: "Show it all" }).click();
  await expect(theirStep).toContainText("So 5362 ÷ 7 = 766.", { timeout: 20_000 });
  await expect(theirCol.getByRole("img", { name: /^Long division: 5362 ÷ 7/ })).toBeVisible();
  await shot(teacher, "column-div");
  await col.getByRole("button", { name: "Close Column methods" }).click();

  // ── Bar model ──
  await tool(/^Bar model/);
  const [bar, theirBar] = both("Bar model");
  await expect(bar.getByLabel("Question")).toHaveText("Ada and Ben share 60 in the ratio 2 : 3. How much does each get?");
  await expect(theirBar.getByRole("list", { name: "Working" })).toHaveCount(0);
  await bar.getByRole("button", { name: "Show one part" }).click();
  await expect(theirBar.getByRole("list", { name: "Working" })).toContainText("One part = 60 ÷ 5 = 12", { timeout: 20_000 });
  await expect(theirBar.getByRole("list", { name: "Working" })).not.toContainText("Answer");
  await bar.getByRole("button", { name: "Show the answer" }).click();
  await expect(theirBar.getByRole("list", { name: "Working" })).toContainText("Answer: Ada 24, Ben 36", { timeout: 20_000 });
  await shot(teacher, "bar-ratio");
  await bar.getByRole("button", { name: "Fraction of an amount" }).click();
  await expect(bar.getByLabel("Question")).toHaveText("Find 3/5 of 40.");
  await bar.getByRole("button", { name: "Show the answer" }).click();
  await expect(bar.getByRole("list", { name: "Working" })).toContainText("Answer: 24");
  await bar.getByRole("button", { name: "Percentage" }).click();
  await expect(bar.getByLabel("Question")).toHaveText("Find 30% of 250.");
  await bar.getByLabel("We are told").selectOption({ label: "The percentage's value" });
  await bar.getByLabel("It is").fill("75");
  await expect(theirBar.getByLabel("Question")).toHaveText("30% of a number is 75. What is the number?", { timeout: 20_000 });
  await bar.getByRole("button", { name: "Show the answer" }).click();
  await expect(theirBar.getByRole("list", { name: "Working" })).toContainText("Answer: 250", { timeout: 20_000 });
  await shot(teacher, "bar-percent");
  await bar.getByRole("button", { name: "Close Bar model" }).click();

  // ── Function machine: × 3, then + 2 ──
  await tool(/^Function machine/);
  const [fm, theirFm] = both("Function machine");
  await expect(fm.getByRole("img", { name: "Function machine: input 4, rule × 3, then + 2, output 14" })).toBeVisible();
  await expect(fm.getByLabel("Rule", { exact: true })).toContainText("y = 3x + 2");
  await fm.getByRole("button", { name: "Input: one more" }).click();
  await expect(theirFm.getByRole("img", { name: /input 5, rule × 3, then \+ 2, output 17/ })).toBeVisible({ timeout: 20_000 });
  await fm.getByRole("button", { name: "Add to the table" }).click();
  await fm.getByRole("button", { name: "Input: one more" }).click();
  await fm.getByRole("button", { name: "Add to the table" }).click();
  await fm.getByRole("button", { name: "Hide the rule" }).click();
  await expect(theirFm.getByLabel("Rule", { exact: true })).toContainText("What is the rule?", { timeout: 20_000 });
  await expect(theirFm.getByRole("img", { name: /rule hidden/ })).toBeVisible();
  await expect(theirFm.getByRole("table", { name: "Table of values" })).toContainText("17");
  await expect(theirFm).not.toContainText("3x");
  await shot(learner, "learner-machine-quiz");
  await fm.getByRole("button", { name: "Reveal" }).click();
  await expect(theirFm.getByLabel("Rule", { exact: true })).toContainText("× 3, then + 2", { timeout: 20_000 });
  await fm.getByRole("button", { name: "Inverse machine" }).click();
  await expect(theirFm.getByLabel("Rule", { exact: true })).toContainText("Going back: − 2, then ÷ 3", { timeout: 20_000 });
  await shot(teacher, "machine");
  await fm.getByRole("button", { name: "Close Function machine" }).click();

  // ── Probability: a spinner that is half red ──
  await tool(/^Probability/);
  const [ch, theirCh] = both("Probability");
  await expect(ch.getByRole("row", { name: /^Red/ })).toContainText("1/2 = 0.50");
  await expect(ch.getByLabel("Goes")).toContainText("No goes yet");
  await ch.getByRole("button", { name: "1 go", exact: true }).click();
  await expect(ch.getByLabel("Goes")).toContainText("1 go so far");
  const landed = (await ch.getByLabel("Last result").textContent())!;
  expect(landed).toMatch(/^Landed on (Red|Blue|Green)$/);
  await expect(theirCh.getByLabel("Last result")).toHaveText(landed, { timeout: 20_000 });
  await ch.getByRole("button", { name: "1000 goes" }).click();
  await expect(theirCh.getByLabel("Goes")).toContainText("1001 goes so far", { timeout: 20_000 });
  const red = Number((await theirCh.getByRole("row", { name: /^Red/ }).getByRole("cell").nth(1).textContent())!);
  expect(red).toBeGreaterThan(0.42); expect(red).toBeLessThan(0.58); // close to a half
  await shot(teacher, "chance");
  await ch.getByRole("button", { name: "Coin" }).click();
  await ch.getByRole("button", { name: "100 goes", exact: true }).click();
  await expect(theirCh.getByRole("row", { name: /^Heads/ })).toContainText("1/2 = 0.50", { timeout: 20_000 });
  await expect(theirCh.getByLabel("Goes")).toContainText("100 goes so far");
  await ch.getByRole("button", { name: "Start again" }).click();
  await expect(theirCh.getByLabel("Goes")).toContainText("No goes yet", { timeout: 20_000 });
  await expect(theirCh.getByRole("button")).toHaveCount(0);
  await ch.getByRole("button", { name: "Close Probability" }).click();

  // ── Angle facts ──
  await tool(/^Angle facts/);
  const [an, theirAn] = both("Angle facts"), fact = an.getByLabel("Fact", { exact: true }), theirFact = theirAn.getByLabel("Fact", { exact: true });
  await expect(fact).toContainText("Angles in a triangle add up to 180°");
  await an.getByRole("button", { name: "Right-angled" }).click();
  await expect(fact).toContainText("right-angled");
  await an.getByRole("button", { name: "Equilateral" }).click();
  await expect(fact).toContainText("60° + 60° + 60° = 180°");
  // Drag the top corner across: the angles change but still add up to 180.
  const corner = (await an.locator('circle[data-corner="2"]').boundingBox())!, cx = corner.x + corner.width / 2, cy = corner.y + corner.height / 2;
  await teacher.mouse.move(cx, cy);
  await teacher.mouse.down();
  await teacher.mouse.move(cx + 90, cy + 20, { steps: 8 });
  await teacher.mouse.up();
  await expect(fact).not.toContainText("60° + 60° + 60°");
  await expect(fact).toContainText("= 180°");
  await expect(theirFact).toContainText("Scalene", { timeout: 20_000 });
  await shot(teacher, "angles-triangle");
  await an.getByRole("button", { name: "Hide an angle" }).click();
  await expect(theirFact).toContainText("The missing angle is 180° −", { timeout: 20_000 });
  await expect(theirAn.getByRole("img", { name: /^Triangle with angles \?/ })).toBeVisible();
  await an.getByRole("button", { name: "Reveal" }).click();
  await expect(theirAn.getByRole("img", { name: /^Triangle with angles \d+°/ })).toBeVisible({ timeout: 20_000 });
  await an.getByRole("button", { name: "Parallel lines" }).click();
  await expect(fact).toContainText("only two sizes of angle");
  await an.getByRole("button", { name: "Alternate" }).click();
  await expect(fact).toHaveText("Alternate angles are equal (a Z shape): both are 60°.");
  await an.getByRole("button", { name: "Slope: one more" }).click();
  await expect(theirFact).toHaveText("Alternate angles are equal (a Z shape): both are 61°.", { timeout: 20_000 });
  await shot(teacher, "angles-parallel");
  await an.getByRole("button", { name: "Co-interior" }).click();
  await expect(fact).toContainText("119° + 61° = 180°");
  await an.getByRole("button", { name: "Straight line" }).click();
  await expect(theirFact).toHaveText("Angles on a straight line add up to 180°: 119° + 61° = 180°.", { timeout: 20_000 });
  await expect(theirAn.getByRole("button")).toHaveCount(0);
  await shot(teacher, "angles-line");
});
