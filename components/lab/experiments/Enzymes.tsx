"use client";
import { useEffect, useRef, useState } from "react";
import { Panel, Slider, Readout, LabButton, Segmented, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { ENZYMES, enzymeActivity, digestionTime } from "@/lib/lab/sims";

const C = "#84CC16";
const WELLS = 20;           // one iodine test per simulated minute
const MS_PER_MIN = 260;
type Reading = { enzyme: string; temp: number; pH: number; minutes: number };

// Iodine colour: blue-black while starch remains, orange-brown once it's gone.
function iodine(starchLeft: number): string {
  const s = Math.max(0, Math.min(1, starchLeft));
  const mix = (a: number, b: number) => Math.round(a * s + b * (1 - s));
  return `rgb(${mix(30, 217)}, ${mix(27, 119)}, ${mix(75, 6)})`;
}

export default function Enzymes() {
  const [eIdx, setEIdx] = useState(0);
  const [temp, setTemp] = useState(37);
  const [pH, setPH] = useState(7);
  const [minute, setMinute] = useState<number | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const enz = ENZYMES[eIdx];
  const activity = enzymeActivity(temp, pH, enz.optimumPH, enz.optimumT);
  const tDigest = digestionTime(activity);

  // The run ends once the iodine stays orange (or after 20 tests).
  const endMinute = Math.min(WELLS, Math.ceil(tDigest));
  function start() {
    if (timer.current) clearInterval(timer.current);
    setMinute(0);
    timer.current = setInterval(() => setMinute((m) => Math.min(WELLS, (m ?? 0) + 1)), MS_PER_MIN);
  }
  useEffect(() => {
    if (minute === null || minute < endMinute) return;
    if (timer.current) clearInterval(timer.current);
    setReadings((r) => [...r, { enzyme: enz.label, temp, pH, minutes: tDigest }].slice(-30));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { if (timer.current) clearInterval(timer.current); setMinute(null); }, [eIdx, temp, pH]);

  const mine = readings.filter((r) => r.enzyme === enz.label);
  const theoryT = Array.from({ length: 36 }, (_, i) => [i * 2, 1 / digestionTime(enzymeActivity(i * 2, pH, enz.optimumPH, enz.optimumT))] as [number, number]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Spotting tile — iodine test every minute">
          <div className="grid grid-cols-5 gap-3 rounded-2xl bg-white/90 p-4 sm:grid-cols-10" role="img"
            aria-label={minute === null ? "Not started" : `After ${minute} minutes, ${minute >= tDigest ? "the starch has been digested" : "starch is still present"}`}>
            {Array.from({ length: WELLS }, (_, i) => {
              const tested = minute !== null && i < minute;
              return (
                <div key={i} className="flex flex-col items-center">
                  <span className={`block aspect-square w-full rounded-full shadow-inner ${tested ? "elab-pop" : ""}`}
                    style={{ background: tested ? iodine(1 - (i + 1) / tDigest) : "#E2E8F0", boxShadow: "inset 0 3px 6px rgba(0,0,0,.25)" }} />
                  <span className="mt-1 text-[10px] font-bold text-slate-500">{i + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LabButton color={C} onClick={start}>▶ Mix starch + enzyme</LabButton>
            <span className="text-xs text-white/55">Blue-black = starch still there · orange = all digested</span>
          </div>
          {minute !== null && minute >= endMinute && (
            <p className="elab-pop mt-3 text-sm font-semibold text-emerald-300">
              {tDigest >= 20 ? "Starch still present after 20 minutes — the enzyme is barely working." : `Starch digested in about ${tDigest.toFixed(1)} minutes.`}
            </p>
          )}
        </Panel>
        <Panel title="Conditions">
          <div className="space-y-5">
            <Segmented label="Enzyme" value={String(eIdx)} onChange={(v) => setEIdx(Number(v))} color={C}
              options={ENZYMES.map((e, i) => ({ value: String(i), label: e.label.split(" (")[0] }))} />
            <Slider label="Temperature" value={temp} min={0} max={70} step={1} unit=" °C" color="#FB923C" onChange={setTemp} />
            <Slider label="pH" value={pH} min={1} max={12} step={0.5} color="#38BDF8" onChange={setPH} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Activity" value={`${Math.round(activity * 100)}%`} color={C} />
          <Readout label="Time to digest" value={tDigest >= 20 ? "> 20" : tDigest.toFixed(1)} unit="min" color="#FACC15" />
          <Readout label="Optimum pH" value={enz.optimumPH} color="#38BDF8" />
        </div>
        <Panel title={`Rate (1 ÷ time) against temperature at pH ${pH}`}>
          <Chart title="Rate of reaction against temperature" xLabel="Temperature (°C)" yLabel="Rate (per min)" xMax={70} yMax={1.1} xTicks={7}
            series={[
              { points: theoryT, color: "rgba(132,204,22,.5)", dashed: true },
              { points: mine.filter((r) => r.pH === pH).map((r) => [r.temp, 1 / r.minutes] as [number, number]), color: "#F472B6", kind: "dots" },
            ]} markerX={temp} />
        </Panel>
        <Insight color={C}>
          Enzymes are proteins with an <b>active site</b> shaped to fit their substrate. Warming them up makes
          collisions faster — until about 40–45 °C, when the active site changes shape and the enzyme
          <b> denatures</b>. Each enzyme also has an <b>optimum pH</b>: pepsin works in stomach acid, amylase near
          neutral.
        </Insight>
        <Challenge>Test amylase at 10, 20, 30, 37, 45 and 60 °C. Where is the optimum? Now try pepsin at pH 7 — why does it barely work?</Challenge>
      </div>
    </div>
  );
}
