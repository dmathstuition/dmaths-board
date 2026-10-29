"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import type { QuizView } from "@/lib/liveQuiz";
import { ANSWER_STYLE, Shape, useCountdown } from "@/components/live/QuizBits";
import { Podium } from "@/components/live/QuizHostStage";
import { clockSynced, useServerClock } from "@/lib/serverClock";

export function ordinal(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

// The learner's phone during a live quiz: four big coloured shapes to tap,
// then "Correct! +850 🔥3" or "Not this time", their place, and the podium.
// Reports what's on stage through onState so the room can switch to it; the
// podium's "Back to the board" calls onDismiss.
type Mine = { quizId: string; idx: number; choice: number } | null;
function keepMine(z: QuizView | null, m: Mine): QuizView | null {
  if (!z || !m || z.id !== m.quizId || z.current !== m.idx || z.status !== "question" || z.me?.answer || !z.me) return z;
  return { ...z, me: { ...z.me, answer: { choice: m.choice, correct: null, points: null, streak: null } } };
}

export default function QuizPlayer({ sessionId, myName, onState, onDismiss }: {
  sessionId: string; myName: string;
  onState?: (s: { id: string; status: string } | null) => void; onDismiss?: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  const [offset, setOffset] = useState(0);
  const [sending, setSending] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // The answer this phone gave to the current question. A reply that's a
  // second behind (another server) mustn't flip the screen back to the buttons.
  const mineRef = useRef<Mine>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/live-quiz?sessionId=${sessionId}`).catch(() => null);
    if (!r?.ok) return;
    const j = await r.json().catch(() => ({}));
    setQuiz(keepMine(j.quiz, mineRef.current)); if (j.serverNow) setOffset(j.serverNow - Date.now());
  }, [sessionId]);
  const send = useLive({ "quiz-changed": () => load() });
  // Realtime pings bring changes straight away; polling is the safety net —
  // quick while a quiz is running, slow otherwise, and off in a hidden tab.
  const running = !!quiz && quiz.status !== "ended";
  useEffect(() => {
    load();
    const id = setInterval(() => { if (document.visibilityState === "visible") load(); }, (running ? 3000 : 15000) + Math.round(Math.random() * 1000));
    return () => clearInterval(id);
  }, [load, running]);

  useEffect(() => { onState?.(quiz ? { id: quiz.id, status: quiz.status } : null); }, [quiz?.id, quiz?.status, quiz, onState]);
  const step = quiz ? `${quiz.current}:${quiz.status}` : "";
  useEffect(() => { setNote(null); }, [step]);

  const q = quiz?.question;
  // The class clock (measured with the network delay taken out) once it's
  // ready; until then, the rough offset from the last quiz reply.
  const clock = useServerClock();
  const left = useCountdown(q?.startedAt, q?.seconds ?? 20, clockSynced() ? Math.round((clock() - Date.now()) / 100) * 100 : offset);

  async function answer(choice: number) {
    if (!quiz || quiz.me?.answer || sending !== null) return;
    setSending(choice);
    // Show "Answer locked in" on tap; the server's reply replaces it a moment later.
    const before = quiz;
    mineRef.current = { quizId: quiz.id, idx: quiz.current, choice };
    setQuiz({ ...quiz, me: quiz.me ? { ...quiz.me, answer: { choice, correct: null, points: null, streak: null } } : quiz.me });
    const r = await fetch("/api/live-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer", quizId: quiz.id, idx: quiz.current, choice }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setSending(null);
    if (!r?.ok) { mineRef.current = null; setQuiz(before); setNote(j.error ?? "Couldn't send your answer — tap again."); return; }
    setQuiz(j.quiz); send("quiz-answered");
  }

  // A new question scrolls the quiz into view, so a phone never opens on the
  // header with the answers below the fold.
  const boxRef = useRef<HTMLDivElement>(null);
  const asking = quiz?.status === "question" ? quiz.current : -1;
  useEffect(() => {
    if (asking < 0) return;
    // Wait a moment: the room shows the quiz panel only after it hears a quiz started.
    const t = setTimeout(() => boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
    return () => clearTimeout(t);
  }, [asking]);

  if (!quiz) return null;
  const me = quiz.me;
  const shell = "relative flex min-h-[70vh] flex-col overflow-hidden rounded-[1.75rem] p-4 text-white sm:min-h-[520px] sm:p-6";
  const stage = `${shell} quiz-stage`;
  const top = (
    <div className="flex items-center justify-between text-sm font-black text-white/80">
      <span>{quiz.status === "lobby" || quiz.status === "ended" ? quiz.title : `${quiz.current + 1} of ${quiz.total}`}</span>
      <span className="rounded-full bg-white/15 px-3 py-1">{myName} · {me?.points ?? 0}</span>
    </div>
  );

  if (quiz.status === "lobby") {
    return (
      <div className={stage}>
        {top}
        <div className="m-auto text-center">
          <p className="quiz-pop font-display text-4xl font-black">You&apos;re in!</p>
          <p className="mt-2 text-lg font-bold text-white/80">See your name on the screen?</p>
          <div className="quiz-bob mx-auto mt-6 flex w-fit gap-2">{[0, 1, 2, 3].map((k) => <span key={k} className="rounded-lg p-2" style={{ background: ANSWER_STYLE[k].color }}><Shape i={k} className="h-6 w-6" /></span>)}</div>
          <p className="mt-6 text-sm text-white/70">{quiz.total} question{quiz.total === 1 ? "" : "s"} · answer fast for more points · keep a streak for bonus 🔥</p>
        </div>
      </div>
    );
  }

  if (quiz.status === "question" && q) {
    const mine = me?.answer;
    if (mine) {
      return (
        <div className={stage}>
          {top}
          <div className="m-auto text-center">
            <span className="quiz-pop mx-auto flex h-24 w-24 items-center justify-center rounded-3xl" style={{ background: ANSWER_STYLE[mine.choice].color }}><Shape i={mine.choice} className="h-12 w-12" /></span>
            <p className="mt-5 font-display text-3xl font-black">Answer locked in</p>
            <p className="quiz-bob mt-2 text-white/75">Were you fast enough…?</p>
          </div>
        </div>
      );
    }
    // The question screen always fits the screen (phones upright or sideways):
    // the answers share the space left under the question instead of a fixed height.
    return (
      <div ref={boxRef} className="relative flex h-[calc(100dvh-16px)] max-h-[760px] min-h-[300px] scroll-mt-2 flex-col overflow-hidden rounded-[1.75rem] p-3 text-white quiz-stage sm:p-5 [@media(max-height:520px)]:p-2.5">
        {top}
        <div className="mt-2 flex items-start gap-3 rounded-2xl bg-white p-3 text-ink sm:mt-3 sm:p-4 [@media(max-height:520px)]:py-2">
          <p className="max-h-[30vh] flex-1 overflow-y-auto font-display text-lg font-black leading-snug [@media(max-height:520px)]:text-base">{q.q}</p>
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-black text-white ${left <= 5 ? "bg-red-500" : "bg-violet-600"}`} aria-label={`${left} seconds left`}>{left}</span>
        </div>
        <div className="mt-2 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 sm:mt-3 sm:gap-3 [@media(max-height:520px)]:grid-cols-4">
          {q.options.map((o, k) => (
            <button key={k} type="button" disabled={left === 0 || sending !== null} onClick={() => answer(k)}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl p-2 text-center font-black shadow-lg transition active:scale-95 disabled:opacity-50 sm:gap-2 sm:p-3 ${sending === k ? "ring-4 ring-white" : ""}`}
              style={{ background: ANSWER_STYLE[k].color }} aria-label={`${ANSWER_STYLE[k].shape}: ${o}`}>
              <Shape i={k} className="h-7 w-7 shrink-0 [@media(min-height:640px)]:h-10 [@media(min-height:640px)]:w-10" />
              <span className="line-clamp-3 text-[15px] leading-snug">{o}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 min-h-[18px] text-center text-sm font-bold" role="status">{note ?? (left === 0 ? "Time's up" : "")}</p>
      </div>
    );
  }

  if (quiz.status === "reveal" || quiz.status === "leaderboard") {
    const mine = me?.answer;
    const right = !!mine?.correct;
    return (
      <div className={quiz.status === "reveal" ? `${shell} ${right ? "bg-emerald-600" : "bg-rose-600"}` : stage}>
        {top}
        <div className="m-auto text-center">
          {quiz.status === "reveal" ? (
            <>
              <p className="quiz-pop font-display text-5xl font-black">{mine ? (right ? "Correct!" : "Incorrect") : "Time's up"}</p>
              <p className="quiz-pop mt-3 text-5xl" aria-hidden>{right ? "✔" : "✖"}</p>
              {right && (mine?.streak ?? 0) >= 2 && <p className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1.5 font-black">🔥 Answer streak {mine?.streak}</p>}
              <p className="mt-4 rounded-2xl bg-black/20 px-6 py-3 font-display text-3xl font-black">+{mine?.points ?? 0}</p>
              {!right && q && q.answer !== null && <p className="mt-3 text-white/85">Answer: <b>{q.options[q.answer]}</b></p>}
            </>
          ) : (
            <p className="font-display text-3xl font-black">{me?.rank ? `You're in ${ordinal(me.rank)} place` : "Scores are in"}</p>
          )}
          <p className="mt-4 font-bold text-white/85">
            {me?.rank === 1 ? "You're on top of the leaderboard! 👑" : me?.behind ? `${me.behind.by} points behind ${me.behind.name}` : me?.rank ? `${ordinal(me.rank)} of ${me.of}` : ""}
          </p>
        </div>
      </div>
    );
  }

  // Ended — podium.
  return (
    <div className={stage}>
      {top}
      <Podium rows={quiz.leaderboard} title={quiz.title} me={myName} />
      <p className="mt-4 text-center text-lg font-black">{me?.rank ? `You finished ${ordinal(me.rank)} with ${me.points} points` : "Thanks for playing!"}</p>
      {onDismiss && <button type="button" onClick={onDismiss} className="mx-auto mt-4 min-h-[48px] rounded-2xl bg-white px-6 font-black text-violet-800">Back to the board</button>}
    </div>
  );
}
