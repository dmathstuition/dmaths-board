"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { EXPERIMENTS } from "@/components/lab/experimentRegistry";
import { LAB, SUBJECTS, type LabEntry, type LabSubject } from "@/lib/lab/catalog";
import { BOARD_H, BOARD_W } from "@/lib/whiteboard";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";

// The E-Laboratory on the board. The teacher picks an experiment and works it
// live; "Put on the board" turns what it shows into a board page, so the
// teacher — and any learner allowed to write — can annotate it with the usual
// tools (it's saved and replayed like a slide). "Let learners try it" opens the
// same experiment on every learner's own device to explore.
//
// Message: "lab-open" (teacher → all, signed): { slug } or { slug: null },
// re-sent every few seconds while open so late joiners catch up.

export const BOARD_LAB: LabEntry[] = LAB.filter((e) => e.status !== "soon" && e.slug in EXPERIMENTS);
const entryFor = (slug: string | null) => BOARD_LAB.find((e) => e.slug === slug) ?? null;

// Draw the experiment's screen (or just its apparatus) as one board-sized picture.
async function snapshot(node: HTMLElement, title: string): Promise<File> {
  const { toCanvas } = await import("html-to-image");
  let shot: HTMLCanvasElement | null = null;
  try {
    shot = await toCanvas(node, {
      pixelRatio: Math.min(2, Math.max(1, BOARD_W / Math.max(1, node.offsetWidth))),
      backgroundColor: "#0B1220", skipFonts: true, cacheBust: false,
      // Leave the controls out: the board page shows the experiment, not its buttons.
      filter: (el) => !(el instanceof HTMLElement && (el.dataset.snapSkip !== undefined || el.tagName === "BUTTON" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "range"))),
    });
    shot.getContext("2d")!.getImageData(0, 0, 1, 1); // throws if the browser marked it unreadable
  } catch {
    shot = await svgOnly(node); // some browsers can't draw page content: use the drawings alone
  }
  const out = document.createElement("canvas");
  out.width = BOARD_W; out.height = BOARD_H;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#0B1220"; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "600 26px system-ui, sans-serif"; ctx.textBaseline = "top";
  ctx.fillText(`🧪 ${title}`, 28, 18);
  const top = 60, room = { w: BOARD_W - 40, h: BOARD_H - top - 20 };
  const k = Math.min(room.w / shot.width, room.h / shot.height);
  const w = shot.width * k, h = shot.height * k;
  ctx.drawImage(shot, (BOARD_W - w) / 2, top + (room.h - h) / 2, w, h);
  const blob = await new Promise<Blob>((ok, no) => out.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't make the picture"))), "image/jpeg", 0.88));
  return new File([blob], `${title}.jpg`, { type: "image/jpeg" });
}

// Fallback: the experiment's SVG drawings (apparatus, graphs), side by side.
async function svgOnly(node: HTMLElement): Promise<HTMLCanvasElement> {
  const svgs = [...node.querySelectorAll("svg")].filter((s) => s.getBoundingClientRect().width > 120);
  if (!svgs.length) throw new Error("Nothing to put on the board yet");
  const imgs = await Promise.all(svgs.slice(0, 4).map(async (s) => {
    const r = s.getBoundingClientRect();
    const copy = s.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", String(Math.round(r.width))); copy.setAttribute("height", String(Math.round(r.height)));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error("drawing")); img.src = url; });
    return { img, w: r.width, h: r.height, url };
  }));
  const gap = 16, W = imgs.reduce((a, i) => a + i.w, 0) + gap * (imgs.length - 1), H = Math.max(...imgs.map((i) => i.h));
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!; ctx.fillStyle = "#0B1220"; ctx.fillRect(0, 0, W, H);
  let x = 0;
  for (const i of imgs) { ctx.drawImage(i.img, x, (H - i.h) / 2, i.w, i.h); x += i.w + gap; URL.revokeObjectURL(i.url); }
  return c;
}

export default function LabPanel({ host, open, onOpen, onClose, onSnapshot, live, keep }: {
  host: boolean; open: boolean; onOpen: () => void; onClose: () => void;
  onSnapshot: (file: File) => Promise<void>; live: boolean; // live: in a class (not preparing a lesson)
  keep?: KeepStore; // the board's store: an open experiment survives going in or out of full screen
}) {
  const [slug, setSlug] = useKeptState<string | null>(keep, "lab:slug", null);
  const [shared, setShared] = useKeptState(keep, "lab:shared", false);     // teacher: learners may try it
  const [theirs, setTheirs] = useKeptState<string | null>(keep, "lab:theirs", null); // learner: what the teacher opened
  const [hidden, setHidden] = useKeptState(keep, "lab:hidden", false);     // learner: back on the class board
  const theirsRef = useKeptRef<string | null>(keep, "lab:theirs", null);
  const [busy, setBusy] = useState<string | null>(null);
  const [subject, setSubject] = useKeptState<LabSubject | "all">(keep, "lab:subject", "all");
  const [q, setQ] = useKeptState(keep, "lab:q", "");
  const stage = useRef<HTMLDivElement>(null);
  // Experiments are laid out for a laptop screen; on a short or small screen
  // they're scaled down to fit (the teacher can zoom in and out).
  const [zoom, setZoom] = useKeptState<number | null>(keep, "lab:zoom", null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const on = () => setFit(Math.max(0.5, Math.min(1, window.innerHeight / 860, window.innerWidth / 1150)));
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const [shooting, setShooting] = useState(false); // full size while a picture is taken
  const scale = shooting ? 1 : (zoom ?? fit);
  const sharedRef = useRef({ slug, shared }); sharedRef.current = { slug, shared };

  const send = useLive({
    "lab-open": (p) => {
      if (host || !p?.host) return;
      const s = typeof p.slug === "string" && entryFor(p.slug) ? p.slug : null;
      if (s && s !== theirsRef.current) setHidden(false);
      theirsRef.current = s; setTheirs(s);
    },
  });
  // Teacher: keep learners in step while they're trying it.
  useEffect(() => {
    if (!host || !live) return;
    const tell = () => send("lab-open", { host: true, slug: sharedRef.current.shared ? sharedRef.current.slug : null });
    tell();
    if (!shared) return;
    const t = setInterval(tell, 4000);
    return () => clearInterval(t);
  }, [host, live, shared, slug, send]);

  const list = useMemo(() => BOARD_LAB.filter((e) =>
    (subject === "all" || e.subject === subject) &&
    (!q.trim() || `${e.title} ${e.blurb}`.toLowerCase().includes(q.trim().toLowerCase()))), [subject, q]);

  async function put(what: "apparatus" | "all") {
    const root = stage.current, entry = entryFor(slug);
    if (!root || !entry) return;
    const panels = [...root.querySelectorAll<HTMLElement>(".elab-panel")];
    const node = what === "apparatus" ? (panels.find((p) => p.querySelector("svg")) ?? panels[0] ?? root) : root;
    setBusy(what === "apparatus" ? "Taking a picture of the apparatus…" : "Taking a picture of the experiment…");
    setShooting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let it draw at full size
      const file = await snapshot(node, entry.title);
      setShooting(false);
      await onSnapshot(file);
      setBusy(null); onClose();
    } catch (e) {
      setShooting(false);
      setBusy(`Couldn't put it on the board (${e instanceof Error ? e.message : e}) — try again.`);
    }
  }
  function end() { setSlug(null); setShared(false); setBusy(null); onClose(); }

  // Esc hides the lab (and never reaches the board behind it).
  const showing = host ? open : !!theirs && !hidden;
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (host) onClose(); else setHidden(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [showing, host, onClose, setHidden]);

  // ── Learner: the experiment the teacher opened, to try on their own ──
  if (!host) {
    const entry = entryFor(theirs);
    if (!entry) return null;
    const Experiment = EXPERIMENTS[entry.slug];
    if (hidden) {
      return (
        <button type="button" onClick={() => setHidden(false)} className="fixed left-1/2 top-2 z-[96] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1220] px-4 py-2.5 text-sm font-black text-white shadow-2xl ring-1 ring-white/20">
          <BoardIcon name="flask" /> <span className="truncate">Try {entry.title}</span>
        </button>
      );
    }
    return (
      <div role="dialog" aria-label={`Experiment: ${entry.title}`} data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#060B16]">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-white">
          <span className="text-xl" aria-hidden>{entry.emoji}</span>
          <p className="min-w-0 flex-1 truncate text-sm font-black">{entry.title} <span className="font-semibold text-white/50">· try it yourself</span></p>
          <ZoomButtons scale={scale} onZoom={setZoom} />
          <button type="button" onClick={() => setHidden(true)} className="min-h-[40px] shrink-0 rounded-xl bg-white px-3 text-xs font-black text-[#0B1220]">Back to the class board</button>
        </div>
        <div className="elab min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          <div className="mx-auto max-w-6xl" style={{ zoom: scale }}><Experiment /></div>
        </div>
      </div>
    );
  }

  // ── Teacher ──
  if (!open) {
    if (!slug) return null;
    // The experiment keeps running while the teacher is on the board: a small
    // bar at the top to go back to it, or end it.
    return (
      <div className="fixed left-1/2 top-2 z-[95] flex max-w-[92vw] -translate-x-1/2 items-center gap-1 rounded-full bg-[#0B1220] p-1 text-white shadow-2xl ring-1 ring-white/20">
        <button type="button" onClick={onOpen} className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-full px-3 text-sm font-black hover:bg-white/10">
          <BoardIcon name="flask" /> <span className="truncate">{entryFor(slug)?.title ?? "Lab"}{shared ? " · learners trying it" : ""}</span>
        </button>
        <button type="button" onClick={end} aria-label="End the experiment" title="End the experiment"
          className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-black hover:bg-red-500/80"><BoardIcon name="close" className="h-4 w-4" /> End</button>
      </div>
    );
  }
  const entry = entryFor(slug);
  const Experiment = entry ? EXPERIMENTS[entry.slug] : null;
  const taking = !!busy && busy.startsWith("Taking");
  const chip = "flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-black disabled:opacity-60";
  return (
    <div role="dialog" aria-modal="true" aria-label="Laboratory" data-board-overlay className="fixed inset-0 z-[96] flex flex-col bg-[#060B16] text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5 sm:px-3">
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 sm:flex"><BoardIcon name="flask" /></span>
        <p className="min-w-0 flex-1 truncate text-sm font-black">{entry ? `${entry.emoji} ${entry.title}` : "Laboratory — choose an experiment"}</p>
        {entry && <ZoomButtons scale={scale} onZoom={setZoom} />}
        <button type="button" onClick={onClose} title="Hide — back to the board, the experiment keeps running" aria-label="Hide the lab"
          className={`${chip} bg-white/10 hover:bg-white/15`}><BoardIcon name="down" className="h-4 w-4" /><span className="hidden sm:inline">Hide</span></button>
        <button type="button" onClick={end} title={entry ? "End the experiment and close the lab" : "Close the lab"} aria-label={entry ? "End the experiment" : "Close the lab"}
          className={`${chip} bg-red-500/90 text-white hover:bg-red-500`}><BoardIcon name="close" className="h-4 w-4" />{entry ? "End" : "Close"}</button>
      </div>
      {entry && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 px-2 py-1.5 sm:px-3" role="toolbar" aria-label="Experiment actions">
          <button type="button" onClick={() => put("apparatus")} disabled={taking} className={`${chip} bg-[#38BDF8] text-[#0B1220]`}>Put the apparatus on the board</button>
          <button type="button" onClick={() => put("all")} disabled={taking} className={`${chip} bg-white/10 hover:bg-white/15`}>Put the whole screen on the board</button>
          {live && (
            <label className={`${chip} bg-white/5`}>
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 accent-[#38BDF8]" /> Let learners try it
            </label>
          )}
          <button type="button" onClick={() => { setSlug(null); setShared(false); }} className={`${chip} bg-white/5 hover:bg-white/10`}>Change experiment</button>
        </div>
      )}
      {busy && <p role="status" className="bg-[#38BDF8]/15 px-4 py-2 text-sm font-bold text-[#BAE6FD]">{busy}</p>}
      {!entry ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", ...Object.keys(SUBJECTS)] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSubject(s as LabSubject | "all")} aria-pressed={subject === s}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-black ${subject === s ? "bg-white text-[#0B1220]" : "bg-white/10 text-white/80"}`}>
                  {s === "all" ? "All" : SUBJECTS[s as LabSubject].label}
                </button>
              ))}
              <label className="ml-auto w-full sm:w-64">
                <span className="sr-only">Search experiments</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — e.g. pendulum" className="h-10 w-full rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]" />
              </label>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <li key={e.slug}>
                  <button type="button" onClick={() => setSlug(e.slug)} className="flex h-full w-full items-start gap-3 rounded-2xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition hover:bg-white/10">
                    <span className="text-2xl" aria-hidden>{e.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{e.title}</span>
                      <span className="block text-[11px] font-bold" style={{ color: SUBJECTS[e.subject].color }}>{SUBJECTS[e.subject].label} · {e.level}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-white/55">{e.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!list.length && <p className="mt-6 text-center text-sm text-white/50">No experiment matches that.</p>}
          </div>
        </div>
      ) : (
        <div className="elab min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          <div ref={stage} className="mx-auto max-w-6xl" style={{ zoom: scale }}>{Experiment && <Experiment />}</div>
        </div>
      )}
    </div>
  );
}

function ZoomButtons({ scale, onZoom }: { scale: number; onZoom: (z: number) => void }) {
  const b = "flex h-10 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center rounded-xl bg-white/5" role="group" aria-label="Experiment size">
      <button type="button" onClick={() => onZoom(Math.max(0.4, Math.round((scale - 0.1) * 10) / 10))} disabled={scale <= 0.4} aria-label="Smaller" className={b}><BoardIcon name="zoomout" className="h-4 w-4" /></button>
      <span className="w-10 text-center text-[11px] font-black tabular-nums text-white/70">{Math.round(scale * 100)}%</span>
      <button type="button" onClick={() => onZoom(Math.min(1.4, Math.round((scale + 0.1) * 10) / 10))} disabled={scale >= 1.4} aria-label="Bigger" className={b}><BoardIcon name="zoomin" className="h-4 w-4" /></button>
    </div>
  );
}
