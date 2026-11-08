"use client";
// A practical on the lab bench, as a lab experiment (components/lab/experimentRegistry.tsx).
import type { ComponentType } from "react";
import BenchLab from "@/components/lab/bench/BenchLab";
import { practicalFor } from "@/lib/lab/bench/all";

export function practicalComponent(slug: string): ComponentType {
  const p = practicalFor(slug);
  const Bench = () => (p ? <BenchLab practical={p} /> : null);
  Bench.displayName = `Practical(${slug})`;
  return Bench;
}
