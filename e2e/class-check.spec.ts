import { test, expect } from "@playwright/test";
import { realtimeHub } from "./helpers";

const ready = (inbox: boolean) => ({
  ok: true, now: Date.now(),
  database: [
    { name: "Interactive classes", file: "migration-live-sessions.sql", ready: true },
    { name: "Backup route for writing", file: "migration-board-inbox.sql", ready: inbox },
  ],
});

async function mockStorage(ctx: import("@playwright/test").BrowserContext) {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "PUT, POST, GET" };
  await ctx.route("**/storage/v1/object/upload/sign/**", (r) => r.fulfill({ status: r.request().method() === "OPTIONS" ? 204 : 200, headers: cors, json: { Key: "x" } }));
  await ctx.route("**/storage/v1/object/public/**", (r) => r.fulfill({ status: 200, headers: cors, contentType: "image/jpeg", body: "x" }));
  await ctx.route("**/api/live-sessions/diag", (r) => r.fulfill({ json: { ok: true } }));
}

test("Check my class passes when everything works", async ({ browser }) => {
  const ctx = await browser.newContext();
  await realtimeHub().attach(ctx, "teacher");
  await mockStorage(ctx);
  await ctx.route("**/api/live-sessions/check", (r) => r.request().method() === "GET"
    ? r.fulfill({ json: ready(true) })
    : r.fulfill({ json: { path: "slides/_check/a.jpg", token: "t", url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"}/storage/v1/object/public/materials/slides/_check/a.jpg` } }));
  const page = await ctx.newPage();
  await page.goto("/check");
  await page.getByRole("button", { name: "Start the check" }).click();
  await expect(page.getByText("All good — you're ready for class.")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/a message went out and back/)).toBeVisible();
});

test("Check my class names what's wrong", async ({ browser }) => {
  const ctx = await browser.newContext();
  await realtimeHub("learner-dead").attach(ctx, "learner"); // live connection refused
  await mockStorage(ctx);
  await ctx.route("**/api/live-sessions/check", (r) => r.request().method() === "GET"
    ? r.fulfill({ json: ready(false) })
    : r.fulfill({ status: 403, json: { error: "Sign in as a teacher to test uploads." } }));
  const page = await ctx.newPage();
  await page.goto("/check");
  await page.getByRole("button", { name: "Start the check" }).click();
  await expect(page.getByText(/checks? failed/)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText(/run supabase\/migration-board-inbox\.sql/)).toBeVisible();
  await expect(page.getByText(/The live connection didn't work/)).toBeVisible();
  await expect(page.getByText(/Sign in as a teacher/)).toBeVisible();
});
