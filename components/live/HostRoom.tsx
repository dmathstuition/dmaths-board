"use client";
import type { HostBase } from "@/lib/liveSession";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LiveChannelProvider, useLive } from "@/components/live/LiveChannel";
import { useHostVoice } from "@/components/live/ClassVoice";
import Whiteboard from "@/components/live/Whiteboard";
import QuizHostStage from "@/components/live/QuizHostStage";
import ClassResults from "@/components/live/ClassResults";
import ClassReport from "@/components/live/ClassReport";
import { formatCode } from "@/lib/liveSession";
import { predictRoom } from "@/lib/roomPredict";

export type RoomPerson = { id: string; name: string; canWrite: boolean; online: boolean; joinedAt: string; handAt?: string | null };
export type RoomState = {
  session: { id: string; code: string; title: string; status: "live" | "ended"; allCanWrite: boolean; classId: string | null; subject: string | null; hostName: string; link: string; createdAt?: string; kind?: string };
  me: { id: string; name: string; host: boolean; canWrite: boolean; handUp?: boolean };
  writers: string[] | "all";
  people: RoomPerson[]; // the host's class list (empty for learners)
  here?: number;         // how many are in the class right now
};

// Poll a session's state, refreshing straight away on realtime pings.
// `every` spreads polling out for big classes; a hidden tab doesn't poll.
export function useRoom(id: string, every = 5000) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/live-sessions?id=${id}`).catch(() => null);
    if (!r) return; // offline for a moment — the next poll catches up
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Couldn't open this class."); return; }
    setErr(null); setRoom(j);
  }, [id]);
  useEffect(() => {
    load();
    // A little jitter so hundreds of phones don't all ask at the same moment.
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, every + Math.round(Math.random() * 1500));
    const back = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", back); };
  }, [load, every]);
  return { room, err, load, setRoom };
}


export default function HostRoom({ id, base }: { id: string; base: HostBase }) {
  return <LiveChannelProvider sessionId={id}><Host id={id} base={base} /></LiveChannelProvider>;
}

function Host({ id, base }: { id: string; base: HostBase }) {
  const { room, err, load, setRoom } = useRoom(id);
  const [actErr, setActErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"board" | "quiz" | "results">("board");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const send = useLive({ joined: () => load(), hand: () => load() });
  const onQuizActive = useCallback((active: boolean) => { if (active) setTab("quiz"); }, []);
  const voice = useHostVoice({ classId: id, me: { id: room?.me.id ?? "", name: room?.me.name ?? "Teacher" }, people: room?.people ?? [] });

  // Buttons change the screen the moment they're tapped; the server catches
  // up in the background (and the screen is put right if it says no).
  async function act(body: Record<string, unknown>) {
    const instant = body.action !== "end";
    if (instant) setRoom((r) => (r ? predictRoom(r, body) : r)); else setBusy(true);
    setActErr(null);
    const r = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).catch(() => null);
    setBusy(false);
    if (r?.ok) { send("perm"); load(); return true; }
    const j = r ? await r.json().catch(() => ({})) : {};
    setActErr(j.error ?? "That didn't go through — check your connection.");
    load();
    return false;
  }

  if (err) return <div className="card p-8 text-center"><p className="font-bold text-ink">{err}</p><Link href={`${base}/live`} className="btn-ghost mt-4 inline-flex">Back</Link></div>;
  if (!room) return <div className="card h-[60vh] animate-pulse" />;

  const s = room.session;
  const ended = s.status === "ended";
  const link = typeof window !== "undefined" ? `${window.location.origin}${s.link}` : s.link;
  const invite = `Join our interactive class "${s.title}" on ${base === "/app" ? "D-Maths Board" : "Novelia"}: ${link} (PIN ${formatCode(s.code)})`;
  const here = room.people.filter((p) => p.online).length;
  const hands = room.people.filter((p) => p.handAt).length;

  async function copy() {
    try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt("Copy this and send it to your learners:", invite); }
  }
  async function endClass() {
    if (!confirm("End the interactive class for everyone? The board is saved, and you'll see the class results next.")) return;
    // Stay here: the ended class shows everyone's results (class work + quiz).
    if (await act({ action: "end" })) { send("session-ended"); setTab("results"); load(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }
  async function reopen() {
    setBusy(true); setActErr(null);
    const r = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen", id }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { setActErr(j.error ?? "Couldn't continue the class — check your connection."); return; }
    setTab("board"); load();
  }
  function fullScreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="space-y-4">
      {/* Header: title, PIN, invite */}
      <div className="card flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#1657C9]">
            {ended ? <span className="rounded-full bg-ink/10 px-2 py-0.5 text-ink/60">Ended</span> : <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>}
            Interactive class{s.subject ? ` · ${s.subject}` : ""}
          </p>
          <h1 className="mt-1 truncate font-display text-2xl font-black text-ink">{s.title}</h1>
          <p className="text-sm text-ink/55">{here} learner{here === 1 ? "" : "s"} here · {room.people.length} joined</p>
        </div>
        {!ended && (
          <>
            <div className="rounded-2xl bg-[#EEF6FF] px-4 py-2 text-center ring-1 ring-[#1657C9]/20">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#1657C9]">Class PIN</p>
              <p className="font-display text-3xl font-black tracking-wider text-ink">{formatCode(s.code)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="btn-gold !min-h-[44px]">{copied ? "Copied ✓" : "Copy join link"}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[44px]">WhatsApp</a>
              <button type="button" onClick={endClass} disabled={busy} className="min-h-[44px] rounded-xl bg-red-50 px-4 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100">End class</button>
            </div>
          </>
        )}
      </div>

      {ended ? (
        <div className="space-y-3">
          <ClassResults sessionId={id} people={room.people} ended />
          {room.me.host && <ClassReport sessionId={id} people={room.people} title={s.title} teacher={s.hostName} board={s.kind === "board"}
            date={new Date(s.createdAt ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />}
          {room.me.host && (
            <div className="card flex flex-wrap items-center gap-3 p-4">
              <p className="min-w-0 flex-1 text-sm text-ink/70"><b className="text-ink">Not finished?</b> Continue this class — same board, learners and results. Learners rejoin with the PIN.</p>
              <button type="button" onClick={reopen} disabled={busy} className="btn-gold !min-h-[44px]">{busy ? "Opening…" : "▶ Continue class"}</button>
            </div>
          )}
          {actErr && <p className="text-sm font-semibold text-red-600" role="alert">{actErr}</p>}
          <p className="text-sm text-ink/60">This class has ended. Here&apos;s the board as it was saved.</p>
          <Whiteboard sessionId={id} host={false} myId={room.me.id} canDraw={false} writers={[]} readOnly />
        </div>
      ) : (
        <div className={`grid gap-4 ${focus ? "" : "lg:grid-cols-[minmax(0,1fr)_300px]"}`}>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Stage" className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
                {(["board", "quiz", "results"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={`min-h-[40px] rounded-xl px-4 text-sm font-black transition ${tab === t ? (t === "quiz" ? "bg-violet-600 text-white" : t === "results" ? "bg-emerald-600 text-white" : "bg-[#1657C9] text-white") : "text-ink/60 hover:text-ink"}`}>
                    {t === "board" ? "✏️ Board" : t === "quiz" ? "⚡ Live quiz" : "📊 Results"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setFocus((f) => !f)} aria-pressed={focus} className="ml-auto min-h-[40px] rounded-xl bg-white px-3 text-sm font-bold text-ink/70 ring-1 ring-line hover:text-ink">
                {focus ? `👥 Show learners${hands ? ` (✋ ${hands})` : ""}` : "↔ Focus on board"}
              </button>
              {tab === "quiz" && <button type="button" onClick={fullScreen} className="min-h-[40px] rounded-xl bg-white px-3 text-sm font-bold text-ink/70 ring-1 ring-line hover:text-ink">⛶ Full screen</button>}
            </div>
            <p className="text-xs text-ink/50">Share this screen in your call — {base === "/app" ? "students join on their phones with the PIN and follow along." : "learners follow along and take part from their own portal."}</p>
            <div ref={stageRef} className="rounded-[1.75rem] bg-[#F4F9FF] [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-6">
              <div hidden={tab !== "board"}>
                <Whiteboard sessionId={id} host myId={room.me.id} myName={room.me.name} canDraw writers={room.writers} canLog={!!s.classId} people={room.people}
                  onQuizLaunched={() => setTab("quiz")} extra={voice.controls} overlay={voice.overlay}
                  roster={{
                    people: room.people, allCanWrite: s.allCanWrite,
                    onWrite: (studentId, value) => act({ action: "write", studentId, value }),
                    onLowerHand: (studentId) => act({ action: "lowerHand", studentId }),
                    onLowerAll: () => act({ action: "lowerAll" }),
                  }} />
              </div>
              <div hidden={tab !== "quiz"}>
                <QuizHostStage sessionId={id} code={s.code} people={room.people} base={base} onActive={onQuizActive} />
              </div>
              {tab === "results" && (
                <div className="space-y-4">
                  <ClassResults sessionId={id} people={room.people} ended={false} />
                  <ClassReport sessionId={id} people={room.people} title={s.title} teacher={s.hostName} board={s.kind === "board"}
            date={new Date(s.createdAt ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
                </div>
              )}
            </div>
          </div>

          {/* People + who may write */}
          <aside className="card h-fit p-4" aria-label="Learners" hidden={focus}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black text-ink">Learners</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{here} here</span>
            </div>
            {actErr && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{actErr}</p>}
            {hands > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" role="status">
                <span className="text-sm font-black text-amber-900">✋ {hands} hand{hands === 1 ? "" : "s"} up</span>
                <button type="button" disabled={busy} onClick={() => act({ action: "lowerAll" })} className="text-xs font-bold text-amber-900 hover:underline">Lower all</button>
              </div>
            )}
            <div className="mt-3 rounded-2xl bg-[#F4F9FF] p-3">
              <p className="text-xs font-black uppercase tracking-wider text-ink/50">Who can write on the board</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button type="button" disabled={busy} onClick={() => act({ action: "everyoneOff" })}
                  className={`min-h-[40px] rounded-xl text-sm font-bold ${!s.allCanWrite && !room.people.some((p) => p.canWrite) ? "bg-[#1657C9] text-white" : "bg-white text-ink/70 ring-1 ring-line"}`}>Only me</button>
                <button type="button" disabled={busy} onClick={() => act({ action: "allWrite", value: true })}
                  className={`min-h-[40px] rounded-xl text-sm font-bold ${s.allCanWrite ? "bg-emerald-600 text-white" : "bg-white text-ink/70 ring-1 ring-line"}`}>Everyone</button>
              </div>
              <p className="mt-2 text-[11px] text-ink/50">Or tap ✏️ beside a name to let just that learner write.</p>
            </div>
            <ul className="mt-3 max-h-[52vh] space-y-1.5 overflow-y-auto">
              {room.people.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-ink/[.03]">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${p.online ? "bg-emerald-500" : "bg-ink/20"}`} aria-label={p.online ? "online" : "away"} />
                  <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${p.online ? "text-ink" : "text-ink/45"}`}>{p.name}</span>
                  {p.handAt && (
                    <button type="button" disabled={busy} onClick={() => act({ action: "lowerHand", studentId: p.id })} aria-label={`Lower ${p.name}'s hand`} title="Lower hand"
                      className="flex h-9 items-center gap-1 rounded-lg bg-amber-100 px-2 text-sm font-black text-amber-900 ring-1 ring-amber-300">✋{room.people.filter((x) => x.handAt).findIndex((x) => x.id === p.id) + 1}</button>
                  )}
                  <button type="button" disabled={busy || s.allCanWrite} onClick={() => act({ action: "write", studentId: p.id, value: !p.canWrite })}
                    aria-pressed={p.canWrite} aria-label={`${p.canWrite ? "Stop" : "Let"} ${p.name} write`}
                    className={`h-9 w-9 rounded-lg text-base transition ${p.canWrite ? "bg-emerald-100 ring-1 ring-emerald-400" : "bg-ink/5 grayscale"} disabled:cursor-default`}>✏️</button>
                  <button type="button" disabled={busy} onClick={() => { if (confirm(`Remove ${p.name} from this class?`)) act({ action: "remove", studentId: p.id }); }}
                    aria-label={`Remove ${p.name}`} className="h-9 w-9 rounded-lg text-ink/35 hover:bg-red-50 hover:text-red-600">✕</button>
                </li>
              ))}
              {!room.people.length && <li className="rounded-xl bg-ink/[.03] p-4 text-center text-sm text-ink/55">No one yet. Send the link or read out the PIN — learners join from <b>Interactive class</b> in their portal.</li>}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
