// Breakout groups with sound: while group boards are on (lib/groupBoards.ts)
// and the class call is running, each learner hears only their own group.
// The teacher drops in on one group at a time (they hear the teacher and the
// teacher hears them), or talks to every group at once. Ending the groups
// brings everyone back to one class call.
//
// The rooms travel inside the teacher's signed "voice" message. Who hears
// whom is decided on each device (canHear) — it keeps groups apart, it
// isn't a privacy wall.
import { useSyncExternalStore } from "react";

export type Room = { id: string; name: string; members: string[] };
export type Rooms = { id: string; host: string; groups: Room[]; visit: string | null; all: boolean };

export const roomOf = (r: Rooms | null, who: string) => r?.groups.find((g) => g.members.includes(who)) ?? null;

// Should `me` hear `speaker` right now?
export function canHear(r: Rooms | null, me: string, speaker: string): boolean {
  if (!r) return true;
  if (me === speaker) return false;
  if (me === r.host) return !r.all && !!r.visit && !!r.groups.find((g) => g.id === r.visit)?.members.includes(speaker);
  if (speaker === r.host) return r.all || (!!r.visit && roomOf(r, me)?.id === r.visit);
  const mine = roomOf(r, me);
  return !!mine && mine.members.includes(speaker);
}

export function cleanRooms(v: unknown): Rooms | null {
  const r = v as any;
  if (!r || typeof r.id !== "string" || typeof r.host !== "string" || !Array.isArray(r.groups)) return null;
  const seen = new Set<string>();
  const groups: Room[] = r.groups.slice(0, 8).map((g: any) => ({
    id: String(g?.id ?? "").slice(0, 20), name: String(g?.name ?? "Group").slice(0, 30),
    members: (Array.isArray(g?.members) ? g.members : []).map((m: unknown) => String(m).slice(0, 60)).filter((m: string) => m && !seen.has(m) && seen.add(m)).slice(0, 60),
  })).filter((g: Room) => g.id);
  if (!groups.length) return null;
  const visit = typeof r.visit === "string" && groups.some((g) => g.id === r.visit) ? r.visit : null;
  return { id: r.id.slice(0, 40), host: r.host.slice(0, 60), groups, visit, all: !!r.all };
}

// ── What the group boards and the class call share on this device ──
export type Breakout = {
  rooms: Rooms | null;   // the groups with sound (teacher: set by the group boards; learner: from the teacher)
  sound: boolean;        // teacher: groups should talk (start the call)
  voiceOn: boolean;      // teacher: class sound is available here
  call: boolean;         // learner: a class call is running
  inCall: boolean;       // learner: I've joined it
  muted: boolean;        // learner: my microphone is muted
  join: (() => void) | null;
  toggleMute: (() => void) | null;
};
let state: Breakout = { rooms: null, sound: false, voiceOn: false, call: false, inCall: false, muted: true, join: null, toggleMute: null };
const subs = new Set<() => void>();
export function setBreakout(p: Partial<Breakout>) {
  const next = { ...state, ...p };
  if ((Object.keys(p) as (keyof Breakout)[]).every((k) => (k === "rooms" ? JSON.stringify(next.rooms) === JSON.stringify(state.rooms) : typeof next[k] === "function" || next[k] === state[k]))) return;
  state = next;
  subs.forEach((f) => f());
}
export const getBreakout = () => state;
export function useBreakout(): Breakout {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
}
