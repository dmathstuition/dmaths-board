"use client";
// A piece of apparatus, small: its bench drawing when it has one, else its icon.
import type { Item } from "@/lib/lab/room/inventory";
import { Apparatus, dims } from "@/components/lab/bench/Apparatus";

export function ItemPic({ item, size = 64 }: { item: Item; size?: number }) {
  const icon = <span aria-hidden className="flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.55 }}>{item.icon}</span>;
  if (!item.bench) return icon;
  const it = { id: item.id, kind: item.bench.kind, x: 0, y: 0, props: item.bench.props ?? {} }, { w, h } = dims(it);
  if (w / h > 4 || h / w > 6) return icon; // too long and thin to see small
  return <svg aria-hidden viewBox={`${-w / 2 - 12} ${-h - 12} ${w + 24} ${h + 24}`} style={{ width: size, height: size }}><Apparatus it={it} /></svg>;
}
