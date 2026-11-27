import { describe, it, expect } from "vitest";
import { fiftyFifty, itemDrawer, nextItem, playableAsFormat, quizFromSkill, skillKind } from "@/lib/games/source";
import { SORT_SETS, findSort, sortDrawer } from "@/lib/games/sorting";
import { BOSS_HP, LADDER, RACE_LEN, STALL_MS, bossAnswer, bossDamage, ladderAnswer, ladderPrize, newBoss, newLadder, racePlace, rivalStep, rivals } from "@/lib/games/formats";
import { CLASS_GAMES } from "@/lib/games/catalog";

// A repeatable "random" so every run checks the same questions.
const seeded = (seed = 7) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

describe("question source", () => {
  it("turns any numeric or choice skill into four options with one answer", () => {
    const rng = seeded();
    for (const skill of ["addition", "multiplication", "linear", "percent", "ratio", "fractions", "indices", "rounding", "tenses", "vocabulary"]) {
      for (const d of ["easy", "medium", "hard"] as const) {
        for (let i = 0; i < 12; i++) {
          const it = nextItem(skill, d, rng);
          expect(it.options.length, `${skill} ${d}`).toBeGreaterThanOrEqual(2);
          expect(it.options, `${skill} ${d} ${it.prompt}`).toContain(it.answer);
          expect(new Set(it.options).size).toBe(it.options.length);
          expect(it.prompt.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it("knows which skills only work in their own game", () => {
    expect(skillKind("trig")).toBeNull(); expect(skillKind("synonyms")).toBeNull(); expect(skillKind("scramble")).toBeNull(); expect(skillKind("identity")).toBeNull();
    expect(skillKind("addition")).toBe("numeric"); expect(skillKind("fractions")).toBe("choice"); expect(skillKind("tenses")).toBe("choice");
    expect(playableAsFormat("percent")).toBe(true);
  });
  it("draws from a fixed list in a shuffled loop, never the same question twice running", () => {
    const items = [1, 2, 3].map((n) => ({ lead: "", prompt: `Q${n}`, options: ["a", "b", "c", "d"], answer: "a" }));
    const draw = itemDrawer("mixed", "easy", seeded(3), items);
    let last = "";
    for (let i = 0; i < 30; i++) { const it = draw(); expect(it.prompt).not.toBe(last); last = it.prompt; expect(new Set(it.options)).toEqual(new Set(["a", "b", "c", "d"])); }
  });
  it("50:50 leaves the answer and one wrong option", () => {
    const it = nextItem("addition", "medium", seeded(11));
    const two = fiftyFifty(it, seeded(5));
    expect(two).toHaveLength(2); expect(two).toContain(it.answer);
  });
  it("makes a quiz from a skill: the right number of different questions, each with its answer's position", () => {
    const qs = quizFromSkill("multiplication", "medium", 10, 20, seeded(9));
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.q)).size).toBe(10);
    for (const q of qs) { expect(q.options.length).toBeGreaterThanOrEqual(2); expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.answer).toBeLessThan(q.options.length); expect(q.seconds).toBe(20); }
  });
});

describe("speed sort", () => {
  it("every set makes valid items — each with a real bucket and a reason", () => {
    for (const set of SORT_SETS) {
      const draw = sortDrawer(set, "medium", seeded(21));
      const seen = new Set<number>(); let last = "";
      for (let i = 0; i < 80; i++) {
        const it = draw();
        expect(it.bucket, set.id).toBeGreaterThanOrEqual(0); expect(it.bucket, set.id).toBeLessThan(set.buckets.length);
        expect(it.why.length, set.id).toBeGreaterThan(5); expect(it.text).not.toBe(last); last = it.text; seen.add(it.bucket);
      }
      expect(seen.size, `${set.id} uses every box`).toBe(set.buckets.length);
    }
  });
  it("sorts correctly", () => {
    const oe = findSort("odd-even")!.make("easy", seeded(2));
    expect(oe.bucket).toBe(Number(oe.text) % 2);
    for (let i = 0; i < 40; i++) {
      const a = findSort("angles")!.make("hard", seeded(i + 1)), deg = Number(a.text.replace("°", ""));
      expect(["Acute", "Right", "Obtuse", "Reflex"][a.bucket]).toBe(deg < 90 ? "Acute" : deg === 90 ? "Right" : deg < 180 ? "Obtuse" : "Reflex");
      const m = findSort("multiples")!.make("hard", seeded(i + 50)), n = Number(m.text);
      expect(n % 12).not.toBe(0); expect(m.bucket).toBe(n % 3 === 0 ? 0 : n % 4 === 0 ? 1 : 2);
      const p = findSort("prime-not")!.make("hard", seeded(i + 90)), k = Number(p.text);
      const prime = k > 1 && Array.from({ length: Math.floor(Math.sqrt(k)) - 1 }, (_, j) => j + 2).every((x) => k % x !== 0);
      expect(p.bucket).toBe(prime ? 0 : 1);
    }
  });
});

describe("boss battle", () => {
  it("a streak hits harder; a wrong answer costs a heart; no hearts ends it", () => {
    expect([1, 2, 3, 5, 6, 9].map(bossDamage)).toEqual([1, 1, 2, 2, 3, 3]);
    let b = newBoss("easy");
    expect(b.hp).toBe(BOSS_HP.easy);
    b = bossAnswer(b, "easy", true, 3).state; expect(b.hp).toBe(BOSS_HP.easy - 2);
    b = bossAnswer(b, "easy", false, 0).state; expect(b.hearts).toBe(2);
    b = bossAnswer(bossAnswer(b, "easy", false, 0).state, "easy", false, 0).state;
    expect(b.hearts).toBe(0); expect(b.lost).toBe(true);
  });
  it("beating the boss brings a bigger one, and a heart back (up to three)", () => {
    const b = { ...newBoss("medium"), hp: 1, hearts: 2 };
    const r = bossAnswer(b, "medium", true, 1);
    expect(r.defeated).toBe(true); expect(r.state.beaten).toBe(1); expect(r.state.max).toBe(BOSS_HP.medium + 2); expect(r.state.hearts).toBe(3);
    expect(bossAnswer({ ...b, hearts: 3 }, "medium", true, 1).state.hearts).toBe(3);
  });
});

describe("race track", () => {
  it("rivals move at their own pace and the place counts who is ahead", () => {
    const rs = rivals("medium");
    expect(rs).toHaveLength(3); expect(STALL_MS).toBeGreaterThan(0);
    expect(rivalStep(rs[0], 0)).toBe(0);
    expect(rivalStep(rs[2], 3400 * 4)).toBe(4);
    expect(rivalStep(rs[2], 1e9)).toBe(RACE_LEN);
    expect(racePlace(5, 0, rs)).toBe(1);
    expect(racePlace(2, 3400 * 4, rs)).toBe(3);             // the cheetah (4) and the gazelle (3) are ahead of step 2; the tortoise (2) isn't
    expect(racePlace(RACE_LEN, 1e9, rs)).toBe(4);           // everyone else was already at the line
  });
});

describe("money ladder", () => {
  it("climbs, keeps the safe rung, and drops back on a mistake", () => {
    let s = newLadder();
    for (let i = 0; i < 4; i++) s = ladderAnswer(s, true);
    expect(s.rung).toBe(4); expect(s.safe).toBe(0);
    s = ladderAnswer(s, true); expect(s.rung).toBe(5); expect(s.safe).toBe(5); expect(ladderPrize(5)).toBe(1000);
    s = ladderAnswer(ladderAnswer(s, true), false); expect(s.rung).toBe(5); expect(s.dropped).toBe(true);
    for (let i = 0; i < 5; i++) s = ladderAnswer(s, true);
    expect(s.won).toBe(true); expect(ladderPrize(s.rung)).toBe(LADDER[LADDER.length - 1]);
  });
});

describe("the catalog", () => {
  it("every new-format game uses a skill the format can ask", () => {
    for (const g of CLASS_GAMES.filter((x) => ["boss", "race", "ladder"].includes(x.kind))) expect(playableAsFormat(g.skill), g.id).toBe(true);
    for (const g of CLASS_GAMES.filter((x) => x.kind === "sort")) expect(findSort(g.sort ?? ""), g.id).toBeTruthy();
    expect(new Set(CLASS_GAMES.map((g) => g.id)).size).toBe(CLASS_GAMES.length);
  });
});
