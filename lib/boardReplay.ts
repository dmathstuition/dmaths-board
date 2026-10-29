// Playing back how a board was written. Items carry `t` (when they were made);
// boards saved before that existed play back in the order items were added.
import type { Stroke } from "@/lib/whiteboard";

export type ReplayEvent = { page: number; item: Stroke; t: number };

export function buildTimeline(pages: Stroke[][]): ReplayEvent[] {
  const out: (ReplayEvent & { k: number })[] = [];
  let k = 0;
  pages.forEach((list, page) => {
    let last = 0;
    for (const item of list) {
      const t = item.t ?? last; // no time: just after the item before it on that page
      last = t;
      out.push({ page, item, t, k: k++ });
    }
  });
  out.sort((a, b) => a.t - b.t || a.k - b.k);
  return out.map(({ page, item, t }) => ({ page, item, t }));
}

// The picture after the first `step` events: the page being written on, and what's on it.
export function frameAt(events: ReplayEvent[], step: number): { page: number; items: Stroke[] } {
  const n = Math.max(0, Math.min(events.length, step));
  const page = n ? events[n - 1].page : events[0]?.page ?? 0;
  return { page, items: events.slice(0, n).filter((e) => e.page === page).map((e) => e.item) };
}

// How long to wait before showing event i during playback (real gaps, squeezed).
export function delayBefore(events: ReplayEvent[], i: number, speed = 1): number {
  if (i <= 0 || i >= events.length) return 300 / speed;
  const gap = events[i].t - events[i - 1].t;
  const ms = gap > 0 ? Math.min(1200, Math.max(120, gap)) : 250;
  return ms / speed;
}

// Freehand strokes are drawn bit by bit; everything else appears at once.
export const isFreehand = (s: Stroke) => !s.kind || s.kind === "pen" || s.kind === "hl";
export function partial(s: Stroke, fraction: number): Stroke {
  if (!isFreehand(s) || fraction >= 1) return s;
  const n = Math.max(2, Math.round((s.pts.length / 2) * Math.max(0, fraction)) * 2);
  return { ...s, pts: s.pts.slice(0, n) };
}
