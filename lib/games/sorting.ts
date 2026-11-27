// Speed Sort: things fall one at a time and the learner sorts each into the
// right box — odd or even, prime or not, acute or obtuse, solid or liquid…
// Each set makes its own items. Pure.
import type { Difficulty, Rng } from "@/lib/games/generators";

export type SortItem = { text: string; bucket: number; why: string };
export type SortSet = { id: string; title: string; emoji: string; buckets: string[]; subject: "maths" | "english" | "science"; make: (d: Difficulty, rng: Rng) => SortItem };

const int = (rng: Rng, lo: number, hi: number) => lo + (Math.floor(rng() * (hi - lo + 1)) % (hi - lo + 1));
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
const RANGE: Record<Difficulty, number> = { easy: 20, medium: 100, hard: 400 };
// Words in banks of buckets: [bucket index, word].
const bank = (words: [number, string][], why: (b: number, w: string) => string): ((d: Difficulty, rng: Rng) => SortItem) =>
  (_d, rng) => { const [b, w] = pick(rng, words); return { text: w, bucket: b, why: why(b, w) }; };

export const SORT_SETS: SortSet[] = [
  { id: "odd-even", title: "Odd or Even", emoji: "🎲", buckets: ["Odd", "Even"], subject: "maths",
    make: (d, rng) => { const n = int(rng, 1, RANGE[d]); return { text: String(n), bucket: n % 2, why: `${n} ends in ${n % 10}, so it is ${n % 2 ? "odd" : "even"}.` }; } },
  { id: "prime-not", title: "Prime or Not", emoji: "🔢", buckets: ["Prime", "Not prime"], subject: "maths",
    make: (d, rng) => {
      // About half primes, so it isn't just "say not prime".
      const hi = Math.min(RANGE[d], 200);
      let n = int(rng, 2, hi);
      if (rng() < 0.5) { let g = 0; while (!isPrime(n) && g++ < 400) n = int(rng, 2, hi); }
      const p = isPrime(n);
      const f = (() => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return i; return n; })();
      return { text: String(n), bucket: p ? 0 : 1, why: p ? `${n} only divides by 1 and itself.` : `${n} = ${f} × ${n / f}, so it isn't prime.` };
    } },
  { id: "multiples", title: "Multiples of 3 or 4", emoji: "✖️", buckets: ["Multiple of 3", "Multiple of 4", "Neither"], subject: "maths",
    make: (d, rng) => {
      let n = int(rng, 3, RANGE[d]), g = 0;
      while (n % 12 === 0 && g++ < 50) n = int(rng, 3, RANGE[d]); // never both
      const b = n % 3 === 0 ? 0 : n % 4 === 0 ? 1 : 2;
      return { text: String(n), bucket: b, why: b === 0 ? `${n} = 3 × ${n / 3}.` : b === 1 ? `${n} = 4 × ${n / 4}.` : `${n} isn't in the 3 or the 4 times table.` };
    } },
  { id: "squares", title: "Square or Not", emoji: "🟦", buckets: ["Square number", "Not a square"], subject: "maths",
    make: (d, rng) => {
      const hi = Math.round(Math.sqrt(RANGE[d] * (d === "hard" ? 6 : 3)));
      const sq = rng() < 0.5, k = int(rng, 1, Math.max(4, hi));
      const n = sq ? k * k : k * k + int(rng, 1, 2 * k);
      return { text: String(n), bucket: sq ? 0 : 1, why: sq ? `${k} × ${k} = ${n}.` : `${n} sits between ${k * k} and ${(k + 1) * (k + 1)}.` };
    } },
  { id: "half", title: "Bigger or Smaller than ½", emoji: "🍕", buckets: ["Less than ½", "Equal to ½", "More than ½"], subject: "maths",
    make: (d, rng) => {
      const den = d === "easy" ? pick(rng, [2, 4, 6, 8, 10]) : d === "medium" ? int(rng, 3, 12) : int(rng, 5, 20);
      let num = int(rng, 1, den - 1);
      if (rng() < 0.18 && den % 2 === 0) num = den / 2;
      const b = num * 2 < den ? 0 : num * 2 === den ? 1 : 2;
      return { text: `${num}/${den}`, bucket: b, why: `Half of ${den} is ${den / 2}, and ${num} is ${b === 0 ? "less than" : b === 1 ? "equal to" : "more than"} that.` };
    } },
  { id: "angles", title: "Angle Types", emoji: "📐", buckets: ["Acute", "Right", "Obtuse", "Reflex"], subject: "maths",
    make: (d, rng) => {
      const kind = pick(rng, [0, 0, 1, 2, 2, d === "easy" ? 2 : 3, 3]);
      const a = kind === 0 ? int(rng, 5, 85) : kind === 1 ? 90 : kind === 2 ? int(rng, 95, 175) : int(rng, 185, 355);
      return { text: `${a}°`, bucket: kind, why: kind === 0 ? "Less than 90°: acute." : kind === 1 ? "Exactly 90°: a right angle." : kind === 2 ? "Between 90° and 180°: obtuse." : "More than 180°: reflex." };
    } },
  { id: "word-class", title: "Noun, Verb or Adjective", emoji: "🏷️", buckets: ["Noun", "Verb", "Adjective"], subject: "english",
    make: bank([[0, "table"], [0, "teacher"], [0, "river"], [0, "happiness"], [0, "market"], [0, "mango"], [0, "school"], [0, "village"], [0, "courage"], [0, "bicycle"],
      [1, "jump"], [1, "write"], [1, "swim"], [1, "carry"], [1, "laugh"], [1, "think"], [1, "arrive"], [1, "whisper"], [1, "build"], [1, "chase"],
      [2, "tall"], [2, "brave"], [2, "noisy"], [2, "yellow"], [2, "gentle"], [2, "heavy"], [2, "clever"], [2, "tiny"], [2, "shiny"], [2, "cold"]],
      (b, w) => `“${w}” is ${["a noun (a person, place or thing)", "a verb (an action)", "an adjective (describes a noun)"][b]}.`) },
  { id: "states", title: "Solid, Liquid or Gas", emoji: "💧", buckets: ["Solid", "Liquid", "Gas"], subject: "science",
    make: bank([[0, "ice"], [0, "wood"], [0, "iron nail"], [0, "chalk"], [0, "stone"], [0, "salt"], [0, "glass"], [0, "gold ring"],
      [1, "water"], [1, "milk"], [1, "palm oil"], [1, "vinegar"], [1, "petrol"], [1, "mercury"], [1, "juice"], [1, "ink"],
      [2, "steam"], [2, "oxygen"], [2, "air"], [2, "carbon dioxide"], [2, "helium"], [2, "nitrogen"], [2, "smoke"], [2, "cooking gas"]],
      (b, w) => `${w} is a ${["solid", "liquid", "gas"][b]} at room temperature.`) },
  { id: "living", title: "Living or Non-living", emoji: "🌱", buckets: ["Living", "Non-living"], subject: "science",
    make: bank([[0, "mango tree"], [0, "goat"], [0, "mushroom"], [0, "fish"], [0, "bacteria"], [0, "grass"], [0, "bird"], [0, "ant"],
      [1, "rock"], [1, "car"], [1, "water"], [1, "plastic bottle"], [1, "fire"], [1, "radio"], [1, "sand"], [1, "cloud"]],
      (b, w) => `${w} ${b === 0 ? "is alive: it grows, feeds and reproduces." : "isn't alive: it doesn't grow, feed or reproduce."}`) },
  { id: "metals", title: "Metal or Non-metal", emoji: "🔩", buckets: ["Metal", "Non-metal"], subject: "science",
    make: bank([[0, "iron"], [0, "copper"], [0, "zinc"], [0, "aluminium"], [0, "sodium"], [0, "magnesium"], [0, "gold"], [0, "silver"], [0, "calcium"],
      [1, "carbon"], [1, "sulphur"], [1, "oxygen"], [1, "nitrogen"], [1, "chlorine"], [1, "phosphorus"], [1, "helium"], [1, "iodine"]],
      (b, w) => `${w} is a ${b === 0 ? "metal" : "non-metal"}.`) },
];
export const findSort = (id: string) => SORT_SETS.find((s) => s.id === id);
// The sorting speed needed per item, by difficulty (seconds before it "falls").
export const SORT_PACE: Record<Difficulty, number> = { easy: 9, medium: 6, hard: 4 };
// An endless stream, never the same item twice in a row.
export function sortDrawer(set: SortSet, d: Difficulty, rng: Rng): () => SortItem {
  let last = "";
  return () => { for (let i = 0; i < 8; i++) { const it = set.make(d, rng); if (it.text !== last) { last = it.text; return it; } } return set.make(d, rng); };
}
