import type { Difficulty, Skill } from "@/lib/games/generators";

// ── NOVELIA CLASS GAMES — single source of truth ──────────────────────────
// Every arcade game an admin can push to a class. Learners only see the
// games pushed to their class (game_assignments), at the chosen difficulty.
//
// To add a game: add an entry here. `kind` picks the engine
// (components/games/engines); `skill` picks the questions (lib/games/generators).

export type GameKind = "quiz" | "balloon" | "match" | "truefalse" | "bonds" | "choice" | "letters";
export type GameSubject = "maths" | "english" | "science";
export const SUBJECT_LABEL: Record<GameSubject, string> = { maths: "Maths", english: "English", science: "Science" };
// Primary 4–6, JSS 1–3, or SSS 1–3 (and A-Level) — the admin filters by this.
export type Stage = "primary" | "junior" | "senior";

export const STAGE_LABEL: Record<Stage, string> = { primary: "Primary", junior: "Junior secondary", senior: "Senior secondary" };

export type ClassGame = {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  kind: GameKind;
  skill: Skill;
  seconds: number;
  colors: [string, string]; // gradient for the game's own look
  band: string;             // who it suits best (a hint for the admin)
  stage: Stage;
  subject?: GameSubject;    // omitted = maths
  howTo: string;
};

export const CLASS_GAMES: ClassGame[] = [
  { id: "times-blitz", stage: "primary", title: "Times Table Blitz", emoji: "🚀", kind: "quiz", skill: "multiplication", seconds: 60,
    colors: ["#7C3AED", "#EC4899"], band: "Primary 4 – JSS 2",
    tagline: "Smash as many times-table facts as you can in 60 seconds.", howTo: "Type the answer and press Enter (or ✓). Keep a streak going for combo points!" },
  { id: "addition-rush", stage: "primary", title: "Addition Rush", emoji: "➕", kind: "quiz", skill: "addition", seconds: 60,
    colors: ["#F97316", "#FACC15"], band: "Primary 4 – JSS 1",
    tagline: "Race the clock adding numbers — faster and faster.", howTo: "Add the two numbers, type the total and hit Enter." },
  { id: "subtraction-slalom", stage: "primary", title: "Subtraction Slalom", emoji: "⛷️", kind: "quiz", skill: "subtraction", seconds: 60,
    colors: ["#06B6D4", "#3B82F6"], band: "Primary 4 – JSS 1",
    tagline: "Weave through take-aways without missing a gate.", howTo: "Work out the difference and type it in." },
  { id: "division-dash", stage: "primary", title: "Division Dash", emoji: "🏁", kind: "quiz", skill: "division", seconds: 60,
    colors: ["#10B981", "#84CC16"], band: "Primary 5 – JSS 3",
    tagline: "Share it out! Quick-fire division, no remainders.", howTo: "Every division comes out exactly — type the answer." },
  { id: "balloon-pop", stage: "primary", title: "Balloon Pop", emoji: "🎈", kind: "balloon", skill: "mixed", seconds: 60,
    colors: ["#F43F5E", "#FB923C"], band: "Primary 4 – JSS 2",
    tagline: "Pop the balloon with the right answer before it floats away.", howTo: "Tap the balloon showing the correct answer. Too slow and they escape!" },
  { id: "memory-match", stage: "junior", title: "Memory Match", emoji: "🧠", kind: "match", skill: "multiplication", seconds: 90,
    colors: ["#8B5CF6", "#06B6D4"], band: "Primary 5 – JSS 3",
    tagline: "Flip cards to pair each times-table fact with its answer.", howTo: "Flip two cards. A fact and its answer make a match. Clear the board for a new one." },
  { id: "true-or-false", stage: "junior", title: "True or False?", emoji: "⚡", kind: "truefalse", skill: "mixed", seconds: 45,
    colors: ["#EAB308", "#EF4444"], band: "Primary 4 – SSS 1",
    tagline: "Is the sum right or wrong? Decide in a flash.", howTo: "Tap True or False — or press T / F on a keyboard." },
  { id: "number-bonds", stage: "primary", title: "Number Bonds", emoji: "🔟", kind: "bonds", skill: "addition", seconds: 60,
    colors: ["#14B8A6", "#22C55E"], band: "Primary 4 – Primary 6",
    tagline: "Find the pairs that make the target number.", howTo: "Tap two bubbles that add up to the target to pop them." },
  { id: "missing-number", stage: "junior", title: "Missing Number", emoji: "🕵️", kind: "quiz", skill: "missing", seconds: 60,
    colors: ["#6366F1", "#A855F7"], band: "Primary 6 – JSS 3",
    tagline: "Be a maths detective — find the number that's gone missing.", howTo: "Work out what ? must be to make the equation true." },
  { id: "bodmas-battle", stage: "junior", title: "BODMAS Battle", emoji: "🧮", kind: "quiz", skill: "bodmas", seconds: 90,
    colors: ["#0EA5E9", "#6366F1"], band: "JSS 1 – SSS 2",
    tagline: "Brackets, ×, ÷ before + and −. Get the order right to win.", howTo: "Follow BODMAS — brackets first, then × ÷, then + −." },
  // ── Senior secondary & exam prep ──
  { id: "equation-escape", stage: "junior", title: "Equation Escape", emoji: "🔓", kind: "quiz", skill: "linear", seconds: 90,
    colors: ["#2563EB", "#06B6D4"], band: "JSS 2 – SSS 1",
    tagline: "Crack each equation to unlock the next door.", howTo: "Solve for x and type the answer. Hard mode has x on both sides." },
  { id: "equation-balloons", stage: "junior", title: "Equation Balloons", emoji: "🎈", kind: "balloon", skill: "linear", seconds: 75,
    colors: ["#0EA5E9", "#8B5CF6"], band: "JSS 2 – SSS 1",
    tagline: "Solve for x, then pop the balloon carrying it.", howTo: "Work out x and tap the balloon with the right value before it floats away." },
  { id: "percent-power", stage: "junior", title: "Percent Power", emoji: "💯", kind: "quiz", skill: "percent", seconds: 75,
    colors: ["#F59E0B", "#EF4444"], band: "JSS 1 – SSS 2",
    tagline: "Percentages of amounts, increases, decreases and reverse percentages.", howTo: "Type the amount. Hard mode includes increases, decreases and \"what was the original?\"" },
  { id: "sequence-sleuth", stage: "senior", title: "Sequence Sleuth", emoji: "🔎", kind: "quiz", skill: "sequences", seconds: 90,
    colors: ["#10B981", "#0EA5E9"], band: "JSS 3 – SSS 3",
    tagline: "Spot the pattern: next terms, nth terms and quadratic sequences.", howTo: "Read the question under the sequence (next term or nth term) and type it." },
  { id: "log-ladder", stage: "senior", title: "Log Ladder", emoji: "🪜", kind: "quiz", skill: "logs", seconds: 75,
    colors: ["#7C3AED", "#2563EB"], band: "SSS 2 – SSS 3",
    tagline: "Climb the ladder with logarithms and the laws of logs.", howTo: "log₂ 8 = 3 because 2³ = 8. Use the laws to combine logs in hard mode." },
  { id: "index-invaders", stage: "senior", title: "Index Invaders", emoji: "👾", kind: "choice", skill: "indices", seconds: 75,
    colors: ["#9333EA", "#EC4899"], band: "JSS 3 – SSS 3",
    tagline: "Blast through the laws of indices before the invaders land.", howTo: "Pick the simplified answer. Add powers when multiplying, subtract when dividing, multiply for a power of a power." },
  { id: "root-hunter", stage: "senior", title: "Root Hunter", emoji: "🎯", kind: "choice", skill: "quadratics", seconds: 90,
    colors: ["#DC2626", "#F97316"], band: "SSS 1 – SSS 3",
    tagline: "Track down the roots of each quadratic equation.", howTo: "Factorise in your head and pick the two solutions. Watch the signs!" },
  { id: "fraction-factory", stage: "junior", title: "Fraction Factory", emoji: "🏭", kind: "choice", skill: "fractions", seconds: 90,
    colors: ["#0D9488", "#65A30D"], band: "JSS 1 – SSS 1",
    tagline: "Add, subtract, multiply and divide fractions on the production line.", howTo: "Pick the answer in its simplest form. Common denominators for + and −; flip and multiply to divide." },
  { id: "standard-form-showdown", stage: "senior", title: "Standard Form Showdown", emoji: "🔭", kind: "choice", skill: "standardForm", seconds: 75,
    colors: ["#1E3A8A", "#7C3AED"], band: "JSS 3 – SSS 2",
    tagline: "From atoms to galaxies — write numbers the scientist's way.", howTo: "Pick the number written as A × 10ⁿ with 1 ≤ A < 10." },
  { id: "simultaneous-strike", stage: "senior", title: "Simultaneous Strike", emoji: "⚔️", kind: "choice", skill: "simultaneous", seconds: 120,
    colors: ["#B91C1C", "#7C2D12"], band: "SSS 1 – SSS 3",
    tagline: "Two equations, one pair of answers. Strike true!", howTo: "Solve by elimination or substitution and pick the pair that fits both equations." },
  { id: "derivative-dash", stage: "senior", title: "Derivative Dash", emoji: "📈", kind: "choice", skill: "differentiation", seconds: 90,
    colors: ["#0F766E", "#2563EB"], band: "SSS 3 · A-Level",
    tagline: "Differentiate polynomials at speed — multiply by the power, then drop it by one.", howTo: "Pick dy/dx. Constants vanish when you differentiate." },
  { id: "expand-factorise", stage: "senior", title: "Expand & Factorise", emoji: "🧩", kind: "choice", skill: "expand", seconds: 90,
    colors: ["#C026D3", "#6366F1"], band: "JSS 3 – SSS 2",
    tagline: "Open the brackets — or put them back.", howTo: "Easy and medium: expand. Hard: factorise the quadratic into two brackets." },
  { id: "identity-check", stage: "senior", title: "Identity Check", emoji: "🧐", kind: "truefalse", skill: "identity", seconds: 60,
    colors: ["#4F46E5", "#DB2777"], band: "JSS 3 – SSS 2",
    tagline: "Is the algebra right or wrong? Spot the classic mistakes.", howTo: "Tap True or False. Remember (x + a)² is not x² + a²!" },
  { id: "trig-twins", stage: "senior", title: "Trig Twins", emoji: "📐", kind: "match", skill: "trig", seconds: 90,
    colors: ["#0891B2", "#4F46E5"], band: "SSS 1 – SSS 3",
    tagline: "Match each trig ratio to its exact value.", howTo: "Flip a ratio and its exact value to make a pair. Hard mode adds angles beyond 90°." },
  { id: "element-match", stage: "senior", subject: "science", title: "Element Match", emoji: "⚛️", kind: "match", skill: "elements", seconds: 90,
    colors: ["#DB2777", "#F59E0B"], band: "JSS 3 – SSS 3 · Chemistry",
    tagline: "Pair chemical symbols with their elements — Latin symbols included.", howTo: "Flip a symbol and its element name to match. Na is sodium, Fe is iron…" },
  { id: "unit-match", stage: "senior", subject: "science", title: "SI Unit Match", emoji: "📏", kind: "match", skill: "units", seconds: 90,
    colors: ["#EA580C", "#CA8A04"], band: "SSS 1 – SSS 3 · Physics",
    tagline: "Every physical quantity has its unit — match them up.", howTo: "Flip a quantity and its SI unit to make a pair." },
  // ── English: spelling, word puzzles and grammar ──
  { id: "word-scramble", stage: "primary", subject: "english", title: "Word Scramble", emoji: "🔤", kind: "letters", skill: "scramble", seconds: 90,
    colors: ["#F97316", "#EC4899"], band: "Primary 4 – JSS 2",
    tagline: "The letters are jumbled — read the clue and put them back in order.", howTo: "Tap the letters in order to spell the word (or type them). Tap a placed letter to take it back." },
  { id: "missing-letters", stage: "primary", subject: "english", title: "Missing Letters", emoji: "🧩", kind: "letters", skill: "gaps", seconds: 90,
    colors: ["#06B6D4", "#6366F1"], band: "Primary 4 – JSS 3",
    tagline: "Some letters have fallen out — fill the gaps to fix the word.", howTo: "Tap the letters that fill the blanks, left to right. Watch out for the decoys!" },
  { id: "sentence-builder", stage: "primary", subject: "english", title: "Sentence Builder", emoji: "🏗️", kind: "letters", skill: "sentence", seconds: 120,
    colors: ["#22C55E", "#0EA5E9"], band: "Primary 4 – SSS 1",
    tagline: "Put the jumbled words in order to build a proper sentence.", howTo: "Tap the words in the right order. Capital letters and full stops are clues!" },
  { id: "spelling-bee", stage: "junior", subject: "english", title: "Spelling Bee", emoji: "🐝", kind: "choice", skill: "spelling", seconds: 75,
    colors: ["#EAB308", "#F97316"], band: "Primary 5 – SSS 3",
    tagline: "Read the clue and pick the one correct spelling.", howTo: "Three of the spellings are wrong. Hard mode uses the words even adults misspell!" },
  { id: "spot-the-spelling", stage: "junior", subject: "english", title: "Spot the Spelling", emoji: "🔍", kind: "truefalse", skill: "spelling", seconds: 60,
    colors: ["#8B5CF6", "#EC4899"], band: "Primary 5 – SSS 2",
    tagline: "Is the word spelled correctly? Decide fast.", howTo: "Tap True if the spelling is right, False if it isn't (or press T / F)." },
  { id: "synonym-snap", stage: "junior", subject: "english", title: "Synonym Snap", emoji: "🤝", kind: "match", skill: "synonyms", seconds: 90,
    colors: ["#14B8A6", "#3B82F6"], band: "Primary 5 – SSS 3",
    tagline: "Pair up the words that mean the same thing.", howTo: "Flip two cards. Words with the same meaning make a pair." },
  { id: "opposites-attract", stage: "primary", subject: "english", title: "Opposites Attract", emoji: "🧲", kind: "match", skill: "antonyms", seconds: 90,
    colors: ["#EF4444", "#3B82F6"], band: "Primary 4 – SSS 3",
    tagline: "Match each word with its opposite.", howTo: "Flip two cards. A word and its antonym make a pair." },
  { id: "parts-of-speech", stage: "junior", subject: "english", title: "Parts of Speech", emoji: "🏷️", kind: "choice", skill: "partsOfSpeech", seconds: 90,
    colors: ["#7C3AED", "#2563EB"], band: "Primary 5 – SSS 2",
    tagline: "Noun, verb, adjective, adverb… label the word in the sentence.", howTo: "Read the sentence and choose the part of speech of the word in quotes." },
  { id: "tense-trouble", stage: "junior", subject: "english", title: "Tense Trouble", emoji: "⏳", kind: "choice", skill: "tenses", seconds: 75,
    colors: ["#0EA5E9", "#14B8A6"], band: "Primary 5 – SSS 2",
    tagline: "Yesterday, today or already done? Pick the right verb form.", howTo: "Read the time words in the sentence, then choose the correct form of the verb in brackets." },
  { id: "homophone-hero", stage: "primary", subject: "english", title: "Homophone Hero", emoji: "🦸", kind: "choice", skill: "homophones", seconds: 75,
    colors: ["#DB2777", "#7C3AED"], band: "Primary 4 – SSS 2",
    tagline: "There, their or they're? Save the sentence with the right word.", howTo: "The words sound the same — choose the one that fits the gap." },
  { id: "concord-clinic", stage: "senior", subject: "english", title: "Concord Clinic", emoji: "🩺", kind: "choice", skill: "concord", seconds: 75,
    colors: ["#0F766E", "#65A30D"], band: "JSS 2 – SSS 3 · WAEC",
    tagline: "Make the subject and verb agree — a WAEC favourite.", howTo: "Find the real subject (ignore phrases like 'as well as' and 'with') and pick the verb that agrees." },
  { id: "punctuation-pro", stage: "junior", subject: "english", title: "Punctuation Pro", emoji: "❗", kind: "choice", skill: "punctuation", seconds: 90,
    colors: ["#F59E0B", "#DC2626"], band: "Primary 5 – SSS 3",
    tagline: "Capitals, commas, apostrophes and quotation marks — spot the perfect sentence.", howTo: "Only one sentence is punctuated correctly. Read each one carefully." },
  { id: "plural-power", stage: "primary", subject: "english", title: "Plural Power", emoji: "👯", kind: "choice", skill: "plurals", seconds: 60,
    colors: ["#22C55E", "#EAB308"], band: "Primary 4 – SSS 2",
    tagline: "One child, two…? Pick the right plural, from boxes to criteria.", howTo: "Choose the correct plural. Hard mode has Latin and Greek plurals." },
  { id: "prefix-power", stage: "junior", subject: "english", title: "Prefix Power", emoji: "🔁", kind: "choice", skill: "prefixes", seconds: 60,
    colors: ["#6366F1", "#06B6D4"], band: "Primary 5 – SSS 2",
    tagline: "un-, dis-, im-, il-, ir-… make the opposite with the right prefix.", howTo: "Pick the word that means the opposite of the one shown." },
  { id: "vocabulary-vault", stage: "senior", subject: "english", title: "Vocabulary Vault", emoji: "🗝️", kind: "choice", skill: "vocabulary", seconds: 75,
    colors: ["#1E3A8A", "#9333EA"], band: "Primary 5 – SSS 3",
    tagline: "Unlock the meaning of each word. Hard mode is pure WAEC vocabulary.", howTo: "Choose the meaning closest to the word shown." },
  { id: "idiom-quest", stage: "senior", subject: "english", title: "Idiom Quest", emoji: "🗺️", kind: "choice", skill: "idioms", seconds: 75,
    colors: ["#B45309", "#9D174D"], band: "JSS 1 – SSS 3 · WAEC",
    tagline: "Bury the hatchet? A white elephant? Crack the idioms.", howTo: "Choose what the idiom really means — not what it says word for word!" },
  { id: "odd-one-out", stage: "primary", subject: "english", title: "Odd One Out", emoji: "🦄", kind: "choice", skill: "oddOneOut", seconds: 60,
    colors: ["#A855F7", "#F43F5E"], band: "Primary 4 – SSS 1",
    tagline: "Three words belong together. Which one doesn't?", howTo: "Spot the word that isn't in the same group. Hard mode groups words by grammar." },
];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

// Best guess at a class's stage from its name ("Primary 5", "JSS 2", "SSS 3",
// "Year 10", "Grade 4"…), so the admin opens on the right games. null = unsure.
export function stageForLevel(level: string): Stage | null {
  const l = level.toLowerCase();
  const n = Number(l.match(/\d+/)?.[0] ?? NaN);
  if (/primary|basic [1-6]\b|ks1|ks2/.test(l)) return "primary";
  if (/jss|junior|ks3/.test(l)) return "junior";
  if (/ss[s ]?\s*\d|senior|post secondary|undergraduate|college|a-?level|igcse|waec|jamb|sat/.test(l)) return "senior";
  if (/year/.test(l) && n) return n <= 6 ? "primary" : n <= 9 ? "junior" : "senior";
  if (/grade/.test(l) && n) return n <= 5 ? "primary" : n <= 8 ? "junior" : "senior";
  return null;
}

export const subjectOf = (g: ClassGame): GameSubject => g.subject ?? "maths";

export function findGame(id: string): ClassGame | undefined {
  return CLASS_GAMES.find((g) => g.id === id);
}

// Score sanity cap for one round (well above any honest score).
export const MAX_SCORE = 10_000;

// Stars for a round: pace (correct per minute) and accuracy both count.
export function starsFor(correct: number, attempts: number, seconds: number): number {
  const perMin = (correct / Math.max(1, seconds)) * 60;
  const acc = attempts ? correct / attempts : 0;
  if (perMin >= 20 && acc >= 0.85) return 3;
  if (perMin >= 10 && acc >= 0.7) return 2;
  return correct > 0 ? 1 : 0;
}
