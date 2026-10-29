"use client";
import type { HostBase } from "@/lib/liveSession";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Confetti from "@/components/ui/Confetti";
import { useLive } from "@/components/live/LiveChannel";
import type { QuizView } from "@/lib/liveQuiz";
import { formatCode } from "@/lib/liveSession";
import { ANSWER_STYLE, Leaderboard, Shape, secondsLeft, useCountdown } from "@/components/live/QuizBits";
import { clockSynced, useServerClock } from "@/lib/serverClock";
import { UK_SETS, UK_STAGE_LABEL, quizQuestions, type UKStage } from "@/lib/ukPrimary";

type SetRow = { id: string; title: string; subject: string; count: number; mine: boolean };
type Person = { id: string; name: string; online: boolean };

// The host's big screen for the live quiz — the part they share with the
// class. Picks a prepared quiz from the library, then runs it like Kahoot:
// lobby with the PIN and names → question with timer → answer chart →
// scoreboard → … → podium.
export default function QuizHostStage({ sessionId, code, people, base, onActive }: {
  sessionId: string; code: string; people: Person[]; base: HostBase; onActive?: (active: boolean) => void;
}) {
  const [quiz, setQuiz] = useState<QuizView | null>(null);
  const [offset, setOffset] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [dismissed, setDismissed] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/live-quiz?sessionId=${sessionId}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Couldn't load the quiz."); return; }
    setQuiz(j.quiz); if (j.serverNow) setOffset(j.serverNow - Date.now());
  }, [sessionId]);
  const send = useLive({ "quiz-answered": () => load() });
  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, [load]);
  // A quiz launched from the board's Games panel: show it straight away.
  useEffect(() => { window.addEventListener("live-quiz-launched", load); return () => window.removeEventListener("live-quiz-launched", load); }, [load]);
  useEffect(() => {
    fetch("/api/quiz-sets").then((r) => r.json()).then((j) => setSets(j.sets ?? [])).catch(() => setSets([]));
  }, []);

  const active = !!quiz && quiz.status !== "ended";
  useEffect(() => { onActive?.(active); }, [active, onActive]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    const r = await fetch("/api/live-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "That didn't work."); return null; }
    setErr(null); setQuiz(j.quiz); send("quiz-changed");
    return j.quiz as QuizView | null;
  }
  const next = () => quiz && act({ action: "next", quizId: quiz.id });

  const q = quiz?.question;
  const clock = useServerClock(); // the same class clock as the learners' phones
  const left = useCountdown(q?.startedAt, q?.seconds ?? 20, clockSynced() ? Math.round((clock() - Date.now()) / 100) * 100 : offset);

  // Like Kahoot: show the results as soon as time runs out or everyone answered.
  // The time check is recomputed from this question's own start (never a
  // leftover 0 from the last one), and the server double-checks it too.
  const autoRevealed = useRef<string>("");
  useEffect(() => {
    if (!quiz || quiz.status !== "question" || busy || !q?.startedAt) return;
    const key = `${quiz.id}:${quiz.current}`;
    const timeUp = secondsLeft(q.startedAt, q.seconds, offset) === 0;
    const everyone = quiz.roster > 0 && quiz.answered >= quiz.roster;
    if ((timeUp || everyone) && autoRevealed.current !== key) {
      autoRevealed.current = key;
      // If the server says "not yet" (clocks disagree), try again on the next tick.
      act({ action: "reveal", quizId: quiz.id, auto: true }).then((after) => {
        if (!after || after.status === "question") autoRevealed.current = "";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, quiz?.answered, quiz?.status, quiz?.current, q?.startedAt]);

  const stage = "quiz-stage relative min-h-[460px] overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_30px_60px_-30px_rgba(76,29,149,.8)] sm:p-8";

  // ── Pick a quiz ──
  if (!quiz || (quiz.status === "ended" && quiz.id === dismissed)) return picker();

  function picker() {
    const shown = (sets ?? []).filter((s) => !filter || `${s.title} ${s.subject}`.toLowerCase().includes(filter.toLowerCase()));
    return (
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Live quiz</p>
            <h2 className="mt-1 font-display text-2xl font-black text-ink">Pick a quiz to play</h2>
            <p className="mt-1 text-sm text-ink/60">Quizzes are made ahead of class in your quiz library. Launch one and share this screen.</p>
          </div>
          <Link href={`${base}/quizzes`} className="btn-ghost !min-h-[44px]">Quiz library →</Link>
        </div>
        {sets && sets.length > 4 && (
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search your quizzes" aria-label="Search quizzes" className="field mt-4" />
        )}
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {sets === null && [0, 1].map((i) => <li key={i} className="h-20 animate-pulse rounded-2xl bg-ink/5" />)}
          {shown.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-lg font-black text-white">{s.count}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{s.title}</p>
                <p className="text-xs text-ink/55">{s.count} question{s.count === 1 ? "" : "s"}{s.subject ? ` · ${s.subject}` : ""}{s.mine ? "" : " · shared"}</p>
              </div>
              <button type="button" disabled={busy || !s.count} onClick={() => act({ action: "launch", sessionId, setId: s.id })}
                className="min-h-[44px] rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-40">Launch</button>
            </li>
          ))}
        </ul>
        {sets?.length === 0 && (
          <div className="mt-2 rounded-2xl bg-violet-50 p-5 text-center">
            <p className="font-bold text-ink">No quizzes yet</p>
            <p className="mt-1 text-sm text-ink/60">Make one before class — type questions, pull from the question bank or let the A.I draft them.</p>
            <Link href={`${base}/quizzes?new=1`} className="btn-gold mt-3 inline-flex !min-h-[44px]">Create a quiz</Link>
          </div>
        )}
        <ReadyMade busy={busy} onLaunch={(title, questions) => act({ action: "launch", sessionId, title, questions })} />
        {quiz?.status === "ended" && <p className="mt-4 text-sm text-ink/55">Last quiz: {quiz.title}</p>}
        {err && <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{err}</p>}
      </div>
    );
  }

  const here = people.filter((p) => p.online);
  const counts = q?.counts ?? [];
  const max = Math.max(1, ...counts);

  return (
    <div className={stage}>
      {/* Top strip: PIN always visible for latecomers */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-white/80">
        <span className="truncate">{quiz.title}</span>
        <span className="flex items-center gap-2">
          {quiz.status !== "lobby" && quiz.status !== "ended" && <span className="rounded-full bg-white/15 px-3 py-1">{quiz.current + 1} / {quiz.total}</span>}
          <span className="rounded-full bg-white px-3 py-1 font-black text-violet-800">PIN {formatCode(code)}</span>
        </span>
      </div>

      {quiz.status === "lobby" && (
        <div className="mt-6 text-center">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-white/70">Join on your portal → Interactive class</p>
          <p className="quiz-pop mt-2 font-display text-6xl font-black tracking-wider sm:text-7xl">{formatCode(code)}</p>
          <p className="mt-4 text-lg font-bold">{here.length} player{here.length === 1 ? "" : "s"} ready</p>
          <ul className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
            {here.map((p, i) => <li key={p.id} className="quiz-pop rounded-xl bg-white/15 px-4 py-2 text-lg font-black" style={{ animationDelay: `${i * 40}ms` }}>{p.name}</li>)}
            {!here.length && <li className="quiz-bob text-white/60">Waiting for learners to join…</li>}
          </ul>
        </div>
      )}

      {quiz.status === "question" && q && (
        <div className="mt-5">
          <div className="quiz-pop rounded-2xl bg-white px-5 py-6 text-center text-ink shadow-xl">
            <p className="font-display text-2xl font-black leading-snug sm:text-3xl">{q.q}</p>
          </div>
          <div className="my-5 flex items-center justify-between">
            <span className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black ${left <= 5 ? "bg-red-500" : "bg-violet-500"} ring-4 ring-white/30`} aria-label={`${left} seconds left`}>{left}</span>
            <span className="text-right"><span className="block font-display text-4xl font-black">{quiz.answered}</span><span className="text-sm font-bold text-white/70">answer{quiz.answered === 1 ? "" : "s"}{quiz.roster ? ` of ${quiz.roster}` : ""}</span></span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <div key={k} className="quiz-rise flex min-h-[72px] items-center gap-3 rounded-2xl px-4 py-3 text-lg font-black shadow-lg" style={{ background: ANSWER_STYLE[k].color, animationDelay: `${k * 70}ms` }}>
                <Shape i={k} className="h-8 w-8 flex-shrink-0" /><span>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {quiz.status === "reveal" && q && (
        <div className="mt-5">
          <p className="rounded-2xl bg-white px-5 py-4 text-center font-display text-xl font-black text-ink">{q.q}</p>
          {/* Answer chart */}
          <div className="mx-auto mt-6 flex h-48 max-w-xl items-end justify-center gap-4">
            {q.options.map((_, k) => (
              <div key={k} className="flex w-20 flex-col items-center gap-1">
                <span className="text-xl font-black">{counts[k] ?? 0}{q.answer === k ? " ✓" : ""}</span>
                <div className="quiz-grow w-full rounded-t-xl" style={{ height: `${Math.max(6, ((counts[k] ?? 0) / max) * 140)}px`, background: ANSWER_STYLE[k].color, opacity: q.answer === k ? 1 : 0.45 }} />
                <span className="flex h-8 w-full items-center justify-center rounded-b-xl" style={{ background: ANSWER_STYLE[k].color, opacity: q.answer === k ? 1 : 0.45 }}><Shape i={k} className="h-5 w-5" /></span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <div key={k} className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-black ${q.answer === k ? "" : "opacity-40"}`} style={{ background: ANSWER_STYLE[k].color }}>
                <Shape i={k} className="h-6 w-6" /><span className="flex-1">{o}</span>{q.answer === k && <span aria-label="correct">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {quiz.status === "leaderboard" && (
        <div className="mx-auto mt-6 max-w-2xl">
          <p className="mb-4 text-center font-display text-4xl font-black">Scoreboard</p>
          <Leaderboard rows={quiz.leaderboard.slice(0, 5)} big />
        </div>
      )}

      {quiz.status === "ended" && <Podium rows={quiz.leaderboard} title={quiz.title} />}

      {err && <p className="mt-4 rounded-xl bg-red-500/20 px-3 py-2 text-sm font-bold" role="alert">{err}</p>}

      {/* Host controls */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {quiz.status === "lobby" && <button type="button" disabled={busy} onClick={next} className="min-h-[52px] rounded-2xl bg-white px-8 text-lg font-black text-violet-800 shadow-lg">▶ Start</button>}
        {quiz.status === "question" && <button type="button" disabled={busy} onClick={() => act({ action: "reveal", quizId: quiz.id })} className="min-h-[48px] rounded-2xl bg-white/15 px-6 font-black hover:bg-white/25">Skip timer</button>}
        {(quiz.status === "reveal" || quiz.status === "leaderboard") && (
          <button type="button" disabled={busy} onClick={next} className="min-h-[52px] rounded-2xl bg-white px-8 text-lg font-black text-violet-800 shadow-lg">
            {quiz.status === "reveal" ? (quiz.current + 1 >= quiz.total ? "Podium 🏆" : "Scoreboard →") : "Next question →"}
          </button>
        )}
        {quiz.status === "ended" && <button type="button" onClick={() => setDismissed(quiz.id)} className="min-h-[48px] rounded-2xl bg-white px-6 font-black text-violet-800">Play another quiz</button>}
        {quiz.status !== "ended" && (
          <button type="button" disabled={busy} onClick={() => { if (confirm("End the quiz now? Scores so far will be shown on the podium.")) act({ action: "end", quizId: quiz.id }); }}
            className="ml-auto min-h-[44px] rounded-xl px-4 text-sm font-bold text-white/70 hover:bg-white/10">End quiz</button>
        )}
      </div>
    </div>
  );
}

export function Podium({ rows, title, me }: { rows: { name: string; points: number }[]; title: string; me?: string }) {
  const [first, second, third] = rows;
  const col = (r: { name: string; points: number } | undefined, place: number, h: string, delay: number) => (
    <div className="flex w-1/3 max-w-[180px] flex-col items-center">
      {r && <p className={`quiz-pop mb-2 max-w-full truncate px-1 text-center font-black ${place === 1 ? "text-lg sm:text-2xl" : "text-base sm:text-lg"} ${r.name === me ? "text-amber-300" : ""}`} style={{ animationDelay: `${delay + 300}ms` }}>{r.name}</p>}
      {r && <p className="mb-1 font-mono text-sm font-bold text-white/80">{r.points}</p>}
      <div className={`quiz-grow flex w-full items-start justify-center rounded-t-2xl pt-3 font-display text-4xl font-black ${place === 1 ? "bg-amber-400 text-[#3b2600]" : place === 2 ? "bg-slate-200 text-slate-700" : "bg-orange-400 text-[#3b1800]"}`} style={{ height: h, animationDelay: `${delay}ms` }}>
        {r ? place : ""}
      </div>
    </div>
  );
  return (
    <div className="relative mt-4 text-center">
      <Confetti fire pieces={90} />
      <p className="font-display text-3xl font-black">🏆 {title}</p>
      <div className="mx-auto mt-6 flex max-w-xl items-end justify-center gap-2">
        {col(second, 2, "120px", 300)}
        {col(first, 1, "170px", 600)}
        {col(third, 3, "90px", 0)}
      </div>
      {rows.length > 3 && (
        <ol className="mx-auto mt-5 max-w-md space-y-1 text-left">
          {rows.slice(3, 10).map((r, i) => (
            <li key={`${r.name}-${i}`} className={`flex justify-between rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold ${r.name === me ? "ring-2 ring-amber-300" : ""}`}><span>{i + 4}. {r.name}</span><span className="font-mono">{r.points}</span></li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Ready-made quizzes for early years and primary (England curriculum), launched
// in one click — nothing to prepare.
function ReadyMade({ busy, onLaunch }: { busy: boolean; onLaunch: (title: string, questions: ReturnType<typeof quizQuestions>) => void }) {
  const [stage, setStage] = useState<UKStage>("ks1");
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 rounded-2xl bg-violet-50/70 p-4 ring-1 ring-violet-100">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="block font-black text-ink">Ready-made quizzes — early years &amp; primary</span>
          <span className="block text-xs text-ink/60">{UK_SETS.length} quizzes following the England curriculum, Reception to Year 6. Launch one with no preparation.</span>
        </span>
        <span className="text-xl text-violet-700" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Age">
            {(Object.keys(UK_STAGE_LABEL) as UKStage[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={stage === k} onClick={() => setStage(k)}
                className={`min-h-[36px] rounded-full px-3 text-xs font-black ${stage === k ? "bg-violet-600 text-white" : "bg-white text-ink/70 ring-1 ring-line"}`}>{UK_STAGE_LABEL[k]}</button>
            ))}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {UK_SETS.filter((s) => s.stage === stage).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
                <span className="text-2xl" aria-hidden>{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{s.title}</p>
                  <p className="text-xs text-ink/55">{s.year} · {s.subject} · {s.questions.length} questions</p>
                </div>
                <button type="button" disabled={busy} onClick={() => onLaunch(`${s.title} (${s.year})`, quizQuestions(s))}
                  className="min-h-[44px] rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-40">Launch</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
