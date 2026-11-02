// The video call's layout: who is on screen in gallery and speaker view.
// Only the people on screen have their video sent to this device, which keeps
// a big class call light on mobile data. Pure.

export type CallView = "gallery" | "speaker" | "board";
export type CallPerson = { id: string; name: string; hasVideo: boolean; muted: boolean; me?: boolean; host?: boolean };

// How many tiles fit: fewer on a phone.
export const perPage = (width: number) => (width < 640 ? 4 : width < 1100 ? 6 : 9);
export const pageCount = (n: number, per: number) => Math.max(1, Math.ceil(n / per));

// Gallery order: the teacher first, then me, then people with their camera on, then the rest by name.
export function galleryOrder<T extends CallPerson>(people: T[]): T[] {
  const rank = (p: T) => (p.host ? 0 : p.me ? 1 : p.hasVideo ? 2 : 3);
  return [...people].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

// Who is on screen. Speaker view: the big picture (a shared screen, else the
// person talking, else the teacher) plus a strip of up to five others.
export function onScreen<T extends CallPerson>(view: CallView, people: T[], page: number, per: number, active: string | null, screenOn: boolean): { big: T | null; tiles: T[] } {
  const order = galleryOrder(people);
  if (view === "gallery") {
    const p = Math.min(Math.max(0, page), pageCount(order.length, per) - 1);
    return { big: null, tiles: order.slice(p * per, p * per + per) };
  }
  const big = screenOn ? null : order.find((x) => x.id === active && !x.me) ?? order.find((x) => x.host) ?? order[0] ?? null;
  const rest = order.filter((x) => x !== big);
  return { big, tiles: view === "speaker" ? rest.slice(0, 5) : [] };
}

// The loudest person (if anyone is talking), staying put for a moment so the
// big picture doesn't flick about.
export function nextActive(levels: Record<string, number>, current: string | null, since: number, now: number, holdMs = 1500): { id: string | null; since: number } {
  let best: string | null = null, top = 0.03;
  for (const [id, v] of Object.entries(levels)) if (v > top) { top = v; best = id; }
  if (!best || best === current) return { id: current, since };
  if (current && now - since < holdMs && (levels[current] ?? 0) > 0.01) return { id: current, since };
  return { id: best, since: now };
}
