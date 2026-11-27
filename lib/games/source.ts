// One question source for the new game formats (boss, race, ladder) and for
// quizzes made from a game's skill: every numeric skill (typed in the quiz
// game) and every multiple-choice skill (the choice games) becomes the same
// thing — a prompt with four options and one answer. Pure.
import { question, withOptions, type Difficulty, type Rng, type Skill } from "@/lib/games/generators";
import { choiceQuestion, type ChoiceQ, type ChoiceSkill } from "@/lib/games/senior";
import { ENGLISH_CHOICE, ENGLISH_MATCH, TILE_SKILLS, englishChoice, type EnglishChoiceSkill } from "@/lib/games/english";
import { MORE_CHOICE, moreChoice, type MoreChoiceSkill } from "@/lib/games/moreMaths";

export type Item = ChoiceQ; // { lead, prompt, options, answer }

const SENIOR_CHOICE: readonly string[] = ["indices", "quadratics", "fractions", "standardForm", "simultaneous", "differentiation", "expand"];
// Skills that only work in their own game (matching pairs, tiles, true/false statements).
const OWN_GAME: readonly string[] = ["trig", "elements", "units", "identity", "primes", ...ENGLISH_MATCH, ...TILE_SKILLS];

export type SkillKind = "choice" | "numeric";
export function skillKind(skill: string): SkillKind | null {
  if (OWN_GAME.includes(skill)) return null;
  if (SENIOR_CHOICE.includes(skill) || MORE_CHOICE.includes(skill) || ENGLISH_CHOICE.includes(skill)) return "choice";
  return "numeric";
}
export const playableAsFormat = (skill: string) => skillKind(skill) != null;

// One question for a skill, as four options.
export function nextItem(skill: string, d: Difficulty, rng: Rng = Math.random): Item {
  const kind = skillKind(skill);
  if (kind === "choice") {
    return ENGLISH_CHOICE.includes(skill) ? englishChoice(skill as EnglishChoiceSkill, d, rng)
      : MORE_CHOICE.includes(skill) ? moreChoice(skill as MoreChoiceSkill, d, rng)
        : choiceQuestion(skill as ChoiceSkill, d, rng);
  }
  const q = question((kind === "numeric" ? skill : "mixed") as Skill, d, rng);
  const { options } = withOptions(q, rng, 4);
  const open = q.ask || q.prompt.includes("?");
  return { lead: q.ask ?? "Work it out", prompt: open ? q.prompt : `${q.prompt} = ?`, options: options.map(String), answer: String(q.answer) };
}

// A stream of questions: from a fixed list (a recap, played in a shuffled loop)
// or made up fresh. Never the same question twice in a row.
export function itemDrawer(skill: string, d: Difficulty, rng: Rng = Math.random, items?: Item[]): () => Item {
  let queue: Item[] = [], last = "";
  return () => {
    for (let i = 0; i < 8; i++) {
      let it: Item;
      if (items?.length) {
        if (!queue.length) queue = [...items].sort(() => rng() - 0.5);
        const q = queue.shift()!;
        it = { ...q, options: [...q.options].sort(() => rng() - 0.5) };
      } else it = nextItem(skill, d, rng);
      if (it.prompt !== last || items?.length === 1) { last = it.prompt; return it; }
    }
    return nextItem(skill, d, rng);
  };
}

// 50:50 — keep the answer and one wrong option.
export function fiftyFifty(it: Item, rng: Rng = Math.random): string[] {
  const wrong = it.options.filter((o) => o !== it.answer);
  const keep = wrong[Math.min(wrong.length - 1, Math.floor(rng() * wrong.length))];
  return it.options.filter((o) => o === it.answer || o === keep);
}

// A live quiz from a skill: N multiple-choice questions, no repeats.
export function quizFromSkill(skill: string, d: Difficulty, count: number, seconds = 20, rng: Rng = Math.random): { q: string; options: string[]; answer: number; seconds: number }[] {
  const out: { q: string; options: string[]; answer: number; seconds: number }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count * 6 && out.length < count; i++) {
    const it = nextItem(skill, d, rng);
    const text = [it.lead && it.lead.length > 32 ? it.lead : "", it.prompt].filter(Boolean).join(" — ") || it.lead;
    if (!text || seen.has(text) || !it.options.includes(it.answer)) continue;
    seen.add(text);
    out.push({ q: text, options: it.options, answer: it.options.indexOf(it.answer), seconds });
  }
  return out;
}
