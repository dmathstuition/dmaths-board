import { describe, expect, it } from "vitest";
import { boardAccess, cleanGuestName, coversPeriod, monthsFor, newPaidUntil, passwordProblem, reminderDue, validEmail } from "@/lib/boardPlan";

const NOW = Date.parse("2026-10-15T10:00:00Z");
const iso = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

describe("D-Maths Board access", () => {
  it("needs a verified email first", () => {
    expect(boardAccess(null, NOW).canUse).toBe(false);
    expect(boardAccess({ email_verified_at: null, trial_ends_at: iso(7), paid_until: null }, NOW).state).toBe("unverified");
  });
  it("runs the 7-day trial, then a paid month, then expires", () => {
    expect(boardAccess({ email_verified_at: iso(-1), trial_ends_at: iso(3), paid_until: null }, NOW)).toMatchObject({ state: "trial", daysLeft: 3, canUse: true });
    expect(boardAccess({ email_verified_at: iso(-9), trial_ends_at: iso(-2), paid_until: iso(200) }, NOW)).toMatchObject({ state: "active", canUse: true });
    expect(boardAccess({ email_verified_at: iso(-9), trial_ends_at: iso(-2), paid_until: null }, NOW)).toMatchObject({ state: "expired", canUse: false });
    expect(boardAccess({ email_verified_at: iso(-9), trial_ends_at: iso(5), paid_until: null, suspended: true }, NOW).state).toBe("suspended");
  });
  it("adds a month from when current access ends, never losing days", () => {
    expect(newPaidUntil({ paid_until: null, trial_ends_at: iso(4) }, NOW)).toBe("2026-11-19T10:00:00.000Z");
    expect(newPaidUntil({ paid_until: iso(-30), trial_ends_at: iso(-60) }, NOW)).toBe("2026-11-15T10:00:00.000Z");
    expect(newPaidUntil({ paid_until: "2027-01-01T00:00:00.000Z", trial_ends_at: null }, NOW)).toBe("2027-02-01T00:00:00.000Z");
  });
  it("only accepts ₦5,000 or more in naira", () => {
    expect(coversPeriod(500000)).toBe(true);
    expect(coversPeriod(1000000)).toBe(true);
    expect(coversPeriod(499999)).toBe(false);
    expect(coversPeriod(500000, "USD")).toBe(false);
  });
  it("gives a month per ₦5,000 paid, so paying more is never lost", () => {
    expect(monthsFor(500000)).toBe(1);
    expect(monthsFor(1000000)).toBe(2);   // an old ₦10,000 checkout
    expect(monthsFor(999999)).toBe(1);
    expect(monthsFor(100000000)).toBe(12); // never more than a year
    expect(newPaidUntil({ paid_until: null, trial_ends_at: null }, NOW, 2)).toBe("2026-12-15T10:00:00.000Z");
  });
  it("reminds a few days before the month ends and the day before, once each", () => {
    const a = { email_verified_at: iso(-30), trial_ends_at: null, paid_until: iso(4) };
    expect(reminderDue(a, NOW)).toBe("early");
    expect(reminderDue({ ...a, reminded_14_at: iso(-1) }, NOW)).toBeNull();
    expect(reminderDue({ ...a, paid_until: iso(0.5), reminded_14_at: iso(-4) }, NOW)).toBe("last");
    expect(reminderDue({ ...a, paid_until: iso(20) }, NOW)).toBeNull();
    expect(reminderDue({ ...a, paid_until: iso(-1) }, NOW)).toBeNull();
  });
});

describe("account checks", () => {
  it("asks for a strong password", () => {
    expect(passwordProblem("short1")).toMatch(/10/);
    expect(passwordProblem("onlyletterslong")).toMatch(/number/);
    expect(passwordProblem("Password12345")).toMatch(/easy/);
    expect(passwordProblem("bakare2024xyz", "bakare@gmail.com")).toMatch(/email/);
    expect(passwordProblem("Mangoes-at-7pm-2026")).toBeNull();
  });
  it("checks emails and cleans student names", () => {
    expect(validEmail("teacher@school.ng")).toBe(true);
    expect(validEmail("nope@x")).toBe(false);
    expect(cleanGuestName("  Ada <script>  O'Neil ")).toBe("Ada script O'Neil");
    expect(cleanGuestName("Chí-Ńnà")).toBe("Chí-Ńnà");
  });
});
