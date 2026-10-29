// Game performance — the "player profile" of a gaming app, built from a
// learner's saved rounds (game_scores): XP and player level, a skill rating
// and tier per game, accuracy, speed, trend, and strengths / weak points by
// skill and by question topic. Pure functions, shared by the learner, tutor
// and admin views and by the score API.
import { CLASS_GAMES, findGame, type ClassGame, type GameSubject } from "@/lib/games/catalog";
import type { Skill } from "@/lib/games/generators";

// ── Question topics (from the question text; no generator changes) ─────────
// Only the arithmetic quiz games carry a finer topic than their skill.
export function questionTags(skill: Skill, prompt: string): string[] {
  const nums = (prompt.match(/\d+/g) ?? []).map(Number);
  switch (skill) {
    case "multiplication": {
      const t = [...new Set(nums.filter((n) => n >= 2 && n <= 15))].map((n) => `×${n} table`);
      return t.slice(0, 2);
    }
    case "division": return nums[1] ? [`÷${nums[1]}`] : [];
    case "addition": {
      const [a = 0, b = 0] = nums;
      const carry = String(a).split("").reverse().some((d, i) => Number(d) + Number(String(b).split("").reverse()[i] ?? 0) >= 10);
      return [carry ? "Adding with carrying" : "Adding without carrying"];
    }
    case "subtraction": {
      const [a = 0, b = 0] = nums;
      const borrow = String(a).split("").reverse().some((d, i) => Number(d) < Number(String(b).split("").reverse()[i] ?? 0));
      return [borrow ? "Subtracting with borrowing" : "Subtracting without borrowing"];
    }
    case "missing": {
      const op = prompt.match(/[+−×÷]/)?.[0];
      return op ? [`Missing number (${op})`] : [];
    }
    default: return [];
  }
}

export type TagTally = Record<string, { c: number; a: number }>;
export function addTags(t: TagTally, tags: string[], ok: boolean): TagTally {
  for (const tag of tags) {
    const cur = t[tag] ?? { c: 0, a: 0 };
    t[tag] = { c: cur.c + (ok ? 1 : 0), a: cur.a + 1 };
  }
  return t;
}
// Make a client-sent tally safe to store.
export function cleanTags(v: unknown): TagTally {
  const out: TagTally = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, x] of Object.entries(v as Record<string, any>).slice(0, 30)) {
    const key = String(k).slice(0, 32).trim();
    const a = Math.max(0, Math.min(500, Math.round(Number(x?.a) || 0)));
    const c = Math.max(0, Math.min(a, Math.round(Number(x?.c) || 0)));
    if (key && a) out[key] = { c, a };
  }
  return out;
}

// ── Labels ────────────────────────────────────────────────────────────────
const SKILL_LABEL: Partial<Record<string, string>> = {
  addition: "Addition", subtraction: "Subtraction", multiplication: "Times tables", division: "Division",
  missing: "Missing numbers", bodmas: "Order of operations (BODMAS)", mixed: "Mental arithmetic",
  fractions: "Fractions", percent: "Percentages", indices: "Indices", linear: "Linear equations",
  sequences: "Sequences", logs: "Logarithms", quadratics: "Quadratics", simultaneous: "Simultaneous equations",
  expand: "Expanding brackets", identity: "Algebraic identities", trig: "Trigonometry", differentiation: "Differentiation",
  units: "Units & conversions", elements: "Chemical elements",
  spelling: "Spelling", scramble: "Word unscrambling", vocabulary: "Vocabulary", synonyms: "Synonyms", antonyms: "Antonyms",
  homophones: "Homophones", plurals: "Plurals", prefixes: "Prefixes & suffixes", punctuation: "Punctuation",
  concord: "Subject–verb agreement", tenses: "Tenses", idioms: "Idioms", gaps: "Grammar in context", sentence: "Sentence building",
};
export const skillLabel = (g: Pick<ClassGame, "skill" | "title">) => SKILL_LABEL[g.skill] ?? g.title;

// Correct answers per minute that earn full marks for speed, per game style.
const PACE_TARGET: Record<string, number> = { quiz: 18, balloon: 20, bonds: 20, truefalse: 24, match: 12, choice: 10, letters: 6 };

// ── Ratings, tiers, levels ────────────────────────────────────────────────
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export const TIERS: { tier: Tier; min: number; color: string }[] = [
  { tier: "Diamond", min: 90, color: "#38BDF8" },
  { tier: "Platinum", min: 75, color: "#A78BFA" },
  { tier: "Gold", min: 60, color: "#F59E0B" },
  { tier: "Silver", min: 40, color: "#94A3B8" },
  { tier: "Bronze", min: 0, color: "#B45309" },
];
export const tierFor = (rating: number): Tier => TIERS.find((t) => rating >= t.min)!.tier;
export const tierColor = (t: Tier) => TIERS.find((x) => x.tier === t)!.color;

// Player level from total XP (sum of scores): level n starts at 50·(n−1)² XP.
export function playerLevel(xp: number): { level: number; into: number; span: number; pct: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
  const floor = 50 * (level - 1) ** 2, next = 50 * level ** 2;
  return { level, into: xp - floor, span: next - floor, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
}

export type Round = {
  game_id: string; score: number; correct: number; attempts: number; created_at: string;
  difficulty?: string | null; avg_ms?: number | null; tags?: TagTally | null;
};

// Skill rating (0–100) from accuracy and speed over a set of rounds.
export function ratingOf(game: ClassGame, rounds: Round[]): number {
  const c = rounds.reduce((s, r) => s + r.correct, 0), a = rounds.reduce((s, r) => s + r.attempts, 0);
  if (!a) return 0;
  const acc = c / a;
  const perMin = (c / rounds.length) / (game.seconds / 60);
  const pace = Math.min(1, perMin / (PACE_TARGET[game.kind] ?? 12));
  return Math.round(100 * (0.65 * acc + 0.35 * pace));
}

const accuracyOf = (rs: Round[]) => {
  const a = rs.reduce((s, r) => s + r.attempts, 0);
  return a ? Math.round((rs.reduce((s, r) => s + r.correct, 0) / a) * 100) : null;
};

export type GameStat = {
  gameId: string; title: string; emoji: string; subject: GameSubject; skill: string;
  plays: number; best: number; lastScore: number; accuracy: number | null; avgSeconds: number | null;
  rating: number; tier: Tier; trend: "up" | "down" | "steady" | "new"; history: number[]; lastPlayed: string;
};

// Stats for one game. `rounds` may be in any order.
export function gameStat(game: ClassGame, rounds: Round[]): GameStat {
  const rs = [...rounds].sort((x, y) => x.created_at.localeCompare(y.created_at));
  const recent = rs.slice(-5);
  const rating = ratingOf(game, recent);
  let trend: GameStat["trend"] = "new";
  if (rs.length >= 4) {
    const now = accuracyOf(rs.slice(-3)) ?? 0, before = accuracyOf(rs.slice(-6, -3)) ?? 0;
    trend = now - before >= 5 ? "up" : before - now >= 5 ? "down" : "steady";
  }
  const timed = rs.filter((r) => r.avg_ms && r.avg_ms > 0);
  return {
    gameId: game.id, title: game.title, emoji: game.emoji, subject: game.subject ?? "maths", skill: skillLabel(game),
    plays: rs.length,
    best: Math.max(0, ...rs.map((r) => r.score)),
    lastScore: rs[rs.length - 1]?.score ?? 0,
    accuracy: accuracyOf(recent),
    avgSeconds: timed.length ? +(timed.reduce((s, r) => s + (r.avg_ms ?? 0), 0) / timed.length / 1000).toFixed(1) : null,
    rating, tier: tierFor(rating), trend,
    history: rs.slice(-12).map((r) => r.score),
    lastPlayed: rs[rs.length - 1]?.created_at ?? "",
  };
}

export type SkillStat = { skill: string; subject: GameSubject; rating: number; accuracy: number | null; plays: number; games: string[] };
export type TopicStat = { tag: string; accuracy: number; attempts: number };
export type Performance = {
  plays: number; xp: number; level: ReturnType<typeof playerLevel>;
  accuracy: number | null; rating: number; tier: Tier; daysPlayed: number; streakDays: number;
  games: GameStat[]; skills: SkillStat[];
  strengths: SkillStat[]; weaknesses: SkillStat[];
  strongTopics: TopicStat[]; weakTopics: TopicStat[];
  recommend: GameStat | null;
};

const lagosDay = (iso: string) => new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 10);

export function performance(rounds: Round[], today = new Date()): Performance {
  const byGame = new Map<string, Round[]>();
  for (const r of rounds) if (findGame(r.game_id)) byGame.set(r.game_id, [...(byGame.get(r.game_id) ?? []), r]);
  const games = [...byGame].map(([id, rs]) => gameStat(findGame(id)!, rs)).sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed));

  // Skills: games sharing a skill are pooled, weighted by plays.
  const bySkill = new Map<string, GameStat[]>();
  for (const g of games) bySkill.set(g.skill, [...(bySkill.get(g.skill) ?? []), g]);
  const skills: SkillStat[] = [...bySkill].map(([skill, gs]) => {
    const plays = gs.reduce((s, g) => s + g.plays, 0);
    const w = (f: (g: GameStat) => number) => Math.round(gs.reduce((s, g) => s + f(g) * g.plays, 0) / plays);
    const withAcc = gs.filter((g) => g.accuracy !== null);
    return {
      skill, subject: gs[0].subject, plays, games: gs.map((g) => g.title),
      rating: w((g) => g.rating),
      accuracy: withAcc.length ? Math.round(withAcc.reduce((s, g) => s + g.accuracy! * g.plays, 0) / withAcc.reduce((s, g) => s + g.plays, 0)) : null,
    };
  }).sort((a, b) => b.rating - a.rating);

  // Topics pooled across all rounds.
  const topics: TagTally = {};
  for (const r of rounds) for (const [k, v] of Object.entries(r.tags ?? {})) {
    topics[k] = { c: (topics[k]?.c ?? 0) + v.c, a: (topics[k]?.a ?? 0) + v.a };
  }
  const topicList = Object.entries(topics).filter(([, v]) => v.a >= 4)
    .map(([tag, v]) => ({ tag, attempts: v.a, accuracy: Math.round((v.c / v.a) * 100) }));

  const xp = rounds.reduce((s, r) => s + Math.max(0, r.score), 0);
  const days = [...new Set(rounds.map((r) => lagosDay(r.created_at)))].sort();
  let streakDays = 0;
  for (let d = lagosDay(today.toISOString()), i = 0; ; i++) {
    if (days.includes(d)) streakDays++;
    else if (i > 0) break; // today may not be played yet
    d = new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    if (i > 400) break;
  }
  const rating = games.length ? Math.round(games.reduce((s, g) => s + g.rating * g.plays, 0) / games.reduce((s, g) => s + g.plays, 0)) : 0;
  const weaknesses = skills.filter((s) => s.rating < 60 || (s.accuracy ?? 100) < 65).sort((a, b) => a.rating - b.rating).slice(0, 3);
  const weakestGame = [...games].filter((g) => weaknesses.some((w) => w.skill === g.skill)).sort((a, b) => a.rating - b.rating)[0] ?? null;

  return {
    plays: rounds.length, xp, level: playerLevel(xp),
    accuracy: accuracyOf(rounds), rating, tier: tierFor(rating),
    daysPlayed: days.length, streakDays,
    games, skills,
    strengths: skills.filter((s) => s.rating >= 70 && !weaknesses.includes(s)).slice(0, 3),
    weaknesses,
    strongTopics: topicList.filter((t) => t.accuracy >= 90).sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts).slice(0, 5),
    weakTopics: topicList.filter((t) => t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    recommend: weakestGame,
  };
}

export const ALL_GAME_IDS = CLASS_GAMES.map((g) => g.id);

// Load a learner's rounds (service-role client) and build their profile.
// Works before migration-game-stats.sql (no speed/topic data yet).
export async function loadPerformance(admin: { from: (t: string) => any }, studentId: string): Promise<Performance | null> {
  let res = await admin.from("game_scores").select("game_id, score, correct, attempts, created_at, difficulty, avg_ms, tags")
    .eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000);
  if (res.error && /avg_ms|tags/i.test(res.error.message)) {
    res = await admin.from("game_scores").select("game_id, score, correct, attempts, created_at, difficulty")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000);
  }
  if (res.error) return null;
  return performance((res.data ?? []) as Round[]);
}

// Topics fixed in "Fix my mistakes" (newest first). Empty before the migration.
export async function loadMastery(admin: { from: (t: string) => any }, studentId: string): Promise<{ tag: string; fixes: number; lastFixedAt: string }[]> {
  try {
    const { data, error } = await admin.from("game_mastery").select("tag, fixes, last_fixed_at").eq("student_id", studentId).order("last_fixed_at", { ascending: false }).limit(40);
    if (error) return [];
    return (data ?? []).map((m: any) => ({ tag: m.tag, fixes: Number(m.fixes) || 1, lastFixedAt: m.last_fixed_at }));
  } catch { return []; }
}
