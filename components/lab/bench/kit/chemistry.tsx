import type { ReactNode } from "react";
import type { ItemView } from "@/lib/lab/bench/types";
type Zoom = { anchor: { x: number; y: number }; title: string; draw: (cx: number, cy: number, r: number) => ReactNode };
export const CHEMISTRY_SIZE: Record<string, [number, number]> = {};
export const CHEMISTRY_FRONTS: string[] = [];
export function ChemistryKit(_: { it: ItemView; flowing?: boolean }): ReactNode | null { return null; }
export function ChemistryFront(_: { it: ItemView }): ReactNode | null { return null; }
export function chemistryCloseup(_: ItemView): Zoom | null { return null; }
