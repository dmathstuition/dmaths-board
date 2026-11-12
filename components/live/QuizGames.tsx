"use client";
import { useEffect, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { play } from "@/lib/games/fx";
import { BOSS, MODES, modeInfo, resultText, teamOf, type GameMode, type GameState, type Lane } from "@/lib/quizGames";

// The live quiz's game styles, drawn (lib/quizGames.ts): a tug of war, a team
// battle, a boss battle and a race. Each scene eases from the last round's
// position to this one, then plays the round's moment: the rope yanks, the
// fireballs fly, the dragon is hit, the cars pull away.

const ord = (n: number) => { const t = n % 100; return `${n}${t >= 11 && t <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`; };
const sig = (g: GameState) => JSON.stringify(g);

// Show `from` first (the last round), then move to `g`; `burst` changes once each time a new round lands.
function useStaged(g: GameState, from: GameState | null | undefined, sound: boolean) {
  const [shown, setShown] = useState<GameState>(() => (from && from.round < g.round && from.mode === g.mode ? from : g));
  const [burst, setBurst] = useState(0);
  const target = sig(g);
  useEffect(() => {
    if (sig(shown) === target) return;
    const moving = g.round > shown.round && g.mode === shown.mode;
    const t = setTimeout(() => {
      setShown(g);
      if (moving) {
        setBurst((b) => b + 1);
        if (sound) play(g.mode === "battle" ? "lightning" : g.mode === "boss" ? (g.bossHit ? "wrong" : "combo") : g.mode === "tug" ? "combo" : "tick");
      }
      if (g.winner !== null && shown.winner === null && sound) setTimeout(() => play("best"), 900);
    }, moving ? 450 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return { shown, burst };
}

export function GameScene({ g, from, myId = "", big = false, sound = false }: { g: GameState; from?: GameState | null; myId?: string; big?: boolean; sound?: boolean }) {
  const { shown, burst } = useStaged(g, from, sound);
  const done = shown.winner !== null && (shown.ended || shown.mode === "boss" || shown.mode === "battle");
  return (
    <div className="relative">
      {done && shown.winner !== -1 && !(shown.mode === "boss" && shown.winner === 1) && <Confetti fire pieces={big ? 80 : 40} />}
      {shown.mode === "tug" && <TugScene g={shown} burst={burst} myId={myId} />}
      {shown.mode === "battle" && <BattleScene g={shown} burst={burst} myId={myId} />}
      {shown.mode === "boss" && <BossScene g={shown} burst={burst} />}
      {shown.mode === "race" && <RaceScene g={shown} burst={burst} myId={myId} big={big} />}
      {done && <p className="qg-pop mt-3 text-center font-display text-2xl font-black text-white sm:text-3xl" role="status">{resultText(shown, myId)}</p>}
    </div>
  );
}

// ── Tug of war ───────────────────────────────────────────────────────────
function Puller({ x, colour, lean, heave, k }: { x: number; colour: string; lean: number; heave: boolean; k: number }) {
  return (
    <g transform={`translate(${x},0)`}>
      <g className={heave ? "qg-heave" : ""} style={{ animationDelay: `${k * 60}ms`, ["--qg-heave" as string]: lean < 0 ? "-8px" : "8px" }}>
      <g style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `rotate(${lean}deg)`, transition: "transform .5s ease" }}>
        <circle cx={0} cy={86} r={11} fill="#FDE68A" stroke="#0B1220" strokeWidth={2} />
        <path d="M0,97 L0,128" stroke={colour} strokeWidth={9} strokeLinecap="round" />
        <path d={`M0,104 L${lean > 0 ? 18 : -18},120`} stroke="#FDE68A" strokeWidth={5} strokeLinecap="round" />
        <path d="M0,128 L-9,156 M0,128 L9,156" stroke="#0B1220" strokeWidth={5} strokeLinecap="round" />
      </g>
      </g>
    </g>
  );
}
function TugScene({ g, burst, myId }: { g: GameState; burst: number; myId: string }) {
  const shift = -g.lead * 120, mine = teamOf(g.teams.map((t) => t.members), myId);
  const word = g.lead > 0.02 ? "Team Red is pulling ahead" : g.lead < -0.02 ? "Team Blue is pulling ahead" : "the rope is level";
  const team = (t: number) => g.teams[t];
  const xs = (t: number) => Array.from({ length: Math.min(4, Math.max(1, team(t)?.size ?? 1)) }, (_, i) => (t === 0 ? 150 + i * 30 : 490 - i * 30));
  return (
    <figure className="m-0">
      <svg viewBox="0 0 640 230" className="block w-full overflow-hidden rounded-2xl" role="img" aria-label={`Tug of war after ${g.round} of ${g.total} questions: ${word}`}>
        <defs><linearGradient id="qg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BAE6FD" /><stop offset="1" stopColor="#E0F2FE" /></linearGradient></defs>
        <rect width={640} height={230} fill="url(#qg-sky)" />
        <rect y={156} width={640} height={74} fill="#86EFAC" /><rect y={156} width={640} height={6} fill="#4ADE80" />
        <rect x={0} y={156} width={170} height={74} fill="#EF4444" opacity={0.18} /><rect x={470} y={156} width={170} height={74} fill="#3B82F6" opacity={0.18} />
        <line x1={320} y1={30} x2={320} y2={200} stroke="#0B1220" strokeWidth={2} strokeDasharray="6 6" opacity={0.5} />
        <g className="qg-slide" style={{ transform: `translateX(${shift}px)` }}>
          <g key={`rope-${burst}`} className={burst ? "qg-twang" : ""} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
            <path d="M128,118 Q320,126 512,118" fill="none" stroke="#92400E" strokeWidth={7} strokeLinecap="round" />
            <path d="M128,118 Q320,126 512,118" fill="none" stroke="#FCD34D" strokeWidth={2} strokeDasharray="8 7" />
          </g>
          <path d="M312,104 L328,104 L320,140 Z" fill="#F43F5E" stroke="#881337" strokeWidth={2} />
          {[0, 1].map((t) => xs(t).map((x, k) => <Puller key={`${t}-${k}-${burst}`} x={x} k={k} colour={TEAM(t)} lean={(t === 0 ? -1 : 1) * (12 + (g.pull === (t === 0 ? 1 : -1) ? 14 : 0))} heave={burst > 0 && g.pull === (t === 0 ? 1 : -1)} />))}
        </g>
        {g.pull !== 0 && burst > 0 && <text key={`pull-${burst}`} className="qg-float" x={g.pull > 0 ? 200 : 440} y={70} textAnchor="middle" fontSize={22} fontWeight={900} fill={g.pull > 0 ? "#B91C1C" : "#1D4ED8"} stroke="#fff" strokeWidth={4} paintOrder="stroke">{g.pull > 0 ? "◀ HEAVE!" : "HEAVE! ▶"}</text>}
        {[0, 1].map((t) => team(t) && (
          <g key={t} fontFamily="Poppins, system-ui, sans-serif">
            <text x={t === 0 ? 16 : 624} y={30} textAnchor={t === 0 ? "start" : "end"} fontSize={17} fontWeight={900} fill={TEAM_DARK(t)}>{team(t)!.emoji} Team {team(t)!.name}{mine === t ? " (you)" : ""}</text>
            <text x={t === 0 ? 16 : 624} y={50} textAnchor={t === 0 ? "start" : "end"} fontSize={12.5} fontWeight={700} fill="#334155">{team(t)!.size} player{team(t)!.size === 1 ? "" : "s"} · {team(t)!.right} right</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
const TEAM = (t: number) => (t === 0 ? "#EF4444" : "#3B82F6");
const TEAM_DARK = (t: number) => (t === 0 ? "#991B1B" : "#1E3A8A");

// ── Team battle ──────────────────────────────────────────────────────────
const CHAMPS = ["🦁", "🐺"];
function BattleScene({ g, burst, myId }: { g: GameState; burst: number; myId: string }) {
  const mine = teamOf(g.teams.map((t) => t.members), myId);
  const cx = [150, 490];
  return (
    <svg viewBox="0 0 640 250" className="block w-full overflow-hidden rounded-2xl" role="img" aria-label={`Team battle after ${g.round} of ${g.total} questions: Team Red has ${g.hp[0] ?? 100} health, Team Blue has ${g.hp[1] ?? 100} health`}
      style={{ fontFamily: "Poppins, system-ui, sans-serif" }}>
      <defs><linearGradient id="qg-arena" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E1B4B" /><stop offset="1" stopColor="#312E81" /></linearGradient></defs>
      <rect width={640} height={250} fill="url(#qg-arena)" />
      {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i * 97) % 640} cy={(i * 53) % 120 + 8} r={1.4} fill="#fff" opacity={0.5} />)}
      <rect y={200} width={640} height={50} fill="#4C1D95" /><text x={320} y={130} textAnchor="middle" fontSize={34} fontWeight={900} fill="#fff" opacity={0.18}>VS</text>
      {[0, 1].map((t) => {
        const hp = g.hp[t] ?? 100, ko = hp === 0, hitMe = burst > 0 && (g.hit[t] ?? 0) > 0;
        return (
          <g key={t}>
            <text x={cx[t]} y={28} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fff">{g.teams[t]?.emoji} Team {g.teams[t]?.name}{mine === t ? " (you)" : ""}</text>
            <rect x={cx[t] - 100} y={38} width={200} height={16} rx={8} fill="#0B1220" stroke="#fff" strokeWidth={1.5} />
            <rect className="qg-bar" x={cx[t] - 98} y={40} width={1.96 * hp} height={12} rx={6} fill={hp > 50 ? "#22C55E" : hp > 20 ? "#F59E0B" : "#EF4444"} />
            <text x={cx[t]} y={51} textAnchor="middle" fontSize={10.5} fontWeight={900} fill="#fff">{Math.round(hp)} / 100</text>
            <g key={`f-${t}-${burst}`} className={hitMe ? "qg-shake" : "qg-bob"} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
              <ellipse cx={cx[t]} cy={196} rx={56} ry={9} fill="#000" opacity={0.3} />
              <path d={`M${cx[t] - 52},92 h104 v52 q0,40 -52,56 q-52,-16 -52,-56 Z`} fill={TEAM(t)} stroke="#fff" strokeWidth={3} opacity={ko ? 0.35 : 1} />
              <text x={cx[t]} y={156} textAnchor="middle" fontSize={54} style={{ filter: ko ? "grayscale(1)" : undefined }}>{CHAMPS[t]}</text>
              {hitMe && <rect x={cx[t] - 52} y={92} width={104} height={110} fill="#fff" className="qg-flash" />}
            </g>
            {ko && <text x={cx[t]} y={120} textAnchor="middle" fontSize={26} fontWeight={900} fill="#FDE047" stroke="#0B1220" strokeWidth={4} paintOrder="stroke" className="qg-pop">KO! 💫</text>}
            {hitMe && <text key={`d-${t}-${burst}`} className="qg-float" x={cx[t]} y={90} textAnchor="middle" fontSize={26} fontWeight={900} fill="#FCA5A5" stroke="#7F1D1D" strokeWidth={4} paintOrder="stroke" style={{ animationDelay: "550ms" }}>−{Math.round(g.hit[t])}</text>}
          </g>
        );
      })}
      {burst > 0 && [0, 1].map((t) => (g.hit[1 - t] ?? 0) > 0 && (
        <text key={`p-${t}-${burst}`} className={t === 0 ? "qg-fly-right" : "qg-fly-left"} x={cx[t]} y={150} textAnchor="middle" fontSize={34}>{t === 0 ? "🔥" : "❄️"}</text>
      ))}
    </svg>
  );
}

// ── Boss battle ──────────────────────────────────────────────────────────
function BossScene({ g, burst }: { g: GameState; burst: number }) {
  const hp = g.hp[0] ?? 100, defeated = hp === 0, escaped = g.winner === 1, hit = burst > 0 && (g.hit[0] ?? 0) > 0;
  return (
    <svg viewBox="0 0 640 260" className="block w-full overflow-hidden rounded-2xl" role="img" style={{ fontFamily: "Poppins, system-ui, sans-serif" }}
      aria-label={`Boss battle after ${g.round} of ${g.total} questions: the ${BOSS.name} has ${hp} health; the class has ${g.hearts} heart${g.hearts === 1 ? "" : "s"} left`}>
      <defs><radialGradient id="qg-lair" cx="50%" cy="35%" r="75%"><stop offset="0" stopColor="#7C2D12" /><stop offset="1" stopColor="#1C0A05" /></radialGradient></defs>
      <rect width={640} height={260} fill="url(#qg-lair)" />
      {[60, 170, 470, 580].map((x, i) => <path key={x} d={`M${x},260 l14,-${40 + (i % 2) * 22} l14,${40 + (i % 2) * 22} Z`} fill="#431407" />)}
      <text x={320} y={26} textAnchor="middle" fontSize={16} fontWeight={900} fill="#FED7AA">{BOSS.emoji} {BOSS.name}</text>
      <rect x={170} y={36} width={300} height={18} rx={9} fill="#0B1220" stroke="#FED7AA" strokeWidth={1.5} />
      <rect className="qg-bar" x={172} y={38} width={2.96 * hp} height={14} rx={7} fill="#DC2626" />
      <text x={320} y={50} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">{Math.round(hp)} / 100</text>
      <g key={`boss-${burst}`} className={defeated ? "qg-defeat" : hit ? "qg-shake" : escaped ? "qg-gloat" : "qg-bob"} style={{ transformBox: "fill-box", transformOrigin: "50% 60%" }}>
        <text x={320} y={178} textAnchor="middle" fontSize={108}>{BOSS.emoji}</text>
        {hit && <circle cx={320} cy={140} r={62} fill="#fff" className="qg-flash" />}
      </g>
      {hit && <text key={`slash-${burst}`} className="qg-pop" x={300} y={140} textAnchor="middle" fontSize={56}>💥</text>}
      {hit && <text key={`dmg-${burst}`} className="qg-float" x={420} y={110} fontSize={30} fontWeight={900} fill="#FDE047" stroke="#7F1D1D" strokeWidth={4} paintOrder="stroke" style={{ animationDelay: "250ms" }}>−{Math.round(g.hit[0])}</text>}
      {burst > 0 && g.bossHit && <text key={`fire-${burst}`} className="qg-breath" x={320} y={200} textAnchor="middle" fontSize={40}>🔥</text>}
      <g>
        {Array.from({ length: BOSS.hearts }, (_, i) => {
          const lost = i >= g.hearts, justLost = burst > 0 && g.bossHit && i === g.hearts;
          return <text key={`${i}-${justLost ? burst : 0}`} x={268 + i * 52} y={244} textAnchor="middle" fontSize={34} className={justLost ? "qg-break" : ""} style={{ animationDelay: "650ms" }}>{lost ? "🖤" : "❤️"}</text>;
        })}
      </g>
      <text x={20} y={244} fontSize={13} fontWeight={800} fill="#FED7AA">Your class</text>
      {defeated && <text x={320} y={110} textAnchor="middle" fontSize={34} fontWeight={900} fill="#FDE047" stroke="#0B1220" strokeWidth={5} paintOrder="stroke" className="qg-pop" style={{ animationDelay: "500ms" }}>DEFEATED!</text>}
      {escaped && !defeated && <text x={320} y={110} textAnchor="middle" fontSize={26} fontWeight={900} fill="#FED7AA" stroke="#0B1220" strokeWidth={5} paintOrder="stroke" className="qg-pop">Ha ha! It got away…</text>}
    </svg>
  );
}

// ── Race ─────────────────────────────────────────────────────────────────
const CARS = ["🏎️", "🚗", "🚙", "🚕", "🚓", "🚑", "🚌", "🛵", "🚜", "🚒"];
const LANE_COLOURS = ["#FDE68A", "#BFDBFE", "#BBF7D0", "#FBCFE8", "#DDD6FE", "#FED7AA"];
function RaceScene({ g, burst, myId, big }: { g: GameState; burst: number; myId: string; big: boolean }) {
  const most = big ? 10 : 5, top = g.lanes.slice(0, most), me = g.lanes.find((l) => l.id === myId);
  const lanes: Lane[] = me && !top.includes(me) ? [...top.slice(0, most - 1), me] : top;
  const carOf = (l: Lane) => CARS[Math.max(0, g.lanes.findIndex((x) => x.id === l.id)) % CARS.length];
  return (
    <section aria-label="Race" className="overflow-hidden rounded-2xl bg-[#334155] p-2 ring-4 ring-[#0B1220]/40">
      <ol className="grid gap-1">
        {lanes.map((l, i) => (
          <li key={l.id} aria-label={`${l.name}: ${ord(l.place)} place, ${Math.round(l.progress * 100)}% of the way`} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${l.place === 1 ? "bg-amber-400 text-[#3b2600]" : "bg-white/15 text-white"}`}>{l.place}</span>
            <span className={`${big ? "w-28 text-sm" : "w-16 text-xs"} shrink-0 truncate font-black ${l.id === myId ? "text-amber-300" : "text-white"}`}>{l.id === myId ? "You" : l.name}</span>
            <div className={`relative ${big ? "h-11" : "h-9"} flex-1 overflow-visible rounded-md`} style={{ background: `repeating-linear-gradient(90deg, #475569 0 22px, #3F4C5F 22px 44px)`, boxShadow: `inset 0 -3px 0 ${LANE_COLOURS[i % LANE_COLOURS.length]}` }}>
              <span aria-hidden className="absolute inset-y-0 right-0 w-3" style={{ background: "repeating-linear-gradient(0deg, #fff 0 6px, #0B1220 6px 12px)" }} />
              <span className="qg-car absolute top-1/2" style={{ left: `calc(${l.progress} * (100% - 2.6rem))` }}>
                <span key={`car-${burst}`} className={`block ${burst > 0 && l.gain > 0 ? "qg-zoom" : ""}`}><span className="block" style={{ fontSize: big ? 30 : 24, transform: "scaleX(-1)", lineHeight: 1 }}>{carOf(l)}</span></span>
                {burst > 0 && l.gain > 0 && <span key={`gain-${burst}`} className="qg-float absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-400 px-1.5 text-[11px] font-black text-[#052e16]">+{l.gain}</span>}
                {burst > 0 && l.gain > 0 && <span key={`puff-${burst}`} className="qg-puff absolute right-full top-1/2 -translate-y-1/2 text-base" aria-hidden>💨</span>}
              </span>
            </div>
            {big && <span className="w-12 shrink-0 text-right font-mono text-xs font-black text-amber-300">{l.points}</span>}
          </li>
        ))}
      </ol>
      {g.lanes.length > lanes.length && <p className="mt-1 text-center text-[11px] font-bold text-white/60">and {g.lanes.length - lanes.length} more racer{g.lanes.length - lanes.length === 1 ? "" : "s"}</p>}
      {!g.lanes.length && <p className="py-4 text-center text-sm font-bold text-white/70">The racers line up when the first answers are in.</p>}
    </section>
  );
}

// ── Choosing a game style, and the teams, in the lobby ───────────────────
export function ModePicker({ mode, onPick }: { mode: GameMode; onPick: (m: GameMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Game style" className="mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-5">
      {MODES.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => onPick(m.id)} title={m.hint}
          className={`flex min-h-[84px] flex-col items-center justify-center gap-0.5 rounded-2xl p-2 text-center transition ${mode === m.id ? "bg-white text-violet-800 shadow-xl ring-4 ring-amber-300" : "bg-white/12 text-white hover:bg-white/20"}`}>
          <span className="text-3xl" aria-hidden>{m.emoji}</span>
          <span className="text-sm font-black">{m.name}</span>
        </button>
      ))}
      <p className="col-span-full text-center text-sm font-bold text-white/75">{modeInfo(mode).hint}</p>
    </div>
  );
}
export function TeamsPreview({ teams, onShuffle }: { teams: { name: string; colour: string; emoji: string; names: string[] }[]; onShuffle?: () => void }) {
  return (
    <div className="mx-auto mt-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => (
          <section key={t.name} aria-label={`Team ${t.name}`} className="rounded-2xl p-3" style={{ background: `${t.colour}33`, boxShadow: `inset 0 0 0 2px ${t.colour}` }}>
            <p className="text-lg font-black">{t.emoji} Team {t.name} <span className="text-sm font-bold text-white/70">· {t.names.length}</span></p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {t.names.map((n, i) => <li key={`${n}-${i}`} className="qg-pop rounded-lg bg-white/15 px-2.5 py-1 text-sm font-black" style={{ animationDelay: `${i * 40}ms` }}>{n}</li>)}
              {!t.names.length && <li className="text-sm text-white/60">Waiting for players…</li>}
            </ul>
          </section>
        ))}
      </div>
      {onShuffle && <button type="button" onClick={onShuffle} className="mx-auto mt-3 block min-h-[40px] rounded-xl bg-white/15 px-4 text-sm font-black hover:bg-white/25">🔀 Shuffle the teams</button>}
    </div>
  );
}
// What the next button says in each game style.
export const GAME_STEP: Record<GameMode, string> = { classic: "Scoreboard →", race: "Race on! →", tug: "Pull! →", battle: "Attack! →", boss: "Fight the boss! →" };
// A learner's team, as a coloured badge.
export function MyTeam({ g, myId, className = "" }: { g: GameState | null; myId: string; className?: string }) {
  if (!g || !(g.mode === "tug" || g.mode === "battle")) return null;
  const t = teamOf(g.teams.map((x) => x.members), myId);
  if (t < 0) return null;
  return <span className={`rounded-full px-3 py-1 text-sm font-black text-white ${className}`} style={{ background: g.teams[t].colour }}>{g.teams[t].emoji} Team {g.teams[t].name}</span>;
}
