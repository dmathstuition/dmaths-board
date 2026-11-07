// Revision flashcards for a lesson: made from what the class did — the live
// quiz, exam and class-work questions, and the words and maths written on the
// board. The A.I turns that into key-fact cards and worked Q&A; without it,
// the questions with their answers become cards. Pure.

export type Card = { front: string; back: string; tag: string };
export type LessonText = {
  title: string;
  questions: { q: string; answer: string | null; from: string }[];
  board: string[];  // text, notes and equations written on the board
};
export const MAX_CARDS = 20;
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export const FLASHCARD_SYSTEM = `You make revision flashcards for Nigerian secondary-school learners (WAEC/NECO/JAMB/Common Entrance level, British spelling).
Reply with JSON only: {"cards":[{"front":"...","back":"...","tag":"Key fact"}]}
Rules:
- 10 to 16 cards from the lesson below: key facts, definitions, formulas and rules (tag "Key fact" or "Formula"), and short worked examples (tag "Practice": the front is a question, the back the answer with one or two steps).
- Front max 160 characters, back max 240. Every fact and answer must be certainly correct. Stick to what the lesson covers.
- Plain text only: write x², √, π, ÷, ×, °, ½ as characters. No LaTeX, no markdown, no emojis.`;

export function flashcardPrompt(l: LessonText): string {
  const qs = l.questions.slice(0, 30).map((x) => `- ${clip(x.q, 240)}${x.answer ? ` (answer: ${clip(x.answer, 80)})` : ""}`).join("\n");
  const board = l.board.slice(0, 40).map((t) => `- ${clip(t, 200)}`).join("\n");
  return `Lesson: ${clip(l.title, 120) || "Class"}\n\nQuestions the class did:\n${qs || "(none)"}\n\nWritten on the board:\n${board || "(nothing)"}`;
}

export function cleanCards(raw: unknown): Card[] {
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.cards) ? (raw as any).cards : [];
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const c of list) {
    const front = clip(c?.front, 200), back = clip(c?.back, 300);
    if (!front || !back || seen.has(front.toLowerCase())) continue;
    seen.add(front.toLowerCase());
    out.push({ front, back, tag: ["Key fact", "Formula", "Practice"].includes(c?.tag) ? c.tag : "Key fact" });
  }
  return out.slice(0, MAX_CARDS);
}

// Without the A.I: each question with a known answer becomes a card.
export function questionCards(l: LessonText): Card[] {
  const seen = new Set<string>();
  return l.questions.filter((x) => x.answer && x.q).filter((x) => { const k = x.q.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, MAX_CARDS).map((x) => ({ front: clip(x.q, 200), back: clip(x.answer, 300), tag: "Practice" }));
}
