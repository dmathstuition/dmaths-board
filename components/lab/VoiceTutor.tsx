"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { guideScript, parseCommand, type LabGuide } from "@/lib/lab/guides";

// The e-lab voice tutor: reads the practical aloud — aim, each step (using
// the controls on screen), how to do it well, and the conclusion — and waits
// for the learner to finish each step before moving on. Hands-free voice
// commands ("next", "repeat", "back", "pause") and "Ask the tutor" where the
// browser supports them. Speech is the browser's own (no audio is uploaded).

type Rec = { start: () => void; stop: () => void; abort: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };
const RATES = [0.85, 1, 1.15] as const;
const PREFS = "elab-voice-tutor";

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  for (const want of ["en-ng", "en-gb", "en-za", "en-us"]) {
    const v = en.find((x) => x.lang.toLowerCase() === want && /natural|google|online|neural/i.test(x.name)) ?? en.find((x) => x.lang.toLowerCase() === want);
    if (v) return v;
  }
  return en[0] ?? null;
}
const recognitionCtor = (): (new () => Rec) | null =>
  typeof window === "undefined" ? null : ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null);

export default function VoiceTutor({ slug, guide, color }: { slug: string; guide: LabGuide; color: string }) {
  const script = useMemo(() => guideScript(guide), [guide]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(true);
  const [rate, setRate] = useState<number>(1);
  const [waitForMe, setWaitForMe] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [canSpeak, setCanSpeak] = useState(true);
  const [canListen, setCanListen] = useState(false);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);

  const iRef = useRef(0);
  const pausedRef = useRef(true);
  const speakingRef = useRef(false);
  const recRef = useRef<Rec | null>(null);
  const qRecRef = useRef<Rec | null>(null);
  iRef.current = i;
  pausedRef.current = paused;

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    setCanListen(!!recognitionCtor());
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) || "{}");
      if (RATES.includes(p.rate)) setRate(p.rate);
      if (typeof p.waitForMe === "boolean") setWaitForMe(p.waitForMe);
    } catch { /* storage blocked */ }
    // Some browsers load voices late.
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => {};
    return () => {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      recRef.current?.abort(); qRecRef.current?.abort();
    };
  }, []);
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify({ rate, waitForMe })); } catch { /* storage blocked */ } }, [rate, waitForMe]);

  // Speak one piece of text; `then` runs when it finishes naturally.
  const say = useCallback((text: string, then?: () => void) => {
    if (!canSpeak) { then?.(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    u.rate = rate;
    u.onstart = () => { speakingRef.current = true; setSpeaking(true); };
    const done = (natural: boolean) => {
      speakingRef.current = false; setSpeaking(false);
      if (natural) then?.();
    };
    u.onend = () => done(true);
    u.onerror = () => done(false);
    synth.speak(u);
  }, [canSpeak, rate]);

  // Read line k, then carry on unless it's a step and we wait for the learner.
  const play = useCallback((k: number) => {
    const line = script[k];
    if (!line) return;
    setI(k); setPaused(false); setAnswer(null);
    say(line.text, () => {
      if (pausedRef.current || iRef.current !== k) return;
      const last = k >= script.length - 1;
      if (last) { setPaused(true); return; }
      if (line.kind === "step" && waitForMe) { setPaused(true); return; } // learner does it, then "next"
      play(k + 1);
    });
  }, [script, say, waitForMe]);

  const stop = useCallback(() => { setPaused(true); try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);
  const next = useCallback(() => play(Math.min(script.length - 1, iRef.current + 1)), [play, script.length]);
  const back = useCallback(() => play(Math.max(0, iRef.current - 1)), [play]);
  const repeat = useCallback(() => play(iRef.current), [play]);

  // Hands-free commands. Ignore what we hear while the tutor itself is talking.
  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!handsFree || !Ctor || !open) { recRef.current?.abort(); recRef.current = null; return; }
    const rec = new Ctor();
    rec.continuous = true; rec.interimResults = false; rec.lang = "en-GB";
    let alive = true;
    rec.onresult = (e: any) => {
      if (speakingRef.current) return;
      const text = String(e.results[e.results.length - 1]?.[0]?.transcript ?? "");
      const cmd = parseCommand(text);
      setHeard(cmd ? `Heard “${text.trim()}”` : null);
      if (cmd === "next") next();
      else if (cmd === "back") back();
      else if (cmd === "repeat") repeat();
      else if (cmd === "pause" || cmd === "stop") stop();
      else if (cmd === "resume") repeat();
    };
    rec.onend = () => { if (alive) { try { rec.start(); } catch { /* already running */ } } };
    rec.onerror = (e: any) => { if (e?.error === "not-allowed") { alive = false; setHandsFree(false); } };
    try { rec.start(); } catch { /* ignore */ }
    recRef.current = rec;
    return () => { alive = false; rec.abort(); };
  }, [handsFree, open, next, back, repeat, stop]);

  async function ask(question = q) {
    const text = question.trim();
    if (text.length < 3) return;
    stop();
    setAsking(true); setAskErr(null); setAnswer(null);
    const cur = script[iRef.current];
    try {
      const r = await fetch("/api/lab-tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, question: text, step: cur?.kind === "step" ? cur.n : undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setAskErr(j.error ?? "The tutor couldn't answer just now."); return; }
      setAnswer(j.answer); setQ("");
      say(j.answer);
    } catch { setAskErr("Couldn't reach the tutor — check your connection."); }
    finally { setAsking(false); }
  }

  function speakQuestion() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    stop();
    const rec = new Ctor();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-GB";
    rec.onresult = (e: any) => { const t = String(e.results[0]?.[0]?.transcript ?? ""); setQ(t); ask(t); };
    rec.onerror = () => setAskErr("Couldn't hear that — check the microphone, or type your question.");
    rec.onend = () => { qRecRef.current = null; };
    qRecRef.current = rec;
    try { rec.start(); } catch { /* ignore */ }
  }

  const line = script[i];
  const steps = guide.steps.length;
  const waiting = paused && !speaking && line?.kind === "step" && i < script.length - 1;

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); play(0); }}
        className="elab-panel flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[.07]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${color}22` }} aria-hidden>🎧</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold text-white">Voice tutor — talk me through it</span>
          <span className="block text-sm text-white/60">A voice guides you step by step through the practical and how to do it well. You can ask it questions too.</span>
        </span>
        <span className="hidden shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-[#070B1A] sm:block" style={{ background: color }}>▶ Start</span>
      </button>
    );
  }

  return (
    <section className="elab-panel p-5" aria-label="Voice tutor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-white/50">🎧 Voice tutor</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-white/60">{line?.kind === "step" ? `Step ${line.n} of ${steps}` : line?.kind === "aim" ? "Aim" : line?.kind === "tip" ? "Doing it well" : "Conclusion"}</span>
          <button type="button" onClick={() => { stop(); setOpen(false); setHandsFree(false); }} aria-label="Close the voice tutor" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white">✕</button>
        </div>
      </div>

      {/* progress */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {script.map((_, k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k <= i ? color : "rgba(255,255,255,.12)" }} />)}
      </div>

      <p aria-live="polite" className="mt-4 min-h-[3.5rem] font-display text-lg leading-snug text-white sm:text-xl">
        {speaking && <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full align-middle" style={{ background: color }} aria-hidden />}
        {line?.text}
      </p>
      {!canSpeak && <p className="mt-2 text-xs font-semibold text-amber-300">Your browser can&apos;t speak aloud — read the steps here and use the buttons.</p>}
      {waiting && <p className="mt-2 text-sm font-semibold" style={{ color }}>Do this step on the apparatus below, then tap “I&apos;ve done it”{handsFree ? " or say “next”" : ""}.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={back} disabled={i === 0} className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-bold text-white/85 hover:bg-white/10 disabled:opacity-40" aria-label="Previous">⏮ Back</button>
        {speaking
          ? <button type="button" onClick={stop} className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white hover:bg-white/10">⏸ Pause</button>
          : <button type="button" onClick={repeat} className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white hover:bg-white/10">🔁 Repeat</button>}
        <button type="button" onClick={next} disabled={i >= script.length - 1}
          className="min-h-[44px] flex-1 rounded-xl px-4 text-sm font-bold text-[#070B1A] transition hover:brightness-110 disabled:opacity-40 sm:flex-none"
          style={{ background: color }}>
          {line?.kind === "step" ? "I've done it — next ⏭" : "Next ⏭"}
        </button>
        {i >= script.length - 1 && <button type="button" onClick={() => play(0)} className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-bold text-white/85 hover:bg-white/10">Start again</button>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
        <label className="flex items-center gap-2">Speed
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-white">
            <option value={0.85}>Slower</option><option value={1}>Normal</option><option value={1.15}>Faster</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={waitForMe} onChange={(e) => setWaitForMe(e.target.checked)} className="h-4 w-4" style={{ accentColor: color }} /> Wait for me after each step</label>
        {canListen && (
          <label className="flex items-center gap-2"><input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="h-4 w-4" style={{ accentColor: color }} /> 🎙 Hands-free (say “next”, “repeat”, “back”, “pause”)</label>
        )}
        <button type="button" onClick={() => setShowAll((v) => !v)} className="font-bold underline-offset-2 hover:underline" aria-expanded={showAll}>{showAll ? "Hide" : "Show"} all steps</button>
      </div>
      {heard && handsFree && <p className="mt-1 text-[11px] text-white/40">{heard}</p>}

      {showAll && (
        <ol className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-black/20 p-3">
          {script.map((l, k) => (
            <li key={k}>
              <button type="button" onClick={() => play(k)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${k === i ? "font-bold text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                style={k === i ? { background: `${color}22` } : undefined}>
                {l.text}
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Ask the tutor */}
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <label htmlFor={`ask-${slug}`} className="sr-only">Ask the tutor a question</label>
        <input id={`ask-${slug}`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder="Stuck? Ask the tutor, e.g. why do we time 10 swings?"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2" style={{ ["--tw-ring-color" as any]: color }} />
        {canListen && <button type="button" onClick={speakQuestion} disabled={asking} aria-label="Ask by voice" className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-3 text-white hover:bg-white/10">🎙</button>}
        <button type="submit" disabled={asking || q.trim().length < 3} className="min-h-[44px] rounded-xl px-4 text-sm font-bold text-[#070B1A] disabled:opacity-40" style={{ background: color }}>{asking ? "Thinking…" : "Ask"}</button>
      </form>
      {askErr && <p role="alert" className="mt-2 text-sm font-semibold text-amber-300">{askErr}</p>}
      {answer && (
        <div className="mt-3 rounded-2xl border p-3 text-sm leading-relaxed text-white/85" style={{ borderColor: `${color}55`, background: `${color}12` }}>
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.16em]" style={{ color }}>Tutor</p>
          {answer}
          <div className="mt-2 flex gap-3 text-xs font-bold">
            <button type="button" onClick={() => say(answer)} className="text-white/70 hover:text-white">🔊 Hear again</button>
            <button type="button" onClick={repeat} className="text-white/70 hover:text-white">↩ Back to the steps</button>
          </div>
        </div>
      )}
    </section>
  );
}
