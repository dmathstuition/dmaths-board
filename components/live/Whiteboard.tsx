"use client";
import { recognizeShape } from "@/lib/shapeNeat";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { RECONNECTED, useLive, useLiveStatus } from "@/components/live/LiveChannel";
import { applyLive, assemble, chunkItems, pageDigest } from "@/lib/boardSync";
import { HOME, cleanView, isHome, panBy, pinch, toBoard, toScreen, viewMatrix, zoomAt, type View } from "@/lib/boardView";
import BoardWidgets from "@/components/live/board/BoardWidgets";
import { BoardIcon, type BoardIconName } from "@/components/live/board/BoardIcons";
import { localPoint } from "@/components/live/board/rotation";
import {
  BOARD_H, BOARD_W, COLORS, NOTE_COLORS, NOTE_H, NOTE_W, PAPERS, SIZES, cleanBoard, cleanStroke, drawStrokes, fontFor,
  FILLABLE, STAMPS, hitTest, itemCount, type Board, scaleItem, type ImageSource, isPaper, isSlideUrl, itemBounds, moveItem, paperIsDark, roundPt, type ItemKind, type Paper, type StampId, type Stroke, BOARD_MAX_PAGES } from "@/lib/whiteboard";
import { TEMPLATES, isTemplate, templateItems } from "@/lib/boardTemplates";
import { checkCards, isAnswerCard } from "@/lib/boardActivities";
import ActivityDialog from "@/components/live/board/ActivityDialog";
import Replay from "@/components/live/board/Replay";
import AnswerBoards from "@/components/live/board/AnswerBoards";
import EquationEditor from "@/components/live/board/EquationEditor";
import ExamMode from "@/components/live/board/ExamMode";
import Leaderboard from "@/components/live/board/Leaderboard";
import PulsePoll from "@/components/live/board/PulsePoll";
import GroupBoards from "@/components/live/board/GroupBoards";
import dynamic from "next/dynamic";
import LessonPicker from "@/components/live/board/LessonPicker";
import Roster, { type RosterProps } from "@/components/live/board/Roster";
import { reportProblem } from "@/lib/liveDiag";
import { MAX_SLIDES, PICTURE_ACCEPT, SLIDE_ACCEPT, isPowerPoint, sendPicture, sendSlides, warmSlides } from "@/components/live/board/slides";
import { DEFAULT_WIDGETS, cleanWidgets, startTimer, type Widgets } from "@/lib/boardTools";
import type { KeepStore } from "@/lib/keptState";
// The lab is big (39 experiments): loaded only when a board opens it.
const LabPanel = dynamic(() => import("@/components/live/board/LabPanel"), { ssr: false });
const GamesPanel = dynamic(() => import("@/components/live/board/GamesPanel"), { ssr: false });

export type { Paper } from "@/lib/whiteboard";
type Tool = "hand" | "select" | "pen" | "hl" | "eraser" | "line" | "dline" | "arrow" | "darrow" | "rect" | "ellipse" | "tri" | "text" | "note" | "stamp" | "laser" | "cover" | "math";
type Person = { id: string; name: string; online?: boolean };

const TOOLS: { id: Tool; label: string; key: string; icon: BoardIconName }[] = [
  { id: "select", label: "Select & move", key: "v", icon: "select" },
  { id: "hand", label: "Move around (when zoomed)", key: " ", icon: "hand" },
  { id: "pen", label: "Pen", key: "p", icon: "pen" },
  { id: "hl", label: "Highlighter", key: "h", icon: "highlighter" },
  { id: "eraser", label: "Eraser", key: "e", icon: "eraser" },
  { id: "line", label: "Line", key: "l", icon: "line" },
  { id: "dline", label: "Dashed line", key: "d", icon: "dline" },
  { id: "arrow", label: "Arrow", key: "a", icon: "arrow" },
  { id: "darrow", label: "Double arrow", key: "b", icon: "darrow" },
  { id: "rect", label: "Rectangle", key: "r", icon: "rect" },
  { id: "ellipse", label: "Circle", key: "o", icon: "circle" },
  { id: "tri", label: "Triangle", key: "g", icon: "triangle" },
  { id: "text", label: "Text", key: "t", icon: "text" },
  { id: "math", label: "Equation (type maths)", key: "q", icon: "equation" },
  { id: "note", label: "Sticky note", key: "n", icon: "note" },
  { id: "stamp", label: "Stamp", key: "s", icon: "stamp" },
  { id: "laser", label: "Laser pointer", key: "k", icon: "laser" },
  { id: "cover", label: "Cover box (tap with Select to reveal)", key: "c", icon: "cover" },
];
const MATH_SYMBOLS = ["√", "π", "²", "³", "½", "¼", "¾", "×", "÷", "±", "≤", "≥", "≠", "≈", "°", "∠", "θ", "∞", "→"];
const SHAPE_TOOLS: Tool[] = ["line", "dline", "arrow", "darrow", "rect", "ellipse", "tri"];
// The toolbar shows one Shapes button; the shape row appears when it is picked.
const MAIN_TOOLS: (Tool | "shapes")[] = ["select", "pen", "hl", "eraser", "shapes", "text", "math", "note", "stamp", "laser"];
const STAMP_LOOK: Record<StampId, { label: string; bg: string; icon: BoardIconName }> = {
  tick: { label: "Tick", bg: "#16A34A", icon: "tick" }, cross: { label: "Cross", bg: "#DC2626", icon: "close" },
  star: { label: "Star", bg: "#EAB308", icon: "stamp" }, heart: { label: "Heart", bg: "#EC4899", icon: "heart" },
  smiley: { label: "Smiley", bg: "#F59E0B", icon: "smiley" }, question: { label: "Question", bg: "#1657C9", icon: "question" },
};
type ClassTool = "timer" | "dice" | "picker" | "shade" | "ruler" | "protractor" | "compass" | "solid" | "graph" | "calc" | "numberLine"
  | "clock" | "fractions" | "hundred" | "placeValue" | "wordCard" | "sentence" | "spell" | "groups" | "spotlight";
// The class-tools panel, grouped so the host finds things fast.
const TOOL_GROUPS: { title: string; items: { k: ClassTool; label: string; hint: string; icon: BoardIconName }[] }[] = [
  { title: "Maths", items: [
    { k: "graph", label: "Graph plotter", hint: "Graphs, sliders, inequalities", icon: "graph" },
    { k: "calc", label: "Calculator", hint: "Scientific", icon: "calculator" },
    { k: "numberLine", label: "Number line", hint: "Mark values", icon: "numberline" },
    { k: "ruler", label: "Ruler", hint: "Measure in cm", icon: "ruler" },
    { k: "protractor", label: "Protractor", hint: "Measure angles", icon: "protractor" },
    { k: "compass", label: "Compasses", hint: "Draw circles and arcs", icon: "compass" },
    { k: "solid", label: "3D shapes", hint: "Turn, volume, nets", icon: "solid" },
    { k: "fractions", label: "Fraction wall", hint: "Shade and compare", icon: "fractions" },
    { k: "hundred", label: "Hundred square", hint: "Patterns and multiples", icon: "hundred" },
    { k: "placeValue", label: "Place value", hint: "Digits in columns", icon: "placevalue" },
    { k: "clock", label: "Clock", hint: "Telling the time", icon: "clock" },
  ] },
  { title: "English", items: [
    { k: "wordCard", label: "Word card", hint: "Word, class, meaning", icon: "wordcard" },
    { k: "sentence", label: "Sentence builder", hint: "Unscramble the words", icon: "sentence" },
    { k: "spell", label: "Spell it", hint: "Guess the letters", icon: "spell" },
  ] },
  { title: "Classroom", items: [
    { k: "timer", label: "Timer", hint: "Countdown / stopwatch", icon: "timer" },
    { k: "dice", label: "Dice", hint: "Roll 1–3 dice", icon: "dice" },
    { k: "picker", label: "Pick a learner", hint: "Random name", icon: "picker" },
    { k: "groups", label: "Group maker", hint: "Random groups", icon: "groups" },
    { k: "spotlight", label: "Spotlight", hint: "Focus on one part", icon: "spotlight" },
    { k: "shade", label: "Screen shade", hint: "Reveal step by step", icon: "shade" },
  ] },
];
const SHAPES: Tool[] = SHAPE_TOOLS;
// Tools drawn by dragging out a box or line.
const isBoxTool = (t: string) => SHAPES.includes(t as Tool) || t === "cover";

// The paper behind the drawing, scaled with the board so the grid lines up
// with the strokes on every screen.
function paperStyle(p: Paper, boxW: number): CSSProperties {
  const u = boxW / 40; // 40 squares across
  switch (p) {
    case "grid": return { background: "#fff", backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: `${u}px ${u}px` };
    case "maths": return { background: "#fff", backgroundImage: "linear-gradient(#bfdbfe 1px, transparent 1px), linear-gradient(90deg, #bfdbfe 1px, transparent 1px), linear-gradient(#eff6ff 1px, transparent 1px), linear-gradient(90deg, #eff6ff 1px, transparent 1px)", backgroundSize: `${u * 2.5}px ${u * 2.5}px, ${u * 2.5}px ${u * 2.5}px, ${u / 2}px ${u / 2}px, ${u / 2}px ${u / 2}px` };
    case "dots": return { background: "#fff", backgroundImage: "radial-gradient(#94a3b8 1.2px, transparent 1.4px)", backgroundSize: `${u}px ${u}px` };
    case "lines": return { background: "#fff", backgroundImage: `linear-gradient(90deg, transparent ${u * 2.5}px, #fecaca ${u * 2.5}px, #fecaca ${u * 2.5 + 2}px, transparent ${u * 2.5 + 2}px), linear-gradient(#dbeafe 1px, transparent 1px)`, backgroundSize: `100% 100%, 100% ${u * 1.25}px` };
    case "chalk": return { background: "radial-gradient(ellipse at 30% 20%, #2d5a40, #1f3d2b 70%)" };
    case "dark": return { background: "#0B1220" };
    case "handwriting": { // ascender, x-height, baseline (red), descender — then a gap
      const g = u * 5, line = (c: string, w = 1) => `linear-gradient(${c} ${w}px, transparent ${w}px)`;
      return { background: "#fff", backgroundImage: [line("#93c5fd"), line("#dbeafe"), line("#fca5a5", 1.5), line("#dbeafe")].join(", "), backgroundSize: `100% ${g}px`, backgroundPosition: `0 ${u * 0.5}px, 0 ${u * 1.5}px, 0 ${u * 2.5}px, 0 ${u * 3.5}px` };
    }
    case "axes": return { background: "#fff", backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: `${boxW / 32}px ${boxW / 32}px`, backgroundPosition: "center" };
    default: return { background: "#fff" };
  }
}

// The shared board of an interactive class. The host always writes; learners
// write only when the host lets them (everyone, or picked one by one). Finished
// items are broadcast to everyone, in-progress ones stream every ~120ms (less
// often in big classes), and the
// host's copy autosaves so late joiners and the class log get the board.
// `lessonId`: preparing a lesson-library board instead of a live class (saves to the lesson).
export default function Whiteboard({ sessionId, lessonId, host, myId, myName = "Learner", canDraw, writers, readOnly = false, canLog = false, people = [], roster, onQuizLaunched, hand, extra, overlay }: {
  sessionId: string; lessonId?: string; host: boolean; myId: string; myName?: string; canDraw: boolean;
  writers: string[] | "all"; readOnly?: boolean; canLog?: boolean; people?: Person[];
  roster?: RosterProps; // the host's class list, shown beside the full-screen board
  onQuizLaunched?: () => void; // a ready-made quiz was launched from the Games panel: show the quiz
  hand?: { up: boolean; onToggle: () => void; note?: string }; // a learner's raise-hand button (on the board, so it works in full screen too)
  extra?: (full: boolean) => React.ReactNode; // more buttons for the toolbar (class voice), shown in full screen too
  overlay?: (full: boolean) => React.ReactNode; // something floating over the board (the speaker's video), shown in full screen too
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // The element the board's full-screen panels open in (see `labLayer`).
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const setRoot = useCallback((el: HTMLDivElement | null) => { rootRef.current = el; setRootEl(el); }, []);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const laserRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null); // the line being drawn right now, on its own layer
  const pages = useRef<Stroke[][]>([[]]);
  const live = useRef(new Map<string, { page: number; s: Stroke }>());
  const drawing = useRef<Stroke | null>(null);
  const redoStack = useRef<Stroke[]>([]);
  const lasers = useRef(new Map<string, { pts: number[]; at: number; color: string }>());
  const lastSent = useRef(0); // board moves and widgets
  const lastLive = useRef(0), lastLaser = useRef(0);
  // How often an in-progress stroke, laser or drag goes out. Every message is
  // delivered to every screen, so a bigger class gets fewer, larger updates —
  // keeping the class well inside the live service's messages-per-second limit.
  const onlineCount = people.filter((p) => p.online !== false).length;
  const streamEvery = Math.max(120, onlineCount * 25);
  const liveSent = useRef(0); // how many numbers of the stroke being drawn have gone out
  // A learner's finished items wait here until the host's board confirms them.
  // `first`: when it was made; `posted`: it has also gone by the backup route (the server).
  const pending = useRef(new Map<string, { s: Stroke; page: number; at: number; tries: number; move?: boolean; first?: number; posted?: boolean }>());
  const incoming = useRef(new Map<string, (Stroke[] | undefined)[]>()); // page pieces being received
  const lastAsk = useRef(0), lastServe = useRef(new Map<number, number>());
  const askGap = useRef(1800); // learner: how long to wait before asking for the board again
  const lastPushAll = useRef(0), pushAllTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pushAllTimer.current) clearTimeout(pushAllTimer.current); if (trickle.current) clearTimeout(trickle.current); }, []);
  const [papers, setPapers] = useState<Paper[]>(["plain"]);
  const [bgs, setBgs] = useState<(string | null)[]>([null]);
  const bgsRef = useRef(bgs); bgsRef.current = bgs;
  const [slideBusy, setSlideBusy] = useState(false);
  // Short messages shown on the board itself (visible in full screen too).
  const [notice, setNotice] = useState("");
  useEffect(() => { if (hand?.note) setNotice(hand.note); }, [hand?.note]);
  useEffect(() => { if (!notice || slideBusy) return; const t = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(t); }, [notice, slideBusy]);
  const slideInput = useRef<HTMLInputElement>(null);
  // A teacher's board fetches the PDF reader early, so the first slide upload is quick.
  useEffect(() => { if (host && !readOnly) warmSlides(); }, [host, readOnly]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[2]);
  const [size, setSize] = useState<number>(SIZES[1]);
  const [fill, setFill] = useState(false);
  // Neat shapes: a big rough line, circle, triangle or box drawn with the pen is
  // tidied into a clean one. Off until switched on; this device remembers it.
  const [neat, setNeat] = useState(false);
  useEffect(() => { try { setNeat(localStorage.getItem("board-neat-shapes") === "1"); } catch { /* storage blocked */ } }, []);
  const toggleNeat = () => setNeat((v) => { try { localStorage.setItem("board-neat-shapes", v ? "0" : "1"); } catch { /* storage blocked */ } return !v; });
  const [noteColor, setNoteColor] = useState<string>(NOTE_COLORS[0]);
  const [widgets, setWidgets] = useState<Widgets>(DEFAULT_WIDGETS);
  const [box, setBox] = useState({ w: 800, h: 500 });
  const [full, setFull] = useState(false);
  // `replace`: the equation being changed (tap one with the equation tool).
  const [edit, setEdit] = useState<{ kind: "text" | "note" | "math"; x: number; y: number; value: string; replace?: Stroke } | null>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [overview, setOverview] = useState(false);
  const [activity, setActivity] = useState<"sorting" | "matching" | null>(null);
  const [replay, setReplay] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [starsOpen, setStarsOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  // State of the class panels (answer boards, lab) that must survive the board
  // switching between its full-screen and normal layouts.
  const keep = useRef<KeepStore>(new Map()).current;
  const [labUsed, setLabUsed] = useState(false); // load the lab only once the teacher opens it
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gamesUsed, setGamesUsed] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const uploadTarget = lessonId ? { lessonId } : { sessionId };
  const picInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [shape, setShape] = useState<Tool>("rect");
  const [stamp, setStamp] = useState<StampId>("star");
  // Zoom: what part of the board is on screen. Learners follow the tutor's view
  // until they zoom or move themselves.
  const [view, setViewState] = useState<View>(HOME);
  const viewRef = useRef(view); viewRef.current = view;
  const [follow, setFollow] = useState(true);
  const followRef = useRef(follow); followRef.current = follow;
  const hostView = useRef<View>(HOME);
  const lastView = useRef(0);
  const gesture = useRef<{ pts: Map<number, [number, number]>; start?: { view: View; a: [number, number]; b: [number, number] }; pan?: { view: View; at: [number, number] } }>({ pts: new Map() });
  const [selected, setSelected] = useState<Stroke | null>(null);
  const selRef = useRef<Stroke | null>(null);
  const dragRef = useRef<{ orig: Stroke; sx: number; sy: number; moved: boolean } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawOk = !readOnly && canDraw;
  const pageRef = useRef(page); pageRef.current = page;
  const paper = papers[page] ?? "plain";
  const dark = paperIsDark(paper);

  // Pictures placed on the board, loaded once and redrawn when they arrive.
  const imgCache = useRef(new Map<string, HTMLImageElement>());
  const redrawRef = useRef<() => void>(() => {});
  const getImg = useCallback<ImageSource>((url) => {
    let im = imgCache.current.get(url);
    if (!im) {
      im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => redrawRef.current(); im.src = url;
      imgCache.current.set(url, im);
    }
    return im.complete && im.naturalWidth ? im : null;
  }, []);
  // Painting happens at most once per screen frame. The page (everything already
  // on it) is only repainted when it changes; the line being drawn right now is
  // painted on its own transparent layer on top, so each pen movement costs one
  // line however full the page is. (An eraser line has to cut the page itself,
  // so it is painted with the page.)
  const frame = useRef(0);
  const needBase = useRef(true);
  const paintBase = useCallback(() => {
    const c = canvasRef.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const p = pageRef.current;
    const liveHere = [...live.current.values()].filter((l) => l.page === p).map((l) => l.s);
    const m = viewMatrix(viewRef.current, c.width, c.height);
    const d = drawing.current;
    drawStrokes(ctx, [...(pages.current[p] ?? []), ...liveHere, ...(d?.erase ? [d] : [])], c.width, c.height, getImg, m);
    const sel = selRef.current;
    if (sel) {
      const b = itemBounds(sel), pad = 6 * (c.width / BOARD_W);
      ctx.save(); ctx.setTransform(...m); ctx.strokeStyle = "#0EA5E9"; ctx.lineWidth = Math.max(1.5, c.width / 900); ctx.setLineDash([8, 6]);
      ctx.strokeRect(b.x1 * c.width - pad, b.y1 * c.height - pad, (b.x2 - b.x1) * c.width + 2 * pad, (b.y2 - b.y1) * c.height + 2 * pad);
      ctx.restore();
    }
  }, [getImg]);
  const paintInk = useCallback(() => {
    const c = inkRef.current;
    if (!c) return;
    // A plain 2D context: "desynchronized" (low-latency) canvases show as solid
    // black on some phones and graphics chips, hiding the whole board.
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const d = drawing.current;
    if (!d || d.erase) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); return; }
    drawStrokes(ctx, [d], c.width, c.height, getImg, viewMatrix(viewRef.current, c.width, c.height));
  }, [getImg]);
  const paint = useCallback(() => {
    frame.current = 0;
    if (needBase.current) { needBase.current = false; paintBase(); }
    paintInk();
  }, [paintBase, paintInk]);
  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);
  // Repaint the page (and the line being drawn) on the next frame.
  const redraw = useCallback(() => { needBase.current = true; schedule(); }, [schedule]);
  // Only the line being drawn changed.
  const redrawInk = useCallback(() => {
    if (drawing.current?.erase) needBase.current = true;
    schedule();
  }, [schedule]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  redrawRef.current = redraw;
  useEffect(() => { redraw(); }, [page, redraw, view]);

  // Fit the board (16:10) into the space available — the whole screen in full-screen mode.
  useEffect(() => {
    const fit = () => {
      const st = stageRef.current, c = canvasRef.current, lc = laserRef.current;
      if (!st || !c) return;
      const aw = st.clientWidth, ah = st.clientHeight;
      const w = Math.max(200, Math.floor(Math.min(aw, ah * (BOARD_W / BOARD_H))));
      const h = Math.round((w * BOARD_H) / BOARD_W);
      setBox({ w, h });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      if (lc) { lc.width = c.width; lc.height = c.height; }
      const ic = inkRef.current;
      if (ic) { ic.width = c.width; ic.height = c.height; }
      cancelAnimationFrame(frame.current); needBase.current = true; paint(); // resizing blanked them: paint now
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [paint, full]);

  // Mouse wheel / trackpad: pinch or Ctrl+wheel zooms at the pointer; wheel moves when zoomed in.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const [sx, sy] = localPoint(c, e.clientX, e.clientY);
        setView(zoomAt(v, Math.exp(-e.deltaY * 0.01), sx, sy));
      } else if (!isHome(v)) {
        e.preventDefault();
        const r = c.getBoundingClientRect();
        setView(panBy(v, -e.deltaX / r.width, -e.deltaY / r.height));
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  // ── Saving (host) ──
  const persist = useCallback(async (toLessonLog = false) => {
    if (!host || readOnly) return;
    setStatus("Saving…");
    const board = { pages: pages.current, paper: papersRef.current, bg: bgsRef.current };
    const r = lessonId
      ? await fetch("/api/board-lessons", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", id: lessonId, board, widgets: widgetsRef.current }) }).catch(() => null)
      : await fetch("/api/live-sessions", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, board, toLessonLog }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setStatus(r?.ok ? (toLessonLog ? (j.logged ? "Saved to the lesson log ✓" : "Saved") : "Saved") : (j.error ?? "Couldn't save"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, lessonId, host, readOnly]);
  const papersRef = useRef(papers); papersRef.current = papers;
  const scheduleSave = useCallback(() => {
    if (!host || readOnly) return;
    if (saveTimer.current) return; // a save is already on its way — at most one every 4 seconds while drawing
    saveTimer.current = setTimeout(() => { saveTimer.current = null; persist(false); }, 4000);
  }, [host, readOnly, persist]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // Only items from the host or a permitted writer count.
  const writersRef = useRef(writers);
  writersRef.current = writers;
  const accepts = (p: any) => !!p?.stroke && (p.host === true || writersRef.current === "all" || writersRef.current.includes(String(p.stroke.by)));
  const pageOf = (p: any) => Math.max(0, Math.min(BOARD_MAX_PAGES - 1, Math.round(Number(p?.page) || 0)));
  const ensurePage = (n: number) => { while (pages.current.length <= n) pages.current.push([]); };

  const send = useLive({
    // A stroke being drawn: just its new points (`start` = where they go).
    "board-live": (p) => {
      if (!accepts(p) || !Array.isArray(p.pts)) return;
      const head = cleanStroke({ ...p.stroke, pts: [0, 0, 0, 0] }); if (!head) return;
      const start = Math.max(0, Math.round(Number(p.start) || 0));
      const pts = p.pts.slice(0, 2000).map((n: unknown) => roundPt(Number(n) || 0));
      if (pts.length % 2 || start + pts.length > 8000) return;
      const next = applyLive(live.current.get(head.id)?.s, head, start, pts);
      if (next) { live.current.set(head.id, { page: pageOf(p), s: next }); redraw(); }
    },
    "board-stroke": (p) => {
      if (!accepts(p)) return;
      const s = cleanStroke(p.stroke); if (!s) return;
      const n = pageOf(p); ensurePage(n);
      live.current.delete(s.id);
      if (!pages.current[n].some((x) => x.id === s.id)) pages.current[n].push(s);
      // Tell a learner their item arrived, so they stop re-sending it.
      if (host && !p.host) send("board-ack", { host: true, ids: [s.id] });
      redraw(); scheduleSave();
    },
    "board-view": (p) => { if (!p?.host || host) return; hostView.current = cleanView(p.view); if (followRef.current) setView(hostView.current, false); },
    "board-live-cancel": (p) => { if (p?.id && live.current.delete(String(p.id))) redraw(); },
    "board-ack": (p) => { if (p?.host && Array.isArray(p.ids)) for (const id of p.ids) pending.current.delete(String(id)); },
    // The host's fingerprint of a page: if ours differs, ask for that page again.
    "board-digest": (p) => {
      if (p?.host) lastHostAt.current = Date.now();
      if (!p?.host || host || readOnly) return;
      const n = pageOf(p), now = Date.now();
      if (p.v) { hostView.current = cleanView(p.v); if (followRef.current) { const v = hostView.current, c = viewRef.current; if (v.z !== c.z || v.x !== c.x || v.y !== c.y) setView(v, false); } }
      // Learners follow the host's page.
      if (n !== pageRef.current && n < pages.current.length) setPage(n);
      const layoutOff = Number(p.count) !== pages.current.length || (!!p.m && p.m !== metaKey());
      const mine = (pages.current[n] ?? []).filter((x) => !pending.current.has(x.id));
      if (!layoutOff && pageDigest(mine) === p.d) { askGap.current = 1800; return; } // in step again
      if (now - lastAsk.current < askGap.current) return;
      // Still out of step after asking: wait longer each time (up to 20s), so a
      // whole class can never flood the live connection with requests.
      askGap.current = Math.min(20_000, askGap.current * 2);
      lastAsk.current = now;
      // Different pages, backgrounds or slides: ask for the layout; otherwise just this page.
      if (layoutOff) send("board-sync-req"); else send("board-page-req", { page: n });
    },
    "board-page-req": (p) => { if (host && !readOnly) servePage(pageOf(p)); },
    // A page from the host, in pieces; replace ours once every piece is here.
    "board-page-data": (p) => {
      if (!p?.host || host) return;
      const n = pageOf(p), parts = Math.max(1, Math.min(200, Math.round(Number(p.parts) || 1))), part = Math.round(Number(p.part) || 0);
      if (part < 0 || part >= parts) return;
      const key = `${n}:${p.ver}`;
      const got = incoming.current.get(key) ?? [];
      got[part] = Array.isArray(p.items) ? p.items.map(cleanStroke).filter((x: Stroke | null): x is Stroke => !!x) : [];
      incoming.current.set(key, got);
      const all = assemble(got, parts);
      if (!all) return;
      for (const k of incoming.current.keys()) if (k.startsWith(`${n}:`)) incoming.current.delete(k);
      ensurePage(n);
      const have = new Set(all.map((x) => x.id));
      // Keep our own items the host hasn't confirmed yet — they're still being re-sent.
      for (const q of pending.current.values()) {
        if (q.page !== n) continue;
        if (q.move) { const i = all.findIndex((x) => x.id === q.s.id); if (i >= 0) all[i] = q.s; }
        else if (!have.has(q.s.id)) all.push(q.s);
      }
      pages.current[n] = all;
      for (const [id, l] of live.current) if (l.page === n) live.current.delete(id);
      if (selRef.current && !have.has(selRef.current.id)) { selRef.current = null; setSelected(null); }
      redraw();
    },
    [RECONNECTED]: () => {
      if (host && !readOnly) sendDigest();
      else if (!readOnly) { send("board-sync-req"); resendPending(true); }
    },
    "board-update": (p) => {
      const s = cleanStroke(p?.stroke); if (!s) return;
      const n = pageOf(p), list = pages.current[n]; if (!list) return;
      const i = list.findIndex((x) => x.id === s.id); if (i < 0) return;
      if (!p.host) {
        // A learner may move their own items, and any answer card in an activity — never change who made it.
        const sender = String(p.by ?? ""), writer = writersRef.current === "all" || writersRef.current.includes(sender);
        if (!writer || s.by !== list[i].by || s.kind !== list[i].kind || !(list[i].by === sender || isAnswerCard(list[i]))) return;
        if (host) send("board-ack", { host: true, ids: [s.id] });
      }
      if (pending.current.get(s.id)?.move && !p.host) return; // our own newer move is still on its way
      if (p.front) { list.splice(i, 1); list.push(s); } else list[i] = s;
      if (selRef.current?.id === s.id) { selRef.current = s; setSelected(s); }
      redraw(); scheduleSave();
    },
    "board-delpage": (p) => { if (p?.host && !host) dropPage(pageOf(p)); },
    // Removing an item: the teacher may remove anything; anyone else only their own.
    "board-undo": (p) => {
      const n = pageOf(p), list = pages.current[n]; if (!list) return;
      const item = list.find((s) => s.id === p?.id); if (!item) return;
      if (p?.host !== true && String(item.by) !== String(p?.by ?? "")) return;
      pages.current[n] = list.filter((s) => s.id !== item.id); redraw(); scheduleSave();
    },
    "board-clear": (p) => { if (!p?.host) return; const n = pageOf(p); ensurePage(n); pages.current[n] = []; live.current.clear(); redraw(); },
    "board-paper": (p) => { if (!p?.host || !isPaper(p.paper)) return; const n = pageOf(p); setPapers((ps) => { const next = [...ps]; while (next.length <= n) next.push("plain"); next[n] = p.paper; return next; }); },
    "board-page": (p) => {
      if (!p?.host || host) return;
      const count = Math.max(1, Math.min(BOARD_MAX_PAGES, Math.round(Number(p.count) || 1)));
      ensurePage(count - 1); setPageCount(count); setPage(pageOf(p));
      if (Array.isArray(p.paper)) setPapers(p.paper.slice(0, BOARD_MAX_PAGES).map((x: unknown) => (isPaper(x) ? x : "plain")));
      if (Array.isArray(p.bg)) setBgs(p.bg.slice(0, BOARD_MAX_PAGES).map((x: unknown) => (isSlideUrl(x) ? x : null)));
    },
    "board-widgets": (p) => { if (p?.host && !host) setWidgets(cleanWidgets(p.widgets)); },
    "board-laser": (p) => { if (!p?.by || pageOf(p) !== pageRef.current || !Array.isArray(p.pts)) return; lasers.current.set(String(p.by), { pts: p.pts.slice(0, 400).map(Number), at: Date.now(), color: String(p.color ?? "#EF4444") }); kickLaser(); },
    // Someone joined or reconnected: send the layout, then every page in pieces.
    "board-sync-req": () => { if (host && !readOnly) pushAllSoon(); },
    "board-sync": (p) => {
      if (!p?.host || host) return;
      if (p.board) { // an older host sends the whole board at once
        const b = cleanBoard(p.board);
        pages.current = b.pages; setPapers(b.paper); setBgs(b.bg); setPageCount(b.pages.length); setPage(Math.min(pageOf(p), b.pages.length - 1));
      } else {
        const count = Math.max(1, Math.min(BOARD_MAX_PAGES, Math.round(Number(p.count) || 1)));
        pages.current = pages.current.slice(0, count); ensurePage(count - 1); setPageCount(count); setPage(Math.min(pageOf(p), count - 1));
        if (Array.isArray(p.paper)) setPapers(p.paper.slice(0, BOARD_MAX_PAGES).map((x: unknown) => (isPaper(x) ? x : "plain")));
        if (Array.isArray(p.bg)) setBgs(p.bg.slice(0, BOARD_MAX_PAGES).map((x: unknown) => (isSlideUrl(x) ? x : null)));
      }
      if (p.widgets) setWidgets(cleanWidgets(p.widgets));
      redraw();
    },
  });
  const widgetsRef = useRef(widgets); widgetsRef.current = widgets;

  // ── Keeping every screen the same (see lib/boardSync.ts) ──
  function servePage(n: number, force = false) {
    const now = Date.now();
    if (!force && now - (lastServe.current.get(n) ?? 0) < 800) return; // several learners may ask at once
    lastServe.current.set(n, now);
    // Same content → same version, so pieces from different sends can be combined.
    const items = pages.current[n] ?? [], chunks = chunkItems(items), ver = pageDigest(items);
    chunks.forEach((items, part) => send("board-page-data", { host: true, page: n, ver, part, parts: chunks.length, items }));
  }
  // Page count, backgrounds and slides in one short key.
  const metaKey = () => pageDigest(pages.current.map((_, i) => ({ id: `${papersRef.current[i] ?? "plain"}|${bgsRef.current[i] ?? ""}`, by: "", color: "", w: 0, pts: [] })));
  // Send everyone the board: the layout, then the page on screen in pieces.
  // Other pages follow when the class turns to them (the page fingerprint in
  // "board-digest" makes each screen ask for a page it doesn't have yet).
  function pushAll(page = pageRef.current) {
    const count = pages.current.length;
    lastPushAll.current = Date.now();
    send("board-sync", { host: true, meta: true, count, paper: papersRef.current, bg: bgsRef.current, page, widgets: widgetsRef.current });
    servePage(page, true);
    // The rest trickle out in the background, one page at a time — never a burst.
    if (trickle.current) clearTimeout(trickle.current);
    const rest = Array.from({ length: count }, (_, i) => i).filter((i) => i !== page && (pages.current[i]?.length ?? 0) > 0);
    const next = () => {
      const n = rest.shift();
      if (n == null) { trickle.current = null; return; }
      servePage(n, true);
      trickle.current = setTimeout(next, 800);
    };
    trickle.current = setTimeout(next, 800);
  }
  // Learners asking for the board (joining, reconnecting): answer them all with
  // one send, at most every 3 seconds.
  function pushAllSoon() {
    if (pushAllTimer.current) return;
    const wait = Math.max(0, 3000 - (Date.now() - lastPushAll.current));
    pushAllTimer.current = setTimeout(() => { pushAllTimer.current = null; pushAll(); }, wait);
  }
  // Open a lesson from the library on this board (in class: everyone gets it).
  function applyLesson(b: Board, w: Widgets | null, title: string) {
    if (itemCount({ v: 2, pages: pages.current, paper: [], bg: [] }) > 0 && !confirm(`Replace this board with “${title}”? (Save it as a lesson first if you want to keep it.)`)) return;
    pages.current = b.pages.map((p) => [...p]);
    papersRef.current = b.paper; bgsRef.current = b.bg;
    setPapers(b.paper); setBgs(b.bg); setPageCount(b.pages.length); setPage(0); pageRef.current = 0;
    if (w) { setWidgets(w); widgetsRef.current = w; }
    live.current.clear(); redoStack.current = []; select(null);
    setLessonsOpen(false); redraw(); pushAll(0); scheduleSave();
    setNotice(`“${title}” is on the board`);
  }
  function sendDigest() {
    const n = pageRef.current;
    send("board-digest", { host: true, page: n, d: pageDigest(pages.current[n] ?? []), count: pages.current.length, m: metaKey(), v: viewRef.current });
  }
  // A learner's items the teacher hasn't confirmed: send again over the live
  // connection, and — if that's down or hasn't worked within a few seconds —
  // through the server too (the backup route), so nothing written is lost.
  const backupOff = useRef(false);
  async function postBackup(id: string, q: { s: Stroke; page: number; move?: boolean; posted?: boolean }) {
    if (backupOff.current || !sessionId || lessonId) return;
    q.posted = true;
    const r = await fetch("/api/live-sessions/inbox", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, page: q.page, kind: q.move ? "move" : "add", item: q.s }) }).catch(() => null);
    if (r?.ok) { reportProblem("backup-route-used", { sessionId, role: "learner" }); return; }
    if (r?.status === 501) { backupOff.current = true; reportProblem("backup-route-missing", { sessionId, message: "run migration-board-inbox.sql" }); return; }
    q.posted = false; // try again later
  }
  function resendPending(all = false) {
    const now = Date.now();
    const down = liveRef.current !== "live";
    for (const [id, q] of pending.current) {
      const still = (pages.current[q.page] ?? []).some((x) => x.id === id);
      if (!still || (q.tries >= 10 && (q.posted || backupOff.current))) { pending.current.delete(id); continue; }
      if (!q.posted && (down || now - (q.first ?? q.at) > 3000)) void postBackup(id, q);
      if (q.tries < 10 && (all || now - q.at > 2000)) { q.at = now; q.tries++; send(q.move ? "board-update" : "board-stroke", { host, by: myId, stroke: q.s, page: q.page }); }
    }
  }
  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => { if (host) sendDigest(); else resendPending(); }, host ? 2000 : 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, readOnly]);
  const liveStatus = useLiveStatus();
  const liveRef = useRef(liveStatus); liveRef.current = liveStatus;
  const lastHostAt = useRef(Date.now()); // when the teacher's board was last heard from

  // Teacher: collect learners' writing that came by the backup route.
  const inboxSince = useRef("");
  useEffect(() => {
    if (!host || readOnly || !sessionId || lessonId) return;
    let stop = false;
    const pull = async () => {
      const r = await fetch(`/api/live-sessions/inbox?id=${sessionId}${inboxSince.current ? `&since=${encodeURIComponent(inboxSince.current)}` : ""}`).catch(() => null);
      if (stop || !r) return;
      if (r.status === 501) { stop = true; return; } // table not set up yet — nothing to collect
      const j = r.ok ? await r.json().catch(() => null) : null;
      const items = (j?.items ?? []) as { item_id: string; kind: string; sender: string; page: number; item: unknown; at: string }[];
      if (!items.length) return;
      const acks: string[] = [];
      for (const row of items) {
        inboxSince.current = row.at;
        const st = cleanStroke(row.item); if (!st || String(st.by) !== row.sender) continue;
        const n = Math.max(0, Math.min(BOARD_MAX_PAGES - 1, row.page)); ensurePage(n);
        const list = pages.current[n], i = list.findIndex((x) => x.id === st.id);
        if (row.kind === "add" && i < 0) list.push(st);
        else if (row.kind === "move" && i >= 0 && list[i].by === st.by && list[i].kind === st.kind) list[i] = st;
        acks.push(st.id);
        send("board-stroke", { host: true, stroke: list.find((x) => x.id === st.id) ?? st, page: n }); // pass it on to everyone else
      }
      if (acks.length) { send("board-ack", { host: true, ids: acks }); redraw(); scheduleSave(); }
    };
    const t = setInterval(pull, 2500); void pull();
    return () => { stop = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, readOnly, sessionId, lessonId]);

  // Learner: when the live connection is down — or the teacher has gone quiet
  // (their connection may be the one that dropped) — follow the teacher's saved
  // board instead, keeping anything they've written that isn't in it yet.
  useEffect(() => {
    if (host || readOnly || !sessionId || lessonId) return;
    const wentDown = liveStatus === "live" ? null : setTimeout(() => reportProblem("live-offline", { sessionId, role: "learner", message: String(liveStatus) }), 8000);
    const t = setInterval(async () => {
      if (liveRef.current === "live" && Date.now() - lastHostAt.current < 9000) return;
      const j = await fetch(`/api/live-sessions?id=${sessionId}&board=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!j?.board) return;
      const b = cleanBoard(j.board);
      const mine = [...pending.current.values()];
      for (const q of mine) { const pg = b.pages[q.page]; if (pg && !pg.some((x) => x.id === q.s.id)) pg.push(q.s); }
      pages.current = b.pages; setPapers(b.paper); setBgs(b.bg); setPageCount(b.pages.length); redraw();
    }, 4000);
    return () => { if (wentDown) clearTimeout(wentDown); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStatus, host, readOnly, sessionId, lessonId]);

  // Load the saved board, then ask the host for anything newer.
  useEffect(() => {
    let cancelled = false;
    const url = lessonId ? `/api/board-lessons?id=${lessonId}` : `/api/live-sessions?id=${sessionId}&board=1`;
    fetch(url).then((r) => r.json()).then((j) => {
      const saved = lessonId ? j?.lesson?.board : j?.board;
      if (cancelled || saved == null) return;
      if (pages.current.every((pg) => !pg.length)) {
        const b = cleanBoard(saved);
        pages.current = b.pages; setPapers(b.paper); setBgs(b.bg); setPageCount(b.pages.length); redraw();
        if (lessonId && j.lesson.widgets) setWidgets(cleanWidgets(j.lesson.widgets));
      }
    }).catch(() => {});
    const t = !host && !readOnly ? setTimeout(() => send("board-sync-req"), 900) : null;
    return () => { cancelled = true; if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, lessonId]);

  // ── Laser pointer: a fading trail, never saved ──
  const laserRaf = useRef(0);
  const kickLaser = useCallback(() => {
    if (laserRaf.current) return;
    const tick = () => {
      const c = laserRef.current, ctx = c?.getContext("2d");
      if (!c || !ctx) { laserRaf.current = 0; return; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.setTransform(...viewMatrix(viewRef.current, c.width, c.height));
      const now = Date.now();
      for (const [k, l] of lasers.current) {
        const age = now - l.at;
        if (age > 1500) { lasers.current.delete(k); continue; }
        ctx.save();
        ctx.globalAlpha = 1 - age / 1500; ctx.strokeStyle = l.color; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.shadowColor = l.color; ctx.shadowBlur = 12; ctx.lineWidth = Math.max(3, c.width / 260);
        ctx.beginPath();
        for (let i = 0; i + 1 < l.pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, l.pts[i] * c.width, l.pts[i + 1] * c.height);
        ctx.stroke(); ctx.restore();
      }
      laserRaf.current = lasers.current.size ? requestAnimationFrame(tick) : 0;
    };
    laserRaf.current = requestAnimationFrame(tick);
  }, []);
  useEffect(() => () => cancelAnimationFrame(laserRaf.current), []);

  // ── Drawing ──
  function point(e: { clientX: number; clientY: number }): [number, number] {
    const [sx, sy] = localPoint(canvasRef.current!, e.clientX, e.clientY);
    const [x, y] = toBoard(viewRef.current, sx, sy);
    return [roundPt(x), roundPt(y)];
  }
  const screenPt = (e: { clientX: number; clientY: number }): [number, number] => localPoint(canvasRef.current!, e.clientX, e.clientY);
  // Change the view. Mine = I moved it myself (a learner stops following the tutor).
  function setView(v: View, mine = true) {
    viewRef.current = v; setViewState(v);
    if (mine && !host && !readOnly) setFollow(false);
    if (host && !readOnly) {
      const now = Date.now();
      if (now - lastView.current > 120) { lastView.current = now; send("board-view", { host: true, view: v }); }
      else setTimeout(() => { if (viewRef.current === v) send("board-view", { host: true, view: v }); }, 140);
    }
  }
  function followTutor() { setFollow(true); setView(hostView.current, false); }
  const newId = () => `${myId.slice(0, 8)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  function commit(s: Stroke) {
    if (s.t == null) s.t = Date.now(); // when it was made, for replay
    const n = pageRef.current; ensurePage(n);
    pages.current[n].push(s); redoStack.current = [];
    send("board-stroke", { host, stroke: s, page: n });
    if (!host) pending.current.set(s.id, { s, page: n, at: Date.now(), first: Date.now(), tries: 0 });
    redraw(); scheduleSave();
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    // Two fingers: zoom and move instead of drawing.
    const g = gesture.current;
    if (e.isPrimary) { g.pts.clear(); g.start = undefined; g.pan = undefined; } // a fresh touch: nothing else is down
    if (e.pointerType === "touch") g.pts.set(e.pointerId, screenPt(e));
    if (g.pts.size === 2) {
      e.currentTarget.setPointerCapture(e.pointerId);
      cancelDrawing();
      const [a, b] = [...g.pts.values()];
      g.start = { view: viewRef.current, a, b }; g.pan = undefined;
      return;
    }
    if (tool === "hand" || !drawOk) {
      if (!isHome(viewRef.current)) { e.currentTarget.setPointerCapture(e.pointerId); g.pan = { view: viewRef.current, at: screenPt(e) }; }
      return;
    }
    if (edit) return;
    const [x, y] = point(e);
    // Keep the browser from moving focus off the text box we're about to open.
    if (tool === "text" || tool === "note") { e.preventDefault(); setEdit({ kind: tool, x, y, value: "" }); return; }
    if (tool === "math") {
      e.preventDefault();
      const hit = hitTest(pages.current[pageRef.current] ?? [], x, y);
      const old = hit?.kind === "math" && (host || hit.by === myId) ? hit : null;
      setEdit(old ? { kind: "math", x: old.pts[0], y: old.pts[1], value: old.text ?? "", replace: old } : { kind: "math", x, y, value: "" });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "select") {
      const hit = hitTest(pages.current[pageRef.current] ?? [], x, y);
      const mine = hit && (host || hit.by === myId || isAnswerCard(hit)) ? hit : null;
      select(mine);
      dragRef.current = mine ? { orig: mine, sx: x, sy: y, moved: false } : null;
      return;
    }
    if (tool === "stamp") { commit({ id: newId(), by: myId, kind: "stamp", color: STAMP_LOOK[stamp].bg, w: size, pts: [x, y], text: stamp }); return; }
    if (tool === "laser") { lasers.current.set(myId, { pts: [x, y], at: Date.now(), color: "#EF4444" }); kickLaser(); return; }
    const kind: ItemKind = tool === "eraser" ? "pen" : (tool as ItemKind);
    liveSent.current = 0;
    drawing.current = { id: newId(), by: myId, color: tool === "hl" && color === "#0B1220" ? "#FACC15" : color, w: size, erase: tool === "eraser", pts: isBoxTool(tool) ? [x, y, x, y] : [x, y], ...(kind !== "pen" ? { kind } : {}), ...((fill && FILLABLE.includes(tool as ItemKind)) || tool === "cover" ? { fill: true } : {}), t: Date.now() };
    if (tool === "cover" && /^#(f|e)/i.test(color)) drawing.current.color = "#1657C9"; // a light colour wouldn't hide anything
    redraw();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const now = Date.now();
    const g = gesture.current;
    if (g.pts.has(e.pointerId)) g.pts.set(e.pointerId, screenPt(e));
    if (g.start && g.pts.size >= 2) {
      const [a, b] = [...g.pts.values()];
      setView(pinch(g.start.view, g.start.a, g.start.b, a, b));
      return;
    }
    if (g.pan && e.buttons) {
      const [sx, sy] = screenPt(e);
      setView(panBy(g.pan.view, sx - g.pan.at[0], sy - g.pan.at[1]));
      return;
    }
    const dr = dragRef.current;
    if (dr && e.buttons) {
      const [x, y] = point(e);
      const moved = moveItem(dr.orig, x - dr.sx, y - dr.sy);
      if (moved.mark) delete moved.mark; // a moved card hasn't been checked yet
      dr.moved = true;
      replaceItem(moved);
      if (now - lastSent.current > streamEvery) { lastSent.current = now; send("board-update", { host, by: myId, stroke: moved, page: pageRef.current }); }
      return;
    }
    if (tool === "laser" && lasers.current.has(myId) && e.buttons) {
      const l = lasers.current.get(myId)!; l.pts.push(...point(e)); l.at = now; l.pts = l.pts.slice(-300); kickLaser();
      if (now - lastLaser.current > streamEvery) { lastLaser.current = now; send("board-laser", { by: myId, pts: l.pts, page: pageRef.current, color: l.color }); }
      return;
    }
    const d = drawing.current;
    if (!d) return;
    const shape = isBoxTool(tool);
    if (shape) { const [x, y] = point(e); d.pts[2] = x; d.pts[3] = y; }
    else {
      // A pen or stylus reports more points than there are screen frames; the
      // browser hands them over together. Use them all so quick writing stays round.
      const native = e.nativeEvent as PointerEvent;
      const all = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
      let added = false;
      for (const ev of all.length ? all : [e]) {
        const [x, y] = point(ev);
        // Skip points too close to the last one: the same line, far less to send.
        const L = d.pts.length;
        if (Math.hypot(x - d.pts[L - 2], (y - d.pts[L - 1]) * (BOARD_H / BOARD_W)) < 0.0015) continue;
        d.pts.push(x, y); added = true;
      }
      if (!added) return;
    }
    redrawInk();
    if (now - lastLive.current > streamEvery) {
      lastLive.current = now;
      const { pts, ...head } = d;
      const start = shape ? 0 : liveSent.current;
      send("board-live", { host, stroke: head, page: pageRef.current, start, pts: shape ? pts : pts.slice(start) });
      liveSent.current = pts.length;
    }
  }
  function up(e?: React.PointerEvent<HTMLCanvasElement>) {
    const g = gesture.current;
    if (e) g.pts.delete(e.pointerId);
    if (g.start || g.pan) { if (g.pts.size < 2) g.start = undefined; if (!g.pts.size) g.pan = undefined; return; }
    const dr = dragRef.current;
    if (dr) {
      dragRef.current = null;
      if (!dr.moved && host && dr.orig.kind === "cover") { // tap a cover box to reveal / hide what's under it
        const flipped = { ...dr.orig, fill: !dr.orig.fill };
        replaceItem(flipped);
        send("board-update", { host, by: myId, stroke: flipped, page: pageRef.current }); scheduleSave();
        return;
      }
      if (dr.moved && selRef.current) {
        send("board-update", { host, by: myId, stroke: selRef.current, page: pageRef.current }); scheduleSave();
        if (!host) pending.current.set(selRef.current.id, { s: selRef.current, page: pageRef.current, at: Date.now(), first: Date.now(), tries: 0, move: true });
      }
      return;
    }
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    if (s.kind && isBoxTool(s.kind) && Math.hypot(s.pts[2] - s.pts[0], s.pts[3] - s.pts[1]) < 0.004) { redraw(); return; }
    const tidy = neat && tool === "pen" ? recognizeShape(s) : null;
    commit(tidy ? tidy.item : s); // same id, so everyone's preview of the rough line is replaced
  }
  // A second finger arrived: drop the line just started (and tell the others).
  function cancelDrawing() {
    const d = drawing.current;
    if (d) { drawing.current = null; if (liveSent.current) send("board-live-cancel", { id: d.id }); redraw(); }
    dragRef.current = null;
    const l = lasers.current.get(myId); if (l) l.pts = l.pts.slice(0, 2);
  }
  function finishEdit() {
    if (!edit) return;
    const text = edit.value.trim();
    if (edit.kind === "math") {
      const old = edit.replace;
      if (old) { // take the old equation off first
        const n = pageRef.current;
        pages.current[n] = (pages.current[n] ?? []).filter((x) => x.id !== old.id);
        send("board-undo", { id: old.id, page: n, host, by: myId }); pending.current.delete(old.id);
      }
      if (text) commit({ id: newId(), by: myId, kind: "math", color: old?.color ?? color, w: old?.w ?? size, pts: [edit.x, edit.y], text, t: Date.now() });
      else if (old) { redraw(); scheduleSave(); }
      setEdit(null);
      return;
    }
    if (text) commit({ id: newId(), by: myId, kind: edit.kind, color: edit.kind === "note" ? noteColor : color, w: size, pts: [edit.x, edit.y], text: edit.value, t: Date.now() });
    setEdit(null);
  }
  // ── Selecting, moving, copying and deleting items ──
  function select(s: Stroke | null) { selRef.current = s; setSelected(s); redraw(); }
  function replaceItem(s: Stroke, front = false) {
    const n = pageRef.current, list = pages.current[n] ?? [];
    const i = list.findIndex((x) => x.id === s.id);
    if (i < 0) return;
    if (front) { list.splice(i, 1); list.push(s); } else list[i] = s;
    selRef.current = s; setSelected(s); redraw();
  }
  function deleteSelected() {
    const s = selRef.current; if (!s) return;
    const n = pageRef.current;
    pages.current[n] = (pages.current[n] ?? []).filter((x) => x.id !== s.id);
    redoStack.current.push(s);
    send("board-undo", { id: s.id, page: n, host, by: myId }); pending.current.delete(s.id);
    select(null); scheduleSave();
  }
  function scaleSelected(k: number) {
    const s = selRef.current; if (!s) return;
    const next = scaleItem(s, k);
    replaceItem(next);
    send("board-update", { host, by: myId, stroke: next, page: pageRef.current }); scheduleSave();
  }
  // A picture on the board: uploaded like a slide, then an item you can move and resize.
  async function addPicture(list: FileList | null) {
    const file = list?.[0];
    if (picInput.current) picInput.current.value = "";
    if (!file) return;
    setSlideBusy(true); setNotice("Adding the picture…");
    try {
      const { url, ratio } = await sendPicture(uploadTarget, file, setNotice);
      if (!isSlideUrl(url)) { setNotice("Couldn't add the picture — please try again."); reportProblem("upload-failed", { sessionId, role: host ? "teacher" : "learner", message: "picture: no address" }); return; }
      // 40% of the board wide (less for tall pictures), centred.
      let pw = 0.4, ph = pw * ratio * (BOARD_W / BOARD_H);
      if (ph > 0.7) { pw *= 0.7 / ph; ph = 0.7; }
      const item: Stroke = { id: newId(), by: myId, kind: "image", color: "#000000", w: 1, text: url,
        pts: [roundPt(0.5 - pw / 2), roundPt(0.5 - ph / 2), roundPt(0.5 + pw / 2), roundPt(0.5 + ph / 2)] };
      commit(item);
      if (tool === "select") select(item); else { selectNext.current = item; setTool("select"); }
      setNotice("Picture added — drag to move, use − and + to resize");
    } catch (e) { reportProblem("upload-failed", { sessionId, role: host ? "teacher" : "learner", message: `picture: ${e instanceof Error ? e.message : e}` }); setNotice(`Couldn't add the picture${e instanceof Error && e.message ? ` (${e.message})` : ""} — please try again.`); } finally { setSlideBusy(false); }
  }
  function insertSymbol(sym: string) {
    if (!edit) return;
    const ta = editRef.current, at = ta?.selectionStart ?? edit.value.length, end = ta?.selectionEnd ?? at;
    setEdit({ ...edit, value: edit.value.slice(0, at) + sym + edit.value.slice(end) });
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(at + sym.length, at + sym.length); });
  }
  function duplicateSelected() {
    const s = selRef.current; if (!s) return;
    const copy = moveItem({ ...s, id: newId(), by: myId }, 0.03, 0.03);
    commit(copy); select(copy);
  }
  function frontSelected() {
    const s = selRef.current; if (!s) return;
    replaceItem(s, true);
    send("board-update", { host, by: myId, stroke: s, page: pageRef.current, front: true }); scheduleSave();
  }
  // Changing tool or page drops the selection (unless an item asked to be selected next).
  const selectNext = useRef<Stroke | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { select(selectNext.current); selectNext.current = null; }, [tool, page]);

  // ── Lesson templates: drawn as ordinary items on the page (a fresh one if this page is in use) ──
  function insertTemplate(id: string) {
    if (!isTemplate(id)) return;
    insertItems(templateItems(id, myId, newId()));
  }
  // Put ready-made items (a template or an activity) on this page, or a fresh one if this page is in use.
  function insertItems(items: Stroke[]) {
    if (!items.length) return;
    let n = pageRef.current, count = pageCount, list = papersRef.current;
    if ((pages.current[n] ?? []).length) {
      if (pageCount >= BOARD_MAX_PAGES) { setNotice(`This board is full (${BOARD_MAX_PAGES} pages)`); return; }
      n = pageCount; count = pageCount + 1; ensurePage(n);
      list = [...papersRef.current];
      while (list.length < count) list.push("plain");
      list[n] = "plain";
      setPageCount(count); setPapers(list);
    }
    const now = Date.now();
    for (const s of items) { s.t = now; pages.current[n].push(s); send("board-stroke", { host, stroke: s, page: n }); }
    if (n !== pageRef.current) goPage(n, count, list);
    redraw(); scheduleSave();
  }

  // Mark every answer card on this page: right zone, wrong zone, or not placed yet.
  function checkAnswers(clear = false) {
    const n = pageRef.current, list = pages.current[n] ?? [];
    const marks = checkCards(list);
    if (!marks.size) { setNotice("There are no activity cards on this page."); return; }
    let ok = 0, placed = 0;
    list.forEach((c, i) => {
      if (!marks.has(c.id)) return;
      const m = clear ? undefined : marks.get(c.id);
      if (m) placed++; if (m === "ok") ok++;
      if (c.mark === m) return;
      const next = { ...c }; if (m) next.mark = m; else delete next.mark;
      list[i] = next;
      send("board-update", { host, by: myId, stroke: next, page: n });
    });
    redraw(); scheduleSave();
    setNotice(clear ? "Marks cleared" : `${ok} of ${marks.size} right${placed < marks.size ? ` · ${marks.size - placed} not placed yet` : ""}`);
  }

  function undo() {
    const n = pageRef.current, list = pages.current[n] ?? [];
    const mine = [...list].reverse().find((s) => s.by === myId);
    if (!mine) return;
    pages.current[n] = list.filter((s) => s.id !== mine.id);
    redoStack.current.push(mine);
    send("board-undo", { id: mine.id, page: n, host, by: myId }); pending.current.delete(mine.id); redraw(); scheduleSave();
  }
  function redo() {
    const s = redoStack.current.pop();
    if (!s) return;
    const n = pageRef.current; ensurePage(n); pages.current[n].push(s);
    send("board-stroke", { host, stroke: s, page: n }); redraw(); scheduleSave();
  }

  // ── Host controls ──
  function clearPage() {
    if (!confirm("Clear this page for everyone?")) return;
    const n = pageRef.current; pages.current[n] = []; live.current.clear();
    send("board-clear", { host: true, page: n }); redraw(); scheduleSave();
  }
  function changePaper(p: Paper) {
    const n = pageRef.current;
    setPapers((ps) => { const next = [...ps]; while (next.length <= n) next.push("plain"); next[n] = p; return next; });
    if (paperIsDark(p) && color === "#0B1220") setColor("#FFFFFF");
    if (!paperIsDark(p) && color === "#FFFFFF") setColor("#0B1220");
    send("board-paper", { host: true, paper: p, page: n }); scheduleSave();
  }
  function goPage(n: number, count = pageCount, paperList = papersRef.current, bgList = bgsRef.current) {
    const to = Math.max(0, Math.min(count - 1, n));
    setPage(to); redoStack.current = [];
    if (host) send("board-page", { host: true, page: to, count, paper: paperList, bg: bgList });
  }
  // Remove a whole page (its drawing, paper and slide). The last page is just emptied.
  function dropPage(n: number) {
    const count = pages.current.length;
    if (count <= 1) { pages.current = [[]]; setPapers(["plain"]); setBgs([null]); setPageCount(1); setPage(0); redraw(); return; }
    pages.current.splice(n, 1);
    setPapers((ps) => ps.filter((_, i) => i !== n));
    setBgs((bs) => bs.filter((_, i) => i !== n));
    setPageCount(count - 1);
    setPage((cur) => Math.max(0, Math.min(count - 2, cur > n ? cur - 1 : cur)));
    live.current.clear(); redraw();
  }
  function deletePage() {
    if (!confirm(pageCount > 1 ? `Delete page ${page + 1} for everyone?` : "Empty this page for everyone?")) return;
    const n = pageRef.current;
    dropPage(n);
    send("board-delpage", { host: true, page: n }); scheduleSave();
  }

  // Remove every uploaded slide page in one go (with anything written on it);
  // pages without a slide stay. Everyone's board follows.
  function removeAllSlides() {
    const n = bgsRef.current.filter(Boolean).length;
    if (!n || !confirm(`Remove all ${n} slide page${n === 1 ? "" : "s"} for everyone? Anything written on ${n === 1 ? "it" : "them"} goes too — your other pages stay.`)) return;
    const urls = bgsRef.current.filter((b): b is string => !!b);
    const keep = bgsRef.current.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0 && i < pages.current.length);
    const next = keep.length ? keep.map((i) => [...(pages.current[i] ?? [])]) : [[]];
    const paperList = keep.length ? keep.map((i) => papersRef.current[i] ?? "plain") : ["plain" as Paper];
    const bgList: (string | null)[] = next.map(() => null);
    pages.current = next; papersRef.current = paperList; bgsRef.current = bgList;
    setPapers(paperList); setBgs(bgList); setPageCount(next.length); setPage(0); pageRef.current = 0;
    live.current.clear(); redoStack.current = []; select(null);
    redraw(); pushAll(0); scheduleSave();
    setNotice(`${n} slide page${n === 1 ? "" : "s"} removed`);
    // Clear the pictures from storage too (the server keeps any a saved lesson still uses).
    fetch("/api/live-sessions/slides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...uploadTarget, urls }) }).catch(() => {});
  }

  // ── Slides: a PowerPoint saved as PDF (or pictures), one board page per slide ──
  async function addSlides(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (slideInput.current) slideInput.current.value = "";
    if (!files.length) return;
    if (files.some(isPowerPoint)) { setNotice("In PowerPoint choose File → Save As → PDF, then upload the PDF."); return; }
    const here = pageRef.current;
    const reuse = !(pages.current[here] ?? []).length && !bgsRef.current[here];
    const start = reuse ? here : pageCount;
    const room = Math.min(MAX_SLIDES, BOARD_MAX_PAGES - start);
    if (room <= 0) { setNotice(`This board is full (${BOARD_MAX_PAGES} pages) — remove the slides or delete some pages first.`); return; }
    setSlideBusy(true);
    try {
      const sent = await sendSlides(uploadTarget, files, room, setNotice);
      if (!sent.length) { setNotice("Choose a PDF or pictures (JPG, PNG)."); return; }
      const urls = sent.filter(isSlideUrl);
      if (!urls.length) { reportProblem("upload-failed", { sessionId, role: "teacher", message: `slides: none of ${sent.length} uploaded` }); setNotice("Couldn't upload the slides — check the internet and try again."); return; }
      const missed = sent.length - urls.length;
      if (missed) reportProblem("upload-partial", { sessionId, role: "teacher", message: `${missed} of ${sent.length} slides didn't upload` });
      const count = Math.max(pageCount, start + urls.length);
      ensurePage(count - 1);
      const paperList = [...papersRef.current], bgList = [...bgsRef.current];
      while (paperList.length < count) paperList.push("plain");
      while (bgList.length < count) bgList.push(null);
      urls.forEach((u, i) => { bgList[start + i] = u; paperList[start + i] = "plain"; });
      setPageCount(count); setPapers(paperList); setBgs(bgList);
      bgsRef.current = bgList; papersRef.current = paperList;
      goPage(start, count, paperList, bgList);
      scheduleSave();
      setNotice(missed
        ? `${urls.length} of ${sent.length} slides added — ${missed} didn't upload (weak connection). Upload the PDF again to add them.`
        : `${urls.length} slide${urls.length === 1 ? "" : "s"} added — draw on them like a whiteboard`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const unreadable = /password|invalid pdf|corrupt|format error|unexpected/i.test(msg);
      reportProblem(unreadable ? "pdf-unreadable" : "upload-failed", { sessionId, role: "teacher", message: `slides: ${msg}`, extra: { files: files.length, mb: Math.round(files.reduce((a, f) => a + f.size, 0) / 1e5) / 10 } });
      setNotice(/password/i.test(msg) ? "That PDF is password-protected — save a copy without a password and upload that."
        : /invalid pdf|corrupt|format error|unexpected/i.test(msg) ? "Couldn't read that file — open it and save it again as PDF."
        : `Couldn't upload the slides${msg ? ` (${msg})` : ""} — check the internet and try again.`);
    } finally { setSlideBusy(false); }
  }
  // A group's work (or anything else) onto a new page of the board, for everyone.
  function addBoardPage(items: Stroke[], label: string) {
    const count = pages.current.length;
    if (count >= BOARD_MAX_PAGES) { setNotice(`The board is full (${BOARD_MAX_PAGES} pages) — remove a page first.`); return; }
    pages.current = [...pages.current, items];
    const list = [...papersRef.current, "plain" as Paper], bgList = [...bgsRef.current, null];
    papersRef.current = list; bgsRef.current = bgList;
    setPageCount(count + 1); setPapers(list); setBgs(bgList);
    goPage(count, count + 1, list, bgList);
    redraw(); pushAll(count); scheduleSave();
    setNotice(`${label}'s work is on page ${count + 1}`);
  }
  function addPage() {
    if (pageCount >= BOARD_MAX_PAGES) return;
    ensurePage(pageCount);
    const count = pageCount + 1, list = [...papersRef.current];
    while (list.length < count) list.push(papersRef.current[page] ?? "plain");
    const bgList = [...bgsRef.current];
    while (bgList.length < count) bgList.push(null);
    setPageCount(count); setPapers(list); setBgs(bgList);
    goPage(count - 1, count, list, bgList); scheduleSave();
  }
  function updateWidgets(next: Widgets, final = false) {
    setWidgets(next); widgetsRef.current = next;
    if (lessonId && final) scheduleSave();
    const now = Date.now();
    if (final || now - lastSent.current > 60) { lastSent.current = now; send("board-widgets", { host: true, widgets: next }); }
  }
  function openTool(k: ClassTool) {
    const w = widgetsRef.current;
    const names = people.filter((p) => p.online !== false).map((p) => p.name);
    const next: Widgets = k === "timer" ? { ...w, timer: w.timer ?? { ...startTimer(60, 0), endsAt: null } }
      : k === "dice" ? { ...w, dice: { values: [1 + Math.floor(Math.random() * 6)], at: Date.now() } }
        : k === "picker" ? { ...w, picker: { name: names.length ? names[Math.floor(Math.random() * names.length)] : "No learners here yet", at: Date.now() } }
          : k === "shade" ? { ...w, shade: { on: !w.shade.on, pct: w.shade.pct } }
            : { ...w, [k]: { ...(w[k] as { on: boolean }), on: !(w[k] as { on: boolean }).on } };
    updateWidgets(next, true); setToolsOpen(false);
  }

  // ── Full screen (the whole laptop screen), with a fallback where it isn't allowed ──
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  // Phones: full screen is always landscape — locked where the browser allows
  // it (Android), otherwise the board is turned sideways while held upright.
  const [screenSize, setScreenSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on); window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  const turned = full && screenSize.h > screenSize.w && screenSize.w < 768;
  const lockLandscape = () => { try { (screen.orientation as any)?.lock?.("landscape")?.catch?.(() => {}); } catch {} };
  const unlock = () => { try { screen.orientation?.unlock?.(); } catch {} };
  useEffect(() => { if (!full) unlock(); }, [full]);
  function toggleFull() {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (full) { setFull(false); return; }
    if (el.requestFullscreen) el.requestFullscreen().then(lockLandscape).catch(() => setFull(true)); else setFull(true);
  }

  // Keyboard shortcuts (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (document.querySelector("[data-board-overlay]")) return; // the lab is open on top of the board
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (drawOk) (e.shiftKey ? redo : undo)(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); if (drawOk) redo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selRef.current) { e.preventDefault(); deleteSelected(); return; }
      if (e.key === "Escape" && overview) { setOverview(false); return; }
      if (e.key === "Escape" && selRef.current) { select(null); return; }
      if (e.key === "Escape" && full && !document.fullscreenElement) { setFull(false); return; }
      // Like presenting slides: arrow keys / clicker buttons turn the page (host).
      if ((host || readOnly) && !selRef.current && ["ArrowRight", "ArrowDown", "PageDown", "ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault(); goPage(pageRef.current + (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key) ? 1 : -1)); return;
      }
      if (e.key.toLowerCase() === "f" && rootRef.current?.contains(document.activeElement ?? null)) { toggleFull(); return; }
      if (e.key === "+" || e.key === "=") { setView(zoomAt(viewRef.current, 1.25)); return; }
      if (e.key === "-" || e.key === "_") { setView(zoomAt(viewRef.current, 0.8)); return; }
      if (e.key === "0") { setView(HOME); return; }
      const hit = TOOLS.find((x) => x.key === e.key.toLowerCase());
      if (hit && drawOk && rootRef.current?.contains(document.activeElement ?? null)) { setTool(hit.id); if (SHAPES.includes(hit.id)) setShape(hit.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The slide behind a page, drawn "contained" like on screen (skipped if it can't load).
  async function drawSlide(ctx: CanvasRenderingContext2D, url: string | null | undefined, W: number, H: number) {
    if (!url) return;
    const img = await new Promise<HTMLImageElement | null>((ok) => {
      const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url;
    });
    if (!img) return;
    const k = Math.min(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  async function download() {
    const c = canvasRef.current;
    if (!c) return;
    const out = document.createElement("canvas"); out.width = c.width; out.height = c.height;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = paper === "chalk" ? "#1f3d2b" : paper === "dark" ? "#0B1220" : "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    await drawSlide(ctx, bgsRef.current[page], out.width, out.height);
    ctx.drawImage(c, 0, 0);
    try {
      const a = document.createElement("a"); a.href = out.toDataURL("image/png"); a.download = `novelia-board-page-${page + 1}.png`; a.click();
    } catch { setStatus("Couldn't save this page"); }
  }

  // Every page as one PDF (paper colour, no grid lines), for the class log or to share.
  async function downloadAll() {
    setNotice("Making the PDF…");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const W = BOARD_W, H = BOARD_H;
      const urls = new Set(pages.current.flat().filter((x) => x.kind === "image" && x.text).map((x) => x.text!));
      await Promise.all([...urls].map((u) => new Promise<void>((ok) => {
        const im = getImg(u); if (im) return ok();
        const el = imgCache.current.get(u)!; el.addEventListener("load", () => ok()); el.addEventListener("error", () => ok());
      })));
      for (let i = 0; i < pages.current.length; i++) {
        const ink = document.createElement("canvas"); ink.width = W; ink.height = H;
        drawStrokes(ink.getContext("2d")!, pages.current[i] ?? [], W, H, getImg);
        const out = document.createElement("canvas"); out.width = W; out.height = H;
        const ctx = out.getContext("2d")!;
        const pp = papersRef.current[i] ?? "plain";
        ctx.fillStyle = pp === "chalk" ? "#1f3d2b" : pp === "dark" ? "#0B1220" : "#ffffff"; ctx.fillRect(0, 0, W, H);
        await drawSlide(ctx, bgsRef.current[i], W, H);
        ctx.drawImage(ink, 0, 0);
        const png = await pdf.embedPng(out.toDataURL("image/png"));
        pdf.addPage([W / 2, H / 2]).drawImage(png, { x: 0, y: 0, width: W / 2, height: H / 2 });
      }
      const bytes = await pdf.save();
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = "novelia-board.pdf"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setNotice("PDF downloaded");
    } catch { setNotice("Couldn't make the PDF"); }
  }

  const btn = "flex h-10 min-w-[40px] shrink-0 items-center justify-center gap-1 rounded-xl px-2 text-sm font-bold transition";
  const idle = full ? "bg-white/10 text-white hover:bg-white/20" : "bg-ink/5 text-ink/75 hover:bg-ink/10";
  const on = "bg-[#1657C9] text-white";
  const sep = <span className={full ? "my-0.5 h-px w-full bg-white/15" : "mx-0.5 h-7 w-px bg-line"} aria-hidden />;
  const names = people.filter((p) => p.online !== false).map((p) => p.name);
  const cursor = tool === "hand" || (!drawOk && !isHome(view)) ? "cursor-grab" : !drawOk ? "" : tool === "text" || tool === "math" ? "cursor-text" : tool === "laser" || tool === "stamp" ? "cursor-pointer" : tool === "select" ? "cursor-default" : "cursor-crosshair";
  // Where the text box sits on screen (it follows the zoom).
  const [edX, edY] = edit ? toScreen(view, edit.x, edit.y) : [0, 0];
  const editStyle: CSSProperties | undefined = edit ? {
    left: `${edX * 100}%`, top: `${edY * 100}%`,
    ...(edit.kind === "note"
      ? { width: (NOTE_W * box.w * view.z) / BOARD_W, height: (NOTE_H * box.h * view.z) / BOARD_H, background: noteColor, color: "#1E1B4B", fontSize: (22 * box.w * view.z) / BOARD_W }
      : { minWidth: 180, maxWidth: `${Math.max(0.2, 1 - edX) * 100}%`, color, fontSize: (fontFor(size) * box.w * view.z) / BOARD_W }),
  } : undefined;
  const swatch = full ? "h-7 w-7" : "h-8 w-8";

  const isOn = (k: ClassTool) => k === "timer" || k === "dice" || k === "picker" ? widgets[k] != null : !!(widgets[k] as { on: boolean }).on;
  const activeTools = TOOL_GROUPS.reduce((n, g) => n + g.items.filter((i) => isOn(i.k)).length, 0);
  const toolsPanel = (
    <div role="dialog" aria-label="Class tools" className={`absolute z-[95] w-[400px] overflow-y-auto rounded-2xl bg-white p-3 text-ink shadow-2xl ring-1 ring-black/10 ${full ? "right-[88px] top-2 max-h-[calc(100%-16px)] max-w-[calc(100%-176px)] sm:right-[100px]" : "right-0 top-11 max-h-[75vh] max-w-[calc(100vw-24px)]"}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black">Class tools</p>
        <button type="button" onClick={() => setToolsOpen(false)} aria-label="Close class tools" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/50 hover:bg-ink/5"><BoardIcon name="close" className="h-4 w-4" /></button>
      </div>
      {TOOL_GROUPS.map((g) => (
        <div key={g.title} className="mb-2 last:mb-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-ink/45">{g.title}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {g.items.map((i) => {
              const act = isOn(i.k);
              return (
                <button key={i.k} type="button" onClick={() => openTool(i.k)} aria-pressed={act} title={i.hint}
                  className={`relative flex min-h-[70px] flex-col items-center justify-center gap-1 rounded-xl p-2 text-center text-[11px] font-bold leading-tight ring-1 transition ${act ? "bg-[#EEF6FF] text-[#1657C9] ring-[#1657C9]" : "bg-white text-ink/80 ring-line hover:bg-[#F5F9FF] hover:ring-[#BFD7FF]"}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${act ? "bg-[#1657C9] text-white" : "bg-[#EEF6FF] text-[#1657C9]"}`}><BoardIcon name={i.icon} /></span>
                  {i.label}
                  {act && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="mt-1 text-[11px] text-ink/45">Tap again to put a tool away. Everyone sees what you open.</p>
    </div>
  );

  // Drawing tools: a row above the board, or a rail down the left in full screen.
  const drawTools = drawOk && !readOnly ? (
    <>
      {MAIN_TOOLS.map((id) => {
        const isShape = id === "shapes", t = TOOLS.find((x) => x.id === (isShape ? shape : id))!;
        const active = isShape ? SHAPES.includes(tool) : tool === id;
        return (
          <button key={id} type="button" onClick={() => setTool(t.id)} aria-pressed={active}
            title={isShape ? "Shapes" : `${t.label} (${t.key.toUpperCase()})`} aria-label={isShape ? "Shapes" : t.label}
            className={`${btn} ${active ? on : idle}`}><BoardIcon name={t.icon} /></button>
        );
      })}
      {sep}
      {SHAPES.includes(tool) && (
        <>
          <div className={full ? "grid grid-cols-2 gap-1" : "flex flex-wrap items-center gap-1"} role="group" aria-label="Shapes">
            {SHAPES.map((id) => {
              const t = TOOLS.find((x) => x.id === id)!;
              return (
                <button key={id} type="button" onClick={() => { setShape(id); setTool(id); }} aria-pressed={tool === id} title={`${t.label} (${t.key.toUpperCase()})`} aria-label={t.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${tool === id ? "bg-[#38BDF8] text-[#0B1220]" : full ? "bg-white/5 text-white/80 hover:bg-white/15" : "bg-ink/5 text-ink/70 hover:bg-ink/10"}`}>
                  <BoardIcon name={t.icon} className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          {sep}
        </>
      )}
      {tool === "stamp" && (
        <>
          <div className={full ? "grid grid-cols-2 gap-1" : "flex flex-wrap items-center gap-1"} role="group" aria-label="Stamps">
            {STAMPS.map((id) => (
              <button key={id} type="button" onClick={() => setStamp(id)} aria-pressed={stamp === id} title={STAMP_LOOK[id].label} aria-label={`${STAMP_LOOK[id].label} stamp`}
                className={`${swatch} flex items-center justify-center rounded-full text-white ring-2 ring-offset-1 ${full ? "ring-offset-[#0B1220]" : ""} ${stamp === id ? "ring-[#38BDF8]" : "ring-transparent"}`} style={{ background: STAMP_LOOK[id].bg }}>
                <BoardIcon name={STAMP_LOOK[id].icon} className="h-4 w-4" />
              </button>
            ))}
          </div>
          {sep}
        </>
      )}
      <div className={`${full ? "grid grid-cols-2 gap-1" : "flex flex-wrap items-center gap-1"} ${tool === "stamp" || tool === "select" ? "hidden" : ""}`}>
        {tool === "note" ? NOTE_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setNoteColor(c)} aria-label={`Note colour ${c}`} aria-pressed={noteColor === c}
            className={`${swatch} rounded-md ring-2 ring-offset-1 ${noteColor === c ? "ring-[#1657C9]" : "ring-transparent"}`} style={{ background: c }} />
        )) : (
          <>
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => { setColor(c); if (tool === "eraser" || tool === "laser") setTool("pen"); }} aria-label={`Colour ${c}`} aria-pressed={color === c}
                className={`${swatch} rounded-full ring-2 ring-offset-1 ${full ? "ring-offset-[#0B1220]" : ""} ${color === c ? "ring-[#38BDF8]" : "ring-transparent"} ${c === "#FFFFFF" ? "border border-slate-300" : ""}`} style={{ background: c }} />
            ))}
            <label className={`relative ${swatch} cursor-pointer overflow-hidden rounded-full ring-1 ring-line`} title="Any colour" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}>
              <span className="sr-only">Pick any colour</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </>
        )}
      </div>
      {sep}
      {SIZES.map((sz) => (
        <button key={sz} type="button" onClick={() => setSize(sz)} aria-label={`Size ${sz}`} aria-pressed={size === sz} className={`${btn} w-10 ${size === sz ? on : idle}`}>
          <span className="rounded-full bg-current" style={{ width: Math.min(22, sz + 3), height: Math.min(22, sz + 3) }} />
        </button>
      ))}
      {tool === "pen" && (
        <button type="button" onClick={toggleNeat} aria-pressed={neat} title="Tidy big rough lines, circles, triangles and boxes into clean shapes"
          className={`${btn} ${neat ? on : idle} text-xs`}>{neat ? "Neat shapes: on" : "Neat shapes"}</button>
      )}
      {FILLABLE.includes(tool as ItemKind) && (
        <button type="button" onClick={() => setFill((f) => !f)} aria-pressed={fill} className={`${btn} ${fill ? on : idle} text-xs`}>{fill ? "Filled" : "Outline"}</button>
      )}
      {sep}
      <button type="button" onClick={undo} className={`${btn} ${idle}`} title="Undo (Ctrl+Z)" aria-label="Undo"><BoardIcon name="undo" /></button>
      <button type="button" onClick={redo} className={`${btn} ${idle}`} title="Redo (Ctrl+Y)" aria-label="Redo"><BoardIcon name="redo" /></button>
    </>
  ) : (
    <span className={`px-2 text-sm font-semibold ${full ? "text-center text-xs text-white/70" : "text-ink/55"}`}>{readOnly ? "Saved board" : "✋ Watching — the host can let you write."}</span>
  );

  const liveLight = liveStatus && !readOnly ? (
    <span role="status" title={liveStatus === "live" ? "Connected — everyone sees the board live" : "Reconnecting — your work is kept and will sync"}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${full ? "bg-white/10 text-white" : "bg-ink/5 text-ink/70"}`}>
      <span className={`h-2 w-2 rounded-full ${liveStatus === "live" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} aria-hidden />
      {liveStatus === "live" ? "Live" : liveStatus === "connecting" ? "Connecting" : "Reconnecting"}
    </span>
  ) : null;

  // Pages, background, class tools and the rest: right of the row, or a rail on the right.
  const hostTools = (
    <>
      {liveLight}
      <div className={`flex items-center gap-1 ${full ? "flex-col" : ""}`}>
        <button type="button" onClick={() => goPage(page - 1)} disabled={page === 0 || (!host && !readOnly)} className={`${btn} ${idle} disabled:opacity-30`} aria-label="Previous page"><BoardIcon name={full ? "up" : "prev"} /></button>
        <button type="button" onClick={() => setOverview(true)} disabled={!host && !readOnly} title="See all pages" aria-label={`Page ${page + 1} of ${pageCount} — see all pages`}
          className={`rounded-lg px-1.5 py-1 text-xs font-black tabular-nums disabled:cursor-default ${full ? "text-white hover:bg-white/10" : "text-ink/70 hover:bg-ink/5"}`} aria-live="polite">{full ? `${page + 1}/${pageCount}` : `Page ${page + 1}/${pageCount}`}</button>
        <button type="button" onClick={() => goPage(page + 1)} disabled={page >= pageCount - 1 || (!host && !readOnly)} className={`${btn} ${idle} disabled:opacity-30`} aria-label="Next page"><BoardIcon name={full ? "down" : "next"} /></button>
      </div>
      <div className={`flex items-center gap-1 ${full ? "flex-col" : ""}`} role="group" aria-label="Zoom">
        <button type="button" onClick={() => setView(zoomAt(view, 0.8))} disabled={isHome(view)} className={`${btn} ${idle} disabled:opacity-30`} title="Zoom out (−)" aria-label="Zoom out"><BoardIcon name="zoomout" /></button>
        <button type="button" onClick={() => setView(HOME)} title="Show the whole board (0)" aria-label={`Zoom ${Math.round(view.z * 100)}% — show the whole board`}
          className={`rounded-lg px-1 py-1 text-[11px] font-black tabular-nums ${full ? "text-white hover:bg-white/10" : "text-ink/70 hover:bg-ink/5"}`}>{Math.round(view.z * 100)}%</button>
        <button type="button" onClick={() => setView(zoomAt(view, 1.25))} disabled={view.z >= 5} className={`${btn} ${idle} disabled:opacity-30`} title="Zoom in (+)" aria-label="Zoom in"><BoardIcon name="zoomin" /></button>
        {!isHome(view) && (
          <button type="button" onClick={() => setTool("hand")} aria-pressed={tool === "hand"} className={`${btn} ${tool === "hand" ? on : idle}`} title="Move around (or drag with two fingers)" aria-label="Move around the board"><BoardIcon name="hand" /></button>
        )}
        {!host && !readOnly && !follow && (
          <button type="button" onClick={followTutor} className={`${btn} ${on} text-xs`} title="Show what the tutor is showing">{full ? <BoardIcon name="expand" /> : "Follow tutor"}</button>
        )}
      </div>
      {host && !readOnly && (
        <>
          <button type="button" onClick={addPage} disabled={pageCount >= BOARD_MAX_PAGES} className={`${btn} ${idle}`} title="Add a page" aria-label="Add a page"><BoardIcon name="plus" />{full ? "" : "Page"}</button>
          <button type="button" onClick={deletePage} className={`${btn} ${idle}`} title="Delete this page" aria-label="Delete this page"><BoardIcon name="pageminus" /></button>
          <button type="button" onClick={() => slideInput.current?.click()} disabled={slideBusy} className={`${btn} ${slideBusy ? on : idle} disabled:opacity-70`}
            title="Upload slides — a PowerPoint saved as PDF, or pictures" aria-label="Upload slides">
            <BoardIcon name="slides" />{full ? "" : slideBusy ? "Loading…" : "Slides"}
          </button>
          <input ref={slideInput} type="file" accept={SLIDE_ACCEPT} multiple hidden onChange={(e) => addSlides(e.target.files)} />
          {bgs.some(Boolean) && (
            <button type="button" onClick={removeAllSlides} disabled={slideBusy} className={`${btn} ${idle} disabled:opacity-70`}
              title="Remove all the uploaded slides (pages without slides stay)" aria-label="Remove all slides">
              <BoardIcon name="trash" />{full ? "" : "Remove slides"}
            </button>
          )}
          <button type="button" onClick={() => picInput.current?.click()} disabled={slideBusy} className={`${btn} ${idle} disabled:opacity-70`} title="Put a picture on the board" aria-label="Insert a picture">
            <BoardIcon name="image" />{full ? "" : "Picture"}
          </button>
          <input ref={picInput} type="file" accept={PICTURE_ACCEPT} hidden onChange={(e) => addPicture(e.target.files)} />
          {sep}
          <select value={paper} onChange={(e) => changePaper(e.target.value as Paper)} aria-label="Background" title="Background"
            className={`h-10 rounded-xl px-2 text-xs font-bold ${full ? "w-full bg-white/10 px-1 text-white" : "bg-ink/5 text-ink/75"}`}>
            {PAPERS.map((p) => <option key={p.id} value={p.id} className="text-ink">{p.label}</option>)}
          </select>
          {!lessonId && (
            <>
              <button type="button" onClick={() => setLessonsOpen(true)} className={`${btn} ${lessonsOpen ? on : idle}`} title="Open a prepared lesson, or keep this board as one" aria-label="Lesson library">
                <BoardIcon name="library" />{full ? "" : "Lessons"}
              </button>
              <button type="button" onClick={() => { setGamesUsed(true); setGamesOpen(true); }} className={`${btn} ${gamesOpen ? on : idle}`} title="Class games and ready-made quizzes for early years and primary (UK curriculum)" aria-label="Games and quizzes">
                <BoardIcon name="game" />{full ? "" : "Games"}
              </button>
              <button type="button" onClick={() => { setLabUsed(true); setLabOpen(true); }} className={`${btn} ${labOpen ? on : idle}`} title="Show an experiment from the laboratory, then annotate it on the board" aria-label="Laboratory">
                <BoardIcon name="flask" />{full ? "" : "Lab"}
              </button>
              <button type="button" onClick={() => setAnswersOpen(true)} className={`${btn} ${answersOpen ? on : idle}`} title="Every learner answers on their own small board" aria-label="Answer boards">
                <BoardIcon name="answers" />{full ? "" : "Answer boards"}
              </button>
              <button type="button" onClick={() => setExamOpen(true)} className={`${btn} ${examOpen ? on : idle}`} title="A timed test on every learner's phone, marked for you" aria-label="Exam mode">
                <BoardIcon name="exam" />{full ? "" : "Exam"}
              </button>
              <button type="button" onClick={() => setStarsOpen(true)} className={`${btn} ${starsOpen ? on : idle}`} title="Stars and badges across your classes" aria-label="Leaderboard">
                <BoardIcon name="trophy" />{full ? "" : "Leaderboard"}
              </button>
              <button type="button" onClick={() => setPollOpen(true)} className={`${btn} ${pollOpen ? on : idle}`} title="Ask a quick question — learners tap a choice" aria-label="Quick poll">
                <BoardIcon name="poll" />{full ? "" : "Poll"}
              </button>
              <button type="button" onClick={() => setGroupsOpen(true)} className={`${btn} ${groupsOpen ? on : idle}`} title="Split the class into groups, each with its own board" aria-label="Group boards">
                <BoardIcon name="groups" />{full ? "" : "Groups"}
              </button>
            </>
          )}
          <div className={full ? "" : "relative"}>
            <button type="button" onClick={() => setToolsOpen((v) => !v)} aria-expanded={toolsOpen} title="Class tools" aria-label="Class tools" className={`${btn} ${toolsOpen ? on : idle}`}>
              <BoardIcon name="toolbox" />{full ? "" : "Class tools"}{activeTools > 0 && <span className="ml-0.5 rounded-full bg-[#38BDF8] px-1.5 text-[10px] font-black text-[#0B1220]">{activeTools}</span>}
            </button>
            {toolsOpen && !full && toolsPanel}
          </div>
          <button type="button" onClick={clearPage} className={`${btn} ${idle}`} title="Clear page" aria-label="Clear page"><BoardIcon name="trash" />{full ? "" : "Clear"}</button>
          {canLog && <button type="button" onClick={() => persist(true)} className={`${btn} bg-emerald-600 text-white`} title="Save to lesson log" aria-label="Save to lesson log"><BoardIcon name="save" />{full ? "" : "Save to log"}</button>}
        </>
      )}
      {sep}
      {host && !readOnly && (
        <select value="" onChange={(e) => { insertTemplate(e.target.value); e.target.value = ""; }} aria-label="Add a lesson template" title="Lesson templates"
          className={`h-10 rounded-xl px-2 text-xs font-bold ${full ? "w-full bg-white/10 px-1 text-white" : "bg-ink/5 text-ink/75"}`}>
          <option value="" className="text-ink">{full ? "Template" : "Templates…"}</option>
          {TEMPLATES.map((t) => <option key={t.id} value={t.id} className="text-ink">{t.label}</option>)}
        </select>
      )}
      {host && !readOnly && (
        <select value="" aria-label="Activities" title="Activities learners do on the board"
          onChange={(e) => {
            const v = e.target.value; e.target.value = "";
            if (v === "sorting" || v === "matching") setActivity(v);
            else if (v === "cover") setTool("cover");
            else if (v === "check") checkAnswers();
            else if (v === "clear") checkAnswers(true);
          }}
          className={`h-10 rounded-xl px-2 text-xs font-bold ${full ? "w-full bg-white/10 px-1 text-white" : "bg-ink/5 text-ink/75"}`}>
          <option value="" className="text-ink">{full ? "Activity" : "Activities…"}</option>
          <option value="sorting" className="text-ink">Sorting cards…</option>
          <option value="matching" className="text-ink">Matching cards…</option>
          <option value="cover" className="text-ink">Cover &amp; reveal box</option>
          <option value="check" className="text-ink">✓ Check answers</option>
          <option value="clear" className="text-ink">Clear marks</option>
        </select>
      )}
      {readOnly && (
        <button type="button" onClick={() => setReplay(true)} className={`${btn} ${on}`} title="Watch the board being written again" aria-label="Replay the board">
          <BoardIcon name="replay" />{full ? "" : "Replay"}
        </button>
      )}
      <button type="button" onClick={download} className={`${btn} ${idle}`} title="Download this page" aria-label="Download this page as an image"><BoardIcon name="download" /></button>
      <button type="button" onClick={downloadAll} className={`${btn} ${idle}`} title="Download every page as a PDF" aria-label="Download every page as a PDF"><BoardIcon name="pages" />{full ? "" : "PDF"}</button>
      {!readOnly && extra?.(full)}
      {hand && !readOnly && (
        <button type="button" onClick={hand.onToggle} aria-pressed={hand.up}
          className={`${btn} ${hand.up ? "bg-amber-400 text-ink ring-2 ring-amber-500" : full ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/60" : "bg-amber-50 text-amber-900 ring-1 ring-amber-300"}`}
          title={hand.up ? "Your hand is up — tap to lower it" : "Raise your hand"} aria-label={hand.up ? "Lower my hand" : "Raise my hand"}>
          <span aria-hidden className="text-base leading-none">✋</span>{full ? "" : hand.up ? "Hand up" : "Raise hand"}
        </button>
      )}
      <button type="button" onClick={toggleFull} className={`${btn} ${full ? "bg-white text-ink" : on}`} title={full ? "Exit full screen (Esc)" : "Full screen (F)"} aria-label={full ? "Exit full screen" : "Full screen"}><BoardIcon name={full ? "shrink" : "expand"} />{full ? "" : "Full screen"}</button>
    </>
  );

  const pagesOverview = (
    <div role="dialog" aria-modal="true" aria-label="All pages" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4">
      <button type="button" tabIndex={-1} aria-label="Close all pages" onClick={() => setOverview(false)} className="absolute inset-0 cursor-default" />
      <div className="relative max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-black text-ink">All pages <span className="font-bold text-ink/50">({pageCount})</span></p>
          <button type="button" onClick={() => setOverview(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: pageCount }, (_, i) => (
            <button key={i} type="button" onClick={() => { goPage(i); setOverview(false); }} aria-label={`Go to page ${i + 1}`}
              className={`group relative overflow-hidden rounded-xl text-left ring-2 transition ${i === page ? "ring-[#1657C9]" : "ring-line hover:ring-[#BFD7FF]"}`}>
              <PageThumb items={pages.current[i] ?? []} bg={bgs[i] ?? null} paper={papers[i] ?? "plain"} img={getImg} />
              <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 text-xs font-black ${i === page ? "bg-[#1657C9] text-white" : "bg-white/90 text-ink"}`}>{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  const stage = (
    <div ref={stageRef} className={`flex min-h-0 min-w-0 items-center justify-center ${full ? "flex-1" : "h-[calc(100dvh-150px)] min-h-[420px]"}`}>
      <div data-board className="relative overflow-hidden rounded-2xl shadow-[0_18px_40px_-28px_rgba(22,87,201,.45)] ring-1 ring-line"
        style={{ width: box.w, height: box.h, background: paperStyle(paper, box.w).background }}>
        {/* Paper and slide zoom with the drawing. */}
        <div className="pointer-events-none absolute inset-0 origin-top-left" aria-hidden={!bgs[page]}
          style={{ ...paperStyle(paper, box.w), transform: isHome(view) ? undefined : `scale(${view.z}) translate(${-view.x * 100}%, ${-view.y * 100}%)` }}>
          {paper === "axes" && <AxesOverlay w={box.w} h={box.h} />}
          {bgs[page] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgs[page]!} alt={`Slide ${page + 1}`} crossOrigin="anonymous" draggable={false}
              className="absolute inset-0 h-full w-full select-none object-contain" />
          )}
        </div>
        <canvas ref={canvasRef} className={`absolute inset-0 block h-full w-full touch-none ${cursor}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { if (!e.buttons) gesture.current.pts.delete(e.pointerId); }}
          role="img" aria-label={`Shared class board, page ${page + 1} of ${pageCount}`} />
        <canvas ref={inkRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
        <canvas ref={laserRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
        {overlay?.(full)}
        {selected && tool === "select" && (host || selected.by === myId) && (() => {
          const ib = itemBounds(selected), [x1, y1] = toScreen(view, ib.x1, ib.y1), [, y2] = toScreen(view, ib.x2, ib.y2);
          const b = { x1, y1, y2 };
          return (
            <div role="toolbar" aria-label="Selected item" className="absolute z-30 flex gap-1 rounded-xl bg-[#0B1220] p-1 text-white shadow-xl"
              style={{ left: Math.min(box.w - 230, Math.max(4, b.x1 * box.w)), top: b.y1 * box.h > 52 ? b.y1 * box.h - 48 : Math.min(box.h - 44, b.y2 * box.h + 10) }}>
              <button type="button" onClick={() => scaleSelected(1 / 1.2)} title="Smaller" aria-label="Make smaller" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"><BoardIcon name="minus" className="h-4 w-4" /></button>
              <button type="button" onClick={() => scaleSelected(1.2)} title="Bigger" aria-label="Make bigger" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"><BoardIcon name="plus" className="h-4 w-4" /></button>
              <button type="button" onClick={duplicateSelected} title="Copy" aria-label="Copy" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"><BoardIcon name="copy" className="h-4 w-4" /></button>
              <button type="button" onClick={frontSelected} title="Bring to front" aria-label="Bring to front" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/15"><BoardIcon name="front" className="h-4 w-4" /></button>
              <button type="button" onClick={deleteSelected} title="Delete (Del)" aria-label="Delete" className="flex h-9 w-9 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/20"><BoardIcon name="trash" className="h-4 w-4" /></button>
            </div>
          );
        })()}
        {notice && (
          <div role="status" className="pointer-events-none absolute bottom-3 left-1/2 z-40 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-[#0B1220]/90 px-4 py-2 text-sm font-bold text-white shadow-xl">
            {slideBusy && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />}{notice}
          </div>
        )}
        {lessonsOpen && <LessonPicker current={() => ({ board: { v: 2, pages: pages.current, paper: papersRef.current, bg: bgsRef.current }, widgets: widgetsRef.current })}
          onOpen={applyLesson} onClose={() => setLessonsOpen(false)} notify={setNotice} />}
        {!readOnly && !lessonId && sessionId && <PulsePoll host={host} myId={myId} myName={myName} people={people} pollOpen={pollOpen} onPollOpen={() => setPollOpen(true)} onPollClose={() => setPollOpen(false)} keep={keep} />}
        {!readOnly && !lessonId && sessionId && <GroupBoards host={host} myId={myId} myName={myName} people={people} open={groupsOpen} onOpen={() => setGroupsOpen(true)} onClose={() => setGroupsOpen(false)} onBring={addBoardPage} keep={keep} />}
        {!readOnly && !lessonId && sessionId && <Leaderboard sessionId={sessionId} host={host} myName={myName} open={starsOpen} onClose={() => setStarsOpen(false)} />}
        {!readOnly && !lessonId && sessionId && <ExamMode sessionId={sessionId} host={host} open={examOpen} onOpen={() => setExamOpen(true)} onClose={() => setExamOpen(false)} />}
        {!readOnly && !lessonId && <AnswerBoards sessionId={sessionId} host={host} myId={myId} myName={myName} people={people} open={answersOpen} onOpen={() => setAnswersOpen(true)} onClose={() => setAnswersOpen(false)} keep={keep} />}
        <BoardWidgets w={widgets} host={host && !readOnly} onChange={updateWidgets} boxW={box.w} names={names}
          onDraw={(g) => commit({ id: newId(), by: myId, kind: g.kind, color, w: Math.min(size, 8), pts: g.pts, t: Date.now() })} />
        {edit?.kind === "math" && (
          <EquationEditor value={edit.value} colour={color} dark={dark} changing={!!edit.replace}
            style={{ left: `${Math.min(edX * 100, 52)}%`, top: edY * box.h > box.h * 0.55 ? Math.max(4, edY * box.h - 250) : edY * box.h + 8 }}
            onChange={(value) => setEdit({ ...edit, value })} onDone={finishEdit} onCancel={() => setEdit(null)} />
        )}
        {edit && edit.kind !== "math" && (<>
          <div className="absolute z-50 flex max-w-[95%] flex-wrap gap-0.5 rounded-xl bg-[#0B1220] p-1 shadow-xl" role="toolbar" aria-label="Maths symbols"
            style={{ left: `${Math.min(edX * 100, 60)}%`, top: edY * box.h > 46 ? edY * box.h - 44 : edY * box.h + (edit.kind === "note" ? (NOTE_H * box.h * view.z) / BOARD_H : 70) + 6 }}>
            {MATH_SYMBOLS.map((sym) => (
              <button key={sym} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => insertSymbol(sym)} aria-label={`Insert ${sym}`}
                className="h-8 min-w-[30px] rounded-md px-1 text-base font-bold text-white hover:bg-white/15">{sym}</button>
            ))}
          </div>
          <textarea ref={editRef} autoFocus value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} onBlur={finishEdit}
            onKeyDown={(e) => { if (e.key === "Escape") setEdit(null); if (e.key === "Enter" && (e.ctrlKey || e.metaKey || edit.kind === "text") && !e.shiftKey) { e.preventDefault(); finishEdit(); } }}
            placeholder={edit.kind === "note" ? "Write a note…" : "Type, then press Enter"} aria-label={edit.kind === "note" ? "Sticky note text" : "Text on the board"}
            className={`absolute z-40 resize-none p-2 font-semibold leading-tight outline-none ${edit.kind === "note" ? "rounded shadow-xl" : `rounded-lg bg-transparent ring-2 ring-[#38BDF8] ${dark ? "placeholder:text-white/40" : ""}`}`}
            style={editStyle} rows={edit.kind === "note" ? 5 : 2} />
        </>)}
      </div>
    </div>
  );

  // The lab covers the whole screen, upright and unclipped: it opens at the
  // top of the board (in full screen, inside the full-screen element so the
  // browser shows it), never inside the board area, which is turned sideways on
  // a phone held upright and cut to the board's size.
  const labLayer = !readOnly && (labUsed || !host) && !(lessonId && !host) && rootEl
    ? createPortal(
        <LabPanel host={host} open={labOpen} live={!lessonId} onOpen={() => setLabOpen(true)} onClose={() => setLabOpen(false)}
          onSnapshot={async (file) => { await addSlides([file]); }} keep={keep} />,
        full ? rootEl : document.body)
    : null;
  // Games and ready-made quizzes: the same kind of layer as the lab.
  async function launchQuiz(title: string, questions: unknown[]): Promise<string | null> {
    if (!sessionId || lessonId) return "Live quizzes run during a class.";
    const r = await fetch("/api/live-quiz", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "launch", sessionId, title, questions }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return j.error ?? "Couldn't start the quiz — check the internet and try again.";
    // Show it: leave full screen and switch to the live quiz.
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setFull(false);
    window.dispatchEvent(new Event("live-quiz-launched"));
    onQuizLaunched?.();
    return null;
  }
  const gamesLayer = !readOnly && (gamesUsed || !host) && !(lessonId && !host) && rootEl
    ? createPortal(
        <GamesPanel host={host} sessionId={sessionId} open={gamesOpen} live={!lessonId} onOpen={() => setGamesOpen(true)} onClose={() => setGamesOpen(false)}
          onLaunchQuiz={host && !lessonId ? launchQuiz : undefined} keep={keep} />,
        full ? rootEl : document.body)
    : null;

  if (full) {
    return (
      <div ref={setRoot} tabIndex={-1} className="fixed inset-0 z-[90] overflow-hidden bg-[#0B1220]">
        {/* The browser forbids transforms on the full-screen element itself, so an inner layer turns. */}
        <div data-rotated={turned ? "" : undefined}
          className={`absolute left-0 top-0 flex ${turned ? "gap-1.5 p-1.5" : "h-full w-full gap-2 p-2"}`}
          style={turned ? { width: screenSize.h, height: screenSize.w, transform: "rotate(90deg) translateY(-100%)", transformOrigin: "top left" } : undefined}>
          <div role="toolbar" aria-label="Drawing tools" aria-orientation="vertical" className="flex w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 sm:w-[84px]">{drawTools}</div>
          {stage}
          {overview && pagesOverview}
          {activity && <ActivityDialog kind={activity} by={myId} idp={newId()} onClose={() => setActivity(null)} onDone={(items) => { insertItems(items); setActivity(null); setTool("select"); }} />}
          {replay && <Replay pages={pages.current} papers={papers} bgs={bgs} img={getImg} onClose={() => setReplay(false)} />}
          <div role="toolbar" aria-label="Board controls" aria-orientation="vertical" className="flex w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 sm:w-[84px]">{hostTools}</div>
          {host && roster && <Roster {...roster} compact={(turned ? screenSize.h : screenSize.w) < 1100} />}
          {toolsOpen && toolsPanel}
        </div>
        {labLayer}
        {gamesLayer}
      </div>
    );
  }

  return (
    <div ref={setRoot} tabIndex={-1} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-line" role="toolbar" aria-label="Whiteboard tools">
        {drawTools}
        <span className="ml-auto flex flex-wrap items-center gap-1">{hostTools}</span>
      </div>
      {stage}
      {overview && pagesOverview}
      {activity && <ActivityDialog kind={activity} by={myId} idp={newId()} onClose={() => setActivity(null)} onDone={(items) => { insertItems(items); setActivity(null); setTool("select"); }} />}
      {replay && <Replay pages={pages.current} papers={papers} bgs={bgs} img={getImg} onClose={() => setReplay(false)} />}
      {labLayer}
      {gamesLayer}
      <div className="flex items-center justify-between text-xs text-ink/50">
        <span aria-live="polite">{status}</span>
        {drawOk && <span className="hidden sm:inline">Shortcuts: P pen · H highlighter · E eraser · L line · A arrow · R rectangle · O circle · T text · N note · K laser · F full screen · Ctrl+Z undo</span>}
      </div>
    </div>
  );
}

// Coordinate-plane paper: x and y axes through the centre, labelled every 2.
function AxesOverlay({ w, h }: { w: number; h: number }) {
  const u = w / 32, cx = w / 2, cy = h / 2;
  const nx = Math.floor(cx / u), ny = Math.floor(cy / u);
  const xs = Array.from({ length: nx * 2 + 1 }, (_, i) => i - nx).filter((n) => n !== 0);
  const ys = Array.from({ length: ny * 2 + 1 }, (_, i) => i - ny).filter((n) => n !== 0);
  const fs = Math.max(9, u * 0.42);
  return (
    <svg className="pointer-events-none absolute inset-0" width={w} height={h} aria-hidden>
      <g stroke="#334155" strokeWidth={1.6}>
        <line x1={0} y1={cy} x2={w} y2={cy} /><line x1={cx} y1={0} x2={cx} y2={h} />
      </g>
      <g fill="#64748b" fontSize={fs} fontFamily="Poppins, system-ui, sans-serif" fontWeight={600}>
        {xs.filter((n) => n % 2 === 0).map((n) => (
          <g key={`x${n}`}><line x1={cx + n * u} y1={cy - 4} x2={cx + n * u} y2={cy + 4} stroke="#334155" /><text x={cx + n * u} y={cy + fs + 4} textAnchor="middle">{n}</text></g>
        ))}
        {ys.filter((n) => n % 2 === 0).map((n) => (
          <g key={`y${n}`}><line x1={cx - 4} y1={cy - n * u} x2={cx + 4} y2={cy - n * u} stroke="#334155" /><text x={cx - 6} y={cy - n * u + fs / 3} textAnchor="end">{n}</text></g>
        ))}
        <text x={cx - 6} y={cy + fs + 4} textAnchor="end">0</text>
        <text x={w - 8} y={cy - 8} textAnchor="end" fontStyle="italic" fill="#334155">x</text>
        <text x={cx + 8} y={fs + 4} fontStyle="italic" fill="#334155">y</text>
      </g>
    </svg>
  );
}

// A small picture of one page for the pages overview.
function PageThumb({ items, bg, paper, img }: { items: Stroke[]; bg: string | null; paper: Paper; img: ImageSource }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current; if (c) drawStrokes(c.getContext("2d")!, items, c.width, c.height, img); }, [items, img]);
  return (
    <div className="relative aspect-[16/10] w-full" style={{ background: paper === "chalk" ? "#1f3d2b" : paper === "dark" ? "#0B1220" : "#fff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      <canvas ref={ref} width={320} height={200} className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
