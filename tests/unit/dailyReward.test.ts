import { describe, it, expect } from "vitest";
import { rollDailyReward, DAILY_TIERS, DAILY_REWARD, watDay } from "@/lib/dailyReward";

describe("rollDailyReward", () => {
  it("always gives a flat 5 points, whatever the RNG", () => {
    expect(rollDailyReward(() => 0.01)).toBe(5);
    expect(rollDailyReward(() => 0.50)).toBe(5);
    expect(rollDailyReward(() => 0.99)).toBe(5);
    expect(DAILY_REWARD).toBe(5);
  });
  it("only ever returns a valid tier", () => {
    for (let i = 0; i < 200; i++) {
      expect(DAILY_TIERS).toContain(rollDailyReward() as any);
    }
  });
});

describe("watDay", () => {
  it("formats a WAT calendar day as YYYY-MM-DD", () => {
    // 2026-08-01 00:30 UTC is still 2026-08-01 in Lagos (+1)
    expect(watDay(new Date("2026-08-01T00:30:00Z"))).toBe("2026-08-01");
  });
});
