"use client";
// The lab safety licence quiz (lib/lab/licence.ts), and the hazard symbols —
// drawn the way they look on bottles: a black pictogram in a red diamond.
import { useMemo, useState } from "react";
import { LICENCE_PASS, LICENCE_SIZE, SYMBOLS, licenceQuiz, looksOf, passed, type Licence, type Symbol } from "@/lib/lab/licence";

// named: say what it is (a key of symbols); otherwise only what it shows (a quiz question).
export function HazardSymbol({ s, size = 120, named = false }: { s: Symbol; size?: number; named?: boolean }) {
  const k = "#111827";
  const icon: Record<Symbol, JSX.Element> = {
    flammable: <path d="M50 22 C60 36 68 44 66 58 C65 70 57 77 50 77 C40 77 32 69 33 58 C34 50 39 46 42 40 C43 48 46 51 49 52 C47 42 47 32 50 22 Z" fill={k} />,
    corrosive: <g fill={k}><path d="M28 30 h14 l-2 10 h-10 z" /><path d="M58 30 h14 l-2 10 h-10 z" /><circle cx="35" cy="47" r="2.6" /><circle cx="65" cy="47" r="2.6" /><path d="M24 62 h22 l-4 4 h-14 z" /><path d="M54 62 c4 -2 10 -2 16 0 l4 6 h-24 z" /><rect x="22" y="70" width="56" height="5" /></g>,
    toxic: <g fill={k}><ellipse cx="50" cy="40" rx="15" ry="14" /><rect x="42" y="50" width="16" height="8" rx="2" /><circle cx="44" cy="40" r="4" fill="#fff" /><circle cx="56" cy="40" r="4" fill="#fff" /><path d="M26 60 L74 76 M26 76 L74 60" stroke={k} strokeWidth="6" strokeLinecap="round" /></g>,
    harmful: <g fill={k}><path d="M45 24 h10 l-2 34 h-6 z" /><circle cx="50" cy="68" r="5.5" /></g>,
    oxidising: <g fill={k}><circle cx="50" cy="64" r="12" fill="none" stroke={k} strokeWidth="6" /><path d="M50 20 C58 30 62 36 60 46 C58 54 52 56 50 56 C44 56 39 51 40 44 C41 38 45 36 46 31 C47 37 49 39 50 40 C49 33 49 27 50 20 Z" /><rect x="26" y="76" width="48" height="4" /></g>,
    explosive: <g fill={k}><circle cx="44" cy="62" r="10" /><path d="M56 48 l6 -10 l2 9 l9 -5 l-4 9 l10 1 l-9 5 l7 7 l-10 -2 l1 10 l-7 -7 l-5 9 z" /><path d="M20 70 l8 -3 M22 54 l8 2 M30 40 l6 6" stroke={k} strokeWidth="3" /></g>,
    environment: <g fill={k}><path d="M34 74 V44 M34 50 l-8 -8 M34 56 l9 -9 M34 46 l6 -10" stroke={k} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M50 74 h28" stroke={k} strokeWidth="3" /><path d="M54 66 c6 -6 14 -6 20 0 c-6 6 -14 6 -20 0 z M54 66 l-5 -4 v8 z" /></g>,
    health: <g fill={k}><circle cx="50" cy="28" r="7" /><path d="M38 38 h24 l4 38 h-32 z" /><path d="M50 46 l3 6 h6 l-5 4 l2 7 l-6 -4 l-6 4 l2 -7 l-5 -4 h6 z" fill="#fff" /></g>,
    gas: <g fill={k}><rect x="30" y="44" width="40" height="22" rx="11" transform="rotate(-20 50 55)" /><rect x="66" y="34" width="8" height="10" transform="rotate(-20 70 39)" /></g>,
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={named ? `Hazard symbol: ${SYMBOLS[s].name}` : `A hazard symbol showing ${looksOf(s)}`}>
      <rect x="15" y="15" width="70" height="70" transform="rotate(45 50 50)" fill="#fff" stroke="#DC2626" strokeWidth="7" strokeLinejoin="round" />
      {icon[s]}
    </svg>
  );
}

export default function LicenceQuiz({ name, onPass, onClose }: { name?: string; onPass: (l: Licence) => void; onClose?: () => void }) {
  const [round, setRound] = useState(0);
  const qs = useMemo(() => licenceQuiz(), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const q = qs[at], picked = picks[at], done = at >= qs.length;
  const score = picks.filter((p, i) => p === qs[i]?.answer).length;
  const again = () => { setRound((r) => r + 1); setAt(0); setPicks([]); };

  if (done) {
    const ok = passed(score);
    return (
      <section aria-label="Safety licence result" className="mx-auto max-w-lg rounded-2xl bg-white p-5 text-center text-slate-900 shadow-xl">
        <p className="text-5xl" aria-hidden>{ok ? "🪪" : "🔁"}</p>
        <p className="mt-2 text-xl font-black">{ok ? "You've got your lab safety licence!" : "Not yet — have another go"}</p>
        <p className="mt-1 text-sm font-bold text-slate-600">{score} / {qs.length} right · you need {LICENCE_PASS}</p>
        {ok && (
          <div className="mx-auto mt-4 max-w-xs rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50 p-3 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Lab safety licence</p>
            <p className="text-lg font-black">{name || "Learner"}</p>
            <p className="text-xs font-bold text-slate-600">Passed {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {score}/{qs.length}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ok ? <button type="button" onClick={() => onPass({ at: Date.now(), score, of: qs.length, ...(name ? { name } : {}) })} className="min-h-[48px] rounded-xl bg-emerald-600 px-5 text-sm font-black text-white">Go to the practical →</button>
            : <button type="button" onClick={again} className="min-h-[48px] rounded-xl bg-[#0E6E72] px-5 text-sm font-black text-white">Try again (new questions)</button>}
          {onClose && <button type="button" onClick={onClose} className="min-h-[48px] rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700">Not now</button>}
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Lab safety licence" className="mx-auto max-w-lg rounded-2xl bg-white p-4 text-slate-900 shadow-xl sm:p-5">
      <p className="text-xs font-black uppercase tracking-widest text-[#0E6E72]">🪪 Lab safety licence · question {at + 1} of {LICENCE_SIZE}</p>
      {at === 0 && picked == null && <p className="mt-1 text-sm text-slate-600">Before your first practical: show you know the hazard symbols and the lab rules. Get {LICENCE_PASS} of {LICENCE_SIZE} right to pass.</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#0E6E72]" style={{ width: `${(at / qs.length) * 100}%` }} /></div>
      {q.symbol && <div className="mt-3 flex justify-center"><HazardSymbol s={q.symbol} /></div>}
      <p className="mt-3 text-lg font-black leading-snug">{q.q}</p>
      <div role="radiogroup" aria-label="Your answer" className="mt-3 grid gap-2">
        {q.options.map((o, i) => {
          const mark = picked == null ? null : i === q.answer ? "right" : i === picked ? "wrong" : null;
          return (
            <button key={o} type="button" role="radio" aria-checked={picked === i} disabled={picked != null} onClick={() => setPicks((p) => { const n = [...p]; n[at] = i; return n; })}
              className={`min-h-[48px] rounded-xl px-3 py-2 text-left text-sm font-bold ring-2 ${mark === "right" ? "bg-emerald-50 text-emerald-900 ring-emerald-500" : mark === "wrong" ? "bg-red-50 text-red-900 ring-red-400" : "bg-white ring-slate-200 hover:ring-[#0E6E72]"}`}>
              {mark === "right" ? "✓ " : mark === "wrong" ? "✗ " : ""}{o}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <div role="status" className={`mt-3 rounded-xl p-3 text-sm ${picked === q.answer ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
          <b>{picked === q.answer ? "Right." : "Not quite."}</b> {q.why}
        </div>
      )}
      {picked != null && <button type="button" onClick={() => setAt(at + 1)} className="mt-3 min-h-[48px] w-full rounded-xl bg-[#0E6E72] text-sm font-black text-white">{at + 1 < qs.length ? "Next →" : "See my result"}</button>}
    </section>
  );
}
