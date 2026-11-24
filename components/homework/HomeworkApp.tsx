"use client";
// A learner's homework (/homework?t=…): their personal link opens every
// assignment their teacher set for the class — no account. They answer in any
// mode (choices, short and written answers, a board, pages of a PDF, photos or
// a PDF of paper work); everything saves as they go; they hand it in; and when
// it comes back marked they see their score, the teacher's ticks and comments
// on their pages, the answers and worked solutions (if the teacher allows).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageCanvas } from "@/components/live/board/PaperPages";
import { AnnotatedPage } from "@/components/live/board/PageAnnotate";
import { PAPER_FIT, sendSlides } from "@/components/live/board/slides";
import type { PageNote } from "@/lib/examAnnotate";
import type { Stroke } from "@/lib/whiteboard";
import { KINDS, MAX_UPLOADS, STATUS_LABEL, answeredCount, dueWords, isBlank, noteKeyFor, type AItem, type Assignment, type Status } from "@/lib/assignments";

type Listed = { id: string; title: string; dueAt: string | null; lateOk: boolean; status: "open" | "closed"; count: number; state: Status; score: number | null; total: number | null };
type Klass = { title: string; teacher: string };
type Mine = { answers: Record<string, unknown>; submittedAt: string | null; returnedAt: string | null; sentBack: boolean; tries: number; feedback: string;
  notes: Record<string, PageNote>; marks: (number | null)[] | null; score: number | null; total: number | null } | null;
type One = { klass: Klass; link: string; name: string; assignment: Assignment; entry: Mine; status: Status; can: { ok: boolean; why?: string } };

const clock = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const STATE_LOOK: Record<Status, string> = {
  "not-started": "bg-violet-100 text-violet-800", started: "bg-sky-100 text-sky-800", "handed-in": "bg-emerald-100 text-emerald-800",
  late: "bg-orange-100 text-orange-900", returned: "bg-amber-100 text-amber-900", "sent-back": "bg-fuchsia-100 text-fuchsia-800",
};
const STATE_WORDS: Record<Status, string> = { ...STATUS_LABEL, "not-started": "To do", started: "Started", returned: "Marked ⭐" };

export default function HomeworkApp() {
  const params = useSearchParams(), router = useRouter();
  const t = params.get("t") ?? "", openId = params.get("id");
  const [list, setList] = useState<{ klass: Klass; link: string; name: string; assignments: Listed[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!t) { setErr("Open the homework link your teacher sent you."); return; }
    const r = await fetch(`/api/board/assignments?t=${encodeURIComponent(t)}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't open your homework — check the internet and try again."); return; }
    setErr(null); setList(j);
  }, [t]);
  useEffect(() => { void load(); }, [load]);
  const open = (id: string | null) => router.push(`/homework?t=${encodeURIComponent(t)}${id ? `&id=${id}` : ""}`, { scroll: true });

  return (
    <div className="learner-app min-h-dvh pb-16">
      <header className="lrn-bar mx-auto mt-0 max-w-3xl rounded-b-[1.75rem] px-5 pb-5 pt-6 text-white sm:mt-4 sm:rounded-[1.75rem]">
        <p className="text-xs font-black uppercase tracking-[.18em] text-[#FDE047]">📚 My homework</p>
        <h1 className="mt-1 font-display text-2xl font-black leading-tight">{list?.klass.title ?? "Homework"}</h1>
        {list && <p className="text-sm font-semibold text-white/80">{list.name} · with {list.klass.teacher}</p>}
      </header>
      <main className="mx-auto grid max-w-3xl gap-4 px-4 pt-4">
        {err && <div role="alert" className="rounded-3xl bg-white p-6 text-center shadow-sm"><p className="text-3xl" aria-hidden>🔗</p><p className="mt-2 font-black text-ink">{err}</p></div>}
        {!err && !list && <div className="h-40 animate-pulse rounded-3xl bg-white/70" />}
        {list && openId && <AssignmentView t={t} id={openId} onBack={() => { open(null); void load(); }} />}
        {list && !openId && <HomeList list={list} onOpen={(id) => open(id)} />}
      </main>
    </div>
  );
}

function HomeList({ list, onOpen }: { list: { link: string; name: string; assignments: Listed[] }; onOpen: (id: string) => void }) {
  const todo = list.assignments.filter((a) => a.state === "not-started" || a.state === "started" || a.state === "sent-back");
  return (
    <>
      {!list.assignments.length && (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-4xl" aria-hidden>🎉</p>
          <p className="mt-2 text-lg font-black text-ink">No homework yet</p>
          <p className="text-sm text-ink/60">When your teacher sets some, it appears here. Keep this link!</p>
        </div>
      )}
      {list.assignments.length > 0 && (
        <p className="text-sm font-black text-ink/70">{todo.length ? `${todo.length} to do` : "All done — well done! 🎉"}</p>
      )}
      <ul className="grid gap-3" aria-label="My assignments">
        {list.assignments.map((a) => {
          const overdue = a.dueAt && new Date(a.dueAt).getTime() < Date.now() && (a.state === "not-started" || a.state === "started" || a.state === "sent-back");
          return (
            <li key={a.id}>
              <button type="button" onClick={() => onOpen(a.id)} className="w-full rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-violet-100 transition active:scale-[.99]" aria-label={`Open ${a.title}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl" aria-hidden>{a.state === "returned" ? "⭐" : a.state === "handed-in" || a.state === "late" ? "✅" : "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black text-ink">{a.title}</p>
                    <p className={`text-xs font-bold ${overdue ? "text-orange-700" : "text-ink/55"}`}>{dueWords(a.dueAt)}{a.dueAt ? ` · ${clock(a.dueAt)}` : ""}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${STATE_LOOK[a.state]}`}>{STATE_WORDS[a.state]}</span>
                      {a.score != null && <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-black text-white">{a.score} / {a.total}</span>}
                      <span className="text-[11px] font-bold text-ink/45">{a.count} question{a.count === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                  <span className="self-center text-xl text-violet-400" aria-hidden>›</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <KeepLink link={list.link} name={list.name} />
    </>
  );
}

// This link is how they come back (no account): keep it, or send it home.
function KeepLink({ link, name }: { link: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const full = typeof window !== "undefined" ? `${window.location.origin}${link}` : link;
  return (
    <section aria-label="Keep your link" className="rounded-3xl bg-white/80 p-4 ring-1 ring-violet-100">
      <p className="text-sm font-black text-ink">🔖 Keep this page</p>
      <p className="text-xs font-semibold text-ink/60">It&apos;s your own link — no account needed. Bookmark it, or add it to your home screen (browser menu → Add to Home screen).</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt("Copy your link:", full); } }}
          className="min-h-[40px] rounded-xl bg-violet-600 px-3 text-sm font-black text-white">{copied ? "Copied ✓" : "Copy my link"}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${name}'s homework: ${full}`)}`} target="_blank" rel="noopener noreferrer" className="flex min-h-[40px] items-center rounded-xl bg-[#25D366] px-3 text-sm font-black text-white">Send to a parent</a>
      </div>
    </section>
  );
}

// ── One assignment ──
function AssignmentView({ t, id, onBack }: { t: string; id: string; onBack: () => void }) {
  const [d, setD] = useState<One | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null), [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState<"saving" | "saved" | "error" | null>(null);
  const [busy, setBusy] = useState(false), [confirmIn, setConfirmIn] = useState(false);
  const queue = useRef<Map<number, unknown>>(new Map()), running = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/board/assignments?t=${encodeURIComponent(t)}&id=${id}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't open it — check the internet."); return; }
    setErr(null); setD(j); setAnswers(j.entry?.answers ?? {});
  }, [t, id]);
  useEffect(() => { void load(); }, [load]);
  const post = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch("/api/board/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, id, ...body }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return { ok: !!r?.ok, j };
  }, [t, id]);
  // Saving: one answer at a time, the latest of each, so nothing is lost or overwritten.
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (queue.current.size) {
        const [n, value] = queue.current.entries().next().value as [number, unknown];
        queue.current.delete(n);
        setSaving("saving");
        const { ok, j } = await post({ action: "answer", n, value });
        if (!ok) { setSaving("error"); setNote(j.error ?? "Your work didn't save — check the internet."); if (!queue.current.has(n)) queue.current.set(n, value); await new Promise((ok2) => setTimeout(ok2, 4000)); continue; }
        setNote(null);
      }
      setSaving("saved");
    } finally { running.current = false; }
  }, [post]);
  const change = (n: number, value: unknown, now = false) => {
    setAnswers((a) => ({ ...a, [String(n)]: value }));
    queue.current.set(n, value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void pump(), now ? 0 : 700);
  };
  const flush = async () => { if (timer.current) clearTimeout(timer.current); await pump(); while (running.current) await new Promise((ok) => setTimeout(ok, 100)); };
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (queue.current.size || running.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (err) return <div role="alert" className="rounded-3xl bg-white p-6 text-center"><p className="font-black text-ink">{err}</p><button type="button" onClick={onBack} className="mt-3 text-sm font-black text-violet-700 underline">← My homework</button></div>;
  if (!d) return <div className="h-60 animate-pulse rounded-3xl bg-white/70" />;
  const a = d.assignment, e = d.entry, returned = !!e?.returnedAt, can = d.can.ok;
  const done = answeredCount(a.items, answers), blank = a.items.length - done;
  async function handIn() {
    setBusy(true); setNote(null); await flush();
    const { ok, j } = await post({ action: "submit" });
    setBusy(false); setConfirmIn(false);
    if (!ok) { setNote(j.error ?? "It didn't hand in — check the internet and try again."); return; }
    await load();
  }
  async function takeBack() {
    setBusy(true);
    const { ok, j } = await post({ action: "unsubmit" });
    setBusy(false);
    if (!ok) { setNote(j.error ?? "Couldn't take it back."); return; }
    await load();
  }
  return (
    <div className="grid gap-4">
      <button type="button" onClick={async () => { await flush(); onBack(); }} className="justify-self-start text-sm font-black text-violet-700">← My homework</button>
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATE_LOOK[d.status]}`}>{STATE_WORDS[d.status]}</span>
          <span className="text-xs font-bold text-ink/55">{dueWords(a.dueAt)}{a.dueAt ? ` · ${clock(a.dueAt)}` : ""}</span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-black text-ink">{a.title}</h2>
        {a.instructions && <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-ink/70">{a.instructions}</p>}
        {a.files.length > 0 && (
          <details className="mt-3 rounded-2xl bg-violet-50 p-3">
            <summary className="cursor-pointer text-sm font-black text-violet-900">📎 Notes from your teacher ({a.files.length} page{a.files.length === 1 ? "" : "s"})</summary>
            <div className="mt-2 grid gap-2">{a.files.map((u, i) => <img key={u} src={u} alt={`Notes, page ${i + 1}`} loading="lazy" className="w-full rounded-xl ring-1 ring-violet-100" />)}</div>
          </details>
        )}
      </section>

      {returned && (
        <section aria-label="Your mark" className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-5 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#FDE047]">Marked ⭐</p>
          <p className="font-display text-5xl font-black">{e!.score}<span className="text-2xl text-white/70"> / {e!.total}</span></p>
          {e!.total ? <p className="text-sm font-bold text-white/80">{Math.round(((e!.score ?? 0) / e!.total) * 100)}%</p> : null}
          {e!.feedback && <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-white/15 p-3 text-sm font-semibold"><span className="block text-[11px] font-black uppercase tracking-wider text-white/70">💬 From {d.klass.teacher}</span>{e!.feedback}</p>}
        </section>
      )}
      {!returned && e?.sentBack && (
        <p role="status" className="rounded-2xl bg-fuchsia-50 p-4 text-sm font-black text-fuchsia-900 ring-1 ring-fuchsia-200">↩ Your teacher sent this back — have another go, then hand it in again.{e.feedback ? <span className="mt-1 block font-semibold">💬 {e.feedback}</span> : null}</p>
      )}
      {!returned && e?.submittedAt && (
        <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-900 ring-1 ring-emerald-200">
          ✅ Handed in {clock(e.submittedAt)}{d.status === "late" ? " (late)" : ""} — your teacher will mark it.
          {a.status === "open" && <button type="button" onClick={takeBack} disabled={busy} className="ml-2 font-black text-emerald-800 underline">Take it back to change something</button>}
        </div>
      )}
      {!can && !returned && !e?.submittedAt && d.can.why && <p role="status" className="rounded-2xl bg-slate-100 p-4 text-sm font-black text-ink/70">🔒 {d.can.why}</p>}

      {a.items.map((it, n) => (
        <ItemCard key={n} it={it} n={n} v={answers[String(n)]} locked={!can} t={t} assignmentId={a.id}
          mark={e?.marks?.[n] ?? null} returned={returned} notes={e?.notes ?? {} } onChange={(v, now) => change(n, v, now)} />
      ))}

      {can && (
        <div className="sticky bottom-3 z-10 grid gap-2 rounded-3xl bg-white/95 p-3 shadow-xl ring-1 ring-violet-100 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="text-ink/70">{done} of {a.items.length} answered</span>
            <span className="ml-auto text-ink/50" role="status">{saving === "saving" ? "Saving…" : saving === "saved" ? "✓ All saved" : saving === "error" ? "⚠ Not saved yet" : ""}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-violet-100" aria-hidden><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${(done / Math.max(1, a.items.length)) * 100}%` }} /></div>
          {confirmIn ? (
            <div className="grid gap-2">
              <p className="text-sm font-black text-ink">{blank ? `${blank} question${blank === 1 ? " is" : "s are"} still blank. Hand in anyway?` : "Hand in your homework now?"}</p>
              <div className="flex gap-2">
                <button type="button" onClick={handIn} disabled={busy} className="lrn-go flex-1">{busy ? "Handing in…" : "Yes, hand it in"}</button>
                <button type="button" onClick={() => setConfirmIn(false)} className="min-h-[56px] rounded-2xl bg-slate-100 px-4 font-black text-ink/70">Not yet</button>
              </div>
            </div>
          ) : <button type="button" onClick={() => setConfirmIn(true)} disabled={busy} className="lrn-go">✅ Hand in</button>}
        </div>
      )}
      {note && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{note}</p>}
    </div>
  );
}

// ── One question ──
function ItemCard({ it, n, v, locked, t, assignmentId, mark, returned, notes, onChange }: {
  it: AItem; n: number; v: unknown; locked: boolean; t: string; assignmentId: string; mark: number | null; returned: boolean;
  notes: Record<string, PageNote>; onChange: (v: unknown, now?: boolean) => void;
}) {
  const k = KINDS.find((x) => x.kind === it.kind)!;
  const reveal = returned && (it.kind === "choice" ? Number(it.answer) >= 0 : !!String(it.answer ?? "").trim());
  const field = "w-full rounded-2xl bg-violet-50/60 px-4 py-3 text-base font-bold text-ink ring-2 ring-violet-100 focus:bg-white focus:outline-none focus:ring-violet-500 disabled:opacity-80";
  return (
    <article aria-label={`Question ${n + 1}`} className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-violet-100">
      <div className="flex items-center gap-2">
        <span className="flex h-8 min-w-[32px] items-center justify-center rounded-xl bg-violet-600 px-2 text-sm font-black text-white">{n + 1}</span>
        <span className="text-xs font-black text-violet-700">{k.icon} {it.kind === "upload" ? "Upload your work" : it.kind === "board" ? "Write on the board" : it.kind === "page" ? "Write on the page" : k.label}</span>
        <span className="ml-auto text-xs font-bold text-ink/45">{returned && mark != null ? <b className={mark === it.marks ? "text-emerald-700" : mark === 0 ? "text-red-600" : "text-ink"}>{mark} / {it.marks}</b> : `${it.marks} mark${it.marks === 1 ? "" : "s"}`}</span>
      </div>
      <p className="whitespace-pre-wrap text-base font-bold leading-snug text-ink">{it.q}</p>
      {it.img && it.kind !== "page" && <img src={it.img} alt={`For question ${n + 1}`} className="w-full rounded-2xl ring-1 ring-violet-100" />}

      {it.kind === "choice" && (
        <div className="grid gap-2" role="radiogroup" aria-label={`Answer to question ${n + 1}`}>
          {it.options.map((o, j) => {
            const mine = v === j, right = reveal && j === it.answer;
            return (
              <button key={j} type="button" role="radio" aria-checked={mine} disabled={locked} onClick={() => onChange(j, true)}
                className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-left text-base font-bold ring-2 transition ${right ? "bg-emerald-50 ring-emerald-400" : mine ? (returned ? "bg-red-50 ring-red-300" : "bg-violet-600 text-white ring-violet-600") : "bg-white ring-violet-100"} disabled:cursor-default`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${mine && !returned ? "bg-white text-violet-700" : "bg-violet-100 text-violet-800"}`}>{String.fromCharCode(65 + j)}</span>{o}{right ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}
      {it.kind === "typed" && (
        <>
          <input value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} disabled={locked} maxLength={200} aria-label={`Answer to question ${n + 1}`} placeholder="Your answer" autoComplete="off" className={field} />
          {reveal && <p className="text-sm font-black text-emerald-800">Answer: {String(it.answer).split("|")[0]}</p>}
        </>
      )}
      {it.kind === "written" && <textarea value={String(v ?? "")} onChange={(e) => onChange(e.target.value)} disabled={locked} rows={5} maxLength={3000} aria-label={`Answer to question ${n + 1}`} placeholder="Write your answer here" className={field} />}
      {(it.kind === "board" || it.kind === "page") && (returned
        ? <MarkedInk src={it.kind === "page" ? it.img : undefined} v={v} note={notes[noteKeyFor(n)]} label={`Your ${it.kind}, marked`} />
        : <InkPad src={it.kind === "page" ? it.img : undefined} v={v} locked={locked} onChange={onChange} label={it.kind === "page" ? `${it.q} — write on it` : `Question ${n + 1} board`} />)}
      {it.kind === "upload" && <Uploads n={n} v={v} locked={locked} t={t} assignmentId={assignmentId} returned={returned} notes={notes} onChange={onChange} />}
      {returned && it.why && <p className="whitespace-pre-wrap rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200"><span className="block text-[11px] font-black uppercase tracking-wider text-emerald-800/70">💡 Worked solution</span>{it.why}</p>}
      {!returned && !locked && isBlank(it, v) && <span className="sr-only">Not answered yet</span>}
    </article>
  );
}

const PENS = ["#0B1220", "#1657C9", "#DC2626"];
// Writing on a board or a page of the PDF: pen colours, rubber, undo, zoom and move.
function InkPad({ src, v, locked, onChange, label }: { src?: string; v: unknown; locked: boolean; onChange: (v: unknown, now?: boolean) => void; label: string }) {
  const cur = (v && typeof v === "object" ? v : {}) as { ink?: Stroke[]; text?: string };
  const ink = cur.ink ?? [], text = cur.text ?? "";
  const [colour, setColour] = useState(PENS[0]), [rubber, setRubber] = useState(false);
  const [mode, setMode] = useState<"write" | "move">("write"), [zoom, setZoom] = useState(1);
  const live = useRef<Stroke | null>(null);
  const tool = "min-h-[40px] rounded-xl px-3 text-xs font-black";
  const set = (next: Stroke[], now = false) => onChange({ ink: next.slice(-400), text }, now);
  return (
    <div className="grid gap-2">
      {!locked && (
        <div className="flex flex-wrap items-center gap-1.5">
          {src && (
            <span className="flex overflow-hidden rounded-xl ring-1 ring-violet-200" role="group" aria-label="Write or move">
              <button type="button" onClick={() => setMode("write")} aria-pressed={mode === "write"} className={`${tool} rounded-none ${mode === "write" ? "bg-violet-600 text-white" : "bg-white"}`}>✏️ Write</button>
              <button type="button" onClick={() => setMode("move")} aria-pressed={mode === "move"} className={`${tool} rounded-none ${mode === "move" ? "bg-violet-600 text-white" : "bg-white"}`}>✋ Move</button>
            </span>
          )}
          {src && [1, 2].map((z) => <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} aria-label={`Zoom ${z}×`} className={`${tool} ${zoom === z ? "bg-ink text-white" : "bg-white ring-1 ring-violet-200"}`}>{z}×</button>)}
          {PENS.map((c) => <button key={c} type="button" onClick={() => { setColour(c); setRubber(false); setMode("write"); }} aria-label={`Pen colour ${c}`} aria-pressed={!rubber && colour === c}
            className={`h-9 w-9 rounded-full ring-2 ring-offset-1 ${!rubber && colour === c ? "ring-violet-600" : "ring-transparent"}`} style={{ background: c }} />)}
          <button type="button" onClick={() => setRubber(!rubber)} aria-pressed={rubber} className={`${tool} ${rubber ? "bg-ink text-white" : "bg-white ring-1 ring-violet-200"}`}>Rubber</button>
          <button type="button" onClick={() => set(ink.slice(0, -1), true)} disabled={!ink.length} className={`${tool} bg-white ring-1 ring-violet-200 disabled:opacity-40`}>Undo</button>
          <button type="button" onClick={() => { if (confirm("Clear everything you wrote here?")) set([], true); }} disabled={!ink.length} className={`${tool} bg-white ring-1 ring-violet-200 disabled:opacity-40`}>Clear</button>
        </div>
      )}
      <div className={`${src ? "max-h-[70dvh]" : ""} overflow-auto rounded-2xl ring-2 ring-violet-200`}>
        <PageCanvas src={src} ink={ink} live={live} zoom={zoom} label={label}
          onStroke={!locked && mode === "write" ? { by: "me", color: colour, rubber, done: (s) => set([...ink, s]) } : null} />
      </div>
      {src && !locked && <input value={text} onChange={(e) => onChange({ ink, text: e.target.value })} maxLength={1000} placeholder="Or type answers for this page (optional)" aria-label="Typed answers for this page"
        className="w-full rounded-xl bg-violet-50/60 px-3 py-2 text-sm font-bold ring-1 ring-violet-100" />}
    </div>
  );
}

// Their board or page back, with the teacher's marking and comment on it.
function MarkedInk({ src, v, note, label }: { src?: string; v: unknown; note?: PageNote; label: string }) {
  const cur = (v && typeof v === "object" ? v : {}) as { ink?: Stroke[] };
  return (
    <div className="grid gap-2">
      <div className="max-h-[70dvh] overflow-auto rounded-2xl ring-2 ring-violet-200"><AnnotatedPage src={src ?? null} ink={cur.ink ?? []} teacher={note?.ink ?? []} label={label} /></div>
      {note?.note && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">💬 {note.note}</p>}
    </div>
  );
}

// Photos or a PDF of work done on paper.
function Uploads({ n, v, locked, t, assignmentId, returned, notes, onChange }: {
  n: number; v: unknown; locked: boolean; t: string; assignmentId: string; returned: boolean; notes: Record<string, PageNote>; onChange: (v: unknown, now?: boolean) => void;
}) {
  const imgs = ((v as { imgs?: string[] } | null)?.imgs ?? []);
  const [busy, setBusy] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function add(list: FileList | null) {
    const fs = Array.from(list ?? []); if (input.current) input.current.value = "";
    if (!fs.length) return;
    setErr(null);
    try {
      const got = (await sendSlides({ homework: t, assignmentId }, fs, MAX_UPLOADS - imgs.length, (m) => setBusy(m.replace(/slides?/g, (w) => (w === "slide" ? "page" : "pages"))), PAPER_FIT)).filter((u): u is string => !!u);
      if (!got.length) throw new Error("nothing arrived");
      onChange({ imgs: [...imgs, ...got].slice(0, MAX_UPLOADS) }, true);
    } catch (e) { setErr(`Couldn't upload (${e instanceof Error ? e.message : e}) — check the internet and try again.`); }
    finally { setBusy(null); }
  }
  if (returned) {
    return imgs.length ? (
      <div className="grid gap-3">
        {imgs.map((u, i) => (
          <div key={u} className="grid gap-1.5">
            <div className="overflow-hidden rounded-2xl ring-2 ring-violet-200"><AnnotatedPage src={u} ink={[]} teacher={notes[noteKeyFor(n, i)]?.ink ?? []} label={`Your page ${i + 1}, marked`} /></div>
            {notes[noteKeyFor(n, i)]?.note && <p className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200">💬 {notes[noteKeyFor(n, i)]!.note}</p>}
          </div>
        ))}
      </div>
    ) : <p className="text-sm font-bold text-ink/45">Nothing was uploaded.</p>;
  }
  return (
    <div className="grid gap-2">
      {imgs.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {imgs.map((u, i) => (
            <figure key={u} className="relative overflow-hidden rounded-2xl ring-1 ring-violet-100">
              <img src={u} alt={`Your page ${i + 1}`} className="aspect-[3/4] w-full bg-slate-50 object-cover" />
              {!locked && <button type="button" onClick={() => onChange({ imgs: imgs.filter((x) => x !== u) }, true)} aria-label={`Remove page ${i + 1}`} className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full bg-black/60 text-sm font-black text-white">✕</button>}
              <figcaption className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 text-[11px] font-black text-white">Page {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {!locked && imgs.length < MAX_UPLOADS && (
        <>
          <button type="button" onClick={() => input.current?.click()} disabled={!!busy} className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 text-base font-black text-violet-800 disabled:opacity-60">
            📷 {busy ?? (imgs.length ? "Add more pages" : "Take a photo or upload a PDF")}
          </button>
          <input ref={input} type="file" accept="image/*,.heic,.heif,.pdf,application/pdf" multiple hidden onChange={(e) => add(e.target.files)} aria-label={`Upload your work for question ${n + 1}`} />
        </>
      )}
      {err && <p role="alert" className="text-sm font-bold text-red-700">{err}</p>}
    </div>
  );
}
