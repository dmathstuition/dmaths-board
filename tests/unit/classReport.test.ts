import { describe, it, expect } from "vitest";
import { cleanContact, praise, reportMessage, scoreLine } from "@/lib/classReport";
import { readReport, signReport } from "@/lib/classReportLink";

describe("parent contact", () => {
  it("accepts an email or a WhatsApp number", () => {
    expect(cleanContact(" Mum@Example.com ")).toEqual({ kind: "email", value: "mum@example.com" });
    expect(cleanContact("0803 123 4567")).toEqual({ kind: "whatsapp", value: "+2348031234567" });
    expect(cleanContact("+44 7700 900123")).toEqual({ kind: "whatsapp", value: "+447700900123" });
  });
  it("refuses anything else", () => {
    expect(cleanContact("")).toBeNull();
    expect(cleanContact("mum@")).toBeNull();
    expect(cleanContact("call me maybe")).toBeNull();
    expect(cleanContact("12")).toBeNull();
  });
});

describe("report message", () => {
  const row = { work: 4, workMax: 5, quizCorrect: 3, quizAsked: 4, total: 7, totalMax: 9, percent: 78 };
  it("says what was covered, the marks and the link", () => {
    const m = reportMessage({ learner: "Ada", title: "Fractions", teacher: "Mr Bello", date: "20 Oct 2026", covered: "Adding fractions", homework: "Page 12", row, url: "https://x/r" });
    expect(m).toContain("Class report for Ada");
    expect(m).toContain("What we covered: Adding fractions");
    expect(m).toContain("Class work: 4 / 5");
    expect(m).toContain("Live quiz: 3 / 4 correct");
    expect(m).toContain("Total: 7 / 9 (78%) — Good work");
    expect(m).toContain("Homework: Page 12");
    expect(m).toContain("Full report: https://x/r");
  });
  it("copes with a class that had no marked work", () => {
    expect(scoreLine({ total: 0, totalMax: 0, percent: null })).toBe("No marked work in this class");
    expect(praise(null)).toMatch(/Thank you/);
    expect(praise(90)).toMatch(/Excellent/);
    expect(praise(10)).toMatch(/more practice/);
  });
});

describe("report link", () => {
  it("reads back what was signed", () => {
    const t = signReport({ s: "sess-1", g: "learner-1", c: "Angles in a triangle", h: "" });
    expect(readReport(t)).toEqual({ s: "sess-1", g: "learner-1", c: "Angles in a triangle", h: "" });
  });
  it("refuses a link that was changed", () => {
    const t = signReport({ s: "sess-1", g: "learner-1", c: "x", h: "" });
    const [body, mac] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ s: "sess-1", g: "someone-else", c: "x", h: "" })).toString("base64url");
    expect(readReport(`${forged}.${mac}`)).toBeNull();
    expect(readReport(`${body}.AAAA`)).toBeNull();
    expect(readReport("rubbish")).toBeNull();
  });
});
