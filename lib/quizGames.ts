// Game styles for the live quiz — pure. The quiz itself (questions, timing,
// points) is unchanged (lib/liveQuiz.ts); a game style draws it as a race, a
// tug of war, a team battle or a boss battle.
//
// The teacher's screen is in charge: it picks the style and the teams, works
// out the game from the answers it can see after each reveal, and sends the
// result to every learner ("quiz-game", signed, re-sent every few seconds).
// Only answers to questions already revealed count, so the game never gives
// away who was right before the class sees the answer.

export type GameMode = "classic" | "race" | "tug" | "battle" | "boss";
export const MODES: { id: GameMode; name: string; emoji: string; hint: string; teams: boolean }[] = [
  { id: "classic", name: "Classic", emoji: "⚡", hint: "Points and a scoreboard", teams: false },
  { id: "race", name: "Race", emoji: "🏎️", hint: "Fast, right answers move your car along the track", teams: false },
  { id: "tug", name: "Tug of war", emoji: "🪢", hint: "Two teams pull a rope; the better team pulls harder", teams: true },
  { id: "battle", name: "Team battle", emoji: "⚔️", hint: "Two teams attack each other's health bar", teams: true },
  { id: "boss", name: "Boss battle", emoji: "🐉", hint: "The whole class against a monster — works with one learner too", teams: false },
];
export const modeInfo = (m: GameMode) => MODES.find((x) => x.id === m) ?? MODES[0];
export const isMode = (m: unknown): m is GameMode => MODES.some((x) => x.id === m);
export const TEAM_LOOK = [
  { name: "Red", colour: "#EF4444", dark: "#991B1B", emoji: "🔴" },
  { name: "Blue", colour: "#3B82F6", dark: "#1E3A8A", emoji: "🔵" },
];
export const BOSS = { name: "Number Dragon", emoji: "🐉", hearts: 3 };
// A boss-battle round where fewer than this share of the class is right: the boss hits back.
export const BOSS_HITS_BELOW = 0.5;

export type Player = { id: string; name: string };
export type Scored = { idx: number; id: string; points: number; correct: boolean };

// ── Teams ──
// Keep everyone where they are; put newcomers on the smaller team.
export function assignTeams(players: Player[], prev: string[][] = [[], []]): string[][] {
  const teams = [[...(prev[0] ?? [])], [...(prev[1] ?? [])]];
  for (const p of players) {
    if (teams[0].includes(p.id) || teams[1].includes(p.id)) continue;
    teams[teams[0].length <= teams[1].length ? 0 : 1].push(p.id);
  }
  return teams;
}
// Mix everyone up again into two even teams.
export function shuffleTeams(players: Player[], rnd: () => number = Math.random): string[][] {
  const ids = players.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return [ids.filter((_, i) => i % 2 === 0), ids.filter((_, i) => i % 2 === 1)];
}
export const teamOf = (teams: string[][], id: string) => (teams[0]?.includes(id) ? 0 : teams[1]?.includes(id) ? 1 : -1);

// ── The game ──
export type Lane = { id: string; name: string; progress: number; place: number; gain: number; points: number };
export type TeamView = { name: string; colour: string; dark: string; emoji: string; size: number; members: string[]; names: string[]; points: number; right: number };
export type GameState = {
  quizId: string; mode: GameMode; round: number; total: number; ended: boolean;
  teams: TeamView[];                         // the two teams (team modes only)
  lead: number;                              // tug of war: −1…1, positive when Red (team 0) is winning
  pull: number;                              // tug of war: which way the last round pulled (−1, 0 or 1)
  hp: number[];                              // team battle: each team's health, 0–100; boss battle: [the boss's health]
  hit: number[];                             // the damage done in the last round (battle: to each team; boss: [to the boss])
  hearts: number;                            // boss battle: the class's lives left
  bossHit: boolean;                          // boss battle: the boss struck back in the last round
  lanes: Lane[];                             // race: every racer, in order
  winner: number | null;                     // null until decided; team modes 0/1 (−1 a draw); boss 0 the class won, 1 the boss won
};

const byIdx = (scored: Scored[], idx: number) => scored.filter((s) => s.idx === idx);
const r1 = (x: number) => Math.round(x * 1000) / 1000;

// Everything the teacher's screen needs to know to draw the game after `round` revealed questions.
export function computeGame(args: { quizId: string; mode: GameMode; scored: Scored[]; players: Player[]; teams: string[][]; total: number; round: number; ended: boolean }): GameState {
  const { quizId, mode, players, total, ended } = args, round = Math.max(0, Math.min(args.round, total));
  const scored = args.scored.filter((s) => s.idx < round);
  const names = new Map(players.map((p) => [p.id, p.name]));
  const state: GameState = { quizId, mode, round, total, ended, teams: [], lead: 0, pull: 0, hp: [], hit: [], hearts: 0, bossHit: false, lanes: [], winner: null };
  const pointsOf = (id: string, upTo = round) => scored.filter((s) => s.id === id && s.idx < upTo).reduce((a, s) => a + s.points, 0);

  if (mode === "race") {
    const max = Math.max(1, total) * 1000;
    state.lanes = players.map((p) => ({ id: p.id, name: p.name, points: pointsOf(p.id), progress: r1(Math.min(1, pointsOf(p.id) / max)), gain: round ? byIdx(scored, round - 1).find((s) => s.id === p.id)?.points ?? 0 : 0, place: 0 }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((l, i, all) => ({ ...l, place: i > 0 && all[i - 1].points === l.points ? 0 : i + 1 }));
    state.lanes.forEach((l, i) => { if (!l.place) l.place = state.lanes[i - 1].place; });
    if (ended && state.lanes.length) state.winner = 0;
    return state;
  }

  if (mode === "tug" || mode === "battle") {
    const teams = assignTeams(players, args.teams).map((ids) => ids.filter((id) => names.has(id)));
    // Each team's average points on a question: a bigger team doesn't win just by being bigger.
    const avg = (t: number, idx: number) => { const ids = teams[t]; return ids.length ? byIdx(scored, idx).filter((s) => ids.includes(s.id)).reduce((a, s) => a + s.points, 0) / ids.length : 0; };
    state.teams = teams.map((ids, t) => ({
      ...TEAM_LOOK[t], size: ids.length, members: ids, names: ids.map((id) => names.get(id) ?? "Learner"),
      points: ids.reduce((a, id) => a + pointsOf(id), 0), right: scored.filter((s) => ids.includes(s.id) && s.correct).length,
    }));
    if (mode === "tug") {
      let sum = 0;
      for (let q = 0; q < round; q++) {
        const d = (avg(0, q) - avg(1, q)) / 1000;
        sum += d;
        if (q === round - 1) state.pull = d > 0.001 ? 1 : d < -0.001 ? -1 : 0;
      }
      state.lead = r1(Math.max(-1, Math.min(1, (sum * 4) / Math.max(1, total)))); // a team a third of a question better each time is all the way over by the end
      if (ended) state.winner = sum > 0.0005 ? 0 : sum < -0.0005 ? 1 : -1;
      return state;
    }
    // Battle: each round a team hits the other in proportion to how well it did. About
    // six-tenths of the best possible over the whole quiz is enough to knock a team out.
    const per = 100 / (Math.max(1, total) * 0.55), hp = [100, 100];
    let hit = [0, 0];
    for (let q = 0; q < round && hp[0] > 0 && hp[1] > 0; q++) {
      hit = [Math.round((avg(1, q) / 1000) * per), Math.round((avg(0, q) / 1000) * per)];
      hp[0] = Math.max(0, hp[0] - hit[0]); hp[1] = Math.max(0, hp[1] - hit[1]);
    }
    state.hp = hp;
    state.hit = round ? hit : [0, 0];
    if (hp[0] === 0 || hp[1] === 0 || ended) state.winner = hp[0] === hp[1] ? (ended ? -1 : null) : hp[0] > hp[1] ? 0 : 1;
    return state;
  }

  if (mode === "boss") {
    // The class wins if about seven in ten answers are right over the whole quiz.
    const per = 100 / (Math.max(1, total) * 0.7), n = Math.max(1, players.length);
    let hp = 100, hearts = BOSS.hearts, hit = 0, bossHit = false;
    for (let q = 0; q < round && hp > 0 && hearts > 0; q++) {
      const share = byIdx(scored, q).filter((s) => s.correct && names.has(s.id)).length / n;
      hit = Math.ceil(share * per - 1e-9);
      hp = Math.max(0, hp - hit);
      bossHit = share < BOSS_HITS_BELOW;
      if (bossHit) hearts--;
    }
    Object.assign(state, { hp: [hp], hit: [round ? hit : 0], hearts, bossHit: round ? bossHit : false });
    state.winner = hp === 0 ? 0 : hearts === 0 ? 1 : ended ? 1 : null;
    return state;
  }
  return state;
}

// The headline for the end of the game.
export function resultText(g: GameState, myId = ""): string {
  const me = g.teams.findIndex((t) => t.members.includes(myId));
  if (g.mode === "tug" || g.mode === "battle") {
    if (g.winner === null) return "";
    if (g.winner === -1) return "It's a draw!";
    const t = g.teams[g.winner], what = g.mode === "tug" ? "the tug of war" : "the battle";
    return me < 0 ? `Team ${t.name} wins ${what}!` : me === g.winner ? `Your team won ${what}! 🎉` : `Team ${t.name} won ${what} this time`;
  }
  if (g.mode === "boss") return g.winner === 0 ? `You beat the ${BOSS.name}! 🎉` : g.winner === 1 ? `The ${BOSS.name} got away… try again!` : "";
  if (g.mode === "race") return g.lanes[0] ? `${g.lanes[0].name} wins the race! 🏁` : "";
  return "";
}

// ── Cleaning what arrives on a learner's screen ──
const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, n);
const num = (x: unknown, lo: number, hi: number, d = 0) => { const v = Number(x); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
export const MAX_LANES = 60;
export function cleanGame(g: any): GameState | null {
  if (!g || typeof g !== "object" || typeof g.quizId !== "string" || !isMode(g.mode)) return null;
  const ids = (a: unknown) => (Array.isArray(a) ? a : []).slice(0, 200).map((x) => str(x, 80));
  return {
    quizId: str(g.quizId, 80), mode: g.mode, round: Math.round(num(g.round, 0, 500)), total: Math.round(num(g.total, 0, 500)), ended: !!g.ended,
    teams: (Array.isArray(g.teams) ? g.teams : []).slice(0, 2).map((t: any, i: number) => ({
      ...TEAM_LOOK[i], size: Math.round(num(t?.size, 0, 500)), members: ids(t?.members), names: ids(t?.names).map((n) => n.slice(0, 60)), points: Math.round(num(t?.points, 0, 1e7)), right: Math.round(num(t?.right, 0, 1e5)),
    })),
    lead: num(g.lead, -1, 1), pull: Math.round(num(g.pull, -1, 1)),
    hp: (Array.isArray(g.hp) ? g.hp : []).slice(0, 2).map((h: unknown) => num(h, 0, 100, 100)),
    hit: (Array.isArray(g.hit) ? g.hit : []).slice(0, 2).map((h: unknown) => num(h, 0, 100)),
    hearts: Math.round(num(g.hearts, 0, BOSS.hearts)), bossHit: !!g.bossHit,
    lanes: (Array.isArray(g.lanes) ? g.lanes : []).slice(0, MAX_LANES).map((l: any) => ({
      id: str(l?.id, 80), name: str(l?.name, 60) || "Learner", progress: num(l?.progress, 0, 1), place: Math.round(num(l?.place, 1, 500, 1)), gain: Math.round(num(l?.gain, 0, 5000)), points: Math.round(num(l?.points, 0, 1e7)),
    })),
    winner: g.winner === null || g.winner === undefined ? null : Math.round(num(g.winner, -1, 1)),
  };
}
