// Class reports to parents: what the class covered and how the learner did,
// sent by email or WhatsApp with a link to a report page.
import { waNumber } from "@/lib/whatsapp";
import type { ResultRow } from "@/lib/classResults";

export type Contact = { kind: "email" | "whatsapp"; value: string };
export const MAX_COVERED = 600;
export const MAX_HOMEWORK = 300;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

// A parent's email or WhatsApp number, tidied — or null if it's neither.
export function cleanContact(v: unknown): Contact | null {
  const t = String(v ?? "").trim().slice(0, 254);
  if (!t) return null;
  if (t.includes("@")) return EMAIL.test(t) ? { kind: "email", value: t.toLowerCase() } : null;
  if (!/^[\d\s+()-]{7,24}$/.test(t)) return null;
  const n = waNumber(t);
  return n ? { kind: "whatsapp", value: `+${n}` } : null;
}

export const cleanCovered = (v: unknown) => String(v ?? "").replace(/\r/g, "").trim().slice(0, MAX_COVERED);
export const cleanHomework = (v: unknown) => String(v ?? "").replace(/\r/g, "").trim().slice(0, MAX_HOMEWORK);

// "4 / 5 (80%)" — or a note when nothing was marked.
export function scoreLine(r: Pick<ResultRow, "total" | "totalMax" | "percent">): string {
  return r.totalMax ? `${r.total} / ${r.totalMax}${r.percent != null ? ` (${r.percent}%)` : ""}` : "No marked work in this class";
}

// A short word for the parent, from the score.
export function praise(percent: number | null): string {
  if (percent == null) return "Thank you for being part of the class.";
  if (percent >= 80) return "Excellent work — well done!";
  if (percent >= 60) return "Good work — keep it up.";
  if (percent >= 40) return "A fair effort — a little more practice will help.";
  return "Needs more practice — please go over today's work together.";
}

// The message a parent receives (WhatsApp text, or the body of the email).
export function reportMessage(o: {
  learner: string; title: string; teacher: string; date: string; covered: string; homework: string;
  row: Pick<ResultRow, "work" | "workMax" | "quizCorrect" | "quizAsked" | "total" | "totalMax" | "percent">; url: string;
}): string {
  const lines = [
    `Class report for ${o.learner}`,
    `${o.title} · ${o.date}${o.teacher ? ` · with ${o.teacher}` : ""}`,
    "",
  ];
  if (o.covered) lines.push(`What we covered: ${o.covered}`);
  if (o.row.workMax) lines.push(`Class work: ${o.row.work} / ${o.row.workMax}`);
  if (o.row.quizAsked) lines.push(`Live quiz: ${o.row.quizCorrect} / ${o.row.quizAsked} correct`);
  lines.push(`Total: ${scoreLine(o.row)} — ${praise(o.row.percent)}`);
  if (o.homework) lines.push(`Homework: ${o.homework}`);
  lines.push("", `Full report: ${o.url}`);
  return lines.join("\n");
}
