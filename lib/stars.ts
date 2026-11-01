// The class leaderboard: stars and badges earned across a teacher's classes.
// Board learners join without accounts, so one learner across lessons is
// matched by name (as they type it when joining). Pure: the server gathers
// the rows, this adds them up.
//
// Stars:  ⭐ 1 for coming to a class
//         ⭐ 1 for each live-quiz question right
//         ⭐ 1 for each class-work mark
//         ⭐ up to 5 for each exam (1 per 20%)
//         ⭐ up to 3 for each game round (1 per 5 right)

export type StarRows = {
  sessions: { id: string; at: string }[];
  guests: { id: string; session_id: string; name: string }[];
  marks: { session_id: string; student_id: string; name: string; mark: number | null; max_mark: number }[];
  quiz: { session_id: string; student_id: string; correct: boolean }[];
  exams: { session_id: string; student_id: string; name: string; score: number | null; total: number | null }[];
  games: { session_id: string; student_id: string; name: string; correct: number }[];
};
export type Badge = { id: string; icon: string; label: string };
export const BADGES: Record<string, Badge> = {
  first: { id: "first", icon: "⭐", label: "First star" },
  regular: { id: "regular", icon: "📚", label: "Regular — 3 classes" },
  quiz: { id: "quiz", icon: "🎯", label: "Quiz whiz — 10 right" },
  perfect: { id: "perfect", icon: "🏅", label: "Perfect exam" },
  worker: { id: "worker", icon: "✍️", label: "Hard worker — 5 full marks" },
  gamer: { id: "gamer", icon: "🎮", label: "Game champ — 5 rounds" },
  century: { id: "century", icon: "💯", label: "100 stars" },
};
export type Standing = { key: string; name: string; stars: number; classStars: number; classes: number; badges: Badge[]; parts: { attend: number; quiz: number; work: number; exams: number; games: number } };

// One learner across lessons: the same name, ignoring case and extra spaces.
export const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60);
export const examStars = (score: number | null, total: number | null) => (score != null && total ? Math.min(5, Math.floor((score / total) * 5 + 1e-9)) : 0);
export const gameStars = (correct: number) => Math.min(3, Math.floor(Math.max(0, correct) / 5));

// `current`: this class's id, for "stars this class".
export function leaderboard(rows: StarRows, current: string | null): Standing[] {
  const nameOf = new Map<string, string>(); // student id → name
  for (const g of rows.guests) nameOf.set(g.id, g.name);
  for (const m of rows.marks) if (!nameOf.has(m.student_id) && m.name) nameOf.set(m.student_id, m.name);
  for (const e of rows.exams) if (!nameOf.has(e.student_id) && e.name) nameOf.set(e.student_id, e.name);
  for (const g of rows.games) if (!nameOf.has(g.student_id) && g.name) nameOf.set(g.student_id, g.name);

  const people = new Map<string, Standing & { sessions: Set<string>; quizRight: number; fullMarks: number; rounds: number; perfect: boolean }>();
  const get = (id: string) => {
    const name = nameOf.get(id);
    if (!name || !nameKey(name)) return null;
    const key = nameKey(name);
    let p = people.get(key);
    if (!p) people.set(key, p = { key, name: name.trim(), stars: 0, classStars: 0, classes: 0, badges: [], parts: { attend: 0, quiz: 0, work: 0, exams: 0, games: 0 }, sessions: new Set(), quizRight: 0, fullMarks: 0, rounds: 0, perfect: false });
    return p;
  };
  const add = (p: NonNullable<ReturnType<typeof get>>, session: string, n: number, part: keyof Standing["parts"]) => {
    if (n <= 0) return;
    p.stars += n; p.parts[part] += n;
    if (session === current) p.classStars += n;
  };
  for (const g of rows.guests) { const p = get(g.id); if (p && !p.sessions.has(g.session_id)) { p.sessions.add(g.session_id); add(p, g.session_id, 1, "attend"); } }
  for (const q of rows.quiz) { const p = get(q.student_id); if (p && q.correct) { p.quizRight++; add(p, q.session_id, 1, "quiz"); } }
  for (const m of rows.marks) { const p = get(m.student_id); if (p && m.mark != null) { add(p, m.session_id, m.mark, "work"); if (m.mark >= m.max_mark) p.fullMarks++; } }
  for (const e of rows.exams) { const p = get(e.student_id); if (p) { add(p, e.session_id, examStars(e.score, e.total), "exams"); if (e.total && e.score === e.total) p.perfect = true; } }
  for (const g of rows.games) { const p = get(g.student_id); if (p) { p.rounds++; add(p, g.session_id, gameStars(g.correct), "games"); } }

  return [...people.values()].map((p) => {
    const b: Badge[] = [];
    if (p.stars > 0) b.push(BADGES.first);
    if (p.sessions.size >= 3) b.push(BADGES.regular);
    if (p.quizRight >= 10) b.push(BADGES.quiz);
    if (p.perfect) b.push(BADGES.perfect);
    if (p.fullMarks >= 5) b.push(BADGES.worker);
    if (p.rounds >= 5) b.push(BADGES.gamer);
    if (p.stars >= 100) b.push(BADGES.century);
    return { key: p.key, name: p.name, stars: p.stars, classStars: p.classStars, classes: p.sessions.size, badges: b, parts: p.parts };
  }).sort((a, b) => b.stars - a.stars || b.classStars - a.classStars || a.name.localeCompare(b.name));
}

// What's shown on everyone's screen (kept small: it travels over the class channel).
export type Shown = { title: string; rows: { name: string; stars: number; badges: string[] }[] };
export function shownBoard(list: Standing[], scope: "class" | "all"): Shown {
  const by = scope === "class" ? [...list].filter((p) => p.classStars > 0).sort((a, b) => b.classStars - a.classStars) : list;
  return {
    title: scope === "class" ? "Stars this class" : "Class leaderboard",
    rows: by.slice(0, 10).map((p) => ({ name: p.name.slice(0, 40), stars: scope === "class" ? p.classStars : p.stars, badges: p.badges.map((x) => x.icon).slice(0, 7) })),
  };
}
export function cleanShown(v: unknown): Shown | null {
  const s = v as any;
  if (!s || !Array.isArray(s.rows)) return null;
  return {
    title: String(s.title ?? "Leaderboard").slice(0, 40),
    rows: s.rows.slice(0, 10).map((r: any) => ({ name: String(r?.name ?? "").slice(0, 40), stars: Math.max(0, Math.min(1e6, Math.round(Number(r?.stars) || 0))), badges: (Array.isArray(r?.badges) ? r.badges : []).map((b: unknown) => String(b).slice(0, 4)).slice(0, 7) })).filter((r: any) => r.name),
  };
}
