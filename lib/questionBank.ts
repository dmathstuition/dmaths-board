// Shared shape and validation for CBT questions.
//
// The same object is used three ways: written in the CBT builder, saved to the
// question bank, and stored on `assignments.cbt_questions` when a test is
// created. Keeping one validator means a question that passes here is one the
// marker can always mark.

export type BankQuestion = {
  question: string;
  code?: string;
  image_url?: string;  // optional figure shown with the question
  options: string[];
  answer: number;      // 0-based index into options
};

export type BankRow = BankQuestion & {
  id: string;
  subject: string;
  level: string;
  topic: string;
  exam?: string;
  group_name?: string;   // a named set this question belongs to (optional)
};

export const MAX_OPTIONS = 6;

// A named group is "mock-ready" once it holds enough questions to build a full
// paper from. Staff group questions under a name (e.g. "SS3 Algebra Mock Set")
// and aim for at least this many.
export const GROUP_TARGET = 20;
export function groupReady(count: number): boolean {
  return count >= GROUP_TARGET;
}

// Count questions per named group (blank names ignored), sorted by name. Pure so
// the admin's group overview and its readiness badges can be unit-tested.
export function summariseGroups(rows: { group_name?: string | null }[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    const name = String(r?.group_name ?? "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// A question is usable only if it has text, at least two choices, and an answer
// that actually points at one of them. Returns the reason so the UI can say it.
export function validateQuestion(q: Partial<BankQuestion>): string | null {
  if (!String(q.question ?? "").trim()) return "Every question needs its text.";
  const options = (q.options ?? []).map((o) => String(o ?? "").trim());
  if (options.length < 2) return "A question needs at least two options.";
  if (options.some((o) => !o)) return "Every option needs text — remove the blank ones.";
  if (options.length > MAX_OPTIONS) return `A question can have at most ${MAX_OPTIONS} options.`;
  const answer = Number(q.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return "Mark which option is the correct answer.";
  }
  return null;
}

// Trim and clamp before storing, so the bank never holds a question the marker
// would choke on.
export function normaliseQuestion(q: Partial<BankQuestion>): BankQuestion {
  const options = (q.options ?? []).map((o) => String(o ?? "").trim().slice(0, 300)).slice(0, MAX_OPTIONS);
  return {
    question: String(q.question ?? "").trim().slice(0, 2000),
    code: String(q.code ?? "").trim().slice(0, 4000),
    image_url: String(q.image_url ?? "").trim().slice(0, 500),
    options,
    answer: Math.max(0, Math.min(options.length - 1, Math.round(Number(q.answer) || 0))),
  };
}

// Pick `count` questions at random without repeats. Used by "randomise N" when
// building a test from the bank; a stable rng makes it testable.
export function pickRandom<T>(items: T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...items];
  const out: T[] = [];
  const wanted = Math.max(0, Math.min(count, pool.length));
  for (let i = 0; i < wanted; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return out;
}

// Parse a pasted batch of questions so a teacher can add many at once (all
// tagged with one year-group/subject/topic in the UI). Blocks are separated by a
// blank line. In each block the first line(s) are the question; option lines
// start with "A)"/"A."/"-", and the correct option is flagged with a "*" at the
// start or end of its line. Lenient and pure so it's unit-testable.
//
//   What is 2 + 2?
//   A) 3
//   B) 4 *
//   C) 5
export function parseQuestionBatch(text: string): { questions: BankQuestion[]; errors: string[] } {
  const questions: BankQuestion[] = [];
  const errors: string[] = [];
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const optHead = /^(\*\s*)?(?:[A-Za-z][)._]|[-•*])\s+(.*)$/;

  blocks.forEach((block, bi) => {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const qLines: string[] = [];
    const opts: { text: string; correct: boolean }[] = [];
    let inOptions = false;

    for (const raw of lines) {
      const m = raw.match(optHead);
      if (m) {
        inOptions = true;
        let t = m[2].trim();
        let correct = !!m[1];
        if (/\*$/.test(t)) { correct = true; t = t.replace(/\s*\*$/, "").trim(); }
        opts.push({ text: t, correct });
      } else if (!inOptions) {
        qLines.push(raw.replace(/^\s*\d+[).]\s*/, "")); // strip "1." / "1)" numbering
      } else if (opts.length) {
        opts[opts.length - 1].text += " " + raw; // wrapped option line
      }
    }

    const answer = opts.findIndex((o) => o.correct);
    const q: Partial<BankQuestion> = { question: qLines.join(" ").trim(), options: opts.map((o) => o.text), answer, code: "" };
    if (answer < 0 && opts.length >= 2) { errors.push(`Question ${bi + 1}: mark the correct option with a *`); return; }
    const bad = validateQuestion(q);
    if (bad) { errors.push(`Question ${bi + 1}: ${bad}`); return; }
    questions.push(normaliseQuestion(q));
  });

  return { questions, errors };
}

// Bank row → the shape a test stores. Ids are re-numbered from 1 so a test's
// questions read 1..n however they were picked.
export function toCbtQuestions(rows: BankQuestion[]): (BankQuestion & { id: number })[] {
  return rows.map((r, i) => ({
    id: i + 1,
    question: r.question,
    code: r.code ?? "",
    image_url: r.image_url ?? "",
    options: r.options,
    answer: r.answer,
  }));
}
