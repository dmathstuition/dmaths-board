"use client";
import { useEffect, useState } from "react";

// One clock for the whole class. A phone's own clock can be minutes out (set
// by hand, a wrong time zone), and a timer the teacher starts is stored as the
// moment it ends — so a learner whose clock runs ahead saw "Time's up!" at
// once. Every device instead works in the server's time: its own clock plus
// an offset measured against /api/live-sessions/clock.
let offset = 0;
let synced = false;
let syncing: Promise<void> | null = null;

export const serverNow = () => Date.now() + offset;
export const clockSynced = () => synced;

// Best of a few quick samples: the one with the shortest round trip is the most
// accurate, taking the server's time as half-way through the trip.
export function syncServerClock(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    let best: { rtt: number; off: number } | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        const t0 = Date.now();
        const r = await fetch("/api/live-sessions/clock", { cache: "no-store", signal: AbortSignal.timeout(5000) });
        const t1 = Date.now();
        const { now } = await r.json();
        if (typeof now !== "number") continue;
        const sample = { rtt: t1 - t0, off: now - (t0 + t1) / 2 };
        if (!best || sample.rtt < best.rtt) best = sample;
      } catch { /* try again */ }
    }
    if (best) { offset = best.off; synced = true; }
  })().finally(() => { syncing = null; });
  return syncing;
}

// Keep the clock in step while a class is open (re-checked every few minutes).
export function useServerClock() {
  const [, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const go = () => syncServerClock().then(() => { if (alive) setTick((n) => n + 1); });
    go();
    const id = setInterval(go, 5 * 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return serverNow;
}
