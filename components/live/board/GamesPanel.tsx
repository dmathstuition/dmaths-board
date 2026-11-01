"use client";
import { useEffect, useMemo, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import GamePlayer from "@/components/games/GamePlayer";
import { CLASS_GAMES, STAGE_LABEL, findGame, subjectOf, type ClassGame, type GameSubject, type Stage } from "@/lib/games/catalog";
import type { Difficulty } from "@/lib/games/generators";
import { UK_SETS, UK_STAGE_LABEL, findUKSet, gameItems, quizQuestions, type UKSet, type UKStage, type UKSubject } from "@/lib/ukPrimary";
import { useKeptState, type KeepStore } from "@/lib/keptState";

// Games and ready-made quizzes on the board, for early years and primary
// (following the England curriculum — lib/ukPrimary). The teacher can:
//   • play a game on the board for the whole class (share the screen / project it);
//   • send it to every learner's phone ("Let learners play");
//   • launch a ready-made quiz as a live quiz (Kahoot-style).
//
// Message: "game-open" (teacher → all, signed): { game } or { game: null },
// re-sent every few seconds while open so late joiners catch up.

const SUBJECT_COLORS: Record<UKSubject, [string, string]> = {
  Maths: ["#2563EB", "#7C3AED"], English: ["#DB2777", "#F97316"], Science: ["#059669", "#0EA5E9"],
};
export function ukGame(s: UKSet): ClassGame {
  return {
    id: `uk-${s.id}`, title: s.title, emoji: s.emoji, kind: "choice", skill: "mixed", seconds: 90,
    colors: SUBJECT_COLORS[s.subject], band: `${s.year} · ${s.subject}`, stage: "primary",
    subject: s.subject.toLowerCase() as GameSubject,
    tagline: `${s.year} ${s.subject.toLowerCase()} — ${s.topic}.`,
    howTo: "Tap the right answer (or press 1–4). Questions come round again, so learn from any you miss.",
  };
}
// Quick arcade games, from primary to A-Level (any difficulty), grouped by stage.
// Ages on the filter: the curriculum stages, plus secondary (JSS / KS3, SSS / KS4+).
type Age = UKStage | "all" | "junior" | "senior";
const AGE_LABEL: Record<"junior" | "senior", string> = { junior: "Secondary · JSS / KS3", senior: "Upper secondary · SSS / KS4 / A-Level" };
const ARCADE_STAGES: Record<Age, Stage[]> = { all: ["primary", "junior", "senior"], eyfs: [], ks1: ["primary"], ks2: ["primary"], junior: ["junior"], senior: ["senior"] };
const GROUP_LABEL: Record<Stage, string> = { primary: "Primary", junior: STAGE_LABEL.junior, senior: `${STAGE_LABEL.senior} & A-Level` };

// What's being played: a curriculum set, or an arcade game at a difficulty.
type Pick = { kind: "uk"; id: string } | { kind: "arcade"; id: string; difficulty: Difficulty };
const pickKey = (p: Pick) => (p.kind === "uk" ? `uk:${p.id}` : `arcade:${p.id}:${p.difficulty}`);
function parsePick(v: unknown): Pick | null {
  const [kind, id, d] = String(v ?? "").split(":");
  if (kind === "uk" && findUKSet(id)) return { kind, id };
  if (kind === "arcade" && findGame(id) && (d === "easy" || d === "medium" || d === "hard")) return { kind, id, difficulty: d };
  return null;
}
function Player({ pick, onExit, exitLabel }: { pick: Pick; onExit: () => void; exitLabel: string }) {
  if (pick.kind === "uk") {
    const s = findUKSet(pick.id)!;
    return <GamePlayer key={pickKey(pick)} game={ukGame(s)} items={gameItems(s)} difficulty="medium" mode="preview" backHref="#" backLabel={exitLabel} onExit={onExit} />;
  }
  return <GamePlayer key={pickKey(pick)} game={findGame(pick.id)!} difficulty={pick.difficulty} mode="preview" backHref="#" backLabel={exitLabel} onExit={onExit} />;
}
const titleOf = (p: Pick) => (p.kind === "uk" ? findUKSet(p.id)?.title : findGame(p.id)?.title) ?? "Game";

export default function GamesPanel({ host, open, onOpen, onClose, live, onLaunchQuiz, keep }: {
  host: boolean; open: boolean; onOpen: () => void; onClose: () => void;
  live: boolean; // in a class (not preparing a lesson)
  onLaunchQuiz?: (title: string, questions: ReturnType<typeof quizQuestions>) => Promise<string | null>; // null = launched
  keep?: KeepStore;
}) {
  const [tab, setTab] = useKeptState<"games" | "quizzes">(keep, "games:tab", "games");
  const [stage, setStage] = useKeptState<Age>(keep, "games:stage", "all");
  const [subject, setSubject] = useKeptState<UKSubject | "all">(keep, "games:subject", "all");
  const [playing, setPlaying] = useKeptState<string | null>(keep, "games:playing", null); // teacher: pickKey
  const [shared, setShared] = useKeptState(keep, "games:shared", false);
  const [theirs, setTheirs] = useKeptState<string | null>(keep, "games:theirs", null);  // learner
  const [hidden, setHidden] = useKeptState(keep, "games:hidden", false);
  const [difficulty, setDifficulty] = useKeptState<Difficulty>(keep, "games:difficulty", "easy");
  const [note, setNote] = useState<string | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);

  const send = useLive({
    "game-open": (p) => {
      if (host || !p?.host) return;
      const g = parsePick(p.game) ? String(p.game) : null;
      if (g && g !== theirs) setHidden(false);
      setTheirs(g);
    },
  });
  useEffect(() => {
    if (!host || !live) return;
    const tell = () => send("game-open", { host: true, game: shared ? playing : null });
    tell();
    if (!shared) return;
    const t = setInterval(tell, 4000);
    return () => clearInterval(t);
  }, [host, live, shared, playing, send]);

  // Esc hides the panel (and never reaches the board behind it).
  const showing = host ? open : !!theirs && !hidden;
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (host) onClose(); else setHidden(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showing, host, onClose, setHidden]);

  const sets = useMemo(() => UK_SETS.filter((s) => (stage === "all" || s.stage === stage) && (subject === "all" || s.subject === subject)), [stage, subject]);
  const arcade = useMemo(() => ARCADE_STAGES[stage].map((st) => ({
    stage: st, games: CLASS_GAMES.filter((g) => g.stage === st && (subject === "all" || subjectOf(g) === subject.toLowerCase())),
  })).filter((grp) => grp.games.length), [stage, subject]);

  // ── Learner: the game the teacher sent ──
  if (!host) {
    const pick = parsePick(theirs);
    if (!pick) return null;
    if (hidden) {
      return (
        <button type="button" onClick={() => setHidden(false)} className="fixed left-1/2 top-2 z-[96] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-[#4C1D95] px-4 py-2.5 text-sm font-black text-white shadow-2xl ring-1 ring-white/20">
          <BoardIcon name="game" /> <span className="truncate">Play {titleOf(pick)}</span>
        </button>
      );
    }
    return (
      <div role="dialog" aria-label={`Game: ${titleOf(pick)}`} data-board-overlay className="fixed inset-0 z-[96] overflow-y-auto overscroll-contain bg-[#1E1B4B]">
        <Player pick={pick} onExit={() => setHidden(true)} exitLabel="Back to the class board" />
      </div>
    );
  }

  // ── Teacher ──
  const current = parsePick(playing);
  function end() { setPlaying(null); setShared(false); onClose(); }
  if (!open) {
    if (!current) return null;
    return (
      <div className="fixed left-1/2 top-2 z-[95] flex max-w-[92vw] -translate-x-1/2 items-center gap-1 rounded-full bg-[#4C1D95] p-1 text-white shadow-2xl ring-1 ring-white/20">
        <button type="button" onClick={onOpen} className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-full px-3 text-sm font-black hover:bg-white/10">
          <BoardIcon name="game" /> <span className="truncate">{titleOf(current)}{shared ? " · learners playing" : ""}</span>
        </button>
        <button type="button" onClick={end} aria-label="End the game" title="End the game"
          className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-black hover:bg-red-500/80"><BoardIcon name="close" className="h-4 w-4" /> End</button>
      </div>
    );
  }

  const chip = (on: boolean) => `min-h-[36px] shrink-0 rounded-full px-3 text-xs font-black transition ${on ? "bg-white text-[#1E1B4B]" : "bg-white/10 text-white/80 hover:bg-white/15"}`;
  const btn = "flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-black disabled:opacity-50";
  async function launch(s: UKSet) {
    if (!onLaunchQuiz) return;
    setLaunching(s.id); setNote(null);
    const err = await onLaunchQuiz(`${s.title} (${s.year})`, quizQuestions(s));
    setLaunching(null);
    if (err) setNote(err); else onClose();
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Games and quizzes" data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#1E1B4B] text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5 sm:px-3">
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:flex"><BoardIcon name="game" /></span>
        <p className="min-w-0 flex-1 truncate text-sm font-black">{current ? `${titleOf(current)}` : "Games & quizzes"}</p>
        {current && live && (
          <label className={`${btn} bg-white/10`}>
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-amber-400" /> Let learners play
          </label>
        )}
        {current && <button type="button" onClick={() => { setPlaying(null); setShared(false); }} className={`${btn} bg-white/10 hover:bg-white/15`}>All games</button>}
        <button type="button" onClick={onClose} aria-label="Hide games" title="Hide — back to the board"
          className={`${btn} bg-white/10 hover:bg-white/15`}><BoardIcon name="down" className="h-4 w-4" /><span className="hidden sm:inline">Hide</span></button>
        <button type="button" onClick={end} aria-label={current ? "End the game" : "Close games"} title={current ? "End the game" : "Close"}
          className={`${btn} bg-red-500/90 hover:bg-red-500`}><BoardIcon name="close" className="h-4 w-4" />{current ? "End" : "Close"}</button>
      </div>

      {current ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <Player pick={current} onExit={() => { setPlaying(null); setShared(false); }} exitLabel="All games" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          <div className="mx-auto max-w-5xl">
            <div role="tablist" aria-label="Games or quizzes" className="flex gap-1 rounded-2xl bg-white/5 p-1 sm:inline-flex">
              {([["games", "🎮 Class games"], ["quizzes", "⚡ Ready-made quizzes"]] as const).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`min-h-[40px] flex-1 rounded-xl px-4 text-sm font-black ${tab === k ? "bg-white text-[#1E1B4B]" : "text-white/75"}`}>{label}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/55">Following the England curriculum: the EYFS for Reception, and the National Curriculum for Key Stages 1 and 2.</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter">
              {(["all", "eyfs", "ks1", "ks2", "junior", "senior"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)} className={chip(stage === s)}>{s === "all" ? "All ages" : s === "junior" || s === "senior" ? AGE_LABEL[s] : UK_STAGE_LABEL[s]}</button>
              ))}
              <span className="mx-1 w-px shrink-0 bg-white/15" aria-hidden />
              {(["all", "Maths", "English", "Science"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={subject === s} onClick={() => setSubject(s)} className={chip(subject === s)}>{s === "all" ? "All subjects" : s}</button>
              ))}
            </div>
            {note && <p role="alert" className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-200">{note}</p>}

            {tab === "games" ? (
              <>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sets.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => setPlaying(pickKey({ kind: "uk", id: s.id }))}
                        className="flex h-full w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 ring-white/10 transition hover:ring-white/40"
                        style={{ background: `linear-gradient(135deg, ${SUBJECT_COLORS[s.subject][0]}55, ${SUBJECT_COLORS[s.subject][1]}33)` }}>
                        <span className="text-3xl" aria-hidden>{s.emoji}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black">{s.title}</span>
                          <span className="block text-[11px] font-bold text-white/70">{s.year} · {s.subject}</span>
                          <span className="mt-0.5 block text-xs text-white/55">{s.topic}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {arcade.length > 0 && (
                  <>
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black">Quick-fire arcade games</p>
                      <span className="text-xs text-white/55">Questions made up fresh every round.</span>
                      <div className="ml-auto flex gap-1 rounded-full bg-white/5 p-1" role="radiogroup" aria-label="Difficulty">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <button key={d} type="button" role="radio" aria-checked={difficulty === d} onClick={() => setDifficulty(d)}
                            className={`min-h-[32px] rounded-full px-3 text-xs font-black capitalize ${difficulty === d ? "bg-amber-400 text-[#1E1B4B]" : "text-white/70"}`}>{d}</button>
                        ))}
                      </div>
                    </div>
                    {arcade.map((grp) => (
                      <section key={grp.stage} aria-label={GROUP_LABEL[grp.stage]}>
                        <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-amber-300">{GROUP_LABEL[grp.stage]} <span className="text-white/45">· {grp.games.length}</span></h3>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {grp.games.map((g) => (
                            <li key={g.id}>
                              <button type="button" onClick={() => setPlaying(pickKey({ kind: "arcade", id: g.id, difficulty }))}
                                className="flex h-full w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 ring-white/10 transition hover:ring-white/40"
                                style={{ background: `linear-gradient(135deg, ${g.colors[0]}55, ${g.colors[1]}33)` }}>
                                <span className="text-3xl" aria-hidden>{g.emoji}</span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-black">{g.title}</span>
                                  <span className="block text-[11px] font-bold text-white/60">{g.band}</span>
                                  <span className="mt-0.5 block text-xs text-white/60">{g.tagline}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                {!live && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70">Live quizzes run in a class — open these from the board during a live class. You can still play any of them as a game.</p>}
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {sets.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `linear-gradient(135deg, ${SUBJECT_COLORS[s.subject][0]}, ${SUBJECT_COLORS[s.subject][1]})` }} aria-hidden>{s.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{s.title}</p>
                        <p className="text-[11px] font-bold text-white/60">{s.year} · {s.subject} · {s.questions.length} questions</p>
                      </div>
                      <button type="button" onClick={() => setPlaying(pickKey({ kind: "uk", id: s.id }))} className={`${btn} bg-white/10 hover:bg-white/15`}>Game</button>
                      {live && onLaunchQuiz && (
                        <button type="button" disabled={!!launching} onClick={() => launch(s)} aria-label={`Launch ${s.title} as a live quiz`}
                          className={`${btn} bg-amber-400 text-[#1E1B4B] hover:bg-amber-300`}>{launching === s.id ? "Launching…" : "Live quiz"}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!sets.length && (tab === "quizzes" || !arcade.length) && <p className="mt-6 text-center text-sm text-white/50">{tab === "quizzes" && arcade.length ? "Ready-made quizzes are for early years and primary — the secondary games are in Class games." : "Nothing for that choice yet — try another age or subject."}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
