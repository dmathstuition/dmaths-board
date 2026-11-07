// KS2 SATs practice for Exam mode. Pure.
//   • satsArithmetic: a paper like the national Paper 1 (arithmetic): 36
//     questions, 40 marks (long multiplication and long division are worth 2),
//     30 minutes, no calculator — new numbers every time.
//   • Spelling tests like Paper 2 (spelling): 20 sentences, the word read out,
//     learners write it in the gap. Two ready-made lists from the Year 5/6
//     statutory word list, or the teacher's own.
import type { ExamQ } from "@/lib/exams";

type Rng = () => number;
type Made = { q: string; answer: string; marks?: number };
const R = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

// 12345 → "12,345" (the papers write thousands with commas).
export const commas = (n: number) => { const [i, d] = String(n).split("."); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? `.${d}` : ""); };
// A number held in hundredths (or thousandths), written plainly: 1250 → "12.5".
const dec = (n: number, places = 2) => { const s = (n / 10 ** places).toFixed(places).replace(/\.?0+$/, ""); return s === "-0" ? "0" : s; };
// A fraction answer: simplest form, a mixed number when it's more than 1 (any equal value is marked right).
function frac(n: number, d: number): string {
  const g = gcd(n, d); n /= g; d /= g;
  if (d === 1) return String(n);
  if (n > d) return `${Math.floor(n / d)} ${n % d}/${d} | ${n}/${d}`;
  return `${n}/${d}`;
}
const f = (n: number, d: number) => `${n}/${d}`;

// Each kind of question on the paper, roughly easiest first.
const KINDS: ((r: Rng) => Made)[] = [
  (r) => { const a = R(r, 1200, 8999), b = R(r, 300, 999); return { q: `${commas(a)} + ${b} =`, answer: String(a + b) }; },
  (r) => { const a = R(r, 500, 999), b = R(r, 100, a - 50); return { q: `${a} − ${b} =`, answer: String(a - b) }; },
  (r) => { const a = R(r, 2, 9) * 10, b = R(r, 2, 9) * pick(r, [10, 100]); return { q: `${commas(a)} × ${commas(b)} =`, answer: String(a * b) }; },
  (r) => { const n = R(r, 12, 999) * 100; return { q: `${commas(n)} ÷ 100 =`, answer: String(n / 100) }; },
  (r) => { const a = R(r, 120, 899), b = R(r, 1, 9) * 1000, c = R(r, 11, 99); return { q: `${a} + ${commas(b)} + ${c} =`, answer: String(a + b + c) }; },
  (r) => { const a = R(r, 120, 600), c = R(r, 100, 500); return { q: `□ − ${a} = ${c}`, answer: String(a + c) }; },
  (r) => { const a = R(r, 20000, 99999), b = R(r, 10000, a - 1000); return { q: `${commas(a)} − ${commas(b)} =`, answer: String(a - b) }; },
  (r) => { const a = R(r, 120, 989), b = R(r, 3, 9); return { q: `${a} × ${b} =`, answer: String(a * b) }; },
  (r) => { const b = R(r, 3, 9), q = R(r, 120, 999); return { q: `${commas(b * q)} ÷ ${b} =`, answer: String(q) }; },
  (r) => { const a = R(r, 11, 199), b = R(r, 101, 999); return { q: `${dec(a, 1)} + ${dec(b)} =`, answer: dec(a * 10 + b) }; },
  (r) => { const w = R(r, 2, 20), b = R(r, 101, w * 100 - 1); return { q: `${w} − ${dec(b)} =`, answer: dec(w * 100 - b) }; },
  (r) => { const a = R(r, 11, 99), p = pick(r, [10, 100, 1000]); return { q: `${dec(a, 1)} × ${commas(p)} =`, answer: dec(a * p, 1) }; },
  (r) => { const a = R(r, 11, 999), p = pick(r, [10, 100, 1000]); return { q: `${a} ÷ ${commas(p)} =`, answer: dec(a * (1000 / p), 3) }; },
  (r) => { const a = R(r, 10, 50), b = R(r, 2, 9), c = R(r, 2, 9); return { q: `${a} + ${b} × ${c} =`, answer: String(a + b * c) }; },
  (r) => { const a = R(r, 10, 30), b = R(r, 2, a - 1), c = R(r, 2, 9); return { q: `(${a} − ${b}) × ${c} =`, answer: String((a - b) * c) }; },
  (r) => { const a = R(r, 2, 12), b = R(r, 2, 5); return r() < 0.5 ? { q: `${a}² =`, answer: String(a * a) } : { q: `${a}² + ${b}³ =`, answer: String(a * a + b ** 3) }; },
  (r) => { const p = pick(r, [5, 10, 20, 25, 50, 75]), n = R(r, 2, 40) * 20; return { q: `${p}% of ${n} =`, answer: String((p * n) / 100) }; },
  (r) => { const p = R(r, 1, 19) * 5, n = R(r, 1, 20) * 20; return { q: `${p}% of ${n} =`, answer: String((p * n) / 100) }; },
  (r) => { const d = R(r, 3, 9), n = R(r, 1, d - 1), x = d * R(r, 3, 15); return { q: `${f(n, d)} of ${x} =`, answer: String((n * x) / d) }; },
  (r) => { const d = R(r, 5, 12), a = R(r, 1, d - 1), b = R(r, 1, d - 1); return { q: `${f(a, d)} + ${f(b, d)} =`, answer: frac(a + b, d) }; },
  (r) => { const d1 = R(r, 2, 6), m = pick(r, [2, 3]), d2 = d1 * m, a = R(r, 1, d2 - 1), b = R(r, 1, d1 - 1); return { q: `${f(a, d2)} + ${f(b, d1)} =`, answer: frac(a + b * m, d2) }; },
  (r) => {
    const d = R(r, 2, 5), d2 = d * 2, w = R(r, 1, 3), a = R(r, 1, d - 1), b = R(r, 1, d2 - 1);
    return { q: `${w} ${f(a, d)} − ${f(b, d2)} =`, answer: frac((w * d + a) * 2 - b, d2) };
  },
  (r) => { const d = R(r, 3, 8), n = R(r, 1, d - 1), x = R(r, 2, 15); return { q: `${f(n, d)} × ${x} =`, answer: frac(n * x, d) }; },
  (r) => { const a = R(r, 1, 4), b = R(r, a + 1, 7), c = R(r, 1, 5), d = R(r, c + 1, 9); return { q: `${f(a, b)} × ${f(c, d)} =`, answer: frac(a * c, b * d) }; },
  (r) => { const b = R(r, 3, 9), a = R(r, 1, b - 1), c = R(r, 2, 6); return { q: `${f(a, b)} ÷ ${c} =`, answer: frac(a, b * c) }; },
  (r) => { const a = R(r, 101, 999), b = R(r, 3, 9); return { q: `${dec(a)} × ${b} =`, answer: dec(a * b) }; },
  (r) => { const q = R(r, 11, 99), b = R(r, 2, 9); return { q: `${dec(q * b, 1)} ÷ ${b} =`, answer: dec(q, 1) }; },
  (r) => { const a = R(r, 20, 99), b = R(r, 101, a * 10 - 1); return { q: `${dec(a, 1)} − ${dec(b)} =`, answer: dec(a * 10 - b) }; },
  (r) => { const b = R(r, 2, 9) * 10, q = R(r, 2, 99); return { q: `${commas(q * b)} ÷ ${b} =`, answer: String(q) }; },
  (r) => { const a = R(r, 1000, 9999), b = R(r, 3, 9); return { q: `${commas(a)} × ${b} =`, answer: String(a * b) }; },
  (r) => { const b = R(r, 3, 9), q = R(r, 1000, Math.floor(9999 / b)); return { q: `${commas(b * q)} ÷ ${b} =`, answer: String(q) }; },
  (r) => { const a = R(r, 3, 12), b = R(r, 3, 12); return { q: `${a} × □ = ${a * b}`, answer: String(b) }; },
  (r) => { const a = R(r, 1000, 9999), b = R(r, 12, 99); return { q: `${commas(a)} × ${b} =`, answer: String(a * b), marks: 2 }; },
  (r) => { const a = R(r, 100, 999), b = R(r, 12, 99); return { q: `${a} × ${b} =`, answer: String(a * b), marks: 2 }; },
  (r) => { const b = R(r, 12, 99), q = R(r, 100, Math.floor(9999 / b)); return { q: `${commas(b * q)} ÷ ${b} =`, answer: String(q), marks: 2 }; },
  (r) => { const b = R(r, 12, 39), q = R(r, 12, 99); return { q: `${commas(b * q)} ÷ ${b} =`, answer: String(q), marks: 2 }; },
];

export const SATS_ARITHMETIC = { questions: KINDS.length, minutes: 30, title: "KS2 Arithmetic (Paper 1 practice)" } as const;
export function satsArithmetic(r: Rng = Math.random): ExamQ[] {
  // The long multiplication and long division go among the others, as on the real paper.
  const made = KINDS.map((k) => k(r));
  const twos = made.filter((m) => m.marks === 2), ones = made.filter((m) => m.marks !== 2);
  [24, 28, 32, 35].forEach((at, i) => ones.splice(Math.min(at, ones.length), 0, twos[i]));
  return ones.map((m) => ({ q: m.q, kind: "typed" as const, options: [], answer: m.answer, marks: m.marks ?? 1 }));
}

// ── Spelling ──
// One line per word: the sentence with the word in *stars*, or "sentence | word"
// (a gap like ______ in the sentence is filled with the word).
export function parseSpellings(text: string, hear = true): ExamQ[] {
  const out: ExamQ[] = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.replace(/^\s*\d+[.)]\s*/, "").trim();
    if (!line) continue;
    let q = "", word = "";
    const star = line.match(/\*([^*]+)\*/);
    if (star) { word = star[1].trim(); q = line.replace(/\*([^*]+)\*/, "$1"); }
    else if (line.includes("|")) {
      const [s, w] = line.split("|").map((x) => x.trim());
      word = w ?? ""; q = s.replace(/_{2,}/, word); // no gap and no word in it: learners see a gap at the end
    }
    word = word.replace(/\s+/g, " ").trim();
    if (!q || !word || !/^[\p{L}' -]+$/u.test(word) || word.length > 40) continue;
    out.push({ q: q.replace(/\s+/g, " ").slice(0, 400), kind: "spell", options: [], answer: word, marks: 1, hear });
    if (out.length >= 60) break;
  }
  return out;
}

export const SPELLING_LISTS: { id: string; title: string; lines: string[] }[] = [
  {
    id: "y56-a", title: "Year 5/6 words — list A",
    lines: [
      "We will *achieve* our goal if we work together.",
      "The *ancient* castle stood on top of the hill.",
      "The *average* score in the quiz was seven.",
      "I found a real *bargain* at the market.",
      "She had a large *bruise* on her knee after the fall.",
      "The school *committee* meets every Monday.",
      "Our class won the spelling *competition*.",
      "Are you *definite* that the shop is open?",
      "The new *dictionary* has thousands of words.",
      "Please don't *embarrass* me in front of my friends.",
      "We must all look after the *environment*.",
      "The chocolate cake was *especially* delicious.",
      "Our teacher gave an *excellent* explanation.",
      "The visitor spoke a *foreign* language.",
      "There were *forty* children on the school trip.",
      "The *government* announced a new law.",
      "A flash of *lightning* lit up the sky.",
      "Exercise can make a *muscle* stronger.",
      "Our *neighbour* has a friendly dog.",
      "We waited in a long *queue* for the bus.",
    ],
  },
  {
    id: "y56-b", title: "Year 5/6 words — list B",
    lines: [
      "The *mischievous* kitten knocked over the vase.",
      "It is *necessary* to wear a helmet when cycling.",
      "The buzzing fly was a real *nuisance*.",
      "This trip is a great *opportunity* to learn.",
      "Can you *persuade* your dad to let us play?",
      "Football is a very *physical* game.",
      "It was a *privilege* to meet the author.",
      "I *recognise* that song from the radio.",
      "We had dinner at a new *restaurant*.",
      "The drummer kept a steady *rhythm*.",
      "Please write your *signature* at the bottom.",
      "The *soldier* marched across the square.",
      "My *stomach* hurt after eating too many sweets.",
      "Is there *sufficient* food for everyone?",
      "The nurse took my *temperature*.",
      "She gave the room a *thorough* clean.",
      "It was the *twelfth* day of the holiday.",
      "A carrot is my favourite *vegetable*.",
      "Only one *vehicle* was allowed on the bridge.",
      "The *yacht* sailed slowly into the harbour.",
    ],
  },
];
