"use client";
// Assignments for the teacher (lib/assignments.ts, /api/board/assignments):
//   • the list — every assignment in this class and how far everyone has got
//   • New assignment — questions of any kind (multiple choice, short answers,
//     written answers, a digital board, pages of a PDF to write on, uploads of
//     paper work), notes for learners, a due date, who it's for, and ✨ A.I.
//   • one assignment — who has started, handed in (on time or late), what's
//     marked; each learner's own link; reminders on WhatsApp
//   • marking one learner — ticks, crosses and a pen on their pages, boards
//     and photos, a mark for each question, feedback; return it, or send it
//     back to try again.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { AnnotatedPage, MarkTools, type MarkTool } from "@/components/live/board/PageAnnotate";
import { PAPER_FIT, SLIDE_ACCEPT, PICTURE_ACCEPT, sendPicture, sendSlides } from "@/components/live/board/slides";
import { TEACHER_PENS, type PageNote } from "@/lib/examAnnotate";
import { WORK_HARD, WORK_LEVELS, cleanWorkItems, type WorkHard } from "@/lib/classWorkAi";
import {
  KINDS, MAX_ITEMS, MAX_MARKS, STATUS_LABEL, dueMs, dueWords, duePreset, isAuto, itemMark, itemsFromAi, noteKeyFor, reminderText, scoreOf,
  type AItem, type AKind, type Assignment, type Entry, type Status,
} from "@/lib/assignments";

type Api = (body: Record<string, unknown>) => Promise<{ ok: boolean; j: any }>;
type Summary = { id: string; title: string; dueAt: string | null; status: "open" | "closed"; count: number; createdAt: string;
  counts: { for: number; started: number; handedIn: number; late: number; returned: number } };
type Row = { id: string; name: string; state: Status; submittedAt: string | null; returnedAt: string | null; late: boolean; score: number | null; total: number; toMark: number; tries: number; link: string; parentEmail?: boolean };

const clock = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const STATE_LOOK: Record<Status, string> = {
  "not-started": "bg-slate-100 text-ink/55", started: "bg-sky-100 text-sky-800", "handed-in": "bg-amber-100 text-amber-900",
  late: "bg-orange-100 text-orange-900", returned: "bg-emerald-100 text-emerald-800", "sent-back": "bg-violet-100 text-violet-800",
};
const btn = "min-h-[40px] rounded-xl px-3 text-sm font-black";

export default function Assignments({ sessionId }: { sessionId: string }) {
  const api: Api = useCallback(async (body) => {
    const r = await fetch("/api/board/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, ...body }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return { ok: !!r?.ok, j };
  }, [sessionId]);
  const [view, setView] = useState<{ at: "list" } | { at: "new" } | { at: "one"; id: string } | { at: "mark"; id: string; studentId: string }>({ at: "list" });
  const [list, setList] = useState<{ assignments: Summary[]; learners: { id: string; name: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const send = useLive({});
  const load = useCallback(async () => {
    const r = await fetch(`/api/board/assignments?sessionId=${sessionId}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't load the assignments — check the internet."); return; }
    setErr(null); setList(j);
  }, [sessionId]);
  useEffect(() => { void load(); }, [load]);

  if (view.at === "new") return <Builder sessionId={sessionId} learners={list?.learners ?? []} api={api} onCancel={() => setView({ at: "list" })}
    onMade={async (id) => { send("assign", { host: true, id }); await load(); setView({ at: "one", id }); }} />;
  if (view.at === "one") return <Tracker sessionId={sessionId} id={view.id} api={api} onBack={() => { setView({ at: "list" }); void load(); }}
    onMark={(studentId) => setView({ at: "mark", id: view.id, studentId })} onChanged={() => send("assign", { host: true, id: view.id })} />;
  if (view.at === "mark") return <Marker sessionId={sessionId} id={view.id} studentId={view.studentId} api={api}
    onBack={() => setView({ at: "one", id: view.id })} onNext={(studentId) => setView({ at: "mark", id: view.id, studentId })} onChanged={() => send("assign", { host: true, id: view.id })} />;

  return (
    <section aria-label="Assignments" className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">Homework</p>
          <h2 className="font-display text-2xl font-black text-ink">Assignments</h2>
        </div>
        <button type="button" onClick={() => setView({ at: "new" })} className={`${btn} bg-violet-600 text-white`}>＋ New assignment</button>
      </div>
      <p className="mt-1 text-sm text-ink/60">Set work for after the class — questions, a board to write on, a PDF to fill in, or photos of paper work. Each learner gets their own link: no account needed.</p>
      {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</p>}
      {!list && !err && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />}
      {list && !list.assignments.length && (
        <div className="mt-4 rounded-2xl bg-violet-50 p-6 text-center ring-1 ring-violet-100">
          <p className="text-3xl" aria-hidden>📚</p>
          <p className="mt-1 font-black text-ink">No assignments yet</p>
          <p className="text-sm text-ink/60">Make one now — learners can start on it straight away, or after the class.</p>
        </div>
      )}
      {list && list.assignments.length > 0 && (
        <ul className="mt-4 grid gap-2" aria-label="This class's assignments">
          {list.assignments.map((a) => {
            const toMark = a.counts.handedIn, overdue = a.dueAt && dueMs(a)! < Date.now();
            return (
              <li key={a.id}>
                <button type="button" onClick={() => setView({ at: "one", id: a.id })} className="w-full rounded-2xl bg-white p-3 text-left ring-1 ring-line transition hover:ring-violet-300" aria-label={`Open ${a.title}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-black text-ink">{a.title}</span>
                    {a.status === "closed" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-ink/60">Closed</span>}
                    {toMark > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">✍️ {toMark} to mark</span>}
                  </div>
                  <p className={`mt-0.5 text-xs font-bold ${overdue ? "text-orange-700" : "text-ink/55"}`}>{dueWords(a.dueAt)}{a.dueAt ? ` · ${clock(a.dueAt)}` : ""} · {a.count} question{a.count === 1 ? "" : "s"}</p>
                  <Progress c={a.counts} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Progress({ c }: { c: Summary["counts"] }) {
  const of = Math.max(1, c.for), w = (n: number) => `${Math.min(100, (n / of) * 100)}%`;
  return (
    <div className="mt-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className="bg-emerald-500" style={{ width: w(c.returned) }} /><span className="bg-amber-400" style={{ width: w(c.handedIn) }} />
        <span className="bg-sky-300" style={{ width: w(Math.max(0, c.started - c.handedIn - c.returned)) }} />
      </div>
      <p className="mt-1 text-[11px] font-bold text-ink/55">{c.handedIn + c.returned} of {c.for} handed in{c.late ? ` (${c.late} late)` : ""} · {c.returned} marked</p>
    </div>
  );
}

// ── New assignment ──
type Draft = AItem & { key: string };
const newKey = () => Math.random().toString(36).slice(2, 9);
const blankItem = (kind: AKind): Draft => ({ key: newKey(), kind, q: "", marks: kind === "page" || kind === "upload" || kind === "board" ? 5 : kind === "written" ? 3 : 1,
  options: kind === "choice" ? ["", "", "", ""] : [], answer: kind === "choice" ? 0 : "" });

function Builder({ sessionId, learners, api, onCancel, onMade }: {
  sessionId: string; learners: { id: string; name: string }[]; api: Api; onCancel: () => void; onMade: (id: string) => void;
}) {
  const [title, setTitle] = useState(""), [instructions, setInstructions] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [due, setDue] = useState(() => localInput(duePreset("tomorrow")));
  const [lateOk, setLateOk] = useState(true), [review, setReview] = useState(true), [remind, setRemind] = useState(true);
  const [forAll, setForAll] = useState(true), [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const pdfIn = useRef<HTMLInputElement>(null), notesIn = useRef<HTMLInputElement>(null);
  const set = (key: string, patch: Partial<AItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setItems((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const c = [...xs]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const total = items.reduce((s, x) => s + x.marks, 0);

  async function pdfPages(list: FileList | null) {
    const fs = Array.from(list ?? []); if (pdfIn.current) pdfIn.current.value = "";
    if (!fs.length) return;
    setErr(null);
    try {
      const urls = (await sendSlides({ sessionId }, fs, Math.max(1, MAX_ITEMS - items.length), (m) => setBusy(m.replace(/slides?/g, (w) => (w === "slide" ? "page" : "pages"))), PAPER_FIT)).filter((u): u is string => !!u);
      if (!urls.length) throw new Error("no pages arrived");
      setItems((xs) => [...xs, ...urls.map((img, i) => ({ ...blankItem("page"), q: `Page ${i + 1}`, img }))]);
    } catch (e) { setErr(`Couldn't add the PDF (${e instanceof Error ? e.message : e}) — try again.`); }
    finally { setBusy(null); }
  }
  async function notes(list: FileList | null) {
    const fs = Array.from(list ?? []); if (notesIn.current) notesIn.current.value = "";
    if (!fs.length) return;
    setErr(null);
    try {
      const urls = (await sendSlides({ sessionId }, fs, 20 - files.length, (m) => setBusy(m.replace(/slides?/g, (w) => (w === "slide" ? "page" : "pages"))), PAPER_FIT)).filter((u): u is string => !!u);
      setFiles((f) => [...f, ...urls].slice(0, 20));
    } catch (e) { setErr(`Couldn't add the notes (${e instanceof Error ? e.message : e}).`); }
    finally { setBusy(null); }
  }
  async function picture(key: string, f: File | undefined) {
    if (!f) return;
    try { const { url } = await sendPicture({ sessionId }, f, (m) => setBusy(m)); set(key, { img: url }); }
    catch (e) { setErr(`Couldn't add the picture (${e instanceof Error ? e.message : e}).`); }
    finally { setBusy(null); }
  }
  async function create() {
    setErr(null);
    if (!items.length) { setErr("Add at least one question or task."); return; }
    const bad = items.findIndex((x) => (x.kind === "choice" && (x.options.filter((o) => o.trim()).length < 2 || !x.q.trim())) || (x.kind === "typed" && (!x.q.trim() || !String(x.answer).trim())) || (x.kind === "written" && !x.q.trim()));
    if (bad >= 0) { setErr(`Finish question ${bad + 1} — it needs ${items[bad].kind === "typed" ? "a question and its answer" : items[bad].kind === "choice" ? "a question and at least two choices" : "a question"}.`); return; }
    if (!forAll && !chosen.length) { setErr("Choose who it's for."); return; }
    setBusy("Sending…");
    const out = items.map(({ key, ...x }) => (void key, x.kind === "choice" ? { ...x, options: x.options.filter((o) => o.trim()), answer: Math.min(Number(x.answer), x.options.filter((o) => o.trim()).length - 1) } : x));
    const { ok, j } = await api({ action: "create", title: title.trim() || "Assignment", instructions, items: out, files, dueAt: due ? new Date(due).toISOString() : null, lateOk, review, remind, forIds: forAll ? null : chosen });
    setBusy(null);
    if (!ok) { setErr(j.error ?? "Couldn't send it — check the internet."); return; }
    onMade(j.id);
  }

  return (
    <section aria-label="New assignment" className="card grid gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h2 className="mr-auto font-display text-2xl font-black text-ink">New assignment</h2>
        <button type="button" onClick={onCancel} className={`${btn} text-ink/60 hover:bg-slate-100`}>Cancel</button>
      </div>
      <label className="text-xs font-black text-ink/60">Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="e.g. Fractions — homework 3"
          className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2.5 text-base font-bold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </label>
      <label className="text-xs font-black text-ink/60">Instructions for learners (optional)
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} maxLength={1500} placeholder="e.g. Show all your working. Use the notes from today's class."
          className="mt-1 w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </label>

      {/* Notes / resources */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => notesIn.current?.click()} disabled={!!busy} className={`${btn} bg-white text-ink/75 ring-1 ring-slate-200`}>📎 Add notes for learners (PDF or pictures)</button>
        <input ref={notesIn} type="file" accept={SLIDE_ACCEPT} multiple hidden onChange={(e) => notes(e.target.files)} aria-label="Notes for learners" />
        {files.length > 0 && <span className="text-xs font-bold text-ink/60">{files.length} page{files.length === 1 ? "" : "s"} of notes <button type="button" onClick={() => setFiles([])} className="ml-1 text-red-700 underline">remove</button></span>}
      </div>

      {/* The questions */}
      <div className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-ink/50">Questions and tasks {items.length > 0 && `· ${items.length} · ${total} mark${total === 1 ? "" : "s"}`}</p>
        {items.map((x, i) => <ItemEditor key={x.key} x={x} i={i} last={i === items.length - 1} set={(p) => set(x.key, p)} move={(d) => move(i, d)}
          remove={() => setItems((xs) => xs.filter((y) => y.key !== x.key))} picture={(f) => picture(x.key, f)} busy={!!busy} />)}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Add a question">
          {KINDS.map((k) => (
            <button key={k.kind} type="button" disabled={!!busy || items.length >= MAX_ITEMS}
              onClick={() => (k.kind === "page" ? pdfIn.current?.click() : setItems((xs) => [...xs, blankItem(k.kind)]))}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white px-3 text-left text-sm font-black text-ink ring-1 ring-slate-200 hover:ring-violet-400 disabled:opacity-40" title={k.hint}>
              <span aria-hidden>{k.icon}</span>＋ {k.label}
            </button>
          ))}
          <input ref={pdfIn} type="file" accept=".pdf,application/pdf,image/*" multiple hidden onChange={(e) => pdfPages(e.target.files)} aria-label="A PDF for learners to write on" />
        </div>
        <AiAdd onAdd={(xs) => setItems((cur) => [...cur, ...xs.map((x) => ({ ...x, key: newKey() }))].slice(0, MAX_ITEMS))} />
      </div>

      {/* When, who, and how */}
      <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-black text-ink/60">Due</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {([["tomorrow", "Tomorrow 6 pm"], ["3days", "In 3 days"], ["week", "In a week"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setDue(localInput(duePreset(k)))} aria-pressed={due === localInput(duePreset(k))}
                className={`min-h-[36px] rounded-lg px-2.5 text-xs font-black ring-1 ${due === localInput(duePreset(k)) ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`}>{l}</button>
            ))}
            <button type="button" onClick={() => setDue("")} aria-pressed={!due} className={`min-h-[36px] rounded-lg px-2.5 text-xs font-black ring-1 ${!due ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`}>No due date</button>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date and time" className="min-h-[36px] rounded-lg bg-white px-2 text-sm font-bold ring-1 ring-slate-200" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-ink/75">
          <label className="flex items-center gap-2"><input type="checkbox" checked={lateOk} onChange={(e) => setLateOk(e.target.checked)} className="h-5 w-5 accent-violet-600" /> Accept late work (marked late)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="h-5 w-5 accent-violet-600" /> Show answers &amp; solutions once marked</label>
          <label className={`flex items-center gap-2 ${due ? "" : "opacity-50"}`}><input type="checkbox" checked={remind && !!due} disabled={!due} onChange={(e) => setRemind(e.target.checked)} className="h-5 w-5 accent-violet-600" /> 📧 Email parents a reminder the evening before it&apos;s due</label>
        </div>
        <div>
          <p className="text-xs font-black text-ink/60">For</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setForAll(true)} aria-pressed={forAll} className={`min-h-[36px] rounded-lg px-2.5 text-xs font-black ring-1 ${forAll ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`}>Everyone in the class</button>
            <button type="button" onClick={() => setForAll(false)} aria-pressed={!forAll} disabled={!learners.length} className={`min-h-[36px] rounded-lg px-2.5 text-xs font-black ring-1 disabled:opacity-40 ${!forAll ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`}>Choose learners</button>
          </div>
          {!forAll && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Choose learners">
              {learners.map((l) => (
                <label key={l.id} className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-black ring-1 ${chosen.includes(l.id) ? "bg-violet-50 ring-violet-400" : "bg-white ring-slate-200"}`}>
                  <input type="checkbox" checked={chosen.includes(l.id)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, l.id] : c.filter((x) => x !== l.id)))} className="accent-violet-600" />{l.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {busy && <p role="status" className="text-sm font-bold text-violet-700">{busy}</p>}
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={create} disabled={!!busy || !items.length} className="min-h-[52px] rounded-2xl bg-violet-600 px-6 text-base font-black text-white shadow-lg shadow-violet-600/25 disabled:opacity-40">📚 Send to learners</button>
        <span className="text-xs font-bold text-ink/55">Learners in the class see it straight away; send the others their link.</span>
      </div>
    </section>
  );
}

function ItemEditor({ x, i, last, set, move, remove, picture, busy }: {
  x: Draft; i: number; last: boolean; set: (p: Partial<AItem>) => void; move: (d: number) => void; remove: () => void; picture: (f: File | undefined) => void; busy: boolean;
}) {
  const k = KINDS.find((y) => y.kind === x.kind)!;
  const pic = useRef<HTMLInputElement>(null);
  const field = "w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500";
  return (
    <div className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200" aria-label={`Question ${i + 1}: ${k.label}`} role="group">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-black text-violet-800">{i + 1}. {k.icon} {k.label}</span>
        <span className="text-[11px] font-bold text-ink/45">{k.hint}</span>
        <label className="ml-auto flex items-center gap-1 text-xs font-black text-ink/60">Marks
          <input type="number" min={1} max={MAX_MARKS} value={x.marks} onChange={(e) => set({ marks: Math.max(1, Math.min(MAX_MARKS, Number(e.target.value) || 1)) })} className="w-14 rounded-lg bg-slate-50 px-2 py-1 text-sm font-black ring-1 ring-slate-200" aria-label={`Marks for question ${i + 1}`} />
        </label>
        <button type="button" onClick={() => move(-1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`} className="h-8 w-8 rounded-lg text-ink/50 hover:bg-slate-100 disabled:opacity-30">↑</button>
        <button type="button" onClick={() => move(1)} disabled={last} aria-label={`Move question ${i + 1} down`} className="h-8 w-8 rounded-lg text-ink/50 hover:bg-slate-100 disabled:opacity-30">↓</button>
        <button type="button" onClick={remove} aria-label={`Remove question ${i + 1}`} className="h-8 w-8 rounded-lg text-ink/40 hover:bg-red-50 hover:text-red-600">✕</button>
      </div>
      {x.kind === "page" && x.img && <img src={x.img} alt={`Page for question ${i + 1}`} className="max-h-40 w-auto self-start rounded-lg ring-1 ring-slate-200" />}
      <textarea value={x.q} onChange={(e) => set({ q: e.target.value })} rows={x.kind === "page" ? 1 : 2} maxLength={600} aria-label={`Question ${i + 1}`}
        placeholder={x.kind === "upload" ? "e.g. Do exercise 4B, numbers 1–10, in your book and upload photos" : x.kind === "board" ? "e.g. Draw a bar chart of the data and describe it" : x.kind === "page" ? "Instructions for this page (optional)" : "Type the question"} className={field} />
      {x.kind === "choice" && (
        <div className="grid gap-1.5" role="radiogroup" aria-label={`Choices for question ${i + 1} — tick the right one`}>
          {x.options.map((o, j) => (
            <div key={j} className="flex items-center gap-2">
              <input type="radio" name={`right-${x.key}`} checked={x.answer === j} onChange={() => set({ answer: j })} aria-label={`Choice ${String.fromCharCode(65 + j)} is right`} className="h-5 w-5 accent-emerald-600" />
              <input value={o} onChange={(e) => set({ options: x.options.map((y, m) => (m === j ? e.target.value : y)) })} maxLength={150} placeholder={`Choice ${String.fromCharCode(65 + j)}`} aria-label={`Choice ${String.fromCharCode(65 + j)} for question ${i + 1}`} className={field} />
            </div>
          ))}
          {x.options.length < 6 && <button type="button" onClick={() => set({ options: [...x.options, ""] })} className="justify-self-start text-xs font-black text-violet-700">＋ Another choice</button>}
        </div>
      )}
      {x.kind === "typed" && <input value={String(x.answer)} onChange={(e) => set({ answer: e.target.value })} maxLength={200} aria-label={`Answer for question ${i + 1}`} placeholder="The answer (more than one? separate with |  e.g. 0.5 | 1/2)" className={field} />}
      {x.kind === "written" && <textarea value={String(x.answer)} onChange={(e) => set({ answer: e.target.value })} rows={2} maxLength={1000} aria-label={`Mark scheme for question ${i + 1}`} placeholder="Your mark scheme (only you see it while marking)" className={field} />}
      {(x.kind === "typed" || x.kind === "choice") && <input value={x.why ?? ""} onChange={(e) => set({ why: e.target.value })} maxLength={700} aria-label={`Worked solution for question ${i + 1}`} placeholder="Worked solution (optional — shown once it's marked)" className={field} />}
      {x.kind !== "page" && x.kind !== "upload" && (
        <div className="flex items-center gap-2">
          {x.img ? <><img src={x.img} alt="" className="h-12 w-auto rounded ring-1 ring-slate-200" /><button type="button" onClick={() => set({ img: undefined })} className="text-xs font-black text-red-700">Remove picture</button></>
            : <button type="button" disabled={busy} onClick={() => pic.current?.click()} className="text-xs font-black text-violet-700 disabled:opacity-40">🖼 Add a picture</button>}
          <input ref={pic} type="file" accept={PICTURE_ACCEPT} hidden onChange={(e) => { picture(e.target.files?.[0]); e.target.value = ""; }} aria-label={`Picture for question ${i + 1}`} />
        </div>
      )}
    </div>
  );
}

// ✨ A.I. questions on a topic, with their answers.
function AiAdd({ onAdd }: { onAdd: (xs: AItem[]) => void }) {
  const [topic, setTopic] = useState(""), [level, setLevel] = useState<string>(WORK_LEVELS[2]);
  const [count, setCount] = useState(8), [hard, setHard] = useState<WorkHard>("mixed"), [as, setAs] = useState<"typed" | "written">("typed");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [done, setDone] = useState<number | null>(null);
  async function make() {
    if (!topic.trim() || busy) return;
    setBusy(true); setErr(null); setDone(null);
    const r = await fetch("/api/quiz-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai-work", topic, level, count, hard }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    const got = cleanWorkItems(j.items);
    if (!r?.ok || !got.length) { setErr(j.error ?? "Couldn't make questions — try again."); return; }
    const xs = itemsFromAi(got, as, as === "written" ? 2 : 1);
    onAdd(xs); setDone(xs.length);
  }
  const chip = (on: boolean) => `min-h-[34px] rounded-lg px-2.5 text-xs font-black ring-1 ${on ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink/70 ring-slate-200"}`;
  return (
    <details className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
      <summary className="cursor-pointer text-sm font-black text-violet-900">✨ Add A.I. questions on a topic</summary>
      <div className="mt-2 grid gap-2">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="e.g. Simple interest, Indices, Area of a trapezium" aria-label="A.I. topic"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void make(); } }} className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="A.I. level">{WORK_LEVELS.map((l) => <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>{l}</button>)}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span role="group" aria-label="A.I. difficulty" className="flex flex-wrap gap-1.5">{WORK_HARD.map((h) => <button key={h} type="button" aria-pressed={hard === h} onClick={() => setHard(h)} className={chip(hard === h)}>{h[0].toUpperCase() + h.slice(1)}</button>)}</span>
          <label className="ml-auto flex items-center gap-1 text-xs font-black text-ink/60">How many <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-14 rounded-lg bg-white px-2 py-1 text-sm font-black ring-1 ring-slate-200" /></label>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="A.I. questions as">
          <button type="button" aria-pressed={as === "typed"} onClick={() => setAs("typed")} className={chip(as === "typed")}>Short answers — marked for me</button>
          <button type="button" aria-pressed={as === "written"} onClick={() => setAs("written")} className={chip(as === "written")}>Written answers — I&apos;ll mark</button>
        </div>
        <button type="button" onClick={make} disabled={!topic.trim() || busy} className="justify-self-start rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "Writing questions…" : "✨ Add questions"}</button>
        {done != null && <p role="status" className="text-xs font-bold text-emerald-700">✓ {done} questions added — check them above and change anything.</p>}
        {err && <p role="alert" className="text-xs font-bold text-red-700">{err}</p>}
      </div>
    </details>
  );
}

// ── One assignment: everyone's progress ──
function Tracker({ sessionId, id, api, onBack, onMark, onChanged }: { sessionId: string; id: string; api: Api; onBack: () => void; onMark: (studentId: string) => void; onChanged: () => void }) {
  const [d, setD] = useState<{ assignment: Assignment; learners: Row[] } | null>(null);
  const [err, setErr] = useState<string | null>(null), [note, setNote] = useState<string | null>(null);
  const [newName, setNewName] = useState(""), [due, setDue] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/board/assignments?sessionId=${sessionId}&id=${id}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't open it — check the internet."); return; }
    setErr(null); setD(j);
  }, [sessionId, id]);
  useEffect(() => { void load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]);
  if (!d) return <section className="card p-5">{err ? <p role="alert" className="font-bold text-red-700">{err}</p> : <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}<button type="button" onClick={onBack} className="mt-3 text-sm font-black text-ink/60 underline">← All assignments</button></section>;
  const a = d.assignment;
  const waiting = d.learners.filter((l) => l.state === "not-started" || l.state === "started" || l.state === "sent-back");
  const toMark = d.learners.filter((l) => l.state === "handed-in" || l.state === "late");
  const remind = reminderText(a.title, a.dueAt, waiting.map((l) => ({ name: l.name, link: l.link })), a.dueAt ? clock(a.dueAt) : "");
  async function settings(patch: Record<string, unknown>) {
    const { ok, j } = await api({ action: "settings", id, ...patch });
    setNote(ok ? "Saved ✓" : j.error ?? "Didn't save."); if (ok) { onChanged(); await load(); }
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setNote(`${what} copied ✓`); } catch { prompt("Copy this:", text); }
  }
  async function addLearner() {
    if (newName.trim().length < 2) return;
    const { ok, j } = await api({ action: "add-learner", name: newName });
    if (!ok) { setNote(j.error ?? "Couldn't add them."); return; }
    setNewName(""); await load(); await copy(j.link, `${newName.trim()}'s link`);
  }
  return (
    <section aria-label={`Assignment: ${a.title}`} className="card grid gap-4 p-4 sm:p-5">
      <button type="button" onClick={onBack} className="justify-self-start text-sm font-black text-ink/60 hover:text-ink">← All assignments</button>
      <div className="flex flex-wrap items-start gap-2">
        <div className="mr-auto min-w-0">
          <h2 className="font-display text-2xl font-black text-ink">{a.title}</h2>
          <p className="text-sm font-bold text-ink/60">{dueWords(a.dueAt)}{a.dueAt ? ` · ${clock(a.dueAt)}` : ""} · {a.items.length} question{a.items.length === 1 ? "" : "s"} · {a.items.reduce((s, x) => s + x.marks, 0)} marks{a.status === "closed" ? " · Closed" : ""}</p>
        </div>
        <button type="button" onClick={() => settings({ status: a.status === "open" ? "closed" : "open" })} className={`${btn} bg-white ring-1 ring-slate-200`}>{a.status === "open" ? "🔒 Close" : "🔓 Reopen"}</button>
        <button type="button" onClick={() => setDue(a.dueAt ? localInput(new Date(a.dueAt)) : "")} className={`${btn} bg-white ring-1 ring-slate-200`}>📅 Due date</button>
        <button type="button" onClick={async () => { if (confirm(`Delete "${a.title}" and everyone's work on it?`)) { const { ok } = await api({ action: "delete", id }); if (ok) onBack(); } }} className={`${btn} text-red-700 hover:bg-red-50`}>Delete</button>
      </div>
      {due != null && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="New due date" className="min-h-[40px] rounded-lg bg-white px-2 font-bold ring-1 ring-slate-200" />
          <button type="button" onClick={() => { void settings({ dueAt: due ? new Date(due).toISOString() : null }); setDue(null); }} className={`${btn} bg-violet-600 text-white`}>Save</button>
          <button type="button" onClick={() => setDue(null)} className="text-sm font-bold text-ink/60">Cancel</button>
        </div>
      )}
      {note && <p role="status" className="text-sm font-bold text-emerald-700">{note}</p>}
      {a.dueAt && <Reminder a={a} rows={d.learners} onToggle={(on) => settings({ remind: on })} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="How far everyone has got">
        {[["Not handed in", waiting.length, "bg-slate-50"], ["To mark", toMark.length, "bg-amber-50"], ["Late", d.learners.filter((l) => l.late).length, "bg-orange-50"], ["Marked", d.learners.filter((l) => l.state === "returned").length, "bg-emerald-50"]].map(([l, n, c]) => (
          <div key={l as string} className={`rounded-2xl ${c} p-3 text-center ring-1 ring-black/5`}><p className="font-display text-2xl font-black text-ink">{n as number}</p><p className="text-[11px] font-black uppercase tracking-wider text-ink/50">{l as string}</p></div>
        ))}
      </div>
      {toMark.length > 0 && <button type="button" onClick={() => onMark(toMark[0].id)} className="min-h-[48px] rounded-2xl bg-amber-500 px-4 text-base font-black text-white">✍️ Start marking ({toMark.length})</button>}
      <div className="flex flex-wrap gap-2">
        {waiting.length > 0 && <a href={`https://wa.me/?text=${encodeURIComponent(remind)}`} target="_blank" rel="noopener noreferrer" className={`${btn} flex items-center bg-[#25D366] text-white`}>📲 Remind {waiting.length} on WhatsApp</a>}
        <button type="button" onClick={() => copy(d.learners.map((l) => `${l.name}: ${l.link}`).join("\n"), "Everyone's links")} className={`${btn} bg-white ring-1 ring-slate-200`}>🔗 Copy everyone&apos;s links</button>
      </div>
      <ul className="grid gap-1.5" aria-label="Learners">
        {d.learners.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-line">
            <span className="min-w-0 flex-1 truncate font-black text-ink">{l.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${STATE_LOOK[l.state]}`}>{STATUS_LABEL[l.state]}{l.tries ? ` · try ${l.tries + 1}` : ""}</span>
            {l.score != null && l.state !== "not-started" && <span className="text-xs font-black text-ink/70">{l.score}/{l.total}{l.toMark && l.state !== "returned" ? ` + ${l.toMark} to mark` : ""}</span>}
            {l.state !== "not-started" && <button type="button" onClick={() => onMark(l.id)} className="min-h-[36px] rounded-lg bg-violet-600 px-3 text-xs font-black text-white" aria-label={`${l.state === "returned" ? "See" : "Mark"} ${l.name}'s work`}>{l.state === "returned" ? "See" : "Mark"}</button>}
            <button type="button" onClick={() => copy(l.link, `${l.name}'s link`)} className="min-h-[36px] rounded-lg bg-slate-100 px-2 text-xs font-black text-ink/70" aria-label={`Copy ${l.name}'s link`}>🔗 Link</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`📚 ${l.name}, your homework "${a.title}" (${dueWords(a.dueAt).toLowerCase()}): ${l.link}`)}`} target="_blank" rel="noopener noreferrer" className="min-h-[36px] rounded-lg bg-[#E7F8EE] px-2 py-2 text-xs font-black text-[#128C4B]" aria-label={`Send ${l.name} their link on WhatsApp`}>WhatsApp</a>
          </li>
        ))}
        {!d.learners.length && <li className="rounded-xl bg-slate-50 p-4 text-center text-sm text-ink/55">No learners yet — learners in the class appear here, or add someone below.</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-black text-ink/60">Missed the class?
          <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder="Their name" className="min-h-[40px] min-w-0 flex-1 rounded-lg bg-white px-3 text-sm font-bold ring-1 ring-slate-200" />
        </label>
        <button type="button" onClick={addLearner} disabled={newName.trim().length < 2} className={`${btn} bg-violet-600 text-white disabled:opacity-40`}>Add &amp; copy their link</button>
      </div>
    </section>
  );
}

// ── Marking one learner's work ──
function Marker({ sessionId, id, studentId, api, onBack, onNext, onChanged }: {
  sessionId: string; id: string; studentId: string; api: Api; onBack: () => void; onNext: (studentId: string) => void; onChanged: () => void;
}) {
  const [d, setD] = useState<{ assignment: Assignment; entry: Entry | null; name: string; status: Status } | null>(null);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, PageNote>>({});
  const [feedback, setFeedback] = useState("");
  const [tool, setTool] = useState<MarkTool>("tick"), [colour, setColour] = useState(TEACHER_PENS[0]);
  const [saved, setSaved] = useState<Record<string, "saved" | "saving" | "unsaved">>({});
  const [note, setNote] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pending = useRef<Record<string, PageNote>>({});
  useEffect(() => {
    let gone = false;
    setD(null); setNote(null);
    fetch(`/api/board/assignments?sessionId=${sessionId}&id=${id}&studentId=${studentId}`, { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (gone) return;
      if (!j.assignment) { setNote(j.error ?? "Couldn't open their work."); return; }
      setD(j); setMarks(j.entry?.marks ?? {}); setNotes(j.entry?.notes ?? {}); setFeedback(j.entry?.feedback ?? "");
    }).catch(() => setNote("Couldn't open their work — check the internet."));
    fetch(`/api/board/assignments?sessionId=${sessionId}&id=${id}`, { cache: "no-store" }).then((r) => r.json())
      .then((j) => { if (!gone) setQueue((j.learners ?? []).filter((l: Row) => (l.state === "handed-in" || l.state === "late") && l.id !== studentId).map((l: Row) => l.id)); }).catch(() => {});
    return () => { gone = true; };
  }, [sessionId, id, studentId]);
  const flush = useCallback(async () => {
    const all = Object.entries(pending.current); pending.current = {};
    for (const [key, p] of all) {
      clearTimeout(timers.current[key]);
      setSaved((s) => ({ ...s, [key]: "saving" }));
      const { ok } = await api({ action: "annotate", id, studentId, key, ink: p.ink, note: p.note });
      setSaved((s) => ({ ...s, [key]: ok ? "saved" : "unsaved" }));
    }
  }, [api, id, studentId]);
  useEffect(() => () => { void flush(); }, [flush]);
  if (!d) return <section className="card p-5">{note ? <p role="alert" className="font-bold text-red-700">{note}</p> : <div className="h-60 animate-pulse rounded-2xl bg-slate-100" />}<button type="button" onClick={onBack} className="mt-3 text-sm font-black text-ink/60 underline">← Back</button></section>;
  const a = d.assignment, e = d.entry;
  if (!e) return <section className="card p-5"><p className="font-bold text-ink/70">{d.name} hasn&apos;t started yet.</p><button type="button" onClick={onBack} className="mt-3 text-sm font-black text-ink/60 underline">← Back</button></section>;
  const sc = scoreOf(a.items, e.answers, marks);
  const annotate = (key: string, p: PageNote) => {
    setNotes((n) => ({ ...n, [key]: p })); setSaved((s) => ({ ...s, [key]: "unsaved" }));
    pending.current[key] = p; clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void flush(), 800);
  };
  async function give(n: number, m: number | null) {
    const before = marks;
    setMarks((cur) => { const x = { ...cur }; if (m == null) delete x[String(n)]; else x[String(n)] = m; return x; });
    const { ok, j } = await api({ action: "mark", id, studentId, n, mark: m });
    if (!ok) { setMarks(before); setNote(j.error ?? "That mark didn't save."); }
  }
  async function finish(how: "return" | "redo") {
    setBusy(true); setNote(null); await flush();
    const { ok, j } = await api({ action: how, id, studentId, feedback });
    setBusy(false);
    if (!ok) { setNote(j.error ?? "Didn't go through — try again."); return; }
    onChanged();
    if (queue.length) onNext(queue[0]); else onBack();
  }
  return (
    <section aria-label={`Marking ${d.name}'s work`} className="card grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={async () => { await flush(); onBack(); }} className="text-sm font-black text-ink/60 hover:text-ink">← {a.title}</button>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-black ${STATE_LOOK[d.status]}`}>{STATUS_LABEL[d.status]}{e.submittedAt ? ` · ${clock(e.submittedAt)}` : ""}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-auto font-display text-2xl font-black text-ink">{d.name}</h2>
        <p className="font-display text-3xl font-black text-violet-700" aria-label="Score so far">{sc.score}<span className="text-lg text-ink/40"> / {sc.total}</span></p>
      </div>
      {sc.toMark.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">✍️ To mark: {sc.toMark.map((n) => `Q${n + 1}`).join(", ")}</p>}
      {a.items.map((it, n) => {
        const v = e.answers[String(n)], t = marks[String(n)], got = itemMark(it, v, t), auto = isAuto(it) ? itemMark(it, v) : null;
        const k = KINDS.find((y) => y.kind === it.kind)!;
        return (
          <article key={n} className="grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200" aria-label={`Question ${n + 1}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-black text-violet-800">Q{n + 1} · {k.icon} {k.label}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-black ${got == null ? "bg-amber-100 text-amber-900" : got === it.marks ? "bg-emerald-100 text-emerald-800" : got === 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-ink"}`}>{got == null ? "To mark" : `${got} / ${it.marks}`}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm font-bold text-ink">{it.q}</p>
            {it.img && it.kind !== "page" && <img src={it.img} alt="For this question" className="max-h-48 w-auto self-start rounded-lg ring-1 ring-slate-200" />}
            <TheirAnswer it={it} v={v} n={n} notes={notes} saved={saved} tool={tool} setTool={setTool} colour={colour} setColour={setColour} name={d.name}
              annotate={annotate} onTicks={(m) => give(n, Math.min(it.marks, m))} />
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Mark for question ${n + 1}`}>
              {Array.from({ length: it.marks + 1 }, (_, m) => (
                <button key={m} type="button" onClick={() => give(n, m)} aria-pressed={got === m && (t != null || auto != null)} aria-label={`${m} mark${m === 1 ? "" : "s"} for question ${n + 1}`}
                  className={`h-10 min-w-[40px] rounded-lg text-sm font-black ${got === m && got != null ? "bg-violet-600 text-white" : "bg-slate-50 text-ink ring-1 ring-slate-200"}`}>{m}</button>
              ))}
              {isAuto(it) && t != null && <button type="button" onClick={() => give(n, null)} className="ml-1 text-xs font-black text-ink/55 underline">Use the automatic mark ({auto})</button>}
              {isAuto(it) && t == null && <span className="ml-1 text-[11px] font-bold text-ink/45">Marked automatically — tap to change</span>}
            </div>
          </article>
        );
      })}
      <div className="grid gap-2 rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
        <label className="text-xs font-black text-violet-900" htmlFor="hw-feedback">Feedback for {d.name.split(" ")[0]}</label>
        <div className="flex flex-wrap gap-1.5">
          {["Excellent work! ⭐", "Good effort — check your working.", "Show all your steps.", "See me about the last question.", "Neat and clear — well done."].map((c) => (
            <button key={c} type="button" onClick={() => setFeedback((f) => (f.trim() ? `${f.trim()} ${c}` : c))} className="min-h-[32px] rounded-full bg-white px-3 text-xs font-bold text-ink/70 ring-1 ring-violet-200">{c}</button>
          ))}
        </div>
        <textarea id="hw-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={1000} placeholder="What went well, and what to work on next"
          className="w-full rounded-xl bg-white p-3 text-sm font-semibold ring-1 ring-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      {note && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{note}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => finish("return")} disabled={busy || sc.toMark.length > 0} className="min-h-[52px] rounded-2xl bg-emerald-600 px-5 text-base font-black text-white disabled:opacity-40">
          ✓ Return to {d.name.split(" ")[0]} ({sc.score}/{sc.total}){queue.length ? " · next →" : ""}
        </button>
        <button type="button" onClick={() => finish("redo")} disabled={busy} className="min-h-[52px] rounded-2xl bg-amber-100 px-4 text-sm font-black text-amber-900">↩ Send back to try again</button>
      </div>
    </section>
  );
}

// What they did for one question — with the teacher's marking tools where they wrote or uploaded.
function TheirAnswer({ it, v, n, notes, saved, tool, setTool, colour, setColour, name, annotate, onTicks }: {
  it: AItem; v: unknown; n: number; notes: Record<string, PageNote>; saved: Record<string, "saved" | "saving" | "unsaved">;
  tool: MarkTool; setTool: (t: MarkTool) => void; colour: string; setColour: (c: string) => void; name: string;
  annotate: (key: string, p: PageNote) => void; onTicks: (m: number) => void;
}) {
  const [pic, setPic] = useState(0);
  if (it.kind === "choice") {
    return (
      <ul className="grid gap-1">
        {it.options.map((o, j) => (
          <li key={j} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${j === it.answer ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300" : v === j ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "text-ink/60"}`}>
            {String.fromCharCode(65 + j)}. {o}{v === j ? " ← their answer" : ""}{j === it.answer ? " ✓" : ""}
          </li>
        ))}
        {v == null && <li className="text-xs font-bold text-ink/45">No answer</li>}
      </ul>
    );
  }
  if (it.kind === "typed") return <p className="text-sm font-bold"><span className="rounded-lg bg-slate-50 px-2 py-1 ring-1 ring-slate-200">{String(v ?? "").trim() || "(no answer)"}</span> <span className="ml-2 text-xs text-emerald-800">Answer: {String(it.answer).split("|")[0]}</span></p>;
  if (it.kind === "written") {
    return (
      <div className="grid gap-1.5">
        <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed ring-1 ring-slate-200">{String(v ?? "").trim() || "(no answer)"}</p>
        {String(it.answer).trim() && <p className="whitespace-pre-wrap rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200"><span className="block text-[10px] font-black uppercase text-emerald-800/70">Your mark scheme</span>{String(it.answer)}</p>}
      </div>
    );
  }
  const tools = (key: string) => (
    <MarkTools note={notes[key] ?? { ink: [], note: "" }} tool={tool} setTool={setTool} colour={colour} setColour={setColour} max={it.marks} name={name}
      saved={saved[key] ?? null} onChange={(p) => annotate(key, p)} onUse={onTicks} />
  );
  if (it.kind === "upload") {
    const imgs = ((v as { imgs?: string[] } | null)?.imgs ?? []);
    if (!imgs.length) return <p className="text-sm font-bold text-ink/45">Nothing uploaded.</p>;
    const key = noteKeyFor(n, Math.min(pic, imgs.length - 1));
    return (
      <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-2">
          {imgs.length > 1 && <div className="flex flex-wrap gap-1" role="tablist" aria-label="Their pages">{imgs.map((_, i) => <button key={i} type="button" role="tab" aria-selected={pic === i} onClick={() => setPic(i)} className={`h-8 min-w-[64px] rounded-lg px-2 text-xs font-black ${pic === i ? "bg-ink text-white" : "bg-slate-100"}`}>Page {i + 1}</button>)}</div>}
          <div className="max-h-[70vh] overflow-auto rounded-xl ring-1 ring-slate-200">
            <AnnotatedPage key={key} src={imgs[Math.min(pic, imgs.length - 1)]} ink={[]} teacher={(notes[key]?.ink) ?? []} tool={tool} colour={colour}
              onTeacher={(ink) => annotate(key, { ...(notes[key] ?? { note: "" }), ink })} label={`${name}'s upload, page ${pic + 1}`} />
          </div>
        </div>
        {tools(key)}
      </div>
    );
  }
  // A page of the PDF, or their board.
  const key = noteKeyFor(n), p = (v as { ink?: unknown[]; text?: string } | null) ?? {};
  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
      <div className="grid gap-1.5">
        <div className="max-h-[70vh] overflow-auto rounded-xl ring-1 ring-slate-200">
          <AnnotatedPage src={it.kind === "page" ? it.img : null} ink={(p.ink ?? []) as never} teacher={(notes[key]?.ink) ?? []} tool={tool} colour={colour}
            onTeacher={(ink) => annotate(key, { ...(notes[key] ?? { note: "" }), ink })} label={`${name}'s ${it.kind === "page" ? "page" : "board"}`} />
        </div>
        {p.text?.trim() && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm font-semibold ring-1 ring-slate-200"><span className="block text-[10px] font-black uppercase text-ink/45">Typed</span>{p.text}</p>}
      </div>
      {tools(key)}
    </div>
  );
}

// The evening-before email to parents: on or off, who gets it, and when it went.
function Reminder({ a, rows, onToggle }: { a: Assignment; rows: Row[]; onToggle: (on: boolean) => void }) {
  const withEmail = rows.filter((r) => r.parentEmail).length, on = a.remind !== false;
  const sentAt = a.remindedAt ? new Date(a.remindedAt).toLocaleString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" }) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm ring-1 ring-sky-200" aria-label="Reminder emails">
      <span className="min-w-0 flex-1 font-bold text-sky-900">
        📧 {sentAt ? `Reminder emails went ${sentAt}.` : !on ? "No reminder email for this one."
          : withEmail ? `${withEmail} parent${withEmail === 1 ? "" : "s"} with an email will get a reminder the evening before it's due (only if it isn't handed in).`
          : "No parents have an email saved — use “Remind on WhatsApp” instead."}
        {on && !sentAt && withEmail < rows.length && withEmail > 0 && <span className="block text-xs font-semibold text-sky-800/70">The others have no email (or a WhatsApp number) — remind them on WhatsApp.</span>}
      </span>
      {!sentAt && <button type="button" onClick={() => onToggle(!on)} className="min-h-[36px] rounded-lg bg-white px-3 text-xs font-black text-sky-900 ring-1 ring-sky-300">{on ? "Turn off" : "Turn on"}</button>}
    </div>
  );
}

