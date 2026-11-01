import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The Desmos-style graph plotter on the teacher's board.
test("graph plotter: rows, sliders, inequalities, key points and a table", async ({ browser }) => {
  const hub = realtimeHub("normal"), server = classServer();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await hub.attach(ctx, "teacher");
  await server.attach(ctx, "teacher");
  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  await page.getByRole("button", { name: "Class tools" }).click();
  await page.getByRole("button", { name: /Graph plotter/ }).first().click();
  const plot = page.getByRole("region", { name: "Graph plotter" });
  await expect(plot).toBeVisible();

  // A slider appears for the letter a.
  await plot.getByRole("textbox", { name: "Graph row 1" }).fill("y = a x^2 - 4");
  await expect(plot.getByRole("slider", { name: "Slider a" })).toBeVisible();
  await expect(plot.getByText("a = 1")).toBeVisible();
  await plot.getByRole("slider", { name: "Slider a" }).fill("2");
  await expect(plot.getByText("a = 2")).toBeVisible();

  // More rows: an inequality, a vertical line and points.
  await plot.getByRole("textbox", { name: "Graph row 2" }).fill("y > x + 2");
  await plot.getByRole("textbox", { name: "Graph row 3" }).fill("x = 3");
  await plot.getByRole("textbox", { name: "Graph row 4" }).fill("(1, 5), (-2, 0)");
  await expect(plot.locator("polygon")).not.toHaveCount(0); // the shaded region
  await expect(plot.getByText("(1, 5)")).toBeVisible();

  // Key points: 2x² − 4 has roots at ±√2 and its minimum at (0, −4).
  await plot.getByRole("button", { name: "Key points" }).click();
  const labels = plot.locator("svg text");
  await expect(labels.filter({ hasText: "(0, -4)" }).first()).toBeVisible();
  await expect(labels.filter({ hasText: "(1.414, 0)" })).toBeVisible();

  // A table of values for the first row.
  await plot.getByRole("button", { name: "Table" }).click();
  const table = plot.getByRole("table");
  await expect(table).toContainText("-4");
  await expect(table).toContainText("14"); // 2·3² − 4

  // A mistake is explained, not a crash.
  await plot.getByRole("textbox", { name: "Graph row 5" }).fill("y = 2x +");
  await expect(plot.getByText(/ends too soon|Check/)).toBeVisible();

  await plot.getByRole("button", { name: "Bigger" }).click();
  await page.screenshot({ path: "test-results/graph-plotter.png" });
  await ctx.close();
});
