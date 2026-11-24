import { describe, it, expect } from "vitest";
import {
  canWork, cleanAnswer, cleanItems, cleanMarks, dueWords, duePreset, isBlank, isNoteKey, itemMark, itemsFromAi, learnerItems, reminderText, scoreOf, statusOf,
} from "@/lib/assignments";

const PIC = "https://x.supabase.co/storage/v1/object/public/materials/slides/s1/p-01.jpg";
const items = cleanItems([
  { kind: "choice", q: "2 + 2?", options: ["3", "4", "5"], answer: 1, why: "Count on" },
  { kind: "typed", q: "Half of 9?", answer: "4.5 | 9/2", marks: 2 },
  { kind: "written", q: "Explain why", answer: "Because…", marks: 3 },
  { kind: "board", q: "", marks: 4 },
  { kind: "page", q: "Page 1", img: PIC, marks: 5 },
  { kind: "upload", q: "", marks: 5 },
]);

describe("assignment items", () => {
  it("keeps every kind, with sensible defaults, and drops broken ones", () => {
    expect(items.map((x) => x.kind)).toEqual(["choice", "typed", "written", "board", "page", "upload"]);
    expect(items[3].q).toMatch(/working/); expect(items[5].q).toMatch(/Upload/);
    expect(cleanItems([
      { kind: "choice", q: "x", options: ["only one"], answer: 0 },       // one choice
      { kind: "typed", q: "x", answer: "" },                             // no answer
      { kind: "page", q: "p" },                                          // no page picture
      { kind: "page", q: "p", img: "https://evil.test/a.jpg" },          // not one of ours
      { kind: "nonsense", q: "x" },
      { kind: "written", q: "ok", marks: 99 },
    ])).toEqual([{ kind: "written", q: "ok", marks: 20, options: [], answer: "" }]);
  });
  it("learners never get the answers or solutions until it's marked (and the teacher allows it)", () => {
    const hidden = learnerItems(items, false);
    expect(hidden[0].answer).toBe(-1); expect(hidden[1].answer).toBe(""); expect(hidden[2].answer).toBe("");
    expect(hidden.some((x) => "why" in x)).toBe(false);
    expect(learnerItems(items, true)[0]).toMatchObject({ answer: 1, why: "Count on" });
  });
});

describe("answers and marks", () => {
  it("cleans each kind of answer", () => {
    expect(cleanAnswer(items[0], 1)).toBe(1); expect(cleanAnswer(items[0], 7)).toBeNull();
    expect(cleanAnswer(items[1], "  4.5  ")).toBe("4.5");
    expect(cleanAnswer(items[3], { ink: [{ id: "a", by: "g", color: "#000", w: 4, pts: [0.1, 0.1, 0.2, 0.2] }], text: "x" })).toMatchObject({ text: "x" });
    expect(cleanAnswer(items[5], { imgs: [PIC, PIC, "https://evil.test/x.jpg"] })).toEqual({ imgs: [PIC] });
    expect(isBlank(items[3], { ink: [], text: " " })).toBe(true);
    expect(isBlank(items[5], { imgs: [PIC] })).toBe(false);
  });
  it("marks choices and short answers by itself, waits for the teacher on the rest, and lets the teacher change any mark", () => {
    const answers = { 0: 1, 1: "9/2", 2: "Because it is", 3: { ink: [{ id: "a", by: "g", color: "#000", w: 4, pts: [0.1, 0.1, 0.2, 0.2] }], text: "" }, 4: { ink: [], text: "" } };
    let s = scoreOf(items, answers);
    expect(s).toEqual({ score: 3, total: 20, toMark: [2, 3] }); // page 4 blank (0), upload 5 blank (0)
    s = scoreOf(items, answers, cleanMarks(items, { 2: 2, 3: 9, 1: 0, x: 3 }));
    expect(s).toEqual({ score: 1 + 0 + 2 + 4, total: 20, toMark: [] });
    expect(itemMark(items[0], 0)).toBe(0);
  });
  it("knows which pages can be marked on", () => {
    expect(isNoteKey("3", items)).toBe(true); expect(isNoteKey("4", items)).toBe(true);
    expect(isNoteKey("5", items)).toBe(false); expect(isNoteKey("5.2", items)).toBe(true);
    expect(isNoteKey("1", items)).toBe(false); expect(isNoteKey("2", items)).toBe(false); expect(isNoteKey("9", items)).toBe(false);
  });
});

describe("where a learner is", () => {
  const due = { dueAt: "2026-11-20T18:00:00Z" };
  it("not started, working, handed in (late), sent back, returned", () => {
    expect(statusOf(due, null)).toBe("not-started");
    expect(statusOf(due, { submittedAt: null, returnedAt: null, sentBack: false })).toBe("started");
    expect(statusOf(due, { submittedAt: "2026-11-20T17:00:00Z", returnedAt: null, sentBack: false })).toBe("handed-in");
    expect(statusOf(due, { submittedAt: "2026-11-21T09:00:00Z", returnedAt: null, sentBack: false })).toBe("late");
    expect(statusOf(due, { submittedAt: null, returnedAt: null, sentBack: true })).toBe("sent-back");
    expect(statusOf(due, { submittedAt: "x", returnedAt: "y", sentBack: false })).toBe("returned");
  });
  it("can work until handed in, marked, closed — or the due date, unless late work is allowed", () => {
    const after = new Date("2026-11-22T00:00:00Z").getTime();
    expect(canWork({ status: "open", dueAt: due.dueAt, lateOk: true }, null, after).ok).toBe(true);
    expect(canWork({ status: "open", dueAt: due.dueAt, lateOk: false }, null, after)).toEqual({ ok: false, why: "The due date has passed." });
    expect(canWork({ status: "closed", dueAt: null, lateOk: true }, null).ok).toBe(false);
    expect(canWork({ status: "open", dueAt: null, lateOk: true }, { submittedAt: "x", returnedAt: null }).ok).toBe(false);
  });
  it("says when it's due in plain words", () => {
    const now = new Date(2026, 10, 24, 10, 0).getTime();
    expect(dueWords(null, now)).toBe("No due date");
    expect(dueWords(new Date(2026, 10, 24, 18, 0).toISOString(), now)).toBe("Due today");
    expect(dueWords(new Date(2026, 10, 25, 18, 0).toISOString(), now)).toBe("Due tomorrow");
    expect(dueWords(new Date(2026, 10, 27, 18, 0).toISOString(), now)).toBe("Due in 3 days");
    expect(dueWords(new Date(2026, 10, 22, 9, 0).toISOString(), now)).toBe("Overdue by 2 days");
    expect(dueWords(new Date(2026, 10, 24, 10, 30).toISOString(), now)).toBe("Due in 30 min");
    const p = duePreset("tomorrow", new Date(2026, 10, 24, 10, 0));
    expect([p.getDate(), p.getHours()]).toEqual([25, 18]);
  });
});

describe("helpers", () => {
  it("turns A.I. questions into short or written answers", () => {
    const ai = [{ q: "Solve 3x = 12", a: "x = 4 | 4", w: "Divide by 3" }];
    expect(itemsFromAi(ai, "typed")[0]).toMatchObject({ kind: "typed", answer: "x = 4 | 4", why: "Divide by 3" });
    expect(itemsFromAi(ai, "written", 2)[0]).toMatchObject({ kind: "written", marks: 2, answer: "x = 4 | 4 — Divide by 3" });
  });
  it("writes a WhatsApp reminder with each learner's link", () => {
    const t = reminderText("Fractions 3", null, [{ name: "Ada", link: "https://x/homework?t=1" }]);
    expect(t).toContain('"Fractions 3"'); expect(t).toContain("• Ada: https://x/homework?t=1");
  });
});
