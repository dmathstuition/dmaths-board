"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { VoiceLink, friendlyMediaError, voiceApi, type Speaker } from "@/lib/voiceClient";
import SpeakerVideo from "@/components/live/SpeakerVideo";
import { VOLUMES, wakeAudio } from "@/lib/loudAudio";
import { canHear, cleanRooms, roomOf, setBreakout, useBreakout, type Rooms } from "@/lib/breakout";

// Video (cameras, screen sharing, video tiles) is switched off for now: the
// class has sound only. Set this to true to bring video back.
export const VIDEO = false;
import CallView, { type Tile } from "@/components/live/CallView";
import { nextActive, onScreen, pageCount, perPage, type CallView as View } from "@/lib/callLayout";

// Class voice and the video call. The teacher talks; everyone listens. The
// teacher can let one learner speak (a speaking pass from the server) — or
// start a video call (optional), where everyone may switch on their own
// microphone and camera, Zoom-style, with gallery and speaker views.
//
// Live messages:
//   "voice"      teacher → all (signed): { speakers, allow, call }, every 4 s while on
//                (call: { pass, exp, open } — open: learners may unmute themselves)
//   "voice-me"   learner → teacher: { by, name, s, t, v?, muted } when their microphone (and camera) is live, { by, off: true } when it stops
//   "voice-mute" teacher → all (signed): mute everyone
//   Breakout groups (lib/breakout.ts): the "voice" message also carries
//   `rooms` — then each learner hears only their own group (and the teacher
//   when they visit it or talk to everyone).
//
// Video only comes to a device for the people on its screen (and only after
// a tap outside a call), to save data.
type Allow = { id: string; name: string; pass: string; exp: number };
type Call = { pass: string; exp: number; open: boolean };
type Person = { id: string; name: string; handAt?: string | null };
const REPEAT_MS = 4000;
const MAX_IN_CALL = 40;

// `lost` counts dropped connections: the hooks reconnect when it goes up.
function useVoiceLink(classId: string, onError: (m: string) => void) {
  const link = useRef<VoiceLink | null>(null);
  const [, bump] = useState(0);
  const [lost, setLost] = useState(0);
  const get = useCallback(() => {
    if (!link.current) {
      link.current = new VoiceLink(voiceApi(classId));
      link.current.onState = () => bump((n) => n + 1);
      link.current.onLost = () => { onError("The connection dropped — reconnecting…"); setLost((n) => n + 1); };
      link.current.onChange = () => bump((n) => n + 1); // video arrived or left
    }
    return link.current;
  }, [classId, onError]);
  useEffect(() => () => { link.current?.close(); link.current = null; }, []);
  const refresh = useCallback(() => bump((n) => n + 1), []); // stable, so effects that use it don't re-run every render
  return { get, refresh, lost };
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

const cleanSpeaker = (s: any): Speaker | null => {
  const sp: Speaker = { id: String(s?.id ?? "").slice(0, 80), name: String(s?.name ?? "").slice(0, 60), s: String(s?.s ?? ""), t: String(s?.t ?? ""), muted: !!s?.muted };
  if (s?.v) sp.v = String(s.v); if (s?.sc) sp.sc = String(s.sc);
  return sp.s && sp.t ? sp : null;
};
const mediaError = (e: unknown, what: "microphone" | "camera") => { console.warn(`${what} failed`, e); return friendlyMediaError(e, what); };

const btnBase = "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition disabled:opacity-60";
const barBtn = (on: boolean, danger = false) => `${btnBase} ${danger ? "bg-red-600 text-white" : on ? "bg-white text-[#0B1220]" : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"}`;

// ── The call screen (both sides): who's on screen, who's talking, which video to receive ──
type Member = { id: string; name: string; sp: Speaker | null; me?: boolean; host?: boolean; hand?: boolean; muted: boolean; localCam?: MediaStream | null };
function useCallScreen(get: () => VoiceLink, inCall: boolean, members: Member[], screen: { name: string; track?: string; local?: MediaStream | null } | null) {
  const [view, setView] = useState<View>("gallery");
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(1200);
  useEffect(() => { const on = () => setWidth(window.innerWidth); on(); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  // Who's talking, from the sound coming in.
  const [active, setActive] = useState<{ id: string | null; since: number }>({ id: null, since: 0 });
  const membersRef = useRef(members); membersRef.current = members;
  useEffect(() => {
    if (!inCall) return;
    const t = setInterval(() => {
      const levels: Record<string, number> = {};
      for (const m of membersRef.current) if (m.sp && !m.me && !m.muted) levels[m.id] = get().level(m.sp.t);
      setActive((a) => { const n = nextActive(levels, a.id, a.since, Date.now()); return n.id === a.id && n.since === a.since ? a : n; });
    }, 400);
    return () => clearInterval(t);
  }, [inCall, get]);
  // A screen appears: show it big.
  const screenOn = !!screen;
  useEffect(() => { if (screenOn) setView((v) => (v === "gallery" ? "speaker" : v)); }, [screenOn]);

  const per = perPage(width);
  const people = members.map((m) => ({ ...m, hasVideo: !!(m.sp?.v || m.localCam) }));
  const shown = onScreen(view, people, page, per, active.id, screenOn && view === "speaker");
  // In board view, one corner picture: the person talking, else the teacher.
  const corner = view === "board" ? (people.find((p) => p.id === active.id && p.hasVideo && !p.me) ?? people.find((p) => p.host && p.hasVideo && !p.me) ?? null) : null;
  const wanted = useMemo(() => {
    const set = new Set<string>();
    if (!VIDEO) return set;
    for (const p of [shown.big, ...shown.tiles, corner]) if (p?.sp?.v && !p.me) set.add(p.sp.v);
    if (screen?.track && view === "speaker") set.add(screen.track);
    return set;
  }, [shown.big, shown.tiles, corner, screen?.track, view]);
  const wantedKey = [...wanted].sort().join(",");

  const tileOf = (p: (typeof people)[number]): Tile => ({
    id: p.id, name: p.name, me: p.me, host: p.host, hand: p.hand, muted: p.muted, talking: active.id === p.id,
    stream: p.me ? p.localCam ?? null : p.sp?.v ? get().videoFor(p.sp.v) : null,
  });
  const render = (bar: ReactNode) => {
    if (!inCall) return null;
    if (view === "board") {
      const c = corner ? tileOf(corner) : null;
      return (
        <>
          {VIDEO && <SpeakerVideo stream={c?.stream ?? null} label={c?.name ?? ""} />}
          <button type="button" onClick={() => setView("gallery")} className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-full bg-[#0B1220]/85 px-3 py-2 text-xs font-black text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />Open the {VIDEO ? "video" : "class"} call · {members.length}
          </button>
        </>
      );
    }
    const pages = pageCount(members.length, per);
    return (
      <CallView view={view} onView={setView} big={shown.big ? tileOf(shown.big) : null}
        screen={screen && view === "speaker" ? { name: screen.name, stream: screen.local ?? (screen.track ? get().videoFor(screen.track) : null) } : null}
        tiles={shown.tiles.map(tileOf)} page={Math.min(page, pages - 1)} pages={pages} onPage={(p) => setPage(Math.max(0, Math.min(pages - 1, p)))} count={members.length} bar={bar} />
    );
  };
  return { view, setView, wanted, wantedKey, render };
}

// ── Teacher ──
export function useHostVoice({ classId, me, people }: { classId: string; me: { id: string; name: string }; people: Person[] }) {
  const available = useVoiceAvailable(classId);
  const [err, setErr] = useState("");
  const { get, refresh, lost } = useVoiceLink(classId, setErr);
  const [mine, setMine] = useState<Speaker | null>(null);
  const [student, setStudent] = useState<Speaker | null>(null);
  const [allow, setAllow] = useState<Allow | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [parts, setParts] = useState<Record<string, Speaker>>({}); // learners in the video call
  const [busy, setBusy] = useState(false);
  const allowRef = useRef(allow); allowRef.current = allow;
  const callRef = useRef(call); callRef.current = call;
  const names = useRef(new Map<string, string>()); names.current = new Map(people.map((p) => [p.id, p.name]));
  const bo = useBreakout();
  const rooms: Rooms | null = call ? bo.rooms : null;
  useEffect(() => { setBreakout({ voiceOn: available }); }, [available]);

  const speakers = useMemo(() => {
    const list = [mine, student, ...Object.values(parts)].filter((s): s is Speaker => !!s);
    return list.filter((s, i) => list.findIndex((x) => x.id === s.id) === i).slice(0, MAX_IN_CALL);
  }, [mine, student, parts]);
  const state = useRef({ speakers, allow, call, rooms }); state.current = { speakers, allow, call, rooms };
  const send = useLive({
    "voice-me": (p: any) => {
      const by = String(p?.by ?? "");
      if (!by) return;
      if (callRef.current) { // anyone may join the call
        setParts((cur) => {
          if (p.off) { if (!cur[by]) return cur; const next = { ...cur }; delete next[by]; return next; }
          const sp = cleanSpeaker({ ...p, id: by, name: names.current.get(by) ?? p.name ?? "Learner" });
          if (!sp || JSON.stringify(cur[by]) === JSON.stringify(sp)) return cur;
          return { ...cur, [by]: sp };
        });
        return;
      }
      const a = allowRef.current;
      if (!a || by !== a.id) return; // only the learner who was let in
      setStudent(p.off ? null : cleanSpeaker({ ...p, id: a.id, name: a.name }));
    },
  });
  const announce = useCallback(() => send("voice", { host: true, ...state.current }), [send]);
  const live = !!mine || !!allow || !!call;
  useEffect(() => { announce(); }, [mine, student, allow, call, parts, rooms, announce]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(announce, REPEAT_MS);
    return () => clearInterval(t);
  }, [live, announce]);
  useEffect(() => { get().onShareEnded = () => setMine((m) => (m ? { ...m, sc: undefined } : m)); }, [get]);

  // The call screen.
  const members: Member[] = call ? [
    ...(mine ? [{ id: me.id, name: me.name, sp: mine, me: true, host: true, muted: get().muted, localCam: mine.v ? get().cameraStream : null }] : []),
    ...Object.values(parts).filter((sp) => !rooms?.visit || canHear(rooms, me.id, sp.id))
      .map((sp) => ({ id: sp.id, name: sp.name, sp, muted: !!sp.muted, hand: !!people.find((p) => p.id === sp.id)?.handAt })),
  ] : [];
  const screen = call && mine?.sc ? { name: me.name, local: get().screenStream } : null;
  const cs = useCallScreen(get, !!call, members, screen);
  // The teacher hears the learner who is speaking — or everyone in the call.
  const csWanted = useRef(cs.wanted); csWanted.current = cs.wanted;
  useEffect(() => {
    if (!live) return;
    const remote = call ? Object.values(parts).filter((sp) => canHear(rooms, me.id, sp.id)) : student ? [student] : [];
    get().listen(remote, call ? csWanted.current : true).catch(() => {});
  }, [student, parts, call, live, get, cs.wantedKey, lost, rooms, me.id]);
  // The connection dropped: reconnect my microphone (and camera) by myself.
  const mineRef = useRef(mine); mineRef.current = mine;
  useEffect(() => {
    if (!lost) return;
    const was = mineRef.current;
    setStudent(null);
    if (!was) return;
    setMine(null);
    (async () => {
      try {
        const r = await get().speak();
        let next: Speaker = { id: me.id, name: me.name, ...r };
        if (was.v) { const c = await get().camera().catch(() => null); if (c) next = { ...next, v: c.v }; }
        if (was.muted) get().mute(true);
        setMine({ ...next, muted: !!was.muted }); setErr("");
      } catch (e) { setErr(mediaError(e, "microphone")); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lost]);

  async function start() {
    setBusy(true); setErr("");
    try { const r = await get().speak(); setMine({ id: me.id, name: me.name, ...r }); return true; }
    catch (e) { setErr(mediaError(e, "microphone")); return false; }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true);
    await get().stopSpeaking().catch(() => {});
    setMine(null); setAllow(null); setStudent(null); setCall(null); setParts({});
    get().close();
    setBusy(false);
  }
  function mute() { get().mute(!get().muted); setMine((m) => (m ? { ...m, muted: get().muted } : m)); refresh(); }
  async function camera() {
    setErr("");
    if (mine?.v) { await get().stopCamera().catch(() => {}); setMine((m) => (m ? { ...m, v: undefined } : m)); return; }
    try { const r = await get().camera(); setMine((m) => (m ? { ...m, v: r.v } : m)); }
    catch (e) { setErr(mediaError(e, "camera")); }
  }
  async function share() {
    setErr("");
    if (mine?.sc) { await get().stopShare().catch(() => {}); setMine((m) => (m ? { ...m, sc: undefined } : m)); return; }
    try { const r = await get().share(); setMine((m) => (m ? { ...m, sc: r.sc } : m)); }
    catch (e) { if (!(e instanceof Error && /NotAllowed|Permission|AbortError/i.test(e.name))) setErr(e instanceof Error ? e.message : "Couldn't share the screen."); }
  }
  async function letSpeak(p: Person) {
    setErr("");
    try { const r = await voiceApi(classId)("allow", { learner: p.id }); setStudent(null); setAllow({ id: p.id, name: p.name, pass: r.pass, exp: r.exp }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't let them speak."); }
  }
  function stopStudent() { setAllow(null); setStudent(null); }
  async function startCall(view: View = "gallery") {
    setErr("");
    if (!mine && !(await start())) return;
    try {
      const r = await voiceApi(classId)("allow", { learner: "*" });
      setAllow(null); setStudent(null);
      setCall({ pass: r.pass, exp: r.exp, open: true }); cs.setView(view);
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't start the video call."); }
  }
  // Groups with sound: start the class call by itself (once per set of groups).
  const autoFor = useRef<string | null>(null);
  useEffect(() => {
    const r = bo.rooms;
    if (!r || !bo.sound || !available || call || busy || autoFor.current === r.id) return;
    autoFor.current = r.id;
    startCall("board"); // the group boards stay in front
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bo.rooms?.id, bo.sound, available, call, busy]);
  function endCall() { setCall(null); setParts({}); if (mine?.sc) share(); }
  function muteAll() { send("voice-mute", { host: true, at: Date.now() }); }
  function setOpen(open: boolean) { setCall((c) => (c ? { ...c, open } : c)); if (!open) muteAll(); }

  const hands = people.filter((p) => p.handAt && p.id !== allow?.id);
  const controls = (full: boolean) => !available ? null : (
    <span className="inline-flex flex-wrap items-center gap-1">
      {!mine ? (
        <>
          <button type="button" onClick={start} disabled={busy} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line hover:ring-[#0E6E72]"}`} title="Talk to the class from the board">
            <span aria-hidden>🎙</span>{busy ? "Starting…" : full ? "" : "Start voice"}
          </button>
          <button type="button" onClick={() => startCall()} disabled={busy} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line hover:ring-[#0E6E72]"}`} title={VIDEO ? "A video call with the class — everyone can switch on their camera and microphone" : "A call with the class — everyone can switch on their microphone and talk"}>
            <span aria-hidden>{VIDEO ? "📹" : "📞"}</span>{full ? "" : VIDEO ? "Video call" : "Class call"}
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={mute} aria-pressed={get().muted} className={`${btnBase} ${get().muted ? "bg-amber-400 text-ink" : "bg-red-500 text-white"}`} title={get().muted ? "Unmute" : "Mute"} aria-label={get().muted ? "Unmute my microphone" : "Mute my microphone"}>
            {get().muted ? <><span aria-hidden>🔇</span>{full ? "" : "Muted"}</> : <><span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-white" />{full ? "" : "On air"}</>}
          </button>
          {VIDEO && <button type="button" onClick={camera} aria-pressed={!!mine.v} className={`${btnBase} ${mine.v ? "bg-[#0E6E72] text-white" : full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label={mine.v ? "Turn my camera off" : "Turn my camera on"}>
            <span aria-hidden>📷</span>{full ? "" : mine.v ? "Camera on" : "Camera"}
          </button>}
          {call ? (
            <button type="button" onClick={() => cs.setView(cs.view === "board" ? "gallery" : "board")} className={`${btnBase} bg-emerald-600 text-white`} aria-label={cs.view === "board" ? "Open the video call" : "Back to the board"}>
              <span aria-hidden>{VIDEO ? "📹" : "📞"}</span>{full ? "" : cs.view === "board" ? `Call (${members.length})` : "Board"}
            </button>
          ) : (
            <button type="button" onClick={() => startCall()} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label={VIDEO ? "Start a video call" : "Start a class call"}>
              <span aria-hidden>{VIDEO ? "📹" : "📞"}</span>{full ? "" : VIDEO ? "Video call" : "Class call"}
            </button>
          )}
          <button type="button" onClick={stop} disabled={busy} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label="Stop voice">
            <span aria-hidden>⏹</span>{full ? "" : "Stop voice"}
          </button>
          {(student || Object.keys(parts).length > 0) && <VolumeButton link={get} dark={full} />}
        </>
      )}
      {!call && (allow ? (
        <button type="button" onClick={stopStudent} className={`${btnBase} bg-emerald-600 text-white`} aria-label={`Stop ${allow.name} speaking`}>
          <span aria-hidden>🗣</span>{student ? `${allow.name} is speaking` : `${allow.name} may speak`} · Stop
        </button>
      ) : mine && hands.length > 0 ? (
        <button type="button" onClick={() => letSpeak(hands[0])} className={`${btnBase} bg-amber-100 text-amber-900 ring-1 ring-amber-300`} aria-label={`Let ${hands[0].name} speak`}>
          <span aria-hidden>✋</span>Let {hands[0].name} speak
        </button>
      ) : null)}
      {err && !(call && cs.view !== "board") && <span role="alert" className={`text-xs font-bold ${full ? "text-red-300" : "text-red-700"}`}>{err}</span>}
    </span>
  );
  const bar = mine && call ? (
    <>
      <button type="button" onClick={mute} className={barBtn(!get().muted)} aria-label={get().muted ? "Unmute my microphone" : "Mute my microphone"}>{get().muted ? "🔇 Unmute" : "🎙 Mute"}</button>
      {VIDEO && <button type="button" onClick={camera} className={barBtn(!!mine.v)} aria-label={mine.v ? "Turn my camera off" : "Turn my camera on"}>📷 {mine.v ? "Stop video" : "Start video"}</button>}
      {VIDEO && <button type="button" onClick={share} className={barBtn(!!mine.sc)} aria-label={mine.sc ? "Stop sharing my screen" : "Share my screen"}>🖥 {mine.sc ? "Stop sharing" : "Share screen"}</button>}
      <VolumeButton link={get} dark />
      <button type="button" onClick={muteAll} className={barBtn(false)}>🔇 Mute everyone</button>
      <label className={`${barBtn(call.open)} cursor-pointer`}>
        <input type="checkbox" checked={call.open} onChange={(e) => setOpen(e.target.checked)} className="h-4 w-4 accent-emerald-500" /> Learners can unmute
      </label>
      <button type="button" onClick={endCall} className={barBtn(false, true)}>End call</button>
      {err && <span role="alert" className="w-full text-center text-xs font-bold text-red-300">{err}</span>}
    </>
  ) : null;
  // Outside a call: the learner who is speaking if their camera is on, otherwise my own camera.
  const studentVideo = student?.v ? get().videoFor(student.v) : null;
  const overlay = () => call ? cs.render(bar)
    : !VIDEO ? null
      : studentVideo ? <SpeakerVideo stream={studentVideo} label={student!.name} />
        : <SpeakerVideo stream={mine?.v ? get().cameraStream : null} label="You" mirror />;
  return { available, controls, overlay };
}

// ── Learner ──
export function useLearnerVoice({ classId, me }: { classId: string; me: { id: string; name?: string } }) {
  const [err, setErr] = useState("");
  const { get, refresh, lost } = useVoiceLink(classId, setErr);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [allow, setAllow] = useState<Allow | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [joined, setJoined] = useState(false); // in the video call
  const [listening, setListening] = useState(false);
  const [talking, setTalking] = useState<{ s: string; t: string; v?: string; muted?: boolean } | null>(null);
  const [watch, setWatch] = useState(false); // receive video outside a call (off until asked, to save data)
  const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<Rooms | null>(null); // breakout groups (lib/breakout.ts)
  const lastHeard = useRef(0);
  const talkingRef = useRef(talking); talkingRef.current = talking;
  const callRef = useRef(call); callRef.current = call;
  const joinedRef = useRef(joined); joinedRef.current = joined;
  const allowRef = useRef(allow); allowRef.current = allow;
  const myName = me.name ?? "";

  const tell = useRef<(t: typeof talking) => void>(() => {});
  const send = useLive({
    voice: (p: any) => {
      lastHeard.current = Date.now();
      const list: Speaker[] = (Array.isArray(p?.speakers) ? p.speakers : []).slice(0, MAX_IN_CALL).map(cleanSpeaker).filter(Boolean) as Speaker[];
      setSpeakers((old) => (JSON.stringify(old) === JSON.stringify(list) ? old : list));
      const a = p?.allow && p.allow.id === me.id ? { id: me.id, name: "", pass: String(p.allow.pass), exp: Number(p.allow.exp) } : null;
      setAllow((old) => (old?.pass === a?.pass ? old : a));
      const c = p?.call && p.call.pass ? { pass: String(p.call.pass), exp: Number(p.call.exp), open: !!p.call.open } : null;
      setCall((old) => (JSON.stringify(old) === JSON.stringify(c) ? old : c));
      const r = c ? cleanRooms(p?.rooms) : null;
      setRooms((old) => (JSON.stringify(old) === JSON.stringify(r) ? old : r));
    },
    "voice-mute": (p: any) => {
      if (!p?.host || !talkingRef.current) return;
      get().mute(true);
      const next = { ...talkingRef.current, muted: true };
      setTalking(next); tell.current(next);
    },
  });
  tell.current = (t) => send("voice-me", t ? { by: me.id, name: myName, ...t } : { by: me.id, off: true });
  // The teacher stopped sending: voice is over.
  useEffect(() => {
    const t = setInterval(() => { if (lastHeard.current && Date.now() - lastHeard.current > REPEAT_MS * 4) { lastHeard.current = 0; setSpeakers([]); setAllow(null); setCall(null); setRooms(null); } }, REPEAT_MS);
    return () => clearInterval(t);
  }, []);
  // The call ended: leave it.
  useEffect(() => { if (!call && joined) setJoined(false); }, [call, joined]);
  // Lost the speaking pass (and not in a call): stop the microphone.
  useEffect(() => {
    if (allow || (call && joined) || !talking) return;
    get().stopSpeaking().catch(() => {});
    setTalking(null);
    tell.current(null);
  }, [allow, call, joined, talking, get]);
  useEffect(() => {
    if (!talking) return;
    const t = setInterval(() => tell.current(talkingRef.current), REPEAT_MS);
    return () => clearInterval(t);
  }, [talking]);

  // The call screen.
  const mySession = get().sessionId;
  const members: Member[] = call && joined ? [
    ...speakers.map((sp, i) => ({ sp, i })).filter(({ sp }) => sp.s !== mySession && canHear(rooms, me.id, sp.id))
      .map(({ sp, i }) => ({ id: sp.id, name: sp.name || "Teacher", sp, host: i === 0, muted: !!sp.muted })),
    { id: me.id, name: myName || "You", sp: null, me: true, muted: !talking || !!talking.muted, localCam: talking?.v ? get().cameraStream : null },
  ] : [];
  const teacherSp = speakers[0];
  const screen = call && joined && teacherSp?.sc ? { name: teacherSp.name || "Teacher", track: teacherSp.sc } : null;
  const cs = useCallScreen(get, !!call && joined, members, screen);
  const csWanted = useRef(cs.wanted); csWanted.current = cs.wanted;
  useEffect(() => {
    if (!listening) return;
    get().listen(speakers.filter((sp) => canHear(rooms, me.id, sp.id)), call && joined ? csWanted.current : watch).then(refresh).catch((e) => { console.warn("listen failed", e); setErr("The class sound or video didn't come through — it will try again."); });
  }, [speakers, listening, watch, call, joined, get, refresh, cs.wantedKey, lost, rooms, me.id]);
  // The connection dropped: hearing comes back by itself (above); in a call,
  // switch my microphone (and camera) back on as they were.
  useEffect(() => {
    if (!lost) return;
    const was = talkingRef.current;
    if (!was) return;
    setTalking(null);
    const pass = callRef.current && joinedRef.current ? callRef.current : allowRef.current;
    if (!pass) { tell.current(null); return; }
    (async () => {
      try {
        const r = await get().speak({ pass: pass.pass, exp: pass.exp });
        let next: { s: string; t: string; v?: string; muted?: boolean } = { ...r, muted: !!was.muted };
        if (was.muted) get().mute(true);
        if (was.v) { const c = await get().camera({ pass: pass.pass, exp: pass.exp }).catch(() => null); if (c) next = { ...next, v: c.v }; }
        setTalking(next); tell.current(next); setErr("");
      } catch (e) { setErr(mediaError(e, "microphone")); tell.current(null); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lost]);

  function listen() { setErr(""); wakeAudio(); setListening(true); get().resume(); }
  async function talk() {
    if (!allow) return;
    setBusy(true); setErr("");
    try { const r = await get().speak({ pass: allow.pass, exp: allow.exp }); setTalking(r); tell.current(r); }
    catch (e) { setErr(mediaError(e, "microphone")); }
    finally { setBusy(false); }
  }
  async function join(view: View = "gallery") {
    if (!call) return;
    setBusy(true); setErr("");
    wakeAudio(); setListening(true); get().resume(); setJoined(true); cs.setView(view);
    // Join with the microphone on but muted (like a meeting); without one, just watch and listen.
    try { const r = await get().speak({ pass: call.pass, exp: call.exp }); get().mute(true); const next = { ...r, muted: true }; setTalking(next); tell.current(next); }
    catch (e) { setErr(`${mediaError(e, "microphone")} You can still listen.`); }
    finally { setBusy(false); }
  }
  async function leave() {
    await get().stopSpeaking().catch(() => {});
    setTalking(null); setJoined(false);
    tell.current(null);
  }
  function toggleMute() {
    if (!talking) return;
    if (talking.muted && call && !call.open) { setErr("Your teacher has turned off unmuting — raise your hand."); return; }
    setErr("");
    get().mute(!talking.muted);
    const next = { ...talking, muted: !talking.muted };
    setTalking(next); tell.current(next);
  }
  async function myCamera() {
    const pass = call && joined ? call : allow;
    if (!pass || !talking) return;
    setErr("");
    if (talking.v) {
      await get().stopCamera().catch(() => {});
      const next = { ...talking }; delete next.v;
      setTalking(next); tell.current(next);
      return;
    }
    try { const r = await get().camera({ pass: pass.pass, exp: pass.exp }); const next = { ...talking, v: r.v }; setTalking(next); tell.current(next); }
    catch (e) { setErr(mediaError(e, "camera")); }
  }
  async function stopTalking() {
    await get().stopSpeaking().catch(() => {});
    setTalking(null);
    tell.current(null);
  }

  // The group board shows "Talk with your group" and joins the call from there.
  const joinRef = useRef(join); joinRef.current = join;
  const muteRef = useRef(toggleMute); muteRef.current = toggleMute;
  useEffect(() => {
    setBreakout({ rooms, call: !!call, inCall: !!call && joined, muted: !talking || !!talking.muted, join: () => joinRef.current("board"), toggleMute: () => muteRef.current() });
  }, [rooms, call, joined, talking]);
  const myRoom = roomOf(rooms, me.id);
  const teacherOn = speakers.length > 0;
  const hasVideo = speakers.some((s) => s.v);
  const inCall = !!call && joined;
  const controls = (full: boolean) => (!teacherOn && !allow) ? null : (
    <span className="inline-flex flex-wrap items-center gap-1">
      {call && !joined && (
        <button type="button" onClick={() => join()} disabled={busy} className={`${btnBase} animate-pulse bg-emerald-600 text-white`} aria-label={VIDEO ? "Join the video call" : "Join the call"}>
          <span aria-hidden>{VIDEO ? "📹" : "📞"}</span>{busy ? "Joining…" : VIDEO ? "Join video call" : myRoom ? `Talk with ${myRoom.name}` : "Join the call"}
        </button>
      )}
      {inCall && (
        <button type="button" onClick={() => cs.setView(cs.view === "board" ? "gallery" : "board")} className={`${btnBase} bg-emerald-600 text-white`} aria-label={cs.view === "board" ? "Open the video call" : "Back to the board"}>
          <span aria-hidden>{VIDEO ? "📹" : "📞"}</span>{full ? "" : cs.view === "board" ? (VIDEO ? "Video call" : "Class call") : "Board"}
        </button>
      )}
      {teacherOn && !listening && !call && (
        <button type="button" onClick={listen} className={`${btnBase} animate-pulse bg-[#0E6E72] text-white`} aria-label="Listen to the class">
          <span aria-hidden>🔊</span>{full ? "Listen" : "Tap to listen"}
        </button>
      )}
      {teacherOn && !listening && call && (
        <button type="button" onClick={listen} className={`${btnBase} ${full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`} aria-label="Listen to the class">
          <span aria-hidden>🔊</span>{full ? "" : "Just listen"}
        </button>
      )}
      {teacherOn && listening && !inCall && (
        <span role="status" className={`${btnBase} ${full ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300"}`}>
          <span aria-hidden>🔊</span>{full ? "" : "Listening"}
        </span>
      )}
      {VIDEO && teacherOn && listening && hasVideo && !inCall && (
        <button type="button" onClick={() => setWatch((w) => !w)} aria-pressed={watch} className={`${btnBase} ${watch ? "bg-[#0E6E72] text-white" : full ? "bg-white/10 text-white ring-1 ring-white/30" : "bg-white text-ink ring-1 ring-line"}`}
          aria-label={watch ? "Turn video off" : "Show the video"} title="Video uses more data than sound">
          <span aria-hidden>📺</span>{full ? "" : watch ? "Video on" : "Show video"}
        </button>
      )}
      {teacherOn && listening && <VolumeButton link={get} dark={full} />}
      {VIDEO && talking && !inCall && (
        <button type="button" onClick={myCamera} aria-pressed={!!talking.v} className={`${btnBase} ${talking.v ? "bg-[#0E6E72] text-white" : "bg-white text-ink ring-1 ring-line"}`} aria-label={talking.v ? "Turn my camera off" : "Turn my camera on"}>
          <span aria-hidden>📷</span>{full ? "" : talking.v ? "Camera on" : "Camera"}
        </button>
      )}
      {allow && !talking && !inCall && (
        <button type="button" onClick={talk} disabled={busy} className={`${btnBase} bg-emerald-600 text-white`} aria-label="Speak to the class">
          <span aria-hidden>🎙</span>{busy ? "Starting…" : "Speak"}
        </button>
      )}
      {talking && !inCall && (
        <button type="button" onClick={stopTalking} className={`${btnBase} bg-red-500 text-white`} aria-label="Stop speaking">
          <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-white" />{full ? "" : "Speaking — stop"}
        </button>
      )}
      {err && !(inCall && cs.view !== "board") && <span role="alert" className={`text-xs font-bold ${full ? "text-red-300" : "text-red-700"}`}>{err}</span>}
    </span>
  );
  const bar = inCall ? (
    <>
      <button type="button" onClick={toggleMute} disabled={!talking} className={barBtn(!!talking && !talking.muted)} aria-label={!talking || talking.muted ? "Unmute my microphone" : "Mute my microphone"}>{!talking || talking.muted ? "🔇 Unmute" : "🎙 Mute"}</button>
      {VIDEO && <button type="button" onClick={myCamera} disabled={!talking} className={barBtn(!!talking?.v)} aria-label={talking?.v ? "Turn my camera off" : "Turn my camera on"}>📷 {talking?.v ? "Stop video" : "Start video"}</button>}
      <VolumeButton link={get} dark />
      <button type="button" onClick={leave} className={barBtn(false, true)}>Leave call</button>
      {call && !call.open && <span className="text-xs font-bold text-white/60">Your teacher controls unmuting</span>}
      {myRoom && <span className="w-full text-center text-xs font-bold text-emerald-300">You hear {myRoom.name}{rooms && (rooms.all || rooms.visit === myRoom.id) ? " and your teacher" : ""}</span>}
      {err && <span role="alert" className="w-full text-center text-xs font-bold text-red-300">{err}</span>}
    </>
  ) : null;
  // Outside a call: my own camera while I'm showing it; otherwise the speaker
  // who has a camera on (a learner speaking first, then the teacher), once video is on.
  const shown = [...speakers].reverse().find((sp) => sp.v && sp.s !== get().sessionId);
  const theirs = watch && shown ? get().videoFor(shown.v) : null;
  const overlay = () => inCall ? cs.render(bar)
    : !VIDEO ? null
      : talking?.v ? <SpeakerVideo stream={get().cameraStream} label="You" mirror />
        : <SpeakerVideo stream={theirs} label={shown?.name || "Teacher"} />;
  return { controls, overlay, teacherOn, listening };
}


// How loud the class sound plays on this device: Normal, Loud (the default) or
// Extra loud — past what a web page's own volume allows (lib/loudAudio).
function VolumeButton({ link, dark }: { link: () => VoiceLink; dark?: boolean }) {
  const [v, setV] = useState(() => { try { return Number(localStorage.getItem("board-volume")) || 2; } catch { return 2; } });
  useEffect(() => { link().setVolume(v); }, [v, link]);
  const next = VOLUMES[(VOLUMES.findIndex((x) => x.v === v) + 1) % VOLUMES.length];
  const now = VOLUMES.find((x) => x.v === v) ?? VOLUMES[1];
  return (
    <button type="button" onClick={() => { wakeAudio(); setV(next.v); try { localStorage.setItem("board-volume", String(next.v)); } catch { /* storage blocked */ } }}
      className={`${btnBase} ${dark ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" : "bg-white text-ink ring-1 ring-line hover:ring-[#0E6E72]"}`}
      aria-label={`Volume: ${now.label}. Tap for ${next.label}`} title={`Tap for ${next.label}`}>
      <span aria-hidden>{v >= 3 ? "📢" : v >= 2 ? "🔊" : "🔉"}</span>{now.label}
    </button>
  );
}
