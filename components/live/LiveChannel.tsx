"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cryptoReady, importKeys, needsSignature, signPayload, verifyPayload } from "@/lib/liveSignClient";
import { reportProblem } from "@/lib/liveDiag";

// One realtime broadcast channel per interactive class, shared by everything
// on the page (board, quiz, people list). Supabase reuses a channel per topic,
// so each component subscribing on its own would tear the others down — they
// go through this provider instead. Messages are fire-and-forget pings;
// anything that matters is also saved through the API, so a missed message
// only means a slower refresh (every client also polls).
//
// Teacher messages are signed (lib/liveSign*): the host signs anything only a
// teacher may send, and every board drops such a message unless its signature
// checks out — so a student can't pretend to be the teacher.
type Handler = (payload: any) => void;
type Bus = { send: (event: string, payload?: unknown) => void; on: (event: string, fn: Handler) => () => void };
export type LiveStatus = "connecting" | "live" | "offline";

const LiveCtx = createContext<Bus | null>(null);
const StatusCtx = createContext<LiveStatus | null>(null); // null outside a class (e.g. a saved board)

// After a dropped connection comes back, listeners of this event are called so
// they can catch up on anything they missed.
export const RECONNECTED = "_reconnected";

// Per-screen sending budget (see `bucket` below).
const SEND_PER_SECOND = 12, SEND_BURST = 24;
const SKIPPABLE = new Set(["board-live", "board-laser"]);

export function LiveChannelProvider({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const listeners = useRef(new Map<string, Set<Handler>>());
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const wasLive = useRef(false);
  const wentOffline = useRef(false);
  // Signing keys for this class, and queues that keep messages in order while
  // signatures are made and checked.
  const keys = useRef<{ sign: CryptoKey | null; verify: CryptoKey | null }>({ sign: null, verify: null });
  const keysReady = useRef<Promise<void>>(Promise.resolve());
  const sendQ = useRef<Promise<void>>(Promise.resolve());
  const recvQ = useRef<Promise<void>>(Promise.resolve());
  const newestSigned = useRef(0);

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    keys.current = { sign: null, verify: null };
    newestSigned.current = 0;
    // Fetch the keys (a few tries). Messages wait for this briefly so the very
    // first ones are signed/checked too; if it can't be had, the class still
    // works as before.
    const loading = (async () => {
      if (!cryptoReady()) return;
      for (let i = 0; i < 4 && !stop; i++) {
        try {
          const r = await fetch(`/api/live-sessions/keys?id=${sessionId}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
          if (r.ok) { keys.current = await importKeys(await r.json()); return; }
          if (r.status === 403 || r.status === 400) return;
        } catch { /* retry */ }
        await new Promise((ok) => setTimeout(ok, 600 * 2 ** i));
      }
    })();
    // Never hold the class up for long: after a few seconds messages carry on
    // (the keys still arrive in the background and are used from then on).
    keysReady.current = Promise.race([loading, new Promise<void>((ok) => setTimeout(ok, 4000))]);
    const ch = supabase.channel(`live-class:${sessionId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "*" }, (msg: any) => {
      const event = String(msg?.event ?? ""), payload = msg?.payload ?? {};
      recvQ.current = recvQ.current.then(async () => {
        await keysReady.current;
        if (needsSignature(event, payload) && keys.current.verify) {
          if (!(await verifyPayload(keys.current.verify, sessionId, event, payload))) return; // not really the teacher
          // A replayed old message is older than what the teacher has sent since.
          if (payload._ts < newestSigned.current - 30_000) return;
          newestSigned.current = Math.max(newestSigned.current, payload._ts);
        }
        listeners.current.get(event)?.forEach((fn) => fn(payload));
      }).catch(() => {});
    });
    ch.subscribe((st) => {
      if (st === "SUBSCRIBED") {
        setStatus("live");
        if (wentOffline.current) reportProblem("live-recovered", { sessionId });
        if (wasLive.current) listeners.current.get(RECONNECTED)?.forEach((fn) => fn({}));
        wasLive.current = true;
      } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
        setStatus("offline");
        if (st !== "CLOSED") { wentOffline.current = true; reportProblem("live-offline", { sessionId, message: st }); }
      }
    });
    const back = () => { if (document.visibilityState === "visible" && wasLive.current) listeners.current.get(RECONNECTED)?.forEach((fn) => fn({})); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("online", back);
    chRef.current = ch;
    return () => {
      stop = true;
      chRef.current = null; supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", back); window.removeEventListener("online", back);
    };
  }, [sessionId, supabase]);

  // A message budget for this screen. The live service limits messages per
  // second for the whole class, and every message is delivered to every
  // screen — so one screen sending too fast can get the whole class cut off.
  // In-progress drawing and the laser are simply skipped when over budget (the
  // finished stroke always follows); everything else waits its turn.
  const bucket = useRef({ tokens: SEND_BURST, at: Date.now() });

  const bus = useMemo<Bus>(() => ({
    send: (event, payload = {}) => {
      sendQ.current = sendQ.current.then(async () => {
        const b = bucket.current;
        const refill = () => { const now = Date.now(); b.tokens = Math.min(SEND_BURST, b.tokens + ((now - b.at) / 1000) * SEND_PER_SECOND); b.at = now; };
        refill();
        if (b.tokens < 1) {
          if (SKIPPABLE.has(event)) return;
          await new Promise((ok) => setTimeout(ok, ((1 - b.tokens) / SEND_PER_SECOND) * 1000));
          refill();
        }
        b.tokens -= 1;
        let body: any = payload;
        if (needsSignature(event, payload)) {
          await keysReady.current;
          if (keys.current.sign) body = await signPayload(keys.current.sign, sessionId, event, payload);
        }
        chRef.current?.send({ type: "broadcast", event, payload: body }).catch(() => {});
      }).catch(() => {});
    },
    on: (event, fn) => {
      const set = listeners.current.get(event) ?? new Set<Handler>();
      set.add(fn); listeners.current.set(event, set);
      return () => { set.delete(fn); };
    },
  }), [sessionId]);

  return <LiveBusProvider bus={bus} status={status}>{children}</LiveBusProvider>;
}

// The context on its own — LiveChannelProvider uses it; tests can pass any bus.
export function LiveBusProvider({ bus, status, children }: { bus: Bus; status: LiveStatus; children: ReactNode }) {
  return <LiveCtx.Provider value={bus}><StatusCtx.Provider value={status}>{children}</StatusCtx.Provider></LiveCtx.Provider>;
}
export type { Bus as LiveBus };

// Listen for some events and get a `send` function. Handlers may change every
// render; the latest one is always called.
export function useLive(handlers: Record<string, Handler> = {}) {
  const bus = useContext(LiveCtx);
  const ref = useRef(handlers);
  ref.current = handlers;
  const events = Object.keys(handlers).sort().join(",");
  useEffect(() => {
    if (!bus) return;
    const offs = events.split(",").filter(Boolean).map((ev) => bus.on(ev, (p) => ref.current[ev]?.(p)));
    return () => offs.forEach((off) => off());
  }, [bus, events]);
  return bus?.send ?? (() => {});
}

export const useLiveStatus = () => useContext(StatusCtx);
