// Logic behind the extra maths and English class tools on the whiteboard —
// pure, so it is tested without a browser.

// ── Clock ──
const HOUR_WORDS = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const MIN_WORDS: Record<number, string> = { 5: "five", 10: "ten", 15: "quarter", 20: "twenty", 25: "twenty-five", 30: "half" };
export const normTime = (h: number, m: number) => {
  const total = ((Math.round(h) * 60 + Math.round(m)) % 720 + 720) % 720;
  return { h: Math.floor(total / 60), m: total % 60 };
};
// "quarter past three", "twenty to four", "three o'clock", or "3:07" style words for odd minutes.
export function clockWords(h: number, m: number): string {
  const t = normTime(h, m);
  const hour = HOUR_WORDS[t.h], next = HOUR_WORDS[(t.h + 1) % 12];
  if (t.m === 0) return `${hour} o'clock`;
  if (t.m <= 30) return `${MIN_WORDS[t.m] ?? `${numberToWords(t.m)} minute${t.m === 1 ? "" : "s"}`} past ${hour}`;
  const to = 60 - t.m;
  return `${MIN_WORDS[to] ?? `${numberToWords(to)} minute${to === 1 ? "" : "s"}`} to ${next}`;
}
export const clockDigital = (h: number, m: number) => { const t = normTime(h, m); return `${t.h === 0 ? 12 : t.h}:${String(t.m).padStart(2, "0")}`; };

// ── Numbers in words (British style: "one hundred and five") ──
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under1000(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : "");
  if (!h) return rest;
  return `${ONES[h]} hundred${r ? ` and ${rest}` : ""}`;
}
export function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  if (n >= 1e9) return String(n);
  const parts: string[] = [];
  const m = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), r = n % 1000;
  if (m) parts.push(`${under1000(m)} million`);
  if (th) parts.push(`${under1000(th)} thousand`);
  if (r) parts.push((m || th) && r < 100 ? `and ${under1000(r)}` : under1000(r));
  return parts.join(" ").replace(/ and and /g, " and ");
}

// ── Place value: digits for the columns millions → ones ──
export const PLACE_COLUMNS = ["Millions", "Hundred thousands", "Ten thousands", "Thousands", "Hundreds", "Tens", "Ones"] as const;
export const PLACE_SHORT = ["M", "HTh", "TTh", "Th", "H", "T", "O"] as const;
export const placeValue = (digits: number[]) => digits.reduce((n, d) => n * 10 + d, 0);

// ── Fractions ──
export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export function simplify(n: number, d: number): [number, number] {
  if (!d) return [n, d];
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}
// What the shaded pieces of a fraction wall add up to, simplified.
export function wallTotal(bars: { d: number; on: number[] }[]): [number, number] {
  let num = 0, den = 1;
  for (const b of bars) {
    if (!b.on.length) continue;
    num = num * b.d + b.on.length * den; den = den * b.d;
    [num, den] = simplify(num, den);
  }
  return [num, den];
}

// ── Hundred square ──
export const multiplesOf = (k: number, max = 100) => (k >= 1 ? Array.from({ length: Math.floor(max / k) }, (_, i) => (i + 1) * k) : []);

// ── Sentence builder ──
export const sentenceWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).slice(0, 20);
// A shuffled order of 0..n-1 that isn't the right order (when that's possible).
export function shuffleOrder(n: number, rng: () => number = Math.random): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let tries = 0; tries < 6; tries++) {
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (n < 2 || a.some((v, i) => v !== i)) break;
  }
  return a;
}
// Built correctly when the chosen words read the same as the sentence (repeated words are interchangeable).
export const sentenceRight = (words: string[], built: number[]) =>
  built.length === words.length && built.every((idx, i) => words[idx]?.toLowerCase() === words[i].toLowerCase());

// ── Spell it ──
export const cleanSpellWord = (w: string) => w.toUpperCase().replace(/[^A-Z' -]/g, "").slice(0, 24);
// Letters shown: guessed ones, plus spaces/hyphens/apostrophes, which are always shown.
export const spellShown = (word: string, guessed: string[]) => [...word].map((ch) => (/[A-Z]/.test(ch) ? (guessed.includes(ch) ? ch : "") : ch));
export const spellWrong = (word: string, guessed: string[]) => guessed.filter((g) => !word.includes(g));
export const spellDone = (word: string, guessed: string[]) => !!word && spellShown(word, guessed).every((c) => c !== "");
