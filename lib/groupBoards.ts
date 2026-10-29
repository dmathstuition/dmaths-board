// Group work boards: the teacher splits the class into groups; each group
// draws together on one shared board; the teacher watches every group and
// can bring a group's work onto the main board.
//
// The plan (who is in which group) comes from the teacher. Each learner's
// screen sends its own ink for its group; every screen in the group joins
// everyone's ink into one board, in the order it was drawn.
import { cleanAnswerStrokes } from "@/lib/answerBoards";
import type { Stroke } from "@/lib/whiteboard";

export type Group = { id: string; name: string; members: string[] };
export type GroupPlan = { id: string; task: string; open: boolean; groups: Group[]; names: Record<string, string> };
type Person = { id: string; name: string };

export const MAX_GROUPS = 8;
const MAX_MEMBERS = 60;

// A sensible number of groups for this many learners (about 3–4 in each).
export function suggestedGroups(learners: number): number {
  return Math.max(2, Math.min(MAX_GROUPS, Math.round(learners / 3.5) || 2));
}

// Share learners out at random, as evenly as possible.
export function makeGroups(people: Person[], count: number, random: () => number = Math.random): Group[] {
  const n = Math.max(1, Math.min(MAX_GROUPS, Math.round(count) || 1));
  const shuffled = [...people];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups: Group[] = Array.from({ length: n }, (_, i) => ({ id: `g${i + 1}`, name: `Group ${i + 1}`, members: [] }));
  shuffled.forEach((p, i) => groups[i % n].members.push(p.id));
  return groups;
}

export const groupOf = (plan: GroupPlan | null, who: string) => plan?.groups.find((g) => g.members.includes(who)) ?? null;

// Learners who arrived after the groups were made join the smallest groups.
export function addLateJoiners(plan: GroupPlan, people: Person[]): GroupPlan {
  const groups = plan.groups.map((g) => ({ ...g, members: [...g.members] }));
  const names = { ...plan.names };
  for (const p of people) {
    if (groups.some((g) => g.members.includes(p.id))) continue;
    const smallest = groups.reduce((a, b) => (b.members.length < a.members.length ? b : a), groups[0]);
    if (!smallest) break;
    smallest.members.push(p.id);
    names[p.id] = p.name;
  }
  return { ...plan, groups, names };
}

export function moveMember(plan: GroupPlan, who: string, toGroup: string): GroupPlan {
  if (!plan.groups.some((g) => g.id === toGroup)) return plan;
  return {
    ...plan,
    groups: plan.groups.map((g) => ({
      ...g,
      members: g.id === toGroup ? (g.members.includes(who) ? g.members : [...g.members, who]) : g.members.filter((m) => m !== who),
    })),
  };
}

export function cleanPlan(v: unknown): GroupPlan | null {
  const r = v as any;
  if (!r || typeof r.id !== "string" || !r.id || !Array.isArray(r.groups)) return null;
  const seen = new Set<string>();
  const groups: Group[] = [];
  for (const g of r.groups.slice(0, MAX_GROUPS)) {
    if (!g || typeof g.id !== "string" || !g.id) continue;
    const members = (Array.isArray(g.members) ? g.members : [])
      .filter((m: unknown): m is string => typeof m === "string" && !!m && !seen.has(m))
      .slice(0, MAX_MEMBERS)
      .map((m: string) => { seen.add(m); return m.slice(0, 60); });
    groups.push({ id: g.id.slice(0, 20), name: String(g.name ?? "Group").slice(0, 30) || "Group", members });
  }
  if (!groups.length) return null;
  const names: Record<string, string> = {};
  if (r.names && typeof r.names === "object") {
    for (const [id, n] of Object.entries(r.names).slice(0, 500)) if (seen.has(id)) names[id] = String(n ?? "").slice(0, 60);
  }
  return { id: r.id.slice(0, 40), task: String(r.task ?? "").slice(0, 200), open: !!r.open, groups, names };
}

// A new item's id starts with the time, so a group's ink can be put back in
// the order it was drawn (a rubber stroke only rubs out what came before it).
export const inkId = (by: string, now = Date.now()) => `${now.toString(36).padStart(9, "0")}-${by.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`;

// Everyone's ink in a group, as one board.
export function mergeInk(byMember: Iterable<Stroke[]>): Stroke[] {
  const all: Stroke[] = [];
  const ids = new Set<string>();
  for (const list of byMember) for (const s of list) if (!ids.has(s.id)) { ids.add(s.id); all.push(s); }
  return all.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export const cleanInk = (v: unknown): Stroke[] => cleanAnswerStrokes(v);

// A group's work as new items for the main board (fresh ids, owned by the teacher).
export function inkForBoard(ink: Stroke[], teacherId: string): Stroke[] {
  const stamp = Date.now().toString(36);
  return ink.map((s, i) => ({ ...s, id: `grp-${stamp}-${i}`, by: teacherId }));
}
