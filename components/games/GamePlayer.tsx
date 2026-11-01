"use client";
import { addTags, skillLabel, tierColor, type TagTally, type Tier } from "@/lib/games/performance";
import MistakeReplay from "@/components/games/MistakeReplay";
import { collectMistakes, fixedTags } from "@/lib/games/mistakes";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import Confetti from "@/components/ui/Confetti";
import type { Difficulty, Rng } from "@/lib/games/generators";
import type { MistakeItem } from "@/lib/games/mistakes";
import type { ChoiceQ } from "@/lib/games/senior";
import { DIFFICULTY_LABEL, starsFor, type ClassGame, type GameKind } from "@/lib/games/catalog";
import QuizEngine from "@/components/games/engines/QuizEngine";
import BalloonEngine from "@/components/games/engines/BalloonEngine";
import MatchEngine from "@/components/games/engines/MatchEngine";
import TrueFalseEngine from "@/components/games/engines/TrueFalseEngine";
import BondsEngine from "@/components/games/engines/BondsEngine";
import { aiKindFor, validateItem } from "@/lib/games/aiBank";
import { addExtra, extraCount } from "@/lib/games/englishBank";
import { answer, isLightning, newPowerState, type Chest, type PowerEvent } from "@/lib/games/powerups";
import { useGameFx } from "@/lib/games/fx";
import ChoiceEngine from "@/components/games/engines/ChoiceEngine";
import LettersEngine from "@/components/games/engines/LettersEngine";

// The arcade shell every class game runs inside: intro → 3-2-1 → play →
// results. Engines only report right/wrong; scoring, combo and the clock live
// here so every game scores the same way.

// `tags` (optional) names the question's topic, e.g. "×7 table" — see lib/games/performance.ts.
// `item` is the question itself (for "Fix my mistakes"); `rng` makes every
// player in a race get the same questions; `items` replaces the generated
// questions with a fixed list (a lesson recap game — choice games only).
export type ReportItem = Omit<MistakeItem, "tag"> & { tag?: string };
export type EngineProps = {
  game: ClassGame; difficulty: Difficulty;
  report: (correct: boolean, tags?: string[], item?: ReportItem) => void;
  rng?: Rng; items?: ChoiceQ[];
};

export const ENGINES: Record<GameKind, ComponentType<EngineProps>> = {
  quiz: QuizEngine, balloon: BalloonEngine, match: MatchEngine, truefalse: TrueFalseEngine, bonds: BondsEngine, choice: ChoiceEngine, letters: LettersEngine,
};

type Phase = "intro" | "countdown" | "playing" | "over";

const stars = starsFor;

export default function GamePlayer({
  game, difficulty, mode, initialBest = 0, backHref, backLabel = "All games", saveTo, items, onSaved, title, onExit, onRound,
}: {
  game: ClassGame; difficulty: Difficulty; mode: "play" | "preview"; initialBest?: number; backHref: string; backLabel?: string;
  saveTo?: { url: string; body?: Record<string, unknown> }; // where the round is saved (adventure stop, recap game)
  items?: ChoiceQ[];                                       // fixed questions (recap game)
  onSaved?: (reply: any) => void;                          // the save reply (adventure progress)
  title?: string;
  onExit?: () => void; // played inside a board: a button closes it instead of the links away
  onRound?: (r: { score: number; correct: number; attempts: number }) => void; // a round finished (board stars)
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(game.seconds);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [flash, setFlash] = useState<{ ok: boolean; pts: number; k: number; x?: number } | null>(null);
  const [best, setBest] = useState(initialBest);
  const [newBest, setNewBest] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [earned, setEarned] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const endAt = useRef(0);
  const tally = useRef({ score: 0, correct: 0, attempts: 0, streak: 0, tags: {} as TagTally, startedAt: 0, mistakes: [] as MistakeItem[], power: newPowerState(), bestAtStart: 0, bestPinged: false });
  // Power-up moments and celebrations (lib/games/powerups.ts, lib/games/fx.ts).
  const { prefs, update: setFx, fx, lowData } = useGameFx();
  const [lightning, setLightning] = useState(false);
  const [comeback, setComeback] = useState(false);
  const [shield, setShield] = useState(false);
  const [moment, setMoment] = useState<{ k: number; emoji: string; title: string; sub?: string; tone: string } | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [replay, setReplay] = useState<"off" | "on" | "done">("off");
  const [mastered, setMastered] = useState<{ tags: string[]; points: number } | null>(null);
  const [extra, setExtra] = useState<any>(null);
  const [result, setResult] = useState<{ rating: number; tier: Tier; ratingChange: number | null; tierUp: boolean } | null>(null);
  const [roundTags, setRoundTags] = useState<TagTally>({});

  const Engine = ENGINES[game.kind];

  // Word & grammar games: fetch fresh A.I-written items while the intro shows
  // and mix them into the bank. Each item is re-checked here too; if anything
  // fails the game simply runs on its built-in questions.
  const [aiCount, setAiCount] = useState(0);
  useEffect(() => {
    const kind = aiKindFor(game.skill);
    if (!kind) return;
    setAiCount(extraCount(kind, difficulty));
    let cancelled = false;
    fetch(`/api/games/ai-pack?skill=${encodeURIComponent(game.skill)}&d=${difficulty}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !Array.isArray(j?.items)) return;
        addExtra(kind, difficulty, j.items.map((x: unknown) => validateItem(kind, difficulty, x)).filter(Boolean));
        setAiCount(extraCount(kind, difficulty));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [game.skill, difficulty]);

  function start() {
    tally.current = { score: 0, correct: 0, attempts: 0, streak: 0, tags: {}, startedAt: 0, mistakes: [], power: newPowerState(), bestAtStart: best, bestPinged: false };
    setLightning(isLightning(tally.current.power)); setComeback(false); setShield(false); setMoment(null); setLevelUp(null);
    setResult(null); setRoundTags({}); setEarned(null); setMistakes([]); setReplay("off"); setMastered(null); setExtra(null);
    setScore(0); setStreak(0); setBestStreak(0); setCorrect(0); setAttempts(0);
    setLeft(game.seconds); setNewBest(false); setSaveNote(""); setFlash(null);
    setCount(3); setPhase("countdown");
  }

  // 3-2-1-GO
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      endAt.current = Date.now() + game.seconds * 1000;
      tally.current.startedAt = Date.now();
      setRound((r) => r + 1);
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count, game.seconds]);

  const finish = useCallback(async () => {
    setPhase("over");
    const t = tally.current;
    fx(t.score > best && best > 0 ? "best" : "finish");
    if (t.score > best) { setBest(t.score); setNewBest(true); }
    setRoundTags({ ...t.tags });
    setMistakes(collectMistakes(t.mistakes));
    const avgMs = t.attempts ? Math.round((Math.min(Date.now(), endAt.current) - t.startedAt) / t.attempts) : 0;
    onRound?.({ score: t.score, correct: t.correct, attempts: t.attempts });
    if (mode !== "play") { setSaveNote(onExit ? "" : "Preview round — scores aren't saved."); return; }
    const res = await fetch(saveTo?.url ?? "/api/games/score", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, score: t.score, correct: t.correct, attempts: t.attempts, avgMs, tags: t.tags, missed: collectMistakes(t.mistakes).map((m) => m.prompt), ...(saveTo?.body ?? {}) }),
    }).catch(() => null);
    if (!res?.ok) { setSaveNote("Couldn't save this score — check your connection."); return; }
    const j = await res.json().catch(() => ({}));
    if (typeof j.best === "number") { setBest(j.best); setNewBest(!!j.newBest); }
    if (typeof j.pointsEarned === "number") setEarned(j.pointsEarned);
    setExtra(j); onSaved?.(j);
    if (typeof j.rating === "number") setResult({ rating: j.rating, tier: j.tier, ratingChange: j.ratingChange ?? null, tierUp: !!j.tierUp });
    if (j.tierUp && j.tier) { setLevelUp(String(j.tier)); fx("levelUp"); }
    else if (j.chapterComplete || j.newBest) fx("best");
  }, [best, mode, game.id, saveTo, onSaved, fx, onExit, onRound]);

  // The clock
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const ms = endAt.current - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0) { clearInterval(id); finish(); }
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish]);

  const celebrate = useCallback((emoji: string, title: string, tone: string, sub?: string) => {
    setMoment((m) => ({ k: (m?.k ?? 0) + 1, emoji, title, sub, tone }));
  }, []);

  const report = useCallback((ok: boolean, tags?: string[], item?: ReportItem) => {
    const t = tally.current;
    t.attempts++;
    if (!ok && item) t.mistakes.push({ ...item, tag: item.tag ?? tags?.[0] ?? skillLabel(game) });
    if (tags?.length) addTags(t.tags, tags, ok);
    const r = answer(t.power, ok);
    t.power = r.state;
    t.streak = r.state.streak;
    if (ok) { t.score += r.points; t.correct++; }
    if (r.chest?.kind === "time") endAt.current += r.chest.amount * 1000;
    const has = (e: PowerEvent) => r.events.includes(e);
    // The loudest moment wins the banner and the sound.
    if (r.chest) { celebrate(r.chest.emoji, "Mystery chest!", "from-amber-300 to-orange-400 text-amber-950", (r.chest as Chest).label); fx("chest"); }
    else if (has("lightning")) { celebrate("⚡", "Lightning! Double points", "from-yellow-200 to-amber-300 text-amber-950"); fx("lightning"); }
    else if (has("comeback")) { celebrate("💪", "Comeback! Double points", "from-emerald-200 to-teal-300 text-emerald-950", "That's the way — keep going!"); fx("combo"); }
    else if (has("combo")) { celebrate("🔥", `${t.streak} in a row!`, "from-orange-300 to-rose-400 text-white"); fx("combo"); }
    else if (has("shield-saved")) { celebrate("🛡️", "Shield used — combo saved!", "from-sky-200 to-indigo-300 text-indigo-950"); fx("wrong"); }
    else if (has("comeback-ready")) { celebrate("💪", "Comeback bonus ready", "from-emerald-100 to-teal-200 text-emerald-950", "Your next right answer counts double."); fx("wrong"); }
    else fx(ok ? "correct" : "wrong");
    if (ok && !t.bestPinged && t.bestAtStart > 0 && t.score > t.bestAtStart) {
      t.bestPinged = true;
      celebrate("🏆", "New best!", "from-amber-300 to-yellow-200 text-amber-950", `You beat ${t.bestAtStart}`);
      fx("best");
    }
    setLightning(isLightning(r.state)); setComeback(r.state.comeback); setShield(r.state.shield);
    setScore(t.score); setCorrect(t.correct); setAttempts(t.attempts); setStreak(t.streak);
    setBestStreak((b) => Math.max(b, t.streak));
    setFlash({ ok, pts: r.points, k: t.attempts, x: r.multiplier });
  }, [game, fx, celebrate]);

  // Banners fade on their own.
  useEffect(() => {
    if (!moment) return;
    const id = setTimeout(() => setMoment(null), 1700);
    return () => clearTimeout(id);
  }, [moment]);

  async function saveMastery(r: { fixed: MistakeItem[]; firstTry: number; attempts: number }) {
    setReplay("done");
    const tags = fixedTags(r.fixed);
    if (mode !== "play") { setMastered({ tags, points: 0 }); return; }
    const res = await fetch("/api/games/mastery", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, tags, fixed: r.fixed.length, firstTry: r.firstTry, attempts: r.attempts }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setMastered({ tags, points: Number(j.points) || 0 });
    if (j.points > 0) window.dispatchEvent(new CustomEvent("reward-points", { detail: { total: j.total, delta: j.points } }));
  }

  const s = stars(correct, attempts, game.seconds);
  const pct = (left / game.seconds) * 100;

  return (
    <div className="arcade relative -mx-4 -mt-4 min-h-[calc(100vh-4rem)] overflow-hidden px-4 pb-14 pt-5 sm:-mx-7 sm:px-7 lg:mx-0 lg:mt-0 lg:rounded-[2rem] lg:px-8"
      style={{ ["--g1" as any]: game.colors[0], ["--g2" as any]: game.colors[1] }}>
      <div aria-hidden className="arcade-dots pointer-events-none absolute inset-0" />
      <Confetti fire={phase === "over" && (newBest || s === 3 || !!levelUp)} key={`${round}-${levelUp ?? ""}`} pieces={60} />

      <div className="relative mx-auto max-w-3xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          {onExit
            ? <button type="button" onClick={onExit} className="rounded-full bg-white/25 px-4 py-2 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/35">← {backLabel}</button>
            : <Link href={backHref} className="rounded-full bg-white/25 px-4 py-2 text-sm font-extrabold text-white backdrop-blur transition hover:bg-white/35">← Games</Link>}
          <div className="flex items-center gap-2">
            {lowData ? (
              <span className="rounded-full bg-white/25 px-3 py-1.5 text-[11px] font-bold text-white" title="Sound and vibration are off in low-data mode">🔇 Low-data</span>
            ) : (
              <>
                <button type="button" onClick={() => setFx({ sound: !prefs.sound })} aria-pressed={prefs.sound} aria-label={prefs.sound ? "Turn sound off" : "Turn sound on"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-base backdrop-blur transition hover:bg-white/35">{prefs.sound ? "🔊" : "🔇"}</button>
                <button type="button" onClick={() => setFx({ haptics: !prefs.haptics })} aria-pressed={prefs.haptics} aria-label={prefs.haptics ? "Turn vibration off" : "Turn vibration on"}
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-base backdrop-blur transition hover:bg-white/35 ${prefs.haptics ? "" : "opacity-50"}`}>📳</button>
              </>
            )}
            <span className="rounded-full bg-white/25 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white backdrop-blur">
              {DIFFICULTY_LABEL[difficulty]} · Best {best}
            </span>
          </div>
        </div>

        {phase === "intro" && (
          <div className="arcade-card arcade-pop mt-8 p-7 text-center sm:p-10">
            <div className="arcade-bob mx-auto flex h-24 w-24 items-center justify-center rounded-[1.75rem] text-6xl"
              style={{ background: `linear-gradient(135deg, ${game.colors[0]}22, ${game.colors[1]}33)` }} aria-hidden>{game.emoji}</div>
            <h1 className="mt-5 font-display text-3xl font-black tracking-tight sm:text-4xl">{title ?? game.title}</h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] font-medium text-indigo-950/70">{game.tagline}</p>
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-indigo-50 p-4 text-left text-sm font-semibold text-indigo-950/80">
              <p className="mb-1 text-xs font-black uppercase tracking-wider" style={{ color: game.colors[0] }}>How to play</p>
              {game.howTo} You have <b>{game.seconds} seconds</b>.
            </div>
            {aiCount > 0 && (
              <p className="arcade-pop mx-auto mt-3 w-fit rounded-full bg-gradient-to-r from-fuchsia-100 to-indigo-100 px-4 py-1.5 text-xs font-black text-indigo-900">
                ✨ {aiCount} fresh A.I questions mixed in
              </p>
            )}
            <button type="button" onClick={start} className="arcade-btn mt-7 px-10 text-lg"
              style={{ ["--btn" as any]: game.colors[0], ["--btn-shadow" as any]: "rgba(0,0,0,.28)" }}>
              ▶ Let&apos;s play!
            </button>
            {mode === "preview" && !onExit && <p className="mt-4 text-xs font-bold text-indigo-950/45">Admin preview — scores aren&apos;t saved.</p>}
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex h-[60vh] items-center justify-center">
            <span key={count} className="arcade-count font-display text-[8rem] font-black text-white drop-shadow-[0_8px_0_rgba(0,0,0,.18)]">
              {count === 0 ? "GO!" : count}
            </span>
          </div>
        )}

        {phase === "playing" && (
          <div className="mt-5">
            {/* HUD */}
            <div className="flex items-center gap-3">
              <div className="arcade-card flex-1 overflow-hidden !rounded-2xl px-4 py-2.5 !shadow-[0_6px_0_rgba(30,27,75,.12)]">
                <div className="flex items-center justify-between text-sm font-black">
                  <span>⏱ {left}s</span>
                  <span>{score.toLocaleString()} pts</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-indigo-100">
                  <div className="h-full rounded-full transition-[width] duration-200 ease-linear"
                    style={{ width: `${pct}%`, background: pct < 20 ? "#EF4444" : `linear-gradient(90deg, ${game.colors[0]}, ${game.colors[1]})` }} />
                </div>
              </div>
              <div className={`arcade-card flex h-[60px] min-w-[84px] flex-col items-center justify-center !rounded-2xl px-3 !shadow-[0_6px_0_rgba(30,27,75,.12)] ${streak >= 3 ? "text-orange-500" : "text-indigo-950/40"}`}>
                <span className={`text-xl leading-none ${streak >= 3 ? "arcade-flame" : ""}`}>🔥</span>
                <span className="text-xs font-black">×{streak}</span>
              </div>
            </div>
            {/* Fixed-height slot so the feedback never shifts the game below. */}
            <div className="mt-2 h-7 text-center" aria-hidden>
              {flash && (
                <p key={flash.k} className={`arcade-pop pointer-events-none text-lg font-black drop-shadow ${flash.ok ? "text-white" : "text-red-100"}`}>
                  {flash.ok ? `+${flash.pts}${flash.x && flash.x > 1 ? ` ×${flash.x}` : streak >= 3 ? "  combo!" : ""}` : "✗ try the next one"}
                </p>
              )}
            </div>
            {(lightning || comeback || shield) && (
              <div className="mb-2 flex flex-wrap justify-center gap-2" aria-live="polite">
                {lightning && <span className="fx-glow rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-amber-950 shadow">⚡ Lightning question — double points!</span>}
                {comeback && <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-black text-emerald-950 shadow">💪 Comeback: next right answer ×2</span>}
                {shield && <span className="rounded-full bg-sky-200 px-3 py-1 text-xs font-black text-sky-950 shadow">🛡️ Streak shield on</span>}
              </div>
            )}
            <div className={`relative mt-3 rounded-[1.6rem] ${lightning ? "fx-lightning" : ""}`}>
              {moment && (
                <div key={moment.k} role="status" className={`fx-banner pointer-events-none absolute inset-x-0 top-3 z-20 mx-auto w-fit max-w-[92%] rounded-2xl bg-gradient-to-r px-5 py-2.5 text-center shadow-xl ${moment.tone}`}>
                  <p className="font-display text-lg font-black leading-tight"><span aria-hidden>{moment.emoji}</span> {moment.title}</p>
                  {moment.sub && <p className="text-xs font-bold opacity-80">{moment.sub}</p>}
                </div>
              )}
              <Engine key={round} game={game} difficulty={difficulty} report={report} items={items} />
            </div>
          </div>
        )}

        {phase === "over" && levelUp && (
          <button type="button" onClick={() => setLevelUp(null)} aria-label="Close rank up"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-indigo-950/70 px-6 text-center text-white backdrop-blur-sm">
            <span className="fx-levelup text-8xl" aria-hidden>🎖️</span>
            <span className="fx-banner mt-4 text-sm font-black uppercase tracking-[.3em] text-amber-300">Rank up!</span>
            <span className="fx-banner mt-1 font-display text-5xl font-black">{levelUp}</span>
            <span className="mt-6 text-sm font-bold text-white/70">Tap to continue</span>
          </button>
        )}

        {phase === "over" && replay === "on" && (
          <MistakeReplay items={mistakes} skill={game.skill} color={game.colors[0]} onDone={saveMastery} onClose={() => setReplay("off")} />
        )}

        {phase === "over" && replay !== "on" && (
          <div className="arcade-card arcade-pop mt-8 p-7 text-center sm:p-10">
            <p className="text-sm font-black uppercase tracking-[.2em]" style={{ color: game.colors[0] }}>Time&apos;s up!</p>
            <div className="mt-3 flex justify-center gap-2 text-5xl" aria-label={`${s} out of 3 stars`}>
              {[1, 2, 3].map((n) => <span key={n} className={n <= s ? "arcade-pop" : "opacity-20 grayscale"} style={{ animationDelay: `${n * 0.15}s` }}>⭐</span>)}
            </div>
            <p className="mt-4 font-display text-6xl font-black tracking-tight">{score.toLocaleString()}</p>
            <p className="text-sm font-bold text-indigo-950/50">points</p>
            {newBest && <p className="fx-banner mx-auto mt-3 w-fit rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 px-5 py-2 text-base font-black text-amber-950 shadow-lg">🏆 New personal best!</p>}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
              {[["Correct", correct], ["Accuracy", attempts ? `${Math.round((correct / attempts) * 100)}%` : "—"], ["Best combo", `×${bestStreak}`]].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl bg-indigo-50 py-3">
                  <p className="text-xl font-black">{v}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-950/50">{l}</p>
                </div>
              ))}
            </div>
            {result && (
              <div className="arcade-pop mx-auto mt-5 flex max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-white"
                style={{ background: `linear-gradient(135deg, ${tierColor(result.tier)}, #1E1B4B)` }}>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider opacity-80">{result.tierUp ? "Rank up!" : "Your rank"}</p>
                  <p className="font-display text-2xl font-black">{result.tier}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-wider opacity-80">Skill rating</p>
                  <p className="font-display text-2xl font-black">{result.rating}
                    {result.ratingChange !== null && result.ratingChange !== 0 && (
                      <span className={`ml-1.5 text-sm ${result.ratingChange > 0 ? "text-emerald-200" : "text-red-200"}`}>{result.ratingChange > 0 ? "▲" : "▼"}{Math.abs(result.ratingChange)}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {Object.keys(roundTags).length > 0 && (() => {
              const list = Object.entries(roundTags).map(([tag, v]) => ({ tag, ...v })).sort((a, b) => a.c / a.a - b.c / b.a);
              const tricky = list.filter((x) => x.c < x.a).slice(0, 3);
              const nailed = list.filter((x) => x.c === x.a && x.a >= 2).slice(0, 3);
              return (
                <div className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm sm:grid-cols-2">
                  {tricky.length > 0 && (
                    <div className="rounded-2xl bg-red-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-red-700">Tricky this round</p>
                      {tricky.map((x) => <p key={x.tag} className="font-bold text-red-900">{x.tag} <span className="font-semibold opacity-70">{x.c}/{x.a}</span></p>)}
                    </div>
                  )}
                  {nailed.length > 0 && (
                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Nailed it</p>
                      {nailed.map((x) => <p key={x.tag} className="font-bold text-emerald-900">{x.tag} <span className="font-semibold opacity-70">{x.c}/{x.a}</span></p>)}
                    </div>
                  )}
                </div>
              );
            })()}
            {earned !== null && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-extrabold text-amber-800">
                {earned > 0 ? `+${earned} reward points 🪙` : "No points this round — answer at least 3 correctly (daily limit 40)"}
              </p>
            )}
            {saveNote && <p className="mt-4 text-xs font-bold text-indigo-950/50">{saveNote}</p>}
            {extra?.chapterComplete && (
              <div className="arcade-pop mx-auto mt-5 max-w-md rounded-3xl bg-gradient-to-br from-amber-300 to-orange-400 p-5 text-amber-950 shadow-lg">
                <p className="text-4xl" aria-hidden>🏆</p>
                <p className="font-display text-2xl font-black">Chapter complete!</p>
                <p className="font-bold">{extra.chapterComplete.title}{extra.chapterComplete.points ? ` · +${extra.chapterComplete.points} points` : ""}</p>
              </div>
            )}
            {extra?.stopCleared && !extra?.chapterComplete && <p className="arcade-pop mx-auto mt-4 w-fit rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-black text-emerald-800">✅ Stop cleared — the next one is unlocked!</p>}
            {extra?.stopNeed && !extra?.stopCleared && <p className="mt-4 text-sm font-bold text-indigo-950/60">Get {extra.stopNeed} ⭐ to clear this stop.</p>}
            {mastered ? (
              <div className="arcade-pop mx-auto mt-5 max-w-md rounded-2xl bg-emerald-50 p-4 text-left">
                <p className="text-sm font-black text-emerald-800">⭐ Mastered{mastered.points ? ` · +${mastered.points} points` : ""}</p>
                <p className="text-sm font-bold text-emerald-900">{mastered.tags.join(", ")}</p>
              </div>
            ) : mistakes.length > 0 && replay === "off" && (
              <button type="button" onClick={() => setReplay("on")} className="arcade-pop mx-auto mt-5 flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-indigo-950 px-5 py-4 text-left text-white hover:bg-indigo-900">
                <span><span className="block font-black">🛠 Fix my mistakes</span><span className="text-sm text-white/70">Replay the {mistakes.length} you missed, with tips — earn a ⭐ Mastered star.</span></span>
                <span className="text-2xl" aria-hidden>→</span>
              </button>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={start} className="arcade-btn"
                style={{ ["--btn" as any]: game.colors[0], ["--btn-shadow" as any]: "rgba(0,0,0,.28)" }}>↻ Play again</button>
              {onExit
                ? <button type="button" onClick={onExit} className="arcade-btn" style={{ ["--btn" as any]: "#1E1B4B" }}>{backLabel}</button>
                : <Link href={backHref} className="arcade-btn" style={{ ["--btn" as any]: "#1E1B4B" }}>{backLabel}</Link>}
              {mode === "play" && <Link href="/portal/games/stats" className="arcade-btn" style={{ ["--btn" as any]: "#0EA5E9" }}>📊 My stats</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
