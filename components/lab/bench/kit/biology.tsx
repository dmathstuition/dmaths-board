import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };
export const BIOLOGY_SIZE: Record<string, [number, number]> = {};
export function BiologyKit(_: { it: ItemView; flowing?: boolean }): ReactNode | null { return null; }
export function biologyCloseup(_: ItemView): Zoom | null { return null; }
