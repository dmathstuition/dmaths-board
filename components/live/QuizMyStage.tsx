"use client";
import { Chest } from "@/components/live/QuizGames";
import { BOSS, TEAM_LOOK, teamOf, type GameState } from "@/lib/quizGames";

// The learner's own corner of the game world, on their phone: their car on
// the track, their rocket on the pad, their spade on the beach, their team on
// the rope, their shield in the arena, their sword against the dragon — and it
// acts out each moment: waiting, thinking, answer locked in, right or wrong.

export type Phase = "ready" | "think" | "locked" | "right" | "wrong";
const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;

export function MyStage({ g, myId, phase, tall = false }: { g: GameState; myId: string; phase: Phase; tall?: boolean }) {
  const lane = g.lanes.find((l) => l.id === myId), team = teamOf(g.teams.map((t) => t.members), myId), look = TEAM_LOOK[Math.max(0, team)];
  const h = tall ? "h-48" : "h-28 [@media(max-height:640px)]:h-20";
  const say = (t: string, tone = "bg-black/55") => <span key={`${phase}-say`} className={`qg-pop absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full ${tone} px-3 py-0.5 text-xs font-black text-white`}>{t}</span>;
  const label = { ready: "Waiting to start", think: "Thinking", locked: "Answer locked in", right: "Right answer", wrong: "Wrong answer" }[phase];
  const frame = (bg: string, kids: React.ReactNode) => (
    <div className={`relative ${h} w-full overflow-hidden rounded-2xl ring-2 ring-white/25`} style={{ background: bg }} role="img" aria-label={`Your ${g.mode === "tug" || g.mode === "battle" ? "team" : "player"}: ${label}`}>{kids}</div>
  );

  if (g.mode === "race") return frame("linear-gradient(180deg, #1E293B 0 38%, #374151 38% 100%)", <>
    <span className={`qw-road absolute inset-x-0 top-[66%] h-1.5 ${phase === "right" ? "qp-fast" : phase === "think" || phase === "locked" ? "" : "qp-still"}`} />
    <span className="absolute inset-x-0 top-[38%] h-2 bg-[repeating-linear-gradient(90deg,#DC2626_0_18px,#F8FAFC_18px_36px)]" />
    <span className="absolute right-3 top-[40%] text-2xl">🏁</span>
    <span key={phase} className={`absolute bottom-3 left-[12%] text-5xl leading-none ${phase === "locked" ? "qw-rev" : phase === "right" ? "qp-dash" : phase === "wrong" ? "qp-spin" : "qg-bob"}`}><span className="block" style={{ transform: "scaleX(-1)" }}>🏎️</span></span>
    {phase === "locked" && <span className="qp-puffs absolute bottom-5 left-[4%] text-xl">💨</span>}
    {phase === "right" && say("Full throttle!", "bg-emerald-600")}
    {phase === "wrong" && say("Spun out! 💫", "bg-rose-600")}
    {lane && <span className="absolute left-2 top-2 rounded-lg bg-amber-400 px-1.5 text-xs font-black text-[#3b2600]">P{lane.place}</span>}
  </>);

  if (g.mode === "space") return frame("#020617", <>
    <span className={`qw-stars absolute inset-[-50%] ${phase === "right" ? "qp-warp" : ""}`} />
    <span className="absolute -bottom-6 left-1/2 h-12 w-[140%] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-sky-500 to-emerald-700" />
    <span key={phase} className={`absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center ${phase === "right" ? "qp-launch" : phase === "locked" || phase === "wrong" ? "qg-shake" : "qg-bob"}`}>
      <span className="text-5xl leading-none" style={{ transform: "rotate(-45deg)" }}>🚀</span>
      {(phase === "locked" || phase === "right") && <span className={`${phase === "right" ? "text-3xl" : "text-base"} qg-flame leading-none`} style={{ animationIterationCount: "infinite" }}>🔥</span>}
      {phase === "wrong" && <span className="text-2xl leading-none">💨</span>}
    </span>
    {phase === "locked" && say("Countdown… 3, 2, 1")}
    {phase === "right" && say("Lift-off! 🔥", "bg-emerald-600")}
    {phase === "wrong" && say("Engine stalled", "bg-rose-600")}
    {lane && <span className="absolute left-2 top-2 rounded-lg bg-violet-500 px-1.5 text-xs font-black">{ord(lane.place)} · {Math.round(lane.progress * 100)}%</span>}
  </>);

  if (g.mode === "treasure") return frame("linear-gradient(180deg, #38BDF8 0 30%, #FDE68A 30% 100%)", <>
    <span className="absolute right-3 top-1 text-3xl">🌴</span>
    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-3xl font-black text-red-600/80">✕</span>
    {(phase === "right" || phase === "wrong")
      ? <span key={phase} className="qg-pop absolute bottom-2 left-1/2 -translate-x-1/2"><Chest open loot={phase === "right" ? lane?.loot && lane.loot !== "empty" ? lane.loot : "coins" : "empty"} size={tall ? 96 : 72} /></span>
      : <span key={phase} className={`absolute bottom-6 left-[58%] text-4xl leading-none ${phase === "locked" ? "qp-dig" : "qg-bob"}`} style={{ transformOrigin: "20% 90%" }}>⛏️</span>}
    {phase === "locked" && <span className="qp-sand absolute bottom-4 left-[46%] text-xs">🟫🟫</span>}
    {phase === "locked" && say("Digging for treasure…")}
    {phase === "right" && say(lane?.gain ? `+${lane.gain} gold!` : "Treasure!", "bg-emerald-600")}
    {phase === "wrong" && say("Empty chest… 🕸️", "bg-rose-600")}
    {lane && <span className="absolute left-2 top-2 rounded-lg bg-amber-500 px-1.5 text-xs font-black text-[#3b2600]">🪙 {lane.points}</span>}
  </>);

  if (g.mode === "tug") {
    const other = TEAM_LOOK[team === 1 ? 0 : 1];
    return frame("linear-gradient(180deg, #7DD3FC 0 55%, #22C55E 55% 100%)", <>
      <span className="absolute inset-x-0 top-[55%] h-1 bg-[#15803D]" />
      <div key={phase} className={`absolute inset-x-[8%] top-[46%] flex items-center ${phase === "right" ? "qp-pull" : phase === "wrong" ? "qp-slip" : phase === "locked" ? "qw-rev" : ""}`}>
        <span className="flex gap-0.5 text-2xl"><span className="rounded-full px-1" style={{ background: look.colour }}>💪</span><span className="rounded-full px-1" style={{ background: look.colour }}>💪</span></span>
        <span className="relative mx-1 h-1.5 flex-1 rounded-full bg-[#92400E]"><span className="absolute left-1/2 top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-rose-500" /></span>
        <span className="flex gap-0.5 text-2xl"><span className="rounded-full px-1" style={{ background: other.colour }}>💪</span><span className="rounded-full px-1" style={{ background: other.colour }}>💪</span></span>
      </div>
      <span className="absolute left-1/2 top-[30%] h-[40%] border-l-2 border-dashed border-white/70" />
      {phase === "locked" && say("Grip the rope…")}
      {phase === "right" && say("HEAVE! 💪", "bg-emerald-600")}
      {phase === "wrong" && say("You slipped!", "bg-rose-600")}
      {team >= 0 && <span className="absolute left-2 top-2 rounded-lg px-1.5 text-xs font-black text-white" style={{ background: look.colour }}>{look.emoji} Team {look.name}</span>}
    </>);
  }

  if (g.mode === "battle") {
    const foe = team === 1 ? 0 : 1, shield = (t: number, kid: string, cls = "") => (
      <span className={`flex h-16 w-14 items-center justify-center text-3xl ${cls}`} style={{ background: TEAM_LOOK[t].colour, clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)" }}>{kid}</span>
    );
    return frame("radial-gradient(90% 80% at 50% 0%, #4338CA, #1E1B4B)", <>
      <span className="absolute bottom-0 inset-x-0 h-5 bg-[#0B0820]" />
      <span className={`absolute bottom-4 left-[10%] ${phase === "locked" ? "qp-charge" : ""}`}>{shield(Math.max(0, team), team === 1 ? "🐺" : "🦁")}</span>
      <span key={`foe-${phase}`} className={`absolute bottom-4 right-[10%] ${phase === "right" ? "qg-shake" : ""}`}>{shield(foe, foe === 1 ? "🐺" : "🦁")}</span>
      {phase === "right" && <span key="fire" className="qp-shoot absolute bottom-10 left-[24%] text-3xl">🔥</span>}
      {phase === "wrong" && <span key="fizzle" className="qp-fizzle absolute bottom-10 left-[24%] text-3xl">🔥</span>}
      {phase === "locked" && say("Charging…")}
      {phase === "right" && say("Direct hit! ⚔️", "bg-emerald-600")}
      {phase === "wrong" && say("Missed!", "bg-rose-600")}
    </>);
  }

  // Boss battle: the learner's sword against the dragon.
  return frame("radial-gradient(80% 70% at 70% 30%, #7F1D1D, #1C0A05)", <>
    <span className="qw-lava absolute inset-x-0 bottom-0 h-1/3" />
    <span key={`boss-${phase}`} className={`absolute right-[10%] top-[18%] text-6xl leading-none ${phase === "right" ? "qg-shake" : phase === "wrong" ? "qp-dodge" : "qg-bob"}`}>{BOSS.emoji}</span>
    {phase === "right" && <span key="boom" className="qg-pop absolute right-[18%] top-[22%] text-4xl">💥</span>}
    {phase === "wrong" && <span key="breath" className="qp-breath-l absolute right-[32%] top-[34%] text-3xl">🔥</span>}
    <span key={`me-${phase}`} className={`absolute bottom-3 left-[12%] text-5xl leading-none ${phase === "locked" ? "qp-raise" : phase === "right" ? "qp-slash" : ""}`} style={{ transformOrigin: "20% 90%" }}>🗡️</span>
    {phase === "locked" && say("Sword raised…")}
    {phase === "right" && say("You hit it! 💥", "bg-emerald-600")}
    {phase === "wrong" && say("It dodged!", "bg-rose-600")}
    <span className="absolute left-2 top-2 rounded-lg bg-black/50 px-1.5 text-xs font-black">{Array.from({ length: BOSS.hearts }, (_, i) => (i < g.hearts ? "❤️" : "🖤")).join("")}</span>
  </>);
}
