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
};

export const hasExperiment = (slug: string) => slug in EXPERIMENTS;
