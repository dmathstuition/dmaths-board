"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { localPoint } from "@/components/live/board/rotation";
import { MARK_CHOICES, MAX_ANSWER_TEXT, MAX_NOTE, MAX_PHOTOS, TIME_LIMITS, anonLabel, answerSummary, canEdit, cleanAnswerStrokes, cleanAnswerText, cleanImgs, cleanNote, cleanRound, hasAnswered, shareOut, taskFor, timeLeft, type Answer, type AnswerMode, type Round, type Task } from "@/lib/answerBoards";
import { useServerClock } from "@/lib/serverClock";
import { sendPicture } from "@/components/live/board/slides";
import { BOARD_H, BOARD_W, drawStrokes, roundPt, type Stroke } from "@/lib/whiteboard";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";

// Learner answer boards (like mini whiteboards in class). The tutor asks a
// question; every learner answers on their own small board; the tutor sees
// all the answers live and can show one to the class, with or without a name.
// Learners answer by drawing, by typing, or both — the tutor chooses — and can
// always snap a photo of work done on paper. The tutor can add a picture (a
// worksheet, a diagram) for everyone, or set different class work for each
// learner; a learner writes straight on top of their picture.
//
// Messages: "ab-round" (tutor → all: the round, re-sent every 4s so late
// joiners and missed messages catch up) and "ab-answer" (learner → tutor: the
// whole answer — drawing and typed text — sent as it changes and again every 8s).

type Person = { id: string; name: string; online?: boolean };
const PEN_COLOURS = ["#0B1220", "#1657C9", "#DC2626", "#16A34A"];

export default function AnswerBoards({ sessionId, host, myId, myName, people, open, onOpen, onClose, keep }: {
  sessionId?: string; // marks are kept for the class results (supabase/migration-class-marks.sql)
  host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onOpen: () => void; onClose: () => void;
  keep?: KeepStore; // the board's store: a running round survives going in or out of full screen
}) {
  const k = (name: string) => `ab:${name}`;
  const [round, setRound] = useKeptState<Round | null>(keep, k("round"), null);
  const roundRef = useRef(round); roundRef.current = round;
  const [answers, setAnswers] = useKeptState<Map<string, Answer>>(keep, k("answers"), () => new Map());
  const order = useKeptRef<string[]>(keep, k("order"), []); // who answered first → Learner A, B, …
  const [anon, setAnon] = useKeptState<boolean>(keep, k("anon"), true);
  const [focus, setFocus] = useState<string | null>(null);
  const [showBy, setShowBy] = useKeptState<string | null>(keep, k("showBy"), null);
  const [question, setQuestion] = useKeptState<string>(keep, k("question"), "");
  const [mode, setMode] = useKeptState<AnswerMode>(keep, k("mode"), "both");
  const [worth, setWorth] = useKeptState<number>(keep, k("worth"), 1);
  const [markNote, setMarkNote] = useState<string | null>(null);
  const [setFor, setSetFor] = useKeptState<"all" | "each">(keep, k("setFor"), "all");
  const [qImg, setQImg] = useKeptState<string | null>(keep, k("qImg"), null);
  const [per, setPer] = useKeptState<Record<string, Task>>(keep, k("per"), {});
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // a picture uploading: what's happening
  const [bigPic, setBigPic] = useState<string | null>(null);
  const [limit, setLimit] = useKeptState<number>(keep, k("limit"), 0); // minutes; 0 = no time limit
  const [draft, setDraft] = useState(""); // feedback being written for the open answer
  // Learner side
  const [mine, setMine] = useKeptState<Stroke[]>(keep, k("mine"), []);
  const mineRef = useRef(mine); mineRef.current = mine;
  const [typed, setTyped] = useKeptState<string>(keep, k("typed"), "");
  const typedRef = useRef(typed); typedRef.current = typed;
  const [way, setWay] = useKeptState<"draw" | "type">(keep, k("way"), "draw");
  const version = useKeptRef(keep, k("version"), 0);
  const [hidden, setHidden] = useKeptState<boolean>(keep, k("hidden"), false);
  const [photos, setPhotos] = useKeptState<string[]>(keep, k("photos"), []);
  const photosRef = useRef(photos); photosRef.current = photos;
  const [done, setDone] = useKeptState<boolean>(keep, k("done"), false); // handed in
  const doneRef = useRef(done); doneRef.current = done;
  const backSeen = useKeptRef(keep, k("backSeen"), 0);
  const [sentBack, setSentBack] = useKeptState<boolean>(keep, k("sentBack"), false);
  const now = useServerClock()();
  // A ticking clock while a round has a time limit.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!round?.endsAt) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [round?.endsAt]);

  const send = useLive({
    "ab-round": (p) => {
      if (!p?.host || host) return;
      const r = cleanRound(p.round);
      if (!r || !r.open) { setRound(null); return; }
      if (roundRef.current?.id !== r.id) {
        setMine([]); mineRef.current = []; setTyped(""); typedRef.current = ""; setPhotos([]); photosRef.current = []; version.current = 0; setHidden(false);
        setDone(false); doneRef.current = false; backSeen.current = 0; setSentBack(false);
        setWay(r.mode === "type" ? "type" : "draw");
      }
      // Sent back to try again: unlock it, once for each send-back.
      const back = r.back[myId] ?? 0;
      if (back > backSeen.current) {
        backSeen.current = back; setSentBack(true); setHidden(false);
        setDone(false); doneRef.current = false; version.current++;
        setTimeout(() => sendMine(true), 0);
      }
      setRound(r);
    },
    "ab-answer": (p) => {
      const r = roundRef.current;
      if (!host || !r || p?.round !== r.id || typeof p.by !== "string") return;
      const v = Number(p.v) || 0;
      setAnswers((cur) => {
        const old = cur.get(p.by);
        if (old && old.v >= v) return cur;
        if (!order.current.includes(p.by)) order.current.push(p.by);
        const next = new Map(cur);
        next.set(p.by, { by: p.by, name: String(p.name ?? "Learner").slice(0, 60), strokes: cleanAnswerStrokes(p.strokes), text: cleanAnswerText(p.text), imgs: cleanImgs(p.imgs, p.img), done: !!p.done, v, at: Date.now() });
        return next;
      });
    },
  });

  // Tutor: keep the round in everyone's view (late joiners, lost messages).
  useEffect(() => {
    if (!host || !round) return;
    send("ab-round", { host: true, round });
    const t = setInterval(() => send("ab-round", { host: true, round: roundRef.current }), 4000);
    return () => clearInterval(t);
  }, [host, round, send]);

  // Learner: send the answer as it changes (throttled) and again every few seconds.
  const lastSent = useRef(0);
  const pendingSend = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendMine = (force = false) => {
    const r = roundRef.current;
    if (host || !r) return;
    const now = Date.now();
    if (!force && now - lastSent.current < 350) {
      // Still send the last change once the pause is over, so nothing typed is left behind.
      if (!pendingSend.current) pendingSend.current = setTimeout(() => { pendingSend.current = null; sendMine(true); }, 400);
      return;
    }
    lastSent.current = now;
    send("ab-answer", { round: r.id, by: myId, name: myName, v: version.current, strokes: mineRef.current, text: typedRef.current, imgs: photosRef.current, done: doneRef.current });
  };
  useEffect(() => {
    if (host || !round) return;
    const t = setInterval(() => sendMine(true), 8000); // changes go at once; this is only a safety net
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, round?.id]);

  function start() {
    order.current = []; setAnswers(new Map()); setFocus(null); setShowBy(null);
    const each: Record<string, Task> = {};
    if (setFor === "each") for (const [who, t] of Object.entries(per)) if (t.q.trim() || t.img) each[who] = { q: t.q.trim().slice(0, 300), img: t.img };
    setRound({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, q: question.trim().slice(0, 200), open: true, mode, show: null, max: worth, marks: {}, img: qImg, per: each,
      closed: false, endsAt: limit ? now + limit * 60_000 : null, notes: {}, back: {} });
  }
  // Upload a picture (the tutor's question, or a learner's photo of their work).
  async function upload(file: File | undefined, answer: boolean): Promise<string | null> {
    if (!file || !sessionId) return null;
    setBusy("Getting the picture ready…");
    try {
      const { url } = await sendPicture(answer ? { sessionId, answer: true } : { sessionId }, file, setBusy);
      setBusy(null);
      return url;
    } catch (e: any) {
      setBusy(`That picture didn’t send — ${e?.message ?? "try again"}.`);
      return null;
    }
  }
  const setTask = (who: string, t: Partial<Task>) => setPer((cur) => ({ ...cur, [who]: { q: cur[who]?.q ?? "", img: cur[who]?.img ?? null, ...t } }));
  function end() {
    if (round) send("ab-round", { host: true, round: { ...round, open: false } });
    setRound(null); setFocus(null); onClose();
  }
  const labelFor = (a: Answer) => (anon ? anonLabel(order.current, a.by) : a.name);
  // Mark one learner's answer (null = take the mark back). Their board shows it
  // straight away (it travels with the round); it's also kept for the results.
  function giveMark(a: Answer, mark: number | null) {
    const r = roundRef.current;
    if (!r) return;
    const marks = { ...r.marks };
    if (mark == null) delete marks[a.by]; else marks[a.by] = mark;
    setRound({ ...r, marks });
    if (!sessionId) return;
    fetch("/api/live-sessions/results", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mark == null ? { id: sessionId, action: "unmark", roundId: r.id, studentId: a.by }
        : { id: sessionId, action: "mark", roundId: r.id, question: taskFor(r, a.by).q, studentId: a.by, name: a.name, mark, max: r.max, feedback: r.notes[a.by] ?? "", answer: keptAnswer(a) }) })
      .then((res) => setMarkNote(res.status === 501 ? "Marks show on learners’ boards, but to keep them for the class results run supabase/migration-class-marks.sql." : res.ok ? null : "A mark wasn’t saved for the results — check the internet."))
      .catch(() => setMarkNote("A mark wasn’t saved for the results — check the internet."));
  }
  // Feedback to one learner: shows on their board, and is kept with their mark.
  function giveNote(a: Answer, note: string) {
    const r = roundRef.current;
    if (!r) return;
    const t = cleanNote(note).trim();
    const notes = { ...r.notes };
    if (t) notes[a.by] = t; else delete notes[a.by];
    setRound({ ...r, notes });
    if (sessionId) fetch("/api/live-sessions/results", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, action: "note", roundId: r.id, studentId: a.by, name: a.name, question: taskFor(r, a.by).q, max: r.max, feedback: t, answer: keptAnswer(a) }) }).catch(() => {});
  }
  // Send a learner's work back to try again (with any feedback written).
  function sendBack(a: Answer) {
    const r = roundRef.current;
    if (!r) return;
    setRound({ ...r, back: { ...r.back, [a.by]: (r.back[a.by] ?? 0) + 1 } });
    setAnswers((cur) => { const next = new Map(cur); const old = next.get(a.by); if (old) next.set(a.by, { ...old, done: false }); return next; });
  }
  function setClosed(closed: boolean) {
    const r = roundRef.current;
    if (r) setRound({ ...r, closed, endsAt: closed ? r.endsAt : null });
  }
  function showToClass(a: Answer | null) {
    if (!round) return;
    setRound({ ...round, show: a ? { strokes: a.strokes, text: a.text, imgs: a.imgs ?? [], bg: taskFor(round, a.by).img, name: anon ? null : a.name } : null });
    setShowBy(a?.by ?? null);
  }

  // ── Tutor view ──
  if (host) {
    if (!open && !round) return null;
    if (!open && round) { // panel hidden while the round runs: a button to come back
      return (
        <button type="button" onClick={onOpen} className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
          <BoardIcon name="answers" /> Answers ({answers.size})
        </button>
      );
    }
    const list = [...answers.values()].sort((a, b) => order.current.indexOf(a.by) - order.current.indexOf(b.by));
    const online = people.filter((p) => p.online !== false);
    const { answered, handedIn, waiting } = answerSummary(list, online);
    const timeUp = !!round?.endsAt && now >= round.endsAt;
    const focused = focus ? answers.get(focus) ?? null : null;
    return (
      <div role="dialog" aria-modal="true" aria-label="Answer boards" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
        <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF6FF] text-[#1657C9]"><BoardIcon name="answers" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black">Answer boards</p>
              {round && <p className="truncate text-xs font-bold text-ink/55">{round.q || "No question — learners answer what you ask out loud"} · {answered} of {online.length || list.length} answered · {handedIn} handed in · {Object.keys(round.marks).length} marked (out of {round.max})</p>}
            </div>
            {round && (
              <label className="flex items-center gap-2 text-xs font-black text-ink/70">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 accent-[#1657C9]" /> Hide names
              </label>
            )}
            {round?.endsAt && !round.closed && (
              <span role="timer" className={`rounded-xl px-3 py-2 text-xs font-black ${timeUp ? "bg-red-100 text-red-700" : "bg-[#EEF6FF] text-[#1657C9]"}`}>{timeUp ? "⏱ Time’s up" : `⏱ ${timeLeft(round.endsAt, now)} left`}</span>
            )}
            {round && (round.closed || timeUp
              ? <button type="button" onClick={() => setClosed(false)} className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800">Reopen answers</button>
              : <button type="button" onClick={() => setClosed(true)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-ink/80">Close answers</button>)}
            {round && round.show && <button type="button" onClick={() => showToClass(null)} className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">Stop showing</button>}
            {round && <button type="button" onClick={end} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End</button>}
            <button type="button" onClick={onClose} aria-label={round ? "Hide — answers keep coming in" : "Close"} title={round ? "Hide — answers keep coming in" : "Close"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
          </div>
          {!round ? (
            <div className="grid gap-3 p-4">
              <p className="text-sm font-semibold text-ink/70">Every learner gets their own small board to answer on — or a box to type in. You’ll see all their answers here as they come in, and can show one to the class.</p>
              <fieldset className="grid gap-1.5">
                <legend className="text-xs font-black text-ink/60">Class work</legend>
                <div className="flex flex-wrap gap-2">
                  {([["all", "Same for everyone"], ["each", "Different for each learner"]] as const).map(([m, label]) => (
                    <button key={m} type="button" onClick={() => setSetFor(m)} aria-pressed={setFor === m}
                      className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 transition ${setFor === m ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{label}</button>
                  ))}
                </div>
              </fieldset>
              <label className="text-xs font-black text-ink/60">{setFor === "each" ? "Question for anyone without their own (optional)" : "Question (optional)"}
                <input value={question} maxLength={200} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") start(); }}
                  placeholder="e.g. Draw a quarter of a circle" className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
              </label>
              <PicturePick label="Add a picture for everyone (a worksheet, a diagram)" url={qImg} disabled={!!busy && !busy.startsWith("That")}
                onPick={async (f) => { const u = await upload(f, false); if (u) setQImg(u); }} onRemove={() => setQImg(null)} />
              {setFor === "each" && (
                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  {!online.length && <p className="text-xs font-bold text-ink/55">No learners have joined yet — their names appear here as they join.</p>}
                  {online.length > 0 && (
                    <details className="text-xs font-bold text-ink/70">
                      <summary className="cursor-pointer font-black text-[#1657C9]">Paste a list of questions and share them out</summary>
                      <label className="mt-2 block">Questions, one on each line
                        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4} placeholder={"Solve 2x + 3 = 11\nSolve 5x − 4 = 21\nSolve 3(x + 2) = 18"}
                          className="mt-1 w-full rounded-lg bg-white p-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
                      </label>
                      <button type="button" disabled={!pasted.trim()} onClick={() => { setPer((cur) => { const out = shareOut(pasted.split("\n"), online.map((p) => p.id)); for (const id of Object.keys(out)) out[id].img = cur[id]?.img ?? null; return { ...cur, ...out }; }); }}
                        className="mt-1 rounded-lg bg-[#1657C9] px-3 py-2 text-xs font-black text-white disabled:opacity-40">Share out ({online.length} learner{online.length === 1 ? "" : "s"})</button>
                    </details>
                  )}
                  {online.slice(0, 60).map((p) => (
                    <div key={p.id} className="grid gap-1 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                      <span className="truncate text-xs font-black">{p.name}</span>
                      <input value={per[p.id]?.q ?? ""} maxLength={300} onChange={(e) => setTask(p.id, { q: e.target.value })} aria-label={`Class work for ${p.name}`}
                        placeholder="Their question" className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
                      <PicturePick small label={`Picture for ${p.name}`} url={per[p.id]?.img ?? null} disabled={!!busy && !busy.startsWith("That")}
                        onPick={async (f) => { const u = await upload(f, false); if (u) setTask(p.id, { img: u }); }} onRemove={() => setTask(p.id, { img: null })} />
                    </div>
                  ))}
                </div>
              )}
              {busy && <p role="status" className="text-xs font-bold text-[#1657C9]">{busy}</p>}
              <fieldset className="grid gap-1.5">
                <legend className="text-xs font-black text-ink/60">Learners answer by</legend>
                <div className="flex flex-wrap gap-2">
                  {([["both", "Drawing or typing"], ["draw", "Drawing only"], ["type", "Typing only"]] as const).map(([m, label]) => (
                    <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m}
                      className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 transition ${mode === m ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{label}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-1.5">
                <legend className="text-xs font-black text-ink/60">Time limit</legend>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMITS.map((m) => (
                    <button key={m} type="button" onClick={() => setLimit(m)} aria-pressed={limit === m}
                      className={`min-h-[40px] rounded-xl px-3 text-xs font-black ring-1 transition ${limit === m ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{m ? `${m} min` : "No limit"}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-1.5">
                <legend className="text-xs font-black text-ink/60">Marks for this question</legend>
                <div className="flex flex-wrap gap-2">
                  {MARK_CHOICES.map((m) => (
                    <button key={m} type="button" onClick={() => setWorth(m)} aria-pressed={worth === m}
                      className={`min-h-[40px] min-w-[52px] rounded-xl px-3 text-xs font-black ring-1 transition ${worth === m ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{m} mark{m === 1 ? "" : "s"}</button>
                  ))}
                </div>
              </fieldset>
              <button type="button" onClick={start} disabled={!!busy && !busy.startsWith("That")} className="justify-self-start rounded-xl bg-[#1657C9] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">Send to learners</button>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!list.length && <p className="p-6 text-center text-sm font-bold text-ink/50">Waiting for answers…</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((a) => {
                  const showing = !!round.show && showBy === a.by;
                  return (
                    <div key={a.by} className={`overflow-hidden rounded-xl ring-2 transition ${showing ? "ring-amber-400" : round.marks[a.by] != null ? (round.marks[a.by] > 0 ? "ring-emerald-400" : "ring-red-300") : "ring-line hover:ring-[#BFD7FF]"}`}>
                      <button type="button" onClick={() => { setFocus(a.by); setDraft(round.notes[a.by] ?? ""); }} aria-label={`Open ${labelFor(a)}'s answer`} className="block w-full text-left">
                        <AnswerView a={{ ...a, bg: taskFor(round, a.by).img }} />
                      </button>
                      {round.per[a.by] && <p className="truncate bg-slate-50 px-2 pt-1 text-[11px] font-bold text-ink/55" title={taskFor(round, a.by).q}>Task: {taskFor(round, a.by).q || "their own picture"}</p>}
                      <div className="flex items-center justify-between gap-1 bg-slate-50 px-2 py-1 text-xs font-black">
                        <span className="min-w-0 truncate">{labelFor(a)}</span>
                        {showing && <span className="rounded bg-amber-400 px-1.5 text-[10px] text-ink">On screen</span>}
                        {a.done && <span className="shrink-0 rounded bg-emerald-100 px-1.5 text-[10px] text-emerald-800">Handed in</span>}
                        {round.notes[a.by] && <span className="shrink-0 text-[11px]" title={round.notes[a.by]} aria-label="Feedback given">💬</span>}
                        <MarkButtons who={labelFor(a)} max={round.max} mark={round.marks[a.by]} onMark={(m) => giveMark(a, m)} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {markNote && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{markNote}</p>}
              {waiting.length > 0 && <p className="mt-3 text-xs font-bold text-ink/50">Still to answer: {anon ? `${waiting.length} learner${waiting.length === 1 ? "" : "s"}` : waiting.join(", ")}</p>}
            </div>
          )}
        </div>
        {focused && round && (
          <div role="dialog" aria-label="One answer" className="fixed inset-0 z-[97] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-full w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl bg-white p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-ink">{labelFor(focused)}{focused.done && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">Handed in</span>}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <MarkButtons who={labelFor(focused)} max={round.max} mark={round.marks[focused.by]} onMark={(m) => giveMark(focused, m)} big />
                  <button type="button" onClick={() => { showToClass(focused); setFocus(null); }} className="rounded-xl bg-[#1657C9] px-3 py-2 text-xs font-black text-white">Show to class{anon ? " (no name)" : ""}</button>
                  <button type="button" onClick={() => setFocus(null)} aria-label="Back to all answers" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
                </div>
              </div>
              {round.per[focused.by]?.q && <p className="mb-2 text-sm font-bold text-ink/60">Their task: {round.per[focused.by].q}</p>}
              <AnswerView a={{ ...focused, bg: taskFor(round, focused.by).img }} big />
              <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <label className="text-xs font-black text-ink/60" htmlFor="ab-feedback">Feedback for {labelFor(focused)} <span className="font-bold text-ink/45">— only they see it, and it’s kept with their mark</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {["Well done! ⭐", "Show your working", "Check your signs", "Nearly — look again", "Great method!"].map((t) => (
                    <button key={t} type="button" onClick={() => setDraft(t)} className="min-h-[32px] rounded-full bg-white px-3 text-xs font-bold text-ink/70 ring-1 ring-slate-200 hover:ring-[#1657C9]">{t}</button>
                  ))}
                </div>
                <textarea id="ab-feedback" value={draft} maxLength={MAX_NOTE} rows={2} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Good start — now divide both sides by 3"
                  className="w-full rounded-lg bg-white p-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => giveNote(focused, draft)} disabled={(round.notes[focused.by] ?? "") === draft.trim()}
                    className="min-h-[40px] rounded-xl bg-[#1657C9] px-4 text-xs font-black text-white disabled:opacity-40">{round.notes[focused.by] ? "Update feedback" : "Send feedback"}</button>
                  <button type="button" onClick={() => { if (draft.trim() !== (round.notes[focused.by] ?? "")) giveNote(focused, draft); sendBack(focused); }}
                    className="min-h-[40px] rounded-xl bg-amber-100 px-4 text-xs font-black text-amber-900">↩ Send back to try again</button>
                  {(round.back[focused.by] ?? 0) > 0 && <span className="self-center text-xs font-bold text-ink/50">Sent back {round.back[focused.by]}×</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Learner view ──
  if (!round) return null;
  const task = taskFor(round, myId);
  const edit = canEdit(round, done, now);
  const timeUp = !!round.endsAt && now >= round.endsAt;
  const something = hasAnswered({ strokes: mine, text: typed, imgs: photos });
  const note = round.notes[myId];
  const handIn = (yes: boolean) => { setDone(yes); doneRef.current = yes; if (yes) setSentBack(false); version.current++; sendMine(true); };
  if (hidden) {
    return (
      <button type="button" onClick={() => setHidden(false)} className="fixed bottom-4 right-4 z-[96] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
        <BoardIcon name="answers" /> Your answer board
      </button>
    );
  }
  return (
    <div role="dialog" aria-label="Your answer board" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50 p-3">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-2 overflow-y-auto rounded-2xl bg-white p-3 text-ink shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#1657C9]">{round.mode === "type" ? "Type your answer" : round.mode === "draw" ? "Answer on your board" : "Draw or type your answer"}</p>
            <p className="text-lg font-black leading-snug">{task.q || "Answer the tutor’s question"}</p>
            {round.per[myId] && <p className="text-xs font-bold text-ink/50">This class work is just for you</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => setHidden(true)} className="rounded-lg bg-ink/5 px-3 py-2 text-xs font-black text-ink/70 hover:bg-ink/10">See the class board</button>
            {round.endsAt && !round.closed && <span role="timer" className={`rounded-lg px-2 py-1 text-xs font-black ${timeUp ? "bg-red-100 text-red-700" : "bg-[#EEF6FF] text-[#1657C9]"}`}>{timeUp ? "⏱ Time’s up" : `⏱ ${timeLeft(round.endsAt, now)} left`}</span>}
          </div>
        </div>
        {sentBack && !done && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-900 ring-1 ring-amber-200">↩ Your tutor sent this back — have another go, then hand it in again.</p>}
        {note && <p role="status" className="rounded-xl bg-[#EEF6FF] p-3 text-sm font-bold text-ink ring-1 ring-[#BFD7FF]"><span className="block text-[11px] font-black uppercase tracking-wider text-[#1657C9]">💬 From your tutor</span>{note}</p>}
        {round.marks[myId] != null && <YourMark mark={round.marks[myId]} max={round.max} />}
        {(round.closed || timeUp) && !done && <p role="status" className="rounded-xl bg-slate-100 p-3 text-sm font-black text-ink/75">{timeUp && !round.closed ? "Time’s up — " : ""}Your tutor has closed answers. They can see what you did.</p>}
        {round.show && (
          <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200">
            <p className="mb-1 text-xs font-black text-amber-800">The tutor is showing {round.show.name ? `${round.show.name}’s` : "an"} answer</p>
            <div className="mx-auto max-w-sm overflow-hidden rounded-lg"><AnswerView a={round.show} /></div>
          </div>
        )}
        {round.mode === "both" && (
          <div role="tablist" aria-label="How to answer" className="flex gap-1 self-start rounded-xl bg-ink/5 p-1">
            {(["draw", "type"] as const).map((w) => (
              <button key={w} type="button" role="tab" aria-selected={way === w} onClick={() => setWay(w)}
                className={`min-h-[40px] rounded-lg px-4 text-sm font-black transition ${way === w ? "bg-white text-[#1657C9] shadow" : "text-ink/60"}`}>
                {w === "draw" ? "✏️ Draw" : "⌨️ Type"}
              </button>
            ))}
          </div>
        )}
        {(round.mode === "draw" || (round.mode === "both" && way === "draw")) && (
          <Pad strokes={mine} by={myId} bg={task.img} locked={!edit} onChange={(next) => { setMine(next); mineRef.current = next; version.current++; sendMine(); }} onDone={() => sendMine(true)} />
        )}
        {(round.mode === "type" || (round.mode === "both" && way === "type")) && (
          <div className="grid gap-1.5">
            <label htmlFor="ab-typed" className="sr-only">Type your answer</label>
            <textarea id="ab-typed" value={typed} maxLength={MAX_ANSWER_TEXT} rows={5} readOnly={!edit}
              onChange={(e) => { const t = cleanAnswerText(e.target.value); setTyped(t); typedRef.current = t; version.current++; sendMine(); }}
              onBlur={() => sendMine(true)}
              placeholder="Type your answer here — e.g. x = 4, because 3 × 4 = 12"
              className="w-full resize-y rounded-xl bg-white p-3 text-base font-semibold text-ink ring-2 ring-[#BFD7FF] focus:outline-none focus:ring-[#1657C9]" />
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-ink/45">{typed.length}/{MAX_ANSWER_TEXT}</span>
              <span className="ml-auto text-emerald-700">{typed.trim() ? "✓ Your tutor can see this" : "Type your answer"}</span>
            </div>
          </div>
        )}
        {(round.mode === "type" || (round.mode === "both" && way === "type")) && task.img && (
          <button type="button" onClick={() => setBigPic(task.img)} className="overflow-hidden rounded-xl ring-1 ring-line" aria-label="Make the question picture bigger">
            <img src={task.img} alt="The question" className="mx-auto max-h-56 w-full object-contain" />
          </button>
        )}
        <SnapWork photos={photos} busy={busy} locked={!edit}
          onPick={async (f) => { const u = await upload(f, true); if (u) { const next = [...photosRef.current, u].slice(0, MAX_PHOTOS); setPhotos(next); photosRef.current = next; version.current++; sendMine(true); } }}
          onRemove={(u) => { const next = photosRef.current.filter((x) => x !== u); setPhotos(next); photosRef.current = next; version.current++; sendMine(true); }} onBig={setBigPic} />
        {done ? (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
            <span className="text-sm font-black text-emerald-800">✅ Handed in — your tutor has your work</span>
            {!round.closed && !timeUp && <button type="button" onClick={() => handIn(false)} className="ml-auto min-h-[40px] rounded-xl bg-white px-3 text-xs font-black text-ink/70 ring-1 ring-emerald-200">Change my answer</button>}
          </div>
        ) : edit && (
          <button type="button" onClick={() => handIn(true)} disabled={!something}
            className="min-h-[48px] rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow disabled:opacity-40">✅ Hand in my work</button>
        )}
        {round.mode === "both" && way === "type" && mine.length > 0 && <p className="text-xs font-bold text-ink/50">Your drawing is kept too — your tutor sees both.</p>}
        {round.mode === "both" && way === "draw" && typed.trim() && <p className="text-xs font-bold text-ink/50">Your typed answer is kept too — your tutor sees both.</p>}
      </div>
      {bigPic && <BigPicture url={bigPic} onClose={() => setBigPic(null)} />}
    </div>
  );
}

// The tutor's marking control: ✓ / ✗ for a one-mark question, or a mark out of `max`.
function MarkButtons({ who, max, mark, onMark, big = false }: { who: string; max: number; mark: number | undefined; onMark: (m: number | null) => void; big?: boolean }) {
  const size = big ? "h-10 min-w-[40px] text-sm" : "h-8 min-w-[32px] text-xs";
  if (max === 1) {
    return (
      <span className="flex shrink-0 gap-1" role="group" aria-label={`Mark ${who}`}>
        <button type="button" onClick={() => onMark(mark === 1 ? null : 1)} aria-pressed={mark === 1} aria-label={`Mark ${who} correct`} title="Correct"
          className={`${size} rounded-lg px-1.5 font-black ${mark === 1 ? "bg-emerald-500 text-white" : "bg-white text-emerald-700 ring-1 ring-emerald-200"}`}>✓</button>
        <button type="button" onClick={() => onMark(mark === 0 ? null : 0)} aria-pressed={mark === 0} aria-label={`Mark ${who} wrong`} title="Not right yet"
          className={`${size} rounded-lg px-1.5 font-black ${mark === 0 ? "bg-red-500 text-white" : "bg-white text-red-600 ring-1 ring-red-200"}`}>✗</button>
      </span>
    );
  }
  return (
    <label className="flex shrink-0 items-center gap-1">
      <span className="sr-only">Mark for {who}</span>
      <select value={mark ?? ""} onChange={(e) => onMark(e.target.value === "" ? null : Number(e.target.value))}
        className={`${size} rounded-lg bg-white px-1 font-black ring-1 ${mark == null ? "text-ink/50 ring-slate-200" : mark > 0 ? "text-emerald-700 ring-emerald-300" : "text-red-600 ring-red-200"}`}>
        <option value="">Mark</option>
        {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}/{max}</option>)}
      </select>
    </label>
  );
}

// What a learner sees once their answer is marked.
function YourMark({ mark, max }: { mark: number; max: number }) {
  const full = mark >= max, none = mark === 0;
  return (
    <div role="status" className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${full ? "bg-emerald-50 ring-emerald-200 text-emerald-900" : none ? "bg-red-50 ring-red-200 text-red-900" : "bg-amber-50 ring-amber-200 text-amber-900"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${full ? "bg-emerald-500" : none ? "bg-red-500" : "bg-amber-500"}`} aria-hidden>{full ? "✓" : none ? "✗" : "½"}</span>
      <p className="text-sm font-black">
        {max === 1 ? (full ? "Correct — well done!" : "Not quite — have another look.") : `Your mark: ${mark} / ${max}`}
        <span className="block text-xs font-bold opacity-70">Marked by your tutor</span>
      </p>
    </div>
  );
}

// What's kept with a mark for the learner's results: their typed answer and photos.
const keptAnswer = (a: Answer) => ({ text: a.text, imgs: a.imgs ?? [] });

// One answer as the tutor (or the class) sees it: the drawing, the typed text, or both.
function AnswerView({ a, big = false }: { a: { strokes: Stroke[]; text: string; imgs?: string[]; bg?: string | null }; big?: boolean }) {
  const drew = a.strokes.some((s) => !s.erase), text = a.text.trim();
  const imgs = a.imgs ?? [];
  if (imgs.length) {
    return (
      <div className="bg-white">
        {big ? imgs.map((u, i) => <img key={u} src={u} alt={`Their work${imgs.length > 1 ? `, page ${i + 1}` : ""}`} className="block max-h-[45vh] w-full bg-slate-100 object-contain" />) : (
          <div className="relative">
            <img src={imgs[0]} alt="Their work" className="block aspect-[16/10] w-full bg-slate-100 object-contain" />
            {imgs.length > 1 && <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 text-[11px] font-black text-white">{imgs.length} pages</span>}
          </div>
        )}
        {drew && <Thumb strokes={a.strokes} bg={a.bg} big={big} />}
        {text && <p className={`whitespace-pre-wrap break-words border-t border-line px-3 py-2 font-bold text-ink ${big ? "text-xl" : "line-clamp-2 text-xs"}`}>{text}</p>}
      </div>
    );
  }
  if (!drew && text && !a.bg) {
    return (
      <div className={`flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-white p-3 ${big ? "p-8" : ""}`}>
        <p className={`line-clamp-[8] whitespace-pre-wrap break-words text-center font-bold text-ink ${big ? "text-3xl" : "text-sm"}`}>{text}</p>
      </div>
    );
  }
  return (
    <div className="bg-white">
      <Thumb strokes={a.strokes} bg={a.bg} big={big} />
      {text && <p className={`whitespace-pre-wrap break-words border-t border-line px-3 py-2 font-bold text-ink ${big ? "text-xl" : "line-clamp-2 text-xs"}`}>{text}</p>}
      {!drew && !text && <span className="sr-only">Nothing yet</span>}
    </div>
  );
}

// A small read-only picture of an answer.
// `bg`: the question picture they wrote on.
export function Thumb({ strokes, bg, big = false }: { strokes: Stroke[]; bg?: string | null; big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current; if (c) drawStrokes(c.getContext("2d")!, strokes, c.width, c.height); }, [strokes]);
  return (
    <div className="relative bg-white">
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain" draggable={false} />}
      <canvas ref={ref} width={big ? 960 : 400} height={big ? 600 : 250} className="relative block aspect-[16/10] w-full" aria-label="An answer" role="img" />
    </div>
  );
}

// The tutor's picture chooser: a photo or a saved picture.
function PicturePick({ label, url, onPick, onRemove, disabled, small = false }: { label: string; url: string | null; onPick: (f: File | undefined) => void; onRemove: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {url && <img src={url} alt="" className={`${small ? "h-9 w-14" : "h-14 w-24"} rounded-md bg-slate-100 object-contain ring-1 ring-slate-200`} />}
      <label className={`flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-[#1657C9] ring-1 ring-[#BFD7FF] hover:bg-[#EEF6FF] ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <span aria-hidden>🖼️</span>{small ? (url ? "Change" : "Picture") : url ? "Change the picture" : label}
        <input type="file" accept="image/*" className="sr-only" aria-label={label} disabled={disabled} onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {url && <button type="button" onClick={onRemove} aria-label={`Remove: ${label}`} className="min-h-[40px] rounded-xl px-2 text-xs font-black text-red-600 hover:bg-red-50">Remove</button>}
    </div>
  );
}

// A learner photographs their work (e.g. on paper) and sends it: up to
// MAX_PHOTOS pages.
function SnapWork({ photos, busy, locked, onPick, onRemove, onBig }: { photos: string[]; busy: string | null; locked: boolean; onPick: (f: File | undefined) => void; onRemove: (url: string) => void; onBig: (url: string) => void }) {
  const sending = !!busy && !busy.startsWith("That");
  const full = photos.length >= MAX_PHOTOS;
  return (
    <div className="grid gap-2 rounded-xl bg-[#F5F9FF] p-2 ring-1 ring-[#BFD7FF]">
      <div className="flex flex-wrap items-center gap-2">
        {!locked && !full && (
          <label className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#1657C9] px-4 text-sm font-black text-white ${sending ? "pointer-events-none opacity-60" : ""}`}>
            <span aria-hidden>📷</span>{photos.length ? `Add another page (${photos.length + 1} of ${MAX_PHOTOS})` : "Snap my work"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Snap a photo of my work" disabled={sending}
              onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
        <span className="text-xs font-bold text-ink/55">{busy ?? (photos.length ? `✓ Your tutor can see ${photos.length === 1 ? "your photo" : `your ${photos.length} photos`}` : "Worked on paper? Take a photo and send it.")}</span>
      </div>
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((u, i) => (
            <li key={u} className="relative">
              <button type="button" onClick={() => onBig(u)} className="overflow-hidden rounded-lg ring-1 ring-line" aria-label={`Make page ${i + 1} bigger`}>
                <img src={u} alt={`My work, page ${i + 1}`} className="h-28 w-auto max-w-[9rem] bg-white object-contain" />
              </button>
              {!locked && <button type="button" onClick={() => onRemove(u)} aria-label={`Remove page ${i + 1}`} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white shadow">✕</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A picture shown big, to read the small print.
function BigPicture({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Picture" className="fixed inset-0 z-[98] flex items-center justify-center bg-black/85 p-3" onClick={onClose}>
      <img src={url} alt="Shown bigger" className="max-h-full max-w-full object-contain" />
      <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white px-4 py-2 text-sm font-black text-ink">Close</button>
    </div>
  );
}

// The learner's own small board.
function Pad({ strokes, by, bg, locked = false, onChange, onDone }: { strokes: Stroke[]; by: string; bg?: string | null; locked?: boolean; onChange: (s: Stroke[]) => void; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke | null>(null);
  const [colour, setColour] = useState(PEN_COLOURS[1]);
  const [rubber, setRubber] = useState(false);
  const paint = () => { const c = ref.current; if (c) drawStrokes(c.getContext("2d")!, cur.current ? [...strokes, cur.current] : strokes, c.width, c.height); };
  useEffect(paint);
  const pt = (e: React.PointerEvent) => localPoint(ref.current!, e.clientX, e.clientY).map(roundPt) as [number, number];
  const tool = "min-h-[40px] rounded-lg px-3 text-xs font-black";
  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl bg-white ring-2 ring-[#BFD7FF]">
      {bg && <img src={bg} alt="The question — write on it" className="pointer-events-none absolute inset-0 h-full w-full object-contain" draggable={false} />}
      <canvas ref={ref} width={BOARD_W * 0.6} height={BOARD_H * 0.6} role="img" aria-label="Your answer — draw here"
        className="relative block aspect-[16/10] w-full touch-none"
        onPointerDown={(e) => { if (locked) return; e.currentTarget.setPointerCapture(e.pointerId); cur.current = { id: `${by.slice(0, 6)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, by, color: colour, w: rubber ? 10 : 4, erase: rubber, pts: pt(e) }; paint(); }}
        onPointerMove={(e) => { const s = cur.current; if (!s || !e.buttons) return; const [x, y] = pt(e); const L = s.pts.length; if (Math.hypot(x - s.pts[L - 2], y - s.pts[L - 1]) < 0.002) return; s.pts.push(x, y); paint(); }}
        onPointerUp={() => { const s = cur.current; cur.current = null; if (s) onChange([...strokes, s].slice(-300)); onDone(); }}
        onPointerCancel={() => { cur.current = null; paint(); }} />
      </div>
      {locked ? <p className="text-xs font-bold text-ink/55">🔒 Your answer is locked</p> : (
      <div className="flex flex-wrap items-center gap-1.5">
        {PEN_COLOURS.map((c) => (
          <button key={c} type="button" onClick={() => { setColour(c); setRubber(false); }} aria-label={`Pen colour ${c}`} aria-pressed={!rubber && colour === c}
            className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ${!rubber && colour === c ? "ring-[#38BDF8]" : "ring-transparent"}`} style={{ background: c }} />
        ))}
        <button type="button" onClick={() => setRubber(!rubber)} aria-pressed={rubber} className={`${tool} ${rubber ? "bg-[#1657C9] text-white" : "bg-ink/5"}`}>Rubber</button>
        <button type="button" onClick={() => onChange(strokes.slice(0, -1))} disabled={!strokes.length} className={`${tool} bg-ink/5 disabled:opacity-40`}>Undo</button>
        <button type="button" onClick={() => onChange([])} disabled={!strokes.length} className={`${tool} bg-ink/5 disabled:opacity-40`}>Clear</button>
        <span className="ml-auto text-xs font-bold text-emerald-700">{strokes.length ? "✓ Your tutor can see this" : "Draw or write your answer"}</span>
      </div>)}
    </div>
  );
}
