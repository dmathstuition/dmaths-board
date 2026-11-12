import { test, expect } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// The measuring instruments in the laboratory: vernier callipers, the
// micrometer screw gauge, outside and inside callipers, and a spring balance
// with a eureka can. Each is done right through; the close-ups are shown where
// a scale is read.
const SHOTS = process.env.LAB_SHOTS; // a folder: screenshots of the close-ups
const PRACTICALS = [
  { tile: "Reading Vernier Callipers", look: ["Read the zero error", "Read the callipers (diameter of the marble)", "Read the callipers (inside diameter of the test tube)"], graph: null },
  { tile: "Micrometer Screw Gauge", look: ["Read the zero error", "Read the micrometer (one end)"], graph: null },
  { tile: "Outside & Inside Callipers", look: ["Set the outside callipers on the pipe", "Read where the right point is"], graph: null },
  { tile: "Archimedes' Principle", look: ["Read its weight in air", "Read its weight in water"], graph: null },
];

for (const pr of PRACTICALS) {
  test(`measuring in the lab: ${pr.tile}, done step by step`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 3 : 1 });
    await realtimeHub().attach(ctx, "teacher");
    await classServer().attach(ctx, "teacher");
    const p = await ctx.newPage();
    await p.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
    await agree(p);
    await p.getByRole("button", { name: "Laboratory" }).click();
    const lab = p.getByRole("dialog", { name: "Laboratory" });
    await lab.getByPlaceholder(/Search/).fill(pr.tile.split(" ")[pr.tile.startsWith("Reading") ? 1 : 0]);
    await lab.getByRole("button", { name: pr.tile, exact: true }).click();
    const bench = lab.getByRole("group", { name: /Lab bench/ });
    await expect(bench).toBeVisible({ timeout: 30_000 });
    const seen = new Set<string>();
    for (let i = 0; i < 60 && !(await lab.getByText("✓ Practical complete").isVisible()); i++) {
      for (const h of pr.look) {
        if (!seen.has(h) && await lab.getByRole("heading", { name: h, exact: true }).isVisible()) {
          seen.add(h);
          await p.waitForTimeout(500);
          if (SHOTS) await bench.screenshot({ path: `${SHOTS}/${pr.tile.replace(/\W+/g, "-")}-${seen.size}.png` });
        }
      }
      const doIt = lab.getByRole("button", { name: "Do this step for me" });
      if (await doIt.isVisible()) await doIt.click();
      else await lab.getByRole("button", { name: "Show me the answer" }).click();
      await p.waitForTimeout(700);
    }
    await expect(lab.getByText("✓ Practical complete")).toBeVisible();
    expect([...seen]).toEqual(pr.look);
    const notebook = lab.getByRole("complementary", { name: "Lab notebook" });
    await expect(notebook.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true");
    if (SHOTS) await lab.screenshot({ path: `${SHOTS}/${pr.tile.replace(/\W+/g, "-")}-done.png` });
  });
}
