"use client";
import { modeInfo, teamOf, BOSS, type GameMode, type GameState } from "@/lib/quizGames";

// The live quiz's game worlds. With a game style picked, the whole quiz —
// lobby, every question, the answers and the podium — happens inside that
// game's world: a moving backdrop (a floodlit race track, deep space, a
// treasure island, a sunny field, a battle arena, a dragon's lair), each
// question named as a stage of the story ("Lap 3 of 5", "Passing the Moon",
// "Skull Cove"), a live game panel while the class answers, and messages on
// learners' phones that speak the game's language.

type World = {
  bg: string; unit: string; stages: string[]; last: string; hero: string;
  story: string; locked: string; right: string; wrong: string; ribbon: string;
};
export const WORLD: Record<Exclude<GameMode, "classic">, World> = {
  race: {
    bg: "linear-gradient(180deg, #020617 0%, #0F172A 45%, #1E293B 62%, #111827 100%)", unit: "Lap", hero: "🏎️", ribbon: "#F59E0B",
    stages: ["Lights out!", "Into the first bend", "Down the straight", "Through the chicane", "Overtaking lane", "Pit-lane push"], last: "Final lap! 🏁",
    story: "Every right answer is a burst of speed. The faster you answer, the further you go. First past the chequered flag wins!",
    locked: "Engine revving…", right: "Full throttle! 🔥", wrong: "Spun out… back on the track next lap!",
  },
  space: {
    bg: "radial-gradient(120% 80% at 80% 110%, #4C1D95 0%, rgba(76,29,149,0) 55%), radial-gradient(90% 70% at 10% -10%, #1E3A8A 0%, rgba(30,58,138,0) 60%), #020617", unit: "Stage", hero: "🚀", ribbon: "#A855F7",
    stages: ["Lift-off", "Leaving Earth's orbit", "Passing the Moon", "Cruising to Mars", "Through the asteroid belt", "Round Saturn's rings"], last: "Final approach to the stars ⭐",
    story: "Mission control here. Every right answer fires your engines — three in a row gives you a boost. First rocket to the stars wins!",
    locked: "Countdown… 3, 2, 1…", right: "Engines firing! 🔥", wrong: "Engine stalled… refuel and try again!",
  },
  treasure: {
    bg: "linear-gradient(180deg, #0284C7 0%, #38BDF8 38%, #7DD3FC 52%, #0369A1 53%, #075985 100%)", unit: "Island", hero: "⛏️", ribbon: "#D97706",
    stages: ["Parrot Bay", "Skull Cove", "Mermaid Lagoon", "Smugglers' Caves", "Shipwreck Reef", "Volcano Peak"], last: "The Golden Isle 👑",
    story: "Ahoy, treasure hunters! Every right answer opens a chest. Some hold double gold, gems — or the crown. Most gold wins!",
    locked: "Digging for treasure…", right: "Chest unlocked! 💰", wrong: "Empty-handed this time…",
  },
  tug: {
    bg: "linear-gradient(180deg, #38BDF8 0%, #7DD3FC 45%, #A7F3D0 62%, #22C55E 63%, #15803D 100%)", unit: "Round", hero: "💪", ribbon: "#EF4444",
    stages: ["Take the strain", "Dig your heels in", "Heave!", "Hold the line", "Pull together"], last: "Final pull! 🪢",
    story: "Two teams, one rope. Every right answer pulls it your way. Answer well together and drag the other team over the line!",
    locked: "Gripping the rope…", right: "Your team heaves! 💪", wrong: "You slipped… grab the rope!",
  },
  battle: {
    bg: "radial-gradient(90% 60% at 50% 0%, #4338CA 0%, rgba(67,56,202,0) 70%), linear-gradient(180deg, #1E1B4B 0%, #0F0A2E 70%, #1E1B4B 100%)", unit: "Wave", hero: "🛡️", ribbon: "#6366F1",
    stages: ["The first clash", "Shields up", "Counter-attack", "Into the fray", "Hold the castle"], last: "The final battle! ⚔️",
    story: "Two teams, two castles. Every right answer fires at the other side. Knock their health to zero to win the battle!",
    locked: "Charging your attack…", right: "Direct hit! ⚔️", wrong: "Missed! Shields up…",
  },
  boss: {
    bg: "radial-gradient(80% 60% at 50% 110%, #EA580C 0%, rgba(234,88,12,0) 60%), radial-gradient(70% 50% at 50% 20%, #7F1D1D 0%, rgba(127,29,29,0) 70%), #1C0A05", unit: "Round", hero: "⚔️", ribbon: "#DC2626",
    stages: [`The ${BOSS.name} wakes`, "It breathes fire", "It circles the tower", "It roars in anger", "Its scales start to crack"], last: "Final strike! 🗡️",
    story: `The ${BOSS.name} is attacking the school! Every right answer strikes it. If fewer than half of you get one right, it breathes fire — you have three hearts.`,
    locked: "Raising your sword…", right: "You struck the dragon! 💥", wrong: "The dragon dodged…",
  },
};
export const worldOf = (mode: GameMode): World | null => (mode === "classic" ? null : WORLD[mode]);

// What this question is called in the story.
export function chapter(mode: GameMode, idx: number, total: number): { label: string; title: string } {
  const w = worldOf(mode);
  if (!w) return { label: `Question ${idx + 1} of ${total}`, title: "" };
  const last = idx >= total - 1;
  return { label: `${w.unit} ${idx + 1} of ${total}`, title: last ? w.last : w.stages[idx % w.stages.length] };
}

// ── The moving backdrop ──────────────────────────────────────────────────
const spots = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ({ x: (i * 37 + seed * 11) % 100, y: (i * 53 + seed * 7) % 100, d: ((i * 7 + seed) % 10) / 2.5, s: 0.6 + ((i * 13) % 10) / 10 }));
export function Backdrop({ mode }: { mode: GameMode }) {
  if (mode === "classic") return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ background: WORLD[mode].bg }}>
      {mode === "race" && <>
        {[12, 50, 88].map((x) => <span key={x} className="qw-light absolute top-[-40px] h-48 w-48 rounded-full" style={{ left: `calc(${x}% - 6rem)` }} />)}
        <span className="absolute inset-x-0 top-[56%] h-[6%] bg-[repeating-linear-gradient(90deg,#DC2626_0_28px,#F8FAFC_28px_56px)] opacity-70" />
        <span className="absolute inset-x-0 bottom-0 top-[62%] bg-[#1F2937]" />
        <span className="qw-road absolute inset-x-0 top-[79%] h-2" />
        {spots(9, 2).map((p, i) => <span key={i} className="qw-streak absolute h-[2px] rounded-full bg-white/50" style={{ top: `${64 + (p.y % 34)}%`, width: `${60 + p.x}px`, animationDelay: `${p.d}s`, animationDuration: `${0.9 + p.s}s` }} />)}
      </>}
      {mode === "space" && <>
        <span className="qw-stars absolute inset-[-50%]" />
        <span className="qw-stars qw-stars-slow absolute inset-[-50%] opacity-60" />
        <span className="qw-shoot absolute left-[70%] top-[8%] h-[2px] w-24 rounded-full bg-gradient-to-l from-white to-transparent" />
        <span className="absolute bottom-[-28%] right-[-10%] h-[60%] w-[46%] rounded-full" style={{ background: "radial-gradient(circle at 30% 30%, #FDBA74, #C2410C 55%, #431407 100%)", boxShadow: "0 0 80px 10px rgba(249,115,22,.35)" }} />
        <span className="absolute bottom-[8%] right-[-14%] h-[10%] w-[60%] -rotate-12 rounded-[50%] border-[6px] border-amber-200/40" />
        <span className="absolute left-[6%] top-[10%] h-12 w-12 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #F8FAFC, #94A3B8)" }} />
      </>}
      {mode === "treasure" && <>
        <span className="absolute right-[10%] top-[6%] h-20 w-20 rounded-full bg-amber-200" style={{ boxShadow: "0 0 60px 25px rgba(253,224,71,.55)" }} />
        {[8, 46, 72].map((y, i) => <span key={i} className="qw-cloud absolute h-8 w-28 rounded-full bg-white/80" style={{ top: `${y / 4}%`, animationDelay: `${-i * 9}s` }} />)}
        <span className="absolute left-[4%] top-[33%] text-[90px] leading-none">🏝️</span>
        <span className="qw-sail absolute top-[44%] text-5xl leading-none">⛵</span>
        <span className="qw-waves absolute inset-x-0 top-[52%] h-[48%]" />
        <span className="qw-waves qw-waves-slow absolute inset-x-0 top-[62%] h-[38%] opacity-60" />
        {[20, 60].map((x, i) => <span key={x} className="qw-gull absolute text-2xl" style={{ left: `${x}%`, top: `${12 + i * 8}%`, animationDelay: `${-i * 3}s` }}>🕊️</span>)}
      </>}
      {mode === "tug" && <>
        <span className="absolute left-[8%] top-[7%] h-20 w-20 rounded-full bg-yellow-200" style={{ boxShadow: "0 0 60px 25px rgba(254,240,138,.6)" }} />
        {[0, 1, 2].map((i) => <span key={i} className="qw-cloud absolute h-9 w-32 rounded-full bg-white/85" style={{ top: `${6 + i * 9}%`, animationDelay: `${-i * 11}s` }} />)}
        <span className="absolute -left-[10%] top-[48%] h-[40%] w-[70%] rounded-[50%] bg-[#4ADE80]" />
        <span className="absolute -right-[15%] top-[52%] h-[40%] w-[75%] rounded-[50%] bg-[#22C55E]" />
        <span className="absolute inset-x-0 bottom-0 top-[63%] bg-[repeating-linear-gradient(90deg,#16A34A_0_40px,#15803D_40px_80px)]" />
        {[10, 90].map((x, i) => <span key={x} className="qw-flag absolute top-[50%] text-4xl" style={{ left: `${x}%` }}>{i ? "🏳️" : "🚩"}</span>)}
      </>}
      {mode === "battle" && <>
        <span className="qw-spot absolute left-[-20%] top-[-30%] h-[160%] w-[60%] origin-top" />
        <span className="qw-spot qw-spot-b absolute right-[-20%] top-[-30%] h-[160%] w-[60%] origin-top" />
        <span className="absolute inset-x-0 bottom-0 h-[18%] bg-[#0B0820]" />
        <span className="qw-crowd absolute inset-x-0 bottom-[12%] h-[12%]" />
        {[18, 82].map((x) => <span key={x} className="qw-torch absolute bottom-[26%] text-3xl" style={{ left: `${x}%` }}>🔥</span>)}
      </>}
      {mode === "boss" && <>
        <span className="qw-lava absolute inset-x-0 bottom-0 h-[22%]" />
        {[0, 18, 70, 88].map((x, i) => <span key={x} className="absolute bottom-0 h-[38%] w-[16%] bg-[#1C0A05]" style={{ left: `${x}%`, clipPath: i % 2 ? "polygon(0 100%, 40% 0, 100% 100%)" : "polygon(0 100%, 60% 10%, 100% 100%)" }} />)}
        {spots(18, 5).map((p, i) => <span key={i} className="qw-ember absolute bottom-0 h-1.5 w-1.5 rounded-full bg-orange-400" style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, animationDuration: `${3 + p.s * 2}s` }} />)}
        <span className="qw-eyes absolute left-1/2 top-[14%] -translate-x-1/2 text-xl tracking-[2.5rem] text-amber-300/80">● ●</span>
      </>}
      {/* Keeps white writing easy to read on every world. */}
      <span className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
    </div>
  );
}

// ── The stage banner for each question ───────────────────────────────────
export function ChapterBanner({ mode, idx, total, small = false }: { mode: GameMode; idx: number; total: number; small?: boolean }) {
  const w = worldOf(mode), c = chapter(mode, idx, total);
  if (!w) return null;
  return (
    <div key={`${mode}-${idx}`} className={`qw-banner mx-auto flex w-fit max-w-full items-center gap-2 rounded-full ${small ? "px-3 py-1" : "px-5 py-2"} text-white shadow-lg`} style={{ background: w.ribbon }} aria-label={`${c.label}: ${c.title}`}>
      <span className={small ? "text-base" : "text-2xl"} aria-hidden>{modeInfo(mode).emoji}</span>
      <span className={`shrink-0 whitespace-nowrap font-black uppercase tracking-[.14em] ${small ? "text-[10px]" : "text-xs"} text-white/85`}>{c.label}</span>
      <span className={`min-w-0 truncate font-display font-black ${small ? "text-sm" : "text-xl"}`}>{c.title}</span>
    </div>
  );
}

// ── Who's ready: one piece for each learner, lit up once they've answered ──
export function ReadyRow({ mode, answered, roster }: { mode: GameMode; answered: number; roster: number }) {
  const w = worldOf(mode);
  if (!w || roster <= 0) return null;
  const n = Math.min(roster, 30);
  return (
    <div className="flex flex-wrap items-center justify-center gap-1" aria-label={`${answered} of ${roster} ready`}>
      {Array.from({ length: n }, (_, i) => <span key={i} className={`text-xl transition ${i < answered ? "qw-ready" : "opacity-25 grayscale"}`} aria-hidden>{w.hero}</span>)}
      {roster > n && <span className="text-xs font-black text-white/70">+{roster - n}</span>}
    </div>
  );
}

// ── The live game panel while the class answers ──────────────────────────
const meter = (pct: number, colour: string) => <span className="block h-2.5 overflow-hidden rounded-full bg-black/40"><span className="qw-meter block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: colour }} /></span>;
export function LiveHud({ g, myId = "", compact = false }: { g: GameState | null; myId?: string; compact?: boolean }) {
  if (!g || g.mode === "classic") return null;
  const me = g.lanes.find((l) => l.id === myId), team = teamOf(g.teams.map((t) => t.members), myId);
  const box = `rounded-2xl bg-black/35 ${compact ? "px-3 py-1.5" : "px-4 py-2.5"} text-white ring-1 ring-white/15 backdrop-blur-sm`;
  if (g.mode === "race" || g.mode === "space" || g.mode === "treasure") {
    const unit = (l: { points: number; progress: number }) => (g.mode === "treasure" ? `🪙 ${l.points}` : `${Math.round(l.progress * 100)}%`);
    if (compact && me) return <p className={`${box} text-center text-xs font-black`} aria-label="Your game">{modeInfo(g.mode).emoji} You: {me.place}{me.place === 1 ? "st" : me.place === 2 ? "nd" : me.place === 3 ? "rd" : "th"} of {g.lanes.length} · {unit(me)}{g.mode === "space" && me.streak >= 2 ? ` · 🔥${me.streak}` : ""}</p>;
    return (
      <ol className={`${box} flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-black`} aria-label="Leaders">
        {g.lanes.slice(0, compact ? 3 : 5).map((l) => <li key={l.id} className={l.place === 1 ? "text-amber-300" : ""}>{l.place}. {l.name} <span className="font-mono text-white/80">{unit(l)}</span></li>)}
        {!g.lanes.length && <li className="text-white/70">The game starts with the first answers.</li>}
      </ol>
    );
  }
  if (g.mode === "tug") {
    const pos = 50 - g.lead * 50;
    return (
      <div className={box} aria-label={`Rope: ${g.lead > 0.02 ? "Team Red is ahead" : g.lead < -0.02 ? "Team Blue is ahead" : "level"}`}>
        <p className="flex justify-between text-xs font-black"><span className={team === 0 ? "underline" : ""}>🔴 Red{team === 0 ? " (you)" : ""}</span><span className={team === 1 ? "underline" : ""}>Blue{team === 1 ? " (you)" : ""} 🔵</span></p>
        <span className="relative mt-1 block h-3 rounded-full" style={{ background: "linear-gradient(90deg, #EF4444 0 50%, #3B82F6 50% 100%)" }}>
          <span className="qw-knot absolute top-1/2 h-5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-amber-300 ring-2 ring-[#3b2600]" style={{ left: `${pos}%` }} />
        </span>
      </div>
    );
  }
  if (g.mode === "battle") {
    return (
      <div className={`${box} grid grid-cols-2 gap-3`} aria-label={`Health: Red ${g.hp[0] ?? 100}, Blue ${g.hp[1] ?? 100}`}>
        {[0, 1].map((t) => <div key={t}><p className="mb-0.5 text-xs font-black">{t ? "🔵 Blue" : "🔴 Red"}{team === t ? " (you)" : ""} <span className="font-mono text-white/75">{Math.round(g.hp[t] ?? 100)}</span></p>{meter(g.hp[t] ?? 100, (g.hp[t] ?? 100) > 50 ? "#22C55E" : (g.hp[t] ?? 100) > 20 ? "#F59E0B" : "#EF4444")}</div>)}
      </div>
    );
  }
  const hp = g.hp[0] ?? 100;
  return (
    <div className={`${box} flex items-center gap-3`} aria-label={`The ${BOSS.name}: ${hp} health; ${g.hearts} hearts left`}>
      <span className="qg-bob text-2xl" aria-hidden>{BOSS.emoji}</span>
      <div className="min-w-0 flex-1"><p className="mb-0.5 text-xs font-black">{BOSS.name} <span className="font-mono text-white/75">{Math.round(hp)}/100</span></p>{meter(hp, "#DC2626")}</div>
      <span className="text-lg tracking-tight" aria-hidden>{Array.from({ length: BOSS.hearts }, (_, i) => (i < g.hearts ? "❤️" : "🖤")).join("")}</span>
    </div>
  );
}

// ── The mission briefing in the lobby ────────────────────────────────────
export function Briefing({ mode }: { mode: GameMode }) {
  const w = worldOf(mode);
  if (!w) return null;
  return (
    <div className="qw-banner mx-auto mt-4 flex max-w-2xl items-center gap-4 rounded-2xl bg-black/35 p-4 text-left ring-1 ring-white/20 backdrop-blur-sm" aria-label="How to play">
      <span className="qg-bob text-5xl" aria-hidden>{modeInfo(mode).emoji}</span>
      <p className="text-base font-bold leading-snug">{w.story}</p>
    </div>
  );
}
