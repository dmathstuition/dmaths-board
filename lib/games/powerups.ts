// Power-up moments inside a round — pure, so the rules are tested and the
// server can check the maximum a round could score.
//   ⚡ Lightning question: every 6–9 questions one is worth double points.
//   🎁 Mystery chest: every 10 correct answers — bonus points, extra time or a
//      streak shield (the next miss doesn't break your combo).
//   💪 Comeback bonus: after 3 misses in a row, the next right answer counts
//      double — so a learner who is struggling gets a lift, not a pile-on.
import { pointsFor, type Rng } from "@/lib/games/generators";

export const LIGHTNING_GAP: readonly [number, number] = [6, 9];
export const CHEST_EVERY = 10;
export const COMEBACK_AFTER = 3;
export const CHEST_POINTS = 25;
export const CHEST_SECONDS = 10;

export type Chest =
  | { kind: "points"; amount: number; emoji: string; label: string }
  | { kind: "time"; amount: number; emoji: string; label: string }
  | { kind: "shield"; amount: 0; emoji: string; label: string };

export type PowerState = {
  question: number;      // questions answered so far
  lightningAt: number;   // the question number that is a lightning question
  missRun: number;       // misses in a row
  comeback: boolean;     // next right answer counts double
  shield: boolean;       // next miss keeps the streak
  streak: number;
  correct: number;
};

export type PowerEvent = "lightning" | "comeback" | "chest" | "shield-saved" | "comeback-ready" | "combo";

const gap = (rng: Rng) => LIGHTNING_GAP[0] + Math.floor(rng() * (LIGHTNING_GAP[1] - LIGHTNING_GAP[0] + 1));

export function newPowerState(rng: Rng = Math.random): PowerState {
  return { question: 0, lightningAt: gap(rng), missRun: 0, comeback: false, shield: false, streak: 0, correct: 0 };
}

// Is the question now on screen a lightning question? (Question numbers start at 1.)
export const isLightning = (s: PowerState) => s.question + 1 === s.lightningAt;

export function openChest(rng: Rng = Math.random): Chest {
  const r = rng();
  if (r < 0.5) return { kind: "points", amount: CHEST_POINTS, emoji: "💰", label: `+${CHEST_POINTS} bonus points` };
  if (r < 0.8) return { kind: "time", amount: CHEST_SECONDS, emoji: "⏱️", label: `+${CHEST_SECONDS} seconds` };
  return { kind: "shield", amount: 0, emoji: "🛡️", label: "Streak shield — your next miss won't break your combo" };
}

export const COMBO_MILESTONES = [3, 5, 10, 15, 20];

// Score one answer. Returns the new state, points earned, any chest and the
// moments to celebrate.
export function answer(s: PowerState, ok: boolean, rng: Rng = Math.random): {
  state: PowerState; points: number; chest: Chest | null; events: PowerEvent[]; multiplier: number;
} {
  const events: PowerEvent[] = [];
  const lightning = isLightning(s);
  const next: PowerState = { ...s, question: s.question + 1 };
  if (lightning) next.lightningAt = next.question + gap(rng);
  let points = 0, multiplier = 1, chest: Chest | null = null;

  if (ok) {
    multiplier = lightning || s.comeback ? 2 : 1;
    if (lightning) events.push("lightning");
    if (s.comeback) events.push("comeback");
    points = pointsFor(s.streak) * multiplier;
    next.streak = s.streak + 1;
    next.correct = s.correct + 1;
    next.missRun = 0;
    next.comeback = false;
    if (COMBO_MILESTONES.includes(next.streak)) events.push("combo");
    if (next.correct % CHEST_EVERY === 0) {
      chest = openChest(rng);
      events.push("chest");
      if (chest.kind === "points") points += chest.amount;
      if (chest.kind === "shield") next.shield = true;
    }
  } else {
    if (s.shield) { next.shield = false; events.push("shield-saved"); }
    else next.streak = 0;
    next.missRun = s.missRun + 1;
    if (next.missRun >= COMEBACK_AFTER && !s.comeback) { next.comeback = true; events.push("comeback-ready"); }
  }
  return { state: next, points, chest, events, multiplier };
}

// The most a round with `correct` right answers could score: every answer at
// the top combo, doubled, plus a points chest every 10. The server uses this.
export const maxRoundScore = (correct: number) => correct * pointsFor(10) * 2 + Math.floor(correct / CHEST_EVERY) * CHEST_POINTS;
