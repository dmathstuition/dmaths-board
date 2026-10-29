import { describe, it, expect, vi, afterEach } from "vitest";
import { limit, sharedLimitsOn } from "@/lib/ratelimit";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("shared rate limit (Upstash)", () => {
  it("counts in Upstash when it's set up", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    let n = 0;
    const fetchMock = vi.fn(async (_url: string, init: any) => {
      expect(JSON.parse(init.body)[1][0]).toBe("INCR");
      expect(init.headers.Authorization).toBe("Bearer tok");
      return new Response(JSON.stringify([{ result: "OK" }, { result: ++n }]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(sharedLimitsOn()).toBe(true);
    expect(await limit("t:a", 2, 60_000)).toBe(true);
    expect(await limit("t:a", 2, 60_000)).toBe(true);
    expect(await limit("t:a", 2, 60_000)).toBe(false); // third in the window
    expect(fetchMock.mock.calls[0][0]).toBe("https://redis.test/pipeline");
  });
  it("falls back to counting in memory if Upstash is down", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await limit("t:down", 1, 60_000)).toBe(true);
    expect(await limit("t:down", 1, 60_000)).toBe(false);
  });
  it("works without Upstash", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    expect(sharedLimitsOn()).toBe(false);
    expect(await limit("t:none", 1, 60_000)).toBe(true);
    expect(await limit("t:none", 1, 60_000)).toBe(false);
  });
});
