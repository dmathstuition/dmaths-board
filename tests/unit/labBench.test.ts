import { describe, expect, it } from "vitest";
import { ROOMS, type Item } from "@/lib/lab/room/inventory";
import { colourOf, combine, emptyBench, pHOf, tick, type BenchState } from "@/lib/lab/room/bench";

const C = (n: string) => ROOMS.chemistry.find((x) => x.name === n)!;
const P = (n: string) => ROOMS.physics.find((x) => x.name === n)!;
const B = (n: string) => ROOMS.biology.find((x) => x.name === n)!;
function run(steps: [Item, Item][], st: BenchState = emptyBench()) { let r = { st, note: "", fx: "none" as string, ok: true }; for (const [a, b] of steps) r = combine(a, b, r.st); return r; }
const tube = C("Test tube"), tube2 = C("Boiling tube");

describe("the free bench: apparatus act on each other", () => {
  it("copper(II) sulfate then sodium hydroxide gives a light blue precipitate", () => {
    const r = run([[C("Copper(II) sulfate"), tube], [C("Sodium hydroxide"), tube]]);
    expect(r.fx).toBe("ppt");
    expect(r.note).toMatch(/light blue/);
    expect(r.st.slots[tube.id].liquid!.ppt!.name).toMatch(/copper/);
  });
  it("zinc hydroxide dissolves in excess; iron(III) gives red-brown", () => {
    const r = run([[C("Zinc sulfate"), tube], [C("Sodium hydroxide"), tube], [C("Sodium hydroxide"), tube]]);
    expect(r.note).toMatch(/dissolves in excess/);
    expect(r.st.slots[tube.id].liquid!.ppt).toBeNull();
    expect(run([[C("Iron(III) chloride"), tube], [C("Sodium hydroxide"), tube]]).note).toMatch(/red-brown/);
  });
  it("silver nitrate shows chloride; acids fizz with carbonates and magnesium, not copper", () => {
    expect(run([[C("Sodium chloride"), tube], [C("Silver nitrate"), tube]]).note).toMatch(/silver chloride/);
    const co2 = run([[C("Calcium carbonate"), tube], [C("Hydrochloric acid"), tube]]);
    expect(co2.fx).toBe("fizz"); expect(co2.st.slots[tube.id].liquid!.gas).toBe("CO2");
    expect(run([[C("Magnesium ribbon"), tube], [C("Hydrochloric acid"), tube]]).note).toMatch(/hydrogen/);
    expect(run([[C("Copper turnings"), tube], [C("Hydrochloric acid"), tube]]).note).toMatch(/doesn't react/);
  });
  it("the gas from acid and carbonate turns limewater milky", () => {
    const r = run([[C("Calcium carbonate"), tube], [C("Hydrochloric acid"), tube], [C("Limewater"), tube2], [tube, tube2]]);
    expect(r.note).toMatch(/milky/);
    expect(r.st.slots[tube2.id].liquid!.milky).toBe(true);
  });
  it("indicators show the pH, and neutralisation brings it to 7 and warms it", () => {
    let r = run([[C("Hydrochloric acid"), tube], [C("Methyl orange"), tube]]);
    expect(r.note).toMatch(/red/);
    r = combine(C("Sodium hydroxide"), tube, r.st);
    const l = r.st.slots[tube.id].liquid!;
    expect(pHOf(l)).toBeCloseTo(7, 0);
    expect(l.T).toBeGreaterThan(25);
    expect(run([[C("Sodium hydroxide"), tube], [C("Phenolphthalein"), tube]]).note).toMatch(/pink/);
  });
  it("food tests: starch with iodine; Benedict's goes brick-red only with glucose, when heated", () => {
    const I = B("Starch solution"), io = C("Iodine solution");
    expect(run([[I, tube], [io, tube]]).note).toMatch(/Blue-black/);
    const bath = B("Water bath"), bunsen = C("Bunsen burner");
    let r = run([[B("Glucose solution"), tube], [B("Benedict's solution"), tube], [tube, bunsen]]);
    expect(r.fx).toBe("heat");
    let st = r.st; for (let k = 0; k < 400; k++) st = tick(st, [tube, bunsen, bath], 0.5);
    expect(colourOf(st.slots[tube.id].liquid!)).toBe("#B91C1C");
    expect(st.log.some((x) => /brick-red/.test(x.text))).toBe(true);
    r = run([[C("Distilled water"), tube2], [B("Benedict's solution"), tube2], [tube2, bunsen]]); st = r.st;
    for (let k = 0; k < 400; k++) st = tick(st, [tube2, bunsen], 0.5);
    expect(colourOf(st.slots[tube2.id].liquid!)).not.toBe("#B91C1C");
  });
  it("heating raises the temperature to 100 °C and no further; a thermometer follows it", () => {
    const beaker = C("Beaker"), bunsen = C("Bunsen burner"), th = C("Thermometer");
    let st = run([[C("Distilled water"), beaker], [beaker, bunsen], [th, beaker]]).st;
    for (let k = 0; k < 2000; k++) st = tick(st, [beaker, bunsen, th], 0.5);
    expect(st.slots[beaker.id].liquid!.T).toBe(100);
    expect(st.slots[beaker.id].boiling).toBe(true);
    expect(st.slots[th.id].reading).toBe("100 °C");
    expect(combine(C("Measuring cylinder"), bunsen, emptyBench()).ok).toBe(false); // never heat a measuring cylinder
  });
  it("a circuit: cell + lamp + ammeter lights the lamp and reads a current; a fuse blows", () => {
    const cell = P("Batteries"), lamp = P("Electric bulb"), amm = P("Ammeter"), items = [cell, lamp, amm];
    let st = run([[lamp, cell], [amm, lamp]]).st;
    st = tick(st, items, 0.1);
    expect(st.slots[lamp.id].glow).toBeGreaterThan(0.5);
    expect(st.slots[amm.id].reading).toMatch(/^0\.\d\d A$/);
    const fuse = P("Fuse"), res = { ...P("Fixed resistor"), spec: { e: "circuit" as const, part: "resistor" as const, value: 0.5 } };
    let s2 = run([[fuse, P("DC power supply")], [res as Item, fuse]]).st;
    s2 = tick(s2, [fuse, P("DC power supply"), res as Item], 0.1);
    expect(s2.slots[fuse.id].blown).toBe(true);
  });
  it("things that don't go together say what each is for", () => {
    const r = combine(C("Hydrochloric acid"), C("Bunsen burner"), emptyBench());
    expect(r.ok).toBe(false);
    expect(r.note).toMatch(/Nothing happens/);
    expect(combine(B("Onion bulb"), B("Compound light microscope"), emptyBench()).note).toMatch(/×100/);
  });
});
