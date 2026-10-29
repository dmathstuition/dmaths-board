// Ready-made lesson layouts for the whiteboard (Venn diagram, KWL chart…).
// Each is a list of ordinary board items, so they can be moved, rubbed out
// and saved like anything else drawn on the board.
import type { Stroke } from "@/lib/whiteboard";

export type TemplateId = "venn" | "tchart" | "kwl" | "story" | "frayer" | "bond";
export const TEMPLATES: { id: TemplateId; label: string; subject: "Maths" | "English" | "Any" }[] = [
  { id: "venn", label: "Venn diagram", subject: "Any" },
  { id: "tchart", label: "T-chart", subject: "Any" },
  { id: "kwl", label: "KWL chart", subject: "Any" },
  { id: "story", label: "Story map", subject: "English" },
  { id: "frayer", label: "Frayer model", subject: "English" },
  { id: "bond", label: "Number bond", subject: "Maths" },
];
export const isTemplate = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);

const INK = "#0B1220", BLUE = "#1657C9", RED = "#DC2626", GREEN = "#16A34A";

export function templateItems(id: TemplateId, by: string, idPrefix: string): Stroke[] {
  let n = 0;
  const mk = (s: Omit<Stroke, "id" | "by">): Stroke => ({ id: `${idPrefix}-t${n++}`, by, ...s });
  const box = (x1: number, y1: number, x2: number, y2: number, color = INK, w = 4) => mk({ kind: "rect", color, w, pts: [x1, y1, x2, y2] });
  const line = (x1: number, y1: number, x2: number, y2: number, color = INK, w = 4) => mk({ kind: "line", color, w, pts: [x1, y1, x2, y2] });
  const arrow = (x1: number, y1: number, x2: number, y2: number) => mk({ kind: "arrow", color: INK, w: 4, pts: [x1, y1, x2, y2] });
  const ring = (x1: number, y1: number, x2: number, y2: number, color = INK, fill = false) => mk({ kind: "ellipse", color, w: 4, pts: [x1, y1, x2, y2], ...(fill ? { fill: true } : {}) });
  const text = (x: number, y: number, t: string, color = INK, w = 4) => mk({ kind: "text", color, w, pts: [x, y], text: t });

  switch (id) {
    case "venn":
      return [
        text(0.4, 0.04, "Venn diagram", INK, 8),
        ring(0.12, 0.17, 0.6, 0.93, BLUE, true), ring(0.4, 0.17, 0.88, 0.93, RED, true),
        text(0.2, 0.2, "A", BLUE, 8), text(0.78, 0.2, "B", RED, 8), text(0.455, 0.2, "Both", INK, 6),
      ];
    case "tchart":
      return [
        line(0.06, 0.2, 0.94, 0.2, INK, 8), line(0.5, 0.08, 0.5, 0.94, INK, 8),
        text(0.18, 0.08, "Heading 1", BLUE, 8), text(0.62, 0.08, "Heading 2", RED, 8),
      ];
    case "kwl":
      return [
        box(0.03, 0.05, 0.33, 0.95, BLUE), box(0.35, 0.05, 0.65, 0.95, RED), box(0.67, 0.05, 0.97, 0.95, GREEN),
        line(0.03, 0.2, 0.97, 0.2),
        text(0.05, 0.07, "K — What I Know", BLUE, 6), text(0.37, 0.07, "W — What I Want\nto know", RED, 6), text(0.69, 0.07, "L — What I\nLearned", GREEN, 6),
      ];
    case "story":
      return [
        text(0.4, 0.04, "Story map", INK, 8),
        box(0.03, 0.16, 0.31, 0.58, BLUE), box(0.36, 0.16, 0.64, 0.58, RED), box(0.69, 0.16, 0.97, 0.58, GREEN),
        arrow(0.315, 0.37, 0.355, 0.37), arrow(0.645, 0.37, 0.685, 0.37),
        text(0.05, 0.18, "Beginning", BLUE, 6), text(0.38, 0.18, "Middle", RED, 6), text(0.71, 0.18, "End", GREEN, 6),
        box(0.03, 0.64, 0.48, 0.95), box(0.52, 0.64, 0.97, 0.95),
        text(0.05, 0.66, "Characters", INK, 6), text(0.54, 0.66, "Setting", INK, 6),
      ];
    case "frayer":
      return [
        box(0.04, 0.05, 0.96, 0.95), line(0.5, 0.05, 0.5, 0.95), line(0.04, 0.5, 0.96, 0.5),
        ring(0.33, 0.37, 0.67, 0.63, BLUE, true), text(0.45, 0.47, "Word", BLUE, 8),
        text(0.06, 0.07, "Definition", INK, 6), text(0.52, 0.07, "Characteristics", INK, 6),
        text(0.06, 0.52, "Examples", GREEN, 6), text(0.52, 0.52, "Non-examples", RED, 6),
      ];
    case "bond":
      return [
        text(0.38, 0.04, "Number bond", INK, 8),
        ring(0.41, 0.15, 0.59, 0.44, BLUE, true), ring(0.18, 0.56, 0.36, 0.85, RED, true), ring(0.64, 0.56, 0.82, 0.85, GREEN, true),
        line(0.45, 0.4, 0.31, 0.6), line(0.55, 0.4, 0.69, 0.6),
        text(0.445, 0.45, "Whole", BLUE, 4), text(0.235, 0.86, "Part", RED, 4), text(0.695, 0.86, "Part", GREEN, 4),
      ];
  }
}

// ── Group maker: shuffle names into groups of about `size` ──
export function makeGroups(names: string[], size: number, rng: () => number = Math.random): string[][] {
  const pool = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (!pool.length) return [];
  const count = Math.max(1, Math.min(12, Math.ceil(pool.length / Math.max(1, size))));
  const groups: string[][] = Array.from({ length: count }, () => []);
  pool.forEach((n, i) => groups[i % count].push(n));
  return groups;
}
