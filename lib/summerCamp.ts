// ── NOVELIA ACADEMY SUMMER CAMP — single source of truth ─────────────────────
// Pricing and metadata shared between the /summer-camp landing page and the
// /apply enrolment form. Change numbers HERE only — both places read from this.
//
// USD is the headline (charm .99). NGN is what Paystack actually charges
// (rate ₦1,500/$1, charm-rounded down to end in ,999).

export const SUMMER_CAMP = {
  season: "summer-2026",
  title: "Novelia Online Summer Camp",
  // ┌──────────────────────────────────────────────────────────────────┐
  // │  ✏️  EDIT THE CAMP DATES HERE  (format: yyyy-mm-dd)               │
  // │  These two lines are the ONLY place the camp dates live — change  │
  // │  them and every date shown on the site updates automatically.     │
  // │  They are PLACEHOLDERS for now; set the real dates once confirmed.│
  // │  To change later: open this file on GitHub → pencil (edit) icon → │
  // │  edit the two lines below → "Commit changes". The site redeploys  │
  // │  on its own in about a minute. No coding or developer needed.     │
  // └──────────────────────────────────────────────────────────────────┘
  startDate: "2026-08-03", // ← camp START date
  endDate: "2026-09-01", //   ← camp END date
  ngnPerUsd: 1500,
} as const;

// ── In-person (physical) camp — Asaba ────────────────────────────────
// Held at a real venue, four sessions a week. Prices are flat naira (no USD,
// no promo discount). Learners pick one of the three physical tiers below.
export const PHYSICAL_CAMP = {
  venue: "Infant Jesus Academy",
  address: "Old Anwai Road, Asaba",
  frequency: "4 sessions every week",
} as const;

// ── Date display helpers ─────────────────────────────────────────────
// The human-readable date labels are DERIVED from startDate/endDate above,
// so editing just those two lines updates the hero, badge, packages note
// and refund policy everywhere at once. Built at midnight to avoid any
// timezone drift, and the year is shown once when both dates share it.
const campStart = () => new Date(`${SUMMER_CAMP.startDate}T00:00:00`);
const campEnd = () => new Date(`${SUMMER_CAMP.endDate}T00:00:00`);

// e.g. "1 July – 31 August 2026"  (or "… 2026 – … 2027" across a year)
export const campDateRange = () => {
  const s = campStart();
  const e = campEnd();
  const sameYear = s.getFullYear() === e.getFullYear();
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const start = sameYear ? day(s) : `${day(s)} ${s.getFullYear()}`;
  return `${start} – ${day(e)} ${e.getFullYear()}`;
};

// e.g. "Jul 1 – Aug 31"  (compact, for the small hero badge)
export const campShortDates = () => {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(campStart())} – ${fmt(campEnd())}`;
};

// e.g. "1 July 2026"  (single date — used by the refund-deadline copy)
export const campStartLabel = () =>
  campStart().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// ── Promotional discount ─────────────────────────────────────────────
// Percentage off every package. The `usd`/`ngn` on each tier are the LIST
// prices; the discounted figures below are what we display AND what Paystack
// actually charges / the server enforces. Set to 0 to end the promotion —
// the struck-through "was" prices then disappear automatically.
export const DISCOUNT_PCT = 20;

const DISCOUNT_FACTOR = (100 - DISCOUNT_PCT) / 100;

// 20% off the charm list prices lands cleanly (e.g. ₦104,999 → ₦83,999).
// Tiers flagged `discountable: false` (the in-person Asaba tiers) are flat-priced
// and the promo never touches them.
export const discountedUsd = (tier: { usd: number; discountable?: boolean }) =>
  tier.discountable === false ? tier.usd : Math.round(tier.usd * DISCOUNT_FACTOR * 100) / 100;
export const discountedNgn = (tier: { ngn: number; discountable?: boolean }) =>
  tier.discountable === false ? tier.ngn : Math.round(tier.ngn * DISCOUNT_FACTOR);

// ── Part payment ─────────────────────────────────────────────────────
// Families may pay a deposit now and the balance later. The deposit is half
// the discounted price; both the displayed amount and the server's minimum
// accepted amount derive from here, so they can never diverge.
export const DEPOSIT_FRACTION = 0.5;
export const depositNgn = (tier: { ngn: number; discountable?: boolean }) =>
  Math.round(discountedNgn(tier) * DEPOSIT_FRACTION);
export const balanceNgn = (tier: { ngn: number; discountable?: boolean }) =>
  discountedNgn(tier) - depositNgn(tier);

export type CampTrack = "maths" | "coding" | "both";

// ── Camp curriculum (the subjects/modules inside each plan) ──────────
// Shown on the camp page and auto-filled as the "subjects" of a camp
// enrolment, matched to the chosen package's track.
const MATHS_MODULES = ["Mathematics Foundation Challenge", "Foundation Mathematics"];
const CODING_MODULES = ["Coding", "Game Development", "Artificial Intelligence", "Web Development", "Python"];

export const CAMP_CURRICULUM: Record<CampTrack, string[]> = {
  maths: MATHS_MODULES,
  coding: CODING_MODULES,
  both: [...MATHS_MODULES, ...CODING_MODULES],
};

export const tierModules = (tier: { track: CampTrack }) => CAMP_CURRICULUM[tier.track];

export interface CampTier {
  id: string;
  name: string;
  usd: number;   // headline price, e.g. 49.99 (0 for in-person naira-only tiers)
  ngn: number;   // amount charged in naira
  track: CampTrack;
  blurb: string;
  highlight?: boolean;    // visually feature this card
  physical?: boolean;     // in-person at Asaba (vs online)
  discountable?: boolean; // false = flat price, promo never applies
}

export const SUMMER_CAMP_TIERS: CampTier[] = [
  {
    id: "gen-maths",
    name: "General Mathematics Foundation",
    usd: 19.99,
    ngn: 29999,
    track: "maths",
    blurb: "Group classes building a rock-solid mathematics foundation across the summer.",
  },
  {
    id: "pers-maths",
    name: "Personalized Mathematics Foundational",
    usd: 49.99,
    ngn: 74999,
    track: "maths",
    blurb: "One-focus tutoring tailored to your child's level, pace and weak spots.",
  },
  {
    id: "gen-coding",
    name: "General Coding",
    usd: 19.99,
    ngn: 29999,
    track: "coding",
    blurb: "Group coding classes — Python, web and game-development fundamentals.",
  },
  {
    id: "pers-coding",
    name: "Personalized Coding",
    usd: 69.99,
    ngn: 104999,
    track: "coding",
    blurb: "Tailored coding path — Python, AI, web & game dev at your child's pace.",
  },
  {
    id: "combo",
    name: "General Maths & Coding",
    usd: 49.99,
    ngn: 74999,
    track: "both",
    blurb: "Both tracks in one — maths foundation plus hands-on coding. Best value.",
    highlight: true,
  },
  {
    id: "individual",
    name: "Individual Maths & Coding (1-on-1)",
    usd: 119.99,
    ngn: 179999,
    track: "both",
    blurb: "Fully private 1-on-1 coaching across maths and coding — maximum attention.",
  },
];

// ── In-person (Asaba) tiers — flat naira, no promo, four sessions a week ──
export const PHYSICAL_TIERS: CampTier[] = [
  {
    id: "phys-maths",
    name: "Maths Class",
    usd: 0,
    ngn: 40000,
    track: "maths",
    blurb: "In-person maths at our Asaba centre — four focused sessions every week.",
    physical: true,
    discountable: false,
  },
  {
    id: "phys-coding",
    name: "Coding Class",
    usd: 0,
    ngn: 50000,
    track: "coding",
    blurb: "In-person coding at our Asaba centre — Python, web & game dev, four sessions a week.",
    physical: true,
    discountable: false,
  },
  {
    id: "phys-both",
    name: "Maths + Coding",
    usd: 0,
    ngn: 60000,
    track: "both",
    blurb: "Both classes in-person at Asaba — the complete package, best value.",
    physical: true,
    discountable: false,
    highlight: true,
  },
];

export function findTier(id: string | null | undefined): CampTier | undefined {
  if (!id) return undefined;
  return [...SUMMER_CAMP_TIERS, ...PHYSICAL_TIERS].find((t) => t.id === id);
}

// Display helpers
export const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
export const fmtNgn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
