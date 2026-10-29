import { defineConfig, devices } from "@playwright/test";

// Browser tests for the live class and uploads (e2e/). They run against a real
// Next server with placeholder Supabase settings; every network call the page
// makes to Supabase or our APIs is answered by the test itself, including a
// small stand-in for Supabase Realtime, so they need no accounts or secrets.
//
//   npm run e2e            (builds nothing — starts `next dev` locally)
//   CI=1 npm run e2e       (expects `npm run build` first; uses `next start`)
const PORT = 3210;
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 820 },
    // The site's service worker (production builds) would fetch past the
    // tests' stand-in server, so keep it out of the way.
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.CI ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/check`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_TEST_PAGES: "1",
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "e2e-placeholder",
    },
  },
});
