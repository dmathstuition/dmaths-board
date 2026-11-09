// The live lab tracker. While learners try a practical on their own devices,
// each one reports where they are (message "lab-progress", learner → teacher);
// the teacher sees a grid of who is on which step, their readings, and who is
// stuck. Pure: what a report holds, how it's cleaned, and what it means.

export type LabReading = { l: string; v: string; s?: boolean }; // label, value with unit, s: the answer was shown
// What the bench knows about its own run.
export type LabProgress = {
  slug: string; step: number; total: number; title: string; done: boolean;
  misses: number;      // wrong tries on this step (wrong drop, dial, reading)
  onStep: number;      // seconds on this step so far
  shown: number;       // readings filled in for them ("show me the answer")
  readings: LabReading[];
  exam: { score: number; of: number } | null;
};
// What the teacher keeps for each learner.
export type LabEntry = LabProgress & { by: string; name: string; v: number; at: number /* when heard, teacher's clock */ };

const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);
const int = (x: unknown, lo: number, hi: number) => { const n = Math.round(Number(x)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
export const MAX_READINGS = 40;

// A report as it arrives over the network: anything could be in it.
export function cleanProgress(p: any): (LabProgress & { by: string; name: string; v: number }) | null {
  if (!p || typeof p !== "object" || typeof p.by !== "string" || !p.by || typeof p.slug !== "string") return null;
  const total = int(p.total, 1, 200);
  const exam = p.exam && typeof p.exam === "object" ? { score: int(p.exam.score, 0, 50), of: int(p.exam.of, 1, 50) } : null;
  return {
    by: str(p.by, 80), name: str(p.name, 60).trim() || "Learner", v: int(p.v, 0, 1e9), slug: str(p.slug, 60),
    step: int(p.step, 0, total), total, title: str(p.title, 120), done: !!p.done,
    misses: int(p.misses, 0, 999), onStep: int(p.onStep, 0, 86_400), shown: int(p.shown, 0, 999),
    readings: (Array.isArray(p.readings) ? p.readings : []).slice(-MAX_READINGS)
      .filter((r: any) => r && typeof r === "object")
      .map((r: any) => ({ l: str(r.l, 60), v: str(r.v, 40), ...(r.s ? { s: true } : {}) })),
    exam: exam && exam.score <= exam.of ? exam : null,
  };
}

// Keep the newest report from each learner.
export function addReport(map: Record<string, LabEntry>, p: ReturnType<typeof cleanProgress>, now: number): Record<string, LabEntry> {
  if (!p) return map;
  const old = map[p.by];
  if (old && old.slug === p.slug && old.v > p.v) return map;
  return { ...map, [p.by]: { ...p, at: now } };
}

export const STUCK_SECONDS = 120, STUCK_MISSES = 3;
export type LabStatus = "done" | "stuck" | "away" | "working";
// What the teacher should know about a learner now.
export function statusOf(e: LabEntry, now: number, quiet = 30_000): { status: LabStatus; secs: number; why: string } {
  const secs = e.onStep + Math.max(0, (now - e.at) / 1000);
  if (now - e.at > quiet) return { status: "away", secs, why: `Not heard from for ${ago((now - e.at) / 1000)}` };
  if (e.done) return { status: "done", secs, why: e.exam ? `Finished · questions ${e.exam.score}/${e.exam.of}` : "Finished the practical" };
  if (e.misses >= STUCK_MISSES) return { status: "stuck", secs, why: `${e.misses} wrong tries on this step` };
  if (secs >= STUCK_SECONDS) return { status: "stuck", secs, why: `${ago(secs)} on this step` };
  return { status: "working", secs, why: e.misses ? `${e.misses} wrong ${e.misses === 1 ? "try" : "tries"} on this step` : "Working" };
}
export function ago(secs: number) { const s = Math.round(secs); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`; }

// Stuck first (longest stuck at the top), then those working (least far on
// first), then the finished ones; anyone not heard from goes last.
const RANK: Record<LabStatus, number> = { stuck: 0, working: 1, done: 2, away: 3 };
export function sortEntries(list: LabEntry[], now: number, quiet?: number): LabEntry[] {
  return [...list].sort((a, b) => {
    const sa = statusOf(a, now, quiet), sb = statusOf(b, now, quiet);
    if (sa.status !== sb.status) return RANK[sa.status] - RANK[sb.status];
    if (sa.status === "stuck") return sb.secs - sa.secs;
    if (sa.status === "working") return a.step / a.total - b.step / b.total;
    return a.name.localeCompare(b.name);
  });
}
export function summary(list: LabEntry[], now: number, quiet?: number) {
  const by = { done: 0, stuck: 0, away: 0, working: 0 };
  for (const e of list) by[statusOf(e, now, quiet).status]++;
  return { ...by, total: list.length };
}
