"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LAB } from "@/lib/lab/catalog";

// Every experiment component, by catalog slug (lib/lab/catalog.ts). Used by the
// E-Laboratory pages and by the board's Lab tool.
// Each experiment is loaded only when it's opened.
const loading = () => (
  <div className="elab-panel flex h-80 items-center justify-center text-sm text-white/50">
    <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" /> Setting up the apparatus…
  </div>
);

// Practicals on the lab bench (lib/lab/bench): the catalog marks them.
const bench = (slug: string) => dynamic(() => import("@/components/lab/bench/Practicals").then((m) => m.practicalComponent(slug)), { loading });
const BENCH: Record<string, ComponentType> = Object.fromEntries(LAB.filter((e) => e.practical).map((e) => [e.slug, bench(e.slug)]));

export const EXPERIMENTS: Record<string, ComponentType> = {
  ...BENCH,
  probability: dynamic(() => import("@/components/lab/experiments/Probability"), { loading }),
  pythagoras: dynamic(() => import("@/components/lab/experiments/Pythagoras"), { loading }),
  statistics: dynamic(() => import("@/components/lab/experiments/Statistics"), { loading }),
  quadratics: dynamic(() => import("@/components/lab/experiments/Quadratics"), { loading }),
  "unit-circle": dynamic(() => import("@/components/lab/experiments/UnitCircle"), { loading }),
  transformations: dynamic(() => import("@/components/lab/experiments/Transformations"), { loading }),
  projectile: dynamic(() => import("@/components/lab/experiments/Projectile"), { loading }),
  genetics: dynamic(() => import("@/components/lab/experiments/Genetics"), { loading }),
  "circle-theorems": dynamic(() => import("@/components/lab/experiments/CircleTheorems"), { loading }),
  "linear-graphs": dynamic(() => import("@/components/lab/experiments/LinearGraphs"), { loading }),
  mensuration: dynamic(() => import("@/components/lab/experiments/Mensuration"), { loading }),
  fractions: dynamic(() => import("@/components/lab/experiments/FractionWall"), { loading }),
  polygons: dynamic(() => import("@/components/lab/experiments/Polygons"), { loading }),
  "heart-rate": dynamic(() => import("@/components/lab/experiments/HeartRate"), { loading }),
};

export const hasExperiment = (slug: string) => slug in EXPERIMENTS;
