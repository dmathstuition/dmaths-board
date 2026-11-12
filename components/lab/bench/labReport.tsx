"use client";
// How a practical on a learner's device tells the class where it's up to (the
// live lab tracker, lib/labTrack.ts), and whose name goes on the write-up.
// Outside a class nothing is reported.
import { createContext, useContext } from "react";
import type { LabProgress } from "@/lib/lab/labTrack";
import type { DemoFrame } from "@/lib/lab/demo";
import type { BenchSave } from "@/lib/lab/benchExam";

// learner: a learner doing it on their own device — they only get "Do this
// step for me" (and "Show me the answer") after HELP_AFTER wrong tries.
// demo: the teacher is showing the class — each change on the bench goes out.
// watch: a learner watching the teacher's bench (frame: the latest picture of it).
export type LabReport = { name?: string; report?: (p: LabProgress) => void; learner?: boolean;
  demo?: (f: DemoFrame) => void; watch?: { frame: DemoFrame | null };
  // exam: a practical test — this learner's own samples (seed), carried on
  // from what was saved (resume), saved as they go; nothing checked or shown.
  exam?: { seed: number; resume: BenchSave | null; save: (b: BenchSave) => void } };
export const HELP_AFTER = 5;
export const LabReportContext = createContext<LabReport>({});
export const useLabReport = () => useContext(LabReportContext);
