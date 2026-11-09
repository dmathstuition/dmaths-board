// Every practical on the lab bench, by slug (the slug is the lab catalog's).
import type { Practical } from "@/lib/lab/bench/types";
import { PRACTICALS } from "@/lib/lab/bench/practicals";
import { PHYSICS } from "@/lib/lab/bench/physics";
import { CHEMISTRY } from "@/lib/lab/bench/chemistry";
import { BIOLOGY } from "@/lib/lab/bench/biology";
import { MATHS } from "@/lib/lab/bench/maths";
import { EXTRA } from "@/lib/lab/bench/extra";
import { MORE } from "@/lib/lab/bench/more";

export const ALL_PRACTICALS: Practical[] = [...MATHS, ...PRACTICALS, ...PHYSICS, ...CHEMISTRY, ...BIOLOGY, ...EXTRA, ...MORE];
export const practicalFor = (slug: string) => ALL_PRACTICALS.find((p) => p.slug === slug) ?? null;
