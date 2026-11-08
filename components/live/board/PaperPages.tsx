"use client";
// Papers the teacher marks by hand (Exam mode, questions of kind "page").
//   • PageFlow — the learner's phone: one page at a time; they write on it
//     with a finger (or type), then hand it in. A page handed in is locked:
//     they can't go back to it.
//   • MarkingDesk — the teacher: every page handed in, oldest first, with
//     the learner's writing on it. One tap gives the mark and the next page
//     opens. The marks for all the pages add up to the learner's score.
import { useEffect, useRef, useState } from "react";
import { drawStrokes, roundPt, type Stroke } from "@/lib/whiteboard";
import { localPoint } from "@/components/live/board/rotation";
import { MAX_PAGE_TEXT, isRight, pageBlank, pageDone, teacherMax, workingBlank, workingKey, type ExamQ, type LearnerQ, type PageAnswer } from "@/lib/exams";

const PENS = ["#0B1220", "#1657C9", "#DC2626"];
const PEN_W = 6, RUBBER_W = 14;
type Api = (body: unknown) => Promise<{ ok: boolean; j: any }>;

// A page with writing on it. The picture sets the size; the writing sits on
// top, measured across the picture (0–1), so it lines up at any size. No
// picture: squared paper for working.
const WORKING_SIZE: [number, number] = [1200, 800];
function PageCanvas({ src, ink, live, zoom = 1, onStroke, label }: {
  src?: string; ink: Stroke[]; live?: React.MutableRefObject<Stroke | null>; zoom?: number;
  onStroke?: { by: string; color: string; rubber: boolean; done: (s: Stroke) => void } | null; label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<[number, number]>(src ? [1240, 1754] : WORKING_SIZE);
  const paint = () => { const c = ref.current; if (c) drawStrokes(c.getContext("2d")!, live?.current ? [...ink, live.current] : ink, c.width, c.height); };
  useEffect(paint);
  const pt = (e: React.PointerEvent) => localPoint(ref.current!, e.clientX, e.clientY).map(roundPt) as [number, number];
  const writing = !!onStroke;
  return (
    <div className="relative bg-white" style={{ width: `${zoom * 100}%` }}>
      {src ? <img src={src} alt={label} className="block w-full select-none" draggable={false}
        onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) setSize([Math.min(1600, i.naturalWidth), Math.round(Math.min(1600, i.naturalWidth) * (i.naturalHeight / i.naturalWidth))]); }} />
        : <div aria-hidden className="w-full" style={{ aspectRatio: `${WORKING_SIZE[0]} / ${WORKING_SIZE[1]}`, backgroundImage: "linear-gradient(#E6EEF0 1px, transparent 1px), linear-gradient(90deg, #E6EEF0 1px, transparent 1px)", backgroundSize: "24px 24px" }} />}
      <canvas ref={ref} width={size[0]} height={size[1]} aria-label={writing ? "Write on the page" : "Their writing"} role="img"
        className={`absolute inset-0 h-full w-full ${writing ? "touch-none" : "pointer-events-none"}`}
        onPointerDown={writing ? (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          live!.current = { id: `${onStroke!.by.slice(0, 6)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, by: onStroke!.by, color: onStroke!.color, w: onStroke!.rubber ? RUBBER_W : PEN_W, erase: onStroke!.rubber, pts: pt(e) };
          paint();
        } : undefined}
        onPointerMove={writing ? (e) => {
          const s = live!.current; if (!s || !e.buttons) return;
          const [x, y] = pt(e), L = s.pts.length;
          if (Math.hypot(x - s.pts[L - 2], y - s.pts[L - 1]) < 0.0015) return;
          s.pts.push(x, y); paint();
        } : undefined}
        onPointerUp={writing ? () => { const s = live!.current; live!.current = null; if (s) onStroke!.done(s); } : undefined}
        onPointerCancel={writing ? () => { live!.current = null; paint(); } : undefined} />
    </div>
  );
}

// ── Working for a method mark (a long multiplication or division) ──
export function WorkingPad({ examId, n, myId, saved, api, onInk }: { examId: string; n: number; myId: string; saved: unknown; api: Api; onInk?: (ink: Stroke[]) => void }) {
  const start = Array.isArray((saved as { ink?: Stroke[] } | null)?.ink) ? (saved as { ink: Stroke[] }).ink : [];
  const [ink, setInk] = useState<Stroke[]>(start);
  const [rubber, setRubber] = useState(false);
  const [state, setState] = useState<"saving" | "saved" | "error" | null>(null);
  const live = useRef<Stroke | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(start);
  useEffect(() => { const s0 = Array.isArray((saved as any)?.ink) ? (saved as any).ink : []; setInk(s0); latest.current = s0; setState(null); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const change = (next: Stroke[]) => {
    setInk(next); latest.current = next; setState("saving"); onInk?.(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { timer.current = null; const { ok } = await api({ action: "working", examId, n, value: { ink: latest.current } }); setState(ok ? "saved" : "error"); }, 1000);
  };
  const tool = "min-h-[36px] rounded-lg px-3 text-xs font-black";
  return (
    <div className="mt-3 grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <p className="mr-auto text-xs font-black text-ink/65">✏️ Show your working — it can earn a mark even if the answer is wrong</p>
        <span className="text-[11px] font-bold text-ink/50" role="status">{state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : state === "error" ? "⚠ Not saved" : ""}</span>
      </div>
      <div className="overflow-hidden rounded-xl ring-2 ring-orange-200">
        <PageCanvas ink={ink} live={live} label="Your working" onStroke={{ by: myId, color: "#0B1220", rubber, done: (st) => change([...ink, st].slice(-300)) }} />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setRubber(!rubber)} aria-pressed={rubber} className={`${tool} ${rubber ? "bg-ink text-white" : "bg-white ring-1 ring-orange-200"}`}>Rubber</button>
        <button type="button" onClick={() => change(ink.slice(0, -1))} disabled={!ink.length} className={`${tool} bg-white ring-1 ring-orange-200 disabled:opacity-40`}>Undo</button>
        <button type="button" onClick={() => change([])} disabled={!ink.length} className={`${tool} bg-white ring-1 ring-orange-200 disabled:opacity-40`}>Clear</button>
      </div>
    </div>
  );
}

// ── The learner ──
export function PageFlow({ examId, myId, paper, answers, setAnswers, api, ask, onFinished }: {
  examId: string; myId: string; paper: LearnerQ[]; answers: Record<string, unknown>;
  setAnswers: (f: (a: Record<string, unknown>) => Record<string, unknown>) => void; api: Api; onFinished: () => void;
  ask: (message: string, yes: string) => Promise<boolean>; // asked inside the page (a phone pop-up looks like leaving the exam)
}) {
  const pages = paper.filter((q) => q.kind === "page");
  const at = pages.findIndex((q) => !pageDone(answers[String(q.n)]));
  const q = at >= 0 ? pages[at] : null;
  const saved = (q ? answers[String(q.n)] : null) as Partial<PageAnswer> | null;
  const [ink, setInk] = useState<Stroke[]>([]);
  const [text, setText] = useState("");
  const [state, setState] = useState<"saved" | "saving" | "error" | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "move">("write");
  const [zoom, setZoom] = useState(1);
  const [colour, setColour] = useState(PENS[0]);
  const [rubber, setRubber] = useState(false);
  const live = useRef<Stroke | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ ink: [] as Stroke[], text: "" });
  // A new page: what was saved on it (after a refresh), or a clean page.
  const shown = q?.n ?? -1;
  useEffect(() => {
    const s = { ink: Array.isArray(saved?.ink) ? saved!.ink as Stroke[] : [], text: typeof saved?.text === "string" ? saved.text : "" };
    setInk(s.ink); setText(s.text); latest.current = s; setState(null); setZoom(1); setMode("write");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!q) return null;
  const save = (next: { ink: Stroke[]; text: string }) => {
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      timer.current = null;
      const { ok } = await api({ action: "answer", examId, n: q.n, value: latest.current });
      setState(ok ? "saved" : "error");
    }, 1000);
  };
  const changeInk = (next: Stroke[]) => { setInk(next); save({ ink: next, text: latest.current.text }); };
  async function handIn() {
    const last = at === pages.length - 1;
    if (!(await ask(last ? "Hand in the last page and finish? You can't change your paper after this."
      : `Hand in page ${at + 1}? You can't go back to it after this.`, "Yes, hand it in"))) return;
    setFailed(null);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setBusy(true);
    const value = latest.current;
    const { ok, j } = await api({ action: "page-done", examId, n: q!.n, value });
    setBusy(false);
    if (!ok && !/handed in that page/i.test(j?.error ?? "")) { setState("error"); setFailed(j?.error ?? "That page didn't hand in — check the internet and try again."); return; }
    setAnswers((a) => ({ ...a, [String(q!.n)]: { ...value, done: new Date().toISOString() } }));
    if (last) onFinished();
  }
  const tool = "min-h-[40px] rounded-lg px-3 text-xs font-black";
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-[#C2451C]">Page {at + 1} of {pages.length} · {q.marks} mark{q.marks === 1 ? "" : "s"}</p>
        <span className="ml-auto text-[11px] font-bold text-ink/55" role="status">{state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : state === "error" ? "⚠ Not saved — check the internet" : ""}</span>
      </div>
      {/* Write on the page; Move to scroll around it (and zoom in to write small). */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex overflow-hidden rounded-lg ring-1 ring-orange-200" role="group" aria-label="Write or move">
          <button type="button" onClick={() => setMode("write")} aria-pressed={mode === "write"} className={`${tool} rounded-none ${mode === "write" ? "bg-[#C2451C] text-white" : "bg-white"}`}>✏️ Write</button>
          <button type="button" onClick={() => setMode("move")} aria-pressed={mode === "move"} className={`${tool} rounded-none ${mode === "move" ? "bg-[#C2451C] text-white" : "bg-white"}`}>✋ Move</button>
        </span>
        {[1, 2].map((z) => <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} aria-label={`Zoom ${z}×`} className={`${tool} ${zoom === z ? "bg-ink text-white" : "bg-white ring-1 ring-orange-200"}`}>{z}×</button>)}
        {PENS.map((c) => (
          <button key={c} type="button" onClick={() => { setColour(c); setRubber(false); setMode("write"); }} aria-label={`Pen colour ${c}`} aria-pressed={!rubber && colour === c}
            className={`h-8 w-8 rounded-full ring-2 ring-offset-1 ${!rubber && colour === c ? "ring-[#C2451C]" : "ring-transparent"}`} style={{ background: c }} />
        ))}
        <button type="button" onClick={() => { setRubber(!rubber); setMode("write"); }} aria-pressed={rubber} className={`${tool} ${rubber ? "bg-ink text-white" : "bg-white ring-1 ring-orange-200"}`}>Rubber</button>
        <button type="button" onClick={() => changeInk(ink.slice(0, -1))} disabled={!ink.length} className={`${tool} bg-white ring-1 ring-orange-200 disabled:opacity-40`}>Undo</button>
      </div>
      <div className="max-h-[64dvh] overflow-auto rounded-xl ring-2 ring-orange-200">
        <PageCanvas src={q.img!} ink={ink} live={live} zoom={zoom} label={`${q.q} — write your answers on it`}
          onStroke={mode === "write" ? { by: myId, color: colour, rubber, done: (s) => changeInk([...ink, s].slice(-300)) } : null} />
      </div>
      {mode === "write" && zoom > 1 && <p className="text-[11px] font-bold text-ink/55">Tap ✋ Move to scroll the page, then ✏️ Write again.</p>}
      <label className="text-xs font-bold text-ink/60">Or type your answers for this page (optional)
        <textarea value={text} maxLength={MAX_PAGE_TEXT} rows={2} onChange={(e) => { setText(e.target.value); save({ ink: latest.current.ink, text: e.target.value }); }}
          autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="e.g. Q4: Emma, Q5: 30,000"
          className="mt-1 w-full rounded-xl bg-white px-3 py-2 text-base font-bold text-ink ring-2 ring-orange-200 focus:outline-none focus:ring-[#C2451C]" />
      </label>
      <button type="button" onClick={handIn} disabled={busy} className="min-h-[52px] rounded-xl bg-emerald-600 text-base font-black text-white disabled:opacity-60">
        {busy ? "Handing in…" : at === pages.length - 1 ? "Hand in the last page & finish ✓" : `Hand in page ${at + 1} →`}
      </button>
      {failed && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{failed}</p>}
      <nav aria-label="Pages" className="flex flex-wrap gap-1">
        {pages.map((p, i) => (
          <span key={p.n} aria-label={`Page ${i + 1}${i < at ? ", handed in" : i === at ? ", you are here" : ""}`}
            className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-1 text-xs font-black ${i < at ? "bg-emerald-100 text-emerald-800" : i === at ? "bg-[#C2451C] text-white" : "bg-white text-ink/45 ring-1 ring-orange-200"}`}>{i < at ? "🔒" : i + 1}</span>
        ))}
      </nav>
    </div>
  );
}

// ── The teacher ──
export type MarkEntry = { id: string; name: string; submitted: boolean; submittedAt?: string | null; score: number | null; live: number | null; total: number | null;
  answers?: Record<string, unknown>; pageMarks?: Record<string, number>; toMark?: number[] };

export function MarkingDesk({ examId, questions, entries, api, reload, running }: {
  examId: string; questions: ExamQ[]; entries: MarkEntry[]; api: Api; reload: () => Promise<void>; running: boolean;
}) {
  // What the teacher marks: pages, and method marks.
  const pageNs = questions.map((q, i) => (teacherMax(q) > 0 ? i : -1)).filter((i) => i >= 0);
  const pagesOnly = pageNs.every((n) => questions[n].kind === "page");
  const key = (x: { id: string; n: number }) => `${x.id}:${x.n}`;
  const doneAt = (e: MarkEntry, n: number) => { const v = e.answers?.[String(n)] as { done?: string } | undefined; return v?.done ?? e.submittedAt ?? ""; };
  const queue = entries.flatMap((e) => (e.toMark ?? []).map((n) => ({ id: e.id, name: e.name, n, at: doneAt(e, n) }))).sort((a, b) => a.at.localeCompare(b.at));
  const [pick, setPick] = useState<{ id: string; n: number } | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [view, setView] = useState<{ k: string; ink: Stroke[]; text: string; mark: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const cur = pick ?? queue.find((x) => !skipped.has(key(x))) ?? queue[0] ?? null;
  const curKey = cur ? key(cur) : "";
  const who = cur ? entries.find((e) => e.id === cur.id) : null;
  useEffect(() => {
    if (!cur) { setView(null); return; }
    let gone = false;
    setView(null);
    api({ action: "page-view", examId, studentId: cur.id, n: cur.n }).then(({ ok, j }) => {
      if (gone) return;
      if (ok) setView({ k: key(cur), ink: j.ink ?? [], text: j.text ?? "", mark: j.mark ?? null });
      else setNote(j?.error ?? "Couldn't open that page — try again.");
    });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curKey, examId]);

  async function give(mark: number | null) {
    if (!cur) return;
    setBusy(true); setNote(null);
    const { ok, j } = await api({ action: "mark", examId, studentId: cur.id, n: cur.n, mark });
    setBusy(false);
    if (!ok) { setNote(j?.error ?? "That mark didn't save — try again."); return; }
    setPick(null); setZoom(1);
    await reload();
  }
  const q = cur ? questions[cur.n] : null;
  const chip = "flex h-8 min-w-[34px] items-center justify-center rounded-lg px-1 text-xs font-black";
  return (
    <section aria-label="Marking" className="mb-3 rounded-2xl bg-[#FFF7ED] p-3 ring-1 ring-orange-200">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-black text-[#C2451C]">✍️ Marking · {queue.length ? `${queue.length} ${pagesOnly ? `page${queue.length === 1 ? "" : "s"}` : "to mark"} waiting`.replace("to mark waiting", "waiting to be marked") : "nothing waiting"}</p>
        {cur && pick && <button type="button" onClick={() => setPick(null)} className="text-xs font-black text-ink/60 underline">Back to the queue</button>}
      </div>
      {note && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{note}</p>}
      {!cur ? (
        <p className="mt-2 text-sm font-bold text-ink/60">{entries.length ? "Everything handed in so far is marked ✓" : ""} {running ? (pagesOnly ? "Pages appear here as learners hand them in." : "Working for method marks appears here when learners hand in (right answers get full marks by themselves).") : ""}</p>
      ) : (
        <div className="mt-2 grid gap-3 lg:grid-cols-[1fr_260px]">
          <div className="max-h-[70vh] overflow-auto rounded-xl bg-white ring-1 ring-orange-200">
            {view?.k === curKey && q!.method ? <PageCanvas ink={view.ink} zoom={zoom} label={`${who?.name ?? "Learner"}'s working`} />
              : view?.k === curKey && !q!.img ? <p className="p-6 text-center text-sm font-bold text-ink/55">The paper&apos;s pages were deleted — only what was typed is left.</p>
              : view?.k === curKey ? <PageCanvas src={q!.img!} ink={view.ink} zoom={zoom} label={`${who?.name ?? "Learner"}'s ${q!.q}`} />
              : <p className="p-6 text-center text-sm font-bold text-ink/50">Opening the page…</p>}
          </div>
          <div className="grid content-start gap-2">
            <div>
              <p className="text-lg font-black text-ink">{who?.name ?? "Learner"}</p>
              <p className="text-xs font-bold text-ink/60">{q!.method ? `Q${cur.n + 1}: ${q!.q} · method mark, out of ${teacherMax(q!)}` : `${q!.q} of the paper · out of ${q!.marks} mark${q!.marks === 1 ? "" : "s"}`}</p>
            </div>
            {view?.k === curKey && q!.method && <p className="rounded-lg bg-white p-2 text-sm font-bold text-ink ring-1 ring-orange-100"><span className="block text-[10px] font-black uppercase text-ink/45">Their answer</span>{view.text.trim() || "(none)"} <span className="text-red-700">✗</span> <span className="text-xs text-emerald-800">· right answer: {String(q!.answer).split("|")[0].trim()}</span></p>}
            {view?.k === curKey && !q!.method && view.text.trim() && <p className="whitespace-pre-wrap rounded-lg bg-white p-2 text-sm font-bold text-ink ring-1 ring-orange-100"><span className="block text-[10px] font-black uppercase text-ink/45">Typed</span>{view.text}</p>}
            <div className="flex gap-1" role="group" aria-label="Zoom the page">
              {[1, 1.5, 2].map((z) => <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} className={`h-8 rounded-lg px-2 text-xs font-black ${zoom === z ? "bg-ink text-white" : "bg-white ring-1 ring-orange-200"}`}>{z}×</button>)}
            </div>
            <p className="text-xs font-black text-ink/60">{view?.mark != null ? `Marked ${view.mark} / ${teacherMax(q!)} — change it:` : q!.method ? "Method mark for the working:" : "Give a mark:"}</p>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`Mark ${who?.name ?? "the learner"}'s ${q!.method ? `working for Q${cur.n + 1}` : q!.q}`}>
              {Array.from({ length: teacherMax(q!) + 1 }, (_, m) => (
                <button key={m} type="button" onClick={() => give(m)} disabled={busy || view?.k !== curKey} aria-label={`${m} mark${m === 1 ? "" : "s"}`}
                  className={`h-12 rounded-xl text-lg font-black disabled:opacity-50 ${view?.mark === m ? "bg-[#C2451C] text-white" : m === 0 ? "bg-white text-red-700 ring-1 ring-red-200" : m === teacherMax(q!) ? "bg-emerald-600 text-white" : "bg-white text-ink ring-1 ring-orange-200"}`}>{m}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {!pick && queue.length > 1 && <button type="button" onClick={() => setSkipped((s) => new Set(s).add(curKey))} className="text-xs font-black text-ink/60 underline">Skip for now</button>}
              {view?.mark != null && <button type="button" onClick={() => give(null)} disabled={busy} className="text-xs font-black text-red-700 underline">Clear the mark</button>}
            </div>
          </div>
        </div>
      )}
      {/* Every learner's pages: tap one to look again or change its mark. */}
      {entries.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black text-ink/65">{pagesOnly ? "Each learner's pages" : "Each learner's marking"}</summary>
          <div className="mt-2 grid gap-1.5">
            {entries.map((e) => {
              const marks = e.pageMarks ?? {};
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-1">
                  <span className="w-32 truncate text-xs font-black">{e.name}</span>
                  {pageNs.map((n, i) => {
                    const q = questions[n], v = e.answers?.[String(n)], m = marks[String(n)];
                    const done = q.kind === "page" ? pageDone(v) || e.submitted : e.submitted;
                    const auto = !!q.method && done && isRight(q, v); // right answer: full marks without the teacher
                    const blank = done && !auto && m == null && (q.kind === "page" ? pageBlank(v) : workingBlank(e.answers?.[workingKey(n)]));
                    const what = q.kind === "page" ? `page ${i + 1}` : `Q${n + 1}`;
                    const state = !done ? "waiting for them" : auto ? "right, full marks" : blank ? "blank" : m == null ? "to mark" : `${m} of ${teacherMax(q)}`;
                    return (
                      <button key={n} type="button" disabled={!done || auto || blank} onClick={() => setPick({ id: e.id, n })} aria-label={`${e.name}, ${what}: ${state}`} title={`${what}: ${state}`}
                        className={`${chip} ${!done ? "bg-white text-ink/30 ring-1 ring-slate-200" : auto ? "bg-emerald-100 text-emerald-800" : blank ? "bg-slate-100 text-ink/40" : m == null ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : m === teacherMax(q) ? "bg-emerald-100 text-emerald-800" : "bg-white text-ink ring-1 ring-slate-200"} ${pick && pick.id === e.id && pick.n === n ? "ring-2 ring-[#C2451C]" : ""}`}>
                        {!done ? (q.kind === "page" ? i + 1 : `Q${n + 1}`) : auto ? "✓" : blank ? "–" : m == null ? "•" : m}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-xs font-black text-ink/70">{e.submitted ? e.score : e.live} / {e.total}</span>
                </div>
              );
            })}
            <p className="text-[11px] font-semibold text-ink/50">Numbers are marks given · • to mark · – blank (0) · grey: not handed in yet</p>
          </div>
        </details>
      )}
    </section>
  );
}
