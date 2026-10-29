"use client";
import { useState } from "react";
import { Panel, Readout, Slider, Segmented, LabButton, Insight, Challenge, Chart } from "@/components/lab/LabUI";
import { ACTIVITIES, heartRate, recoveryRate, recoveryTime, maxHeartRate } from "@/lib/lab/sims";

const C = "#84CC16";
type Phase = { kind: "exercise" | "rest"; start: number; from: number; intensity: number };

export default function HeartRate() {
  const [age, setAge] = useState(14);
  const [resting, setResting] = useState(72);
  const [fitness, setFitness] = useState(0.5);
  const [activity, setActivity] = useState<string>("jog");
  const [points, setPoints] = useState<[number, number][]>([[0, 72]]);
  const [phase, setPhase] = useState<Phase>({ kind: "rest", start: 0, from: 72, intensity: 0 });
  const t = points[points.length - 1][0];
  const bpm = points[points.length - 1][1];
  const max = maxHeartRate(age);
  const intensity = ACTIVITIES.find((a) => a.id === activity)!.intensity;

  function rateAt(p: Phase, at: number) {
    const dt = (at - p.start) * 60;
    return p.kind === "exercise"
      ? p.from + heartRate(resting, age, p.intensity, dt, fitness) - resting
      : recoveryRate(p.from, resting, dt, fitness);
  }
  function advance(minutes: number, next?: Phase) {
    const p = next ?? phase;
    const added: [number, number][] = [];
    for (let i = 1; i <= minutes * 4; i++) { const at = t + i / 4; added.push([at, Math.min(max, Math.round(rateAt(p, at)))]); }
    setPhase(p);
    setPoints((pts) => [...pts, ...added].slice(-200));
  }
  const exercise = () => advance(1, phase.kind === "exercise" && phase.intensity === intensity ? phase : { kind: "exercise", start: t, from: bpm, intensity });
  const rest = () => advance(1, phase.kind === "rest" ? phase : { kind: "rest", start: t, from: bpm, intensity: 0 });
  function reset(r = resting) { setPoints([[0, r]]); setPhase({ kind: "rest", start: 0, from: r, intensity: 0 }); }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Pulse">
          <div className="flex items-center justify-center rounded-2xl bg-black/30 py-8" role="img" aria-label={`Heart rate ${bpm} beats per minute`}>
            <span className="elab-beat text-7xl" style={{ animationDuration: `${60 / Math.max(40, bpm)}s` }} aria-hidden>❤️</span>
            <span className="ml-5 font-mono text-5xl font-bold" style={{ color: C }}>{bpm}<span className="ml-1 text-base text-white/50">bpm</span></span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <LabButton color={C} onClick={exercise} disabled={activity === "rest"}>▶ Exercise 1 minute</LabButton>
            <LabButton variant="ghost" onClick={rest}>Rest 1 minute</LabButton>
            <LabButton variant="ghost" onClick={() => reset()}>Reset</LabButton>
          </div>
        </Panel>
        <Panel title="The learner">
          <div className="space-y-4">
            <Segmented label="Activity" value={activity} onChange={setActivity} color={C} options={ACTIVITIES.map((a) => ({ value: a.id, label: a.label }))} />
            <Slider label="Age" value={age} min={8} max={60} unit=" yrs" onChange={setAge} color={C} />
            <Slider label="Resting heart rate" value={resting} min={55} max={95} unit=" bpm" onChange={(v) => { setResting(v); reset(v); }} color={C} />
            <Slider label="Fitness" value={fitness} min={0} max={1} step={0.1} onChange={setFitness} color={C} format={(v) => (v < 0.34 ? "low" : v < 0.67 ? "average" : "high")} />
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Max heart rate" value={max} unit="bpm" color="#F472B6" />
          <Readout label="% of max" value={Math.round((bpm / max) * 100)} unit="%" color="#FACC15" />
          <Readout label="Recovery" value={phase.kind === "exercise" ? `≈ ${Math.round(recoveryTime(bpm, resting, fitness) / 60)}` : "—"} unit="min" color="#38BDF8" />
        </div>
        <Panel title="Heart rate against time">
          <Chart title="Heart rate against time" xLabel="Time (min)" yLabel="Heart rate (bpm)" xMax={Math.max(10, Math.ceil(t))} yMax={Math.ceil(Math.max(120, max) / 20) * 20}
            series={[{ points, color: C, kind: "line" }, { points: [[0, resting], [Math.max(10, Math.ceil(t)), resting]], color: "rgba(255,255,255,.3)", dashed: true }]} />
        </Panel>
        <Insight color={C}>
          Muscles need more oxygen and glucose during exercise, and more carbon dioxide must be removed, so the heart
          beats faster to pump more blood. Afterwards the rate falls back to resting — a <b>fitter</b> heart pumps more
          blood per beat, so it rises less and <b>recovers faster</b>.
        </Insight>
        <Challenge>Jog for 3 minutes, then rest for 5. Repeat with high fitness. How much shorter is the recovery time?</Challenge>
      </div>
    </div>
  );
}
