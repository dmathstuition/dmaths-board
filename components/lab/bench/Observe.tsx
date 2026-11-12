"use client";
// Writing observations like a scientist (lib/lab/observe.ts). After a step
// where something happens, a learner writes what they saw first; then it's
// checked kindly and they see how a scientist would record it. The notebook's
// "Observations" page holds them all, and more can be added any time.
import { useState } from "react";
import { LOOK_FOR, STARTERS, checkObservation, type Observation, type Subject } from "@/lib/lab/observe";

export function HowToObserve({ subject }: { subject: Subject }) {
  return (
    <details className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
      <summary className="cursor-pointer font-black text-[#0A4F52]">How to write a good observation</summary>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
        <li>Write only what you <b>see, hear, smell or measure</b> — not why it happens (that goes in your conclusion).</li>
        <li>For a change, say what it was <b>before and after</b>: “from blue to colourless”.</li>
        <li>Give the <b>unit</b> with every number: 23.5 cm³, 41 °C, 12 s.</li>
        <li>Write it <b>straight away</b>, while you can still see it.</li>
      </ul>
      <p className="mt-1.5 font-black">What to look for</p>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-4">{LOOK_FOR[subject].map((x) => <li key={x}>{x}</li>)}</ul>
    </details>
  );
}

function Writer({ subject, onSave, onSkip, label = "My observation", saveLabel = "Save my observation" }: {
  subject: Subject; onSave: (text: string) => void; onSkip?: () => void; label?: string; saveLabel?: string;
}) {
  const [text, setText] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sentence starters">
        {STARTERS[subject].map((s) => (
          <button key={s} type="button" onClick={() => setText((t) => (t.trim() ? `${t.trim()} ${s}` : s))}
            className="min-h-[32px] rounded-full bg-white px-2.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-300 hover:ring-[#0E6E72]">{s}</button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={400} aria-label={label}
        placeholder="e.g. The solution turned from blue to colourless and bubbles were given off."
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0E6E72] focus:outline-none focus:ring-2 focus:ring-[#A9D6D3]" />
      <div className="mt-1.5 flex flex-wrap gap-2">
        <button type="button" disabled={!text.trim()} onClick={() => { onSave(text.trim()); setText(""); }}
          className="min-h-[44px] rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white disabled:opacity-50">{saveLabel}</button>
        {onSkip && <button type="button" onClick={onSkip} className="min-h-[44px] rounded-xl px-3 text-xs font-black text-slate-500 underline decoration-dotted">Skip — just show me</button>}
      </div>
    </div>
  );
}

// After a step where something happens: write it first, then compare.
export function ObservePrompt({ subject, note, step, saved, onSave }: {
  subject: Subject; note: string; step: number; saved: Observation | undefined; onSave: (o: Observation) => void;
}) {
  if (!saved) {
    return (
      <section aria-label="Record your observation" className="mt-3 rounded-xl bg-[#FFF7E6] p-3 ring-1 ring-[#F5C46B]">
        <p className="text-sm font-black text-[#7A4B00]">✍️ What did you see? Write your observation before you go on.</p>
        <p className="text-xs text-[#7A4B00]/80">Look at the bench — then write what changed.</p>
        <div className="mt-2"><Writer subject={subject} onSave={(t) => { const c = checkObservation(t); onSave({ step, text: t, ok: c.ok, tips: c.tips }); }} onSkip={() => onSave({ step, text: "", ok: false, tips: [] })} /></div>
        <HowToObserve subject={subject} />
      </section>
    );
  }
  const c = saved.text ? checkObservation(saved.text) : null;
  return (
    <section aria-label="Your observation" className="mt-3 rounded-xl bg-[#EEF7F6] p-3 text-sm ring-1 ring-[#A9D6D3]">
      {saved.text && <p className="text-slate-800"><b>You wrote:</b> {saved.text}</p>}
      {c && (c.ok
        ? <p className="mt-1 font-black text-[#047857]">✓ A clear observation.{c.good.length ? <span className="font-semibold"> {c.good.join(" ")}</span> : null}</p>
        : <ul className="mt-1 space-y-0.5 text-xs font-bold text-amber-800">{c.tips.map((t) => <li key={t}>💡 {t}</li>)}</ul>)}
      <p className="mt-1.5 text-[#0A4F52]"><b>The notebook says:</b> {note}</p>
    </section>
  );
}

// The notebook page: every observation, and room to add more.
export function ObservationsPage({ subject, obs, onAdd, stepOf }: {
  subject: Subject; obs: Observation[]; onAdd: (text: string) => void; stepOf: (i: number) => string;
}) {
  const written = obs.filter((o) => o.text);
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      {written.length ? (
        <ol className="space-y-2">
          {written.map((o, i) => (
            <li key={i} className="rounded-lg bg-white p-2 text-sm ring-1 ring-slate-200">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{stepOf(o.step)}</p>
              <p className="text-slate-800">{o.text}</p>
              {o.ok ? <p className="text-xs font-black text-[#047857]">✓ Clear</p> : o.tips.map((t) => <p key={t} className="text-xs font-bold text-amber-800">💡 {t}</p>)}
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-slate-500">No observations yet. Write down what you see as you go — colours, bubbles, readings with units.</p>}
      <div className="rounded-xl bg-[#FFFDF7] p-2 ring-1 ring-slate-200">
        <p className="mb-1.5 text-xs font-black text-slate-700">Add an observation</p>
        <Writer subject={subject} onSave={onAdd} label="New observation" saveLabel="Add it" />
      </div>
      <HowToObserve subject={subject} />
    </div>
  );
}
