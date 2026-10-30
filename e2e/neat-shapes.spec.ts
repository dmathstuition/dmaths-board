import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub, within } from "./helpers";

// With "Neat shapes" on, a rough circle drawn with the pen is saved as a clean
// circle; with it off, it stays exactly as drawn.
async function drawLoop(p: Page) {
  const c = p.locator("canvas").first();
  const b = (await c.boundingBox())!;
  const cx = b.x + b.width * 0.5, cy = b.y + b.height * 0.5, r = b.height * 0.25;
  await p.mouse.move(cx + r, cy);
  await p.mouse.down();
  for (let i = 1; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2 * 0.97, wob = 1 + Math.sin(i * 1.7) * 0.04;
    await p.mouse.move(cx + Math.cos(a) * r * wob, cy + Math.sin(a) * r * wob);
  }
  await p.mouse.up();
}

for (const on of [true, false]) {
  test(`a rough circle ${on ? "becomes a clean circle" : "stays as drawn"} with Neat shapes ${on ? "on" : "off"}`, async ({ browser }) => {
    const hub = realtimeHub("normal"), server = classServer();
    const ctx = await browser.newContext();
    await hub.attach(ctx, "teacher");
    await server.attach(ctx, "teacher");
    const page = await ctx.newPage();
    await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    await expect(page.locator("canvas").first()).toBeVisible();
    const toggle = page.getByRole("button", { name: /^Neat shapes/ });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    if (on) { await toggle.click(); await expect(toggle).toHaveAttribute("aria-pressed", "true"); }
    await drawLoop(page);
    const kinds = () => (server.saved()?.pages ?? []).flat().map((s) => s.kind ?? "pen");
    await within(15, async () => kinds().length > 0);
    expect(kinds()).toEqual([on ? "ellipse" : "pen"]);
    await ctx.close();
  });
}
