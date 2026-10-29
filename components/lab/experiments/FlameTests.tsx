"use client";
import { useEffect, useState } from "react";
import { Panel, Insight, Challenge, LabButton } from "@/components/lab/LabUI";
import { FLAME_IONS } from "@/lib/lab/sims";

const C = "#F472B6";
type Ion = (typeof FLAME_IONS)[number];

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function FlameTests() {
  const [ion, setIon] = useState<Ion | null>(null);
  const [mode, setMode] = useState<"explore" | "quiz">("explore");
  const [queue, setQueue] = useState<Ion[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [flick, setFlick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFlick((f) => (f + 1) % 1000), 120);
    return () => clearInterval(id);
  }, []);

  const current = mode === "quiz" ? queue[0] ?? null : ion;
  const flameColor = current?.color ?? "#60A5FA";
  const sway = Math.sin(flick / 2) * 4;

  function startQuiz() {
    setMode("quiz"); setQueue(shuffle([...FLAME_IONS])); setScore(0); setFeedback(null);
  }
  function answer(guess: Ion) {
    if (!queue.length) return;
    const right = guess.ion === queue[0].ion;
    if (right) setScore((s) => s + 1);
    setFeedback(right ? `Correct — ${queue[0].name} gives a ${queue[0].colourName} flame.` : `That was ${queue[0].name} (${queue[0].colourName}).`);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Bunsen burner">
          <svg viewBox="0 0 300 330" className="h-auto w-full rounded-2xl bg-black/40" role="img"
            aria-label={current ? (mode === "quiz" ? "Unknown salt in the flame" : `${current.name} flame: ${current.colourName}`) : "Blue roaring flame, no sample"}>
            <defs>
              <radialGradient id="glow" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stopColor={flameColor} stopOpacity=".55" />
                <stop offset="100%" stopColor={flameColor} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="130" r="110" fill="url(#glow)" />
            {/* flame */}
            <path d={`M150 ${40 + sway} C ${185 + sway} 110, 180 170, 150 205 C 120 170, ${115 + sway} 110, 150 ${40 + sway} Z`} fill={flameColor} opacity=".85" />
            <path d={`M150 ${120 + sway / 2} C 165 160, 162 185, 150 205 C 138 185, 135 160, 150 ${120 + sway / 2} Z`} fill="#93C5FD" opacity=".8" />
            {/* nichrome wire loop */}
            {current && (
              <g>
                <line x1="260" y1="60" x2="168" y2="150" stroke="#CBD5E1" strokeWidth="3" />
                <circle cx="163" cy="155" r="7" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                <rect x="250" y="46" width="34" height="20" rx="4" transform="rotate(-44 267 56)" fill="#78350F" />
              </g>
            )}
            {/* burner */}
            <rect x="138" y="205" width="24" height="80" rx="3" fill="#94A3B8" />
            <rect x="141" y="250" width="18" height="8" fill="#334155" />
            <rect x="100" y="285" width="100" height="16" rx="4" fill="#475569" />
            <path d="M100 293 H40" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
            <text x="150" y="322" fontSize="12" textAnchor="middle" fontWeight="700" fill="rgba(255,255,255,.75)">
              {current ? (mode === "quiz" ? "Unknown salt — what is the metal ion?" : `${current.name} (${current.ion})`) : "Dip the wire in a salt"}
            </text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton variant={mode === "explore" ? "solid" : "ghost"} color={C} onClick={() => { setMode("explore"); setFeedback(null); }}>Explore</LabButton>
            <LabButton variant={mode === "quiz" ? "solid" : "ghost"} color={C} onClick={startQuiz}>Identify unknowns</LabButton>
            {mode === "explore" && <LabButton variant="ghost" onClick={() => setIon(null)}>Clean the wire</LabButton>}
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        {mode === "explore" ? (
          <Panel title="Choose a salt">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FLAME_IONS.map((f) => (
                <button key={f.ion} type="button" onClick={() => setIon(f)} aria-pressed={ion?.ion === f.ion}
                  className={`min-h-[52px] rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${ion?.ion === f.ion ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-black/25 text-white/75 hover:bg-white/5"}`}>
                  <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: f.color }} />
                  {f.name} chloride
                  <span className="block text-[11px] font-semibold text-white/45">{f.ion} · {f.colourName}</span>
                </button>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel title={queue.length ? `Unknown ${FLAME_IONS.length - queue.length + 1} of ${FLAME_IONS.length}` : "Results"} right={<span className="font-mono text-sm font-bold text-pink-300">{score}/{FLAME_IONS.length}</span>}>
            {queue.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FLAME_IONS.map((f) => (
                  <LabButton key={f.ion} variant="ghost" onClick={() => answer(f)}>{f.name} ({f.ion})</LabButton>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/80">You identified <b>{score}</b> of {FLAME_IONS.length} metal ions.</p>
                <LabButton className="mt-3" color={C} onClick={startQuiz}>Try again</LabButton>
              </div>
            )}
            {feedback && <p className="mt-3 text-sm font-semibold text-white/85">{feedback}</p>}
          </Panel>
        )}
        <Insight color={C}>
          Heat excites electrons in the metal ion to higher energy levels. As they fall back they give out light of
          particular wavelengths — a colour that fingerprints the metal. Clean the nichrome wire in concentrated
          hydrochloric acid between tests so samples don&apos;t contaminate each other.
        </Insight>
        <Challenge>Why is a sodium flame a problem when testing other salts? (Hint: even a trace of sodium gives a strong yellow that hides weaker colours.)</Challenge>
      </div>
    </div>
  );
}
