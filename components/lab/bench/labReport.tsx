"use client";
// How a practical on a learner's device tells the class where it's up to (the
// live lab tracker, lib/labTrack.ts), and whose name goes on the write-up.
// Outside a class nothing is reported.
import { createContext, useContext } from "react";
import type { LabProgress } from "@/lib/lab/labTrack";

export type LabReport = { name?: string; report?: (p: LabProgress) => void };
export const LabReportContext = createContext<LabReport>({});
export const useLabReport = () => useContext(LabReportContext);
