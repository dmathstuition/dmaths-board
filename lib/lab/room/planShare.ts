// Practical plans between learners and the teacher, over the class's live
// channel (no accounts):
//   "lab-assign"     teacher → all (signed): { assign: Assignment | null } — the practical set for the class
//   "lab-plan"       learner → teacher (uplink): a PlanReport — their plan, apparatus, check, risks, observations
//   "lab-plan-reply" teacher → all (signed): { to, text, ok } — feedback for one learner
import type { LabSubject } from "@/lib/lab/catalog";
import type { Plan } from "@/lib/lab/room/plans";

export type Assignment = { subject: LabSubject; slug: string | null; title: string; note: string; at: number };
export type PlanReport = {
  by: string; name: string; v: number; at: number; subject: LabSubject;
  plan: Pick<Plan, "title" | "aim" | "independent" | "dependent" | "controls" | "method" | "target">;
  picked: string[]; check: { have: number; of: number; missing: string[] } | null; hazards: string[]; seen: string[];
};
export type Reply = { to: string; text: string; ok: boolean; at: number };

const SUBJECTS: LabSubject[] = ["physics", "chemistry", "biology", "maths"];
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const list = (v: unknown, k: number, n: number) => (Array.isArray(v) ? v.slice(0, k).map((x) => str(x, n)).filter(Boolean) : []);
const subj = (v: unknown): LabSubject | null => (SUBJECTS.includes(v as LabSubject) ? (v as LabSubject) : null);
const slugOk = (v: unknown) => { const s = str(v, 60); return /^[a-z0-9-]+$/.test(s) ? s : null; };

export function cleanAssignment(v: unknown): Assignment | null {
  const a = v as Partial<Assignment> | null;
  const subject = subj(a?.subject);
  if (!a || !subject) return null;
  return { subject, slug: slugOk(a.slug), title: str(a.title, 120), note: str(a.note, 300), at: Number(a.at) || Date.now() };
}
export function cleanReport(v: unknown): PlanReport | null {
  const r = v as Partial<PlanReport> | null;
  const subject = subj(r?.subject), by = str(r?.by, 80);
  if (!r || !subject || !by) return null;
  const p = (r.plan ?? {}) as Partial<Plan>;
  const c = r.check as PlanReport["check"];
  return {
    by, name: str(r.name, 60) || "A learner", v: Math.max(0, Math.round(Number(r.v) || 0)), at: Number(r.at) || Date.now(), subject,
    plan: { title: str(p.title, 120), aim: str(p.aim, 600), independent: str(p.independent, 200), dependent: str(p.dependent, 200), controls: str(p.controls, 300), method: list(p.method, 25, 300), target: slugOk(p.target) },
    picked: list(r.picked, 60, 80),
    check: c && Number.isFinite(Number(c.of)) ? { have: Math.max(0, Math.round(Number(c.have))), of: Math.max(0, Math.round(Number(c.of))), missing: list(c.missing, 30, 80) } : null,
    hazards: list(r.hazards, 15, 30), seen: list(r.seen, 25, 300),
  };
}
export function cleanReply(v: unknown): Reply | null {
  const r = v as Partial<Reply> | null;
  const to = str(r?.to, 80), text = str(r?.text, 500);
  if (!to || (!text && r?.ok == null)) return null;
  return { to, text, ok: !!r?.ok, at: Number(r?.at) || Date.now() };
}
// The newest version of each learner's plan.
export function addPlan(m: Record<string, PlanReport>, r: PlanReport | null): Record<string, PlanReport> {
  if (!r) return m;
  const had = m[r.by];
  if (had && had.v > r.v && had.at > r.at - 60_000) return m;
  return { ...m, [r.by]: r };
}
// How complete a plan is: one point each for aim, variables, method, the right apparatus, safety.
export function planScore(r: PlanReport): { got: number; of: number; missing: string[] } {
  const parts: [string, boolean][] = [
    ["an aim", r.plan.aim.length >= 10],
    ["the variables", !!(r.plan.independent && r.plan.dependent)],
    ["what is kept the same", !!r.plan.controls],
    ["a method (3+ steps)", r.plan.method.filter((m) => m.length > 3).length >= 3],
    ["all the apparatus", !r.check || r.check.missing.length === 0],
  ];
  return { got: parts.filter((p) => p[1]).length, of: parts.length, missing: parts.filter((p) => !p[1]).map((p) => p[0]) };
}
