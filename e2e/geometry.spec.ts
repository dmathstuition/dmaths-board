import { test, expect, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Typed equations, compasses and 3D shapes on the teacher's board.
async function board(browser: import("@playwright/test").Browser) {
  const hub = realtimeHub("normal"), server = classServer();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  await hub.attach(ctx, "teacher");
  await server.attach(ctx, "teacher");
  const page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  return { page, server };
}
const items = (server: ReturnType<typeof classServer>) => (server.saved()?.pages ?? []).flat() as { kind?: string; text?: string; pts: number[] }[];
async function tapBoard(page: Page, fx: number, fy: number) {
  const c = page.locator("canvas").first(), b = (await c.boundingBox())!;
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
}

test("the equation writer puts neat maths on the board, and it can be changed", async ({ browser }) => {
  const { page, server } = await board(browser);
  await page.getByRole("button", { name: /Equation/ }).first().click();
  await tapBoard(page, 0.2, 0.25);
  const ed = page.getByRole("dialog", { name: "Equation" });
  await ed.getByLabel(/Type maths/).fill("x = (-b +- sqrt(b^2 - 4ac))/(2a)");
  await expect(ed.getByRole("img", { name: /Preview of/ })).toBeVisible();
  await ed.getByRole("button", { name: "Insert Matrix" }).click();
  await ed.getByLabel(/Type maths/).press("End");
  await ed.screenshot({ path: "test-results/equation-editor.png" });
  await ed.getByLabel(/Type maths/).fill("x = (-b +- sqrt(b^2 - 4ac))/(2a)");
  await ed.getByRole("button", { name: "Put on the board" }).click();
  await expect(ed).toBeHidden();
  await expect.poll(() => items(server).filter((s) => s.kind === "math").map((s) => s.text), { timeout: 15_000 }).toEqual(["x = (-b +- sqrt(b^2 - 4ac))/(2a)"]);

  // Tapping it again with the equation tool changes it.
  await tapBoard(page, 0.22, 0.28);
  await expect(ed.getByLabel(/Type maths/)).toHaveValue("x = (-b +- sqrt(b^2 - 4ac))/(2a)");
  await ed.getByLabel(/Type maths/).fill("[1, 2; 3, 4] + 3/4");
  await ed.getByRole("button", { name: "Update" }).click();
  await expect.poll(() => items(server).filter((s) => s.kind === "math").map((s) => s.text), { timeout: 15_000 }).toEqual(["[1, 2; 3, 4] + 3/4"]);
  await page.locator("canvas").first().screenshot({ path: "test-results/equation-board.png" });
});

test("compasses draw a circle and an arc; 3D shapes turn and show nets and volume", async ({ browser }) => {
  const { page, server } = await board(browser);
  await page.getByRole("button", { name: "Class tools" }).click();
  await page.getByRole("button", { name: /Compasses/ }).first().click();
  await expect(page.getByRole("img", { name: "Compasses opened to 5 centimetres" })).toBeVisible();
  await page.getByRole("button", { name: "Open the compasses a little" }).click();
  await expect(page.getByRole("img", { name: "Compasses opened to 5.5 centimetres" })).toBeVisible();
  await page.getByRole("button", { name: /Draw circle/ }).click();
  await expect.poll(() => items(server).filter((s) => s.kind === "ellipse").length, { timeout: 15_000 }).toBe(1);
  const circle = items(server).find((s) => s.kind === "ellipse")!;
  expect((circle.pts[2] - circle.pts[0]) * 1600 / 2).toBeCloseTo(5.5 * 32, 0); // radius in board units

  // An arc: with drawing on, turn the pencil end.
  await page.getByRole("button", { name: /Draw an arc/ }).click();
  const pencil = page.locator('[aria-label="Turn to draw an arc"]');
  const pb = (await pencil.boundingBox())!;
  const svg = (await page.getByRole("img", { name: /Compasses opened/ }).boundingBox())!;
  const cx = svg.x + svg.width * 0.5, cy = svg.y + svg.height * 0.55, R = pb.x + pb.width / 2 - cx;
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * (Math.PI / 2); await page.mouse.move(cx + R * Math.cos(a), cy + R * Math.sin(a)); }
  await page.mouse.up();
  await expect.poll(() => items(server).filter((s) => (s.kind ?? "pen") === "pen" && s.pts.length >= 8).length, { timeout: 15_000 }).toBe(1);
  await page.locator("canvas").first().screenshot({ path: "test-results/compasses.png" });
  await page.getByRole("button", { name: "Put the compasses away" }).click();

  // 3D shapes.
  await page.getByRole("button", { name: "Class tools" }).click();
  await page.getByRole("button", { name: /3D shapes/ }).first().click();
  const panel = page.getByRole("region", { name: "3D shapes" });
  await expect(panel.getByText("V = l × w × h = 6 × 4 × 3 = 72 cm³")).toBeVisible();
  await panel.getByRole("button", { name: "Cylinder" }).click();
  await panel.getByRole("spinbutton", { name: "radius" }).fill("2");
  await panel.getByRole("spinbutton", { name: "height" }).fill("5");
  await expect(panel.getByText(/V = πr²h = π × 2² × 5 = 20π ≈ 62\.83 cm³/)).toBeVisible();
  const view = panel.getByRole("img", { name: /cylinder/ }), vb = (await view.boundingBox())!;
  await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2); await page.mouse.down();
  await page.mouse.move(vb.x + vb.width / 2 + 80, vb.y + vb.height / 2 + 30, { steps: 5 }); await page.mouse.up();
  await panel.screenshot({ path: "test-results/solid-3d.png" });
  await panel.getByRole("button", { name: "Cone" }).click();
  await panel.getByRole("button", { name: "Show the net" }).click();
  await expect(panel.getByRole("img", { name: "The net of a cone" })).toBeVisible();
  await expect(panel.getByText(/° sector/)).toBeVisible();
  await panel.screenshot({ path: "test-results/solid-net.png" });
});
