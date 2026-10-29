// Keeping every screen's whiteboard the same. Realtime messages are
// fire-and-forget, so any one can be lost (weak signal, a busy class, a phone
// switching networks). These helpers let the board check and repair itself:
//   • the host sends a tiny fingerprint of the page every few seconds; a
//     screen whose page differs asks for that page again,
//   • pages are sent in pieces small enough to always be delivered,
//   • a stroke being drawn is sent as just its new points.
import type { Stroke } from "@/lib/whiteboard";

// FNV-1a over what makes items differ (id, where they are, their text).
export function pageDigest(items: Stroke[]): string {
  let h = 0x811c9dc5;
  const mix = (str: string) => { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } };
  for (const s of items) mix(`${s.id}|${s.pts.length}|${s.pts[0] ?? ""}|${s.pts[1] ?? ""}|${s.pts[s.pts.length - 1] ?? ""}|${(s.text ?? "").length}|${s.color}|${s.w}|${s.fill ? 1 : 0}|${s.mark ?? ""};`);
  return `${items.length}:${(h >>> 0).toString(36)}`;
}

// Split a page into pieces of at most ~maxChars of JSON (always at least one piece).
export function chunkItems(items: Stroke[], maxChars = 40_000): Stroke[][] {
  const out: Stroke[][] = [[]];
  let size = 0;
  for (const s of items) {
    const n = JSON.stringify(s).length;
    if (size + n > maxChars && out[out.length - 1].length) { out.push([]); size = 0; }
    out[out.length - 1].push(s);
    size += n;
  }
  return out;
}

// Put a page back together from its pieces; null until every piece is here.
export function assemble(parts: (Stroke[] | undefined)[], count: number): Stroke[] | null {
  if (parts.length < count) return null;
  const all: Stroke[] = [];
  for (let i = 0; i < count; i++) { const p = parts[i]; if (!p) return null; all.push(...p); }
  return all;
}

// Add a live update to a stroke in progress: `start` says where the new points
// go. Returns the updated stroke, or null when an update was missed (the
// finished stroke will arrive and replace it).
export function applyLive(prev: Stroke | undefined, head: Stroke, start: number, pts: number[]): Stroke | null {
  if (start === 0) return { ...head, pts: [...pts] };
  if (!prev || prev.pts.length !== start) return null;
  return { ...prev, pts: prev.pts.concat(pts) };
}
