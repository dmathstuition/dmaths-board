"use client";
import { useClassScale } from "@/lib/classScale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { EXPERIMENTS } from "@/components/lab/experimentRegistry";
import { LAB, SUBJECTS, type LabEntry, type LabSubject } from "@/lib/lab/catalog";
import { BOARD_H, BOARD_W } from "@/lib/whiteboard";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import PracticalThumb from "@/components/lab/bench/Thumb";
import { LabReportContext, type LabReport } from "@/components/lab/bench/labReport";
import LabTracker, { useNow } from "@/components/live/board/LabTracker";
import { START_EVENT } from "@/components/lab/room/LabRoom";
import { RoomClassContext, type RoomClass } from "@/components/lab/room/roomContext";
import PlansPanel from "@/components/lab/room/PlansPanel";
import { addPlan, cleanAssignment, cleanReply, cleanReport, type Assignment, type PlanReport, type Reply } from "@/lib/lab/room/planShare";
import { QUICK_HELP, cleanFrame, cleanMode, cleanNudge, cleanTask, type DemoFrame, type LabMode, type Nudge } from "@/lib/lab/demo";
import { addReport, cleanProgress, summary, type LabEntry as TrackEntry, type LabProgress } from "@/lib/lab/labTrack";

// The E-Laboratory on the board. The teacher picks an experiment and works it
// live; "Put on the board" turns what it shows into a board page, so the
// teacher — and any learner allowed to write — can annotate it with the usual
// tools (it's saved and replayed like a slide). "Let learners try it" opens the
// same experiment on every learner's own device to explore.
//
// A practical runs like a real lab lesson (lib/lab/demo.ts): "👀 Watch me" —
// the teacher does it and every learner sees the teacher's bench, live; then
// "✋ Their turn" — each learner does it on their own phone, with the task the
// teacher gave, while the teacher follows everyone's progress and observations
// and can send one learner a word of help.
//
// Messages: "lab-open" (teacher → all, signed): { slug, mode, task } or
// { slug: null }, re-sent every few seconds while open so late joiners catch
// up; "lab-demo" (teacher → all, signed): the teacher's bench while they show
// it; "lab-nudge" (teacher → all, signed, { to }): help for one learner; and
// "lab-progress" (learner → teacher): where a learner trying it is up to —
// step, readings, observations, wrong tries — for the teacher's live tracker.

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

export default function LabPanel({ host, open, onOpen, onClose, onSnapshot, live, keep, myId = "", myName }: {
  host: boolean; open: boolean; onOpen: () => void; onClose: () => void; myId?: string; myName?: string;
  onSnapshot: (file: File) => Promise<void>; live: boolean; // live: in a class (not preparing a lesson)
  keep?: KeepStore; // the board's store: an open experiment survives going in or out of full screen
}) {
  const [slug, setSlug] = useKeptState<string | null>(keep, "lab:slug", null);
  const [mode, setMode] = useKeptState<LabMode | null>(keep, "lab:mode", null); // teacher: learners watch, or try it themselves
  const shared = mode !== null;
  const setShared = useCallback((on: boolean) => setMode(on ? "try" : null), [setMode]);
  const [task, setTask] = useKeptState(keep, "lab:task", "");               // teacher: the task for their turn
  const [taskDraft, setTaskDraft] = useState(task);
  const [theirs, setTheirs] = useKeptState<string | null>(keep, "lab:theirs", null); // learner: what the teacher opened
  const [theirMode, setTheirMode] = useKeptState<LabMode>(keep, "lab:theirMode", "try"); // learner
  const [theirTask, setTheirTask] = useKeptState(keep, "lab:theirTask", "");            // learner
  const [hadTurn, setHadTurn] = useKeptState(keep, "lab:hadTurn", false);             // learner: their own bench has started
  const [frame, setFrame] = useState<DemoFrame | null>(null);                         // learner: the teacher's bench
  const [nudge, setNudge] = useState<Nudge | null>(null);                             // learner: help from the teacher
  const [nudges, setNudges] = useKeptState<Record<string, Nudge>>(keep, "lab:nudges", {}); // teacher: help sent
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
  const sharedRef = useRef({ slug, mode, task }); sharedRef.current = { slug, mode, task };

  const [track, setTrack] = useKeptState<Record<string, TrackEntry>>(keep, "lab:track", {}); // teacher: each learner's progress
  const [tracking, setTracking] = useKeptState(keep, "lab:tracking", false);           // teacher: looking at the tracker
  const [assign, setAssign] = useKeptState<Assignment | null>(keep, "lab:assign", null);          // teacher: the practical set
  const [plans, setPlans] = useKeptState<Record<string, PlanReport>>(keep, "lab:plans", {});    // teacher: plans handed in
  const [replies, setReplies] = useKeptState<Record<string, Reply>>(keep, "lab:replies", {});   // teacher: replies sent
  const [viewPlans, setViewPlans] = useKeptState(keep, "lab:viewPlans", false);
  const [assigned, setAssigned] = useKeptState<Assignment | null>(keep, "lab:assigned", null);   // learner: what was set
  const [handedIn, setHandedIn] = useKeptState<number | null>(keep, "lab:handedIn", null);       // learner
  const [myReply, setMyReply] = useKeptState<Reply | null>(keep, "lab:reply", null);             // learner
  const send = useLive({
    "lab-open": (p) => {
      if (host || !p?.host) return;
      const s = typeof p.slug === "string" && entryFor(p.slug) ? p.slug : null;
      if (s && s !== theirsRef.current) { setHidden(false); setHadTurn(false); setFrame(null); }
      const m = cleanMode(p.mode);
      if (s && m === "try") setHadTurn(true);
      theirsRef.current = s; setTheirs(s); setTheirMode(m); setTheirTask(cleanTask(p.task));
    },
    "lab-demo": (p) => { if (host || !p?.host) return; const f = cleanFrame(p); if (f) setFrame(f); },
    "lab-nudge": (p) => { if (host || !p?.host) return; const n = cleanNudge(p); if (n && n.to === myId) setNudge(n); },
    "lab-progress": (p) => { if (host) setTrack((m) => addReport(m, cleanProgress(p), Date.now())); },
    // Lab rooms: the practical set for the class, plans handed in, and replies.
    "lab-assign": (p) => { if (host || !p?.host) return; const a = cleanAssignment(p.assign); setAssigned((cur) => (JSON.stringify(cur) === JSON.stringify(a) ? cur : a)); },
    "lab-plan": (p) => { if (host) setPlans((m) => addPlan(m, cleanReport(p))); },
    "lab-plan-reply": (p) => { if (host || !p?.host) return; const r = cleanReply(p); if (r && r.to === myId) setMyReply(r); },
  });
  // Teacher: keep learners in step while they're trying it.
  const repeat = useClassScale(); // big classes: repeat less (lib/classScale)

  // Learner: tell the teacher where I'm up to — at once when something
  // changes (at most every couple of seconds), and now and then otherwise.
  const mine = useRef<{ v: number; last: number; key: string; timer: ReturnType<typeof setTimeout> | null; p: LabProgress | null }>({ v: 0, last: 0, key: "", timer: null, p: null });
  const reportCtx = useMemo<LabReport>(() => ({
    name: myName, learner: !host,
    report: host || !live || !myId ? undefined : (prog) => {
      const m = mine.current, key = JSON.stringify({ ...prog, onStep: 0 }), now = Date.now();
      m.p = prog;
      const go = () => { m.timer = null; m.last = Date.now(); m.key = JSON.stringify({ ...m.p, onStep: 0 }); send("lab-progress", { ...m.p, by: myId, name: myName, v: ++m.v }); };
      if (key === m.key && now - m.last < 10_000 * repeat) return; // nothing new: the regular update will do
      if (now - m.last >= 2000 * repeat) return go();
      if (!m.timer) m.timer = setTimeout(go, 2000 * repeat - (now - m.last));
    },
  }), [host, live, myId, myName, send, repeat]);
  useEffect(() => () => { if (mine.current.timer) clearTimeout(mine.current.timer); }, []);
  const now = useNow(5000);
  const trackList = useMemo(() => Object.values(track).filter((e) => e.slug === slug), [track, slug]);
  const quiet = 30_000 * repeat;
  const trackSum = summary(trackList, now, quiet);
  useEffect(() => {
    if (!host || !live) return;
    const r = sharedRef.current;
    const tell = () => send("lab-open", { host: true, slug: r.mode ? r.slug : null, mode: r.mode ?? "try", task: r.mode === "try" ? r.task : "" });
    tell();
    if (!mode) return;
    const t = setInterval(tell, 4000 * repeat);
    return () => clearInterval(t);
  }, [host, live, mode, task, slug, send, repeat]);

  // Teacher showing the class: their bench goes out a few times a second at
  // most, and again now and then so a phone that joins late catches up.
  const demoOut = useRef<{ last: number; timer: ReturnType<typeof setTimeout> | null; f: DemoFrame | null }>({ last: 0, timer: null, f: null });
  const sendDemo = useCallback((f: DemoFrame) => {
    const d = demoOut.current, gap = 250 * repeat;
    d.f = f;
    const go = () => { d.timer = null; d.last = Date.now(); if (d.f) send("lab-demo", { host: true, ...d.f }); };
    if (Date.now() - d.last >= gap) go(); else if (!d.timer) d.timer = setTimeout(go, gap - (Date.now() - d.last));
  }, [send, repeat]);
  useEffect(() => {
    if (!host || !live || mode !== "watch") return;
    const t = setInterval(() => { const d = demoOut.current; if (d.f) send("lab-demo", { host: true, ...d.f }); }, 3000 * repeat);
    return () => clearInterval(t);
  }, [host, live, mode, send, repeat]);
  useEffect(() => () => { if (demoOut.current.timer) clearTimeout(demoOut.current.timer); }, []);
  const teacherCtx = useMemo<LabReport>(() => ({ demo: mode === "watch" && live ? sendDemo : undefined }), [mode, live, sendDemo]);
  const help = (to: string, text: string) => { const n = { to, text, at: Date.now() }; send("lab-nudge", { host: true, ...n }); setNudges((m) => ({ ...m, [to]: n })); };

  // Teacher: the practical set for the class goes out now and then (phones that join late see it).
  useEffect(() => {
    if (!host || !live) return;
    const tell = () => send("lab-assign", { host: true, assign });
    tell();
    if (!assign) return;
    const t = setInterval(tell, 5000 * repeat);
    return () => clearInterval(t);
  }, [host, live, assign, send, repeat]);
  const planSeq = useRef(0);
  const roomClass: RoomClass = host
    ? { host: true, live, assignment: assign, setAssignment: (a) => { setAssign(a); if (a) { if (entryFor(`room-${a.subject}`)) setSlug(`room-${a.subject}`); setShared(true); } } }
    : { host: false, live, assignment: assigned, handedIn, reply: myReply, handIn: live && myId ? (r) => { send("lab-plan", { ...r, by: myId, name: myName, v: ++planSeq.current, at: Date.now() }); setHandedIn(Date.now()); } : undefined };
  const reply = (to: string, text: string, ok: boolean) => { const r = { to, text, ok, at: Date.now() }; send("lab-plan-reply", { host: true, ...r }); setReplies((m) => ({ ...m, [to]: r })); };
  const list = useMemo(() => BOARD_LAB.filter((e) =>
    (subject === "all" || e.subject === subject) &&
    (!q.trim() || `${e.title} ${e.blurb}`.toLowerCase().includes(q.trim().toLowerCase()))), [subject, q]);
  // The bench practicals come first, as big cards with a picture of the bench.
  const practicals = list.filter((e) => e.practical);
  const rooms = list.filter((e) => e.room);
  const others = list.filter((e) => !e.practical && !e.room);
  // A practical planned in a lab room: "Start the practical" opens it. A learner
  // opens it on their own phone, and can go back to the room.
  const [own, setOwn] = useKeptState<{ from: string; slug: string } | null>(keep, "lab:own", null);
  useEffect(() => {
    const on = (e: Event) => { const s = String((e as CustomEvent).detail ?? ""); if (!entryFor(s)) return; if (host) setSlug(s); else if (theirsRef.current) setOwn({ from: theirsRef.current, slug: s }); };
    window.addEventListener(START_EVENT, on);
    return () => window.removeEventListener(START_EVENT, on);
  }, [host, setSlug, setOwn, theirsRef]);

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
  function end() { setSlug(null); setShared(false); setTask(""); setTaskDraft(""); setTracking(false); setTrack({}); setBusy(null); onClose(); }

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
    const mine = own && own.from === theirs ? own.slug : null;
    const entry = entryFor(mine ?? theirs);
    if (!entry) return null;
    const Experiment = EXPERIMENTS[entry.slug];
    const watching = !mine && theirMode === "watch" && !!entry.practical;
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
          <p className="min-w-0 flex-1 truncate text-sm font-black">{entry.title} <span className="font-semibold text-white/50">· {watching ? "watch your teacher" : "try it yourself"}</span></p>
          {!entry.room && <ZoomButtons scale={scale} onZoom={setZoom} />}
          {mine && <button type="button" onClick={() => setOwn(null)} className="min-h-[40px] shrink-0 rounded-xl bg-white/10 px-3 text-xs font-black text-white">Back to the lab room</button>}
          <button type="button" onClick={() => setHidden(true)} className="min-h-[40px] shrink-0 rounded-xl bg-white px-3 text-xs font-black text-[#0B1220]">Back to the class board</button>
        </div>
        {nudge && (
          <div role="status" aria-label="From your teacher" className="flex items-center gap-2 bg-[#FDE68A] px-3 py-2 text-sm font-bold text-[#422006]">
            <span className="min-w-0 flex-1">💬 Your teacher: {nudge.text}</span>
            <button type="button" onClick={() => setNudge(null)} className="min-h-[36px] shrink-0 rounded-lg bg-[#422006] px-3 text-xs font-black text-white">OK</button>
          </div>
        )}
        {watching ? (
          <p role="status" aria-label="Watch your teacher" className="bg-[#0E6E72] px-3 py-2 text-sm font-bold text-white">👀 Watch your teacher do the practical. Look at each step and how the results are written down — your turn is next.</p>
        ) : !mine && theirTask ? (
          <p role="status" aria-label="Your task" className="bg-[#38BDF8]/20 px-3 py-2 text-sm font-bold text-[#BAE6FD]">📌 Your task: {theirTask}</p>
        ) : null}
        <div className="elab min-h-0 flex-1 overflow-auto overscroll-contain p-2 sm:p-4">
          {watching && (
            <div className="mx-auto max-w-6xl" style={{ zoom: scale }}>
              {frame && frame.slug === entry.slug
                ? <LabReportContext.Provider value={{ learner: true, watch: { frame } }}><Experiment /></LabReportContext.Provider>
                : <p className="mt-10 text-center text-sm font-bold text-white/70">Waiting for your teacher to start the practical…</p>}
            </div>
          )}
          {(!watching || hadTurn) && (
            <div className={`mx-auto max-w-6xl ${watching ? "hidden" : ""}`} style={{ zoom: entry.room ? 1 : scale }}><LabReportContext.Provider value={reportCtx}><RoomClassContext.Provider value={roomClass}><Experiment /></RoomClassContext.Provider></LabReportContext.Provider></div>
          )}
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
          <BoardIcon name="flask" /> <span className="truncate">{entryFor(slug)?.title ?? "Lab"}{mode === "watch" ? " · learners watching" : shared ? " · learners trying it" : ""}{shared && trackSum.stuck ? ` · ${trackSum.stuck} stuck` : ""}</span>
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
        {entry && !entry.room && <ZoomButtons scale={scale} onZoom={setZoom} />}
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
            <div role="group" aria-label="Learners' phones" className="flex shrink-0 items-center gap-1 rounded-xl bg-white/5 p-1">
              <span className="px-1 text-[11px] font-black text-white/50">Learners:</span>
              {entry.practical && (
                <button type="button" onClick={() => setMode(mode === "watch" ? null : "watch")} aria-pressed={mode === "watch"} title="Learners watch your bench, live, while you do it"
                  className={`min-h-[34px] whitespace-nowrap rounded-lg px-2.5 text-xs font-black ${mode === "watch" ? "bg-[#FDE047] text-[#0B1220]" : "hover:bg-white/10"}`}>👀 Watch me</button>
              )}
              <button type="button" onClick={() => setMode(mode === "try" ? null : "try")} aria-pressed={mode === "try"} title="Each learner does it on their own phone"
                className={`min-h-[34px] whitespace-nowrap rounded-lg px-2.5 text-xs font-black ${mode === "try" ? "bg-[#38BDF8] text-[#0B1220]" : "hover:bg-white/10"}`}>✋ Their turn</button>
            </div>
          )}
          {live && (shared || trackList.length > 0) && (
            <button type="button" onClick={() => setTracking(!tracking)} aria-pressed={tracking} className={`${chip} ${tracking ? "bg-white text-[#0B1220]" : "bg-white/10 hover:bg-white/15"}`}>
              👥 Learners&apos; progress{trackList.length ? ` · ${trackList.length}` : ""}
              {trackSum.stuck > 0 && <span className="rounded-full bg-[#F87171] px-1.5 text-[11px] text-white">{trackSum.stuck} stuck</span>}
            </button>
          )}
          {live && (entry.room || Object.keys(plans).length > 0) && (
            <button type="button" onClick={() => setViewPlans(!viewPlans)} aria-pressed={viewPlans} className={`${chip} ${viewPlans ? "bg-white text-[#0B1220]" : "bg-white/10 hover:bg-white/15"}`}>
              📋 Learners&apos; plans{Object.keys(plans).length ? ` · ${Object.keys(plans).length}` : ""}
            </button>
          )}
          <button type="button" onClick={() => { setSlug(null); setShared(false); setTracking(false); setViewPlans(false); }} className={`${chip} bg-white/5 hover:bg-white/10`}>Change experiment</button>
        </div>
      )}
      {entry && live && mode === "watch" && (
        <p className="bg-[#FDE047]/15 px-3 py-1.5 text-xs font-bold text-[#FEF08A] sm:px-4">👀 Learners are watching your bench live. Go slowly and say what you&apos;re doing at each step — and how you write down what you see. Then press <b>✋ Their turn</b>.</p>
      )}
      {entry && live && mode === "try" && (
        <form aria-label="Task for learners" onSubmit={(e) => { e.preventDefault(); setTask(taskDraft.trim()); }} className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2 py-1.5 sm:px-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-black">
            <span className="shrink-0">📌 Task</span>
            <input value={taskDraft} onChange={(e) => setTaskDraft(e.target.value)} maxLength={400} placeholder="e.g. Do it yourself. Write an observation after each step and give units with every reading."
              className="h-9 min-w-0 flex-1 rounded-lg bg-white/10 px-3 text-sm font-semibold text-white placeholder:text-white/35" />
          </label>
          <button type="submit" disabled={taskDraft.trim() === task} className="min-h-[36px] rounded-lg bg-white px-3 text-xs font-black text-[#0B1220] disabled:opacity-40">{task ? "Change the task" : "Give the task"}</button>
          {task && <span className="w-full text-[11px] font-bold text-white/55">Learners see: “{task}”</span>}
        </form>
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
            {rooms.length > 0 && (
              <section className="mt-4" aria-label="Lab rooms">
                <p className="text-sm font-black">🏫 Lab rooms <span className="font-semibold text-white/50">· every piece of apparatus — try it, pick it, plan your practical</span></p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {rooms.map((e) => (
                    <li key={e.slug}>
                      <button type="button" onClick={() => setSlug(e.slug)} aria-label={e.title}
                        className="flex h-full w-full flex-col rounded-2xl p-3 text-left ring-1 ring-white/15 transition hover:ring-white/40" style={{ background: `linear-gradient(135deg, ${SUBJECTS[e.subject].color}33, #ffffff08)` }}>
                        <span className="text-sm font-black">{e.emoji} {e.title}</span>
                        <span className="mt-0.5 line-clamp-3 text-xs text-white/60">{e.blurb}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {practicals.length > 0 && (
              <section className="mt-4" aria-label="Virtual practicals">
                <p className="text-sm font-black">Virtual practicals <span className="font-semibold text-white/50">· real equipment, done step by step</span></p>
                {(Object.keys(SUBJECTS) as LabSubject[]).filter((sub) => practicals.some((e) => e.subject === sub)).map((sub) => (
                  <div key={sub} className="mt-3">
                    <p className="text-xs font-black uppercase tracking-wide" style={{ color: SUBJECTS[sub].color }}>{SUBJECTS[sub].label}</p>
                    <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {practicals.filter((e) => e.subject === sub).map((e) => (
                        <li key={e.slug}>
                          <button type="button" onClick={() => setSlug(e.slug)} aria-label={e.title}
                            className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white/5 text-left ring-1 ring-white/15 transition hover:bg-white/10 hover:ring-white/40">
                            <PracticalThumb slug={e.slug} />
                            <span className="block p-3">
                              <span className="block text-sm font-black">{e.title}</span>
                              <span className="block text-[11px] font-bold" style={{ color: SUBJECTS[e.subject].color }}>{SUBJECTS[e.subject].label} · {e.level}</span>
                              <span className="mt-0.5 line-clamp-2 block text-xs text-white/55">{e.blurb}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {others.length > 0 && <p className="mt-5 text-sm font-black">Simulations</p>}
              </section>
            )}
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((e) => (
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
        <div className="relative min-h-0 flex-1">
          <div className="elab absolute inset-0 isolate overflow-auto overscroll-contain p-2 sm:p-4">
            <div ref={stage} className="mx-auto max-w-6xl" style={{ zoom: entry?.room ? 1 : scale }}>{Experiment && <LabReportContext.Provider value={teacherCtx}><RoomClassContext.Provider value={roomClass}><Experiment /></RoomClassContext.Provider></LabReportContext.Provider>}</div>
          </div>
          {tracking && live && <LabTracker entries={trackList} quiet={quiet} onClose={() => setTracking(false)} onHelp={help} sent={nudges} quick={QUICK_HELP} />}
          {viewPlans && <PlansPanel plans={plans} replies={replies} assignment={assign} onReply={reply} onClose={() => setViewPlans(false)} />}
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
