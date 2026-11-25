import { describe, it, expect } from "vitest";
import { classResults, homeworkCounts, homeworkFor, type HwEntryRow, type HwInfo } from "@/lib/classResults";
import { reportMessage } from "@/lib/classReport";
import { termProgress, type TermRows } from "@/lib/termProgress";
import { dueSoon, reminderEmail, reminderTargets } from "@/lib/assignments";

const NOW = new Date("2026-11-25T12:00:00Z").getTime();
const hw: HwInfo[] = [
  { id: "h1", title: "Fractions 3", total: 10, dueAt: "2026-11-20T17:00:00Z", forIds: null },   // past due
  { id: "h2", title: "Division", total: 5, dueAt: "2026-11-30T17:00:00Z", forIds: null },       // not due yet
  { id: "h3", title: "Extra for Bola", total: 4, dueAt: "2026-11-20T17:00:00Z", forIds: ["b"] }, // only Bola
];
const e = (assignment_id: string, student_id: string, x: Partial<HwEntryRow>): HwEntryRow => ({ assignment_id, student_id, name: "", score: null, total: null, submitted: false, returned: false, ...x });
const entries = [
  e("h1", "a", { submitted: true, returned: true, score: 8, total: 10, submittedAt: "2026-11-19T10:00:00Z" }),
  e("h2", "a", { submitted: true, submittedAt: "2026-11-24T10:00:00Z" }),             // handed in, not marked yet
  e("h1", "b", { submitted: true, submittedAt: "2026-11-21T10:00:00Z" }),             // late, not marked yet
];

describe("homework in the class results", () => {
  it("counts marked homework, and overdue homework not handed in as 0 — never work still waiting to be marked", () => {
    expect(homeworkCounts(hw[0], entries[0], NOW)).toBe(true);
    expect(homeworkCounts(hw[1], entries[1], NOW)).toBe(false);
    expect(homeworkCounts(hw[0], entries[2], NOW)).toBe(false);
    expect(homeworkCounts(hw[0], null, NOW)).toBe(true);
    expect(homeworkCounts(hw[1], null, NOW)).toBe(false);
    const rows = classResults([{ id: "a", name: "Ada" }, { id: "b", name: "Bola" }, { id: "c", name: "Chidi" }], [], [], [], [], [], hw, entries, NOW);
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect([by.a.hw, by.a.hwMax, by.a.total, by.a.totalMax]).toEqual([8, 10, 8, 10]);
    expect([by.b.hw, by.b.hwMax]).toEqual([0, 4]);   // h1 waiting to be marked; h3 overdue, not handed in
    expect([by.c.hw, by.c.hwMax]).toEqual([0, 10]);  // h1 overdue, not handed in; h3 isn't for Chidi
  });
  it("lists each learner's homework and where it is", () => {
    expect(homeworkFor("a", hw, entries, NOW).map((h) => [h.title, h.state, h.score])).toEqual([["Fractions 3", "marked", 8], ["Division", "handed-in", null]]);
    expect(homeworkFor("b", hw, entries, NOW).map((h) => h.state)).toEqual(["late", "to-do", "missing"]);
  });
  it("puts it in the message to parents", () => {
    const row = classResults([{ id: "a", name: "Ada" }], [], [], [], [], [], hw, entries, NOW)[0];
    const msg = reportMessage({ learner: "Ada", title: "JSS2", teacher: "Mr B", date: "25 Nov", covered: "", homework: "", row, url: "https://x/r", hw: homeworkFor("a", hw, entries, NOW) });
    expect(msg).toContain("Homework:\n• Fractions 3 — 8 / 10\n• Division — handed in");
  });
  it("shows marked homework on the term progress page", () => {
    const rows: TermRows = {
      sessions: [{ id: "s1", at: "2026-11-01" }], guests: [{ id: "a", session_id: "s1", name: "Ada" }], marks: [], quiz: [], exams: [], games: [], titles: { s1: "JSS2" }, asked: [],
      homework: [{ session_id: "s1", student_id: "a", name: "Ada", score: 8, total: 10 }],
    };
    const p = termProgress(rows, "Ada", 91)!;
    expect(p.classes[0].hw).toEqual([8, 10]);
    expect(p.averages.hw).toBe(80);
    expect(p.classes[0].percent).toBe(80);
  });
});

describe("homework reminders", () => {
  it("is due within the next 30 hours", () => {
    expect(dueSoon("2026-11-26T17:00:00Z", NOW)).toBe(true);
    expect(dueSoon("2026-11-28T17:00:00Z", NOW)).toBe(false);
    expect(dueSoon("2026-11-24T17:00:00Z", NOW)).toBe(false);
    expect(dueSoon(null, NOW)).toBe(false);
  });
  it("goes to parents with an email whose child hasn't handed it in", () => {
    const guests = [
      { id: "a", name: "Ada", email: "mum@x.ng" }, { id: "b", name: "Bola", email: "dad@x.ng" },
      { id: "c", name: "Chidi", email: null }, { id: "d", name: "Dayo", email: "d@x.ng", removed: true }, { id: "f", name: "Funmi", email: "f@x.ng" },
    ];
    const ents = [{ student_id: "b", submitted_at: "2026-11-25T09:00:00Z", returned_at: null }];
    expect(reminderTargets({ forIds: null }, guests, ents).map((g) => g.id)).toEqual(["a", "f"]);
    expect(reminderTargets({ forIds: ["f"] }, guests, ents).map((g) => g.id)).toEqual(["f"]);
    const m = reminderEmail({ learner: "Ada", title: "Fractions 3", dueAt: "2026-11-26T17:00:00Z", teacher: "Mr Bello", klass: "JSS2 Maths", link: "https://x/homework?t=1" });
    expect(m.title).toBe('Homework reminder: Ada — "Fractions 3" is due Thursday 26 November at 18:00');
    expect(m.body).toContain("JSS2 Maths with Mr Bello");
  });
});
