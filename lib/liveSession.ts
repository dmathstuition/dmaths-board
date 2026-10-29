// Interactive class sessions — pure rules shared by the API, UI and tests.
// A tutor/admin starts a session (no video: they share their screen in their
// own call), learners join from the portal with a 6-digit PIN or link, and the
// host decides who may write on the shared board.

export type SessionStatus = "live" | "ended";
export type SessionRow = {
  id: string; code: string; host_id: string | null; class_id: string | null; title: string;
  status: SessionStatus; all_can_write: boolean; board?: unknown; created_at: string; ended_at: string | null;
  kind?: string; // "board": a D-Maths Board class (guests join with a PIN and name)
};
export const isBoardSession = (s: Pick<SessionRow, "kind">) => s.kind === "board";
// Where a class's seats live: guests for D-Maths Board classes, academy learners otherwise.
export const seatTable = (s: Pick<SessionRow, "kind">) =>
  isBoardSession(s) ? { table: "live_session_guests", key: "id" } as const : { table: "live_session_participants", key: "student_id" } as const;
export const boardJoinPath = (code: string) => `/join?pin=${code}`;
// Where a host's pages live: the tutor or admin portal, or the D-Maths Board app.
export type HostBase = "/tutor" | "/admin" | "/app";
export type ParticipantRow = { student_id: string; can_write: boolean; removed: boolean; joined_at: string; last_seen: string; hand_raised_at?: string | null };

export const CODE_LENGTH = 6;
export const ONLINE_MS = 75_000;       // seen within this window = "here now"
export const SEEN_EVERY_MS = 30_000;   // don't rewrite last_seen more often than this (fewer writes in big classes)
export const MAX_SESSION_HOURS = 6;    // a forgotten session stops accepting joins

// A 6-digit PIN that never starts with 0 (easier to read out loud).
export function makeCode(rng: () => number = Math.random): string {
  let s = String(1 + Math.floor(rng() * 9));
  while (s.length < CODE_LENGTH) s += String(Math.floor(rng() * 10));
  return s;
}

// Accepts "123 456", "123-456" etc. Returns null unless it's 6 digits.
export function cleanCode(v: unknown): string | null {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length === CODE_LENGTH ? d : null;
}

export const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
export const joinPath = (code: string) => `/portal/live?pin=${code}`;

// Is a session still open for joining/drawing?
export function isOpen(s: Pick<SessionRow, "status" | "created_at">, now = Date.now()): boolean {
  return s.status === "live" && now - new Date(s.created_at).getTime() < MAX_SESSION_HOURS * 3600_000;
}

// Who may draw: the host always; a learner when the host opened the board to
// everyone or picked them — never after being removed or once the class ends.
export function canWrite(
  session: Pick<SessionRow, "status" | "all_can_write" | "created_at">,
  viewer: { host: boolean },
  seat?: Pick<ParticipantRow, "can_write" | "removed"> | null,
  now = Date.now(),
): boolean {
  if (!isOpen(session, now)) return false;
  if (viewer.host) return true;
  if (!seat || seat.removed) return false;
  return session.all_can_write || seat.can_write;
}

export const isOnline = (lastSeen: string, now = Date.now()) => now - new Date(lastSeen).getTime() < ONLINE_MS;

export type Person = { id: string; name: string; canWrite: boolean; online: boolean; joinedAt: string; handAt: string | null };

// The people list the host sees (removed learners left out): raised hands
// first in the order they went up, then online, then by name.
export function participantList(rows: ParticipantRow[], names: Map<string, string>, allCanWrite: boolean, now = Date.now()): Person[] {
  return rows.filter((r) => !r.removed).map((r) => ({
    id: r.student_id, name: names.get(r.student_id) ?? "Learner",
    canWrite: allCanWrite || r.can_write, online: isOnline(r.last_seen, now), joinedAt: r.joined_at, handAt: r.hand_raised_at ?? null,
  })).sort((a, b) =>
    (a.handAt ? 0 : 1) - (b.handAt ? 0 : 1) || (a.handAt && b.handAt ? a.handAt.localeCompare(b.handAt) : 0) ||
    Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
}

// Ids whose strokes every client should accept right now.
export function writerIds(session: Pick<SessionRow, "host_id" | "all_can_write">, rows: ParticipantRow[]): string[] | "all" {
  if (session.all_can_write) return "all";
  return [...(session.host_id ? [session.host_id] : []), ...rows.filter((r) => r.can_write && !r.removed).map((r) => r.student_id)];
}

export const shortName = (p: { first_name?: string | null; last_name?: string | null } | null | undefined, fallback = "Learner") =>
  `${p?.first_name ?? ""} ${(p?.last_name ?? "").slice(0, 1)}`.trim() || fallback;
