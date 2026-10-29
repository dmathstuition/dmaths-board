// The academy's subjects — the single canonical list a learner can be enrolled
// in. Older, more granular subject names (Algebra, JavaScript…) map onto these
// six, so a learner's subjects read consistently everywhere and content tagged
// with a legacy name still matches. Pure so it's unit-testable.

export const ACADEMY_SUBJECTS = [
  "Maths",
  "Furthermaths",
  "Physics",
  "Python",
  "Web development",
  "A.I and Automation",
] as const;

export type AcademySubject = (typeof ACADEMY_SUBJECTS)[number];

export function isAcademySubject(s: string): s is AcademySubject {
  return (ACADEMY_SUBJECTS as readonly string[]).includes(s);
}

// Legacy / granular subject names → the academy subject they belong to. Keyed by
// lower-case so matching is case-insensitive.
const LEGACY_SUBJECT_MAP: Record<string, AcademySubject> = {
  "algebra": "Maths", "calculus": "Maths", "statistics": "Maths", "geometry": "Maths",
  "trigonometry": "Maths", "probability": "Maths", "core maths revision": "Maths",
  "core maths": "Maths", "mathematics": "Maths", "math": "Maths",
  "further mathematics": "Furthermaths", "further maths": "Furthermaths",
  "javascript": "Web development", "web dev": "Web development", "web": "Web development",
  "html": "Web development", "css": "Web development",
  "python practice challenge": "Python",
  "ai": "A.I and Automation", "a.i": "A.I and Automation", "a.i.": "A.I and Automation",
  "artificial intelligence": "A.I and Automation", "automation": "A.I and Automation",
};

// Map any subject (canonical or legacy) to its academy subject, or null when it
// doesn't belong to one (e.g. "External Examinations").
export function toAcademySubject(s: string): AcademySubject | null {
  const v = String(s ?? "").trim();
  if (!v) return null;
  if (isAcademySubject(v)) return v;
  return LEGACY_SUBJECT_MAP[v.toLowerCase()] ?? null;
}

// A learner's enrolled subjects as the canonical six — trimmed, mapped from any
// legacy names, de-duplicated, order preserved. Anything that doesn't belong to
// an academy subject simply drops out.
export function normalizeSubjects(list: unknown): AcademySubject[] {
  const seen = new Set<string>();
  const out: AcademySubject[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const c = toAcademySubject(String(raw ?? ""));
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

// Does a piece of content (tagged with any subject name) belong to one of the
// learner's academy subjects? Used to filter materials, curricula and notices so
// they keep matching after subjects are canonicalised. Lenient: with no subjects
// set, or a content subject we can't classify, nothing is hidden.
export function contentMatchesSubjects(contentSubject: string, learnerSubjects: unknown): boolean {
  const academy = normalizeSubjects(learnerSubjects);
  if (!academy.length) return true;
  const c = toAcademySubject(contentSubject);
  if (!c) return true; // unknown tag → don't hide it
  return academy.includes(c);
}
