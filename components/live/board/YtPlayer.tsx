"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { embedUrl } from "@/lib/classExtras";

// A YouTube player driven without loading YouTube's script: the embedded
// player takes commands and reports its state over postMessage (the protocol
// YouTube's own iframe API uses). Used to watch a video together
// (components/live/board/WatchTogether.tsx).
export type YtInfo = { ready: boolean; state: number; pos: number; at: number }; // state: 1 playing, 2 paused, 3 buffering, 0 ended
export type YtHandle = { play: () => void; pause: () => void; seek: (seconds: number) => void; info: () => YtInfo & { playing: boolean } };
const ORIGIN = "https://www.youtube-nocookie.com";

const YtPlayer = forwardRef<YtHandle, { video: string; title: string; onInfo?: (i: YtInfo & { playing: boolean }) => void }>(function YtPlayer({ video, title, onInfo }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const info = useRef<YtInfo>({ ready: false, state: -1, pos: 0, at: Date.now() });
  const cb = useRef(onInfo); cb.current = onInfo;
  const say = (msg: object) => frame.current?.contentWindow?.postMessage(JSON.stringify({ ...msg, id: "dmaths", channel: "widget" }), ORIGIN);
  const command = (func: string, args: unknown[] = []) => say({ event: "command", func, args });
  // Where the player is now: it reports a few times a second, so run the clock on between reports.
  const now = () => {
    const i = info.current, playing = i.state === 1;
    return { ...i, playing, pos: playing ? i.pos + (Date.now() - i.at) / 1000 : i.pos };
  };
  useImperativeHandle(ref, () => ({ play: () => command("playVideo"), pause: () => command("pauseVideo"), seek: (s) => command("seekTo", [Math.max(0, s), true]), info: now }));

  useEffect(() => {
    info.current = { ready: false, state: -1, pos: 0, at: Date.now() };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.origin !== ORIGIN) return;
      let d: any = e.data;
      if (typeof d === "string") { try { d = JSON.parse(d); } catch { return; } }
      if (!d || typeof d !== "object") return;
      const i = info.current;
      if (!i.ready) { i.ready = true; command("addEventListener", ["onStateChange"]); }
      if (d.event === "onStateChange" && typeof d.info === "number") { i.state = d.info; i.at = Date.now(); }
      if ((d.event === "infoDelivery" || d.event === "initialDelivery") && d.info && typeof d.info === "object") {
        if (typeof d.info.playerState === "number") i.state = d.info.playerState;
        if (typeof d.info.currentTime === "number") { i.pos = d.info.currentTime; i.at = Date.now(); }
      }
      cb.current?.(now());
    };
    window.addEventListener("message", onMessage);
    // Ask the player to start reporting (until it answers).
    const t = setInterval(() => { if (!info.current.ready) say({ event: "listening" }); }, 500);
    return () => { window.removeEventListener("message", onMessage); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video]);

  return (
    <iframe ref={frame} key={video} title={title} src={embedUrl(video, typeof window === "undefined" ? "" : window.location.origin, true)}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
      className="block h-full w-full border-0 bg-black" />
  );
});
export default YtPlayer;
