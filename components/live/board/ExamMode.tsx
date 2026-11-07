"use client";
import { ReadingButton, Speak } from "@/components/live/Reading";
import { speak, stopSpeaking } from "@/lib/reading";
import { SATS_ARITHMETIC, SPELLING_LISTS, parseSpellings, satsArithmetic } from "@/lib/sats";
import { PAPER_FIT, sendSlides } from "@/components/live/board/slides";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { useServerClock } from "@/lib/serverClock";
import { UK_SETS } from "@/lib/ukPrimary";
import { SCHEMES, gradeOf, schemeById, type GradeScheme } from "@/lib/examReport";
import { CalculatorButton } from "@/components/live/PhoneCalculator";
import { EXAM_MINUTES, EXAM_TOPICS, MAX_PAGE_MARKS, clockLeft, isHandMarked, keepsOrder, pageDone, spokenSpelling, topicQuestions, type ExamQ, type LearnerQ } from "@/lib/exams";
import { MarkingDesk, PageFlow } from "@/components/live/board/PaperPages";
import type { Difficulty } from "@/lib/games/generators";

// Exam mode: a timed test every learner takes on their own phone — questions
// in a different order on each phone, answers saved as they go, leaving the
// exam page reported to the teacher, and marked automatically.
// Message: "exam" (teacher → all, signed): { examId } when one starts or ends,
// so phones check at once (they also check every few seconds); { examId, at }
// when the teacher reads spelling number `at` out — phones go to it.

type Meta = { id: string; title: string; minutes: number; review: boolean; calculator?: boolean; inOrder?: boolean; handMarked?: boolean; status: "open" | "closed"; endsAt: number; count: number; total: number ; questions?: ExamQ[]; className?: string; teacher?: string; createdAt?: string | null };
type Entry = { pageMarks?: Record<string, number>; toMark?: number[]; id: string; name: string; answered: number; flags: number; flagLog: { at: string; reason: string }[]; submitted: boolean; score: number | null; total: number | null; live: number | null;
  answers?: Record<string, unknown>; startedAt?: string | null; submittedAt?: string | null };
type Analysis = { score: number; total: number; right: number; wrong: number; blank: number; average: number | null; best: number | null; takers: number; position: number | null; flags: number };
type Review = { q: string; kind: ExamQ["kind"]; options: string[]; answer: number | string; given: unknown; right: boolean; marks: number };

const api = (body: unknown) => fetch("/api/board/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) })).catch(() => ({ ok: false, j: { error: "Check the internet and try again." } as any }));

export default function ExamMode({ sessionId, host, open, onOpen, onClose }: { sessionId: string; host: boolean; open: boolean; onOpen: () => void; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/board/exams?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (r?.ok && j) setData(j); else if (r && r.status === 501) setData({ exam: null, setup: j?.error });
  }, [sessionId]);
  const [follow, setFollow] = useState<{ n: number; k: number } | null>(null);
  const send = useLive({ exam: (p) => {
    if (host || !p?.host) return;
    load();
    if (Number.isInteger(p.at) && p.at >= 0) setFollow({ n: p.at, k: Date.now() });
  } });
  const exam: Meta | null = data?.exam ?? null;
  const running = exam?.status === "open";
  // Teachers: often while watching; learners: every few seconds while a class runs.
  useEffect(() => {
    load();
    const every = host ? (open && running ? 3000 : 12_000) : 10_000;
    const t = setInterval(load, every);
    return () => clearInterval(t);
  }, [load, host, open, running]);
  const tell = (examId: string | null, at?: number) => send("exam", { host: true, examId, ...(at != null ? { at } : {}) });

  if (host) return <Teacher open={open} onOpen={onOpen} onClose={onClose} data={data} reload={load} sessionId={sessionId} tell={tell} />;
  return <Learner data={data} reload={load} sessionId={sessionId} follow={follow} />;
}

// ── Teacher ──
function Teacher({ open, onOpen, onClose, data, reload, sessionId, tell }: { open: boolean; onOpen: () => void; onClose: () => void; data: any; reload: () => Promise<void>; sessionId: string; tell: (id: string | null, at?: number) => void }) {
  const now = useServerClock()();
  const [pdfBusy, setPdfBusy] = useState<string | null>(null); // PDF reports being made
  // Grading: the UK's GCSE 9–1 unless this teacher picks WAEC (kept on this device).
  const [scale, setScale] = useState<GradeScheme["id"]>(() => { try { return schemeById(localStorage.getItem("exam-grading")).id; } catch { return "gcse"; } });
  const scheme = schemeById(scale);
  const pickScale = (id: GradeScheme["id"]) => { setScale(id); try { localStorage.setItem("exam-grading", id); } catch { /* storage blocked */ } };
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const exam: Meta | null = data?.exam ?? null;
  const running = exam?.status === "open";
  const [building, setBuilding] = useState(false);
  const [title, setTitle] = useState("Class test");
  const [minutes, setMinutes] = useState(20);
  const [review, setReview] = useState(true);
  const [calcOk, setCalcOk] = useState(true); // learners' phone calculator in this exam
  const [inOrder, setInOrder] = useState(false); // everyone gets the same order (a real paper)
  const [qs, setQs] = useState<ExamQ[]>([]);
  // KS2 SATs: spelling tests, and real papers uploaded as a PDF.
  const [spellOpen, setSpellOpen] = useState(false);
  const [spellText, setSpellText] = useState("");
  const [spellHear, setSpellHear] = useState(true);
  const [satsNote, setSatsNote] = useState<string | null>(null);
  const [paperPages, setPaperPages] = useState<(string | null)[]>([]);
  const [paperBusy, setPaperBusy] = useState(false);
  // How an uploaded paper is marked: by the teacher, page by page (learners write
  // on the pages), or with answer boxes marked automatically.
  const [paperMode, setPaperMode] = useState<"hand" | "auto">("hand");
  const pageQ = (url: string) => qs.find((x) => x.kind === "page" && x.img === url);
  function setPageMarks(url: string, marks: number) {
    setQs((cur) => {
      const rest = cur.filter((x) => !(x.kind === "page" && x.img === url));
      const next = marks > 0 ? [...rest, { q: cur.find((x) => x.kind === "page" && x.img === url)?.q ?? `Page ${paperPages.indexOf(url) + 1}`, kind: "page" as const, options: [], answer: "", marks: Math.min(MAX_PAGE_MARKS, marks), img: url }] : rest;
      // Pages stay in the paper's order.
      const at = (x: ExamQ) => (x.kind === "page" && x.img ? paperPages.indexOf(x.img) : -1);
      return [...next.filter((x) => x.kind !== "page"), ...next.filter((x) => x.kind === "page").sort((a, b) => at(a) - at(b))];
    });
  }
  const paperInput = useRef<HTMLInputElement>(null);
  const fixedOrder = keepsOrder(qs, inOrder);
  const ownTitle = useRef(false); // the teacher typed a title: presets leave it alone
  function satsSetup(t: string, mins: number) {
    if (!ownTitle.current || !title.trim()) setTitle(t);
    setMinutes(mins); setCalcOk(false); setInOrder(true);
  }
  function useArithmetic() {
    if (qs.length && !window.confirm(`Replace the ${qs.length} question${qs.length === 1 ? "" : "s"} below with a new arithmetic paper?`)) return;
    setQs(satsArithmetic()); satsSetup(SATS_ARITHMETIC.title, SATS_ARITHMETIC.minutes); pickScale("ks2");
    setSatsNote(`✓ A new arithmetic paper: ${SATS_ARITHMETIC.questions} questions, 40 marks, 30 minutes, no calculator. Graded as an estimated SATs scaled score.`);
  }
  function addSpellings() {
    const got = parseSpellings(spellText, spellHear);
    if (!got.length) { setSatsNote("Write one sentence per line with the word in *stars*, e.g. I did a *rough* sketch."); return; }
    setQs((cur) => [...cur, ...got].slice(0, 60)); satsSetup("Spelling test", 15);
    setSatsNote(`✓ ${got.length} spelling${got.length === 1 ? "" : "s"} added. When the test starts, read each one out from your screen — every phone goes to the word you read.`);
    setSpellOpen(false);
  }
  async function uploadPaper(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (paperInput.current) paperInput.current.value = "";
    if (!files.length) return;
    setPaperBusy(true); setSatsNote(null);
    try {
      const urls = await sendSlides({ sessionId }, files, 40, (m) => setSatsNote(m.replace(/slides?/g, (w) => (w === "slide" ? "page" : "pages"))), PAPER_FIT);
      if (!urls.some(Boolean)) { setSatsNote("Couldn't upload the paper — check the internet and try again."); return; }
      setPaperPages(urls);
      satsSetup(files[0].name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 80) || "SATs paper", 40); pickScale("ks2");
      const missed = urls.filter((u) => !u).length;
      setSatsNote(`✓ ${urls.length - missed} page${urls.length - missed === 1 ? "" : "s"} ready${missed ? ` (${missed} didn't upload — try again for those)` : ""}. ${paperMode === "hand"
        ? "Set the marks for each page (0 = leave it out, e.g. the cover). Learners write on each page and hand it in; you mark each page as it comes in."
        : "Tap “+ Question” under a page for each answer on it, then type the answers from the mark scheme."}`);
    } catch (err) {
      setSatsNote(`Couldn't read the paper${err instanceof Error && err.message ? ` (${err.message})` : ""} — save it as a PDF and try again.`);
    } finally { setPaperBusy(false); }
  }
  const addPaperQ = (url: string) => setQs((cur) => [...cur, { q: `Question ${cur.filter((x) => x.img).length + 1}`, kind: "typed" as const, options: [], answer: "", marks: 1, img: url }].slice(0, 60));
  const [topic, setTopic] = useState(EXAM_TOPICS[0]?.id ?? "");
  const [level, setLevel] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The A.I writes questions.
  const [aiTopic, setAiTopic] = useState("");
  const [aiLevel, setAiLevel] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiKind, setAiKind] = useState<"mixed" | "choice" | "typed">("mixed");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  async function askAi() {
    setAiBusy(true); setAiNote(null);
    const { ok, j } = await api({ action: "ai", sessionId, topic: aiTopic, level: aiLevel, count: aiCount, kind: aiKind, difficulty: level });
    setAiBusy(false);
    if (!ok) { setAiNote(j.error ?? "The A.I couldn't write questions just now — try again."); return; }
    const got: ExamQ[] = j.questions ?? [];
    setQs((cur) => [...cur, ...got].slice(0, 60));
    if (title === "Class test" && aiTopic.trim()) setTitle(aiTopic.trim().slice(0, 80));
    setAiNote(`✓ The A.I wrote ${got.length} question${got.length === 1 ? "" : "s"} — check them below (you can change any) before you start.`);
  }

  if (!open) {
    if (!running) return null;
    return (
      <button type="button" onClick={onOpen} className="fixed bottom-4 left-4 z-[95] flex items-center gap-2 rounded-full bg-[#C2451C] px-4 py-3 text-sm font-black text-white shadow-2xl">
        <BoardIcon name="exam" /> Exam · {clockLeft(exam!.endsAt - now)} left
      </button>
    );
  }
  const entries: Entry[] = data?.entries ?? [];
  const setQ = (i: number, q: Partial<ExamQ>) => setQs((cur) => cur.map((x, k) => (k === i ? { ...x, ...q } : x)));
  async function start() {
    if (isHandMarked(qs) && qs.some((q) => q.kind !== "page")) { setNote("A paper you mark by hand can only have its pages — clear the other questions, or switch the paper to answer boxes."); return; }
    const empty = qs.findIndex((q) => q.kind !== "choice" && q.kind !== "page" && !String(q.answer).trim());
    if (empty >= 0) { setNote(`Question ${empty + 1} has no answer yet — type the answer (from the mark scheme), or remove it.`); return; }
    setBusy(true); setNote(null);
    const { ok, j } = await api({ action: "create", sessionId, title, minutes, review, calculator: calcOk, inOrder: fixedOrder, questions: qs });
    setBusy(false);
    if (!ok) { setNote(j.error ?? "Couldn't start the exam."); return; }
    setBuilding(false); tell(j.id); await reload();
    if (j.note) setNote(j.note);
  }
  async function act(action: "close" | "extend", extra: object = {}) {
    if (!exam) return;
    if (action === "close" && !window.confirm("End the exam now? Every paper is handed in and marked.")) return;
    const { ok, j } = await api({ action, examId: exam.id, ...extra });
    if (!ok) setNote(j.error ?? "That didn't work — try again.");
    tell(exam.id); await reload();
  }
  // PDF reports: one learner's, or the whole class (summary + a page each). Made on this device.
  async function reports(only?: Entry) {
    if (!exam?.questions) return;
    setPdfBusy(only?.id ?? "all"); setNote(null);
    try {
      const [{ examReports }, { learnerPdf, classPdf, savePdf }] = await Promise.all([import("@/lib/examReport"), import("@/lib/examPdf")]);
      const cr = examReports(exam.questions, entries.map((e) => ({ id: e.id, name: e.name, answers: e.answers ?? {}, flags: e.flags, flagLog: e.flagLog, startedAt: e.startedAt ?? null, submittedAt: e.submittedAt ?? null, pageMarks: e.pageMarks })), scheme);
      const meta = { className: exam.className || "Class", examTitle: exam.title, teacher: exam.teacher, date: new Date(exam.createdAt ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) };
      if (only) {
        const r = cr.learners.find((l) => l.id === only.id);
        if (!r) throw new Error("no report");
        savePdf(await learnerPdf(meta, r), `${only.name} - ${exam.title} report.pdf`);
      } else savePdf(await classPdf(meta, cr), `${exam.title} - class reports.pdf`);
    } catch (err) {
      console.warn("exam report failed", err);
      setNote("Couldn't make the report — try again.");
    } finally { setPdfBusy(null); }
  }
  function csv() {
    if (!exam) return;
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const pct = (e: Entry) => Math.round(((e.score ?? e.live ?? 0) / Math.max(1, exam.total)) * 100);
    const rows = [["Learner", "Score", "Out of", "Percent", `Grade (${scheme.name})`, "Answered", "Left the page", "Handed in"], ...entries.map((e) => [e.name, e.score ?? e.live ?? 0, exam.total, pct(e), gradeOf(pct(e), scheme), e.answered, e.flags, e.submitted ? "yes" : "no"])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `${exam.title.replace(/[^\w ]+/g, "")}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const chip = (on: boolean) => `min-h-[38px] rounded-xl px-3 text-xs font-black ring-1 ${on ? "bg-[#C2451C] text-white ring-[#C2451C]" : "bg-white text-ink/70 ring-slate-200"}`;
  const field = "w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C2451C]";
  const showBuilder = building || !exam;
  const marked = entries.filter((e) => e.submitted);
  const avg = marked.length && exam ? Math.round((marked.reduce((s, e) => s + (e.score ?? 0), 0) / marked.length / Math.max(1, exam.total)) * 100) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Exam mode" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#C2451C]"><BoardIcon name="exam" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black">Exam mode</p>
            <p className="truncate text-xs font-bold text-ink/55">{showBuilder ? "A timed test on every learner’s phone — marked for you" : `${exam!.title} · ${exam!.count} questions · ${exam!.total} marks`}</p>
          </div>
          {running && !showBuilder && <span role="timer" className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-[#C2451C]">⏱ {clockLeft(exam!.endsAt - now)}</span>}
          {running && !showBuilder && <button type="button" onClick={() => act("extend", { minutes: 5 })} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">+5 min</button>}
          {running && !showBuilder && <button type="button" onClick={() => act("close")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End exam</button>}
          {!running && exam && !showBuilder && <button type="button" onClick={() => { setBuilding(true); setQs([]); }} className="rounded-xl bg-[#C2451C] px-3 py-2 text-xs font-black text-white">New exam</button>}
          <button type="button" onClick={onClose} aria-label="Close exam mode" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        {note && <p role="alert" className="mx-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{note}</p>}
        {data?.setup && <p role="alert" className="mx-3 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{data.setup}</p>}

        {showBuilder ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-xs font-black text-ink/60">Title<input value={title} maxLength={120} onChange={(e) => { ownTitle.current = true; setTitle(e.target.value); }} className={`${field} mt-1`} /></label>
              <label className="flex items-end gap-2 text-xs font-black text-ink/70"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mb-3 h-4 w-4 accent-[#C2451C]" /><span className="mb-2.5">Learners see the right answers when it ends</span></label>
              <label className="flex items-end gap-2 text-xs font-black text-ink/70"><input type="checkbox" checked={calcOk} onChange={(e) => setCalcOk(e.target.checked)} className="mb-3 h-4 w-4 accent-[#C2451C]" /><span className="mb-2.5">🧮 Calculator allowed</span></label>
              <label className="flex items-end gap-2 text-xs font-black text-ink/70" title={keepsOrder(qs) ? "Spelling tests and real papers always keep their order" : undefined}>
                <input type="checkbox" checked={fixedOrder} disabled={keepsOrder(qs)} onChange={(e) => setInOrder(e.target.checked)} className="mb-3 h-4 w-4 accent-[#C2451C]" /><span className="mb-2.5">Same order for everyone (like the real paper)</span>
              </label>
            </div>
            <fieldset className="mt-3"><legend className="text-xs font-black text-ink/60">Time</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">{EXAM_MINUTES.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={chip(minutes === m)}>{m} min</button>)}</div>
            </fieldset>
            <section aria-label="KS2 SATs" className="mt-4 rounded-xl bg-[#EEF7F6] p-3 ring-1 ring-[#CDE7E5]">
              <p className="text-xs font-black text-[#0A4F52]">📘 KS2 SATs practice</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={useArithmetic} className="min-h-[40px] rounded-xl bg-[#0E6E72] px-3 text-xs font-black text-white">➗ Arithmetic paper (36 questions · 30 min)</button>
                <button type="button" onClick={() => setSpellOpen((v) => !v)} aria-expanded={spellOpen} className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 ${spellOpen ? "bg-[#0A4F52] text-white ring-[#0A4F52]" : "bg-white text-[#0A4F52] ring-[#A9D6D3]"}`}>✏️ Spelling test (read aloud)</button>
                <button type="button" onClick={() => paperInput.current?.click()} disabled={paperBusy} className="min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-[#0A4F52] ring-1 ring-[#A9D6D3] disabled:opacity-60">{paperBusy ? "Uploading the paper…" : "📄 A real paper (PDF) — e.g. reasoning"}</button>
                <input ref={paperInput} type="file" accept=".pdf,application/pdf,image/*" multiple hidden aria-label="Upload a SATs paper" onChange={(e) => uploadPaper(e.target.files)} />
              </div>
              {spellOpen && (
                <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-[#CDE7E5]">
                  <p className="text-xs font-bold text-ink/65">One sentence per line, with the word in <b>*stars*</b> — e.g. <i>I did a *rough* sketch before starting my painting.</i> Or start from a ready-made list:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SPELLING_LISTS.map((l) => (
                      <button key={l.id} type="button" onClick={() => setSpellText(l.lines.join("\n"))} className="min-h-[36px] rounded-lg bg-[#EEF7F6] px-3 text-xs font-black text-[#0A4F52] ring-1 ring-[#CDE7E5]">{l.title} ({l.lines.length})</button>
                    ))}
                  </div>
                  <textarea value={spellText} onChange={(e) => setSpellText(e.target.value)} rows={6} aria-label="Spelling sentences" placeholder={"I did a *rough* sketch before starting my painting.\nThe complicated map caused a lot of *confusion*."}
                    className={`${field} mt-2 resize-y font-mono text-xs`} />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-black text-ink/70"><input type="checkbox" checked={spellHear} onChange={(e) => setSpellHear(e.target.checked)} className="h-4 w-4 accent-[#0E6E72]" />Learners can also hear each sentence on their phone (headphones)</label>
                    <button type="button" onClick={addSpellings} disabled={!spellText.trim()} className="min-h-[40px] rounded-xl bg-[#0E6E72] px-4 text-xs font-black text-white disabled:opacity-40">Add {parseSpellings(spellText).length || ""} spellings</button>
                  </div>
                </div>
              )}
              {satsNote && <p role="status" className={`mt-2 text-xs font-bold ${satsNote.startsWith("✓") ? "text-[#0A4F52]" : "text-ink/70"}`}>{satsNote}</p>}
              {paperPages.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="How is this paper marked?">
                  <span className="text-xs font-black text-ink/60">Marking:</span>
                  <button type="button" onClick={() => setPaperMode("hand")} aria-pressed={paperMode === "hand"} className={`min-h-[36px] rounded-lg px-3 text-xs font-black ring-1 ${paperMode === "hand" ? "bg-[#0A4F52] text-white ring-[#0A4F52]" : "bg-white text-[#0A4F52] ring-[#A9D6D3]"}`}>✍️ I mark each page myself</button>
                  <button type="button" onClick={() => setPaperMode("auto")} aria-pressed={paperMode === "auto"} className={`min-h-[36px] rounded-lg px-3 text-xs font-black ring-1 ${paperMode === "auto" ? "bg-[#0A4F52] text-white ring-[#0A4F52]" : "bg-white text-[#0A4F52] ring-[#A9D6D3]"}`}>⚡ Answer boxes, marked automatically</button>
                  {paperMode === "hand" && isHandMarked(qs) && <span className="text-xs font-bold text-ink/60">{qs.filter((x) => x.kind === "page").length} pages · {qs.filter((x) => x.kind === "page").reduce((a, x) => a + x.marks, 0)} marks</span>}
                </div>
              )}
              {paperPages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="The paper's pages">
                  {paperPages.map((u, i) => (
                    <div key={i} className="rounded-lg bg-white p-1 ring-1 ring-[#CDE7E5]">
                      {u ? <img src={u} alt={`Page ${i + 1}`} loading="lazy" className="h-28 w-full rounded object-contain" /> : <p className="flex h-28 items-center justify-center text-center text-[11px] font-bold text-red-700">Didn&apos;t upload</p>}
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black text-ink/55">p{i + 1}{u && paperMode === "auto" && qs.some((x) => x.img === u) ? ` · ${qs.filter((x) => x.img === u).length} Q` : ""}</span>
                        {u && paperMode === "auto" && <button type="button" onClick={() => addPaperQ(u)} aria-label={`Add a question on page ${i + 1}`} className="rounded-md bg-[#0E6E72] px-1.5 py-1 text-[11px] font-black text-white">+ Question</button>}
                      </div>
                      {u && paperMode === "hand" && (() => { const m = pageQ(u)?.marks ?? 0; return (
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <button type="button" onClick={() => setPageMarks(u, m - 1)} disabled={m === 0} aria-label={`Fewer marks for page ${i + 1}`} className="h-8 w-8 rounded-md bg-white text-sm font-black text-[#0A4F52] ring-1 ring-[#A9D6D3] disabled:opacity-30">−</button>
                          <span className={`text-center text-[11px] font-black ${m ? "text-[#0A4F52]" : "text-ink/40"}`} aria-live="polite">{m ? `${m} mark${m === 1 ? "" : "s"}` : "Not in test"}</span>
                          <button type="button" onClick={() => setPageMarks(u, m + 1)} disabled={m >= MAX_PAGE_MARKS} aria-label={`More marks for page ${i + 1}`} className="h-8 w-8 rounded-md bg-[#0E6E72] text-sm font-black text-white disabled:opacity-30">+</button>
                        </div>
                      ); })()}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[11px] font-semibold text-ink/55">Results can be graded as an estimated SATs scaled score (100 = expected standard) — pick “KS2 SATs” under Grading.</p>
            </section>
            <div className="mt-4 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-200">
              <p className="text-xs font-black text-violet-800">✨ Ask the A.I to write the questions — any subject</p>
              <label className="mt-2 block text-xs font-bold text-ink/60">What should they be on?
                <textarea value={aiTopic} maxLength={300} rows={2} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. Simultaneous equations by elimination · Photosynthesis · Concord in English"
                  className={`${field} mt-1 resize-y`} />
              </label>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs font-bold text-ink/60">Class
                  <input value={aiLevel} maxLength={60} onChange={(e) => setAiLevel(e.target.value)} placeholder="e.g. SS2, JSS1, Year 9" className={`${field} mt-1 w-36`} />
                </label>
                <label className="text-xs font-bold text-ink/60">Questions
                  <select value={aiKind} onChange={(e) => setAiKind(e.target.value as typeof aiKind)} className={`${field} mt-1`}>
                    <option value="mixed">Multiple choice and typed</option><option value="choice">Multiple choice only</option><option value="typed">Typed answers only</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-ink/60">Level
                  <select value={level} onChange={(e) => setLevel(e.target.value as Difficulty)} className={`${field} mt-1`} aria-label="A.I level">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-ink/60">How many
                  <input type="number" min={1} max={30} value={aiCount} onChange={(e) => setAiCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className={`${field} mt-1 w-20`} aria-label="How many A.I questions" />
                </label>
                <button type="button" onClick={askAi} disabled={aiBusy || aiTopic.trim().length < 3} className="min-h-[40px] rounded-xl bg-violet-700 px-4 text-xs font-black text-white disabled:opacity-40">{aiBusy ? "The A.I is writing…" : `✨ Write ${aiCount} questions`}</button>
              </div>
              {aiNote && <p role="status" className={`mt-2 text-xs font-bold ${aiNote.startsWith("✓") ? "text-violet-800" : "text-red-700"}`}>{aiNote}</p>}
            </div>
            <div className="mt-3 rounded-xl bg-orange-50/60 p-3 ring-1 ring-orange-100">
              <p className="text-xs font-black text-[#C2451C]">Or make questions from a maths topic (instant, no A.I)</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs font-bold text-ink/60">Topic
                  <select value={topic} onChange={(e) => setTopic(e.target.value)} className={`${field} mt-1 min-w-[12rem]`}>
                    {EXAM_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-ink/60">Level
                  <select value={level} onChange={(e) => setLevel(e.target.value as Difficulty)} className={`${field} mt-1`}>
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-ink/60">How many
                  <input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className={`${field} mt-1 w-20`} />
                </label>
                <button type="button" onClick={() => setQs((cur) => [...cur, ...topicQuestions(topic, level, count)].slice(0, 60))} className="min-h-[40px] rounded-xl bg-[#C2451C] px-4 text-xs font-black text-white">Add {count} questions</button>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[#E2F3F2] p-3">
              <p className="text-xs font-black text-[#0A4F52]">Or use a ready-made quiz as the paper</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {UK_SETS.filter((x) => x.stage === "sss").map((x) => (
                  <button key={x.id} type="button" onClick={() => setQs((cur) => [...cur, ...x.questions.map((r) => ({ q: r.q, kind: "choice" as const, options: r.options, answer: r.options.indexOf(r.answer), marks: 1 }))].slice(0, 60))}
                    className="min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-[#0A4F52] ring-1 ring-[#A9D6D3]">{x.emoji} {x.title} ({x.questions.length})</button>
                ))}
              </div>
            </div>
            <ol className="mt-4 grid gap-2">
              {qs.map((q, i) => (
                <li key={i} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-black text-ink/45">{i + 1}.</span>
                    {q.img && <a href={q.img} target="_blank" rel="noreferrer" title="Open the page" className="shrink-0"><img src={q.img} alt={`The page for question ${i + 1}`} loading="lazy" className="h-14 w-10 rounded object-cover ring-1 ring-slate-200" /></a>}
                    <input value={q.q} maxLength={400} onChange={(e) => setQ(i, { q: e.target.value })} aria-label={`Question ${i + 1}`} className={field} />
                    <select value={q.marks} onChange={(e) => setQ(i, { marks: Number(e.target.value) })} aria-label={`Marks for question ${i + 1}`} className="rounded-lg bg-slate-50 px-1 py-2 text-xs font-black ring-1 ring-slate-200">
                      {Array.from({ length: q.kind === "page" ? MAX_PAGE_MARKS : 5 }, (_, k) => k + 1).map((m) => <option key={m} value={m}>{m} mark{m === 1 ? "" : "s"}</option>)}
                    </select>
                    <button type="button" onClick={() => setQs((cur) => cur.filter((_, k) => k !== i))} aria-label={`Remove question ${i + 1}`} className="rounded-lg px-2 py-2 text-xs font-black text-red-600 hover:bg-red-50">✕</button>
                  </div>
                  {q.kind === "choice" ? (
                    <div className="mt-2 grid gap-1 pl-5 sm:grid-cols-2">
                      {q.options.map((o, k) => (
                        <label key={k} className={`flex items-center gap-2 rounded-lg px-2 py-1 ring-1 ${q.answer === k ? "bg-emerald-50 ring-emerald-300" : "ring-slate-200"}`}>
                          <input type="radio" name={`ans-${i}`} checked={q.answer === k} onChange={() => setQ(i, { answer: k })} aria-label={`Option ${k + 1} is the answer`} className="accent-emerald-600" />
                          <input value={o} maxLength={160} onChange={(e) => setQ(i, { options: q.options.map((x, z) => (z === k ? e.target.value : x)) })} aria-label={`Question ${i + 1}, option ${k + 1}`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
                        </label>
                      ))}
                    </div>
                  ) : q.kind === "page" ? (
                    <p className="mt-2 pl-5 text-xs font-bold text-ink/60">✍️ Learners write on this page and hand it in — you mark it.</p>
                  ) : q.kind === "spell" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-5 text-xs font-bold text-ink/60">
                      <label className="flex items-center gap-2">Word
                        <input value={String(q.answer)} maxLength={40} onChange={(e) => setQ(i, { answer: e.target.value })} aria-label={`Spelling word ${i + 1}`} className={`${field} max-w-[12rem]`} />
                      </label>
                      <button type="button" onClick={() => speak(spokenSpelling(q, i + 1))} className="rounded-lg bg-[#EEF7F6] px-2 py-1.5 text-xs font-black text-[#0A4F52] ring-1 ring-[#CDE7E5]">🔊 Hear it</button>
                    </div>
                  ) : (
                    <label className="mt-2 flex items-center gap-2 pl-5 text-xs font-bold text-ink/60">Answer
                      <input value={String(q.answer)} maxLength={120} onChange={(e) => setQ(i, { answer: e.target.value })} aria-label={`Answer to question ${i + 1}`} placeholder={q.img ? "From the mark scheme, e.g. 5  (or 0.5 | 1/2)" : "e.g. 12  (or 12 | twelve)"} className={`${field} max-w-xs`} />
                    </label>
                  )}
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQs((cur) => [...cur, { q: "", kind: "choice", options: ["", "", "", ""], answer: 0, marks: 1 }])} className="min-h-[40px] rounded-xl bg-slate-100 px-3 text-xs font-black">+ Multiple-choice question</button>
              <button type="button" onClick={() => setQs((cur) => [...cur, { q: "", kind: "typed", options: [], answer: "", marks: 1 }])} className="min-h-[40px] rounded-xl bg-slate-100 px-3 text-xs font-black">+ Typed-answer question</button>
              {qs.length > 1 && <button type="button" onClick={() => { if (window.confirm(`Remove all ${qs.length} questions?`)) setQs([]); }} className="min-h-[40px] rounded-xl px-3 text-xs font-black text-red-700 hover:bg-red-50">Clear all questions</button>}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <button type="button" onClick={start} disabled={busy || !qs.length} className="min-h-[44px] rounded-xl bg-[#C2451C] px-5 text-sm font-black text-white disabled:opacity-40">{busy ? "Starting…" : `Start the exam (${qs.length} question${qs.length === 1 ? "" : "s"}, ${minutes} min)`}</button>
              {exam && <button type="button" onClick={() => setBuilding(false)} className="text-xs font-black text-ink/60 underline">Back to the last exam’s results</button>}
              <p className="text-xs font-semibold text-ink/55">{isHandMarked(qs) ? "Learners write on each page and hand it in (they can't go back to it); you mark each page as it comes in." : fixedOrder ? "Everyone gets the questions in the same order." : "Each phone gets the questions in its own order."} Leaving the exam page is reported to you.</p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {running && exam?.questions?.some((q) => q.kind === "spell") && <ReadAloud qs={exam.questions} onRead={(n) => tell(exam.id, n)} />}
            {exam?.questions && isHandMarked(exam.questions) && <MarkingDesk examId={exam.id} questions={exam.questions} entries={entries} api={api} reload={reload} running={running} />}
            <div className="mb-3 grid gap-2 sm:grid-cols-4">
              {[["Taking it", entries.length], ["Handed in", marked.length], ["Left the page", entries.filter((e) => e.flags > 0).length], ["Average", avg == null ? "—" : `${avg}%`]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wider text-ink/50">{l}</p><p className="text-2xl font-black">{v}</p></div>
              ))}
            </div>
            {!entries.length && <p className="p-6 text-center text-sm font-bold text-ink/50">{running ? "Waiting for learners to start…" : "Nobody took this exam."}</p>}
            {entries.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead><tr className="text-[11px] uppercase tracking-wider text-ink/50"><th className="p-2">Learner</th><th className="p-2">Answered</th><th className="p-2">Left the page</th><th className="p-2">Status</th><th className="p-2 text-right">Score</th><th className="p-2 text-right" title={scheme.name}>Grade</th><th className="p-2 text-right"><span className="sr-only">Report</span></th></tr></thead>
                <tbody>
                  {[...entries].sort((a, b) => (b.score ?? b.live ?? 0) - (a.score ?? a.live ?? 0)).map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="p-2 font-black">{e.name}</td>
                      <td className="p-2">{e.answered} / {exam!.count}</td>
                      <td className="p-2">{e.flags ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-700" title={e.flagLog.map((f) => `${new Date(f.at).toLocaleTimeString()} — ${f.reason}`).join("\n")}>⚠ {e.flags}×</span> : <span className="text-xs font-bold text-emerald-700">No</span>}</td>
                      <td className="p-2 text-xs font-black">{e.submitted ? <span className="text-emerald-700">Handed in</span> : <span className="text-ink/55">Writing…</span>}</td>
                      <td className="p-2 text-right font-black">{e.submitted ? `${e.score} / ${e.total}` : e.toMark ? `${e.live ?? 0} / ${e.total} so far` : running ? "—" : ""}{e.toMark?.length ? <span className="block text-[11px] font-bold text-amber-700">{e.toMark.length} page{e.toMark.length === 1 ? "" : "s"} to mark</span> : null}</td>
                      <td className="p-2 text-right">{e.submitted && e.total ? (() => { const p = Math.round(((e.score ?? 0) / e.total) * 100); return <span className={`rounded-md px-2 py-0.5 text-xs font-black ${p >= scheme.pass ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{gradeOf(p, scheme)}</span>; })() : ""}</td>
                      <td className="p-2 text-right">
                        <button type="button" onClick={() => reports(e)} disabled={!!pdfBusy} aria-label={`Download ${e.name}'s report (PDF)`}
                          className="whitespace-nowrap rounded-lg bg-[#E2F3F2] px-2.5 py-1.5 text-[11px] font-black text-[#0A4F52] disabled:opacity-50">{pdfBusy === e.id ? "Making…" : "📄 Report"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {entries.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => reports()} disabled={!!pdfBusy} className="rounded-xl bg-[#0E6E72] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{pdfBusy === "all" ? "Making the reports…" : "📄 Download all reports (PDF)"}</button>
                <button type="button" onClick={csv} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Download results (spreadsheet)</button>
                <label className="flex items-center gap-1.5 text-xs font-black text-ink/70">Grading
                  <select value={scale} onChange={(e) => pickScale(e.target.value as GradeScheme["id"])} className="rounded-lg bg-white px-2 py-1.5 text-xs font-black ring-1 ring-slate-200">
                    {SCHEMES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </label>
                {running && <span className="text-xs font-semibold text-ink/55">Reports made now show the papers so far — download again when the exam ends.</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// The teacher reads a spelling test out, as in the national test: the word,
// the sentence, the word. Reading one sends every phone to that word.
function ReadAloud({ qs, onRead }: { qs: ExamQ[]; onRead: (n: number) => void }) {
  const words = qs.map((q, n) => ({ q, n })).filter((x) => x.q.kind === "spell");
  const [k, setK] = useState(0);
  const [read, setRead] = useState<Set<number>>(new Set());
  useEffect(() => () => stopSpeaking(), []);
  if (!words.length) return null;
  const cur = words[Math.min(k, words.length - 1)];
  const go = (to: number) => {
    const w = words[to]; if (!w) return;
    setK(to); setRead((r) => new Set(r).add(to));
    speak(spokenSpelling(w.q, w.n + 1)); onRead(w.n);
  };
  return (
    <section aria-label="Read the spellings" className="mb-3 rounded-2xl bg-[#EEF7F6] p-3 ring-1 ring-[#CDE7E5]">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs font-black uppercase tracking-wider text-[#0A4F52]">📢 Read the spellings · {k + 1} of {words.length}</p>
        <p className="text-[11px] font-bold text-ink/55">Phones go to the word you read.</p>
      </div>
      <p className="mt-2 font-display text-3xl font-black text-[#0A4F52]">{String(cur.q.answer)}</p>
      <p className="mt-1 text-sm font-semibold text-ink/75">{cur.q.q}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => go(k - 1)} disabled={k === 0} className="min-h-[44px] rounded-xl bg-white px-4 text-sm font-black text-[#0A4F52] ring-1 ring-[#CDE7E5] disabled:opacity-40">◀ Back</button>
        <button type="button" onClick={() => go(k)} className="min-h-[44px] flex-1 rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white">🔊 {read.has(k) ? "Read it again" : `Read spelling ${k + 1}`}</button>
        <button type="button" onClick={() => go(k + 1)} disabled={k >= words.length - 1} className="min-h-[44px] rounded-xl bg-white px-4 text-sm font-black text-[#0A4F52] ring-1 ring-[#CDE7E5] disabled:opacity-40">Next ▶</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Jump to a spelling">
        {words.map((w, i) => (
          <button key={w.n} type="button" onClick={() => go(i)} aria-label={`Read spelling ${i + 1}`} aria-current={i === k}
            className={`h-8 min-w-[32px] rounded-lg text-xs font-black ${i === k ? "bg-[#0E6E72] text-white" : read.has(i) ? "bg-[#CDE7E5] text-[#0A4F52]" : "bg-white text-ink/60 ring-1 ring-[#CDE7E5]"}`}>{i + 1}</button>
        ))}
      </div>
    </section>
  );
}

// A page of a real paper with the question: tap to see it bigger.
function PaperPage({ src, label }: { src: string; label: string }) {
  const [big, setBig] = useState(false);
  const [zoom, setZoom] = useState(2);
  return (
    <>
      <div className="relative mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-orange-200">
        {/* The page scrolls in its own box, so the answer stays in view. */}
        <div className="max-h-[52dvh] overflow-y-auto">
          <img src={src} alt={label} className="w-full" draggable={false} onClick={() => setBig(true)} />
        </div>
        <button type="button" onClick={() => setBig(true)} aria-label={`${label} — tap to see it bigger`}
          className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-3 py-2 text-xs font-black text-white">🔍 Bigger</button>
      </div>
      {big && (
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[140] flex flex-col bg-black/90">
          <div className="flex items-center gap-2 p-2">
            {[1, 2, 3].map((z) => <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} className={`h-10 rounded-lg px-3 text-sm font-black ${zoom === z ? "bg-white text-ink" : "bg-white/15 text-white"}`}>{z}×</button>)}
            <button type="button" onClick={() => setBig(false)} className="ml-auto h-10 rounded-lg bg-white px-4 text-sm font-black text-ink">Close</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <img src={src} alt={label} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} draggable={false} />
          </div>
        </div>
      )}
    </>
  );
}

// ── Learner ──
function Learner({ data, reload, sessionId, follow }: { data: any; reload: () => Promise<void>; sessionId: string; follow: { n: number; k: number } | null }) {
  const now = useServerClock()();
  const [, tick] = useState(0);
  const exam: Meta | null = data?.exam ?? null;
  const entry = data?.entry ?? null;
  const paper: LearnerQ[] | null = data?.paper ?? null;
  const review: Review[] | null = data?.review ?? null;
  const analysis: Analysis | null = data?.analysis ?? null;
  // An ended exam whose results the learner has looked at and closed: nothing more to show.
  const [seen, setSeen] = useState<string | null>(() => { try { return sessionStorage.getItem("exam-seen"); } catch { return null; } });
  const markSeen = (id: string) => { setSeen(id); try { sessionStorage.setItem("exam-seen", id); } catch { /* storage blocked */ } };
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [at, setAt] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [warned, setWarned] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const seeded = useRef<string | null>(null);
  const taking = !!exam && exam.status === "open" && !!entry && !entry.submitted && !!paper;
  // The teacher is reading a spelling out: go to it.
  const followed = useRef(0);
  useEffect(() => {
    if (!follow || !paper || followed.current === follow.k) return;
    const i = paper.findIndex((q) => q.n === follow.n);
    if (i >= 0) { followed.current = follow.k; setAt(i); }
  }, [follow, paper]);

  useEffect(() => { if (!exam?.endsAt) return; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [exam?.endsAt]);
  // Their saved answers (after a refresh, or on another visit).
  // The exam has just ended: open the results at once (unless already seen).
  const status = exam?.status, examId = exam?.id;
  useEffect(() => { if (status === "closed" && examId && seen !== examId) setHidden(false); }, [status, examId, seen]);
  useEffect(() => { if (exam && entry && seeded.current !== exam.id) { seeded.current = exam.id; setAnswers(entry.answers ?? {}); setAt(0); setResult(null); setHidden(false); } }, [exam, entry]);
  // Leaving the exam page (another app, another tab) is reported.
  const lastFlag = useRef(0);
  useEffect(() => {
    if (!taking || !exam) return;
    const flag = (reason: string) => {
      const n = Date.now(); if (n - lastFlag.current < 4000) return; lastFlag.current = n;
      setWarned((w) => w + 1);
      api({ action: "flag", examId: exam.id, reason });
    };
    const vis = () => { if (document.visibilityState === "hidden") flag("left the exam page"); };
    const blur = () => flag("switched away from the exam");
    document.addEventListener("visibilitychange", vis); window.addEventListener("blur", blur);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", blur); };
  }, [taking, exam]);
  // Time's up: hand it in.
  const left = exam ? exam.endsAt - now : 0;
  const submitted = useRef(false);
  useEffect(() => { if (taking && left <= 0 && !submitted.current) { submitted.current = true; submit(true); } });

  const pending = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function answer(n: number, value: unknown, typed = false) {
    setAnswers((a) => ({ ...a, [String(n)]: value }));
    clearTimeout(pending.current[n]);
    const go = () => api({ action: "answer", examId: exam!.id, n, value }).then(({ ok, j }) => setNote(ok ? null : j.error ?? "An answer didn't save — check the internet."));
    if (typed) pending.current[n] = setTimeout(go, 600); else go();
  }
  async function submit(auto = false) {
    if (!exam) return;
    if (!auto) {
      const blank = (paper ?? []).filter((q) => answers[String(q.n)] == null || answers[String(q.n)] === "").length;
      if (!window.confirm(blank ? `You haven't answered ${blank} question${blank === 1 ? "" : "s"}. Hand in anyway?` : "Hand in your exam?")) return;
    }
    // Typed answers still waiting to save go first.
    await Promise.all(Object.entries(pending.current).map(([n, t]) => { clearTimeout(t); return api({ action: "answer", examId: exam.id, n: Number(n), value: answers[n] }); }));
    pending.current = {};
    const { ok, j } = await api({ action: "submit", examId: exam.id });
    if (ok) setResult({ score: j.score, total: j.total });
    await reload();
  }

  if (!exam) return null;
  const shell = (children: React.ReactNode) => (
    <div role="dialog" aria-modal="true" aria-label={`Exam: ${exam.title}`} className="fixed inset-0 z-[120] overflow-y-auto bg-[#FFF7ED] text-ink" onCopy={(e) => e.preventDefault()}>
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-3 p-3 sm:p-6"><div className="flex justify-end"><ReadingButton /></div>{children}</div>
    </div>
  );

  // Not started yet.
  if (exam.status === "open" && !entry) {
    return shell(
      <div className="my-auto rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#C2451C]">Exam</p>
        <h2 className="mt-1 font-display text-3xl font-black">{exam.title}</h2>
        <p className="mt-2 text-sm font-bold text-ink/65">{exam.count} questions · {exam.total} marks · {clockLeft(left)} left</p>
        <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-sm font-semibold text-ink/75">
          <li>✍️ Your answers save as you go.</li>
          {exam.inOrder ? <li>📋 The questions are in order, like the real paper.</li> : <li>🔒 Everyone has the questions in a different order.</li>}
          {exam.handMarked && <li>✍️ Write on each page, then hand it in. You can&apos;t go back to a page after that.</li>}
          <li>⚠️ Leaving this page is reported to your teacher.</li>
          <li>⏱ When time is up, your exam is handed in for you.</li>
        </ul>
        <button type="button" onClick={async () => { const { ok, j } = await api({ action: "start", examId: exam.id }); if (!ok) setNote(j.error); await reload(); }}
          className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#C2451C] text-lg font-black text-white">Start the exam</button>
        {note && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{note}</p>}
      </div>,
    );
  }
  if (taking && paper) {
    const q = paper[Math.min(at, paper.length - 1)];
    const hand = paper.some((x) => x.kind === "page"); // a paper the teacher marks, page by page
    const done = paper.filter((x) => (x.kind === "page" ? pageDone(answers[String(x.n)]) : answers[String(x.n)] != null && answers[String(x.n)] !== "")).length;
    return shell(<>
      <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 bg-[#FFF7ED]/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="min-w-0 flex-1 truncate text-sm font-black">{exam.title}</p>
        <span className="text-xs font-bold text-ink/60">{done}/{paper.length} {hand ? "handed in" : "answered"}</span>
        {exam.calculator !== false ? <CalculatorButton /> : <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-black text-ink/55 ring-1 ring-orange-200" title="Your teacher switched the calculator off for this exam">🚫🧮 No calculator</span>}
        <span role="timer" className={`rounded-xl px-3 py-1.5 text-sm font-black ${left < 60_000 ? "bg-red-600 text-white" : "bg-white text-[#C2451C] ring-1 ring-orange-200"}`}>⏱ {clockLeft(left)}</span>
      </div>
      {warned > 0 && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-black text-red-700 ring-1 ring-red-200">⚠️ You left the exam page{warned > 1 ? ` ${warned} times` : ""}. Your teacher has been told.</p>}
      {hand ? (
        <div className="rounded-2xl bg-white p-3 shadow ring-1 ring-orange-200">
          <PageFlow examId={exam.id} myId={entry?.id ?? "learner"} paper={paper} answers={answers} setAnswers={setAnswers} api={api} onFinished={() => { submitted.current = true; submit(true); }} />
        </div>
      ) : (<>
      <div className="select-none rounded-2xl bg-white p-4 shadow ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-wider text-[#C2451C]">Question {at + 1} of {paper.length} · {q.marks} mark{q.marks === 1 ? "" : "s"}</p>
        {q.img && <PaperPage key={q.img} src={q.img} label={`The page for ${q.q}`} />}
        <div className="mt-2 flex items-start gap-2">
          <p className="flex-1 whitespace-pre-wrap text-xl font-black leading-snug">{q.q}</p>
          {q.kind !== "spell" && <Speak text={`${q.q}. ${q.kind === "choice" ? q.options.map((o, k) => `Option ${String.fromCharCode(65 + k)}: ${o.text}.`).join(" ") : ""}`} />}
        </div>
        {q.kind === "spell" && (q.say
          ? <button type="button" onClick={() => speak(q.say!)} className="mt-3 min-h-[48px] w-full rounded-xl bg-[#EEF7F6] text-base font-black text-[#0A4F52] ring-1 ring-[#CDE7E5]">🔊 Hear the sentence</button>
          : <p className="mt-2 text-sm font-semibold text-ink/60">🎧 Listen to your teacher read the sentence, then write the missing word.</p>)}
        {q.kind === "choice" ? (
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Your answer">
            {q.options.map((o, k) => {
              const on = answers[String(q.n)] === o.i;
              return (
                <button key={o.i} type="button" role="radio" aria-checked={on} onClick={() => answer(q.n, o.i)}
                  className={`flex min-h-[52px] items-center gap-3 rounded-xl px-4 text-left text-base font-bold ring-2 ${on ? "bg-[#C2451C] text-white ring-[#C2451C]" : "bg-white ring-orange-100 hover:ring-orange-300"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${on ? "bg-white text-[#C2451C]" : "bg-orange-50 text-[#C2451C]"}`}>{String.fromCharCode(65 + k)}</span>{o.text}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="mt-4 block text-sm font-bold text-ink/60">{q.kind === "spell" ? "The missing word" : "Your answer"}
            <input value={String(answers[String(q.n)] ?? "")} maxLength={120} onChange={(e) => answer(q.n, e.target.value, true)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-xl font-black text-ink ring-2 ring-orange-200 focus:outline-none focus:ring-[#C2451C]" />
          </label>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={at === 0} onClick={() => setAt(at - 1)} className="min-h-[48px] flex-1 rounded-xl bg-orange-50 text-sm font-black text-[#C2451C] disabled:opacity-40">← Back</button>
          {at < paper.length - 1
            ? <button type="button" onClick={() => setAt(at + 1)} className="min-h-[48px] flex-1 rounded-xl bg-[#C2451C] text-sm font-black text-white">Next →</button>
            : <button type="button" onClick={() => submit()} className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 text-sm font-black text-white">Hand in</button>}
        </div>
      </div>
      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {paper.map((x, i) => {
          const a = answers[String(x.n)] != null && answers[String(x.n)] !== "";
          return <button key={x.n} type="button" onClick={() => setAt(i)} aria-label={`Question ${i + 1}${a ? ", answered" : ""}`} aria-current={i === at}
            className={`h-10 w-10 rounded-lg text-sm font-black ${i === at ? "ring-2 ring-[#C2451C]" : ""} ${a ? "bg-[#C2451C] text-white" : "bg-white text-ink/60 ring-1 ring-orange-200"}`}>{i + 1}</button>;
        })}
      </nav>
      <button type="button" onClick={() => submit()} className="min-h-[48px] rounded-xl bg-emerald-600 text-sm font-black text-white">Hand in my exam</button>
      </>)}
      {note && <p role="alert" className="text-sm font-bold text-red-700">{note}</p>}
    </>);
  }
  // Handed in (or time's up).
  if (entry?.submitted || result) {
    const over = exam.status === "closed";
    if (over && seen === exam.id) return null; // results seen and closed: no button left behind
    if (hidden && !over) {
      return <button type="button" onClick={() => setHidden(false)} className="fixed bottom-4 left-4 z-[95] rounded-full bg-[#C2451C] px-4 py-3 text-sm font-black text-white shadow-2xl">📝 My exam</button>;
    }
    // A paper marked by hand: the score grows as the teacher marks each page.
    const marking: { left: number; pages: number } | null = entry?.marking ?? null;
    const score = marking ? entry?.score : result?.score ?? entry?.score, total = (marking ? entry?.total : result?.total ?? entry?.total) ?? exam.total;
    return shell(<>
      <div className="rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Handed in ✓</p>
        <h2 className="mt-1 font-display text-2xl font-black">{exam.title}</h2>
        {score != null && <p className="mt-3 font-display text-5xl font-black text-[#C2451C]">{score} / {total}</p>}
        {score != null && <p className="mt-1 text-sm font-bold text-ink/60">{Math.round((score / Math.max(1, total)) * 100)}%{marking?.left ? " so far" : ""}</p>}
        {marking && marking.left > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">✍️ Your teacher is marking your paper — {marking.left} page{marking.left === 1 ? "" : "s"} still to mark. Your score goes up as each page is marked.</p>}
        {marking && marking.left === 0 && <p className="mt-3 text-sm font-bold text-emerald-700">✓ Your teacher has marked every page.</p>}
        {exam.status === "open" && <p className="mt-3 text-sm font-semibold text-ink/60">{exam.review ? "You can see the right answers when the exam ends." : "Wait for your teacher."}</p>}
        {over && analysis && <ExamAnalysis a={analysis} />}
        {over && analysis && analysis.score < analysis.total && <FixMistakes sessionId={sessionId} />}
        <button type="button" onClick={() => { if (over) markSeen(exam.id); else setHidden(true); }} className="mt-4 min-h-[44px] rounded-xl bg-[#C2451C] px-5 text-sm font-black text-white">{over ? "Done — back to the class" : "Back to the class"}</button>
      </div>
      {review && (
        <ol className="grid gap-2" aria-label="Your answers">
          <li className="text-xs font-black uppercase tracking-wider text-ink/55">Question by question</li>
          {review.map((r, i) => (
            <li key={i} className={`rounded-xl p-3 ring-1 ${r.right ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
              <p className="text-sm font-black">{r.right ? "✓" : "✗"} {i + 1}. {r.q}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink/70">
                {r.kind === "page" ? (r.given == null ? "Not marked yet" : `Your teacher's mark: ${r.given} / ${r.marks}`) : <>You: {r.given == null || r.given === "" ? "no answer" : r.kind === "choice" ? r.options[Number(r.given)] : String(r.given)}</>}
                {!r.right && r.kind !== "page" && <> · <span className="font-black text-emerald-800">Answer: {r.kind === "choice" ? r.options[Number(r.answer)] : String(r.answer).split("|")[0].trim()}</span></>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </>);
  }
  return null;
}

// How a learner did: their mark, against the class, and right / wrong / blank.
function ExamAnalysis({ a }: { a: Analysis }) {
  const pct = Math.round((a.score / Math.max(1, a.total)) * 100);
  const word = pct >= 80 ? "Excellent work! 🎉" : pct >= 60 ? "Good work — keep it up." : pct >= 40 ? "A fair try — go over the ones you missed." : "Keep practising — look at the answers below.";
  const cell = "rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200";
  return (
    <section aria-label="Your exam results" className="mt-4 grid gap-2 text-left">
      <p className="text-center text-sm font-black text-ink">{word}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className={`${cell} bg-emerald-50 ring-emerald-200`}><p className="text-2xl font-black text-emerald-700">{a.right}</p><p className="text-[11px] font-bold text-ink/60">right</p></div>
        <div className={`${cell} bg-red-50 ring-red-200`}><p className="text-2xl font-black text-red-600">{a.wrong}</p><p className="text-[11px] font-bold text-ink/60">wrong</p></div>
        <div className={cell}><p className="text-2xl font-black text-ink/70">{a.blank}</p><p className="text-[11px] font-bold text-ink/60">not answered</p></div>
      </div>
      {a.average != null && (
        <div className={cell}>
          <div className="flex justify-between text-xs font-bold text-ink/65"><span>You: {pct}%</span><span>Class average: {a.average}%</span>{a.best != null && <span>Top: {a.best}%</span>}</div>
          <div className="relative mt-1.5 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200" role="img" aria-label={`You scored ${pct}%; the class average was ${a.average}%`}>
            <div className="h-full rounded-full bg-[#0E6E72]" style={{ width: `${pct}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-[#C2451C]" style={{ left: `${a.average}%` }} />
          </div>
          {a.position != null && a.takers > 1 && <p className="mt-1 text-xs font-bold text-ink/60">{a.position === 1 ? "🏆 Top of the class" : `Position ${a.position} of ${a.takers}`}</p>}
        </div>
      )}
      {a.flags > 0 && <p className="text-xs font-bold text-red-700">⚠ You left the exam page {a.flags} time{a.flags === 1 ? "" : "s"} — your teacher can see this.</p>}
    </section>
  );
}

// Opens "Fix my mistakes" (practice from this class's wrong answers) with the learner's own results link.
function FixMistakes({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const tab = window.open("", "_blank");
    const r = await fetch(`/api/live-sessions/my-results?id=${encodeURIComponent(sessionId)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    const url = r?.ok && j.link ? String(j.link).replace("/report?", "/practice?") : null;
    if (url && tab) tab.location.href = url; else if (url) window.location.assign(url); else tab?.close();
  }
  return (
    <button type="button" onClick={go} disabled={busy} className="mt-4 mr-2 min-h-[44px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white disabled:opacity-60">
      {busy ? "Opening…" : "🔁 Fix my mistakes"}
    </button>
  );
}
