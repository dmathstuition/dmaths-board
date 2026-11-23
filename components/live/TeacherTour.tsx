"use client";
// A first-time tour of the class screen for teachers: about a minute, pointing
// at the real buttons — how learners join, slides, the board, setting a
// question (with A.I.), marking it, the learners list, and ending the class.
// It starts by itself the first time on this device; "❓ Tour" runs it again.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const TOUR_DONE_KEY = "dmb-tour-done-v1";
export type TourStep = { target?: string; title: string; body: string };

export const TEACHER_TOUR: TourStep[] = [
  { title: "Welcome to your class 👋", body: "A one-minute tour of the things you'll use most. You can skip it, and take it again any time from ❓ Tour." },
  { target: '[data-tour="pin"]', title: "Learners join with this PIN", body: "On their phone they go to the join page, type this PIN and their name — no account needed. Copy the link or send it on WhatsApp." },
  { target: '[aria-label="Upload slides"]', title: "Upload your slides", body: "A PowerPoint saved as PDF, or photos. Each slide becomes a page you can write on, and they're saved with the class." },
  { target: '[role="toolbar"][aria-label="Whiteboard tools"]', title: "Teach on the board", body: "Pen, highlighter, shapes, text and maths. Learners see every stroke live on their phones." },
  { target: '[aria-label="Answer boards"]', title: "Set a question", body: "Every learner answers on their own small board. Type a question — or let ✨ A.I. write questions on your topic, with answers only you can see." },
  { target: '[aria-label="Answer boards"]', title: "Mark it", body: "Open any learner's answer and tap ✓ or ✗ right on their work. They see your marking at once, and one tap turns the ticks into their mark." },
  { target: '[data-tour="learners"]', title: "Your learners", body: "Who's here, raised hands, and who may write on the board. Removed someone by mistake? Let them back in from here." },
  { target: '[data-tour="end"]', title: "End class when you're done", body: "The board is saved and you'll see everyone's results. You can continue the class later with the same board." },
];

const visible = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};
export const tourSeen = () => { try { return localStorage.getItem(TOUR_DONE_KEY) === "1"; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(TOUR_DONE_KEY, "1"); } catch { /* private mode: it just shows again next time */ } };

export default function TeacherTour({ open, onClose, steps = TEACHER_TOUR }: { open: boolean; onClose: () => void; steps?: TourStep[] }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(1024);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i === steps.length - 1;

  const finish = useCallback(() => { markSeen(); setI(0); onClose(); }, [onClose]);
  // Find the step's button (if it's on screen), bring it into view, and keep the spotlight on it.
  const measure = useCallback(() => {
    setVw(window.innerWidth);
    const el = step.target ? [...document.querySelectorAll(step.target)].find(visible) : undefined;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.target]);
  useLayoutEffect(() => {
    if (!open) return;
    const el = step.target ? [...document.querySelectorAll(step.target)].find(visible) : undefined;
    el?.scrollIntoView({ block: "center", behavior: "auto" });
    measure();
  }, [open, i, step.target, measure]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    const t = setInterval(measure, 500); // the board lays itself out after loading
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); clearInterval(t); };
  }, [open, measure]);
  useEffect(() => { if (open) nextRef.current?.focus(); }, [open, i]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); finish(); }
      else if (e.key === "ArrowRight") { e.stopImmediatePropagation(); if (last) finish(); else setI((n) => n + 1); }
      else if (e.key === "ArrowLeft") { e.stopImmediatePropagation(); setI((n) => Math.max(0, n - 1)); }
    };
    window.addEventListener("keydown", key, true); // before the board's own shortcuts
    return () => window.removeEventListener("keydown", key, true);
  }, [open, last, finish]);
  if (!open) return null;

  const pad = 8, phone = vw < 640;
  const spot = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  // The card: under the button if there's room, else above it; on phones, along the bottom.
  const cardW = Math.min(360, vw - 32);
  const below = spot ? spot.top + spot.height + 220 < window.innerHeight : true;
  const cardStyle: React.CSSProperties = phone || !spot
    ? (spot ? { left: 16, right: 16, bottom: 16 } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: cardW })
    : { width: cardW, left: Math.max(16, Math.min(vw - cardW - 16, spot.left + spot.width / 2 - cardW / 2)),
        ...(below ? { top: spot.top + spot.height + 12 } : { bottom: window.innerHeight - spot.top + 12 }) };

  return (
    <div className="fixed inset-0 z-[150]" aria-live="polite">
      {/* Dim everything but the button being shown. */}
      {spot ? <div aria-hidden className="tour-spot pointer-events-none fixed rounded-2xl transition-all duration-300" style={spot} />
        : <div aria-hidden className="fixed inset-0 bg-slate-900/65" />}
      <div role="dialog" aria-modal="true" aria-label="Quick tour" className="tour-card fixed rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/5" style={cardStyle}>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-black text-violet-800">{i + 1} of {steps.length}</span>
          <button type="button" onClick={finish} className="ml-auto text-xs font-bold text-ink/50 hover:text-ink">Skip tour</button>
        </div>
        <h2 className="mt-2 font-display text-xl font-black text-ink">{step.title}</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/75">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>{steps.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-violet-600" : n < i ? "w-1.5 bg-violet-300" : "w-1.5 bg-slate-200"}`} />)}</span>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="ml-auto min-h-[40px] rounded-xl px-3 text-sm font-black text-ink/60 hover:bg-slate-100">Back</button>}
          <button ref={nextRef} type="button" onClick={() => (last ? finish() : setI(i + 1))}
            className={`${i > 0 ? "" : "ml-auto"} min-h-[40px] rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-700`}>
            {last ? "Start teaching 🎉" : i === 0 ? "Show me" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
