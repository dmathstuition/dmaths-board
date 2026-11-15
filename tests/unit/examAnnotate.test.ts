import { describe, expect, it } from "vitest";
import { cleanPageNote, countCrosses, countTicks, crossStrokes, noteBlank, noteKey, notesOf, tickStroke, undoInk, withNote } from "@/lib/examAnnotate";
import { cleanPageMarks, type ExamQ } from "@/lib/exams";

const pen = { id: "tp-1", by: "t", color: "#DC2626", w: 5, pts: [0.1, 0.1, 0.2, 0.2] };

describe("marking on a learner's page", () => {
  it("ticks and crosses are stamped where the teacher taps, and counted", () => {
    const ink = [tickStroke(0.3, 0.2, 1.41), tickStroke(0.5, 0.2, 1.41), ...crossStrokes(0.7, 0.2, 1.41), pen];
    expect(countTicks(ink)).toBe(2);
    expect(countCrosses(ink)).toBe(1);
    for (const s of ink) for (const v of s.pts) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); }
    // A tick is as wide as it is tall on the page (not stretched on a tall page).
    const t = tickStroke(0.5, 0.5, 2).pts, w = t[4] - t[0], h = (t[3] - t[5]) * 2;
    expect(w / h).toBeGreaterThan(0.8); expect(w / h).toBeLessThan(1.6);
  });

  it("undo takes off the last thing — both strokes of a cross together", () => {
    const tick = tickStroke(0.3, 0.2, 1.4), cross = crossStrokes(0.7, 0.2, 1.4);
    expect(undoInk([tick, ...cross])).toEqual([tick]);
    expect(undoInk([tick, ...cross, pen])).toEqual([tick, ...cross]);
    expect(undoInk([])).toEqual([]);
  });

  it("what arrives is tidied, and survives being saved with the marks", () => {
    const note = cleanPageNote({ ink: [tickStroke(0.3, 0.2, 1.4), pen, { junk: true }], note: "  Show your working.\u0000  " + "x".repeat(400) });
    expect(note.ink).toHaveLength(2);
    expect(countTicks(note.ink)).toBe(1); // the tick is still a tick
    expect(note.note).toHaveLength(300);
    expect(noteBlank(cleanPageNote({ ink: [], note: "  " }))).toBe(true);
    // Kept beside the marks: the marks don't see it, and it doesn't see the marks.
    const qs = [{ q: "Page 1", kind: "page", options: [], answer: "", marks: 3, img: "x" }] as ExamQ[];
    const saved = { ...withNote({}, 0, note), 0: 2 };
    expect(cleanPageMarks(qs, saved)).toEqual({ 0: 2 });
    expect(Object.keys(notesOf(saved))).toEqual([noteKey(0)]);
    expect(notesOf(saved)[noteKey(0)].note).toBe(note.note);
    // Nothing on the page: nothing kept.
    expect(withNote(notesOf(saved), 0, { ink: [], note: "" })).toEqual({});
    expect(notesOf(null)).toEqual({});
  });
});
