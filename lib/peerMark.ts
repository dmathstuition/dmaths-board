// Peer marking: learners swap answer boards without names and mark each
// other's work against the teacher's answer key. The teacher sees every peer
// mark beside their own and can accept them in one tap. Pure.

// Who marks whose: every learner marks one classmate and is marked by one — a
// shuffled ring, so nobody marks their own and no two learners swap in a pair
// unless there are only two. Fewer than two learners: nothing to swap.
export function assignPeers(ids: string[], rand: () => number = Math.random): Record<string, string> {
  const list = [...new Set(ids)];
  if (list.length < 2) return {};
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const out: Record<string, string> = {};
  list.forEach((id, i) => { out[id] = list[(i + 1) % list.length]; });
  return out;
}

export const MAX_PEER_COMMENT = 120, MAX_KEY = 600;
export type PeerMarkRow = { mark: number; comment: string; by: string };
export function cleanPeerMark(v: unknown, max: number): { mark: number; comment: string } | null {
  const x = (v && typeof v === "object" ? v : {}) as { mark?: unknown; comment?: unknown };
  const mark = Math.round(Number(x.mark));
  if (!(mark >= 0 && mark <= max) || x.mark === "" || x.mark == null) return null;
  return { mark, comment: String(x.comment ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_PEER_COMMENT) };
}
export const cleanKey = (v: unknown) => String(v ?? "").replace(/\r/g, "").trim().slice(0, MAX_KEY);

// How the peer marks compare with the teacher's own.
export type PeerCompare = { marked: number; of: number; agree: number; differ: number };
export function comparePeer(targets: string[], peer: Record<string, PeerMarkRow>, teacher: Record<string, number>): PeerCompare {
  let marked = 0, agree = 0, differ = 0;
  for (const t of targets) {
    const p = peer[t];
    if (!p) continue;
    marked++;
    if (teacher[t] == null) continue;
    if (teacher[t] === p.mark) agree++; else differ++;
  }
  return { marked, of: targets.length, agree, differ };
}
