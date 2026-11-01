"use client";
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
  const voice = useLearnerVoice({ classId: id, me: { id: room?.me.id ?? "" } });

  if (err) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-display text-xl font-black text-ink">{err}</p>
        <Link href={guest ? "/join" : "/portal/live"} className="btn-gold mt-5 inline-flex">Enter a PIN</Link>
        <p className="mt-4 text-sm text-ink/55">Having trouble? <Link href="/check" className="font-bold underline">Check my connection</Link></p>
      </div>
    );
  }
  if (!room) return <div className="card h-[60vh] animate-pulse" />;

  const s = room.session;
  const ended = s.status === "ended";
  const showQuiz = !ended && !!quiz && (quiz.status !== "ended" || quiz.id !== dismissed);
  const handUp = handWant ?? !!room.me.handUp;
  const here = room.here ?? room.people.filter((p) => p.online).length;

  return (
    <div className="space-y-3">
      {/* On a phone the quiz needs the whole screen, so the class card steps aside. */}
      <div className={`card flex flex-wrap items-center gap-3 p-4 ${showQuiz ? "max-sm:hidden [@media(max-height:520px)]:hidden" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#1657C9]">
            {ended ? <span className="rounded-full bg-ink/10 px-2 py-0.5 text-ink/60">Ended</span> : <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-2 py-0.5 text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live</span>}
            {s.subject ?? "Interactive class"}
          </p>
          <h1 className="mt-1 truncate font-display text-xl font-black text-ink sm:text-2xl">{s.title}</h1>
          <p className="text-sm text-ink/55">with {s.hostName} · {here} here</p>
        </div>
        {!ended && (
          <button type="button" onClick={toggleHand} aria-pressed={handUp}
            className={`min-h-[40px] rounded-full px-4 text-sm font-black transition ${handUp ? "bg-amber-400 text-ink ring-2 ring-amber-500" : "bg-white text-ink/70 ring-1 ring-line hover:ring-amber-400"}`}>
            {handUp ? "✋ Hand up — tap to lower" : "✋ Raise hand"}
          </button>
        )}
        {!ended && (
          <button type="button" onClick={() => setMine((m) => !m)} aria-expanded={mine}
            className="min-h-[40px] rounded-full bg-white px-4 text-sm font-black text-[#1657C9] ring-1 ring-[#BFD7FF] hover:ring-[#1657C9]">📊 {mine ? "Hide my results" : "My results"}</button>
        )}
        {!ended && (
          <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${room.me.canWrite ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" : "bg-ink/5 text-ink/60"}`} role="status">
            {room.me.canWrite ? "✏️ You can write" : "👀 Watching"}
          </span>
        )}
      </div>

      {handNote && !ended && <p role="status" className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${handNote.startsWith("Couldn") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>{handNote}</p>}
      {(ended || (mine && !showQuiz)) && <MyResults sessionId={id} ended={ended} />}
      {ended && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">This class has ended. Here&apos;s the board your {guest ? "teacher" : "tutor"} saved.</p>}

      {!ended && (
        <div hidden={!showQuiz}>
          <QuizPlayer sessionId={id} myName={room.me.name} onState={onState} onDismiss={() => quiz && setDismissed(quiz.id)} />
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
