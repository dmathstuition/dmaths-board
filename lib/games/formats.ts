// The rules of the new game formats, apart from how they look. The arcade
// shell (components/games/GamePlayer) scores every right answer the same way;
// these say what happens in the story around it. Pure.
import type { Difficulty } from "@/lib/games/generators";

// ── Boss Battle ──
// Right answers hit the boss (a streak hits harder); wrong answers cost a heart.
// Beat the boss and a bigger one arrives. No hearts left: the battle is over.
export const BOSS_HEARTS = 3;
export const BOSS_HP: Record<Difficulty, number> = { easy: 6, medium: 9, hard: 12 };
export type BossState = { hp: number; max: number; hearts: number; beaten: number; hit: number; lost: boolean };
export const newBoss = (d: Difficulty, beaten = 0, hearts = BOSS_HEARTS): BossState => {
  const max = BOSS_HP[d] + beaten * 2;
  return { hp: max, max, hearts, beaten, hit: 0, lost: false };
};
export const bossDamage = (streak: number) => 1 + (streak >= 3 ? 1 : 0) + (streak >= 6 ? 1 : 0);
export function bossAnswer(s: BossState, d: Difficulty, ok: boolean, streakAfter: number): { state: BossState; defeated: boolean } {
  if (!ok) { const hearts = Math.max(0, s.hearts - 1); return { state: { ...s, hearts, hit: 0, lost: hearts === 0 }, defeated: false }; }
  const dmg = bossDamage(streakAfter), hp = Math.max(0, s.hp - dmg);
  if (hp === 0) return { state: { ...newBoss(d, s.beaten + 1, Math.min(BOSS_HEARTS, s.hearts + 1)), hit: dmg }, defeated: true }; // a heart back for a win
  return { state: { ...s, hp, hit: dmg }, defeated: false };
}

// ── Race Track ──
// Each right answer moves your car one step. Rivals drive at a steady pace; a
// wrong answer stalls you for a moment. First over the line wins.
export const RACE_LEN = 12;
export const STALL_MS = 1200;
export type Rival = { id: string; name: string; emoji: string; msPerStep: number };
const PACE: Record<Difficulty, number[]> = { easy: [7200, 5600, 4400], medium: [5600, 4300, 3400], hard: [4300, 3400, 2700] };
export const rivals = (d: Difficulty): Rival[] => PACE[d].map((ms, i) => ({ id: `r${i}`, name: ["Tortoise", "Gazelle", "Cheetah"][i], emoji: ["🐢", "🦌", "🐆"][i], msPerStep: ms }));
export const rivalStep = (r: Rival, elapsedMs: number) => Math.max(0, Math.min(RACE_LEN, Math.floor(elapsedMs / r.msPerStep)));
// 1 = first. Rivals already at the line when you arrive are ahead of you.
export function racePlace(mine: number, elapsedMs: number, rs: Rival[]): number {
  const ahead = rs.filter((r) => { const s = rivalStep(r, elapsedMs); return s > mine || (s === mine && s >= RACE_LEN); }).length;
  return 1 + ahead;
}
export const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// ── Money Ladder ──
// Ten rungs. A wrong answer drops you back to the last safe rung you passed.
// One 50:50 and one skip to use.
export const LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000] as const;
export const SAFE_RUNGS = [4, 9] as const; // landing on ₦1,000 (5th) and the top is safe (index of the rung reached - 1)
export type LadderState = { rung: number; safe: number; fifty: boolean; skip: boolean; won: boolean; dropped: boolean };
export const newLadder = (): LadderState => ({ rung: 0, safe: 0, fifty: true, skip: true, won: false, dropped: false });
export function ladderAnswer(s: LadderState, ok: boolean): LadderState {
  if (!ok) return { ...s, rung: s.safe, dropped: s.rung > s.safe };
  const rung = s.rung + 1;
  return { ...s, rung, safe: SAFE_RUNGS.includes((rung - 1) as 4 | 9) ? rung : s.safe, won: rung >= LADDER.length, dropped: false };
}
export const ladderPrize = (rung: number) => (rung <= 0 ? 0 : LADDER[Math.min(rung, LADDER.length) - 1]);
