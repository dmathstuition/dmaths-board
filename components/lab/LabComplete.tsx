"use client";
import { useEffect, useRef, useState } from "react";
import { LAB_MIN_SECONDS } from "@/lib/rewardRules";

// "I've completed this experiment" for learners: unlocks after a minute of
// active time on the experiment and claims reward points (lib/rewardRules.ts).
export default function LabComplete({ slug, color }: { slug: string; color: string }) {
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const done = useRef(false);

  // Count only time the page is actually open in front of the learner.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") setSecs((s) => s + 1); }, 1000);
    return () => clearInterval(id);
  }, []);

  async function claim() {
    setBusy(true);
    const r = await fetch("/api/lab/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, seconds: secs }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || !r.ok) { setMsg({ text: j.error || "Couldn't save — check your connection.", ok: false }); return; }
    done.current = true;
    setMsg({ text: j.message, ok: j.points > 0 });
    if (j.points > 0) window.dispatchEvent(new CustomEvent("reward-points", { detail: { total: j.total, delta: j.points } }));
  }

  const ready = secs >= LAB_MIN_SECONDS;
  return (
    <section className="elab-panel mt-6 flex flex-wrap items-center gap-4 p-5" aria-label="Complete this experiment">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${color}22` }} aria-hidden>🪙</span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold text-white">Finished the practical?</p>
        <p className="text-sm text-white/60">{msg ? msg.text : ready
          ? "Claim your reward points — 15 for a new experiment, 3 for a repeat."
          : `Work through the steps first — you can claim in ${LAB_MIN_SECONDS - secs}s.`}</p>
      </div>
      {!done.current && (
        <button type="button" onClick={claim} disabled={!ready || busy}
          className="min-h-[44px] rounded-xl px-5 text-sm font-bold text-[#070B1A] transition hover:brightness-110 disabled:opacity-40" style={{ background: color }}>
          {busy ? "Saving…" : "✓ I've completed it"}
        </button>
      )}
    </section>
  );
}
