"use client";
// A practical test in an exam (lib/lab/benchExam.ts): the learner does the
// practical on their own bench — their own samples — and records the readings
// as they go. Saved after every step, so leaving the question (or the page)
// and coming back carries on where they were. Loaded only when an exam has one.
import { useMemo, useRef } from "react";
import BenchLab from "@/components/lab/bench/BenchLab";
import { LabReportContext, type LabReport } from "@/components/lab/bench/labReport";
import { practicalFor } from "@/lib/lab/bench/all";
import { cleanBenchSave, type BenchSave } from "@/lib/lab/benchExam";

// The same samples every time this learner opens this practical in this exam; different for each learner.
function seedOf(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export default function BenchQuestion({ slug, examId, myId, saved, onSave }: { slug: string; examId: string; myId: string; saved: unknown; onSave: (b: BenchSave) => void }) {
  const p = practicalFor(slug);
  const save = useRef(onSave); save.current = onSave;
  const first = useRef(saved); // where they were when the question opened
  const ctx = useMemo<LabReport>(() => ({
    learner: true,
    exam: { seed: seedOf(`${examId}|${myId}|${slug}`), resume: cleanBenchSave(first.current), save: (b) => save.current(b) },
  }), [examId, myId, slug]);
  if (!p) return <p className="mt-3 text-sm font-bold text-red-700">This practical isn&apos;t available — tell your teacher.</p>;
  return (
    <div className="elab mt-3 rounded-2xl p-2 sm:p-3">
      <LabReportContext.Provider value={ctx}><BenchLab practical={p} /></LabReportContext.Provider>
    </div>
  );
}
