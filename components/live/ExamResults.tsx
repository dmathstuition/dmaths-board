"use client";
import { useCallback, useEffect, useState } from "react";
import { SCHEMES, gradeOf, schemeById, type GradeScheme } from "@/lib/examReport";
import { needsMarking, type ExamQ } from "@/lib/exams";
import { downloadExamCsv, downloadExamReports, type DownloadEntry } from "@/lib/examDownloads";
import { MarkingDesk, type MarkEntry } from "@/components/live/board/PaperPages";

// Each exam of the class, for the teacher — also after the class has ended
// (when the board, and Exam mode with it, is closed): every learner's mark and
// grade, PDF reports and a spreadsheet, marking still to do, and deleting an
// uploaded paper once it's marked.
type ListItem = { id: string; title: string; status: "open" | "closed"; createdAt: string; count: number };
type Exam = { booklet?: string[]; id: string; title: string; status: "open" | "closed"; endsAt: number; total: number; count: number; questions: ExamQ[]; className?: string; teacher?: string; createdAt?: string | null };
type Entry = DownloadEntry & MarkEntry & { extraMs?: number };

const api = (body: unknown) => fetch("/api/board/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) })).catch(() => ({ ok: false, j: { error: "Check the internet and try again." } as any }));

export default function ExamResults({ sessionId, onChange }: { sessionId: string; onChange?: () => void }) {
  const [list, setList] = useState<ListItem[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [scale, setScale] = useState<GradeScheme["id"]>(() => { try { return schemeById(localStorage.getItem("exam-grading")).id; } catch { return "gcse"; } });
  const scheme = schemeById(scale);
  const pickScale = (id: GradeScheme["id"]) => { setScale(id); try { localStorage.setItem("exam-grading", id); } catch { /* storage blocked */ } };

  useEffect(() => {
    fetch(`/api/board/exams?sessionId=${encodeURIComponent(sessionId)}&list=1`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) { setList(j.exams ?? []); setPick((p) => p ?? j.exams?.at(-1)?.id ?? null); } else setNote(j.error ?? "Couldn't load the exams."); })
      .catch(() => setNote("Couldn't load the exams — check the internet."));
  }, [sessionId]);
  const load = useCallback(async () => {
    if (!pick) return;
    const r = await fetch(`/api/board/exams?sessionId=${encodeURIComponent(sessionId)}&examId=${encodeURIComponent(pick)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r?.ok && j?.exam) { setExam(j.exam); setEntries(j.entries ?? []); } else if (r && !r.ok) setNote(j?.error ?? "Couldn't load the exam.");
  }, [sessionId, pick]);
  useEffect(() => { load(); }, [load]);
  const reload = async () => { await load(); onChange?.(); };

  async function reports(only?: Entry) {
    if (!exam) return;
    setBusy(only?.id ?? "all"); setNote(null);
    try { await downloadExamReports(exam, entries, scheme, only); }
    catch { setNote("Couldn't make the report — try again."); }
    finally { setBusy(null); }
  }
  async function end() {
    if (!exam || !window.confirm("End the exam now? Every paper is handed in and marked.")) return;
    const { ok, j } = await api({ action: "close", examId: exam.id });
    if (!ok) setNote(j.error ?? "Couldn't end the exam."); await reload();
  }
  async function wipe() {
    if (!exam) return;
    const pages = exam.questions.filter((q) => q.img).length + (exam.booklet?.length ?? 0);
    const left = entries.reduce((a, e) => a + (e.toMark?.length ?? 0), 0);
    if (!window.confirm(`${left ? `⚠ ${left} still not marked — you won't be able to see ${left === 1 ? "it" : "them"} after this.\n\n` : ""}Delete this paper's ${pages} page${pages === 1 ? "" : "s"} for good? Marks, scores and reports stay.`)) return;
    setBusy("wipe");
    const { ok, j } = await api({ action: "wipe-paper", examId: exam.id });
    setBusy(null);
    setNote(ok ? `✓ The paper is deleted. Marks and scores are kept.` : j.error ?? "Couldn't delete the paper — try again.");
    await reload();
  }

  if (list && !list.length) return null;
  const marked = entries.filter((e) => e.submitted);
  const pctOf = (e: Entry) => Math.round(((e.score ?? 0) / Math.max(1, e.total ?? exam?.total ?? 1)) * 100);
  const avg = marked.length ? Math.round(marked.reduce((a, e) => a + pctOf(e), 0) / marked.length) : null;
  const open = exam?.status === "open";
  return (
    <section aria-label="Exam results" className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-display text-xl font-black text-ink">📝 Exams</h3>
        {list && list.length > 1 && (
          <label className="flex items-center gap-1.5 text-xs font-black text-ink/70">Exam
            <select value={pick ?? ""} onChange={(e) => { setPick(e.target.value); setExam(null); }} className="rounded-lg bg-white px-2 py-1.5 text-xs font-black ring-1 ring-slate-200">
              {list.map((x) => <option key={x.id} value={x.id}>{x.title} · {new Date(x.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</option>)}
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs font-black text-ink/70">Grading
          <select value={scale} onChange={(e) => pickScale(e.target.value as GradeScheme["id"])} className="rounded-lg bg-white px-2 py-1.5 text-xs font-black ring-1 ring-slate-200">
            {SCHEMES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </div>
      {note && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${note.startsWith("✓") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{note}</p>}
      {!exam ? <div className="mt-3 h-24 animate-pulse rounded-2xl bg-ink/5" /> : (
        <>
          <p className="mt-2 text-sm text-ink/65"><b className="text-ink">{exam.title}</b> · {exam.count} questions · {exam.total} marks · {marked.length} handed in{avg != null ? ` · average ${avg}%` : ""}</p>
          {open && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="mr-auto text-sm font-bold text-amber-900">This exam is still running — it ends by itself when the time is up.</p>
              <button type="button" onClick={end} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End exam</button>
            </div>
          )}
          {needsMarking(exam.questions) && <div className="mt-3"><MarkingDesk examId={exam.id} questions={exam.questions} entries={entries} api={api} reload={reload} running={open} /></div>}
          {entries.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead><tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-ink/45"><th className="pb-2 pr-3">Learner</th><th className="pb-2 pr-3">Score</th><th className="pb-2 pr-3" title={scheme.name}>Grade</th><th className="pb-2 pr-3">Left the page</th><th className="pb-2"><span className="sr-only">Report</span></th></tr></thead>
                <tbody>
                  {[...entries].sort((a, b) => pctOf(b) - pctOf(a)).map((e) => (
                    <tr key={e.id} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-bold text-ink">{e.name}</td>
                      <td className="py-2 pr-3 tabular-nums font-black">{e.submitted ? `${e.score} / ${e.total} (${pctOf(e)}%)` : "Not handed in yet"}{e.toMark?.length ? <span className="block text-[11px] font-bold text-amber-700">{e.toMark.length} to mark</span> : null}</td>
                      <td className="py-2 pr-3">{e.submitted ? <span className={`rounded-md px-2 py-0.5 text-xs font-black ${pctOf(e) >= scheme.pass ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{gradeOf(pctOf(e), scheme)}</span> : ""}</td>
                      <td className="py-2 pr-3 text-xs font-bold">{e.flags ? <span className="text-red-700">⚠ {e.flags}×</span> : <span className="text-emerald-700">No</span>}</td>
                      <td className="py-2 text-right"><button type="button" onClick={() => reports(e)} disabled={!!busy} aria-label={`Download ${e.name}'s exam report (PDF)`} className="rounded-lg bg-[#E2F3F2] px-2.5 py-1.5 text-[11px] font-black text-[#0A4F52] disabled:opacity-50">{busy === e.id ? "Making…" : "📄 Report"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-3 text-sm text-ink/55">Nobody took this exam.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => reports()} disabled={!!busy || !entries.length} className="rounded-xl bg-[#0E6E72] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy === "all" ? "Making the reports…" : "📄 Download all exam reports (PDF)"}</button>
            <button type="button" onClick={() => downloadExamCsv(exam, entries, scheme)} disabled={!entries.length} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black disabled:opacity-50">Exam results (spreadsheet)</button>
            {!open && (exam.questions.some((q) => q.img) || !!exam.booklet?.length) && <button type="button" onClick={wipe} disabled={busy === "wipe"} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy === "wipe" ? "Deleting…" : `🗑 Delete the paper (${exam.questions.filter((q) => q.img).length + (exam.booklet?.length ?? 0)} pages)`}</button>}
          </div>
        </>
      )}
    </section>
  );
}
