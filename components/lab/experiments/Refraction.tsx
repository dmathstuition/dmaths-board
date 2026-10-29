"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Segmented, Insight, Challenge } from "@/components/lab/LabUI";
import { MEDIA, refractedAngle, criticalAngle } from "@/lib/lab/sims";

const C = "#F59E0B";
const CX = 200, CY = 160, L = 150;
const tint: Record<string, string> = { Air: "rgba(255,255,255,.02)", Water: "rgba(56,189,248,.18)", Glass: "rgba(148,163,184,.22)", Diamond: "rgba(167,139,250,.25)" };

export default function Refraction() {
  const [from, setFrom] = useState("Glass");
  const [to, setTo] = useState("Air");
  const [inc, setInc] = useState(30);
  const n1 = MEDIA.find((m) => m.label === from)!.n, n2 = MEDIA.find((m) => m.label === to)!.n;
  const ref = refractedAngle(n1, n2, inc);
  const crit = criticalAngle(n1, n2);
  const tir = ref === null;
  const r = (deg: number) => (deg * Math.PI) / 180;

  // Incident ray arrives from the upper-left; refracted ray continues lower-right;
  // the reflected ray goes upper-right (strong when totally internally reflected).
  const ix = CX - L * Math.sin(r(inc)), iy = CY - L * Math.cos(r(inc));
  const rx = CX + L * Math.sin(r(inc)), ry = iy;
  const tx = ref === null ? CX : CX + L * Math.sin(r(ref)), ty = ref === null ? CY : CY + L * Math.cos(r(ref));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel title="Ray box">
          <svg viewBox="0 0 400 320" className="h-auto w-full rounded-2xl bg-black/40" role="img"
            aria-label={tir ? `Total internal reflection at ${inc} degrees` : `Ray bends from ${inc} to ${ref!.toFixed(1)} degrees`}>
            <rect x="0" y="0" width="400" height={CY} fill={tint[from]} />
            <rect x="0" y={CY} width="400" height={320 - CY} fill={tint[to]} />
            <text x="12" y="20" fontSize="12" fontWeight="800" fill="rgba(255,255,255,.6)">{from} (n = {n1})</text>
            <text x="12" y="308" fontSize="12" fontWeight="800" fill="rgba(255,255,255,.6)">{to} (n = {n2})</text>
            <line x1="0" x2="400" y1={CY} y2={CY} stroke="rgba(255,255,255,.4)" />
            <line x1={CX} x2={CX} y1="10" y2="310" stroke="rgba(255,255,255,.35)" strokeDasharray="5 5" />
            <text x={CX + 4} y="22" fontSize="10" fill="rgba(255,255,255,.45)">normal</text>
            {/* incident */}
            <line x1={ix} y1={iy} x2={CX} y2={CY} stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" className="elab-flow" strokeDasharray="14 6" />
            {/* reflected (always a little; all of it when TIR) */}
            <line x1={CX} y1={CY} x2={rx} y2={ry} stroke="#FDE047" strokeWidth={tir ? 3.5 : 1.5} strokeOpacity={tir ? 1 : 0.3} strokeLinecap="round" />
            {/* refracted */}
            {!tir && <line x1={CX} y1={CY} x2={tx} y2={ty} stroke="#FB923C" strokeWidth="3.5" strokeLinecap="round" />}
            <path d={`M ${CX} ${CY - 40} A 40 40 0 0 0 ${CX - 40 * Math.sin(r(inc))} ${CY - 40 * Math.cos(r(inc))}`} fill="none" stroke="#FDE047" strokeWidth="1.5" />
            <text x={CX - 52} y={CY - 46} fontSize="11" fill="#FDE047" fontWeight="700">{inc}°</text>
            {!tir && <>
              <path d={`M ${CX} ${CY + 40} A 40 40 0 0 0 ${CX + 40 * Math.sin(r(ref!))} ${CY + 40 * Math.cos(r(ref!))}`} fill="none" stroke="#FB923C" strokeWidth="1.5" />
              <text x={CX + 14} y={CY + 58} fontSize="11" fill="#FB923C" fontWeight="700">{ref!.toFixed(1)}°</text>
            </>}
            {tir && <text x="200" y={CY + 40} textAnchor="middle" fontSize="14" fontWeight="800" fill="#F87171" className="elab-pop">Total internal reflection!</text>}
          </svg>
        </Panel>
        <Panel title="Setup">
          <div className="space-y-4">
            <Segmented label="Ray starts in" value={from} onChange={setFrom} color="#FDE047" options={MEDIA.map((m) => ({ value: m.label, label: m.label }))} />
            <Segmented label="Ray enters" value={to} onChange={setTo} color="#FB923C" options={MEDIA.map((m) => ({ value: m.label, label: m.label }))} />
            <Slider label="Angle of incidence" value={inc} min={0} max={89} unit="°" color="#FDE047" onChange={setInc} />
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Incidence θ₁" value={inc} unit="°" color="#FDE047" />
          <Readout label="Refraction θ₂" value={tir ? "TIR" : ref!.toFixed(1)} unit={tir ? undefined : "°"} color="#FB923C" />
          <Readout label="Critical angle" value={crit === null ? "none" : crit.toFixed(1)} unit={crit === null ? undefined : "°"} color="#F87171" />
        </div>
        <Insight color={C}>
          Light slows down in denser materials and bends <b>towards</b> the normal going in, <b>away</b> from it coming
          out: <b>n₁ sin θ₁ = n₂ sin θ₂</b>. Going from a dense material into a less dense one, any angle bigger than
          the <b>critical angle</b> (sin c = n₂ ⁄ n₁) can&apos;t escape and is totally reflected — that&apos;s how optical
          fibres and diamonds sparkle.
        </Insight>
        <Challenge>Find the critical angle for glass → air by sliding until the ray just skims the surface. Compare it with water → air and diamond → air.</Challenge>
      </div>
    </div>
  );
}
