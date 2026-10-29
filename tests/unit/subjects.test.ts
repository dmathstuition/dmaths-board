import { describe, it, expect } from "vitest";
import { ACADEMY_SUBJECTS, isAcademySubject, toAcademySubject, normalizeSubjects, contentMatchesSubjects } from "@/lib/subjects";

describe("toAcademySubject", () => {
  it("keeps a canonical subject", () => {
    expect(toAcademySubject("Maths")).toBe("Maths");
    expect(toAcademySubject("A.I and Automation")).toBe("A.I and Automation");
  });
  it("maps legacy names onto the academy set (case-insensitive)", () => {
    expect(toAcademySubject("Algebra")).toBe("Maths");
    expect(toAcademySubject("calculus")).toBe("Maths");
    expect(toAcademySubject("Core Maths Revision")).toBe("Maths");
    expect(toAcademySubject("Further Mathematics")).toBe("Furthermaths");
    expect(toAcademySubject("JavaScript")).toBe("Web development");
    expect(toAcademySubject("Python Practice Challenge")).toBe("Python");
  });
  it("returns null for something that isn't an academy subject", () => {
    expect(toAcademySubject("External Examinations")).toBeNull();
    expect(toAcademySubject("")).toBeNull();
  });
});

describe("normalizeSubjects", () => {
  it("maps + de-duplicates legacy subjects to the canonical list", () => {
    expect(normalizeSubjects(["Algebra", "Calculus", "Python", "Python Practice Challenge"]))
      .toEqual(["Maths", "Python"]);
  });
  it("drops unknowns and survives junk", () => {
    expect(normalizeSubjects(["External Examinations", "", null])).toEqual([]);
    expect(normalizeSubjects(undefined)).toEqual([]);
  });
  it("every result is a real academy subject", () => {
    for (const s of normalizeSubjects(["Algebra", "Geometry", "JavaScript"])) {
      expect(isAcademySubject(s)).toBe(true);
    }
    expect(ACADEMY_SUBJECTS.length).toBe(6);
  });
});

describe("contentMatchesSubjects", () => {
  it("matches content tagged with a legacy name to the learner's academy subject", () => {
    // learner took "Maths"; a material tagged "Algebra" should still show
    expect(contentMatchesSubjects("Algebra", ["Maths"])).toBe(true);
    expect(contentMatchesSubjects("Calculus", ["Maths", "Python"])).toBe(true);
  });
  it("hides content from a subject the learner doesn't take", () => {
    expect(contentMatchesSubjects("Python", ["Maths"])).toBe(false);
  });
  it("is lenient: no subjects set, or an unclassifiable tag, never hides", () => {
    expect(contentMatchesSubjects("Algebra", [])).toBe(true);
    expect(contentMatchesSubjects("External Examinations", ["Maths"])).toBe(true);
  });
});
