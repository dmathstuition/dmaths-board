// Live quiz (Kahoot-style) — pure rules shared by the API, UI and tests.
// Quizzes are prepared in the quiz library before class; during an interactive
// class session the host launches one and runs it question by question:
//   lobby → question → reveal (answer chart) → leaderboard → next question … → ended (podium)
// Faster correct answers earn more, answer streaks add a bonus, the answer key
// never reaches learners before the reveal, and the server times everything.

export type QuizQuestion = { q: string; options: string[]; answer: number; seconds: number };
export type QuizStatus = "lobby" | "question" | "reveal" | "leaderboard" | "ended";
export type QuizRow = {
  id: string; session_id?: string | null; class_id?: string | null; title: string; questions: QuizQuestion[];
  status: QuizStatus; current: number; started_at: string | null; created_at: string; ended_at?: string | null;
};
export type AnswerRow = { idx: number; student_id: string; choice: number; correct: boolean; ms: number; points: number; streak?: number };

export const MAX_QUESTIONS = 50;
export const SECONDS_CHOICES = [5, 10, 20, 30, 60, 90] as const;
export const GRACE_MS = 1500;          // allow for network lag after the timer ends
export const STREAK_STEP = 100;        // +100 per answer in a row after the first…
export const STREAK_CAP = 500;         // …up to +500

// Clean tutor input. Returns null when nothing usable was sent.
export function cleanQuestions(v: unknown): QuizQuestion[] | null {
  if (!Array.isArray(v)) return null;
  const out: QuizQuestion[] = [];
  for (const raw of v.slice(0, MAX_QUESTIONS)) {
    const q = String((raw as any)?.q ?? "").trim().slice(0, 300);
    const rawOpts: unknown[] = Array.isArray((raw as any)?.options) ? (raw as any).options.slice(0, 4) : [];
    const answerIn = Math.round(Number((raw as any)?.answer));
    // Drop blank options but keep the tick on the right one.
    const kept = rawOpts.map((o, i) => ({ text: String(o ?? "").trim().slice(0, 120), i })).filter((o) => o.text);
    const answer = kept.findIndex((o) => o.i === answerIn);
    const sec = Math.round(Number((raw as any)?.seconds));
    if (!q || kept.length < 2 || answer < 0) continue;
    out.push({ q, options: kept.map((o) => o.text), answer, seconds: (SECONDS_CHOICES as readonly number[]).includes(sec) ? sec : 20 });
  }
  return out.length ? out : null;
}

// 1000 for an instant correct answer, sliding to 500 at the buzzer; 0 if wrong.
export function pointsFor(correct: boolean, ms: number, seconds: number): number {
  if (!correct) return 0;
  const frac = Math.min(1, Math.max(0, ms / (seconds * 1000)));
  return Math.round(1000 - 500 * frac);
}

// Correct answers in a row going into question `idx` (a missed or skipped
// question breaks the run).
export function streakBefore(answers: AnswerRow[], studentId: string, idx: number): number {
  const mine = new Map(answers.filter((a) => a.student_id === studentId).map((a) => [a.idx, a.correct]));
  let n = 0;
  for (let i = idx - 1; i >= 0 && mine.get(i) === true; i--) n++;
  return n;
}

export const streakBonus = (streak: number) => (streak >= 2 ? Math.min(STREAK_CAP, (streak - 1) * STREAK_STEP) : 0);

// Score one answer: speed points plus the streak bonus it extends.
export function scoreAnswer(correct: boolean, ms: number, seconds: number, priorStreak: number) {
  const streak = correct ? priorStreak + 1 : 0;
  return { streak, bonus: correct ? streakBonus(streak) : 0, points: pointsFor(correct, ms, seconds) + (correct ? streakBonus(streak) : 0) };
}

// Is an answer for question `idx` still allowed right now?
export function canAnswer(quiz: Pick<QuizRow, "status" | "current" | "started_at" | "questions">, idx: number, now = Date.now()): boolean {
  if (quiz.status !== "question" || quiz.current !== idx || !quiz.started_at) return false;
  const q = quiz.questions[idx];
  if (!q) return false;
  return now - new Date(quiz.started_at).getTime() <= q.seconds * 1000 + GRACE_MS;
}

// May the question close on its own? Only once its time (plus the grace for
// late taps) is up by the server's clock, or everyone in the room answered.
export function revealDue(quiz: Pick<QuizRow, "status" | "current" | "started_at" | "questions">, answered: number, roster: number, now = Date.now()): boolean {
  if (quiz.status !== "question" || !quiz.started_at) return false;
  const q = quiz.questions[quiz.current];
  if (!q) return true;
  if (roster > 0 && answered >= roster) return true;
  return now - new Date(quiz.started_at).getTime() >= q.seconds * 1000 + GRACE_MS;
}

// The host's "next" button: what happens from each phase.
export function nextPatch(quiz: Pick<QuizRow, "status" | "current" | "questions">, nowIso: string): Partial<QuizRow> | null {
  const last = quiz.current + 1 >= quiz.questions.length;
  switch (quiz.status) {
    case "lobby":
    case "leaderboard":
      return last && quiz.status === "leaderboard"
        ? { status: "ended", ended_at: nowIso }
        : { status: "question", current: quiz.current + 1, started_at: nowIso };
    case "question": return { status: "reveal" };
    case "reveal": return last ? { status: "ended", ended_at: nowIso } : { status: "leaderboard" };
    default: return null;
  }
}

export type Standing = { studentId: string; name: string; points: number; correct: number; answered: number; streak: number };
export function leaderboard(answers: AnswerRow[], names: Map<string, string>, upToIdx = Infinity): Standing[] {
  const by = new Map<string, Standing>();
  for (const a of [...answers].sort((x, y) => x.idx - y.idx)) {
    if (a.idx > upToIdx) continue;
    const s = by.get(a.student_id) ?? { studentId: a.student_id, name: names.get(a.student_id) ?? "Learner", points: 0, correct: 0, answered: 0, streak: 0 };
    s.points += a.points; s.correct += a.correct ? 1 : 0; s.answered += 1;
    by.set(a.student_id, s);
  }
  for (const s of by.values()) s.streak = streakBefore(answers.filter((a) => a.idx <= upToIdx), s.studentId, Math.min(upToIdx, maxIdx(answers)) + 1);
  return [...by.values()].sort((x, y) => y.points - x.points || y.correct - x.correct || x.name.localeCompare(y.name));
}
const maxIdx = (answers: AnswerRow[]) => answers.reduce((m, a) => Math.max(m, a.idx), -1);

export function optionCounts(answers: AnswerRow[], idx: number, nOptions: number): number[] {
  const c = Array(nOptions).fill(0);
  for (const a of answers) if (a.idx === idx && a.choice >= 0 && a.choice < nOptions) c[a.choice]++;
  return c;
}

// What one viewer may see. Learners never get the answer key or the answer
// spread before the reveal.
export function viewFor(quiz: QuizRow, answers: AnswerRow[], names: Map<string, string>, viewer: { host: boolean; id: string }, roster = 0) {
  const q = quiz.questions[quiz.current];
  const revealed = quiz.status === "reveal" || quiz.status === "leaderboard" || quiz.status === "ended";
  const showKey = viewer.host || revealed;
  const board = leaderboard(answers, names);
  // Standings before this question, to show who moved up.
  const before = leaderboard(answers, names, quiz.current - 1);
  const prevRank = new Map(before.map((s, i) => [s.studentId, i + 1]));
  const mine = answers.find((a) => a.student_id === viewer.id && a.idx === quiz.current) ?? null;
  const myRank = board.findIndex((s) => s.studentId === viewer.id);
  const ahead = myRank > 0 ? board[myRank - 1] : null;
  return {
    id: quiz.id, title: quiz.title, status: quiz.status, current: quiz.current, total: quiz.questions.length,
    question: q && quiz.status !== "lobby" ? {
      q: q.q, options: q.options, seconds: q.seconds, startedAt: quiz.started_at,
      answer: showKey ? q.answer : null,
      counts: showKey ? optionCounts(answers, quiz.current, q.options.length) : null,
    } : null,
    answered: answers.filter((a) => a.idx === quiz.current).length,
    roster,
    leaderboard: board.slice(0, 10).map(({ studentId, name, points, correct, streak }, i) => ({
      name, points, correct, streak, move: prevRank.has(studentId) ? prevRank.get(studentId)! - (i + 1) : 0,
    })),
    me: viewer.host ? null : {
      answer: mine ? {
        choice: mine.choice,
        correct: revealed ? mine.correct : null,
        points: revealed ? mine.points : null,
        streak: revealed ? (mine.streak ?? 0) : null,
      } : null,
      points: myRank >= 0 ? board[myRank].points : 0,
      rank: myRank >= 0 ? myRank + 1 : null,
      of: board.length,
      behind: ahead && revealed ? { name: ahead.name, by: ahead.points - board[myRank].points } : null,
    },
    ...(viewer.host ? { questions: quiz.questions } : {}),
  };
}
export type QuizView = ReturnType<typeof viewFor>;
