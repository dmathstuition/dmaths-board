import { describe, it, expect } from "vitest";
import { addLateJoiners, cleanPlan, groupOf, inkForBoard, inkId, makeGroups, mergeInk, moveMember, suggestedGroups, type GroupPlan } from "@/lib/groupBoards";

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Learner ${i}` }));
const plan = (groups = makeGroups(people(7), 3)): GroupPlan => ({ id: "p", task: "", open: true, groups, names: {} });

describe("making groups", () => {
  it("shares everyone out evenly, each learner once", () => {
    const g = makeGroups(people(10), 3);
    expect(g.map((x) => x.members.length).sort()).toEqual([3, 3, 4]);
    expect(new Set(g.flatMap((x) => x.members)).size).toBe(10);
    expect(g.map((x) => x.name)).toEqual(["Group 1", "Group 2", "Group 3"]);
  });
  it("suggests about 3–4 per group, between 2 and 8 groups", () => {
    expect(suggestedGroups(2)).toBe(2);
    expect(suggestedGroups(12)).toBe(3);
    expect(suggestedGroups(100)).toBe(8);
  });
  it("late joiners go to the smallest groups; nobody is added twice", () => {
    const p = addLateJoiners(plan(), [...people(7), { id: "new1", name: "Ngozi" }, { id: "new2", name: "Bayo" }]);
    expect(p.groups.flatMap((g) => g.members)).toHaveLength(9);
    expect(p.groups.map((g) => g.members.length)).toEqual([3, 3, 3]);
    expect(p.names.new1).toBe("Ngozi");
  });
  it("moves a learner to another group", () => {
    const p0 = plan();
    const who = p0.groups[0].members[0];
    const p = moveMember(p0, who, "g3");
    expect(groupOf(p, who)?.id).toBe("g3");
    expect(p.groups.flatMap((g) => g.members).filter((m) => m === who)).toHaveLength(1);
    expect(moveMember(p0, who, "nope")).toBe(p0);
  });
  it("cleans a plan from the channel: no one in two groups, sensible limits", () => {
    const p = cleanPlan({ id: "x", task: "Draw a pentagon", open: true, groups: [{ id: "g1", name: "Group 1", members: ["a", "b"] }, { id: "g2", members: ["b", "c", 5] }], names: { a: "Ada", z: "Not here" } });
    expect(p?.groups[1].members).toEqual(["c"]);
    expect(p?.names).toEqual({ a: "Ada" });
    expect(cleanPlan({ id: "x", groups: [] })).toBeNull();
  });
});

describe("a group's shared board", () => {
  it("joins everyone's ink in the order it was drawn, once each", () => {
    const s = (id: string) => ({ id, by: "x", color: "#000", w: 4, pts: [0, 0, 1, 1] });
    const merged = mergeInk([[s(inkId("a", 3000)), s(inkId("a", 1000))], [s(inkId("b", 2000))], [s(inkId("a", 1000).replace(/-[^-]+$/, "-dup"))]]);
    expect(merged.map((m) => parseInt(m.id.split("-")[0], 36))).toEqual([1000, 1000, 2000, 3000]);
  });
  it("brings a group's work to the main board with new ids owned by the teacher", () => {
    const out = inkForBoard([{ id: "1", by: "s1", color: "#000", w: 4, pts: [0, 0] }], "t1");
    expect(out[0].by).toBe("t1");
    expect(out[0].id).toMatch(/^grp-/);
  });
});
