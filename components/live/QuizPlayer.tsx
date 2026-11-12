"use client";
import { Speak } from "@/components/live/Reading";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import type { QuizView } from "@/lib/liveQuiz";
import { ANSWER_STYLE, Shape, useCountdown } from "@/components/live/QuizBits";
import { Podium } from "@/components/live/QuizHostStage";
import { GameScene, MyTeam } from "@/components/live/QuizGames";
import { Backdrop, Briefing, ChapterBanner, LiveHud, worldOf } from "@/components/live/QuizWorld";
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
