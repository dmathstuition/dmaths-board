// Big classes: every live message goes to every screen, and the live service
// limits messages per second for the whole project. So the more people are
// in the class, the less often each screen repeats its "just in case"
// messages (heartbeats, re-sends for late joiners, safety nets). Up to 20
// people nothing changes; at 100 the repeats are about 6× slower.
import { useSyncExternalStore } from "react";

export const scaleFor = (people: number) => (!(people > 20) ? 1 : Math.min(8, Math.round((people / 15) * 2) / 2));

let size = 0;
const subs = new Set<() => void>();
export function setClassSize(n: number) {
  const next = Math.max(0, Math.round(Number(n) || 0));
  if (scaleFor(next) === scaleFor(size)) { size = next; return; }
  size = next;
  subs.forEach((f) => f());
}
export const classScale = () => scaleFor(size);
export function useClassScale(): number {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, classScale, () => 1);
}
