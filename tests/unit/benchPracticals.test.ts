import { describe, expect, it } from "vitest";
import { foodTests, ohmsLaw, osmosis, titration } from "@/lib/lab/bench/practicals";
import { ALL_PRACTICALS as PRACTICALS, practicalFor as practicalBySlug } from "@/lib/lab/bench/all";
import { checkField, doStep, runAll, seeded, targetOf } from "@/lib/lab/bench/run";
import { fitLine } from "@/lib/lab/bench/types";
import { LAB } from "@/lib/lab/catalog";
import { guideFor } from "@/lib/lab/guides";

describe("virtual practicals on the lab bench", () => {
  for (const p of PRACTICALS) {
    it(`${p.title}: every step can be done, and the right answers are accepted`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const rand = seeded(seed);
        let s = p.init(rand), values: Record<string, string> = {};
        p.steps.forEach((step, i) => {
          const items = p.layout(s, i), ids = items.map((x) => x.id);
          expect(new Set(ids).size, `${p.slug} step ${i}: ids unique`).toBe(ids.length);
          for (const it of items) expect(Number.isFinite(it.x) && Number.isFinite(it.y), `${p.slug} ${it.id}`).toBe(true);
          const a = step.action;
          // What the step works on is on the bench, and can be seen.
          if (a.type === "drag") {
            expect(ids, `${p.slug} ${step.id}`).toContain(a.item);
            expect(ids, `${p.slug} ${step.id}`).toContain(a.onto);
            expect(items.find((x) => x.id === a.item)!.hidden, `${p.slug} ${step.id}`).toBeFalsy();
          }
          if (a.type === "tap" || a.type === "hold" || a.type === "set") expect(ids).toContain(a.item);
          if (a.type === "set") { const t = targetOf(a, s); expect(t, `${p.slug} ${step.id}`).toBeGreaterThanOrEqual(a.min); expect(t, `${p.slug} ${step.id}`).toBeLessThanOrEqual(a.max); }
          if (step.magnify) expect(ids).toContain(step.magnify);
          if (a.type === "record") {
            const right = doStep(step, s, values).values;
            for (const f of a.fields) {
              expect(checkField(f, right[f.key], s, { ...values, ...right }), `${p.slug} ${f.key} = ${right[f.key]}`).toBe(true);
              const wrong = f.options ? f.options.find((o) => o !== right[f.key])! : "9999";
              expect(checkField(f, wrong, s, { ...values, ...right }), `${p.slug} ${f.key} wrong`).not.toBe(true);
              expect(checkField(f, "", s, values)).not.toBe(true);
            }
          }
          ({ s, values } = doStep(step, s, values));
        });
        for (const t of p.results(s, values)) for (const r of t.rows) expect(r).toHaveLength(t.columns.length);
        expect(p.conclusion(s, values)).not.toContain("…");
        expect(JSON.stringify(p.results(s, values))).not.toContain("—");
      }
    });
  }

  it("time passes and taps run in small steps too (one screen frame at a time)", () => {
    for (const p of PRACTICALS) {
      let s = p.init(seeded(2)), values: Record<string, string> = {};
      for (const step of p.steps) {
        if ((step.action.type === "wait" || step.action.type === "hold") && step.tick) {
          const by = step.action.type === "hold" ? step.action.rate / 60 : 1 / 60;
          let n = 0;
          while (!step.finished!(s) && n++ < 60 * 120) s = step.tick(s, by);
          expect(step.finished!(s), `${p.slug} ${step.id}`).toBe(true);
          continue;
        }
        ({ s, values } = doStep(step, s, values));
      }
    }
  });

  it("are listed in the lab, each with a spoken guide", () => {
    for (const p of PRACTICALS) {
      const e = LAB.find((x) => x.slug === p.slug);
      expect(e, p.slug).toBeTruthy();
      expect(e!.practical).toBe(true);
      expect(e!.subject).toBe(p.subject);
      expect(guideFor(p.slug)).not.toBeNull();
      expect(practicalBySlug(p.slug)).toBe(p);
    }
    expect(new Set(PRACTICALS.map((p) => p.subject))).toEqual(new Set(["physics", "chemistry", "biology"]));
    // Every experiment marked as a bench practical has one.
    for (const e of LAB.filter((x) => x.practical)) expect(practicalBySlug(e.slug), e.slug).not.toBeNull();
  });

  it("titration: the flask stays pink until the end point, and going past it is pointed out", () => {
    let s = titration.init(seeded(3));
    for (const step of titration.steps.slice(0, 6)) s = doStep(step, s, {}).s;
    const titrate = titration.steps[6];
    const flask = () => titration.layout(s, 6).find((x) => x.id === "flask")!.props!.colour;
    expect(flask()).not.toBe("#f8fafc"); // pink
    const end = (0.1 * 25) / s.c;
    while (s.added < end - 2) s = titrate.tick!(s, 0.5);
    expect(titrate.finished!(s)).toBe(false);
    s = titrate.tick!(s, 3); // held the tap too long
    expect(titrate.finished!(s)).toBe(true);
    expect(flask()).toBe("#f8fafc"); // colourless
    expect(titrate.note!(s)).toMatch(/went past it/);
    // The burette shows the new level.
    expect(titration.layout(s, 7).find((x) => x.id === "stand")!.props!.level).toBeCloseTo(s.r0 + s.added, 5);
  });

  it("titration: the concentration found matches the hidden one", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { s, values } = runAll(titration, seeded(seed));
      expect(Math.abs(Number(values.conc) - s.c) / s.c).toBeLessThan(0.03);
    }
  });

  it("Ohm's law: the readings fall on a line through the origin whose gradient is 1 / R", () => {
    const { s, values } = runAll(ohmsLaw, seeded(7));
    const g = ohmsLaw.graph!(s, values)!;
    expect(g.points).toHaveLength(6);
    expect(1 / fitLine(g.points, true).m).toBeCloseTo(s.R, 1);
    // The ammeter shows nothing until the circuit is complete and switched on.
    const start = ohmsLaw.init(seeded(7));
    expect(ohmsLaw.layout(start, 0).find((x) => x.id === "ammeter")!.props!.reading).toBe("");
  });

  it("osmosis: mass goes up in water and down in strong sugar, crossing zero near the hidden point", () => {
    const { s, values } = runAll(osmosis, seeded(11));
    const g = osmosis.graph!(s, values)!;
    expect(g.points[0][1]).toBeGreaterThan(0);
    expect(g.points[4][1]).toBeLessThan(0);
    expect(Math.abs(Number(values.iso) - s.iso)).toBeLessThan(0.07);
    // The cylinders are out of sight while they soak.
    const soaking = osmosis.layout({ ...s, inTubes: true, blotted: false }, 3);
    expect(soaking.find((x) => x.id === "cyl")!.hidden).toBe(true);
  });

  it("food tests: Benedict's turns colour only when heated, and only with sugar", () => {
    let s = foodTests.init(seeded(1));
    for (const step of foodTests.steps.slice(0, 3)) s = doStep(step, s, {}).s;
    const tubes = () => foodTests.layout(s, 3).find((x) => x.id === "rackA")!.props!.tubes as { colour: string }[];
    expect(new Set(tubes().map((t) => t.colour)).size).toBe(1); // all blue before heating
    s = doStep(foodTests.steps[3], s, {}).s;
    const c = tubes().map((t) => t.colour);
    expect(c[0]).not.toBe(c[1]); // glucose went brick red, starch stayed blue
    expect(c[1]).toBe(c[2]);
  });
});
