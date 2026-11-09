"use client";
// How a practical on a learner's device tells the class where it's up to (the
// live lab tracker, lib/labTrack.ts), and whose name goes on the write-up.
// Outside a class nothing is reported.
import { createContext, useContext } from "react";
import type { LabProgress } from "@/lib/lab/labTrack";

// learner: a learner doing it on their own device — they only get "Do this
// step for me" (and "Show me the answer") after HELP_AFTER wrong tries.
export type LabReport = { name?: string; report?: (p: LabProgress) => void; learner?: boolean };
export const HELP_AFTER = 5;
export const LabReportContext = createContext<LabReport>({});
export const useLabReport = () => useContext(LabReportContext);
