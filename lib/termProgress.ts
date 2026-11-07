// A learner's progress across a term: every class they came to, how they did
// in each (class work, live quizzes, exams), their stars, and whether they're
// improving. Pure: the server gathers the rows (lib/starsServer.ts), this adds
// them up. Board learners have no accounts, so one learner is matched by name
// across classes (lib/stars.ts nameKey).
import { examStars, roundStars, leaderboard, nameKey, type Badge, type StarRows } from "@/lib/stars";

export type TermRows = StarRows & {
  titles: Record<string, string>;            // session id → class title
  asked: { session_id: string; asked: number }[]; // live-quiz questions asked in each class
};
export type ClassPoint = {
  id: string; at: string; title: string; attended: boolean;
  work: [number, number] | null; quiz: [number, number] | null; exam: [number, number] | null;
  percent: number | null; stars: number;
};
export type Trend = { slope: number; direction: "up" | "down" | "steady" | "unknown" };
export type TermProgress = {
  name: string; days: number;
  classes: ClassPoint[];          // the classes held since they first came, oldest first
  attended: number; held: number; attendance: number | null;
  stars: number; badges: Badge[];
  averages: { work: number | null; quiz: number | null; exam: number | null; overall: number | null };
  trend: Trend; best: ClassPoint | null; latest: ClassPoint | null;
};

export const TERM_RANGES = [{ days: 31, label: "Last month" }, { days: 91, label: "This term" }, { days: 183, label: "6 months" }] as const;
export const cleanDays = (v: unknown) => (TERM_RANGES.find((r) => r.days === Number(v)) ?? TERM_RANGES[1]).days;

const pct = (got: number, max: number) => (max > 0 ? Math.round((got / max) * 100) : null);
const sumPct = (parts: ([number, number] | null)[]) => {
  const xs = parts.filter((p): p is [number, number] => !!p && p[1] > 0);
  return xs.length ? pct(xs.reduce((a, p) => a + p[0], 0), xs.reduce((a, p) => a + p[1], 0)) : null;
};

// Least-squares slope of the class scores (percentage points per class).
export function trendOf(points: (number | null)[]): Trend {
  const ys = points.map((y, i) => [i, y] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (ys.length < 2) return { slope: 0, direction: "unknown" };
  const n = ys.length, mx = ys.reduce((a, p) => a + p[0], 0) / n, my = ys.reduce((a, p) => a + p[1], 0) / n;
  const den = ys.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  const slope = den ? ys.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den : 0;
  const r = Math.round(slope * 10) / 10;
  return { slope: r, direction: r >= 2 ? "up" : r <= -2 ? "down" : "steady" };
}

export function termProgress(rows: TermRows, who: string, days: number): TermProgress | null {
  const key = nameKey(who);
  if (!key) return null;
  // This learner's ids (a new id each class they join).
  const nameOf = new Map<string, string>();
  for (const g of rows.guests) nameOf.set(g.id, g.name);
  for (const r of [...rows.marks, ...rows.exams, ...rows.games]) if (!nameOf.has(r.student_id) && r.name) nameOf.set(r.student_id, r.name);
  const ids = new Set([...nameOf].filter(([, n]) => nameKey(n) === key).map(([id]) => id));
  if (!ids.size) return null;
  const shownName = [...nameOf].find(([id]) => ids.has(id))?.[1].trim() ?? who;

  const mine = <T extends { student_id: string }>(xs: T[]) => xs.filter((x) => ids.has(x.student_id));
  const marks = mine(rows.marks), quiz = mine(rows.quiz), exams = mine(rows.exams), games = mine(rows.games);
  const came = new Set([
    ...rows.guests.filter((g) => ids.has(g.id)).map((g) => g.session_id),
    ...marks.map((m) => m.session_id), ...quiz.map((q) => q.session_id), ...exams.map((e) => e.session_id), ...games.map((g) => g.session_id),
  ]);
  const sessions = [...rows.sessions].sort((a, b) => a.at.localeCompare(b.at));
  const first = sessions.findIndex((s) => came.has(s.id));
  if (first < 0) return null;

  const classes: ClassPoint[] = sessions.slice(first).map((s) => {
    const attended = came.has(s.id);
    const ms = marks.filter((m) => m.session_id === s.id && m.mark != null);
    const work: [number, number] | null = ms.length ? [ms.reduce((a, m) => a + (m.mark ?? 0), 0), ms.reduce((a, m) => a + (m.max_mark || 1), 0)] : null;
    const asked = rows.asked.filter((q) => q.session_id === s.id).reduce((a, q) => a + q.asked, 0);
    const right = quiz.filter((q) => q.session_id === s.id && q.correct).length;
    const quizPart: [number, number] | null = attended && asked > 0 ? [Math.min(right, asked), asked] : null;
    const es = exams.filter((e) => e.session_id === s.id && e.total);
    const exam: [number, number] | null = es.length ? [es.reduce((a, e) => a + (e.score ?? 0), 0), es.reduce((a, e) => a + (e.total ?? 0), 0)] : null;
    const stars = !attended ? 0 : 1 + right + ms.reduce((a, m) => a + Math.max(0, m.mark ?? 0), 0)
      + es.reduce((a, e) => a + examStars(e.score, e.total), 0)
      + games.filter((g) => g.session_id === s.id).reduce((a, g) => a + roundStars(g), 0);
    return { id: s.id, at: s.at, title: rows.titles[s.id] || "Class", attended, work, quiz: quizPart, exam, percent: attended ? sumPct([work, quizPart, exam]) : null, stars };
  });

  const total = (pick: (c: ClassPoint) => [number, number] | null) => sumPct(classes.map(pick));
  const attended = classes.filter((c) => c.attended).length;
  const scored = classes.filter((c) => c.percent != null);
  const me = leaderboard(rows, null).find((p) => p.key === key);
  return {
    name: shownName, days, classes, attended, held: classes.length,
    attendance: classes.length ? Math.round((attended / classes.length) * 100) : null,
    stars: classes.reduce((a, c) => a + c.stars, 0), badges: me?.badges ?? [],
    averages: { work: total((c) => c.work), quiz: total((c) => c.quiz), exam: total((c) => c.exam), overall: total((c) => (c.percent == null ? null : [c.percent, 100])) },
    trend: trendOf(classes.filter((c) => c.attended).map((c) => c.percent)),
    best: scored.reduce<ClassPoint | null>((b, c) => (!b || (c.percent ?? 0) > (b.percent ?? 0) ? c : b), null),
    latest: scored[scored.length - 1] ?? null,
  };
}

// A short sentence for parents.
export function progressSummary(p: TermProgress): string {
  const bits: string[] = [];
  bits.push(`${p.name} came to ${p.attended} of ${p.held} class${p.held === 1 ? "" : "es"}`);
  if (p.averages.overall != null) bits.push(`averaging ${p.averages.overall}%`);
  const t = p.trend.direction === "up" ? "and is improving" : p.trend.direction === "down" ? "and needs a little extra support right now" : p.trend.direction === "steady" ? "and is keeping steady" : "";
  return `${bits.join(", ")}${t ? ` ${t}` : ""}.`;
}
