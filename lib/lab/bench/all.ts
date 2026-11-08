// Every practical on the lab bench, by slug (the slug is the lab catalog's).
import type { Practical } from "@/lib/lab/bench/types";
import { PRACTICALS } from "@/lib/lab/bench/practicals";
import { PHYSICS } from "@/lib/lab/bench/physics";

export const ALL_PRACTICALS: Practical[] = [...PRACTICALS, ...PHYSICS];
export const practicalFor = (slug: string) => ALL_PRACTICALS.find((p) => p.slug === slug) ?? null;
