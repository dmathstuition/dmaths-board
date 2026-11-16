"use client";
import { ReadingButton } from "@/components/live/Reading";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LiveChannelProvider, useLive } from "@/components/live/LiveChannel";
import { useLearnerVoice } from "@/components/live/ClassVoice";
import Whiteboard from "@/components/live/Whiteboard";
import QuizPlayer from "@/components/live/QuizPlayer";
import { useRoom } from "@/components/live/HostRoom";
import MyResults from "@/components/live/MyResults";

// `guest`: a student in a D-Maths Board class (joined with a PIN and their name).
export default function LearnerRoom({ id, guest = false }: { id: string; guest?: boolean }) {
  return <LiveChannelProvider sessionId={id}><Learner id={id} guest={guest} /></LiveChannelProvider>;
}

// A learner inside an interactive class: the shared board (they write only
// when the host allows), and the live quiz takes over the screen when the
// host launches one.
function Learner({ id, guest }: { id: string; guest: boolean }) {
  const { room, err, load, setRoom } = useRoom(id, 8000);
  const [quiz, setQuiz] = useState<{ id: string; status: string } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [mine, setMine] = useState(false); // "My results so far", during the class
  const send = useLive({ perm: () => load(), "session-ended": () => load() });
  // Tell the host's screen we're here (after the channel has connected).
  useEffect(() => { const t = setTimeout(() => send("joined"), 1500); return () => clearTimeout(t); }, [send]);
  // While a tap is on its way to the server, show what was asked for (a poll
  // landing in between mustn't flip the hand back).
  const [handWant, setHandWant] = useState<boolean | null>(null);
  const [handNote, setHandNote] = useState("");
  useEffect(() => { if (!handNote) return; const t = setTimeout(() => setHandNote(""), 6000); return () => clearTimeout(t); }, [handNote]);
  async function toggleHand() {
    if (!room || handWant !== null) return;
    const up = !room.me.handUp;
    setHandWant(up); setHandNote("");
    const r = await fetch("/api/live-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hand", id, up }) }).catch(() => null);
    if (r?.ok) {
      setRoom((x) => (x ? { ...x, me: { ...x.me, handUp: up } } : x));
      send("hand");
      if (up) setHandNote("✋ Your hand is up — your teacher can see it");
    } else {
      const j = r ? await r.json().catch(() => ({})) : {};
      setHandNote(`Couldn't ${up ? "raise" : "lower"} your hand: ${j.error ?? "check the internet and try again."}`);
    }
    setHandWant(null);
    load();
  }
  const onState = useCallback((s: { id: string; status: string } | null) => setQuiz(s), []);
  const voice = useLearnerVoice({ classId: id, me: { id: room?.me.id ?? "", name: room?.me.name ?? "" } });

  if (err) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-display text-xl font-black text-ink">{err}</p>
        <Link href={guest ? "/join" : "/portal/live"} className="btn-gold mt-5 inline-flex">Enter a PIN</Link>
        <p className="mt-4 text-sm text-ink/55">Having trouble? <Link href="/check" className="font-bold underline">Check my connection</Link></p>
      </div>
    );
  }
  if (!room) return <div className="h-[60vh] animate-pulse rounded-3xl bg-white/70" />;

  const s = room.session;
  const ended = s.status === "ended";
  const showQuiz = !ended && !!quiz && (quiz.status !== "ended" || quiz.id !== dismissed);
  const handUp = handWant ?? !!room.me.handUp;
  const here = room.here ?? room.people.filter((p) => p.online).length;

  return (
    <div className="space-y-3">
      {/* On a phone the quiz needs the whole screen, so the class card steps aside. */}
      {/* The app bar: who and what, in the learners' colours. */}
      <div className={`lrn-bar flex flex-wrap items-center gap-3 rounded-3xl p-3 text-white shadow-lift sm:p-4 ${showQuiz ? "max-sm:hidden [@media(max-height:520px)]:hidden" : ""}`}>
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDE047] font-display text-xl font-black text-[#4C1D95] shadow-inner">{(room.me.name || "?").trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-[#FDE047]">
            {ended ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-white/80">Ended</span> : <span className="flex items-center gap-1.5 rounded-full bg-[#F43F5E] px-2 py-0.5 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>}
            <span className="truncate">{s.subject ?? "Interactive class"}</span>
          </p>
          <h1 className="truncate font-display text-lg font-black leading-tight text-white sm:text-2xl">{s.title}</h1>
          <p className="truncate text-xs text-white/75 sm:text-sm">with {s.hostName} · {here} here</p>
        </div>
        {!ended && (
          <span className={`rounded-full px-3 py-1.5 text-xs font-black sm:text-sm ${room.me.canWrite ? "bg-[#A3E635] text-[#1A2E05]" : "bg-white/15 text-white"}`} role="status">
            {room.me.canWrite ? "✏️ You can write" : "👀 Watching"}
          </span>
        )}
        {/* On a phone these are the tabs along the bottom of the screen. */}
        <nav aria-label="Class" className="lrn-tabs">
          {!ended && (
            <button type="button" onClick={toggleHand} aria-pressed={handUp} className={`lrn-tab ${handUp ? "lrn-tab-on !bg-amber-300 !text-[#422006]" : ""}`}>
              <span aria-hidden className="lrn-tab-icon">✋</span> <span>{handUp ? "Hand up — tap to lower" : "Raise hand"}</span>
            </button>
          )}
          {!ended && (
            <button type="button" onClick={() => setMine((m) => !m)} aria-expanded={mine} className={`lrn-tab ${mine ? "lrn-tab-on" : ""}`}>
              <span aria-hidden className="lrn-tab-icon">📊</span> <span>{mine ? "Hide my results" : "My results"}</span>
            </button>
          )}
          <ReadingButton tab />
        </nav>
      </div>

      {handNote && !ended && <p role="status" className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${handNote.startsWith("Couldn") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>{handNote}</p>}
      {(ended || (mine && !showQuiz)) && <MyResults sessionId={id} ended={ended} />}
      {ended && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">This class has ended. Here&apos;s the board your {guest ? "teacher" : "tutor"} saved.</p>}

      {!ended && (
        <div hidden={!showQuiz}>
          <QuizPlayer sessionId={id} myName={room.me.name} myId={room.me.id} onState={onState} onDismiss={() => quiz && setDismissed(quiz.id)} />
        </div>
      )}
      <div hidden={showQuiz}>
        <Whiteboard sessionId={id} host={false} myId={room.me.id} myName={room.me.name} canDraw={room.me.canWrite} writers={room.writers} readOnly={ended}
          hand={ended ? undefined : { up: handUp, onToggle: toggleHand, note: handNote }} extra={ended ? undefined : voice.controls} overlay={ended ? undefined : voice.overlay} />
      </div>
      <p className="text-center text-xs text-ink/45">{guest ? "Follow your teacher's board and take part here. Keep this page open." : "Watch your tutor's shared screen in the call and take part here. Keep this page open."}</p>
    </div>
  );
}
