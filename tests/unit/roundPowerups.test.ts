import { describe, it, expect } from "vitest";
import { answer, CHEST_EVERY, CHEST_POINTS, COMEBACK_AFTER, isLightning, LIGHTNING_GAP, maxRoundScore, newPowerState, openChest, type PowerState } from "@/lib/games/powerups";
import { pointsFor } from "@/lib/games/generators";
import { seeded } from "@/lib/games/mistakes";

const play = (s: PowerState, oks: boolean[], rng = seeded(1)) => {
  let score = 0; const all: ReturnType<typeof answer>[] = [];
  for (const ok of oks) { const r = answer(s, ok, rng); s = r.state; score += r.points; all.push(r); }
  return { s, score, all };
};

describe("power-ups", () => {
  it("places a lightning question 6–9 questions in, then again later", () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = newPowerState(seeded(seed));
      expect(s.lightningAt).toBeGreaterThanOrEqual(LIGHTNING_GAP[0]);
      expect(s.lightningAt).toBeLessThanOrEqual(LIGHTNING_GAP[1]);
    }
    const s = { ...newPowerState(), lightningAt: 1 };
    expect(isLightning(s)).toBe(true);
    const r = answer(s, true);
    expect(r.multiplier).toBe(2);
    expect(r.points).toBe(pointsFor(0) * 2);
    expect(r.events).toContain("lightning");
    expect(r.state.lightningAt).toBeGreaterThan(r.state.question);
  });
  it("a missed lightning question scores nothing but moves the next one on", () => {
    const r = answer({ ...newPowerState(), lightningAt: 1 }, false);
    expect(r.points).toBe(0);
    expect(r.state.lightningAt).toBeGreaterThan(1);
  });
  it("opens a chest every 10 correct answers", () => {
    const s = { ...newPowerState(), lightningAt: 999 };
    const { all } = play(s, Array(20).fill(true));
    const chests = all.filter((r) => r.chest);
    expect(chests.length).toBe(20 / CHEST_EVERY);
    expect(all[CHEST_EVERY - 1].chest).not.toBeNull();
  });
  it("chests are points, time or a shield", () => {
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => openChest(seeded(i + 1)).kind));
    expect(kinds).toEqual(new Set(["points", "time", "shield"]));
    expect(openChest(() => 0.1)).toMatchObject({ kind: "points", amount: CHEST_POINTS });
  });
  it("a shield keeps the streak through one miss", () => {
    let s: PowerState = { ...newPowerState(), lightningAt: 999, shield: true, streak: 6 };
    let r = answer(s, false);
    expect(r.state.streak).toBe(6);
    expect(r.state.shield).toBe(false);
    expect(r.events).toContain("shield-saved");
    s = r.state; r = answer(s, false);
    expect(r.state.streak).toBe(0);
  });
  it("after 3 misses in a row the next right answer counts double", () => {
    const s = { ...newPowerState(), lightningAt: 999 };
    const { s: after, all } = play(s, Array(COMEBACK_AFTER).fill(false));
    expect(after.comeback).toBe(true);
    expect(all[COMEBACK_AFTER - 1].events).toContain("comeback-ready");
    const r = answer(after, true);
    expect(r.points).toBe(pointsFor(0) * 2);
    expect(r.events).toContain("comeback");
    expect(r.state.comeback).toBe(false);
    expect(r.state.missRun).toBe(0);
  });
  it("celebrates combo milestones", () => {
    const { all } = play({ ...newPowerState(), lightningAt: 999 }, Array(5).fill(true));
    expect(all[2].events).toContain("combo");
    expect(all[4].events).toContain("combo");
    expect(all[3].events).not.toContain("combo");
  });
  it("no real round beats the server's maximum", () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = seeded(seed);
      const oks = Array.from({ length: 80 }, () => rng() > 0.25);
      const { s, score } = play(newPowerState(seeded(seed)), oks, seeded(seed + 100));
      expect(score).toBeLessThanOrEqual(maxRoundScore(s.correct));
    }
    expect(maxRoundScore(0)).toBe(0);
  });
});
