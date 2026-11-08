"use client";
// The virtual practicals as lab experiments (components/lab/experimentRegistry.tsx).
import BenchLab from "@/components/lab/bench/BenchLab";
import { foodTests, ohmsLaw, osmosis, titration } from "@/lib/lab/bench/practicals";

export const TitrationPractical = () => <BenchLab practical={titration} />;
export const FoodTestsPractical = () => <BenchLab practical={foodTests} />;
export const OhmsLawPractical = () => <BenchLab practical={ohmsLaw} />;
export const OsmosisPractical = () => <BenchLab practical={osmosis} />;
