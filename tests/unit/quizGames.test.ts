import { describe, expect, it } from "vitest";
import { BOOST_STREAK, BOSS, CHESTS, MODES, PLANETS, assignTeams, chest, cleanGame, computeGame, resultText, shuffleTeams, teamOf, type GameMode, type Player, type Scored } from "@/lib/quizGames";
import { revealedCount, viewFor, type AnswerRow, type QuizRow } from "@/lib/liveQuiz";

const P = (n: number): Player[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Kid ${i}` }));
// Answers for `rounds` questions: `right(id, q)` says who got question q right (right answers score 800).
const answers = (players: Player[], rounds: number, right: (id: string, q: number) => boolean): Scored[] =>
  players.flatMap((p) => Array.from({ length: rounds }, (_, q) => ({ idx: q, id: p.id, correct: right(p.id, q), points: right(p.id, q) ? 800 : 0 })));
const game = (mode: GameMode, players: Player[], scored: Scored[], round: number, total = 5, ended = false, teams: string[][] = [[], []]) =>
  computeGame({ quizId: "q", mode, players, scored, teams, total, round, ended });

describe("teams", () => {
  it("splits players evenly and keeps everyone where they are", () => {
    const t = assignTeams(P(5));
    expect(t).toEqual([["p0", "p2", "p4"], ["p1", "p3"]]);
    const later = assignTeams([...P(5), { id: "new", name: "New" }], t);
    expect(later[1]).toContain("new"); // the smaller team
    expect(later[0]).toEqual(t[0]);
    expect(teamOf(later, "p3")).toBe(1);
    expect(teamOf(later, "nobody")).toBe(-1);
    const s = shuffleTeams(P(6), () => 0.3);
    expect(s[0].length).toBe(3); expect(s[1].length).toBe(3);
    expect([...s[0], ...s[1]].sort()).toEqual(P(6).map((p) => p.id).sort());
  });
});

describe("tug of war", () => {
  const kids = P(4); // red: p0, p2 · blue: p1, p3
  it("pulls towards the team that did better, and nowhere before any reveal", () => {
    expect(game("tug", kids, [], 0)).toMatchObject({ lead: 0, pull: 0, winner: null });
    const redRight = answers(kids, 2, (id) => id === "p0" || id === "p2");
    const g = game("tug", kids, redRight, 2);
    expect(g.lead).toBeGreaterThan(0);
    expect(g.pull).toBe(1);
    expect(g.teams.map((t) => [t.name, t.size, t.right])).toEqual([["Red", 2, 4], ["Blue", 2, 0]]);
    const blueBack = [...redRight, ...answers(kids, 3, (id, q) => q === 2 && (id === "p1" || id === "p3")).filter((s) => s.idx === 2)];
    expect(game("tug", kids, blueBack, 3).pull).toBe(-1);
  });
  it("judges teams by their average, so a bigger team can't win by size alone", () => {
    const five = P(5); // red has 3 players, blue 2
    const allRight = answers(five, 2, () => true);
    expect(game("tug", five, allRight, 2).lead).toBe(0);
  });
  it("names a winner at the end, or a draw", () => {
    const kidsAnswers = answers(kids, 5, (id) => id === "p1");
    expect(game("tug", kids, kidsAnswers, 5, 5, true).winner).toBe(1);
    expect(game("tug", kids, answers(kids, 5, () => true), 5, 5, true).winner).toBe(-1);
    expect(resultText(game("tug", kids, kidsAnswers, 5, 5, true), "p1")).toBe("Your team won the tug of war! 🎉");
    expect(resultText(game("tug", kids, kidsAnswers, 5, 5, true), "p0")).toBe("Team Blue won the tug of war this time");
    expect(resultText(game("tug", kids, kidsAnswers, 5, 5, true))).toBe("Team Blue wins the tug of war!");
  });
  it("only counts questions already revealed", () => {
    const g = game("tug", kids, answers(kids, 3, (id) => id === "p0"), 1);
    expect(g.round).toBe(1);
    expect(g.teams[0].right).toBe(1);
  });
});

describe("team battle", () => {
  const kids = P(4);
  it("each team hits the other in proportion to how well it did", () => {
    const g = game("battle", kids, answers(kids, 1, (id) => id === "p0" || id === "p2"), 1);
    expect(g.hp[0]).toBe(100);
    expect(g.hp[1]).toBeLessThan(100);
    expect(g.hit).toEqual([0, 100 - g.hp[1]]);
  });
  it("a team that does well all game knocks the other out", () => {
    const g = game("battle", kids, answers(kids, 5, (id) => id === "p0" || id === "p2"), 5, 5);
    expect(g.hp[1]).toBe(0);
    expect(g.winner).toBe(0);
  });
  it("evenly matched teams draw", () => {
    const g = game("battle", kids, answers(kids, 2, () => false), 2, 5, true);
    expect(g.hp).toEqual([100, 100]);
    expect(g.winner).toBe(-1);
  });
});

describe("boss battle", () => {
  it("the class beats the boss with about seven in ten right", () => {
    const one = P(1);
    const g = game("boss", one, answers(one, 7, () => true), 7, 10);
    expect(g.hp[0]).toBe(0);
    expect(g.winner).toBe(0);
    expect(resultText(g)).toContain("You beat the Number Dragon");
  });
  it("the boss hits back when fewer than half are right, and wins when the hearts run out", () => {
    const kids = P(4);
    let g = game("boss", kids, answers(kids, 1, (id) => id === "p0"), 1); // a quarter right
    expect(g.bossHit).toBe(true);
    expect(g.hearts).toBe(BOSS.hearts - 1);
    expect(g.hit[0]).toBeGreaterThan(0);
    g = game("boss", kids, answers(kids, 3, () => false), 3);
    expect(g.hearts).toBe(0);
    expect(g.winner).toBe(1);
    expect(game("boss", kids, answers(kids, 2, () => true), 2).bossHit).toBe(false);
  });
  it("a boss still standing at the end has won", () => {
    const kids = P(2);
    expect(game("boss", kids, answers(kids, 3, (id) => id === "p0"), 3, 3, true).winner).toBe(1);
  });
});

describe("race", () => {
  it("moves each racer by their points and puts them in order", () => {
    const kids = P(3);
    const sc: Scored[] = [{ idx: 0, id: "p0", points: 900, correct: true }, { idx: 0, id: "p1", points: 600, correct: true }, { idx: 0, id: "p2", points: 0, correct: false },
      { idx: 1, id: "p1", points: 1000, correct: true }];
    const g = game("race", kids, sc, 2, 4);
    expect(g.lanes.map((l) => [l.name, l.place, l.progress, l.gain])).toEqual([["Kid 1", 1, 0.4, 1000], ["Kid 0", 2, 0.225, 0], ["Kid 2", 3, 0, 0]]);
    expect(game("race", kids, sc, 2, 4, true).winner).toBe(0);
    expect(resultText(game("race", kids, sc, 2, 4, true))).toBe("Kid 1 wins the race! 🏁");
  });
  it("racers on the same points share a place", () => {
    const g = game("race", P(3), [{ idx: 0, id: "p0", points: 500, correct: true }, { idx: 0, id: "p1", points: 500, correct: true }], 1, 4);
    expect(g.lanes.map((l) => l.place)).toEqual([1, 1, 3]);
  });
});

describe("cleaning what arrives", () => {
  it("keeps a good game and drops nonsense", () => {
    const kids = P(4), g = game("battle", kids, answers(kids, 2, (id) => id === "p0"), 2);
    expect(cleanGame(JSON.parse(JSON.stringify(g)))).toEqual(g);
    expect(cleanGame({ quizId: "q", mode: "chess" })).toBeNull();
    expect(cleanGame(null)).toBeNull();
    expect(cleanGame({ quizId: "q", mode: "tug", lead: 9, hp: [500], winner: 7, lanes: [{ progress: 3 }] })).toMatchObject({ lead: 1, hp: [100], winner: 1, lanes: [{ progress: 1, name: "Learner" }] });
    expect(MODES.map((m) => m.id)).toEqual(["classic", "race", "space", "treasure", "tug", "battle", "boss"]);
    const t = game("treasure", P(3), answers(P(3), 2, () => true), 2);
    expect(cleanGame(JSON.parse(JSON.stringify(t)))).toEqual(t);
    expect(cleanGame({ quizId: "q", mode: "treasure", lanes: [{ loot: "dragon", streak: -4 }] })!.lanes[0]).toMatchObject({ loot: "", streak: 0 });
  });
});

describe("what the teacher's screen is told", () => {
  const quiz: QuizRow = { id: "z", title: "T", status: "question", current: 1, started_at: null, created_at: "", questions: [0, 1, 2].map(() => ({ q: "?", options: ["a", "b"], answer: 0, seconds: 20 })) };
  const ans: AnswerRow[] = [{ idx: 0, student_id: "s1", choice: 0, correct: true, ms: 1, points: 900 }, { idx: 1, student_id: "s1", choice: 1, correct: false, ms: 1, points: 0 }];
  it("never includes the question still being answered", () => {
    expect(revealedCount(quiz)).toBe(1);
    expect(revealedCount({ ...quiz, status: "reveal" })).toBe(2);
    expect(revealedCount({ ...quiz, status: "lobby", current: -1 })).toBe(0);
    const host = viewFor(quiz, ans, new Map([["s1", "Amy"]]), { host: true, id: "h" }) as any;
    expect(host.game.scored).toEqual([{ idx: 0, id: "s1", points: 900, correct: true }]);
    expect(host.game.players).toEqual([{ id: "s1", name: "Amy" }]);
    expect((viewFor(quiz, ans, new Map(), { host: false, id: "s1" }) as any).game).toBeUndefined(); // learners don't get it
  });
});

describe("treasure hunt", () => {
  it("a right answer opens a chest; a wrong one finds it empty", () => {
    expect(chest("q", "p0", 0, undefined)).toEqual({ loot: "", gold: 0 });
    expect(chest("q", "p0", 0, { idx: 0, id: "p0", points: 0, correct: false })).toEqual({ loot: "empty", gold: 0 });
    const c = chest("q", "p0", 0, { idx: 0, id: "p0", points: 800, correct: true });
    expect(["coins", "double", "gem", "crown"]).toContain(c.loot);
    expect(c.gold).toBe({ coins: 80, double: 160, gem: 180, crown: 330 }[c.loot]);
    expect(chest("q", "p0", 0, { idx: 0, id: "p0", points: 800, correct: true })).toEqual(c); // the same every time, on every screen
    expect(Object.keys(CHESTS)).toEqual(["empty", "coins", "double", "gem", "crown"]);
  });
  it("bonus chests turn up now and then, not every time", () => {
    const got: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) { const c = chest("quiz", `kid${i}`, i % 7, { idx: 0, id: "x", points: 800, correct: true }); got[c.loot] = (got[c.loot] ?? 0) + 1; }
    expect(got.crown / 2000).toBeGreaterThan(0.02); expect(got.crown / 2000).toBeLessThan(0.09);
    expect(got.coins / 2000).toBeGreaterThan(0.55); expect(got.coins / 2000).toBeLessThan(0.8);
  });
  it("adds up each hunter's gold and puts the richest first", () => {
    const kids = P(3), g = game("treasure", kids, answers(kids, 3, (id) => id !== "p2"), 3);
    expect(g.lanes[2]).toMatchObject({ name: "Kid 2", points: 0, loot: "empty", progress: 0 });
    expect(g.lanes[0].progress).toBe(1);
    for (const l of g.lanes.slice(0, 2)) {
      const sum = [0, 1, 2].reduce((a, q) => a + chest("q", l.id, q, { idx: q, id: l.id, points: 800, correct: true }).gold, 0);
      expect(l.points).toBe(sum);
      expect(l.gain).toBe(chest("q", l.id, 2, { idx: 2, id: l.id, points: 800, correct: true }).gold);
    }
    expect(resultText(game("treasure", kids, answers(kids, 3, (id) => id !== "p2"), 3, 5, true))).toContain("found the most treasure");
  });
});

describe("space race", () => {
  it("counts each rocket's run of right answers for a boost", () => {
    const kids = P(2), g = game("space", kids, answers(kids, 4, (id, q) => id === "p0" || q === 3), 4);
    expect(g.lanes.find((l) => l.id === "p0")!.streak).toBe(4);
    expect(g.lanes.find((l) => l.id === "p1")!.streak).toBe(1);
    expect(BOOST_STREAK).toBe(3);
    expect(PLANETS.map((p) => p.at)).toEqual([0.25, 0.5, 0.75, 1]);
    expect(resultText(game("space", kids, answers(kids, 4, () => true), 4, 4, true))).toContain("reaches the stars first");
  });
});
