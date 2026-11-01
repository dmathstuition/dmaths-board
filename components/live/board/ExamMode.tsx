"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { useServerClock } from "@/lib/serverClock";
import { EXAM_MINUTES, EXAM_TOPICS, clockLeft, topicQuestions, type ExamQ, type LearnerQ } from "@/lib/exams";
import type { Difficulty } from "@/lib/games/generators";

// Exam mode: a timed test every learner takes on their own phone — questions
// in a different order on each phone, answers saved as they go, leaving the
// exam page reported to the teacher, and marked automatically.
// Message: "exam" (teacher → all, signed): { examId } when one starts or ends,
// so phones check at once (they also check every few seconds).

type Meta = { id: string; title: string; minutes: number; review: boolean; status: "open" | "closed"; endsAt: number; count: number; total: number };
type Entry = { id: string; name: string; answered: number; flags: number; flagLog: { at: string; reason: string }[]; submitted: boolean; score: number | null; total: number | null; live: number | null };
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
  const send = useLive({ exam: (p) => { if (!host && p?.host) load(); } });
  const exam: Meta | null = data?.exam ?? null;
  const running = exam?.status === "open";
  // Teachers: often while watching; learners: every few seconds while a class runs.
  useEffect(() => {
    load();
    const every = host ? (open && running ? 3000 : 12_000) : 10_000;
    const t = setInterval(load, every);
    return () => clearInterval(t);
  }, [load, host, open, running]);
  const tell = (examId: string | null) => send("exam", { host: true, examId });

  if (host) return <Teacher open={open} onOpen={onOpen} onClose={onClose} data={data} reload={load} sessionId={sessionId} tell={tell} />;
  return <Learner data={data} reload={load} />;
}

// ── Teacher ──
function Teacher({ open, onOpen, onClose, data, reload, sessionId, tell }: { open: boolean; onOpen: () => void; onClose: () => void; data: any; reload: () => Promise<void>; sessionId: string; tell: (id: string | null) => void }) {
  const now = useServerClock()();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const exam: Meta | null = data?.exam ?? null;
  const running = exam?.status === "open";
  const [building, setBuilding] = useState(false);
  const [title, setTitle] = useState("Class test");
  const [minutes, setMinutes] = useState(20);
  const [review, setReview] = useState(true);
  const [qs, setQs] = useState<ExamQ[]>([]);
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
      <button type="button" onClick={onOpen} className="fixed bottom-4 left-4 z-[95] flex items-center gap-2 rounded-full bg-[#7C2D12] px-4 py-3 text-sm font-black text-white shadow-2xl">
        <BoardIcon name="exam" /> Exam · {clockLeft(exam!.endsAt - now)} left
      </button>
    );
  }
  const entries: Entry[] = data?.entries ?? [];
  const setQ = (i: number, q: Partial<ExamQ>) => setQs((cur) => cur.map((x, k) => (k === i ? { ...x, ...q } : x)));
  async function start() {
    setBusy(true); setNote(null);
    const { ok, j } = await api({ action: "create", sessionId, title, minutes, review, questions: qs });
    setBusy(false);
    if (!ok) { setNote(j.error ?? "Couldn't start the exam."); return; }
    setBuilding(false); tell(j.id); await reload();
  }
  async function act(action: "close" | "extend", extra: object = {}) {
    if (!exam) return;
    if (action === "close" && !window.confirm("End the exam now? Every paper is handed in and marked.")) return;
    const { ok, j } = await api({ action, examId: exam.id, ...extra });
    if (!ok) setNote(j.error ?? "That didn't work — try again.");
    tell(exam.id); await reload();
  }
  function csv() {
    if (!exam) return;
    const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [["Learner", "Score", "Out of", "Percent", "Answered", "Left the page", "Handed in"], ...entries.map((e) => [e.name, e.score ?? e.live ?? 0, exam.total, Math.round(((e.score ?? e.live ?? 0) / Math.max(1, exam.total)) * 100), e.answered, e.flags, e.submitted ? "yes" : "no"])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `${exam.title.replace(/[^\w ]+/g, "")}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  const chip = (on: boolean) => `min-h-[38px] rounded-xl px-3 text-xs font-black ring-1 ${on ? "bg-[#7C2D12] text-white ring-[#7C2D12]" : "bg-white text-ink/70 ring-slate-200"}`;
  const field = "w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7C2D12]";
  const showBuilder = building || !exam;
  const marked = entries.filter((e) => e.submitted);
  const avg = marked.length && exam ? Math.round((marked.reduce((s, e) => s + (e.score ?? 0), 0) / marked.length / Math.max(1, exam.total)) * 100) : null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Exam mode" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#7C2D12]"><BoardIcon name="exam" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black">Exam mode</p>
            <p className="truncate text-xs font-bold text-ink/55">{showBuilder ? "A timed test on every learner’s phone — marked for you" : `${exam!.title} · ${exam!.count} questions · ${exam!.total} marks`}</p>
          </div>
          {running && !showBuilder && <span role="timer" className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-[#7C2D12]">⏱ {clockLeft(exam!.endsAt - now)}</span>}
          {running && !showBuilder && <button type="button" onClick={() => act("extend", { minutes: 5 })} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">+5 min</button>}
          {running && !showBuilder && <button type="button" onClick={() => act("close")} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End exam</button>}
          {!running && exam && !showBuilder && <button type="button" onClick={() => { setBuilding(true); setQs([]); }} className="rounded-xl bg-[#7C2D12] px-3 py-2 text-xs font-black text-white">New exam</button>}
          <button type="button" onClick={onClose} aria-label="Close exam mode" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        {note && <p role="alert" className="mx-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{note}</p>}
        {data?.setup && <p role="alert" className="mx-3 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">{data.setup}</p>}

        {showBuilder ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="text-xs font-black text-ink/60">Title<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={`${field} mt-1`} /></label>
              <label className="flex items-end gap-2 text-xs font-black text-ink/70"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mb-3 h-4 w-4 accent-[#7C2D12]" /><span className="mb-2.5">Learners see the right answers when it ends</span></label>
            </div>
            <fieldset className="mt-3"><legend className="text-xs font-black text-ink/60">Time</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">{EXAM_MINUTES.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={chip(minutes === m)}>{m} min</button>)}</div>
            </fieldset>
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
              <p className="text-xs font-black text-[#7C2D12]">Or make questions from a maths topic (instant, no A.I)</p>
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
                <button type="button" onClick={() => setQs((cur) => [...cur, ...topicQuestions(topic, level, count)].slice(0, 60))} className="min-h-[40px] rounded-xl bg-[#7C2D12] px-4 text-xs font-black text-white">Add {count} questions</button>
              </div>
            </div>
            <ol className="mt-4 grid gap-2">
              {qs.map((q, i) => (
                <li key={i} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-black text-ink/45">{i + 1}.</span>
                    <input value={q.q} maxLength={400} onChange={(e) => setQ(i, { q: e.target.value })} aria-label={`Question ${i + 1}`} className={field} />
                    <select value={q.marks} onChange={(e) => setQ(i, { marks: Number(e.target.value) })} aria-label={`Marks for question ${i + 1}`} className="rounded-lg bg-slate-50 px-1 py-2 text-xs font-black ring-1 ring-slate-200">
                      {[1, 2, 3, 4, 5].map((m) => <option key={m} value={m}>{m} mark{m === 1 ? "" : "s"}</option>)}
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
                  ) : (
                    <label className="mt-2 flex items-center gap-2 pl-5 text-xs font-bold text-ink/60">Answer
                      <input value={String(q.answer)} maxLength={120} onChange={(e) => setQ(i, { answer: e.target.value })} aria-label={`Answer to question ${i + 1}`} placeholder="e.g. 12  (or 12 | twelve)" className={`${field} max-w-xs`} />
                    </label>
                  )}
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQs((cur) => [...cur, { q: "", kind: "choice", options: ["", "", "", ""], answer: 0, marks: 1 }])} className="min-h-[40px] rounded-xl bg-slate-100 px-3 text-xs font-black">+ Multiple-choice question</button>
              <button type="button" onClick={() => setQs((cur) => [...cur, { q: "", kind: "typed", options: [], answer: "", marks: 1 }])} className="min-h-[40px] rounded-xl bg-slate-100 px-3 text-xs font-black">+ Typed-answer question</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <button type="button" onClick={start} disabled={busy || !qs.length} className="min-h-[44px] rounded-xl bg-[#7C2D12] px-5 text-sm font-black text-white disabled:opacity-40">{busy ? "Starting…" : `Start the exam (${qs.length} question${qs.length === 1 ? "" : "s"}, ${minutes} min)`}</button>
              {exam && <button type="button" onClick={() => setBuilding(false)} className="text-xs font-black text-ink/60 underline">Back to the last exam’s results</button>}
              <p className="text-xs font-semibold text-ink/55">Each phone gets the questions in its own order. Leaving the exam page is reported to you.</p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-3 grid gap-2 sm:grid-cols-4">
              {[["Taking it", entries.length], ["Handed in", marked.length], ["Left the page", entries.filter((e) => e.flags > 0).length], ["Average", avg == null ? "—" : `${avg}%`]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[11px] font-black uppercase tracking-wider text-ink/50">{l}</p><p className="text-2xl font-black">{v}</p></div>
              ))}
            </div>
            {!entries.length && <p className="p-6 text-center text-sm font-bold text-ink/50">{running ? "Waiting for learners to start…" : "Nobody took this exam."}</p>}
            {entries.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead><tr className="text-[11px] uppercase tracking-wider text-ink/50"><th className="p-2">Learner</th><th className="p-2">Answered</th><th className="p-2">Left the page</th><th className="p-2">Status</th><th className="p-2 text-right">Score</th></tr></thead>
                <tbody>
                  {[...entries].sort((a, b) => (b.score ?? b.live ?? 0) - (a.score ?? a.live ?? 0)).map((e) => (
                    <tr key={e.id} className="border-t border-line">
                      <td className="p-2 font-black">{e.name}</td>
                      <td className="p-2">{e.answered} / {exam!.count}</td>
                      <td className="p-2">{e.flags ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-700" title={e.flagLog.map((f) => `${new Date(f.at).toLocaleTimeString()} — ${f.reason}`).join("\n")}>⚠ {e.flags}×</span> : <span className="text-xs font-bold text-emerald-700">No</span>}</td>
                      <td className="p-2 text-xs font-black">{e.submitted ? <span className="text-emerald-700">Handed in</span> : <span className="text-ink/55">Writing…</span>}</td>
                      <td className="p-2 text-right font-black">{e.submitted ? `${e.score} / ${e.total}` : running ? "—" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {entries.length > 0 && <button type="button" onClick={csv} className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black">Download results (spreadsheet)</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Learner ──
function Learner({ data, reload }: { data: any; reload: () => Promise<void> }) {
  const now = useServerClock()();
  const [, tick] = useState(0);
  const exam: Meta | null = data?.exam ?? null;
  const entry = data?.entry ?? null;
  const paper: LearnerQ[] | null = data?.paper ?? null;
  const review: Review[] | null = data?.review ?? null;
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [at, setAt] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [warned, setWarned] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const seeded = useRef<string | null>(null);
  const taking = !!exam && exam.status === "open" && !!entry && !entry.submitted && !!paper;

  useEffect(() => { if (!exam?.endsAt) return; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [exam?.endsAt]);
  // Their saved answers (after a refresh, or on another visit).
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
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-3 p-3 sm:p-6">{children}</div>
    </div>
  );

  // Not started yet.
  if (exam.status === "open" && !entry) {
    return shell(
      <div className="my-auto rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#7C2D12]">Exam</p>
        <h2 className="mt-1 font-display text-3xl font-black">{exam.title}</h2>
        <p className="mt-2 text-sm font-bold text-ink/65">{exam.count} questions · {exam.total} marks · {clockLeft(left)} left</p>
        <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-sm font-semibold text-ink/75">
          <li>✍️ Your answers save as you go.</li>
          <li>🔒 Everyone has the questions in a different order.</li>
          <li>⚠️ Leaving this page is reported to your teacher.</li>
          <li>⏱ When time is up, your exam is handed in for you.</li>
        </ul>
        <button type="button" onClick={async () => { const { ok, j } = await api({ action: "start", examId: exam.id }); if (!ok) setNote(j.error); await reload(); }}
          className="mt-5 min-h-[52px] w-full rounded-2xl bg-[#7C2D12] text-lg font-black text-white">Start the exam</button>
        {note && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{note}</p>}
      </div>,
    );
  }
  if (taking && paper) {
    const q = paper[Math.min(at, paper.length - 1)];
    const done = paper.filter((x) => answers[String(x.n)] != null && answers[String(x.n)] !== "").length;
    return shell(<>
      <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 bg-[#FFF7ED]/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="min-w-0 flex-1 truncate text-sm font-black">{exam.title}</p>
        <span className="text-xs font-bold text-ink/60">{done}/{paper.length} answered</span>
        <span role="timer" className={`rounded-xl px-3 py-1.5 text-sm font-black ${left < 60_000 ? "bg-red-600 text-white" : "bg-white text-[#7C2D12] ring-1 ring-orange-200"}`}>⏱ {clockLeft(left)}</span>
      </div>
      {warned > 0 && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-black text-red-700 ring-1 ring-red-200">⚠️ You left the exam page{warned > 1 ? ` ${warned} times` : ""}. Your teacher has been told.</p>}
      <div className="select-none rounded-2xl bg-white p-4 shadow ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-wider text-[#7C2D12]">Question {at + 1} of {paper.length} · {q.marks} mark{q.marks === 1 ? "" : "s"}</p>
        <p className="mt-2 whitespace-pre-wrap text-xl font-black leading-snug">{q.q}</p>
        {q.kind === "choice" ? (
          <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Your answer">
            {q.options.map((o, k) => {
              const on = answers[String(q.n)] === o.i;
              return (
                <button key={o.i} type="button" role="radio" aria-checked={on} onClick={() => answer(q.n, o.i)}
                  className={`flex min-h-[52px] items-center gap-3 rounded-xl px-4 text-left text-base font-bold ring-2 ${on ? "bg-[#7C2D12] text-white ring-[#7C2D12]" : "bg-white ring-orange-100 hover:ring-orange-300"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${on ? "bg-white text-[#7C2D12]" : "bg-orange-50 text-[#7C2D12]"}`}>{String.fromCharCode(65 + k)}</span>{o.text}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="mt-4 block text-sm font-bold text-ink/60">Your answer
            <input value={String(answers[String(q.n)] ?? "")} maxLength={120} onChange={(e) => answer(q.n, e.target.value, true)} autoComplete="off" autoCapitalize="off" spellCheck={false}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-xl font-black text-ink ring-2 ring-orange-200 focus:outline-none focus:ring-[#7C2D12]" />
          </label>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={at === 0} onClick={() => setAt(at - 1)} className="min-h-[48px] flex-1 rounded-xl bg-orange-50 text-sm font-black text-[#7C2D12] disabled:opacity-40">← Back</button>
          {at < paper.length - 1
            ? <button type="button" onClick={() => setAt(at + 1)} className="min-h-[48px] flex-1 rounded-xl bg-[#7C2D12] text-sm font-black text-white">Next →</button>
            : <button type="button" onClick={() => submit()} className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 text-sm font-black text-white">Hand in</button>}
        </div>
      </div>
      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {paper.map((x, i) => {
          const a = answers[String(x.n)] != null && answers[String(x.n)] !== "";
          return <button key={x.n} type="button" onClick={() => setAt(i)} aria-label={`Question ${i + 1}${a ? ", answered" : ""}`} aria-current={i === at}
            className={`h-10 w-10 rounded-lg text-sm font-black ${i === at ? "ring-2 ring-[#7C2D12]" : ""} ${a ? "bg-[#7C2D12] text-white" : "bg-white text-ink/60 ring-1 ring-orange-200"}`}>{i + 1}</button>;
        })}
      </nav>
      <button type="button" onClick={() => submit()} className="min-h-[48px] rounded-xl bg-emerald-600 text-sm font-black text-white">Hand in my exam</button>
      {note && <p role="alert" className="text-sm font-bold text-red-700">{note}</p>}
    </>);
  }
  // Handed in (or time's up).
  if (entry?.submitted || result) {
    if (hidden) {
      return <button type="button" onClick={() => setHidden(false)} className="fixed bottom-4 left-4 z-[95] rounded-full bg-[#7C2D12] px-4 py-3 text-sm font-black text-white shadow-2xl">📝 My exam</button>;
    }
    const score = result?.score ?? entry?.score, total = result?.total ?? entry?.total ?? exam.total;
    return shell(<>
      <div className="rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-orange-200">
        <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Handed in ✓</p>
        <h2 className="mt-1 font-display text-2xl font-black">{exam.title}</h2>
        {score != null && <p className="mt-3 font-display text-5xl font-black text-[#7C2D12]">{score} / {total}</p>}
        {score != null && <p className="mt-1 text-sm font-bold text-ink/60">{Math.round((score / Math.max(1, total)) * 100)}%</p>}
        {exam.status === "open" && <p className="mt-3 text-sm font-semibold text-ink/60">{exam.review ? "You can see the right answers when the exam ends." : "Wait for your teacher."}</p>}
        <button type="button" onClick={() => setHidden(true)} className="mt-4 min-h-[44px] rounded-xl bg-[#7C2D12] px-5 text-sm font-black text-white">Back to the class</button>
      </div>
      {review && (
        <ol className="grid gap-2" aria-label="Your answers">
          {review.map((r, i) => (
            <li key={i} className={`rounded-xl p-3 ring-1 ${r.right ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
              <p className="text-sm font-black">{r.right ? "✓" : "✗"} {i + 1}. {r.q}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink/70">
                You: {r.given == null || r.given === "" ? "no answer" : r.kind === "choice" ? r.options[Number(r.given)] : String(r.given)}
                {!r.right && <> · <span className="font-black text-emerald-800">Answer: {r.kind === "choice" ? r.options[Number(r.answer)] : String(r.answer).split("|")[0].trim()}</span></>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </>);
  }
  return null;
}
