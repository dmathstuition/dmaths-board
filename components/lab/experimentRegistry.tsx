"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Every experiment component, by catalog slug (lib/lab/catalog.ts). Used by the
// E-Laboratory pages and by the board's Lab tool.
// Each experiment is loaded only when it's opened.
const loading = () => (
  <div className="elab-panel flex h-80 items-center justify-center text-sm text-white/50">
    <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" /> Setting up the apparatus…
  </div>
);

export const EXPERIMENTS: Record<string, ComponentType> = {
  probability: dynamic(() => import("@/components/lab/experiments/Probability"), { loading }),
  pythagoras: dynamic(() => import("@/components/lab/experiments/Pythagoras"), { loading }),
  statistics: dynamic(() => import("@/components/lab/experiments/Statistics"), { loading }),
  pendulum: dynamic(() => import("@/components/lab/experiments/Pendulum"), { loading }),
  circuits: dynamic(() => import("@/components/lab/experiments/Circuits"), { loading }),
  density: dynamic(() => import("@/components/lab/experiments/Density"), { loading }),
  titration: dynamic(() => import("@/components/lab/experiments/Titration"), { loading }),
  photosynthesis: dynamic(() => import("@/components/lab/experiments/Photosynthesis"), { loading }),
  quadratics: dynamic(() => import("@/components/lab/experiments/Quadratics"), { loading }),
  "unit-circle": dynamic(() => import("@/components/lab/experiments/UnitCircle"), { loading }),
  transformations: dynamic(() => import("@/components/lab/experiments/Transformations"), { loading }),
  projectile: dynamic(() => import("@/components/lab/experiments/Projectile"), { loading }),
  hooke: dynamic(() => import("@/components/lab/experiments/Hooke"), { loading }),
  refraction: dynamic(() => import("@/components/lab/experiments/Refraction"), { loading }),
  reactivity: dynamic(() => import("@/components/lab/experiments/Reactivity"), { loading }),
  rates: dynamic(() => import("@/components/lab/experiments/Rates"), { loading }),
  "gas-laws": dynamic(() => import("@/components/lab/experiments/GasLaws"), { loading }),
  cells: dynamic(() => import("@/components/lab/experiments/Cells"), { loading }),
  osmosis: dynamic(() => import("@/components/lab/experiments/Osmosis"), { loading }),
  enzymes: dynamic(() => import("@/components/lab/experiments/Enzymes"), { loading }),
  moments: dynamic(() => import("@/components/lab/experiments/Moments"), { loading }),
  lens: dynamic(() => import("@/components/lab/experiments/Lens"), { loading }),
  "heating-curve": dynamic(() => import("@/components/lab/experiments/Heating"), { loading }),
  waves: dynamic(() => import("@/components/lab/experiments/Waves"), { loading }),
  electrolysis: dynamic(() => import("@/components/lab/experiments/Electrolysis"), { loading }),
  chromatography: dynamic(() => import("@/components/lab/experiments/Chromatography"), { loading }),
  "flame-tests": dynamic(() => import("@/components/lab/experiments/FlameTests"), { loading }),
  "food-tests": dynamic(() => import("@/components/lab/experiments/FoodTests"), { loading }),
  transpiration: dynamic(() => import("@/components/lab/experiments/Transpiration"), { loading }),
  genetics: dynamic(() => import("@/components/lab/experiments/Genetics"), { loading }),
  "circle-theorems": dynamic(() => import("@/components/lab/experiments/CircleTheorems"), { loading }),
  "linear-graphs": dynamic(() => import("@/components/lab/experiments/LinearGraphs"), { loading }),
  mensuration: dynamic(() => import("@/components/lab/experiments/Mensuration"), { loading }),
  fractions: dynamic(() => import("@/components/lab/experiments/FractionWall"), { loading }),
  polygons: dynamic(() => import("@/components/lab/experiments/Polygons"), { loading }),
  "free-fall": dynamic(() => import("@/components/lab/experiments/FreeFall"), { loading }),
  "specific-heat": dynamic(() => import("@/components/lab/experiments/SpecificHeat"), { loading }),
  "ph-indicators": dynamic(() => import("@/components/lab/experiments/PhIndicators"), { loading }),
  "heart-rate": dynamic(() => import("@/components/lab/experiments/HeartRate"), { loading }),
};

export const hasExperiment = (slug: string) => slug in EXPERIMENTS;
