"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge, Segmented } from "@/components/lab/LabUI";
import { solidVolume, solidSurface, type Solid } from "@/lib/lab/sims";

const C = "#38BDF8";
const FORMULA: Record<Solid, { v: string; s: string }> = {
  cylinder: { v: "V = πr²h", s: "A = 2πr(r + h)" },
  cone: { v: "V = ⅓πr²h", s: "A = πr(r + l),  l = √(r² + h²)" },
  sphere: { v: "V = ⁴⁄₃πr³", s: "A = 4πr²" },
  cuboid: { v: "V = l × w × h", s: "A = 2(lw + lh + wh)" },
};

// A simple oblique-projection drawing of each solid, scaled to fit the stage.
function Drawing({ s, r, h, w }: { s: Solid; r: number; h: number; w: number }) {
  const k = 150 / Math.max(2 * r, h, s === "cuboid" ? r + w * 0.5 : 0, 1);
  const R = r * k, H = h * k, Wd = w * k;
  const cx = 170, base = 260;
  const ry = R * 0.32;
  if (s === "sphere") {
    return (
      <g>
        <circle cx={cx} cy={base - R} r={R} fill="rgba(56,189,248,.25)" stroke={C} strokeWidth="2.5" />
        <ellipse cx={cx} cy={base - R} rx={R} ry={R * 0.3} fill="none" stroke={C} strokeDasharray="5 4" />
        <line x1={cx} y1={base - R} x2={cx + R} y2={base - R} stroke="#FDE68A" strokeWidth="2" />
        <text x={cx + R / 2} y={base - R - 6} fontSize="12" textAnchor="middle" fill="#FDE68A">r</text>
      </g>
    );
  }
  if (s === "cuboid") {
    const dx = Wd * 0.5, dy = Wd * 0.35, x0 = cx - R / 2 - dx / 2;
    return (
      <g stroke={C} strokeWidth="2.5" fill="rgba(56,189,248,.18)" strokeLinejoin="round">
        <path d={`M${x0} ${base} h${R} v${-H} h${-R} Z`} />
        <path d={`M${x0} ${base - H} l${dx} ${-dy} h${R} l${-dx} ${dy} Z`} fill="rgba(56,189,248,.3)" />
        <path d={`M${x0 + R} ${base} l${dx} ${-dy} v${-H} l${-dx} ${dy} Z`} fill="rgba(56,189,248,.1)" />
        <text x={x0 + R / 2} y={base + 16} fontSize="12" textAnchor="middle" fill="#FDE68A" stroke="none">l</text>
        <text x={x0 - 10} y={base - H / 2} fontSize="12" textAnchor="middle" fill="#FDE68A" stroke="none">h</text>
        <text x={x0 + R + dx / 2 + 10} y={base - dy / 2 + 4} fontSize="12" fill="#FDE68A" stroke="none">w</text>
      </g>
    );
  }
  return (
    <g>
      {s === "cylinder" ? (
        <>
          <path d={`M${cx - R} ${base - H} V${base} A${R} ${ry} 0 0 0 ${cx + R} ${base} V${base - H}`} fill="rgba(56,189,248,.2)" stroke={C} strokeWidth="2.5" />
          <ellipse cx={cx} cy={base - H} rx={R} ry={ry} fill="rgba(56,189,248,.35)" stroke={C} strokeWidth="2.5" />
          <path d={`M${cx - R} ${base} A${R} ${ry} 0 0 1 ${cx + R} ${base}`} fill="none" stroke={C} strokeDasharray="5 4" />
        </>
      ) : (
        <>
          <path d={`M${cx - R} ${base} L${cx} ${base - H} L${cx + R} ${base} A${R} ${ry} 0 0 1 ${cx - R} ${base}`} fill="rgba(56,189,248,.2)" stroke={C} strokeWidth="2.5" />
          <path d={`M${cx - R} ${base} A${R} ${ry} 0 0 1 ${cx + R} ${base}`} fill="none" stroke={C} strokeDasharray="5 4" />
          <line x1={cx} y1={base - H} x2={cx + R} y2={base} stroke="#34D399" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x={cx + R / 2 + 10} y={base - H / 2} fontSize="12" fill="#6EE7B7">l</text>
        </>
      )}
      <line x1={cx} y1={base} x2={cx + R} y2={base} stroke="#FDE68A" strokeWidth="2" />
      <text x={cx + R / 2} y={base - 6} fontSize="12" textAnchor="middle" fill="#FDE68A">r</text>
      <line x1={cx} y1={base} x2={cx} y2={base - H} stroke="#F472B6" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={cx - 10} y={base - H / 2} fontSize="12" textAnchor="middle" fill="#F9A8D4">h</text>
    </g>
  );
}

export default function Mensuration() {
  const [solid, setSolid] = useState<Solid>("cylinder");
  const [r, setR] = useState(4);
  const [h, setH] = useState(10);
  const [w, setW] = useState(3);
  const V = solidVolume(solid, r, h, w);
  const A = solidSurface(solid, r, h, w);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Panel title="Solid">
          <svg viewBox="0 0 340 290" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={`${solid} with volume ${V.toFixed(1)} cubic centimetres`}>
            <Drawing s={solid} r={r} h={h} w={w} />
          </svg>
        </Panel>
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Volume" value={V.toFixed(1)} unit="cm³" color={C} big />
          <Readout label="Surface area" value={A.toFixed(1)} unit="cm²" color="#F472B6" big />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Dimensions">
          <div className="space-y-4">
            <Segmented<Solid> label="Solid" value={solid} onChange={setSolid} color={C} options={[
              { value: "cylinder", label: "Cylinder" }, { value: "cone", label: "Cone" },
              { value: "sphere", label: "Sphere" }, { value: "cuboid", label: "Cuboid" },
            ]} />
            <Slider label={solid === "cuboid" ? "Length l" : "Radius r"} value={r} min={1} max={12} step={0.5} unit=" cm" color="#FDE68A" onChange={setR} />
            {solid !== "sphere" && <Slider label="Height h" value={h} min={1} max={20} step={0.5} unit=" cm" color="#F472B6" onChange={setH} />}
            {solid === "cuboid" && <Slider label="Width w" value={w} min={1} max={12} step={0.5} unit=" cm" color="#34D399" onChange={setW} />}
          </div>
          <div className="mt-4 rounded-xl bg-black/25 p-3 font-mono text-sm text-white/80">
            <p>{FORMULA[solid].v}</p><p className="mt-1">{FORMULA[solid].s}</p>
          </div>
        </Panel>
        <Insight color={C}>
          A cone holds exactly <b>one third</b> of the cylinder with the same base and height. Double every length of
          a solid and its surface area grows <b>4×</b> but its volume grows <b>8×</b> — which is why big animals
          lose heat more slowly than small ones.
        </Insight>
        <Challenge>Find a cylinder whose volume equals its surface area in number. (Hint: try r = 4 and adjust h.)</Challenge>
      </div>
    </div>
  );
}
