"use client";
import { Speak } from "@/components/live/Reading";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import type { QuizView } from "@/lib/liveQuiz";
import { ANSWER_STYLE, Shape, useCountdown } from "@/components/live/QuizBits";
import { Podium } from "@/components/live/QuizHostStage";
import { GameScene, MyTeam } from "@/components/live/QuizGames";
import { Backdrop, Briefing, ChapterBanner, LiveHud, worldOf } from "@/components/live/QuizWorld";
import { MyStage, type Phase } from "@/components/live/QuizMyStage";
import { cleanGame, modeInfo, type GameState } from "@/lib/quizGames";
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

export default function QuizPlayer({ sessionId, myName, myId = "", onState, onDismiss }: {
  sessionId: string; myName: string; myId?: string;
  onState?: (s: { id: string; status: string } | null) => void; onDismiss?: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  const [offset, setOffset] = useState(0);
  const [sending, setSending] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sure, setSure] = useState<{ key: string; sure: boolean } | null>(null); // confidence check for this question

  // The answer this phone gave to the current question. A reply that's a
  // second behind (another server) mustn't flip the screen back to the buttons.
  const mineRef = useRef<Mine>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/live-quiz?sessionId=${sessionId}`).catch(() => null);
    if (!r?.ok) return;
    const j = await r.json().catch(() => ({}));
    setQuiz(keepMine(j.quiz, mineRef.current)); if (j.serverNow) setOffset(j.serverNow - Date.now());
  }, [sessionId]);
  // The game style the teacher picked, drawn from what the teacher's screen sends (lib/quizGames.ts).
  const [gameIn, setGameIn] = useState<GameState | null>(null);
  const send = useLive({
    "quiz-changed": () => load(),
    "quiz-game": (p) => { if (p?.host) setGameIn(cleanGame(p.game)); },
  });
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
  const seen = useRef<{ now: GameState | null; before: GameState | null }>({ now: null, before: null });
  const asking = quiz?.status === "question" ? quiz.current : -1;
  useEffect(() => {
    if (asking < 0) return;
    // Wait a moment: the room shows the quiz panel only after it hears a quiz started.
    const t = setTimeout(() => boxRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
    return () => clearTimeout(t);
  }, [asking]);

  if (!quiz) return null;
  const me = quiz.me;
  const game = gameIn && gameIn.quizId === quiz.id && gameIn.mode !== "classic" ? gameIn : null;
  // The round before, so the scene can move on from where it was.
  if (game && (seen.current.now?.quizId !== game.quizId || seen.current.now?.round !== game.round)) seen.current = { before: seen.current.now?.quizId === game.quizId ? seen.current.now : null, now: game };
  const scene = game && <div className="mt-5 w-full"><GameScene key={`${game.quizId}-${game.mode}`} g={game} from={seen.current.before} myId={myId} sound /></div>;
  // With a game style, everything happens in the game's world (components/live/QuizWorld).
  const world = game ? worldOf(game.mode) : null;
  const shell = "relative isolate flex min-h-[70vh] flex-col overflow-hidden rounded-[1.75rem] p-4 text-white sm:min-h-[520px] sm:p-6";
  const stage = `${shell} ${world ? "" : "quiz-stage"}`;
  const backdrop = game && <Backdrop mode={game.mode} />;
  const top = (
    <div className="flex items-center justify-between text-sm font-black text-white/80">
      <span>{quiz.status === "lobby" || quiz.status === "ended" ? quiz.title : `${quiz.current + 1} of ${quiz.total}`}</span>
      <span className="flex items-center gap-1.5"><MyTeam g={game} myId={myId} className="!py-0.5 !text-xs" /><span className="rounded-full bg-white/15 px-3 py-1">{myName} · {me?.points ?? 0}</span></span>
    </div>
  );

  // ── With a game style: the phone becomes the game, full screen, inside its world ──
  if (game && world) {
    const mine = me?.answer, right = !!mine?.correct;
    const phase: Phase = quiz.status === "question" ? (mine ? "locked" : "think") : quiz.status === "reveal" ? (right ? "right" : "wrong") : "ready";
    const done = quiz.status === "lobby" ? 0 : quiz.status === "question" ? quiz.current : quiz.status === "ended" ? quiz.total : quiz.current + 1;
    const bar = (
      <div className="flex items-center gap-2 rounded-2xl bg-black/45 px-2.5 py-1.5 ring-1 ring-white/15 backdrop-blur-sm" aria-label="Game bar">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl ring-2 ring-white/40" style={{ background: world.ribbon }} aria-hidden>{world.hero}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-black"><span className="truncate">{myName}</span><MyTeam g={game} myId={myId} className="!px-2 !py-0 !text-[11px]" /></p>
          <div className="mt-1 flex gap-0.5" aria-label={`${Math.min(done, quiz.total)} of ${quiz.total} questions done`}>
            {Array.from({ length: Math.min(quiz.total, 20) }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.round((done / quiz.total) * Math.min(quiz.total, 20)) ? "bg-amber-300" : i === quiz.current && quiz.status === "question" ? "bg-white" : "bg-white/25"}`} />)}
          </div>
        </div>
        <span key={me?.points ?? 0} className="qp-score shrink-0 rounded-xl bg-amber-400 px-2.5 py-1 font-mono text-sm font-black text-[#3b2600]" aria-label="Your score">⭐ {me?.points ?? 0}</span>
      </div>
    );
    let body: React.ReactNode;
    if (quiz.status === "lobby") {
      body = (
        <div className="my-auto grid gap-3 text-center">
          <MyStage g={game} myId={myId} phase="ready" tall />
          <p className="quiz-pop font-display text-3xl font-black">You&apos;re in, {myName}!</p>
          <p className="text-2xl font-black">{modeInfo(game.mode).emoji} {modeInfo(game.mode).name}</p>
          <MyTeam g={game} myId={myId} className="quiz-pop mx-auto inline-block !px-5 !py-2 !text-xl" />
          <Briefing mode={game.mode} />
          <p className="quiz-bob text-sm font-bold text-white/75">Waiting for your teacher to start…</p>
        </div>
      );
    } else if (quiz.status === "question" && q && !mine) {
      body = (
        <>
          <div className="grid gap-1.5 [@media(max-height:560px)]:hidden">
            <ChapterBanner mode={game.mode} idx={quiz.current} total={quiz.total} small />
            <LiveHud g={game} myId={myId} compact />
          </div>
          <div className="[@media(max-height:600px)]:hidden"><MyStage g={game} myId={myId} phase="think" /></div>
          <div className="flex items-start gap-3 rounded-2xl bg-white p-3 text-ink shadow-xl" style={{ borderTop: `6px solid ${world.ribbon}` }}>
            <p className="max-h-[24vh] flex-1 overflow-y-auto font-display text-lg font-black leading-snug">{q.q}</p>
            <Speak text={`${q.q}. ${q.options.map((o, i) => `Option ${i + 1}: ${o}.`).join(" ")}`} />
            <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-black text-white ${left <= 5 ? "bg-red-500" : ""}`} style={left > 5 ? { background: world.ribbon } : undefined} aria-label={`${left} seconds left`}>{left}</span>
          </div>
          <div className="grid max-h-[44vh] min-h-[200px] flex-1 auto-rows-fr grid-cols-2 gap-2">
            {q.options.map((o, k) => (
              <button key={k} type="button" disabled={left === 0 || sending !== null} onClick={() => answer(k)}
                className={`qw-btn flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl p-2 text-center font-black transition disabled:opacity-50 ${sending === k ? "ring-4 ring-white" : ""}`}
                style={{ background: ANSWER_STYLE[k].color }} aria-label={`${ANSWER_STYLE[k].shape}: ${o}`}>
                <Shape i={k} className="h-8 w-8 shrink-0" /><span className="line-clamp-3 text-[15px] leading-snug">{o}</span>
              </button>
            ))}
          </div>
          <p className="min-h-[18px] text-center text-sm font-bold" role="status">{note ?? (left === 0 ? "Time's up" : "")}</p>
        </>
      );
    } else if (quiz.status === "question" && mine) {
      const key = `${quiz.id}:${quiz.current}`, said = sure?.key === key ? sure.sure : null;
      const tell = (v: boolean) => { setSure({ key, sure: v }); send("quiz-sure", { quiz: quiz.id, idx: quiz.current, by: myId || myName, name: myName, choice: mine.choice, sure: v }); };
      body = (
        <div className="my-auto grid gap-3 text-center">
          <ChapterBanner mode={game.mode} idx={quiz.current} total={quiz.total} small />
          <MyStage g={game} myId={myId} phase="locked" tall />
          <p className="font-display text-3xl font-black">Answer locked in</p>
          <p className="-mt-2 text-lg font-black text-amber-200">{world.locked}</p>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: ANSWER_STYLE[mine.choice].color }}><Shape i={mine.choice} className="h-8 w-8" /></span>
          <div role="group" aria-label="How sure are you?">
            <p className="font-bold text-white/85">How sure are you?</p>
            <div className="mt-2 flex justify-center gap-2">
              <button type="button" onClick={() => tell(true)} aria-pressed={said === true} className={`qw-btn min-h-[48px] rounded-2xl px-5 font-black ${said === true ? "bg-white text-violet-700" : "bg-white/20"}`}>😎 Sure</button>
              <button type="button" onClick={() => tell(false)} aria-pressed={said === false} className={`qw-btn min-h-[48px] rounded-2xl px-5 font-black ${said === false ? "bg-white text-violet-700" : "bg-white/20"}`}>🤔 Not sure</button>
            </div>
          </div>
          <LiveHud g={game} myId={myId} compact />
        </div>
      );
    } else if (quiz.status === "reveal" || quiz.status === "leaderboard") {
      body = (
        <div className="grid gap-3 text-center">
          {quiz.status === "reveal" ? (
            <>
              <MyStage g={game} myId={myId} phase={phase} tall />
              <p className="quiz-pop font-display text-5xl font-black">{mine ? (right ? "Correct!" : "Incorrect") : "Time's up"}</p>
              <p className="quiz-pop text-xl font-black" style={{ animationDelay: "150ms" }}>{right ? world.right : world.wrong}</p>
              <p className="quiz-pop mx-auto rounded-2xl bg-black/30 px-6 py-2 font-display text-3xl font-black" style={{ animationDelay: "250ms" }}>+{mine?.points ?? 0}</p>
              {right && (mine?.streak ?? 0) >= 2 && <p className="mx-auto rounded-full bg-white/20 px-4 py-1.5 font-black">🔥 Answer streak {mine?.streak}</p>}
              {!right && q && q.answer !== null && <p className="text-white/90">Answer: <b>{q.options[q.answer]}</b></p>}
            </>
          ) : (
            <p className="pt-2 font-display text-3xl font-black">{me?.rank ? `You're in ${ordinal(me.rank)} place` : "Scores are in"}</p>
          )}
          <p className="font-bold text-white/90">{me?.rank === 1 ? "You're on top of the leaderboard! 👑" : me?.behind ? `${me.behind.by} points behind ${me.behind.name}` : me?.rank ? `${ordinal(me.rank)} of ${me.of}` : ""}</p>
          {scene}
        </div>
      );
    } else {
      body = (
        <div className="grid gap-2">
          {scene}
          <Podium rows={quiz.leaderboard} title={quiz.title} me={myName} />
          <p className="text-center text-lg font-black">{me?.rank ? `You finished ${ordinal(me.rank)} with ${me.points} points` : "Thanks for playing!"}</p>
          {onDismiss && <button type="button" onClick={onDismiss} className="qw-btn mx-auto min-h-[48px] rounded-2xl bg-white px-6 font-black text-violet-800">Back to the board</button>}
        </div>
      );
    }
    return (
      <div ref={boxRef} className="fixed inset-0 z-[70] isolate overflow-y-auto text-white" role="region" aria-label="Quiz game">
        <div className="fixed inset-0 -z-10" aria-hidden><Backdrop mode={game.mode} /></div>
        {quiz.status === "reveal" && <div aria-hidden className={`qg-pop pointer-events-none fixed inset-0 -z-[5] ${right ? "bg-emerald-500/40" : "bg-rose-600/45"}`} />}
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-2 p-3">
          {bar}
          {body}
        </div>
      </div>
    );
  }

  if (quiz.status === "lobby") {
    return (
      <div className={stage}>
        {backdrop}
        {top}
        <div className="m-auto text-center">
          <p className="quiz-pop font-display text-4xl font-black">You&apos;re in!</p>
          <p className="mt-2 text-lg font-bold text-white/80">See your name on the screen?</p>
          <div className="quiz-bob mx-auto mt-6 flex w-fit gap-2">{[0, 1, 2, 3].map((k) => <span key={k} className="rounded-lg p-2" style={{ background: ANSWER_STYLE[k].color }}><Shape i={k} className="h-6 w-6" /></span>)}</div>
          {game && <p className="quiz-pop mt-6 text-2xl font-black">{modeInfo(game.mode).emoji} {modeInfo(game.mode).name}</p>}
          {game && <Briefing mode={game.mode} />}
          {game && <MyTeam g={game} myId={myId} className="quiz-pop mt-3 inline-block !px-5 !py-2 !text-xl" />}
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
          {backdrop}
          {top}
          <div className="m-auto text-center">
            {world && <p className="mb-4 text-6xl" aria-hidden><span className="qw-rev">{world.hero}</span></p>}
            <span className="quiz-pop mx-auto flex h-24 w-24 items-center justify-center rounded-3xl" style={{ background: ANSWER_STYLE[mine.choice].color }}><Shape i={mine.choice} className="h-12 w-12" /></span>
            <p className="mt-5 font-display text-3xl font-black">Answer locked in</p>
            {world && <p className="mt-1 text-lg font-black text-amber-200">{world.locked}</p>}
            {(() => {
              const key = `${quiz.id}:${quiz.current}`;
              const said = sure?.key === key ? sure.sure : null;
              const tell = (v: boolean) => { setSure({ key, sure: v }); send("quiz-sure", { quiz: quiz.id, idx: quiz.current, by: myId || myName, name: myName, choice: mine.choice, sure: v }); };
              return (
                <div className="mt-4" role="group" aria-label="How sure are you?">
                  <p className="font-bold text-white/85">How sure are you?</p>
                  <div className="mt-2 flex justify-center gap-2">
                    <button type="button" onClick={() => tell(true)} aria-pressed={said === true} className={`min-h-[48px] rounded-2xl px-5 font-black ${said === true ? "bg-white text-violet-700" : "bg-white/15"}`}>😎 Sure</button>
                    <button type="button" onClick={() => tell(false)} aria-pressed={said === false} className={`min-h-[48px] rounded-2xl px-5 font-black ${said === false ? "bg-white text-violet-700" : "bg-white/15"}`}>🤔 Not sure</button>
                  </div>
                  {said == null && <p className="quiz-bob mt-2 text-sm text-white/70">Were you fast enough…?</p>}
                </div>
              );
            })()}
          </div>
        </div>
      );
    }
    // The question screen always fits the screen (phones upright or sideways):
    // the answers share the space left under the question instead of a fixed height.
    return (
      <div ref={boxRef} className={`relative isolate flex h-[calc(100dvh-16px)] max-h-[760px] min-h-[300px] scroll-mt-2 flex-col overflow-hidden rounded-[1.75rem] p-3 text-white sm:p-5 [@media(max-height:520px)]:p-2.5 ${world ? "" : "quiz-stage"}`}>
        {backdrop}
        {top}
        {game && (
          <div className="mt-2 grid gap-1.5 [@media(max-height:560px)]:hidden">
            <ChapterBanner mode={game.mode} idx={quiz.current} total={quiz.total} small />
            <LiveHud g={game} myId={myId} compact />
          </div>
        )}
        <div className="mt-2 flex items-start gap-3 rounded-2xl bg-white p-3 text-ink sm:mt-3 sm:p-4 [@media(max-height:520px)]:py-2">
          <p className="max-h-[30vh] flex-1 overflow-y-auto font-display text-lg font-black leading-snug [@media(max-height:520px)]:text-base">{q.q}</p>
          <Speak text={`${q.q}. ${q.options.map((o, i) => `Option ${i + 1}: ${o}.`).join(" ")}`} />
          <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-black text-white ${left <= 5 ? "bg-red-500" : "bg-violet-600"}`} style={world && left > 5 ? { background: world.ribbon } : undefined} aria-label={`${left} seconds left`}>{left}</span>
        </div>
        <div className="mt-2 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 sm:mt-3 sm:gap-3 [@media(max-height:520px)]:grid-cols-4">
          {q.options.map((o, k) => (
            <button key={k} type="button" disabled={left === 0 || sending !== null} onClick={() => answer(k)}
              className={`qw-btn flex min-h-[56px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl p-2 text-center font-black transition active:scale-95 disabled:opacity-50 sm:gap-2 sm:p-3 ${sending === k ? "ring-4 ring-white" : ""}`}
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
        {quiz.status !== "reveal" && backdrop}
        {top}
        <div className="m-auto text-center">
          {quiz.status === "reveal" ? (
            <>
              <p className="quiz-pop font-display text-5xl font-black">{mine ? (right ? "Correct!" : "Incorrect") : "Time's up"}</p>
              <p className="quiz-pop mt-3 text-5xl" aria-hidden>{right ? "✔" : "✖"}</p>
              {world && <p className="quiz-pop mt-2 text-xl font-black" style={{ animationDelay: "150ms" }}>{right ? world.right : world.wrong}</p>}
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
          {scene}
        </div>
      </div>
    );
  }

  // Ended — podium.
  return (
    <div className={stage}>
      {backdrop}
      {top}
      {scene}
      <Podium rows={quiz.leaderboard} title={quiz.title} me={myName} />
      <p className="mt-4 text-center text-lg font-black">{me?.rank ? `You finished ${ordinal(me.rank)} with ${me.points} points` : "Thanks for playing!"}</p>
      {onDismiss && <button type="button" onClick={onDismiss} className="mx-auto mt-4 min-h-[48px] rounded-2xl bg-white px-6 font-black text-violet-800">Back to the board</button>}
    </div>
  );
}
