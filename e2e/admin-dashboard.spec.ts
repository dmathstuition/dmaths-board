import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

// The admin dashboard draws its numbers, charts and lists, and fits a phone.
const stats = readFileSync(join(__dirname, "fixtures/admin-stats.json"), "utf8");

for (const [name, width, height] of [["laptop", 1280, 900], ["phone", 390, 844]] as const) {
  test(`admin dashboard shows the numbers (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route("**/api/board/admin/stats", (r) => r.fulfill({ contentType: "application/json", body: stats }));
    await page.goto("/e2e-admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Revenue this month")).toBeVisible();
    await expect(page.getByText("₦30,000").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /^New teachers:/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From sign-up to paying" })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Ada Obi/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

test("admin dashboard says when it can't load", async ({ page }) => {
  await page.route("**/api/board/admin/stats", (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Admins only." }) }));
  await page.goto("/e2e-admin");
  await expect(page.getByRole("alert").filter({ hasText: "Admins only." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
