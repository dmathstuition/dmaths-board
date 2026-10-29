import { describe, it, expect, beforeEach, vi } from "vitest";

// The hits Map is module-level state. We reset it by re-importing the module
// fresh before each test via vi.resetModules() + dynamic import().
let rateLimit: (key: string, max?: number, windowMs?: number) => boolean;
let clientKey: (req: Request, scope: string) => string;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const mod = await import("@/lib/ratelimit");
  rateLimit = mod.rateLimit;
  clientKey = mod.clientKey;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows the first request", () => {
    expect(rateLimit("test", 5, 60_000)).toBe(true);
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 60_000)).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 60_000);
    expect(rateLimit("k", 5, 60_000)).toBe(false);
  });

  it("resets the counter after the window expires", () => {
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 60_000);
    expect(rateLimit("k", 5, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit("k", 5, 60_000)).toBe(true);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000);
    expect(rateLimit("a", 5, 60_000)).toBe(false);
    expect(rateLimit("b", 5, 60_000)).toBe(true);
  });

  it("allows up to max=1 on the first call, blocks the second", () => {
    expect(rateLimit("one", 1, 60_000)).toBe(true);
    expect(rateLimit("one", 1, 60_000)).toBe(false);
  });
});

describe("clientKey", () => {
  it("extracts the first IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientKey(req, "cbt")).toBe("cbt:1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "5.6.7.8" },
    });
    expect(clientKey(req, "upload")).toBe("upload:5.6.7.8");
  });

  it("falls back to 'unknown' when no IP header is present", () => {
    const req = new Request("https://example.com");
    expect(clientKey(req, "cbt")).toBe("cbt:unknown");
  });

  it("includes the scope in the key", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(clientKey(req, "myroute")).toBe("myroute:9.9.9.9");
  });
});
