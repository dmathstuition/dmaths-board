import { describe, it, expect } from "vitest";
import { cleanBoard, cleanStroke, itemCount, wrapText, fontFor, isPaper } from "@/lib/whiteboard";
import { cleanWidgets, startTimer, startStopwatch, timerShows, pauseTimer, resumeTimer, timerRunning, rollDice, pickName, fmtClock, protractorAngle, DEFAULT_WIDGETS } from "@/lib/boardTools";
import { seeded } from "@/lib/games/mistakes";

describe("whiteboard items", () => {
  it("keeps shapes to two corners and text to one point", () => {
    expect(cleanStroke({ kind: "rect", color: "#123456", w: 4, pts: [0.1, 0.1, 0.5, 0.5, 0.9, 0.9], fill: true })).toMatchObject({ kind: "rect", pts: [0.1, 0.1, 0.5, 0.5], fill: true });
    expect(cleanStroke({ kind: "arrow", pts: [0.1, 0.1] })).toBeNull();
    expect(cleanStroke({ kind: "text", pts: [0.2, 0.3, 0.4, 0.5], text: "  x = 5  " })).toMatchObject({ kind: "text", pts: [0.2, 0.3], text: "  x = 5  " });
    expect(cleanStroke({ kind: "note", pts: [0.2, 0.3], text: "   " })).toBeNull();
    expect(cleanStroke({ kind: "hack", pts: [0.1, 0.2] })!.kind).toBeUndefined(); // unknown → plain pen
    expect(cleanStroke({ kind: "text", pts: [0, 0], text: "a".repeat(900) })!.text!.length).toBe(500);
  });
  it("opens old one-page boards and new multi-page ones", () => {
    const old = cleanBoard([{ id: "a", color: "#000000", w: 3, pts: [0.1, 0.1, 0.2, 0.2] }]);
    expect(old.pages.length).toBe(1);
    expect(old.paper).toEqual(["plain"]);
    const b = cleanBoard({ pages: [[], [{ kind: "line", pts: [0, 0, 1, 1] }]], paper: ["chalk", "nope"] });
    expect(b.paper).toEqual(["chalk", "plain"]);
    expect(itemCount(b)).toBe(1);
    expect(cleanBoard(null).pages).toEqual([[]]);
    expect(cleanBoard({ pages: Array.from({ length: 80 }, () => []) }).pages.length).toBe(50);
    expect(isPaper("dots")).toBe(true);
  });
  it("wraps text to a width", () => {
    const measure = (s: string) => s.length * 10;
    expect(wrapText("the quick brown fox", 100, measure)).toEqual(["the quick", "brown fox"]);
    expect(wrapText("a\nb", 100, measure)).toEqual(["a", "b"]);
    expect(fontFor(24)).toBeGreaterThan(fontFor(2));
  });
});

describe("class tools", () => {
  it("counts down, pauses and resumes", () => {
    const t0 = 1_000_000;
    let t = startTimer(90, t0);
    expect(timerShows(t, t0 + 30_000)).toBe(60);
    expect(timerRunning(t)).toBe(true);
    t = pauseTimer(t, t0 + 30_000);
    expect(timerShows(t, t0 + 90_000)).toBe(60);
    expect(timerRunning(t)).toBe(false);
    t = resumeTimer(t, t0 + 90_000);
    expect(timerShows(t, t0 + 150_000)).toBe(0);
    expect(fmtClock(605)).toBe("10:05");
  });
  it("stopwatch counts up", () => {
    let t = startStopwatch(0);
    expect(timerShows(t, 42_500)).toBe(42);
    t = pauseTimer(t, 42_500);
    t = resumeTimer(t, 100_000);
    expect(timerShows(t, 110_000)).toBe(52);
  });
  it("rolls dice and picks names fairly", () => {
    const r = rollDice(2, seeded(3));
    expect(r.length).toBe(2);
    expect(r.every((d) => d >= 1 && d <= 6)).toBe(true);
    expect(rollDice(9).length).toBe(3);
    const names = ["Ada", "Bola", "Chi"];
    for (let i = 0; i < 20; i++) expect(pickName(names, "Ada", seeded(i))).not.toBe("Ada");
    expect(pickName(["Ada"], "Ada")).toBe("Ada");
    expect(pickName([], null)).toBeNull();
  });
  it("cleans widget state from the network", () => {
    const w = cleanWidgets({ shade: { on: true, pct: 400 }, ruler: { on: true, x: 2, y: -1, rot: 370 }, dice: { values: [9, 0], at: 1 }, picker: { name: "Ada" } });
    expect(w.shade).toEqual({ on: true, pct: 95 });
    expect(w.ruler).toEqual({ on: true, x: 1, y: 0, rot: 10 });
    expect(w.dice!.values).toEqual([6, 1]);
    expect(cleanWidgets(undefined)).toEqual(DEFAULT_WIDGETS);
  });
  it("reads angles on the protractor", () => {
    expect(protractorAngle(0, 0, 10, 0, 0)).toBe(0);
    expect(protractorAngle(0, 0, 0, -10, 0)).toBe(90);
    expect(protractorAngle(0, 0, -10, 0, 0)).toBe(180);
    expect(protractorAngle(0, 0, 10, -10, 0)).toBe(45);
  });
});

describe("maths tools state", () => {
  it("cleans the graph, calculator and number line", async () => {
    const { cleanWidgets } = await import("@/lib/boardTools");
    const w = cleanWidgets({
      graph: { on: true, exprs: ["sin(x)", "x".repeat(200)], xMin: 5, xMax: -5, yMin: -2, yMax: 2 },
      calc: { on: true, expr: "2+2", result: "4", deg: false },
      numberLine: { on: true, min: 0, max: 1000, step: 1, marks: [5, 5000, "x"] },
    });
    expect(w.graph.exprs).toEqual(["sin(x)", "x".repeat(120), "", "", "", ""]); // six rows, each kept short
    expect([w.graph.xMin, w.graph.xMax]).toEqual([-10, 10]); // a back-to-front range resets
    expect(w.graph.yMax).toBe(2);
    expect(w.calc).toMatchObject({ on: true, expr: "2+2", deg: false });
    expect(w.numberLine.step).toBe(10); // never more than 100 ticks
    expect(w.numberLine.marks).toEqual([5]);
  });
});

describe("board size", () => {
  it("keeps up to 50 pages", async () => {
    const { cleanBoard, BOARD_MAX_PAGES } = await import("@/lib/whiteboard");
    expect(BOARD_MAX_PAGES).toBe(50);
    const pages = (n: number) => ({ v: 2, pages: Array.from({ length: n }, () => []), paper: [], bg: [] });
    expect(cleanBoard(pages(50)).pages).toHaveLength(50);
    expect(cleanBoard(pages(60)).pages).toHaveLength(50);
  });
});

