// The Adventure map — pure. A journey of chapters (Number Beach, Algebra
// Mountain…) for each school stage. Every stop is one of the class games at a
// set difficulty; earning enough stars clears it and unlocks the next, and
// finishing every stop completes the chapter.
import { CLASS_GAMES, findGame, starsFor, type ClassGame, type Stage } from "@/lib/games/catalog";
import type { Difficulty } from "@/lib/games/generators";

export type Stop = { id: string; gameId: string; difficulty: Difficulty; need: number };
export type Chapter = { id: string; title: string; emoji: string; color: string; blurb: string; stops: Stop[] };

// Slower game types (matching, tiles, bonds) clear with 1 star; others need 2.
const needFor = (gameId: string) => (["match", "letters", "bonds"].includes(findGame(gameId)?.kind ?? "") ? 1 : 2);
const chapter = (id: string, title: string, emoji: string, color: string, blurb: string, stops: [string, Difficulty][]): Chapter => ({
  id, title, emoji, color, blurb,
  stops: stops.map(([gameId, difficulty], i) => ({ id: `${id}-${i + 1}`, gameId, difficulty, need: needFor(gameId) })),
});

export const ADVENTURES: Record<Stage, Chapter[]> = {
  primary: [
    chapter("p-beach", "Number Beach", "🏖️", "#F59E0B", "Warm up with adding and taking away.", [["addition-rush", "easy"], ["number-bonds", "easy"], ["subtraction-slalom", "easy"]]),
    chapter("p-jungle", "Times Table Jungle", "🌴", "#16A34A", "Swing through the times tables.", [["times-blitz", "easy"], ["division-dash", "easy"], ["balloon-pop", "medium"], ["times-blitz", "medium"]]),
    chapter("p-woods", "Word Woods", "🌳", "#0EA5E9", "Spell and build words.", [["word-scramble", "easy"], ["missing-letters", "easy"], ["plural-power", "easy"]]),
    chapter("p-castle", "Grammar Castle", "🏰", "#8B5CF6", "Storm the castle of grammar.", [["homophone-hero", "medium"], ["opposites-attract", "medium"], ["sentence-builder", "medium"], ["odd-one-out", "medium"]]),
  ],
  junior: [
    chapter("j-harbour", "Number Harbour", "⚓", "#0EA5E9", "Order of operations and missing numbers.", [["missing-number", "easy"], ["bodmas-battle", "easy"], ["true-or-false", "medium"]]),
    chapter("j-island", "Fraction Island", "🏝️", "#F59E0B", "Fractions and percentages.", [["fraction-factory", "easy"], ["fraction-factory", "medium"], ["percent-power", "medium"]]),
    chapter("j-mountain", "Algebra Mountain", "⛰️", "#16A34A", "Climb with equations.", [["equation-escape", "easy"], ["equation-balloons", "medium"], ["memory-match", "medium"], ["equation-escape", "hard"]]),
    chapter("j-wharf", "Word Wharf", "📚", "#EC4899", "Spelling and synonyms.", [["spelling-bee", "medium"], ["spot-the-spelling", "medium"], ["synonym-snap", "medium"]]),
    chapter("j-galaxy", "Grammar Galaxy", "🪐", "#8B5CF6", "Parts of speech, tenses and punctuation.", [["parts-of-speech", "medium"], ["tense-trouble", "medium"], ["punctuation-pro", "medium"], ["prefix-power", "medium"]]),
  ],
  senior: [
    chapter("s-isle", "Index Isle", "🏝️", "#0EA5E9", "Indices, standard form and logs.", [["index-invaders", "medium"], ["standard-form-showdown", "medium"], ["log-ladder", "medium"]]),
    chapter("s-mountain", "Algebra Mountain", "⛰️", "#16A34A", "Expand, factorise and solve.", [["expand-factorise", "medium"], ["root-hunter", "medium"], ["simultaneous-strike", "medium"]]),
    chapter("s-falls", "Sequence Falls", "🌊", "#06B6D4", "Sequences, identities and trig.", [["sequence-sleuth", "medium"], ["identity-check", "medium"], ["trig-twins", "medium"]]),
    chapter("s-volcano", "Calculus Volcano", "🌋", "#EF4444", "Differentiate your way to the top.", [["derivative-dash", "medium"], ["derivative-dash", "hard"]]),
    chapter("s-station", "Science Station", "🔬", "#84CC16", "Elements and SI units.", [["element-match", "medium"], ["unit-match", "medium"]]),
    chapter("s-lighthouse", "Language Lighthouse", "🗼", "#8B5CF6", "Concord, idioms and vocabulary.", [["concord-clinic", "medium"], ["idiom-quest", "medium"], ["vocabulary-vault", "medium"]]),
  ],
};

export function stageOfLevel(level: string | null | undefined): Stage {
  const l = String(level ?? "").toLowerCase();
  const n = Number((l.match(/\d+/) ?? [])[0]);
  if (/^primary|^basic [1-6]\b|^p ?\d/.test(l)) return "primary";
  if (/^jss|^js ?\d|^basic [7-9]\b/.test(l)) return "junior";
  if (/^ss|^sss|^sec|post|undergrad|college/.test(l)) return "senior";
  if (/^year/.test(l) && n) return n <= 6 ? "primary" : n <= 9 ? "junior" : "senior";
  if (/^grade/.test(l) && n) return n <= 5 ? "primary" : n <= 8 ? "junior" : "senior";
  return "junior";
}

export function findStop(stopId: string): { stage: Stage; chapter: Chapter; stop: Stop; index: number } | null {
  for (const stage of Object.keys(ADVENTURES) as Stage[]) {
    for (const ch of ADVENTURES[stage]) {
      const index = ch.stops.findIndex((s) => s.id === stopId);
      if (index >= 0) return { stage, chapter: ch, stop: ch.stops[index], index };
    }
  }
  return null;
}

export type StopRound = { stop_id: string; correct: number; attempts: number };
export type StopProgress = Stop & { game: ClassGame; stars: number; cleared: boolean; unlocked: boolean };
export type ChapterProgress = Omit<Chapter, "stops"> & { stops: StopProgress[]; cleared: number; complete: boolean; unlocked: boolean };

// Best stars per stop from the learner's adventure rounds, and what's open.
// Stops open one after another; a chapter opens when the one before is done.
export function adventureProgress(stage: Stage, rounds: StopRound[]): ChapterProgress[] {
  const best = new Map<string, number>();
  for (const r of rounds) {
    const found = findStop(r.stop_id);
    const g = found ? findGame(found.stop.gameId) : null;
    if (!g) continue;
    best.set(r.stop_id, Math.max(best.get(r.stop_id) ?? 0, starsFor(r.correct, r.attempts, g.seconds)));
  }
  let prevComplete = true;
  return ADVENTURES[stage].map((ch) => {
    const unlocked = prevComplete;
    let prevCleared = unlocked;
    const stops = ch.stops.map((s) => {
      const stars = best.get(s.id) ?? 0;
      const cleared = stars >= s.need;
      const p: StopProgress = { ...s, game: findGame(s.gameId)!, stars, cleared, unlocked: prevCleared };
      prevCleared = prevCleared && cleared;
      return p;
    });
    const cleared = stops.filter((s) => s.cleared).length;
    const complete = cleared === stops.length;
    prevComplete = unlocked && complete;
    return { ...ch, stops, cleared, complete, unlocked };
  });
}

// Every stop points at a real game (checked in tests).
export const allStopGames = () => Object.values(ADVENTURES).flat().flatMap((c) => c.stops.map((s) => s.gameId));
export const KNOWN_GAMES = new Set(CLASS_GAMES.map((g) => g.id));
