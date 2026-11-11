import { describe, expect, it } from "vitest";
import {
  DEFAULT_BALANCER, DEFAULT_FOODWEB, EQUATIONS, MAX_COEF, WEBS, WEB_IDS, checkBalance, cleanBalancer, cleanFoodWeb, cleanRays, describeImage, eatersOf, effectsOf, foodsOf, formulaParts, formulaText,
  imageOf, layoutWeb, parseEquation, parseFormula, raySegments, roleOf, signedF, solveEquation, speciesOf, tryLink, usable, whereText, type RayState,
} from "@/lib/scienceMore";
import { DEFAULT_WIDGETS, cleanWidgets } from "@/lib/boardTools";

describe("equation balancer", () => {
  it("counts the atoms in a formula, brackets and all", () => {
    expect(parseFormula("H2O")).toEqual({ H: 2, O: 1 });
    expect(parseFormula("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula("Al2(SO4)3")).toEqual({ Al: 2, S: 3, O: 12 });
    expect(parseFormula("C6H12O6")).toEqual({ C: 6, H: 12, O: 6 });
    expect(parseFormula("NaCl")).toEqual({ Na: 1, Cl: 1 });
    for (const bad of ["", "h2o", "H2O)", "(OH", "H0", "2H", "H2-O", "x".repeat(30)]) expect(parseFormula(bad), bad).toBeNull();
  });
  it("reads an equation however it's typed", () => {
    const eq = parseEquation(" 2 H2 + O2 → 2H2O ")!;
    expect(speciesOf(eq).map((s) => s.formula)).toEqual(["H2", "O2", "H2O"]);
    expect(parseEquation("Fe + O2 = Fe2O3")).not.toBeNull();
    expect(parseEquation("H2 + O2")).toBeNull();
    expect(parseEquation("H2 + O2 -> NaCl")).toBeNull(); // different elements on each side
    expect(parseEquation("H2 + O2 + N2 + C + S -> H2O")).toBeNull();
  });
  it("checks a set of numbers", () => {
    const eq = parseEquation("H2 + O2 -> H2O")!;
    expect(checkBalance(eq, [1, 1, 1])).toMatchObject({ balanced: false, left: { H: 2, O: 2 }, right: { H: 2, O: 1 } });
    expect(checkBalance(eq, [2, 1, 2])).toMatchObject({ balanced: true, simplest: true });
    expect(checkBalance(eq, [4, 2, 4])).toMatchObject({ balanced: true, simplest: false });
  });
  it("finds the smallest whole numbers for every ready-made equation", () => {
    const answers: Record<string, number[]> = {
      "H2 + O2 -> H2O": [2, 1, 2], "N2 + H2 -> NH3": [1, 3, 2], "CH4 + O2 -> CO2 + H2O": [1, 2, 1, 2], "Fe + O2 -> Fe2O3": [4, 3, 2], "Ca(OH)2 + HCl -> CaCl2 + H2O": [1, 2, 1, 2],
      "KClO3 -> KCl + O2": [2, 2, 3], "Fe2O3 + CO -> Fe + CO2": [1, 3, 2, 3], "C3H8 + O2 -> CO2 + H2O": [1, 5, 3, 4], "CO2 + H2O -> C6H12O6 + O2": [6, 6, 1, 6], "Na + H2O -> NaOH + H2": [2, 2, 2, 1],
    };
    for (const e of EQUATIONS) {
      const eq = parseEquation(e.text)!, sol = solveEquation(eq)!;
      expect(sol, e.text).not.toBeNull();
      expect(checkBalance(eq, sol)).toMatchObject({ balanced: true, simplest: true });
      expect(Math.max(...sol)).toBeLessThanOrEqual(MAX_COEF);
      expect(sol.some((k) => k > 1), `${e.text} needs balancing`).toBe(true);
      if (answers[e.text]) expect(sol, e.text).toEqual(answers[e.text]);
    }
  });
  it("only takes a typed equation it can balance, and cleans what arrives", () => {
    expect(usable("Mg + HCl -> MgCl2 + H2")).not.toBeNull();
    expect(usable("H2 -> O2")).toBeNull();
    expect(usable("H2 + O2 -> H2O2 + H2O + O3 + H")).toBeNull();
    expect(cleanBalancer({ on: true, text: "N2 + H2 -> NH3", coef: [1, 99, "2", 7], counts: false })).toMatchObject({ on: true, text: "N2 + H2 -> NH3", coef: [1, 12, 2], counts: false });
    expect(cleanBalancer({ on: true, text: "rubbish" })).toMatchObject({ on: true, text: DEFAULT_BALANCER.text, coef: [1, 1, 1] });
    expect(formulaParts("C6H12O6")).toEqual([{ t: "C", sub: false }, { t: "6", sub: true }, { t: "H", sub: false }, { t: "12", sub: true }, { t: "O", sub: false }, { t: "6", sub: true }]);
  });
});

describe("ray diagrams", () => {
  const R = (r: Partial<RayState>) => cleanRays({ optic: "convex", u: 30, f: 15, h: 8, ...r });
  it("places the image for a convex lens", () => {
    expect(imageOf(R({ u: 30, f: 15 }))).toMatchObject({ v: 30, m: -1, real: true, upright: false, size: "the same size", x: 30, hi: -8 }); // at 2F
    expect(describeImage(R({ u: 20, f: 15 }))).toBe("Real, inverted and magnified");
    expect(imageOf(R({ u: 20, f: 15 })).v).toBeCloseTo(60);
    expect(describeImage(R({ u: 45, f: 15 }))).toBe("Real, inverted and diminished");
    const glass = imageOf(R({ u: 10, f: 15 })); // inside F: a magnifying glass
    expect(glass).toMatchObject({ real: false, upright: true, size: "magnified" });
    expect(glass.v).toBeCloseTo(-30);
    expect(glass.x).toBeCloseTo(-30); // on the object's side
    expect(describeImage(R({ u: 15, f: 15 }))).toContain("No image");
    expect(whereText(R({ u: 15, f: 15 }))).toBe("The object is at the focal point.");
  });
  it("places the image for the other lens and the mirrors", () => {
    expect(describeImage(R({ optic: "concave", u: 30, f: 15 }))).toBe("Virtual, upright and diminished");
    expect(imageOf(R({ optic: "concave", u: 30, f: 15 })).v).toBeCloseTo(-10);
    const mirror = imageOf(R({ optic: "concave-mirror", u: 20, f: 15 }));
    expect(mirror).toMatchObject({ real: true, upright: false, size: "magnified" });
    expect(mirror.x).toBeCloseTo(-60); // a real image forms in front of a mirror
    expect(describeImage(R({ optic: "concave-mirror", u: 10, f: 15 }))).toBe("Virtual, upright and magnified");
    expect(imageOf(R({ optic: "concave-mirror", u: 10, f: 15 })).x).toBeCloseTo(30); // behind it
    expect(describeImage(R({ optic: "convex-mirror", u: 30, f: 15 }))).toBe("Virtual, upright and diminished");
    expect(imageOf(R({ optic: "plane", u: 25 }))).toMatchObject({ v: -25, m: 1, x: 25, hi: 8, size: "the same size" });
    expect(describeImage(R({ optic: "plane", u: 25 }))).toBe("Virtual, upright and the same size");
    expect(signedF(R({ optic: "concave" }))).toBe(-15);
    expect(signedF(R({ optic: "plane" }))).toBe(Infinity);
  });
  it("says where the image is and shows the working", () => {
    expect(whereText(R({ u: 20, f: 15 }))).toBe("Image 60 cm from the lens, on the far side of the lens. Magnification ×3.");
    expect(whereText(R({ optic: "convex-mirror", u: 30, f: 15 }))).toBe("Image 10 cm from the mirror, behind the mirror. Magnification ×0.33.");
    expect(formulaText(R({ u: 20, f: 15 }))).toBe("1/v = 1/f − 1/u = 1/15 − 1/20, so v = 60 cm");
    expect(formulaText(R({ optic: "concave", u: 30, f: 15 }))).toBe("1/v = 1/f − 1/u = 1/(−15) − 1/30, so v = −10 cm (the minus sign means virtual)");
    expect(formulaText(R({ optic: "plane", u: 25 }))).toContain("25 cm");
  });
  it("draws rays that really pass through the focal point and the image", () => {
    const on = (p: [number, number], a: [number, number], b: [number, number]) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-6;
    for (const s of [R({ u: 20, f: 15 }), R({ u: 45, f: 10 }), R({ u: 10, f: 15 }), R({ optic: "concave", u: 30 }), R({ optic: "concave-mirror", u: 40, f: 15 }), R({ optic: "concave-mirror", u: 8, f: 15 }), R({ optic: "convex-mirror", u: 30 }), R({ optic: "plane", u: 25 })]) {
      const im = imageOf(s), segs = raySegments(s), I: [number, number] = [im.x, im.hi];
      const after = segs.filter((g) => !g.dashed && g.a[0] === 0); // the pieces leaving the lens or mirror
      expect(after).toHaveLength(2);
      for (const g of after) expect(on(I, g.a, g.b), `${s.optic} u=${s.u}: ray ${g.ray} lines up with the image`).toBe(true);
      expect(segs.some((g) => g.dashed)).toBe(!im.real);
      for (const g of after) expect(Math.sign(g.b[0])).toBe(s.optic.includes("mirror") || s.optic === "plane" ? -1 : 1); // lenses pass light on; mirrors send it back
    }
    const par = raySegments(R({ u: 15, f: 15 })).filter((g) => g.a[0] === 0);
    expect((par[0].b[1] - par[0].a[1]) / par[0].b[0]).toBeCloseTo((par[1].b[1] - par[1].a[1]) / par[1].b[0]); // parallel
  });
  it("cleans what arrives", () => {
    expect(cleanRays({ optic: "prism", u: 999, f: 12, h: 0, show: false })).toMatchObject({ optic: "convex", u: 60, f: 15, h: 4, show: false });
  });
});

describe("food web builder", () => {
  const sav = WEBS.savanna;
  it("every web hangs together", () => {
    for (const id of WEB_IDS) {
      const w = WEBS[id], ids = w.organisms.map((x) => x.id), pos = layoutWeb(w);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [food, eater] of w.links) {
        expect(ids).toContain(food); expect(ids).toContain(eater);
        expect(w.organisms.find((x) => x.id === eater)!.row, `${food} → ${eater} points up the page`).toBeGreaterThan(w.organisms.find((x) => x.id === food)!.row);
      }
      expect(new Set(w.links.map((l) => l.join(">"))).size).toBe(w.links.length);
      for (const x of w.organisms) { expect(foodsOf(w, x.id).length + eatersOf(w, x.id).length).toBeGreaterThan(0); expect(pos[x.id][0]).toBeGreaterThan(30); expect(pos[x.id][0]).toBeLessThan(570); }
      for (const x of w.organisms.filter((y) => y.row === 0)) expect(roleOf(w, x.id)).toBe("Producer");
    }
  });
  it("names feeding levels", () => {
    expect(roleOf(sav, "zebra")).toBe("Herbivore (primary consumer)");
    expect(roleOf(sav, "lizard")).toBe("Carnivore");
    expect(roleOf(sav, "lion")).toBe("Top predator");
    expect(roleOf(WEBS.farm, "hen")).toBe("Omnivore");
  });
  it("only draws arrows that are true, pointing from food to feeder", () => {
    expect(tryLink(sav, "grass", "zebra")).toEqual({ ok: true, index: 1 });
    const back = tryLink(sav, "zebra", "grass");
    expect(back.ok).toBe(false);
    expect(!back.ok && back.why).toContain("from Grass to Zebra");
    const no = tryLink(sav, "grass", "lion");
    expect(!no.ok && no.why).toBe("In this web, lion doesn't eat grass.");
  });
  it("works out what happens when something is taken away", () => {
    const e = effectsOf(sav, ["grasshopper"]);
    expect(e.lizard).toMatchObject({ dir: "down", sure: true }); // its only food
    expect(e.grass).toMatchObject({ dir: "up" });
    expect(e.grasshopper).toBeUndefined();
    const lion = effectsOf(sav, ["lion"]);
    expect(lion.zebra.dir).toBe("up");
    expect(lion.giraffe.dir).toBe("up");
    expect(lion.grass).toMatchObject({ dir: "down", sure: false }); // more grazers
    const zebra = effectsOf(sav, ["zebra"]);
    expect(zebra.lion).toMatchObject({ dir: "down", sure: false });
    expect(zebra.lion.why).toContain("antelope and giraffe");
    expect(zebra.antelope).toMatchObject({ dir: "down" }); // lions eat more of them
    expect(effectsOf(sav, [])).toEqual({});
    expect(effectsOf(sav, ["grass", "acacia"]).antelope).toMatchObject({ dir: "down", sure: true });
  });
  it("cleans what arrives", () => {
    expect(cleanFoodWeb({ on: 1, web: "moon", drawn: [0, 0, 99, -1, "2"], removed: ["lion", "dragon"], roles: 1 })).toMatchObject({ on: true, web: "savanna", drawn: [0, 2], removed: ["lion"], roles: true });
    expect(cleanFoodWeb(null)).toMatchObject({ web: DEFAULT_FOODWEB.web, drawn: [] });
  });
});

describe("on the board", () => {
  it("the three tools travel with the board's other tools", () => {
    const w = cleanWidgets({ ...DEFAULT_WIDGETS, balancer: { ...DEFAULT_WIDGETS.balancer, on: true, coef: [2, 1, 2] }, rays: { ...DEFAULT_WIDGETS.rays, optic: "plane" }, foodweb: { ...DEFAULT_WIDGETS.foodweb, web: "pond" } });
    expect(w.balancer).toMatchObject({ on: true, coef: [2, 1, 2] });
    expect(w.rays.optic).toBe("plane");
    expect(w.foodweb.web).toBe("pond");
    const old = cleanWidgets({});
    expect([old.balancer.on, old.rays.on, old.foodweb.on]).toEqual([false, false, false]);
  });
});
