"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { VoiceLink, voiceApi, type Speaker } from "@/lib/voiceClient";
import SpeakerVideo from "@/components/live/SpeakerVideo";

// Class voice. The teacher talks; everyone listens. The teacher can let one
// learner speak too (a speaking pass from the server).
//
// Live messages:
//   "voice"    teacher → all (signed): { speakers, allow: { id, name, pass, exp } | null }, every 4 s while on
//   "voice-me" learner → teacher: { by, s, t, v? } when their microphone (and camera) is live, { by, off: true } when it stops
//
// Camera: whoever is speaking may turn their camera on (track `v`). Learners
// only receive video after tapping "Show video", to save their data.
//
// The connection lives here (outside the board), so going full screen never cuts
// the sound; the buttons are handed to the board's toolbar so they show in full screen.
type Allow = { id: string; name: string; pass: string; exp: number };
type Person = { id: string; name: string; handAt?: string | null };
const REPEAT_MS = 4000;

function useVoiceLink(classId: string, onError: (m: string) => void) {
  const link = useRef<VoiceLink | null>(null);
  const [, bump] = useState(0);
  const get = useCallback(() => {
    if (!link.current) {
      link.current = new VoiceLink(voiceApi(classId));
      link.current.onState = (st) => { if (st === "failed") onError("The voice connection dropped — tap to reconnect."); bump((n) => n + 1); };
      link.current.onChange = () => bump((n) => n + 1); // video arrived or left
    }
    return link.current;
  }, [classId, onError]);
  useEffect(() => () => { link.current?.close(); link.current = null; }, []);
  const refresh = useCallback(() => bump((n) => n + 1), []); // stable, so effects that use it don't re-run every render
  return { get, refresh };
}

function useVoiceAvailable(classId: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    voiceApi(classId)("config").then((j) => { if (live) setOn(!!j.on); }).catch(() => {});
    return () => { live = false; };
  }, [classId]);
  return on;
}

const btnBase = "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition disabled:opacity-60";

// ── Teacher ──
export function useHostVoice({ classId, me, people }: { classId: string; me: { id: string; name: string }; people: Person[] }) {
  const available = useVoiceAvailable(classId);
  const [err, setErr] = useState("");
  const { get, refresh } = useVoiceLink(classId, setErr);
  const [mine, setMine] = useState<Speaker | null>(null);
  const [student, setStudent] = useState<Speaker | null>(null);
  const [allow, setAllow] = useState<Allow | null>(null);
  const [busy, setBusy] = useState(false);
  const allowRef = useRef(allow); allowRef.current = allow;

  const speakers = [mine, student].filter((s): s is Speaker => !!s);
  const state = useRef({ speakers, allow }); state.current = { speakers, allow };
  const send = useLive({
    "voice-me": (p: any) => {
      const a = allowRef.current;
      if (!a || p?.by !== a.id) return; // only the learner who was let in
      setStudent(p.off ? null : { id: a.id, name: a.name, s: String(p.s ?? ""), t: String(p.t ?? ""), ...(p.v ? { v: String(p.v) } : {}) });
    },
  });
  const announce = useCallback(() => send("voice", { host: true, speakers: state.current.speakers, allow: state.current.allow }), [send]);
  const live = !!mine || !!allow;
  useEffect(() => { announce(); }, [mine, student, allow, announce]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(announce, REPEAT_MS);
    return () => clearInterval(t);
  }, [live, announce]);
  // The teacher hears the learner who is speaking.
  useEffect(() => { if (live) get().listen(student ? [student] : [], true).catch(() => {}); }, [student, live, get]);

  async function start() {
    setBusy(true); setErr("");
    try { const r = await get().speak(); setMine({ id: me.id, name: me.name, ...r }); }
    catch (e) { setErr(e instanceof Error && /Permission|NotAllowed/i.test(e.name + e.message) ? "Allow the microphone in your browser to talk to the class." : e instanceof Error ? e.message : "Voice couldn't start."); }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true);
    await get().stopSpeaking().catch(() => {});
    setMine(null); setAllow(null); setStudent(null);
    get().close();
    setBusy(false);
  }
  function mute() { get().mute(!get().muted); refresh(); }
  async function camera() {
    setErr("");
    if (mine?.v) { await get().stopCamera().catch(() => {}); setMine((m) => (m ? { ...m, v: undefined } : m)); return; }
    try { const r = await get().camera(); setMine((m) => (m ? { ...m, v: r.v } : m)); }
    catch (e) { setErr(e instanceof Error && /Permission|NotAllowed|NotFound/i.test(e.name + e.message) ? "Allow the camera in your browser (or check one is connected)." : e instanceof Error ? e.message : "The camera couldn't start."); }
  }
  async function letSpeak(p: Person) {
    setErr("");
    try { const r = await voiceApi(classId)("allow", { learner: p.id }); setStudent(null); setAllow({ id: p.id, name: p.name, pass: r.pass, exp: r.exp }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't let them speak."); }
  }
  function stopStudent() { setAllow(null); setStudent(null); }

  const hands = people.filter((p) => p.handAt && p.id !== allow?.id);
  const controls = (full: boolean) => !available ? null : (
    <span className="inline-flex flex-wrap items-center gap-1">
      {!mine ? (
        <button type="button" onClick={start} disabled={busy} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line hover:ring-[#1657C9]"}`} title="Talk to the class from the board">
          <span aria-hidden>🎙</span>{busy ? "Starting…" : full ? "" : "Start voice"}
        </button>
      ) : (
        <>
          <button type="button" onClick={mute} aria-pressed={get().muted} className={`${btnBase} ${get().muted ? "bg-amber-400 text-ink" : "bg-red-500 text-white"}`} title={get().muted ? "Unmute" : "Mute"} aria-label={get().muted ? "Unmute my microphone" : "Mute my microphone"}>
            {get().muted ? <><span aria-hidden>🔇</span>{full ? "" : "Muted"}</> : <><span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-white" />{full ? "" : "On air"}</>}
          </button>
          <button type="button" onClick={camera} aria-pressed={!!mine.v} className={`${btnBase} ${mine.v ? "bg-[#1657C9] text-white" : full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label={mine.v ? "Turn my camera off" : "Turn my camera on"}>
            <span aria-hidden>📷</span>{full ? "" : mine.v ? "Camera on" : "Camera"}
          </button>
          <button type="button" onClick={stop} disabled={busy} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label="Stop voice">
            <span aria-hidden>⏹</span>{full ? "" : "Stop voice"}
          </button>
        </>
      )}
      {allow ? (
        <button type="button" onClick={stopStudent} className={`${btnBase} bg-emerald-600 text-white`} aria-label={`Stop ${allow.name} speaking`}>
          <span aria-hidden>🗣</span>{student ? `${allow.name} is speaking` : `${allow.name} may speak`} · Stop
        </button>
      ) : mine && hands.length > 0 ? (
        <button type="button" onClick={() => letSpeak(hands[0])} className={`${btnBase} bg-amber-100 text-amber-900 ring-1 ring-amber-300`} aria-label={`Let ${hands[0].name} speak`}>
          <span aria-hidden>✋</span>Let {hands[0].name} speak
        </button>
      ) : null}
      {err && <span role="alert" className={`text-xs font-bold ${full ? "text-red-300" : "text-red-700"}`}>{err}</span>}
    </span>
  );
  // The window: the learner who is speaking if their camera is on, otherwise my own camera.
  const studentVideo = student?.v ? get().videoFor(student.v) : null;
  const overlay = () => studentVideo
    ? <SpeakerVideo stream={studentVideo} label={student!.name} />
    : <SpeakerVideo stream={mine?.v ? get().cameraStream : null} label="You" mirror />;
  return { available, controls, overlay };
}

// ── Learner ──
export function useLearnerVoice({ classId, me }: { classId: string; me: { id: string } }) {
  const [err, setErr] = useState("");
  const { get, refresh } = useVoiceLink(classId, setErr);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [allow, setAllow] = useState<Allow | null>(null);
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState<{ s: string; t: string; v?: string } | null>(null);
  const [watch, setWatch] = useState(false); // receive video (off until asked, to save data)
  const [busy, setBusy] = useState(false);
  const lastHeard = useRef(0);

  const send = useLive({
    voice: (p: any) => {
      lastHeard.current = Date.now();
      const list: Speaker[] = (Array.isArray(p?.speakers) ? p.speakers : []).slice(0, 4)
        .map((s: any) => ({ id: String(s?.id ?? ""), name: String(s?.name ?? ""), s: String(s?.s ?? ""), t: String(s?.t ?? ""), ...(s?.v ? { v: String(s.v) } : {}) }))
        .filter((s: Speaker) => s.s && s.t);
      setSpeakers((old) => (JSON.stringify(old) === JSON.stringify(list) ? old : list));
      const a = p?.allow && p.allow.id === me.id ? { id: me.id, name: "", pass: String(p.allow.pass), exp: Number(p.allow.exp) } : null;
      setAllow((old) => (old?.pass === a?.pass ? old : a));
    },
  });
  // The teacher stopped sending: voice is over.
  useEffect(() => {
    const t = setInterval(() => { if (lastHeard.current && Date.now() - lastHeard.current > REPEAT_MS * 4) { lastHeard.current = 0; setSpeakers([]); setAllow(null); } }, REPEAT_MS);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (listening) get().listen(speakers, watch).then(refresh).catch((e) => setErr(e?.message ?? "Couldn't play the class sound.")); }, [speakers, listening, watch, get, refresh]);
  // Lost the speaking pass: stop the microphone.
  useEffect(() => {
    if (allow || !talking) return;
    get().stopSpeaking().catch(() => {});
    setTalking(null);
    send("voice-me", { by: me.id, off: true });
  }, [allow, talking, get, send, me.id]);
  useEffect(() => {
    if (!talking) return;
    const t = setInterval(() => send("voice-me", { by: me.id, ...talking }), REPEAT_MS);
    return () => clearInterval(t);
  }, [talking, send, me.id]);

  function listen() { setErr(""); setListening(true); get().resume(); }
  async function talk() {
    if (!allow) return;
    setBusy(true); setErr("");
    try { const r = await get().speak({ pass: allow.pass, exp: allow.exp }); setTalking(r); send("voice-me", { by: me.id, ...r }); }
    catch (e) { setErr(e instanceof Error && /Permission|NotAllowed/i.test(e.name + e.message) ? "Allow the microphone in your browser to speak." : e instanceof Error ? e.message : "Couldn't turn on your microphone."); }
    finally { setBusy(false); }
  }
  async function myCamera() {
    if (!allow || !talking) return;
    setErr("");
    if (talking.v) {
      await get().stopCamera().catch(() => {});
      const next = { s: talking.s, t: talking.t };
      setTalking(next); send("voice-me", { by: me.id, ...next });
      return;
    }
    try { const r = await get().camera({ pass: allow.pass, exp: allow.exp }); const next = { ...talking, v: r.v }; setTalking(next); send("voice-me", { by: me.id, ...next }); }
    catch (e) { setErr(e instanceof Error && /Permission|NotAllowed|NotFound/i.test(e.name + e.message) ? "Allow the camera in your browser to show yourself." : e instanceof Error ? e.message : "The camera couldn't start."); }
  }
  async function stopTalking() {
    await get().stopSpeaking().catch(() => {});
    setTalking(null);
    send("voice-me", { by: me.id, off: true });
  }

  const teacherOn = speakers.length > 0;
  const hasVideo = speakers.some((s) => s.v);
  const controls = (full: boolean) => (!teacherOn && !allow) ? null : (
    <span className="inline-flex flex-wrap items-center gap-1">
      {teacherOn && !listening && (
        <button type="button" onClick={listen} className={`${btnBase} animate-pulse bg-[#1657C9] text-white`} aria-label="Listen to the class">
          <span aria-hidden>🔊</span>{full ? "Listen" : "Tap to listen"}
        </button>
      )}
      {teacherOn && listening && (
        <span role="status" className={`${btnBase} ${full ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300"}`}>
          <span aria-hidden>🔊</span>{full ? "" : "Listening"}
        </span>
      )}
      {teacherOn && listening && hasVideo && (
        <button type="button" onClick={() => setWatch((w) => !w)} aria-pressed={watch} className={`${btnBase} ${watch ? "bg-[#1657C9] text-white" : full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`}
          aria-label={watch ? "Turn video off" : "Show the video"} title="Video uses more data than sound">
          <span aria-hidden>📺</span>{full ? "" : watch ? "Video on" : "Show video"}
        </button>
      )}
      {talking && (
        <button type="button" onClick={myCamera} aria-pressed={!!talking.v} className={`${btnBase} ${talking.v ? "bg-[#1657C9] text-white" : "bg-white text-ink ring-1 ring-line"}`} aria-label={talking.v ? "Turn my camera off" : "Turn my camera on"}>
          <span aria-hidden>📷</span>{full ? "" : talking.v ? "Camera on" : "Camera"}
        </button>
      )}
      {allow && !talking && (
        <button type="button" onClick={talk} disabled={busy} className={`${btnBase} bg-emerald-600 text-white`} aria-label="Speak to the class">
          <span aria-hidden>🎙</span>{busy ? "Starting…" : "Speak"}
        </button>
      )}
      {talking && (
        <button type="button" onClick={stopTalking} className={`${btnBase} bg-red-500 text-white`} aria-label="Stop speaking">
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-white" />{full ? "" : "Speaking — stop"}
        </button>
      )}
      {err && <span role="alert" className={`text-xs font-bold ${full ? "text-red-300" : "text-red-700"}`}>{err}</span>}
    </span>
  );
  // The window: my own camera while I'm showing it; otherwise the speaker who has
  // a camera on (a learner speaking first, then the teacher), once video is on.
  const shown = [...speakers].reverse().find((sp) => sp.v && sp.s !== get().sessionId);
  const theirs = watch && shown ? get().videoFor(shown.v) : null;
  const overlay = () => talking?.v
    ? <SpeakerVideo stream={get().cameraStream} label="You" mirror />
    : <SpeakerVideo stream={theirs} label={shown?.name || "Teacher"} />;
  return { controls, overlay, teacherOn, listening };
}
