import { describe, it, expect, vi } from "vitest";
import { capAward, gamePoints, labPoints, labRef, liveQuizPoints, REWARD_RULES } from "@/lib/rewardRules";
import { awardPoints } from "@/lib/rewardServer";

describe("reward rules", () => {
  it("pays game rounds for real effort, more for accuracy", () => {
    expect(gamePoints({ correct: 2, attempts: 2 })).toBe(0);
    expect(gamePoints({ correct: 5, attempts: 10 })).toBe(3);
    expect(gamePoints({ correct: 5, attempts: 6 })).toBe(5);   // 83% accuracy bonus
    expect(gamePoints({ correct: 60, attempts: 60 })).toBe(10); // capped at 8 + 2
  });
  it("pays more for a new experiment, and podium places in live quizzes", () => {
    expect(labPoints(true)).toBe(15);
    expect(labPoints(false)).toBe(3);
    expect(labRef("pendulum", "2026-10-08")).toBe("pendulum:2026-10-08");
    expect([1, 2, 3, 4].map((r) => liveQuizPoints(r, 1))).toEqual([15, 10, 6, 3]);
    expect(liveQuizPoints(5, 0)).toBe(0);
  });
  it("keeps every source within its daily cap", () => {
    expect(capAward(10, 35, REWARD_RULES.game.dailyCap)).toBe(5);
    expect(capAward(10, 40, 40)).toBe(0);
  });
});

function fakeAdmin(opts: { today?: number[]; insertError?: string; listError?: string }) {
  const inserted: any[] = [];
  const admin: any = {
    rpc: vi.fn(async () => ({ data: 120, error: null })),
    from: vi.fn(() => {
      const q: any = {
        select: () => q, eq: () => q,
        insert: (row: any) => { inserted.push(row); return Promise.resolve({ error: opts.insertError ? { message: opts.insertError } : null }); },
        then: (res: any) => Promise.resolve(opts.listError ? { data: null, error: { message: opts.listError } } : { data: (opts.today ?? []).map((points) => ({ points })), error: null }).then(res),
      };
      return q;
    }),
  };
  return { admin, inserted };
}

describe("awardPoints", () => {
  it("records the award and adds it to the learner's total", async () => {
    const { admin, inserted } = fakeAdmin({ today: [10] });
    const r = await awardPoints(admin, { studentId: "s1", source: "game", ref: "g:1", points: 8 });
    expect(r).toEqual({ awarded: 8, total: 120 });
    expect(inserted[0]).toMatchObject({ student_id: "s1", source: "game", ref: "g:1", points: 8 });
    expect(admin.rpc).toHaveBeenCalledWith("add_reward_points", { p_student: "s1", p_points: 8 });
  });
  it("trims to the daily cap and pays nothing once it's reached", async () => {
    expect((await awardPoints(fakeAdmin({ today: [35] }).admin, { studentId: "s1", source: "game", ref: "g:2", points: 8 })).awarded).toBe(5);
    const full = fakeAdmin({ today: [40] });
    expect((await awardPoints(full.admin, { studentId: "s1", source: "game", ref: "g:3", points: 8 })).awarded).toBe(0);
    expect(full.inserted).toHaveLength(0);
  });
  it("never pays twice for the same thing, and pays nothing before the migration", async () => {
    const dup = fakeAdmin({ insertError: "duplicate key value violates unique constraint" });
    expect(await awardPoints(dup.admin, { studentId: "s1", source: "lab", ref: "x:d", points: 15 })).toMatchObject({ awarded: 0, duplicate: true });
    expect(dup.admin.rpc).not.toHaveBeenCalled();
    const none = fakeAdmin({ listError: 'relation "reward_events" does not exist' });
    expect(await awardPoints(none.admin, { studentId: "s1", source: "lab", ref: "x:d", points: 15 })).toMatchObject({ awarded: 0, setup: true });
  });
});
