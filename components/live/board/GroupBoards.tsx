"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { Thumb } from "@/components/live/board/AnswerBoards";
import { localPoint } from "@/components/live/board/rotation";
import { BOARD_H, BOARD_W, drawStrokes, roundPt, type Stroke } from "@/lib/whiteboard";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import {
  MAX_GROUPS, addLateJoiners, cleanInk, cleanPlan, groupOf, inkForBoard, inkId, makeGroups, mergeInk, moveMember, suggestedGroups,
  type GroupPlan,
} from "@/lib/groupBoards";

// Group work boards (see lib/groupBoards.ts). The teacher splits the class
// into groups; each group draws together on one shared board; the teacher
// watches every group and can bring a group's work onto the main board.
//
// Messages: "grp-plan" (teacher → all: who is in which group, re-sent every
// 2s) and "grp-ink" (learner → everyone: all of that learner's ink for their
// group, sent as it changes and again every 8s, so nothing stays missing).

type Person = { id: string; name: string; online?: boolean };
type InkMap = Map<string, Map<string, Stroke[]>>; // group → member → their ink
const PEN_COLOURS = ["#0B1220", "#1657C9", "#DC2626", "#16A34A", "#F5951E"];

export default function GroupBoards({ host, myId, myName, people, open, onOpen, onClose, onBring, keep }: {
  host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onOpen: () => void; onClose: () => void;
  onBring: (items: Stroke[], label: string) => void; // teacher: put a group's work on a new page of the main board
  keep?: KeepStore;
}) {
  const k = (n: string) => `grp:${n}`;
  const [plan, setPlan] = useKeptState<GroupPlan | null>(keep, k("plan"), null);
  const planRef = useRef(plan); planRef.current = plan;
  const [ink, setInk] = useKeptState<InkMap>(keep, k("ink"), () => new Map());
  const [mine, setMine] = useKeptState<Stroke[]>(keep, k("mine"), []);
  const mineRef = useRef(mine); mineRef.current = mine;
  const version = useKeptRef(keep, k("v"), 0);
  const [hidden, setHidden] = useKeptState(keep, k("hidden"), false);
  // Teacher's setup
  const [task, setTask] = useKeptState(keep, k("task"), "");
  const [count, setCount] = useKeptState<number | null>(keep, k("count"), null);
  const [seed, setSeed] = useKeptState(keep, k("seed"), 1); // the preview stays put until "Shuffle"
  const [focus, setFocus] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const online = people.filter((p) => p.online !== false);
  const nGroups = count ?? suggestedGroups(online.length);

  const keepInk = (group: string, by: string, strokes: Stroke[]) => setInk((cur) => {
    const next = new Map(cur);
    const g = new Map(next.get(group) ?? []);
    g.set(by, strokes); next.set(group, g);
    return next;
  });

  const send = useLive({
    "grp-plan": (p) => {
      if (host || !p?.host) return;
      const r = cleanPlan(p.plan);
      if (!r || !r.open) { setPlan(null); return; }
      const before = groupOf(planRef.current, myId)?.id, after = groupOf(r, myId)?.id;
      if (planRef.current?.id !== r.id) { setInk(new Map()); setMine([]); mineRef.current = []; version.current = 0; setHidden(false); }
      else if (before !== after) { setHidden(false); sendMine(r); }
      setPlan(r);
    },
    "grp-ink": (p) => {
      const r = planRef.current;
      if (!r || p?.plan !== r.id || typeof p.by !== "string" || typeof p.group !== "string") return;
      if (!host && groupOf(r, myId)?.id !== p.group) return; // learners only keep their own group's board
      if (!r.groups.some((g) => g.id === p.group && g.members.includes(p.by))) return;
      keepInk(p.group, p.by, cleanInk(p.strokes));
    },
  });

  // Teacher: keep the plan on every screen.
  useEffect(() => {
    if (!host || !plan) return;
    send("grp-plan", { host: true, plan });
    const t = setInterval(() => send("grp-plan", { host: true, plan: planRef.current }), 4000);
    return () => clearInterval(t);
  }, [host, plan, send]);

  // Learner: send my ink as it changes (throttled) and every few seconds.
  const last = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  function sendMine(r = planRef.current, force = false) {
    const g = groupOf(r, myId);
    if (host || !r || !g) return;
    const now = Date.now();
    if (!force && now - last.current < 300) {
      if (!pending.current) pending.current = setTimeout(() => { pending.current = null; sendMine(planRef.current, true); }, 350);
      return;
    }
    last.current = now;
    send("grp-ink", { plan: r.id, group: g.id, by: myId, v: version.current, strokes: mineRef.current });
  }
  useEffect(() => {
    if (host || !plan) return;
    const t = setInterval(() => sendMine(planRef.current, true), 8000); // changes go at once; this is only a safety net
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, plan?.id]);

  const groupInk = (gid: string, withMine = false): Stroke[] => {
    const per = ink.get(gid) ?? new Map<string, Stroke[]>();
    const lists = [...per.entries()].filter(([by]) => !(withMine && by === myId)).map(([, s]) => s);
    return mergeInk(withMine ? [...lists, mine] : lists);
  };
  const nameOf = (id: string) => plan?.names[id] ?? people.find((p) => p.id === id)?.name ?? "Learner";

  // ── Teacher ──
  if (host) {
    if (!open && !plan) return null;
    if (!open && plan) {
      return (
        <button type="button" onClick={onOpen} className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
          <BoardIcon name="groups" /> Groups ({plan.groups.length})
        </button>
      );
    }
    const groups = online.length ? makeGroups(online, nGroups, seeded(seed)) : null;
    function start() {
      if (!groups) return;
      const gs = groups;
      const names: Record<string, string> = {};
      for (const p of online) names[p.id] = p.name;
      setInk(new Map()); setFocus(null); setNote(null);
      setPlan({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, task: task.trim().slice(0, 200), open: true, groups: gs, names });
    }
    function end() {
      if (plan) send("grp-plan", { host: true, plan: { ...plan, open: false } });
      setPlan(null); setFocus(null); onClose();
    }
    const late = plan ? online.filter((p) => !plan.groups.some((g) => g.members.includes(p.id))) : [];
    const bring = (gid: string) => {
      const g = plan?.groups.find((x) => x.id === gid);
      const items = groupInk(gid);
      if (!g || !items.length) { setNote("That group hasn't drawn anything yet."); return; }
      onBring(inkForBoard(items, myId), g.name);
      setNote(`${g.name}'s work is on a new page of the main board.`);
      setFocus(null);
    };
    const focused = plan && focus ? plan.groups.find((g) => g.id === focus) ?? null : null;
    return (
      <div role="dialog" aria-modal="true" aria-label="Group boards" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
        <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF6FF] text-[#1657C9]"><BoardIcon name="groups" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black">Group boards</p>
              {plan && <p className="truncate text-xs font-bold text-ink/55">{plan.task || "Groups work together on their own board"} · {plan.groups.length} groups</p>}
            </div>
            {plan && late.length > 0 && (
              <button type="button" onClick={() => { const names = Object.fromEntries(late.map((p) => [p.id, p.name])); setPlan(addLateJoiners({ ...plan, names: { ...plan.names, ...names } }, late)); }}
                className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">Add {late.length} new learner{late.length === 1 ? "" : "s"}</button>
            )}
            {plan && <button type="button" onClick={end} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">End groups</button>}
            <button type="button" onClick={onClose} aria-label={plan ? "Hide — groups keep working" : "Close"} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
          </div>
          {!plan ? (
            <div className="grid gap-3 overflow-y-auto p-4">
              <p className="text-sm font-semibold text-ink/70">Split the class into groups. Each group draws together on its own board; you watch them all here and can bring the best work onto the main board.</p>
              <label className="text-xs font-black text-ink/60">Task for the groups (optional)
                <input value={task} maxLength={200} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Draw three shapes with a line of symmetry"
                  className="mt-1 w-full rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]" />
              </label>
              <fieldset className="grid gap-1.5">
                <legend className="text-xs font-black text-ink/60">Number of groups</legend>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: MAX_GROUPS - 1 }, (_, i) => i + 2).map((n) => (
                    <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={nGroups === n}
                      className={`h-10 min-w-[44px] rounded-xl px-3 text-sm font-black ring-1 transition ${nGroups === n ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white text-ink/70 ring-slate-200 hover:ring-[#BFD7FF]"}`}>{n}</button>
                  ))}
                </div>
              </fieldset>
              {!online.length ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">No learners have joined yet — groups are made from the learners in the class.</p> : groups && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {groups.map((g) => (
                      <div key={g.id} className="rounded-xl bg-slate-50 p-3 ring-1 ring-line">
                        <p className="text-sm font-black">{g.name}</p>
                        <p className="text-xs font-semibold text-ink/60">{g.members.map((m) => online.find((p) => p.id === m)?.name ?? "Learner").join(", ") || "Empty"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSeed(seed + 1)} className="rounded-xl bg-ink/5 px-4 py-2.5 text-sm font-black text-ink/70">Shuffle</button>
                    <button type="button" onClick={start} className="rounded-xl bg-[#1657C9] px-5 py-2.5 text-sm font-black text-white">Start groups</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {note && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{note}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plan.groups.map((g) => (
                  <div key={g.id} className="overflow-hidden rounded-xl ring-2 ring-line">
                    <button type="button" onClick={() => setFocus(g.id)} aria-label={`Open ${g.name}'s board`} className="block w-full"><Thumb strokes={groupInk(g.id)} /></button>
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black">{g.name}</p>
                        <p className="truncate text-[11px] font-semibold text-ink/55">{g.members.map(nameOf).join(", ") || "Empty"}</p>
                      </div>
                      <button type="button" onClick={() => bring(g.id)} className="shrink-0 rounded-lg bg-[#1657C9] px-2.5 py-1.5 text-[11px] font-black text-white">To main board</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {focused && plan && (
          <div role="dialog" aria-label={focused.name} className="fixed inset-0 z-[97] flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-ink">{focused.name}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => bring(focused.id)} className="rounded-xl bg-[#1657C9] px-3 py-2 text-xs font-black text-white">Bring to main board</button>
                  <button type="button" onClick={() => setFocus(null)} aria-label="Back to all groups" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
                </div>
              </div>
              <Thumb strokes={groupInk(focused.id)} big />
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {focused.members.map((m) => (
                  <li key={m} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-bold">
                    <span className="min-w-0 truncate">{nameOf(m)}</span>
                    <label className="flex items-center gap-1 text-xs text-ink/60">Move to
                      <select value={focused.id} onChange={(e) => setPlan(moveMember(plan, m, e.target.value))} className="rounded-md bg-white px-1 py-1 text-xs font-black ring-1 ring-slate-200">
                        {plan.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Learner ──
  const g = groupOf(plan, myId);
  if (!plan || !g) return null;
  if (hidden) {
    return (
      <button type="button" onClick={() => setHidden(false)} className="fixed bottom-4 right-4 z-[96] flex items-center gap-2 rounded-full bg-[#1657C9] px-4 py-3 text-sm font-black text-white shadow-2xl">
        <BoardIcon name="groups" /> {g.name} board
      </button>
    );
  }
  const mates = g.members.filter((m) => m !== myId).map(nameOf);
  const change = (next: Stroke[]) => { setMine(next); mineRef.current = next; version.current++; sendMine(); };
  return (
    <div role="dialog" aria-label={`${g.name} board`} className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50 p-3">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-2 overflow-y-auto rounded-2xl bg-white p-3 text-ink shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#1657C9]">{g.name}{mates.length ? ` · with ${mates.join(", ")}` : ""}</p>
            <p className="text-lg font-black leading-snug">{plan.task || "Work together on your group's board"}</p>
          </div>
          <button type="button" onClick={() => setHidden(true)} className="rounded-lg bg-ink/5 px-3 py-2 text-xs font-black text-ink/70 hover:bg-ink/10">See the class board</button>
        </div>
        <GroupPad others={groupInk(g.id)} mine={mine} me={myId} name={myName} onChange={change} onDone={() => sendMine(planRef.current, true)} />
      </div>
    </div>
  );
}

// A repeatable "random" so the groups shown are the groups you get.
function seeded(seed: number) {
  let a = seed * 2654435761 >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The group's shared board: everyone's ink, and I add (and undo) my own.
function GroupPad({ others, mine, me, onChange, onDone }: { others: Stroke[]; mine: Stroke[]; me: string; name: string; onChange: (s: Stroke[]) => void; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke | null>(null);
  const [colour, setColour] = useState(PEN_COLOURS[1]);
  const [rubber, setRubber] = useState(false);
  const all = mergeInk([others.filter((s) => s.by !== me), mine]);
  const paint = () => { const c = ref.current; if (c) drawStrokes(c.getContext("2d")!, cur.current ? [...all, cur.current] : all, c.width, c.height); };
  useEffect(paint);
  const pt = (e: React.PointerEvent) => localPoint(ref.current!, e.clientX, e.clientY).map(roundPt) as [number, number];
  const tool = "min-h-[40px] rounded-lg px-3 text-xs font-black";
  return (
    <div className="grid gap-2">
      <canvas ref={ref} width={BOARD_W * 0.6} height={BOARD_H * 0.6} role="img" aria-label="Your group's board — draw here"
        className="block aspect-[16/10] w-full touch-none rounded-xl bg-white ring-2 ring-[#BFD7FF]"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); cur.current = { id: inkId(me), by: me, color: colour, w: rubber ? 10 : 4, erase: rubber, pts: pt(e) }; paint(); }}
        onPointerMove={(e) => { const s = cur.current; if (!s || !e.buttons) return; const [x, y] = pt(e); const L = s.pts.length; if (Math.hypot(x - s.pts[L - 2], y - s.pts[L - 1]) < 0.002) return; s.pts.push(x, y); paint(); }}
        onPointerUp={() => { const s = cur.current; cur.current = null; if (s) onChange([...mine, s].slice(-300)); onDone(); }}
        onPointerCancel={() => { cur.current = null; paint(); }} />
      <div className="flex flex-wrap items-center gap-1.5">
        {PEN_COLOURS.map((c) => (
          <button key={c} type="button" onClick={() => { setColour(c); setRubber(false); }} aria-label={`Pen colour ${c}`} aria-pressed={!rubber && colour === c}
            className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ${!rubber && colour === c ? "ring-[#38BDF8]" : "ring-transparent"}`} style={{ background: c }} />
        ))}
        <button type="button" onClick={() => setRubber(!rubber)} aria-pressed={rubber} className={`${tool} ${rubber ? "bg-[#1657C9] text-white" : "bg-ink/5"}`}>Rubber</button>
        <button type="button" onClick={() => onChange(mine.slice(0, -1))} disabled={!mine.length} className={`${tool} bg-ink/5 disabled:opacity-40`}>Undo mine</button>
        <button type="button" onClick={() => onChange([])} disabled={!mine.length} className={`${tool} bg-ink/5 disabled:opacity-40`}>Clear mine</button>
        <span className="ml-auto text-xs font-bold text-emerald-700">Your group and teacher see this live</span>
      </div>
    </div>
  );
}
