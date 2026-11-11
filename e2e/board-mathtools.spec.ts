import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The geoboard, the equation balance and the chart maker: the teacher works
// them and a learner (joined by PIN) sees every change.
const SHOTS = process.env.MATHTOOL_SHOTS || "";
const shot = async (p: Page, name: string) => { if (SHOTS) { await p.waitForTimeout(600); await p.screenshot({ path: `${SHOTS}/${name}.png` }); } };

test("geoboard, equation balance and chart maker, seen live by a learner", async ({ browser }) => {
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

  // ── Geoboard: a 4 by 3 rectangle ──
  await tool(/^Geoboard/);
  const geo = teacher.getByRole("region", { name: "Geoboard" });
  for (const [c, r] of [[2, 2], [6, 2], [6, 5], [2, 5], [2, 2]]) await geo.getByRole("button", { name: `Peg ${c} across, ${r} down` }).click();
  await expect(geo.getByRole("list", { name: "Shapes" })).toContainText(/rectangle/i);
  await expect(geo.getByRole("list", { name: "Shapes" })).toContainText("Area 12 square units");
  await expect(geo.getByRole("list", { name: "Shapes" })).toContainText("Perimeter 14 units");
  await geo.getByRole("button", { name: "Angles" }).click();
  await expect(geo.getByText("90°")).toHaveCount(4);
  await geo.getByRole("button", { name: "Mirror ↕" }).click();
  await expect(geo.getByText("symmetrical in the mirror line")).toBeVisible();
  // A second band: a right-angled triangle with a slanted side.
  await geo.getByRole("button", { name: "+ Band" }).click();
  for (const [c, r] of [[1, 6], [3, 6], [3, 4], [1, 6]]) await geo.getByRole("button", { name: `Peg ${c} across, ${r} down` }).click();
  await expect(geo.getByRole("list", { name: "Shapes" })).toContainText(/right-angled isosceles triangle/i);
  await expect(geo.getByRole("list", { name: "Shapes" })).toContainText("4 + 2√2");
  const theirGeo = learner.getByRole("region", { name: "Geoboard" });
  await expect(theirGeo.getByRole("list", { name: "Shapes" })).toContainText("Area 12 square units", { timeout: 20_000 });
  await expect(theirGeo.getByRole("button", { name: /^Peg/ })).toHaveCount(0); // learners watch; the teacher works it
  await shot(teacher, "geoboard");
  await geo.getByRole("button", { name: "Close Geoboard" }).click();
  await expect(theirGeo).toBeHidden({ timeout: 20_000 });

  // ── Equation balance: 2x + 3 = 11 ──
  await tool(/^Equation balance/);
  const bal = teacher.getByRole("region", { name: "Equation balance" });
  await expect(bal.getByRole("status")).toContainText("Balanced");
  // One side only: it tips.
  await bal.getByRole("button", { name: "Left only" }).click();
  await bal.getByRole("button", { name: "Take 1", exact: true }).click();
  await expect(bal.getByRole("status")).toContainText("Not balanced — the right side is heavier");
  await expect(learner.getByRole("region", { name: "Equation balance" }).getByRole("status")).toContainText("Not balanced", { timeout: 20_000 });
  await shot(teacher, "balance-tipped");
  await bal.getByRole("button", { name: "Start again" }).click();
  // The same to both sides, to x = 4.
  await bal.getByRole("button", { name: "Both sides", exact: true }).click();
  await bal.getByRole("button", { name: "More" }).click();
  await bal.getByRole("button", { name: "More" }).click();
  await bal.getByRole("button", { name: "Take 3", exact: true }).click();
  await expect(bal.getByRole("list", { name: "Steps" })).toContainText("Take 3 from both sides");
  await expect(bal.getByRole("list", { name: "Steps" })).toContainText("2x = 8");
  await bal.getByRole("button", { name: "Divide by 2" }).click();
  await expect(bal.getByRole("status")).toContainText("Solved: x = 4");
  await expect(learner.getByRole("region", { name: "Equation balance" }).getByRole("status")).toContainText("Solved: x = 4", { timeout: 20_000 });
  await shot(teacher, "balance-solved");
  // An equation with no whole-number answer is refused; x on both sides is made up for you.
  await bal.getByLabel("Number on the right").fill("12");
  await bal.getByRole("button", { name: "Set" }).click();
  await expect(bal.getByRole("alert")).toContainText("whole-number answer");
  await bal.getByRole("button", { name: "x on both sides" }).click();
  await expect(bal.getByRole("status")).toContainText("Balanced");
  await bal.getByRole("button", { name: "Close Equation balance" }).click();

  // ── Chart maker ──
  await tool(/^Chart maker/);
  const chart = teacher.getByRole("region", { name: "Chart maker" });
  await expect(chart.getByRole("img", { name: /^Bar chart: Favourite fruit\. Mango: 8, Orange: 5/ })).toBeVisible();
  await expect(chart.getByLabel("Statistics")).toContainText("Mean 5.5");
  await expect(chart.getByLabel("Statistics")).toContainText("Range 5");
  await chart.getByLabel("Value 2").fill("8");
  await expect(chart.getByLabel("Statistics")).toContainText("Mode 8");
  await chart.getByRole("button", { name: "Show working" }).click();
  await expect(chart.getByLabel("Statistics")).toContainText("Mean = total ÷ how many = 25 ÷ 4 = 6.25");
  await shot(teacher, "chart-bar");
  await chart.getByRole("button", { name: "Pie chart" }).click();
  const theirChart = learner.getByRole("region", { name: "Chart maker" });
  await expect(theirChart.getByRole("img", { name: /^Pie chart/ })).toBeVisible({ timeout: 20_000 });
  await expect(theirChart.getByLabel("Statistics")).toContainText("Mean 6.25");
  await expect(theirChart.getByLabel("Data table")).toHaveCount(0);
  await shot(teacher, "chart-pie");
  await chart.getByRole("button", { name: "Histogram" }).click();
  await chart.getByLabel("List of numbers").fill("2, 4, 4, 7, 9, 11, 12, 12, 12, 18");
  await expect(chart.getByRole("img", { name: /^Histogram.*0 to 5: 3, 5 to 10: 2, 10 to 15: 4, 15 to 20: 1/ })).toBeVisible();
  await expect(chart.getByLabel("Statistics")).toContainText("Mode 12");
  await expect(theirChart.getByRole("img", { name: /^Histogram/ })).toBeVisible({ timeout: 20_000 });
  await shot(teacher, "chart-hist");
  await shot(learner, "learner-chart");
});
