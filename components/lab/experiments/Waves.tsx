"use client";
import { useEffect, useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, Segmented } from "@/components/lab/LabUI";
import { WAVE_MEDIA, wavelength, wavePeriod } from "@/lib/lab/sims";

const C = "#F59E0B";
type MediumId = (typeof WAVE_MEDIA)[number]["id"];

export default function Waves() {
  const [medium, setMedium] = useState<MediumId>("rope");
  const [freq, setFreq] = useState(2);
  const [amp, setAmp] = useState(40);
  const [phase, setPhase] = useState(0);
  const md = WAVE_MEDIA.find((x) => x.id === medium)!;
  const lam = wavelength(md.speed, freq);
  const T = wavePeriod(freq);

  // Draw a fixed number of wavelengths on screen so the shape is always readable;
  // the wavelength readout carries the real value for the medium.
  const cycles = Math.max(2, Math.min(6, freq));
  const W = 600, pxPerLam = W / cycles;

  useEffect(() => {
    let raf = 0, last = performance.now();
    const step = (now: number) => {
      // Animation slowed so 1 Hz = one cycle every 1.5 s on screen.
      setPhase((p) => (p + ((now - last) / 1500) * Math.min(freq, 6) * 2 * Math.PI) % (2 * Math.PI));
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [freq]);

  const pts = Array.from({ length: 241 }, (_, i) => {
    const x = (i / 240) * W;
    const y = 130 - amp * Math.sin((2 * Math.PI * x) / pxPerLam - phase);
    return `${(x + 20).toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const markerX = 20 + ((phase / (2 * Math.PI)) * pxPerLam) % W;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-5">
        <Panel title={`Transverse wave · ${md.label}`}>
          <svg viewBox="0 0 640 260" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Wave with frequency ${freq} hertz and wavelength ${lam.toFixed(2)} metres`}>
            <line x1="20" x2="620" y1="130" y2="130" stroke="rgba(255,255,255,.2)" strokeDasharray="4 4" />
            <polyline points={pts} fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinejoin="round" />
            {/* a marked particle only moves up and down */}
            <circle cx="140" cy={(130 - amp * Math.sin((2 * Math.PI * 120) / pxPerLam - phase)).toFixed(1)} r="7" fill="#F472B6" />
            {/* wavelength bracket between two crests */}
            {(() => {
              const crest = 20 + (((phase / (2 * Math.PI)) + 0.25) * pxPerLam) % pxPerLam;
              return (
                <g>
                  <line x1={crest} x2={crest + pxPerLam} y1={130 - amp - 16} y2={130 - amp - 16} stroke={C} strokeWidth="2" />
                  <line x1={crest} x2={crest} y1={130 - amp - 22} y2={130 - amp - 10} stroke={C} strokeWidth="2" />
                  <line x1={crest + pxPerLam} x2={crest + pxPerLam} y1={130 - amp - 22} y2={130 - amp - 10} stroke={C} strokeWidth="2" />
                  <text x={crest + pxPerLam / 2} y={130 - amp - 24} fontSize="13" textAnchor="middle" fill="#FDE68A" fontWeight="700">λ</text>
                </g>
              );
            })()}
            <line x1="610" x2="610" y1="130" y2={130 - amp} stroke="#34D399" strokeWidth="2" />
            <text x="604" y={130 - amp / 2} fontSize="12" textAnchor="end" fill="#6EE7B7">A</text>
            <line x1={markerX} x2={markerX} y1="235" y2="250" stroke="rgba(255,255,255,.3)" />
            <text x="320" y="252" fontSize="11" textAnchor="middle" fill="rgba(255,255,255,.5)">Energy travels this way →  · the pink particle only moves up and down</text>
          </svg>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Wave speed v" value={md.speed} unit="m/s" color="#34D399" />
          <Readout label="Wavelength λ" value={lam >= 100 ? lam.toFixed(0) : lam.toFixed(2)} unit="m" color={C} />
          <Readout label="Period T" value={T.toFixed(2)} unit="s" color="#F472B6" />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Controls">
          <div className="space-y-4">
            <Segmented<MediumId> label="Medium" value={medium} onChange={setMedium} color={C}
              options={WAVE_MEDIA.map((x) => ({ value: x.id, label: x.label }))} />
            <Slider label="Frequency f" value={freq} min={0.5} max={10} step={0.5} unit=" Hz" color={C} onChange={setFreq} />
            <Slider label="Amplitude" value={amp} min={10} max={80} unit=" px" color="#34D399" onChange={setAmp} />
          </div>
        </Panel>
        <Insight color={C}>
          Every wave obeys <b>v = f λ</b>. The medium sets the speed, so raising the frequency makes the wavelength
          shorter. The period is <b>T = 1/f</b>. Amplitude carries energy but does not change the speed.
        </Insight>
        <Challenge>Sound in air travels at 340 m/s. What frequency gives a wavelength of 0.5 m? Check it with the sliders (switch to “Sound in air”).</Challenge>
      </div>
    </div>
  );
}
