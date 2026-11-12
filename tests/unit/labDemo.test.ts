import { describe, expect, it } from "vitest";
import { ALL_PRACTICALS } from "@/lib/lab/bench/all";
import { doStep, seeded } from "@/lib/lab/bench/run";
import { cleanFrame, cleanMode, cleanNudge, cleanTask, type DemoFrame } from "@/lib/lab/demo";
import { LOOK_FOR, STARTERS, checkObservation } from "@/lib/lab/observe";
import { cleanProgress } from "@/lib/lab/labTrack";

const frameOf = (slug: string, step: number, s: unknown, values: Record<string, string> = {}): DemoFrame =>
  ({ slug, id: 1, step, s, values, notes: {}, shown: [], move: null, pour: null, holding: false, setVal: null });

describe("watching the teacher's bench", () => {
  it("every practical, at every step, looks the same on a learner's phone as on the teacher's bench", () => {
    for (const p of ALL_PRACTICALS) {
      let s = p.init(seeded(7)), values: Record<string, string> = {};
      for (let i = 0; i <= p.steps.length; i++) {
        const f = cleanFrame(JSON.parse(JSON.stringify(frameOf(p.slug, i, s, values))))!;
        expect(f, `${p.slug} step ${i}`).not.toBeNull();
        expect(JSON.stringify(p.layout(f.s, f.step)), `${p.slug} step ${i}`).toBe(JSON.stringify(p.layout(s, i)));
        if (i < p.steps.length) ({ s, values } = doStep(p.steps[i], f.s, values));
      }
    }
  });

  it("drops what isn't a picture of a bench, and tidies what is", () => {
    expect(cleanFrame(null)).toBeNull();
    expect(cleanFrame({ slug: "" })).toBeNull();
    expect(cleanFrame({ slug: "x", s: "a".repeat(70_000) })).toBeNull();
    const f = cleanFrame({ slug: "titration", step: -4, s: { v: 1 }, values: { a: 12 }, notes: { 2: "Pink", x: "no" },
      move: { id: "flask", x: "3", y: 4, tilt: null }, pour: { x: 1, y: 2, colour: "red;evil", drops: 1 }, holding: 1, setVal: "2.5" })!;
    expect(f.step).toBe(0);
    expect(f.values).toEqual({ a: "12" });
    expect(f.notes).toEqual({ 2: "Pink" });
    expect(f.move).toEqual({ id: "flask", x: 3, y: 4, tilt: 0 });
    expect(f.pour).toEqual({ x: 1, y: 2, colour: "#BFDBFE", drops: true });
    expect(f.holding).toBe(true);
    expect(f.setVal).toBe(2.5);
  });

  it("the mode, the task and help for one learner", () => {
    expect(cleanMode("watch")).toBe("watch");
    expect(cleanMode("anything")).toBe("try");
    expect(cleanTask("  Do three titres.\n")).toBe("Do three titres.");
    expect(cleanTask("x".repeat(900))).toHaveLength(400);
    expect(cleanNudge({ to: "ada", text: " Read the scale at eye level. " })).toMatchObject({ to: "ada", text: "Read the scale at eye level." });
    expect(cleanNudge({ to: "", text: "hi" })).toBeNull();
    expect(cleanNudge({ to: "ada", text: "  " })).toBeNull();
  });
});

describe("recording observations", () => {
  it("a clear observation passes, and says what's good", () => {
    const c = checkObservation("The solution changed from blue to colourless and the temperature rose from 21 °C to 35 °C.");
    expect(c.tips).toEqual([]);
    expect(c.ok).toBe(true);
    expect(c.good).toEqual(expect.arrayContaining(["Measurements have units.", "Says what it changed from and to.", "Names a colour."]));
    expect(checkObservation("Bubbles of gas were given off quickly").ok).toBe(true);
    expect(checkObservation("The burette reading was 23.45 cm³").ok).toBe(true);
    expect(checkObservation("It took 12 s for the cross to disappear").ok).toBe(true);
  });

  it("an explanation is not an observation", () => {
    expect(checkObservation("It went pink because the alkali was neutralised").tips.join(" ")).toMatch(/explaining why/);
  });

  it("a change needs a before and after", () => {
    expect(checkObservation("The colour changed").tips.join(" ")).toMatch(/from and to/);
    expect(checkObservation("The lamp became brighter").ok).toBe(true);
  });

  it("every number needs its unit", () => {
    expect(checkObservation("The temperature went up to 35.").tips.join(" ")).toMatch(/unit/);
    expect(checkObservation("The reading was 4.5 and then 6").tips.join(" ")).toMatch(/unit/);
    expect(checkObservation("The length was 4.5 cm").tips).toEqual([]);
    expect(checkObservation("The mass was 12.3g").tips).toEqual([]);
  });

  it("vague or too short", () => {
    expect(checkObservation("It reacted").ok).toBe(false);
    expect(checkObservation("Something happened in the tube").tips.join(" ")).toMatch(/specific/);
  });

  it("there's help for every subject", () => {
    for (const s of ["physics", "chemistry", "biology", "maths"] as const) {
      expect(LOOK_FOR[s].length).toBeGreaterThan(3);
      expect(STARTERS[s].length).toBeGreaterThan(3);
    }
  });

  it("observations reach the teacher's tracker, tidied", () => {
    const p = cleanProgress({ by: "ada", slug: "titration", step: 2, total: 9, obs: [{ t: " Turned pink ", ok: 1 }, { t: "" }, null, { t: "x".repeat(900) }] })!;
    expect(p.obs).toEqual([{ t: "Turned pink", ok: true }, { t: "x".repeat(400), ok: false }]);
  });
});
