"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, Segmented } from "@/components/lab/LabUI";
import { centralAngle, inscribedAngle, onMajorArc } from "@/lib/lab/sims";

const C = "#38BDF8";
type Theorem = "centre" | "semicircle" | "same-segment";

export default function CircleTheorems() {
  const [theorem, setTheorem] = useState<Theorem>("centre");
  const [a, setA] = useState(210);
  const [b, setB] = useState(330);
  const [p, setP] = useState(90);
  const [q, setQ] = useState(130);

  const A = theorem === "semicircle" ? 180 : a;
  const B = theorem === "semicircle" ? 0 : b;
  const R = 120, CX = 170, CY = 160;
  // Rounded so the server and browser render identical coordinates.
  const pt = (deg: number) => [+(CX + R * Math.cos((deg * Math.PI) / 180)).toFixed(2), +(CY - R * Math.sin((deg * Math.PI) / 180)).toFixed(2)] as const;
  const [ax, ay] = pt(A), [bx, by] = pt(B), [px, py] = pt(p), [qx, qy] = pt(q);
  const centre = centralAngle(A, B);
  const atP = inscribedAngle(A, B, p);
  const atQ = inscribedAngle(A, B, q);
  const major = onMajorArc(A, B, p);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Circle">
          <svg viewBox="0 0 340 330" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`Angle at the centre ${centre.toFixed(0)} degrees, angle at P ${atP.toFixed(0)} degrees`}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(255,255,255,.2)" />
            {theorem === "centre" && (
              <g>
                <line x1={CX} y1={CY} x2={ax} y2={ay} stroke="#F472B6" strokeWidth="2.5" />
                <line x1={CX} y1={CY} x2={bx} y2={by} stroke="#F472B6" strokeWidth="2.5" />
                <circle cx={CX} cy={CY} r="4" fill="#F472B6" />
                <text x={CX + 8} y={CY + 18} fontSize="13" fill="#F9A8D4" fontWeight="700">O</text>
              </g>
            )}
            <line x1={px} y1={py} x2={ax} y2={ay} stroke={C} strokeWidth="2.5" />
            <line x1={px} y1={py} x2={bx} y2={by} stroke={C} strokeWidth="2.5" />
            {theorem === "same-segment" && (
              <g>
                <line x1={qx} y1={qy} x2={ax} y2={ay} stroke="#34D399" strokeWidth="2.5" />
                <line x1={qx} y1={qy} x2={bx} y2={by} stroke="#34D399" strokeWidth="2.5" />
                <circle cx={qx} cy={qy} r="6" fill="#34D399" />
                <text x={qx + (qx - CX) * 0.12} y={qy + (qy - CY) * 0.12} fontSize="13" fill="#6EE7B7" fontWeight="700">Q</text>
              </g>
            )}
            {[[ax, ay, "A"], [bx, by, "B"]].map(([x, y, l]) => (
              <g key={l as string}><circle cx={x as number} cy={y as number} r="6" fill="#FDE68A" />
                <text x={(x as number) + ((x as number) - CX) * 0.12} y={(y as number) + ((y as number) - CY) * 0.12 + 4} fontSize="13" fill="#FDE68A" fontWeight="700" textAnchor="middle">{l}</text></g>
            ))}
            <circle cx={px} cy={py} r="7" fill={C} />
            <text x={px + (px - CX) * 0.13} y={py + (py - CY) * 0.13 + 4} fontSize="13" fill="#7DD3FC" fontWeight="700" textAnchor="middle">P</text>
          </svg>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          {theorem === "centre" && <Readout label="∠AOB (centre)" value={centre.toFixed(0)} unit="°" color="#F472B6" />}
          <Readout label="∠APB" value={atP.toFixed(0)} unit="°" color={C} />
          {theorem === "same-segment" && <Readout label="∠AQB" value={atQ.toFixed(0)} unit="°" color="#34D399" />}
          {theorem === "centre" && <Readout label="Ratio" value={(centre / atP).toFixed(2)} color="#FDE68A" />}
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Theorem">
          <div className="space-y-4">
            <Segmented<Theorem> label="Theorem" value={theorem} onChange={setTheorem} color={C} options={[
              { value: "centre", label: "Angle at centre" },
              { value: "semicircle", label: "Semicircle" },
              { value: "same-segment", label: "Same segment" },
            ]} />
            {theorem !== "semicircle" && (
              <>
                <Slider label="Position of A" value={a} min={0} max={359} unit="°" color="#FDE68A" onChange={setA} />
                <Slider label="Position of B" value={b} min={0} max={359} unit="°" color="#FDE68A" onChange={setB} />
              </>
            )}
            <Slider label="Position of P" value={p} min={0} max={359} unit="°" color={C} onChange={setP} />
            {theorem === "same-segment" && <Slider label="Position of Q" value={q} min={0} max={359} unit="°" color="#34D399" onChange={setQ} />}
          </div>
          {theorem === "centre" && !major && <p className="mt-3 text-sm text-amber-200">P is on the minor arc — here ∠APB = 180° − ½∠AOB (a cyclic quadrilateral).</p>}
        </Panel>
        <Insight color={C}>
          {theorem === "centre" && <>The angle subtended at the <b>centre</b> is <b>twice</b> the angle at the circumference standing on the same arc.</>}
          {theorem === "semicircle" && <>AB is a <b>diameter</b>, so the angle in a semicircle is always <b>90°</b> — wherever P sits.</>}
          {theorem === "same-segment" && <>Angles in the <b>same segment</b> are equal: ∠APB = ∠AQB while P and Q are on the same side of AB.</>}
        </Insight>
        <Challenge>Move P all the way round the circle. Where does the rule change, and why?</Challenge>
      </div>
    </div>
  );
}
