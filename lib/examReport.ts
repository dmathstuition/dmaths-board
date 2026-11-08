// One learner's exam result and analysis, and the class's, for the reports
// the teacher downloads (lib/examPdf.ts). Pure.
import { markPaper, pageBlank, shownQ, type ExamQ } from "@/lib/exams";

export type ReportEntry = {
  id: string; name: string; answers: Record<string, unknown>; flags: number; flagLog: { at: string; reason: string }[];
  startedAt: string | null; submittedAt: string | null;
  pageMarks?: Record<string, number>; // the teacher's marks: pages, and method marks
  extraQs?: ExamQ[];                    // this learner's own questions (personal spelling words)
};
export type ReportItem = { n: number; q: string; given: string; correct: string; right: boolean; blank: boolean; marks: number; classRight: number | null };
export type LearnerReport = {
  id: string; name: string; scale: string; /* scale: the grading scheme's name */ score: number; total: number; percent: number; grade: string; position: number | null; of: number;
  classAverage: number | null; best: number | null; right: number; wrong: number; blank: number;
  minutes: number | null; flags: number; flagLog: { at: string; reason: string }[]; submitted: boolean;
  items: ReportItem[]; remark: string; focus: string[];
  scaled: number | null; // KS2 SATs: the estimated scaled score
};
export type ClassReport = {
  scheme: GradeScheme; takers: number; average: number | null; best: number | null; lowest: number | null; passed: number; strong: number | null;
  grades: { grade: string; count: number; pass: boolean }[];
  items: { n: number; q: string; correct: string; classRight: number | null }[]; // how the class did on each question
  learners: LearnerReport[]; // best first
};

// Grading schemes. The standard is the UK's GCSE 9–1 (9 highest; 4 is a
// standard pass, 5 a strong pass; U is ungraded). Real GCSE boundaries are set
// for each paper every year, so a class test uses fixed percentages — the
// usual school practice. WAEC (A1–F9) is there for Nigerian classes. KS2 SATs
// gives an estimated scaled score (80–120; 100 = the expected standard).
export type GradeScheme = {
  id: "gcse" | "waec" | "ks2"; name: string;
  grades: [number, string][];          // [lowest percent, grade], best first
  pass: number; passLabel: string;      // the pass mark and what it's called
  strong?: { min: number; label: string };
};
export const GCSE: GradeScheme = {
  id: "gcse", name: "UK GCSE (9–1)",
  grades: [[90, "9"], [80, "8"], [70, "7"], [60, "6"], [50, "5"], [40, "4"], [30, "3"], [20, "2"], [10, "1"], [0, "U"]],
  pass: 40, passLabel: "Standard pass (4+)", strong: { min: 50, label: "Strong pass (5+)" },
};
export const WAEC: GradeScheme = {
  id: "waec", name: "WAEC (A1–F9)",
  grades: [[75, "A1"], [70, "B2"], [65, "B3"], [60, "C4"], [55, "C5"], [50, "C6"], [45, "D7"], [40, "E8"], [0, "F9"]],
  pass: 50, passLabel: "Credit pass (C6+)",
};
// KS2 SATs: each year's raw-mark → scaled-score table is published after the
// tests, so this is an estimate. Recent papers needed about half the marks for
// 100 (the expected standard) and roughly 85% for 110 (a high score).
// HS = high score (110+), EXS = expected standard (100+), WTS = working towards.
export const KS2: GradeScheme = {
  id: "ks2", name: "KS2 SATs (estimated scaled score)",
  grades: [[85, "HS"], [50, "EXS"], [0, "WTS"]],
  pass: 50, passLabel: "Expected standard (100+)", strong: { min: 85, label: "High score (110+)" },
};
const SCALED: [number, number][] = [[0, 80], [50, 100], [85, 110], [100, 120]];
export function ks2Scaled(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  for (let i = 1; i < SCALED.length; i++) {
    const [x0, y0] = SCALED[i - 1], [x1, y1] = SCALED[i];
    if (p <= x1) return Math.round(y0 + ((p - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 120;
}
export const SCHEMES = [GCSE, KS2, WAEC];
export const schemeById = (id: unknown): GradeScheme => SCHEMES.find((s) => s.id === id) ?? GCSE;
export const gradeOf = (pct: number, scheme: GradeScheme = GCSE) => scheme.grades.find(([min]) => pct >= min)![1];
export const GRADES = GCSE.grades;

const answerText = (q: ExamQ, v: unknown): string => {
  if (v == null || v === "") return "";
  if (q.kind === "choice") { const i = Number(v); return Number.isInteger(i) && q.options[i] != null ? q.options[i] : ""; }
  return String(v).slice(0, 200);
};
const correctText = (q: ExamQ) => (q.kind === "page" || q.kind === "written" ? "Marked by the teacher" : q.kind === "choice" ? q.options[Number(q.answer)] ?? "" : String(q.answer));

function remarkFor(pct: number, avg: number | null, blank: number, flags: number, scheme: GradeScheme): string {
  const g = gradeOf(pct, scheme), named = scheme.id === "gcse" ? `grade ${g}` : g;
  const ks2 = scheme.id === "ks2" ? ks2Scaled(pct) : 0;
  const lead = scheme.id === "ks2"
    ? (ks2 >= 110 ? `Excellent work — an estimated scaled score of ${ks2}, a high score.`
      : ks2 >= 100 ? `Good work — an estimated scaled score of ${ks2}, at the expected standard.`
        : ks2 >= 95 ? `Nearly there — an estimated scaled score of ${ks2}. A few more marks reach the expected standard (100).`
          : `An estimated scaled score of ${ks2} — working towards the expected standard (100). Keep practising.`)
    : pct >= 80 ? `Excellent work — ${named}.`
    : scheme.strong && pct >= scheme.strong.min ? `Good work — ${named}, a strong pass.`
      : pct >= scheme.pass ? `${pct >= 60 ? "Good work" : "A fair result"} — ${named}, a ${scheme.id === "gcse" ? "standard" : "credit"} pass.`
        : pct >= scheme.pass - 10 ? `Nearly there — ${named}. A little more practice reaches a pass.` : `This topic needs more work — ${named}.`;
  const vsClass = avg == null ? "" : pct > avg + 5 ? " Above the class average." : pct < avg - 5 ? " Below the class average." : " Around the class average.";
  const left = blank > 0 ? ` ${blank} question${blank === 1 ? " was" : "s were"} left unanswered — attempt every question.` : "";
  const away = flags > 0 ? ` Left the exam page ${flags} time${flags === 1 ? "" : "s"}.` : "";
  return `${lead}${vsClass}${left}${away}`.trim();
}

export function examReports(questions: ExamQ[], entries: ReportEntry[], scheme: GradeScheme = GCSE): ClassReport {
  // Each learner's questions: everyone's, then any of their own.
  const qsOf = (e: ReportEntry) => (e.extraQs?.length ? [...questions, ...e.extraQs] : questions);
  const marked = entries.map((e) => ({ e, qs: qsOf(e), m: markPaper(qsOf(e), e.answers ?? {}, e.pageMarks ?? {}) }));
  const pctOf = (score: number, out: number) => (out ? Math.round((score / out) * 100) : 0);
  const n = marked.length;
  // How many of the class got each question right (the questions everyone had).
  const classRight = questions.map((_, i) => (n ? Math.round((marked.filter(({ m }) => m.right[i]).length / n) * 100) : null));
  const pcts = marked.map(({ m }) => pctOf(m.score, m.total));
  const average = n ? Math.round(pcts.reduce((a, b) => a + b, 0) / n) : null;
  const best = n ? Math.max(...pcts) : null, lowest = n ? Math.min(...pcts) : null;

  const learners: LearnerReport[] = marked.map(({ e, qs, m }) => {
    const items: ReportItem[] = qs.map((q, i) => {
      if (q.kind === "page") {
        const v = e.answers?.[String(i)], mark = e.pageMarks?.[String(i)], blank = pageBlank(v);
        const given = blank ? "" : mark != null ? `${mark} / ${q.marks} marks` : "Not marked yet";
        return { n: i + 1, q: q.q, given, correct: "Marked by the teacher", right: m.right[i], blank, marks: q.marks, classRight: classRight[i] ?? null };
      }
      if (q.kind === "written") {
        const v = String(e.answers?.[String(i)] ?? "").trim(), mark = e.pageMarks?.[String(i)];
        const given = v ? `${v.slice(0, 200)}${mark != null ? ` (${mark} / ${q.marks} marks)` : " (not marked yet)"}` : "";
        return { n: i + 1, q: q.q, given, correct: "Marked by the teacher", right: m.right[i], blank: !v, marks: q.marks, classRight: classRight[i] ?? null };
      }
      const raw = answerText(q, e.answers?.[String(i)]);
      const method = q.method && !m.right[i] && e.pageMarks?.[String(i)] != null ? ` (method mark ${e.pageMarks[String(i)]})` : "";
      const own = i >= questions.length ? " (their own word)" : "";
      return { n: i + 1, q: shownQ(q) + own, given: raw ? raw + method : "", correct: correctText(q), right: m.right[i], blank: !raw, marks: q.marks, classRight: classRight[i] ?? null };
    });
    const right = items.filter((x) => x.right).length, blank = items.filter((x) => x.blank).length;
    const p = pctOf(m.score, m.total);
    const minutes = e.startedAt && e.submittedAt ? Math.max(0, Math.round((Date.parse(e.submittedAt) - Date.parse(e.startedAt)) / 60_000)) : null;
    // What to work on: the questions they got wrong that most of the class got right first.
    const focus = items.filter((x) => !x.right).sort((a, b) => (b.classRight ?? 0) - (a.classRight ?? 0)).slice(0, 3).map((x) => `Q${x.n}: ${x.q}`);
    return {
      id: e.id, name: e.name || "Learner", scale: scheme.name, score: m.score, total: m.total, percent: p, grade: gradeOf(p, scheme), position: null, of: n, classAverage: average, best,
      right, wrong: items.length - right - blank, blank, minutes, flags: e.flags || 0, flagLog: (e.flagLog ?? []).slice(-10),
      submitted: !!e.submittedAt, items, remark: remarkFor(p, average, blank, e.flags || 0, scheme), focus,
      scaled: scheme.id === "ks2" ? ks2Scaled(p) : null,
    };
  });
  // Position: equal scores share a place (1, 2, 2, 4).
  learners.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  learners.forEach((l) => { l.position = learners.findIndex((x) => x.score === l.score) + 1; });

  return {
    scheme, takers: n, average, best, lowest, passed: learners.filter((l) => l.percent >= scheme.pass).length,
    strong: scheme.strong ? learners.filter((l) => l.percent >= scheme.strong!.min).length : null,
    grades: scheme.grades.map(([min, g]) => ({ grade: g, count: learners.filter((l) => l.grade === g).length, pass: min >= scheme.pass })),
    items: questions.map((q, i) => ({ n: i + 1, q: shownQ(q), correct: correctText(q), classRight: classRight[i] })),
    learners,
  };
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
