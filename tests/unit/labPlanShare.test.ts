import { describe, expect, it } from "vitest";
import { addPlan, cleanAssignment, cleanReply, cleanReport, planScore } from "@/lib/lab/room/planShare";

const good = { by: "learner-1", name: "Ada", v: 1, at: 1000, subject: "chemistry", plan: { title: "Titration", aim: "To find the concentration of the acid", independent: "volume of acid", dependent: "colour change", controls: "volume of alkali", method: ["Fill the burette", "Pipette 25 cm³", "Titrate to the end point"], target: "titration" }, picked: ["Burette"], check: { have: 8, of: 8, missing: [] }, hazards: ["corrosive"], seen: ["It turned red."] };

describe("plans between learners and the teacher", () => {
  it("cleans what arrives, and refuses rubbish", () => {
    expect(cleanReport(good)!.plan.target).toBe("titration");
    expect(cleanReport({ ...good, subject: "magic" })).toBeNull();
    expect(cleanReport({ ...good, by: "" })).toBeNull();
    const long = cleanReport({ ...good, plan: { ...good.plan, aim: "x".repeat(5000), method: Array(100).fill("step"), target: "../evil" } })!;
    expect(long.plan.aim).toHaveLength(600); expect(long.plan.method).toHaveLength(25); expect(long.plan.target).toBeNull();
    expect(cleanAssignment({ subject: "physics", slug: "pendulum", title: "Pendulum", note: "Use 5 lengths" })).toMatchObject({ subject: "physics", slug: "pendulum" });
    expect(cleanAssignment({ subject: "nope" })).toBeNull();
    expect(cleanReply({ to: "learner-1", text: "Good", ok: true })).toMatchObject({ ok: true });
    expect(cleanReply({ to: "", text: "x" })).toBeNull();
  });
  it("keeps each learner's newest plan", () => {
    let m = addPlan({}, cleanReport(good));
    m = addPlan(m, cleanReport({ ...good, v: 2, at: 2000, plan: { ...good.plan, aim: "A newer aim for the plan" } }));
    expect(m["learner-1"].plan.aim).toBe("A newer aim for the plan");
    m = addPlan(m, cleanReport({ ...good, v: 1, at: 1500 })); // an older copy arriving late
    expect(m["learner-1"].v).toBe(2);
  });
  it("scores how complete a plan is", () => {
    expect(planScore(cleanReport(good)!)).toMatchObject({ got: 5, of: 5 });
    const thin = planScore(cleanReport({ ...good, plan: { ...good.plan, aim: "", method: ["one"] }, check: { have: 2, of: 8, missing: ["Pipette"] } })!);
    expect(thin.got).toBe(2);
    expect(thin.missing).toEqual(expect.arrayContaining(["an aim", "a method (3+ steps)", "all the apparatus"]));
  });
});
