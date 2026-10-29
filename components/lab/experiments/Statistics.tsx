"use client";
import { useState } from "react";
import { Panel, Readout, LabButton, Segmented, Insight, Challenge } from "@/components/lab/LabUI";
import { mean, median, modes, range } from "@/lib/lab/sims";

const MIN = 0, MAX = 20;
const PRESETS: { label: string; data: number[] }[] = [
  { label: "Test scores", data: [12, 14, 14, 15, 16, 16, 16, 17, 18, 19] },
  { label: "With an outlier", data: [5, 6, 6, 7, 7, 7, 8, 8, 20] },
  { label: "Two modes", data: [3, 4, 4, 4, 9, 10, 10, 10, 15] },
  { label: "Empty", data: [] },
];
const TOOLS: { value: "add" | "remove"; label: string }[] = [{ value: "add", label: "＋ Add" }, { value: "remove", label: "－ Remove" }];
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export default function Statistics() {
  const [data, setData] = useState<number[]>(PRESETS[0].data);
  const [tool, setTool] = useState<"add" | "remove">("add");
  const counts = Array.from({ length: MAX - MIN + 1 }, (_, i) => data.filter((d) => d === i + MIN).length);
  const tallest = Math.max(4, ...counts);
  const m = mean(data), med = median(data), mo = modes(data);
  const pos = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`;

  const add = (v: number) => setData((d) => [...d, v].sort((x, y) => x - y));
  const remove = (v: number) => setData((d) => { const i = d.indexOf(v); return i < 0 ? d : [...d.slice(0, i), ...d.slice(i + 1)]; });

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="Dot plot" right={
        <div className="w-44"><Segmented label="Tap mode" color="#38BDF8" value={tool} onChange={(v) => setTool(v as "add" | "remove")}
          options={TOOLS} /></div>
      }>
        <p className="text-xs text-white/50">Tap a column to {tool === "add" ? "add a value" : "remove a value"}.</p>
        <div className="relative mt-2 px-1 pb-16 pt-4">
          <div className="flex h-56 items-end gap-[3px]">
            {counts.map((n, i) => {
              const v = i + MIN;
              return (
                <button key={v} type="button" onClick={() => (tool === "add" ? add(v) : remove(v))}
                  aria-label={`Value ${v}: ${n} in the data. ${tool === "add" ? "Add" : "Remove"} one.`}
                  className="group flex h-full flex-1 flex-col-reverse items-center gap-[3px] rounded-lg pb-1 transition hover:bg-white/5">
                  {Array.from({ length: n }, (_, k) => (
                    <span key={k} className="elab-pop block aspect-square w-full max-w-[22px] rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 shadow-[0_0_10px_rgba(56,189,248,.5)]"
                      style={{ maxHeight: `${100 / tallest}%` }} />
                  ))}
                  <span className="block h-2 w-2 rounded-full bg-white/0 group-hover:bg-white/30" />
                </button>
              );
            })}
          </div>
          {/* axis */}
          <div className="relative mt-1 h-px bg-white/30">
            {counts.map((_, i) => (
              <span key={i} className="absolute top-2 -translate-x-1/2 text-[10px] font-bold text-white/45" style={{ left: `calc(${pos(i + MIN)} * ${(MAX - MIN) / (MAX - MIN + 1)} + ${100 / (MAX - MIN + 1) / 2}%)` }}>{i + MIN}</span>
            ))}
            {data.length > 0 && (
              <>
                <Marker left={`calc(${pos(m)} * ${(MAX - MIN) / (MAX - MIN + 1)} + ${100 / (MAX - MIN + 1) / 2}%)`} color="#F472B6" label={`mean ${fmt(m)}`} row={0} triangle />
                <Marker left={`calc(${pos(med)} * ${(MAX - MIN) / (MAX - MIN + 1)} + ${100 / (MAX - MIN + 1) / 2}%)`} color="#34D399" label={`median ${fmt(med)}`} row={1} />
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => <LabButton key={p.label} variant="ghost" onClick={() => setData(p.data)}>{p.label}</LabButton>)}
          <LabButton variant="ghost" onClick={() => setData((d) => d.slice(0, -1))} disabled={!data.length}>Undo last</LabButton>
        </div>
      </Panel>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Mean" value={data.length ? fmt(m) : "—"} color="#F472B6" big />
          <Readout label="Median" value={data.length ? fmt(med) : "—"} color="#34D399" big />
          <Readout label="Mode" value={!data.length ? "—" : mo.length ? mo.join(", ") : "none"} color="#FACC15" />
          <Readout label="Range" value={data.length ? range(data) : "—"} color="#38BDF8" />
        </div>
        <Panel title="The data, in order">
          <p className="break-words font-mono text-sm leading-relaxed text-white/80">
            {data.length ? data.join(", ") : "Nothing yet — tap the columns to add values."}
          </p>
          <p className="mt-2 text-xs text-white/45">n = {data.length} · sum = {data.reduce((s, x) => s + x, 0)}</p>
        </Panel>
        <Insight color="#F472B6">
          The <b className="text-pink-400">mean</b> is the balance point (▲) — where the plot would balance on your finger.
          The <b className="text-emerald-400">median</b> is the middle value. Add one huge value: the mean gets dragged
          towards it, but the median barely moves. That&apos;s why the median is used when there are outliers.
        </Insight>
        <Challenge>Load “With an outlier”. Remove the 20 — how much does the mean change compared with the median?</Challenge>
      </div>
    </div>
  );
}

function Marker({ left, color, label, row, triangle }: { left: string; color: string; label: string; row: number; triangle?: boolean }) {
  return (
    <div className="absolute -translate-x-1/2 transition-[left] duration-500" style={{ left, top: 22 + row * 22 }}>
      <div className="flex flex-col items-center">
        {triangle ? <span style={{ color }} className="text-sm leading-none">▲</span> : <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        <span className="whitespace-nowrap rounded-md px-1.5 text-[10px] font-extrabold" style={{ color, background: `${color}22` }}>{label}</span>
      </div>
    </div>
  );
}
