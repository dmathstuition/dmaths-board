// The daily reward. A flat 5 points every day — simple and predictable: show up,
// claim 5. Still takes the RNG param for a stable signature (and so callers/tests
// don't change), but the value is constant.

export const DAILY_REWARD = 5 as const;
export const DAILY_TIERS = [DAILY_REWARD] as const;

// The RNG param is kept for a stable signature (callers/tests pass one) but the
// value is now constant, so the argument is intentionally ignored.
export function rollDailyReward(rand: () => number = Math.random): number {
  void rand;
  return DAILY_REWARD;
}

// The date (in WAT) a claim belongs to — one claim per calendar day.
export function watDay(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // YYYY-MM-DD
}
