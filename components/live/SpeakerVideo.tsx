"use client";
import { useEffect, useRef, useState } from "react";

// The speaker's camera, as a small window in a corner of the board. It can be
// moved to another corner or hidden; this device remembers which.
const CORNERS = ["bottom-right", "bottom-left", "top-left", "top-right"] as const;
type Corner = (typeof CORNERS)[number];
const PLACE: Record<Corner, string> = {
  "bottom-right": "bottom-2 right-2", "bottom-left": "bottom-2 left-2", "top-left": "top-2 left-2", "top-right": "top-2 right-2",
};
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

export default function SpeakerVideo({ stream, label, mirror = false }: { stream: MediaStream | null; label: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const c = read("board-video-corner");
    if (c && (CORNERS as readonly string[]).includes(c)) setCorner(c as Corner);
    setHidden(read("board-video-hidden") === "1");
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v || v.srcObject === stream) return;
    v.srcObject = stream;
    v.play().catch(() => {});
  }, [stream, hidden]);
  if (!stream) return null;

  const move = () => { const next = CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length]; setCorner(next); write("board-video-corner", next); };
  const hide = (h: boolean) => { setHidden(h); write("board-video-hidden", h ? "1" : "0"); };
  const tiny = "flex h-7 min-w-7 items-center justify-center rounded-lg bg-black/55 px-1.5 text-xs font-bold text-white hover:bg-black/75";

  if (hidden) {
    return (
      <button type="button" onClick={() => hide(false)} className={`absolute z-20 ${PLACE[corner]} rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white shadow-lg`} aria-label={`Show ${label}'s video`}>
        <span aria-hidden>📷</span> {label}
      </button>
    );
  }
  return (
    <figure className={`absolute z-20 ${PLACE[corner]} w-[30%] min-w-[128px] max-w-[280px] overflow-hidden rounded-xl bg-black shadow-xl ring-2 ring-white/80`}>
      <video ref={ref} autoPlay playsInline muted aria-label={`Video of ${label}`} className={`block aspect-video w-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
      <figcaption className="pointer-events-none absolute bottom-1 left-1.5 max-w-[60%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-bold text-white">{label}</figcaption>
      <div className="absolute right-1 top-1 flex gap-1">
        <button type="button" onClick={move} className={tiny} aria-label="Move the video to another corner" title="Move to another corner">⤢</button>
        <button type="button" onClick={() => hide(true)} className={tiny} aria-label="Hide the video" title="Hide the video">✕</button>
      </div>
    </figure>
  );
}
