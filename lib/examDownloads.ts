// The teacher's downloads for an exam (browser only): PDF reports — one
// learner's, or the whole class — and a spreadsheet of the results. Used by
// Exam mode during the class and by the class results afterwards.
import { gradeOf, type GradeScheme } from "@/lib/examReport";
import type { ExamQ } from "@/lib/exams";

export type DownloadExam = { title: string; total: number; questions?: ExamQ[]; className?: string; teacher?: string; createdAt?: string | null };
export type DownloadEntry = {
  id: string; name: string; answers?: Record<string, unknown>; flags: number; flagLog: { at: string; reason: string }[];
  startedAt?: string | null; submittedAt?: string | null; pageMarks?: Record<string, number>; extraQs?: ExamQ[];
  score: number | null; live?: number | null; total?: number | null; answered: number; submitted: boolean;
};

export async function downloadExamReports(exam: DownloadExam, entries: DownloadEntry[], scheme: GradeScheme, only?: DownloadEntry) {
  if (!exam.questions) throw new Error("no questions");
  const [{ examReports }, { learnerPdf, classPdf, savePdf }] = await Promise.all([import("@/lib/examReport"), import("@/lib/examPdf")]);
  const cr = examReports(exam.questions, entries.map((e) => ({ id: e.id, name: e.name, answers: e.answers ?? {}, flags: e.flags, flagLog: e.flagLog, startedAt: e.startedAt ?? null, submittedAt: e.submittedAt ?? null, pageMarks: e.pageMarks, extraQs: e.extraQs })), scheme);
  const meta = { className: exam.className || "Class", examTitle: exam.title, teacher: exam.teacher, date: new Date(exam.createdAt ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) };
  if (only) {
    const r = cr.learners.find((l) => l.id === only.id);
    if (!r) throw new Error("no report");
    savePdf(await learnerPdf(meta, r), `${only.name} - ${exam.title} report.pdf`);
  } else savePdf(await classPdf(meta, cr), `${exam.title} - class reports.pdf`);
}

export function examCsv(exam: DownloadExam, entries: DownloadEntry[], scheme: GradeScheme): string {
  const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const outOf = (e: DownloadEntry) => Math.max(1, e.total ?? exam.total);
  const pct = (e: DownloadEntry) => Math.round(((e.score ?? e.live ?? 0) / outOf(e)) * 100);
  const rows = [["Learner", "Score", "Out of", "Percent", `Grade (${scheme.name})`, "Answered", "Left the page", "Handed in"],
    ...entries.map((e) => [e.name, e.score ?? e.live ?? 0, outOf(e), pct(e), gradeOf(pct(e), scheme), e.answered, e.flags, e.submitted ? "yes" : "no"])];
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
export function downloadExamCsv(exam: DownloadExam, entries: DownloadEntry[], scheme: GradeScheme) {
  const url = URL.createObjectURL(new Blob(["﻿" + examCsv(exam, entries, scheme)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `${exam.title.replace(/[^\w ]+/g, "")}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
