// More apparatus for the lab bench (see Apparatus.tsx): physics, chemistry and
// biology kit. Each piece is drawn with the middle of its base at (0, 0).
import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
import { physicsCloseup, PhysicsKit, PHYSICS_SIZE } from "@/components/lab/bench/kit/physics";
import { chemistryCloseup, ChemistryKit, CHEMISTRY_SIZE, CHEMISTRY_FRONTS, ChemistryFront } from "@/components/lab/bench/kit/chemistry";
import { biologyCloseup, BiologyKit, BIOLOGY_SIZE } from "@/components/lab/bench/kit/biology";
import { digits } from "@/components/lab/bench/kit/parts";
import { mathsCloseup, MathsKit, MATHS_SIZE, mathsShadow } from "@/components/lab/bench/kit/maths";
import { more2Closeup, More2Kit, MORE2_SIZE } from "@/components/lab/bench/kit/more";

export const MORE_SIZE: Record<string, [number, number]> = { ...PHYSICS_SIZE, ...CHEMISTRY_SIZE, ...BIOLOGY_SIZE, ...MATHS_SIZE, ...MORE2_SIZE };
export const FRONTS: string[] = [...CHEMISTRY_FRONTS];
const NO_SHADOW = ["ray-sheet", "ball", "pendulum", "beam", "optical-bench", "ripple-tank", "ph-chart"];
export const moreShadow = (kind: string) => !NO_SHADOW.includes(kind) && mathsShadow(kind);

export function More({ it, flowing }: { it: ItemView; flowing?: boolean }): ReactNode {
  return PhysicsKit({ it }) ?? ChemistryKit({ it, flowing }) ?? BiologyKit({ it }) ?? MathsKit({ it }) ?? More2Kit({ it }) ?? <rect x={-40} y={-60} width={80} height={60} rx={8} fill="#94A3B8" />;
}
export function MoreFront({ it }: { it: ItemView }) {
  return <ChemistryFront it={it} />;
}

export type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };
export function moreCloseup(it: ItemView): Zoom | null {
  if (it.kind === "balance") return { anchor: { x: it.x - 30, y: it.y - 27 }, title: "Close-up · the balance display", draw: (cx, cy) => digits(cx, cy, `${Number(it.props?.reading ?? 0).toFixed(2)}`, "g", "#34D399") };
  return physicsCloseup(it) ?? chemistryCloseup(it) ?? biologyCloseup(it) ?? mathsCloseup(it) ?? more2Closeup(it);
}
