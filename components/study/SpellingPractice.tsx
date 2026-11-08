"use client";
import { useEffect, useRef, useState } from "react";
import { speak } from "@/lib/reading";
import { spelledRight, spokenSpelling } from "@/lib/exams";

// Look, cover, write, check — the learner's own spelling list: words they got
// wrong in spelling tests and haven't spelt right since.
type Word = { word: string; sentence: string };
type Step = "look" | "write" | "check";

export default function SpellingPractice({ token }: { token: string }) {
  const [words, setWords] = useState<Word[] | null>(null);
  const [learner, setLearner] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [step, setStep] = useState<Step>("look");
  const [typed, setTyped] = useState("");
  const [tries, setTries] = useState(0);
  const [firstTime, setFirstTime] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fetch(`/api/study?what=spelling&t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) { setWords(j.words ?? []); setLearner(j.learner ?? ""); } else setErr(j.error ?? "Couldn't open your spellings."); })
      .catch(() => setErr("Couldn't open your spellings — check the internet."));
  }, [token]);
  useEffect(() => { if (step === "write") input.current?.focus(); }, [step]);

  if (err) return <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{err}</p>;
  if (!words) return <div role="status" className="h-40 animate-pulse rounded-2xl bg-dmb-mint" aria-label="Opening your spellings" />;
  if (!words.length) return (
    <div className="space-y-2">
      <p className="text-2xl">🎉</p>
      <p className="text-lg font-bold text-dmb-ink">No spellings to practise{learner ? `, ${learner.split(" ")[0]}` : ""} — you&apos;ve spelt every word right!</p>
    </div>
  );
  if (at >= words.length) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-dmb-mint p-5 text-center">
          <p className="text-4xl">{firstTime === words.length ? "🌟" : "👍"}</p>
          <p className="mt-1 text-2xl font-bold text-dmb-ink">{firstTime} of {words.length} right first time</p>
          <p className="text-dmb-muted">These words come back in your next spelling test — practise them again before then.</p>
        </div>
        <button type="button" onClick={() => { setAt(0); setStep("look"); setTyped(""); setTries(0); setFirstTime(0); }} className="dmb-btn">Practise again</button>
      </div>
    );
  }
  const w = words[at];
  const right = spelledRight(typed, w.word);
  const say = () => speak(spokenSpelling({ q: w.sentence, answer: w.word }));
  const next = () => { setAt(at + 1); setStep("look"); setTyped(""); setTries(0); };
  const steps: [Step, string][] = [["look", "1 Look"], ["write", "2 Cover & write"], ["check", "3 Check"]];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-bold text-dmb-muted">
        <span>Word {at + 1} of {words.length}</span>
        <ol className="flex gap-1" aria-label="Steps">
          {steps.map(([k, label]) => <li key={k} aria-current={step === k ? "step" : undefined} className={`rounded-lg px-2 py-1 text-xs font-black ${step === k ? "bg-dmb-ink text-white" : "bg-dmb-mint text-dmb-ink"}`}>{label}</li>)}
        </ol>
      </div>
      {step === "look" && (
        <div className="space-y-3 rounded-2xl bg-white p-5 text-center ring-1 ring-dmb-rule">
          <p className="text-sm font-bold text-dmb-muted">Look carefully at the word. Say it, and spell it out loud.</p>
          <p className="font-display text-5xl font-black tracking-wide text-dmb-ink" aria-label={`The word: ${w.word}`}>{w.word}</p>
          <p className="text-dmb-muted">{w.sentence}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={say} className="dmb-btn-ghost">🔊 Hear it</button>
            <button type="button" onClick={() => setStep("write")} className="dmb-btn">Cover it and write →</button>
          </div>
        </div>
      )}
      {step === "write" && (
        <form className="space-y-3 rounded-2xl bg-white p-5 text-center ring-1 ring-dmb-rule" onSubmit={(e) => { e.preventDefault(); if (!typed.trim()) return; if (tries === 0 && spelledRight(typed, w.word)) setFirstTime((n) => n + 1); setTries((n) => n + 1); setStep("check"); }}>
          <p className="text-sm font-bold text-dmb-muted">The word is covered. Write it from memory.</p>
          <p className="font-display text-5xl font-black text-dmb-rule" aria-hidden>{"•".repeat(Math.min(12, w.word.length))}</p>
          <button type="button" onClick={say} className="dmb-btn-ghost">🔊 Hear it again</button>
          <label className="block text-left text-sm font-bold text-dmb-muted">Your spelling
            <input ref={input} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              className="mt-1 w-full rounded-xl bg-white px-4 py-3 text-2xl font-black text-dmb-ink ring-2 ring-dmb-rule focus:outline-none focus:ring-dmb-ink" />
          </label>
          <button type="submit" disabled={!typed.trim()} className="dmb-btn w-full disabled:opacity-50">Check ✓</button>
        </form>
      )}
      {step === "check" && (
        <div className={`space-y-3 rounded-2xl p-5 text-center ring-1 ${right ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`} role="status">
          <p className="text-3xl">{right ? "✓" : "✗"}</p>
          <p className="text-lg font-black text-dmb-ink">{right ? "Spelt right!" : "Not quite — compare them letter by letter."}</p>
          <div className="mx-auto grid max-w-xs gap-1 text-left">
            <p className="text-sm font-bold text-dmb-muted">You wrote: <span className={`font-display text-2xl font-black ${right ? "text-emerald-700" : "text-red-700"}`}>{typed.trim()}</span></p>
            <p className="text-sm font-bold text-dmb-muted">The word: <Letters word={w.word} typed={typed.trim()} /></p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {!right && <button type="button" onClick={() => { setTyped(""); setStep("look"); }} className="dmb-btn-ghost">Look again and retry</button>}
            <button type="button" onClick={next} className="dmb-btn">{at + 1 < words.length ? "Next word →" : "Finish"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// The right spelling, with the letters they missed or got wrong highlighted:
// the letters that match line up as the longest run in order ("rythm" only
// misses the h of "rhythm").
export function missedLetters(word: string, typed: string): boolean[] {
  const a = word.toLowerCase(), b = typed.toLowerCase();
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const miss = new Array(a.length).fill(true);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { miss[i] = false; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  return miss;
}
function Letters({ word, typed }: { word: string; typed: string }) {
  const miss = missedLetters(word, typed);
  return (
    <span className="font-display text-2xl font-black text-dmb-ink" aria-label={word}>
      {word.split("").map((ch, i) => <span key={i} aria-hidden className={miss[i] ? "rounded bg-amber-200 px-px" : ""}>{ch}</span>)}
    </span>
  );
}
