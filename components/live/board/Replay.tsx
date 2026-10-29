"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { buildTimeline, delayBefore, frameAt, isFreehand, partial } from "@/lib/boardReplay";
import { BOARD_H, BOARD_W, drawStrokes, type ImageSource, type Paper, type Stroke } from "@/lib/whiteboard";

const SPEEDS = [1, 2, 4];
const paperColour = (p: Paper | undefined) => (p === "chalk" ? "#1f3d2b" : p === "dark" ? "#0B1220" : "#ffffff");

// Watch a saved board being written again, step by step.
export default function Replay({ pages, papers, bgs, img, onClose }: {
  pages: Stroke[][]; papers: Paper[]; bgs: (string | null)[]; img: ImageSource; onClose: () => void;
}) {
  const events = useMemo(() => buildTimeline(pages), [pages]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(events.length > 0);
  const [speed, setSpeed] = useState(1);
  const [grow, setGrow] = useState(1); // how much of the newest freehand stroke is drawn
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = frameAt(events, step);

  // Playback: wait (real gaps, squeezed), then add the next item, drawing pen strokes bit by bit.
  useEffect(() => {
    if (!playing) return;
    if (step >= events.length) { setPlaying(false); return; }
    let raf = 0;
    const t = setTimeout(() => {
      const next = events[step].item;
      setStep(step + 1);
      if (!isFreehand(next)) { setGrow(1); return; }
      const start = performance.now(), dur = Math.min(900, 120 + next.pts.length * 4) / speed;
      const tick = (now: number) => { const f = Math.min(1, (now - start) / dur); setGrow(f); if (f < 1) raf = requestAnimationFrame(tick); };
      setGrow(0); raf = requestAnimationFrame(tick);
    }, delayBefore(events, step, speed));
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [playing, step, speed, events]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const items = frame.items.map((s, i) => (i === frame.items.length - 1 && playing ? partial(s, grow) : s));
    drawStrokes(c.getContext("2d")!, items, c.width, c.height, img);
  });

  const scrub = (n: number) => { setPlaying(false); setGrow(1); setStep(n); };
  return (
    <div role="dialog" aria-modal="true" aria-label="Board replay" className="fixed inset-0 z-[97] flex items-center justify-center bg-black/75 p-3">
      <div className="flex w-full max-w-5xl flex-col gap-2 rounded-2xl bg-[#0B1220] p-3 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black">Board replay <span className="font-bold text-white/50">· page {frame.page + 1} of {pages.length}</span></p>
          <button type="button" onClick={onClose} aria-label="Close replay" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><BoardIcon name="close" /></button>
        </div>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}`, background: paperColour(papers[frame.page]) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {bgs[frame.page] && <img src={bgs[frame.page]!} alt="" className="absolute inset-0 h-full w-full object-contain" />}
          <canvas ref={canvas} width={BOARD_W} height={BOARD_H} className="absolute inset-0 h-full w-full" aria-label={`Step ${step} of ${events.length}`} role="img" />
          {!events.length && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink/50">Nothing was written on this board.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { if (step >= events.length) setStep(0); setPlaying((p) => !p); }} disabled={!events.length}
            aria-label={playing ? "Pause" : "Play"} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1657C9] disabled:opacity-40">
            <BoardIcon name={playing ? "pause" : "play"} />
          </button>
          <input type="range" min={0} max={events.length} value={step} onChange={(e) => scrub(Number(e.target.value))} aria-label="Replay position" className="min-w-[160px] flex-1 accent-[#38BDF8]" />
          <span className="w-16 text-right text-xs font-black tabular-nums text-white/70">{step}/{events.length}</span>
          <div className="flex gap-1" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button key={s} type="button" onClick={() => setSpeed(s)} aria-pressed={speed === s}
                className={`h-8 rounded-lg px-2 text-xs font-black ${speed === s ? "bg-white text-ink" : "bg-white/10 hover:bg-white/20"}`}>{s}×</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
