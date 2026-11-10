"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import { QUICK_LINKS, cleanWebShare, hostOf, webAddress, wikiSearch, type FrameVerdict, type WebShare } from "@/lib/webView";

// The web browser on the board (lib/webView.ts). The teacher opens a web page
// inside the class, covering the whole screen, and can put the same page on
// every learner's screen. Learners can't type addresses: they only get the
// page the teacher shows. Pages open in a sandboxed frame, so a page can't
// take over the class's own screen.
//
// Message: "web-share" (teacher → all, signed, re-sent every few seconds).

// The teacher's frame may open new tabs; a learner's may not (they stay on the page they were given).
const SANDBOX_TEACHER = "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads";
const SANDBOX_LEARNER = "allow-scripts allow-same-origin allow-forms";

export default function WebBrowser({ sessionId, host, live, open, onOpen, onClose, keep }: {
  sessionId?: string; host: boolean; live: boolean; open: boolean; onOpen: () => void; onClose: () => void; keep?: KeepStore;
}) {
  const k = (n: string) => `web:${n}`;
  const [url, setUrl] = useKeptState<string | null>(keep, k("url"), null);         // the page that's open
  const [typed, setTyped] = useKeptState(keep, k("typed"), "");
  const [trail, setTrail] = useKeptState<string[]>(keep, k("trail"), []);          // pages opened from the address bar, in order
  const [verdict, setVerdict] = useKeptState<FrameVerdict | "checking">(keep, k("verdict"), "unknown");
  const [sharing, setSharing] = useKeptState(keep, k("sharing"), false);           // teacher: learners see it too
  const [share, setShare] = useKeptState<WebShare | null>(keep, k("share"), null); // what the class sees
  const shareRef = useRef(share); shareRef.current = share;
  const [hidden, setHidden] = useKeptState<string | null>(keep, k("hidden"), null); // learner: back on the board for this page
  const [err, setErr] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const check = useRef(0);
  const scale = useClassScale();
  const selfHost = typeof window === "undefined" ? "" : window.location.hostname;

  const send = useLive({
    "web-share": (p) => {
      if (host || !p?.host) return;
      const s = cleanWebShare(p.share);
      setShare(s && s.open && webAddress(s.url, selfHost) ? s : null);
    },
  });

  // Teacher: what the class sees follows the page that's open (only a page that can be shown).
  useEffect(() => {
    if (!host) return;
    const want = sharing && url && verdict !== "blocked" && verdict !== "checking" ? url : null;
    setShare((cur) => (want ? (cur?.url === want && cur.open ? cur : { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, url: want, open: true })
      : cur && cur.open ? { ...cur, open: false } : cur));
  }, [host, sharing, url, verdict, setShare]);
  useEffect(() => {
    if (!host || !live || !share) return;
    send("web-share", { host: true, share });
    if (!share.open) return;
    const t = setInterval(() => send("web-share", { host: true, share: shareRef.current }), 4000 * scale);
    return () => clearInterval(t);
  }, [host, live, share, send, scale]);

  // Esc hides the browser (and never reaches the board behind it).
  const showing = host ? open : !!share && hidden !== share.id;
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (host) onClose(); else if (share) setHidden(share.id);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showing, host, onClose, share, setHidden]);

  async function go(to: string, record = true) {
    setErr(null); setUrl(to); setTyped(to); setReload((n) => n + 1);
    if (record) setTrail((cur) => [...cur.filter((x) => x !== to), to].slice(-30));
    // Ask whether the site lets itself be shown inside the class.
    const mine = ++check.current;
    setVerdict("checking");
    let v: FrameVerdict = "unknown";
    try {
      const r = await fetch("/api/board/frame-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, url: to }), signal: AbortSignal.timeout(9000) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && (j.verdict === "ok" || j.verdict === "blocked")) v = j.verdict;
    } catch { /* can't tell: show it and let the teacher judge */ }
    if (mine === check.current) setVerdict(v);
  }
  function submit() {
    const t = typed.trim();
    if (!t) return;
    const to = webAddress(t, selfHost);
    if (to) return void go(to);
    const scheme = /^[a-z][a-z0-9+.-]*:/i.test(t); // javascript:, data:, file:… are never looked up or opened
    if (!scheme && (/\s/.test(t) || !t.includes("."))) return void go(wikiSearch(t)); // words, not an address: look them up
    setErr("That isn't a web address we can open here. Use a full address like desmos.com.");
  }
  const at = url ? trail.indexOf(url) : -1;

  // ── Learner: the page the teacher is showing ──
  if (!host) {
    if (!share) return null;
    if (hidden === share.id) {
      return <button type="button" onClick={() => setHidden(null)} className="fixed left-1/2 top-2 z-[96] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1220] px-4 py-2.5 text-sm font-black text-white shadow-2xl ring-1 ring-white/20">🌐 <span className="truncate">Open {hostOf(share.url)}</span></button>;
    }
    return (
      <div role="dialog" aria-label="Web page from your teacher" data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#060B16] text-white">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-sm font-black">🌐 {hostOf(share.url)} <span className="font-semibold text-white/50">· from your teacher</span></p>
          <button type="button" onClick={() => setHidden(share.id)} className="min-h-[40px] shrink-0 rounded-xl bg-white px-3 text-xs font-black text-[#0B1220]">Back to the class board</button>
        </div>
        <iframe key={share.id} title="Web page from your teacher" src={share.url} sandbox={SANDBOX_LEARNER} referrerPolicy="no-referrer" className="min-h-0 w-full flex-1 border-0 bg-white" />
      </div>
    );
  }

  // ── Teacher ──
  if (!open) {
    if (!url) return null;
    // Still open (and still on learners' screens, if shared): a small bar to go back to it, or close it.
    return (
      <div className="fixed left-1/2 top-14 z-[95] flex max-w-[92vw] -translate-x-1/2 items-center gap-1 rounded-full bg-[#0B1220] p-1 text-white shadow-2xl ring-1 ring-white/20">
        <button type="button" onClick={onOpen} className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-full px-3 text-sm font-black hover:bg-white/10">🌐 <span className="truncate">{hostOf(url)}{share?.open ? " · learners see it" : ""}</span></button>
        <button type="button" onClick={() => { setUrl(null); setSharing(false); }} aria-label="Close the web page" className="flex h-10 shrink-0 items-center rounded-full bg-white/10 px-3 text-xs font-black hover:bg-red-500/80">✕ Close</button>
      </div>
    );
  }
  const chip = "flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-black disabled:opacity-40";
  return (
    <div role="dialog" aria-modal="true" aria-label="Web browser" data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#060B16] text-white">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1.5">
        <button type="button" onClick={() => at > 0 && go(trail[at - 1], false)} disabled={at <= 0} aria-label="Previous page" title="The page you opened before this one" className={`${chip} w-10 bg-white/10 px-0 hover:bg-white/15`}>←</button>
        <button type="button" onClick={() => at >= 0 && at < trail.length - 1 && go(trail[at + 1], false)} disabled={at < 0 || at >= trail.length - 1} aria-label="Next page" className={`${chip} hidden w-10 bg-white/10 px-0 hover:bg-white/15 sm:flex`}>→</button>
        <button type="button" onClick={() => url && go(url, false)} disabled={!url} aria-label="Reload" title="Load the page again" className={`${chip} w-10 bg-white/10 px-0 hover:bg-white/15`}>↻</button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Web address</span>
          <input value={typed} onChange={(e) => { setTyped(e.target.value); setErr(null); }} onFocus={(e) => e.target.select()} placeholder="Type a web address — or a word to look up" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
            className="h-10 w-full rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]" />
        </label>
        <button type="submit" disabled={!typed.trim()} className={`${chip} bg-[#38BDF8] text-[#0B1220]`}>Go</button>
        {live && url && (
          <label className={`${chip} hidden bg-white/5 sm:flex`} title="Open this page on every learner's screen">
            <input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} className="h-4 w-4 accent-[#38BDF8]" /> Show to learners
          </label>
        )}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`${chip} hidden bg-white/10 hover:bg-white/15 md:flex`} title="Open this page in a new browser tab">New tab ↗</a>}
        <button type="button" onClick={onClose} title="Back to the board — the page stays open" aria-label="Hide the web browser" className={`${chip} bg-white/10 hover:bg-white/15`}>Hide</button>
        <button type="button" onClick={() => { setUrl(null); setSharing(false); setTyped(""); onClose(); }} aria-label="Close the web browser" className={`${chip} bg-red-500/90 hover:bg-red-500`}>✕</button>
      </form>
      {live && url && (
        <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5 sm:hidden">
          <label className={`${chip} bg-white/5`}><input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} className="h-4 w-4 accent-[#38BDF8]" /> Show to learners</label>
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${chip} bg-white/10`}>New tab ↗</a>
        </div>
      )}
      {err && <p role="alert" className="bg-amber-400 px-4 py-2 text-sm font-bold text-amber-950">{err}</p>}
      {sharing && share?.open && <p role="status" className="bg-[#38BDF8]/15 px-4 py-1.5 text-xs font-bold text-[#BAE6FD]">Learners have this page on their screens. Each learner scrolls and taps it on their own.</p>}
      {!url ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl">
            <p className="text-lg font-black">Open a web page in your class</p>
            <p className="mt-1 text-sm text-white/60">Type an address above, or start from one of these. The page fills the screen, and you can show it on every learner&apos;s screen.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINKS.map((q) => (
                <li key={q.url}>
                  <button type="button" onClick={() => go(q.url)} className="flex h-full w-full flex-col rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/15 transition hover:bg-white/10 hover:ring-white/40">
                    <span className="text-base font-black">{q.label}</span>
                    <span className="text-xs text-white/55">{q.hint}</span>
                    <span className="mt-1 truncate text-[11px] font-bold text-[#7DD3FC]">{hostOf(q.url)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-white/45">Some sites (Google, YouTube pages, banks, social networks) don&apos;t allow themselves to be shown inside another page — you&apos;ll get a button to open those in a new tab. For YouTube, use &quot;Watch a video together&quot;.</p>
          </div>
        </div>
      ) : verdict === "blocked" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="status">
          <span className="text-5xl" aria-hidden>🚫</span>
          <p className="text-xl font-black">{hostOf(url)} doesn&apos;t allow itself to be shown inside another page</p>
          <p className="max-w-md text-sm text-white/60">That&apos;s the site&apos;s own rule, so it can&apos;t be opened here or put on learners&apos; screens. You can open it in a new tab and share your screen instead.</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#38BDF8] px-5 py-3 text-sm font-black text-[#0B1220]">Open {hostOf(url)} in a new tab ↗</a>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1 bg-white">
          <iframe key={`${url}#${reload}`} title={`Web page: ${hostOf(url)}`} src={url} sandbox={SANDBOX_TEACHER} referrerPolicy="no-referrer" allow="fullscreen" className="absolute inset-0 h-full w-full border-0" />
          {verdict === "unknown" && <p role="status" className="pointer-events-none absolute bottom-2 left-1/2 max-w-[92%] -translate-x-1/2 rounded-full bg-[#0B1220]/85 px-4 py-1.5 text-center text-xs font-bold text-white">If the page stays blank, the site doesn&apos;t allow this — use &quot;New tab&quot;.</p>}
        </div>
      )}
    </div>
  );
}
