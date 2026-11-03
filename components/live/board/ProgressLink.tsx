"use client";
import { useState } from "react";
import { TERM_RANGES } from "@/lib/termProgress";

// "Term progress" for one learner: pick how far back, then open the page or
// send it home on WhatsApp. The teacher can do it for any learner; a learner
// only for themself (the server decides).
export default function ProgressLink({ sessionId, name, dark = false, label = "Term progress" }: { sessionId: string; name?: string; dark?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(TERM_RANGES[1].days);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function get(d: number) {
    setDays(d); setLink(null); setErr(null);
    const q = new URLSearchParams({ sessionId, days: String(d), ...(name ? { name } : {}) });
    const r = await fetch(`/api/board/progress?${q}`, { cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && j.link) setLink(new URL(j.link, window.location.origin).toString()); else setErr(j.error ?? "Couldn't make the link — check the internet.");
  }
  const btn = `inline-flex min-h-[36px] items-center rounded-lg px-2.5 text-xs font-black`;
  if (!open) {
    return <button type="button" onClick={() => { setOpen(true); get(days); }} className={`${btn} ${dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#0E6E72] text-white"}`} aria-label={name ? `${label} for ${name}` : label}>📈 {label}</button>;
  }
  return (
    <div className={`flex w-full flex-wrap items-center gap-1.5 rounded-xl p-2 ${dark ? "bg-white/10" : "bg-slate-50 ring-1 ring-slate-200"}`} role="group" aria-label={name ? `${label} for ${name}` : label}>
      {TERM_RANGES.map((r) => (
        <button key={r.days} type="button" onClick={() => get(r.days)} aria-pressed={days === r.days}
          className={`${btn} ${days === r.days ? (dark ? "bg-white text-[#0A3B3E]" : "bg-[#0E6E72] text-white") : dark ? "text-white/75" : "bg-white text-ink/70 ring-1 ring-slate-200"}`}>{r.label}</button>
      ))}
      <span className="flex-1" />
      {err && <span role="alert" className="text-xs font-bold text-red-500">{err}</span>}
      {link && (
        <>
          <a href={link} target="_blank" rel="noreferrer" className={`${btn} ${dark ? "bg-amber-400 text-[#0A3B3E]" : "bg-[#0E6E72] text-white"}`}>Open</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${name ? `${name}'s` : "My"} term progress: ${link}`)}`} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white`}>WhatsApp</a>
          <button type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {})} className={`${btn} ${dark ? "bg-white/10 text-white" : "bg-white text-ink/75 ring-1 ring-slate-200"}`}>{copied ? "Copied ✓" : "Copy"}</button>
        </>
      )}
      {!link && !err && <span className="text-xs font-bold opacity-60">Making the link…</span>}
      <button type="button" onClick={() => setOpen(false)} aria-label="Close" className={`${btn} ${dark ? "text-white/70" : "text-ink/60"}`}>✕</button>
    </div>
  );
}
