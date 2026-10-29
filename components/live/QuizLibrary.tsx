"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { QuizQuestion } from "@/lib/liveQuiz";
import { ANSWER_STYLE, Shape } from "@/components/live/QuizBits";

type SetRow = { id: string; title: string; subject: string; count: number; mine: boolean; updatedAt: string };
type Draft = QuizQuestion;
const blank = (seconds = 20): Draft => ({ q: "", options: ["", "", "", ""], answer: 0, seconds });
const pad = (o: string[]) => [...o, "", "", "", ""].slice(0, 4);
const TIMES = [5, 10, 20, 30, 60, 90];

// The quiz library: prepare Kahoot-style quizzes before class (typed, from
// the question bank, or drafted by the A.I), then launch them during an
// interactive class.
// `bank`: offer the academy question bank (tutors and admins only).
export default function QuizLibrary({ bank = true }: { bank?: boolean }) {
  const params = useSearchParams();
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(params.get("new") ? "new" : null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/quiz-sets");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Couldn't load your quizzes.");
    setSets(j.sets ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(s: SetRow) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const r = await fetch(`/api/quiz-sets?id=${s.id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  if (editing) return <Editor bank={bank} id={editing === "new" ? null : editing} onClose={() => { setEditing(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">{sets ? `${sets.length} quiz${sets.length === 1 ? "" : "zes"}` : "Loading…"}</p>
        <button type="button" onClick={() => setEditing("new")} className="btn-gold !min-h-[46px]">+ New quiz</button>
      </div>
      {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{err}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sets === null && [0, 1, 2].map((i) => <li key={i} className="card h-36 animate-pulse" />)}
        {(sets ?? []).map((s) => (
          <li key={s.id} className="card flex flex-col overflow-hidden">
            <div className="quiz-stage flex h-20 items-end justify-between px-4 pb-3 text-white">
              <span className="flex gap-1">{[0, 1, 2, 3].map((k) => <span key={k} className="rounded p-1" style={{ background: ANSWER_STYLE[k].color }}><Shape i={k} className="h-3.5 w-3.5" /></span>)}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">{s.count} Q</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-bold text-ink">{s.title}</p>
              <p className="text-xs text-ink/55">{s.subject || "No subject"}{s.mine ? "" : " · another tutor"}</p>
              <div className="mt-auto flex gap-2 pt-3">
                <button type="button" onClick={() => setEditing(s.id)} className="btn-ghost flex-1 !min-h-[40px]">Edit</button>
                <button type="button" onClick={() => remove(s)} className="min-h-[40px] rounded-xl px-3 text-sm font-bold text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {sets?.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-display text-xl font-black text-ink">Make your first quiz</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">Prepare it now, launch it during your interactive class. Learners answer on their phones with the four coloured shapes.</p>
          <button type="button" onClick={() => setEditing("new")} className="btn-gold mt-4 !min-h-[46px]">+ New quiz</button>
        </div>
      )}
    </div>
  );
}

function Editor({ id, onClose, bank: canBank }: { id: string | null; onClose: () => void; bank: boolean }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [qs, setQs] = useState<Draft[]>([blank()]);
  const [loaded, setLoaded] = useState(!id);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"ai" | "bank" | null>(null);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [bank, setBank] = useState<{ id: string; question: string; options: string[]; answer: number }[] | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/quiz-sets?id=${id}`).then((r) => r.json()).then((j) => {
      if (j.set) { setTitle(j.set.title); setSubject(j.set.subject ?? ""); setQs(j.set.questions?.length ? j.set.questions.map((q: Draft) => ({ ...q, options: pad(q.options) })) : [blank()]); }
      setLoaded(true);
    });
  }, [id]);

  const upd = (i: number, patch: Partial<Draft>) => setQs((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = (more: Draft[]) => setQs((d) => [...d.filter((x) => x.q.trim()), ...more.map((q) => ({ ...q, options: pad(q.options) }))]);
  const move = (i: number, dir: -1 | 1) => setQs((d) => { const n = [...d]; const j = i + dir; if (j < 0 || j >= n.length) return d; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const complete = qs.filter((d) => d.q.trim() && d.options.filter((o) => o.trim()).length >= 2 && d.options[d.answer]?.trim());

  async function save() {
    setBusy(true); setMsg(null);
    const body = JSON.stringify({ id, title, subject, questions: qs });
    const r = await fetch("/api/quiz-sets", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Couldn't save." }); return; }
    onClose();
  }

  async function draftWithAi() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/quiz-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai", topic, subject, count }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "The A.I couldn't help just now." }); return; }
    add(j.questions); if (!title.trim()) setTitle(topic);
    setMsg({ ok: true, text: `Added ${j.questions.length} questions — check them before class.` }); setPanel(null);
  }

  async function searchBank() {
    const r = await fetch(`/api/question-bank?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}&limit=40`);
    const j = await r.json().catch(() => ({}));
    setBank((j.questions ?? []).filter((x: any) => Array.isArray(x.options) && x.options.length >= 2));
  }

  if (!loaded) return <div className="card h-64 animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:p-5">
        <label className="block text-sm font-bold text-ink/80">Quiz title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions warm-up" className="field mt-1" maxLength={80} />
        </label>
        <label className="block text-sm font-bold text-ink/80">Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mathematics" className="field mt-1" maxLength={40} list="quiz-subjects" />
          <datalist id="quiz-subjects">{["Mathematics", "English", "Physics", "Chemistry", "Biology", "Basic Science", "Further Mathematics", "Economics", "Computer Studies"].map((s) => <option key={s} value={s} />)}</datalist>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPanel(panel === "ai" ? null : "ai")} aria-expanded={panel === "ai"} className={`min-h-[44px] rounded-xl px-4 text-sm font-bold ring-1 ${panel === "ai" ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/75 ring-line"}`}>✨ Draft with A.I</button>
        {canBank && <button type="button" onClick={() => setPanel(panel === "bank" ? null : "bank")} aria-expanded={panel === "bank"} className={`min-h-[44px] rounded-xl px-4 text-sm font-bold ring-1 ${panel === "bank" ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/75 ring-line"}`}>From question bank</button>}
      </div>

      {panel === "ai" && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <label className="min-w-[220px] flex-1 text-sm font-bold text-ink/80">Topic
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Simultaneous equations (JSS3)" className="field mt-1" />
          </label>
          <label className="w-28 text-sm font-bold text-ink/80">Questions
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="field mt-1">{[5, 8, 10, 12, 15].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <button type="button" disabled={busy || !topic.trim()} onClick={draftWithAi} className="min-h-[48px] rounded-xl bg-violet-600 px-5 font-black text-white disabled:opacity-50">{busy ? "Drafting…" : "Draft"}</button>
        </div>
      )}

      {panel === "bank" && (
        <div className="card p-4">
          <div className="flex gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={`Topic${subject ? ` in ${subject}` : ""} (optional)`} aria-label="Topic" className="field flex-1" />
            <button type="button" onClick={searchBank} className="min-h-[48px] rounded-xl bg-[#1657C9] px-4 font-bold text-white">Search</button>
          </div>
          {bank && (
            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
              {bank.map((x) => (
                <li key={x.id} className="flex items-center gap-2 rounded-xl bg-ink/[.03] px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink/85">{x.question}</span>
                  <button type="button" onClick={() => add([{ q: x.question.slice(0, 300), options: x.options.slice(0, 4).map(String), answer: Math.min(Number(x.answer) || 0, 3), seconds: 20 }])} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Add</button>
                </li>
              ))}
              {!bank.length && <li className="text-sm text-ink/55">No multiple-choice questions found.</li>}
            </ul>
          )}
        </div>
      )}

      <ol className="space-y-3">
        {qs.map((d, i) => (
          <li key={i} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-black text-white">{i + 1}</span>
              <input value={d.q} onChange={(e) => upd(i, { q: e.target.value })} placeholder="Type your question" aria-label={`Question ${i + 1}`} maxLength={300} className="field min-w-[200px] flex-1 !h-11" />
              <select value={d.seconds} onChange={(e) => upd(i, { seconds: Number(e.target.value) })} aria-label="Time limit" className="field !h-11 w-24">
                {TIMES.map((s) => <option key={s} value={s}>{s}s</option>)}
              </select>
              <span className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="h-10 w-9 rounded-lg text-ink/50 hover:bg-ink/5 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Move down" className="h-10 w-9 rounded-lg text-ink/50 hover:bg-ink/5 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => setQs((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [blank()]))} aria-label="Delete question" className="h-10 w-9 rounded-lg text-ink/50 hover:bg-red-50 hover:text-red-600">✕</button>
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {d.options.map((o, k) => (
                <label key={k} className={`flex items-center gap-2 rounded-xl px-3 py-2 ring-2 ${d.answer === k ? "ring-emerald-500" : "ring-transparent"}`} style={{ background: `${ANSWER_STYLE[k].color}14` }}>
                  <span className="rounded-md p-1 text-white" style={{ background: ANSWER_STYLE[k].color }}><Shape i={k} className="h-4 w-4" /></span>
                  <input value={o} onChange={(e) => upd(i, { options: d.options.map((x, j) => (j === k ? e.target.value : x)) })} placeholder={`Answer ${k + 1}${k > 1 ? " (optional)" : ""}`} maxLength={120}
                    className="h-9 min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink/35" />
                  <input type="radio" name={`ans-${i}`} checked={d.answer === k} onChange={() => upd(i, { answer: k })} aria-label={`Answer ${k + 1} is correct`} className="h-5 w-5 accent-emerald-600" />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <button type="button" onClick={() => setQs((d) => [...d, blank(d[d.length - 1]?.seconds ?? 20)])} className="w-full rounded-2xl border-2 border-dashed border-line py-3 text-sm font-bold text-ink/60 hover:border-[#1657C9] hover:text-[#1657C9]">+ Add question</button>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-line backdrop-blur lg:bottom-4">
        <p className="flex-1 text-sm text-ink/60">{complete.length} of {qs.length} question{qs.length === 1 ? "" : "s"} ready{complete.length < qs.length ? " · incomplete ones are skipped" : ""}</p>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`} role="status">{msg.text}</p>}
        <button type="button" onClick={onClose} className="btn-ghost !min-h-[44px]">Cancel</button>
        <button type="button" onClick={save} disabled={busy} className="btn-gold !min-h-[44px]">{busy ? "Saving…" : "Save quiz"}</button>
      </div>
    </div>
  );
}
