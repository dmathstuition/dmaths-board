"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { serverNow, useServerClock } from "@/lib/serverClock";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import { changed, cleanWatch, expectedPos, follow, newWatch, videoId, type Watch } from "@/lib/classExtras";
import YtPlayer, { type YtHandle } from "@/components/live/board/YtPlayer";

// Watch a video together (lib/classExtras.ts). The teacher pastes a YouTube
// link; it opens on every learner's screen and follows the teacher's player:
// when the teacher plays, pauses or jumps, so does everyone's.
//
// Message: "watch" (teacher → all, signed, re-sent every few seconds).

export default function WatchTogether({ host, open, onOpen, onClose, keep }: {
  host: boolean; open: boolean; onOpen: () => void; onClose: () => void; keep?: KeepStore;
}) {
  useServerClock();
  const [watch, setWatch] = useKeptState<Watch | null>(keep, "wt:watch", null);
  const watchRef = useRef(watch); watchRef.current = watch;
  const [link, setLink] = useKeptState(keep, "wt:link", "");
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useKeptState<string | null>(keep, "wt:hidden", null); // learner: back on the board for this video
  const [stuck, setStuck] = useState(false); // learner: the browser wants a tap before it plays
  const player = useRef<YtHandle>(null);
  const settled = useRef(0);   // teacher: ignore the player until it has caught up after (re)opening
  const lastSeek = useRef(0);
  const waiting = useRef(0);
  const scale = useClassScale();

  const send = useLive({
    watch: (p) => {
      if (host || !p?.host) return;
      const w = cleanWatch(p.watch);
      setWatch(w && w.open ? w : null);
    },
  });

  // Teacher: keep it on every screen.
  useEffect(() => {
    if (!host || !watch) return;
    send("watch", { host: true, watch });
    const t = setInterval(() => send("watch", { host: true, watch: watchRef.current }), 4000 * scale);
    return () => clearInterval(t);
  }, [host, watch, send, scale]);

  // Teacher: the player leads. When it plays, pauses or jumps, tell the class.
  function onTeacherInfo(i: { ready: boolean; state: number; playing: boolean; pos: number }) {
    const w = watchRef.current;
    if (!w || !i.ready) return;
    if (!settled.current) { // just (re)opened, e.g. after going in or out of full screen: pick up where the class is
      settled.current = Date.now() + 1500;
      const at = expectedPos(w, serverNow());
      if (at > 1.5) player.current?.seek(at);
      if (w.playing) player.current?.play();
      return;
    }
    if (Date.now() < settled.current || i.state === 3 || i.state === -1) return; // still catching up / buffering
    const mine = { playing: i.state === 1, pos: i.pos };
    if (changed(w, mine, serverNow())) setWatch({ ...w, playing: mine.playing, pos: Math.round(mine.pos * 10) / 10, at: serverNow() });
  }

  // Learner: follow the teacher's player.
  useEffect(() => {
    if (host || !watch) { setStuck(false); return; }
    const step = () => {
      const w = watchRef.current, p = player.current;
      if (!w || !p) return;
      const i = p.info();
      if (!i.ready) return;
      const f = follow(w, { playing: i.state === 1 || i.state === 3, pos: i.pos }, serverNow());
      if (f.seek != null && Date.now() - lastSeek.current > 4000) { lastSeek.current = Date.now(); p.seek(f.seek); }
      if (f.play === true) p.play(); else if (f.play === false) p.pause();
      // Some phones only start a video after a tap on it.
      if (w.playing && i.state !== 1 && i.state !== 3) { waiting.current ||= Date.now(); if (Date.now() - waiting.current > 4000) setStuck(true); }
      else { waiting.current = 0; setStuck(false); }
    };
    step();
    const t = setInterval(step, 1500);
    return () => clearInterval(t);
  }, [host, watch]);

  function start() {
    const v = videoId(link);
    if (!v) return setErr("That doesn't look like a YouTube link. Paste the link from the video's Share button.");
    setErr(null); settled.current = Date.now(); // a new video starts at the beginning: nothing to catch up on
    setWatch(newWatch(v, serverNow()));
  }
  function end() {
    if (watch) send("watch", { host: true, watch: { ...watch, open: false, playing: false } });
    setWatch(null); settled.current = 0; onClose();
  }

  // ── Teacher ──
  if (host) {
    if (!watch) {
      if (!open) return null;
      return (
        <div role="dialog" aria-modal="true" aria-label="Watch a video together" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
            <div className="flex items-center gap-2 border-b border-line p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3F2] text-lg">🎬</span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black">Watch a video together</p>
                <p className="text-xs font-bold text-ink/55">It plays on every learner&apos;s screen, in step with yours</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); start(); }} className="grid gap-3 p-4">
              <label className="text-xs font-black text-ink/60">YouTube link
                <input value={link} onChange={(e) => { setLink(e.target.value); setErr(null); }} placeholder="https://youtu.be/…" inputMode="url" autoComplete="off"
                  className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
              </label>
              {err && <p role="alert" className="text-xs font-bold text-red-700">{err}</p>}
              <p className="text-xs text-ink/55">Video uses mobile data on learners&apos; phones — short clips are best. Learners can go back to the board at any time.</p>
              <button type="submit" disabled={!link.trim()} className="justify-self-start rounded-xl bg-[#0E6E72] px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">Show to the class</button>
            </form>
          </div>
        </div>
      );
    }
    // Showing a video: a window while it's open, a small player in the corner when hidden (it keeps playing).
    return (
      <div role="dialog" aria-label="Video for the class" aria-modal={open || undefined}
        className={open ? "fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3" : "fixed bottom-4 right-4 z-[95] w-72 max-w-[80vw]"}>
        <div className={`w-full overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ${open ? "max-w-3xl" : ""}`}>
          <div className="flex items-center gap-2 border-b border-line p-2">
            <p className="min-w-0 flex-1 truncate px-1 text-sm font-black">🎬 {watch.playing ? "Playing for the class" : "Paused for the class"}</p>
            {open ? <button type="button" onClick={onClose} className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-black text-ink/70" title="Back to the board — the video keeps playing">Hide</button>
              : <button type="button" onClick={onOpen} className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-black text-ink/70">Open</button>}
            <button type="button" onClick={end} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End</button>
          </div>
          <div className="aspect-video w-full bg-black"><YtPlayer ref={player} video={watch.video} title="Video for the class" onInfo={onTeacherInfo} /></div>
          {open && <p className="p-2 text-xs text-ink/55">Play, pause or jump on your video — every learner&apos;s video follows.</p>}
        </div>
      </div>
    );
  }

  // ── Learner ──
  if (!watch) return null;
  if (hidden === watch.id) {
    return <button type="button" onClick={() => setHidden(null)} className="fixed left-1/2 top-2 z-[96] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1220] px-4 py-2.5 text-sm font-black text-white shadow-2xl ring-1 ring-white/20">🎬 Watch the video</button>;
  }
  return (
    <div role="dialog" aria-label="Video from your teacher" data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#060B16] text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-black">🎬 Watching with your class <span className="font-semibold text-white/50">· {watch.playing ? "playing" : "paused by your teacher"}</span></p>
        <button type="button" onClick={() => setHidden(watch.id)} className="min-h-[40px] shrink-0 rounded-xl bg-white px-3 text-xs font-black text-[#0B1220]">Back to the class board</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-2 sm:p-4">
        <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black"><YtPlayer ref={player} video={watch.video} title="Video from your teacher" /></div>
        {stuck && <p role="status" className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-amber-950">Tap ▶ on the video to start it</p>}
      </div>
    </div>
  );
}
