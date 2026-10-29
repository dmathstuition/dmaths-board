// How learners earn reward points from activities beyond lessons — pure rules
// shared by the APIs, the dashboard "how to earn" list and tests. Every source
// has a daily cap so points reward learning, not farming.
import { watDay } from "@/lib/dailyReward";

export type RewardSource = "game" | "lab" | "live_quiz" | "daily" | "race" | "adventure";

export const REWARD_RULES: Record<Exclude<RewardSource, "daily">, { label: string; how: string; dailyCap: number }> = {
  game: { label: "Class games", how: "2–10 points a round, more for accurate play", dailyCap: 40 },
  lab: { label: "E-Laboratory", how: "15 points for each new experiment you complete, 3 for repeats", dailyCap: 45 },
  live_quiz: { label: "Live class quizzes", how: "Up to 15 points for a podium finish, 3 for taking part", dailyCap: 30 },
  race: { label: "Live game races", how: "12 / 8 / 5 points for the podium, 3 for crossing the line", dailyCap: 30 },
  adventure: { label: "Adventure map", how: "20 points for each chapter you complete", dailyCap: 60 },
};

// A live race: podium places, and something for everyone who finished.
export function racePoints(place: number, finished: boolean): number {
  if (place === 1) return 12;
  if (place === 2) return 8;
  if (place === 3) return 5;
  return finished ? 3 : 0;
}
export const ADVENTURE_CHAPTER_POINTS = 20;
// Fixing mistakes: a point per question fixed, up to 5 a replay (game allowance).
export const fixPoints = (fixed: number) => Math.max(0, Math.min(5, Math.floor(fixed)));

// A finished game round: nothing for a token effort, then more for answering
// more questions correctly, plus a bonus for accuracy.
export function gamePoints(r: { correct: number; attempts: number }): number {
  const correct = Math.max(0, Math.floor(r.correct)), attempts = Math.max(0, Math.floor(r.attempts));
  if (correct < 3 || attempts === 0) return 0;
  const base = Math.min(8, 2 + Math.floor(correct / 5));
  return base + (correct / attempts >= 0.8 ? 2 : 0);
}

// Completing an experiment: the first time pays most. A completion needs the
// learner to have spent real time on it.
export const LAB_MIN_SECONDS = 60;
export const labPoints = (firstTime: boolean) => (firstTime ? 15 : 3);
// One award per experiment per day; the first-ever one is the "new" bonus.
export const labRef = (slug: string, day: string = watDay()) => `${slug}:${day}`;

// A live quiz: podium places, and something for everyone who got one right.
export function liveQuizPoints(rank: number, correct: number): number {
  if (rank === 1) return 15;
  if (rank === 2) return 10;
  if (rank === 3) return 6;
  return correct > 0 ? 3 : 0;
}

// Cap an award at what's left of today's allowance for its source.
export const capAward = (points: number, earnedToday: number, cap: number) =>
  Math.max(0, Math.min(Math.floor(points), cap - earnedToday));

export const SOURCE_LABEL: Record<string, string> = {
  game: "Game", lab: "Experiment", live_quiz: "Live quiz", daily: "Daily chest", race: "Game race", adventure: "Adventure",
  quest: "Daily quest", flashcards: "Revision cards", cbt: "CBT", mock: "Mock exam", speaking: "Speaking", mix: "Daily Mix",
};
