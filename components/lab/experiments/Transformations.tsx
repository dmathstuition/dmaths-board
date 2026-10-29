"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Segmented, Insight, Challenge } from "@/components/lab/LabUI";
import { translate, reflect, rotate, enlarge, polygonArea, type Pt, type Mirror } from "@/lib/lab/sims";

const OBJ = "#38BDF8", IMG = "#F472B6";
const G = 8, S = 22, W = (2 * G) * S; // grid −8…8, 22px per unit
const px = ([x, y]: Pt) => `${(x + G) * S},${(G - y) * S}`;

const SHAPES: Record<string, Pt[]> = {
  triangle: [[1, 1], [4, 1], [1, 3]],
  flag: [[1, 1], [1, 4], [3, 4], [3, 3], [2, 3], [2, 1]],
  square: [[1, 1], [3, 1], [3, 3], [1, 3]],
};
type Kind = "translate" | "reflect" | "rotate" | "enlarge";
const LETTERS = "ABCDEF";
const MIRROR_LINE: Record<Mirror, [Pt, Pt]> = { "x-axis": [[-G, 0], [G, 0]], "y-axis": [[0, -G], [0, G]], "y=x": [[-G, -G], [G, G]], "y=-x": [[-G, G], [G, -G]] };

export default function Transformations() {
  const [shape, setShape] = useState("triangle");
  const [kind, setKind] = useState<Kind>("reflect");
  const [dx, setDx] = useState(-5);
  const [dy, setDy] = useState(-4);
  const [mirror, setMirror] = useState<Mirror>("y-axis");
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [k, setK] = useState(2);
  const obj = SHAPES[shape];
  const img = kind === "translate" ? translate(obj, dx, dy) : kind === "reflect" ? reflect(obj, mirror) : kind === "rotate" ? rotate(obj, angle) : enlarge(obj, k);
  const describe = kind === "translate" ? `Translation by the vector (${dx}, ${dy})` : kind === "reflect" ? `Reflection in the line ${mirror}` : kind === "rotate" ? `Rotation ${angle}° anticlockwise about the origin` : `Enlargement, scale factor ${k}, centre the origin`;
  const a0 = polygonArea(obj), a1 = polygonArea(img);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Panel title="Grid" right={<span className="text-xs font-bold text-white/60">{describe}</span>}>
          <svg viewBox={`0 0 ${W} ${W}`} className="mx-auto h-auto w-full max-w-[460px] rounded-2xl bg-black/30" role="img"
            aria-label={`${describe}. Object vertices ${obj.map((p) => `(${p})`).join(", ")}; image ${img.map((p) => `(${p})`).join(", ")}.`}>
            {Array.from({ length: 2 * G + 1 }, (_, i) => i - G).map((g) => (
              <g key={g}>
                <line x1={(g + G) * S} x2={(g + G) * S} y1={0} y2={W} stroke={g === 0 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.07)"} />
                <line y1={(g + G) * S} y2={(g + G) * S} x1={0} x2={W} stroke={g === 0 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.07)"} />
                {g !== 0 && g % 2 === 0 && <text x={(g + G) * S} y={G * S + 13} fontSize="9" textAnchor="middle" fill="rgba(255,255,255,.4)">{g}</text>}
                {g !== 0 && g % 2 === 0 && <text x={G * S - 5} y={(G - g) * S + 3} fontSize="9" textAnchor="end" fill="rgba(255,255,255,.4)">{g}</text>}
              </g>
            ))}
            {kind === "reflect" && (
              <polyline points={MIRROR_LINE[mirror].map(px).join(" ")} stroke="#FACC15" strokeWidth="2.5" strokeDasharray="7 5" />
            )}
            {(kind === "rotate" || kind === "enlarge") && <circle cx={G * S} cy={G * S} r="5" fill="#FACC15" />}
            {kind === "enlarge" && obj.map((p, i) => (
              <polyline key={i} points={[[0, 0] as Pt, img[i]].map(px).join(" ")} stroke="rgba(250,204,21,.35)" strokeDasharray="3 4" />
            ))}
            <polygon points={obj.map(px).join(" ")} fill={`${OBJ}55`} stroke={OBJ} strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points={img.map(px).join(" ")} fill={`${IMG}55`} stroke={IMG} strokeWidth="2.5" strokeLinejoin="round" className="elab-pop" key={describe} />
            {obj.map((p, i) => <text key={`o${i}`} x={(p[0] + G) * S + 4} y={(G - p[1]) * S - 4} fontSize="11" fontWeight="800" fill={OBJ}>{LETTERS[i]}</text>)}
            {img.map((p, i) => <text key={`i${i}`} x={(p[0] + G) * S + 4} y={(G - p[1]) * S - 4} fontSize="11" fontWeight="800" fill={IMG}>{LETTERS[i]}′</text>)}
          </svg>
        </Panel>
        <Panel title="Transformation">
          <div className="space-y-4">
            <Segmented label="Shape" value={shape} onChange={setShape} color={OBJ}
              options={[{ value: "triangle", label: "Triangle" }, { value: "flag", label: "Flag" }, { value: "square", label: "Square" }]} />
            <Segmented label="Transformation" value={kind} onChange={(v) => setKind(v as Kind)} color={IMG}
              options={[{ value: "translate", label: "Translate" }, { value: "reflect", label: "Reflect" }, { value: "rotate", label: "Rotate" }, { value: "enlarge", label: "Enlarge" }]} />
            {kind === "translate" && <>
              <Slider label="Move right (x)" value={dx} min={-7} max={4} color={IMG} onChange={setDx} />
              <Slider label="Move up (y)" value={dy} min={-7} max={4} color={IMG} onChange={setDy} />
            </>}
            {kind === "reflect" && <Segmented label="Mirror line" value={mirror} onChange={(v) => setMirror(v as Mirror)} color="#FACC15"
              options={(["x-axis", "y-axis", "y=x", "y=-x"] as Mirror[]).map((m) => ({ value: m, label: m }))} />}
            {kind === "rotate" && <Segmented label="Angle" value={String(angle)} onChange={(v) => setAngle(Number(v) as 90 | 180 | 270)} color="#FACC15"
              options={[{ value: "90", label: "90°" }, { value: "180", label: "180°" }, { value: "270", label: "270°" }]} />}
            {kind === "enlarge" && <Segmented label="Scale factor" value={String(k)} onChange={(v) => setK(Number(v))} color="#FACC15"
              options={["-2", "-1", "0.5", "1.5", "2"].map((v) => ({ value: v, label: `×${v.replace("-", "−")}` }))} />}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Readout label="Object area" value={a0} unit="sq units" color={OBJ} />
          <Readout label="Image area" value={a1} unit="sq units" color={IMG} />
        </div>
        <Panel title="Coordinates">
          <table className="w-full text-left text-sm text-white/75">
            <thead><tr className="text-xs text-white/40"><th className="py-1">Vertex</th><th>Object</th><th>Image</th></tr></thead>
            <tbody>{obj.map((p, i) => (
              <tr key={i} className="border-t border-white/5 font-mono">
                <td className="py-1.5 font-bold">{LETTERS[i]}</td>
                <td style={{ color: OBJ }}>({p[0]}, {p[1]})</td>
                <td style={{ color: IMG }}>({img[i][0]}, {img[i][1]})</td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <Insight color={IMG}>
          Translations, reflections and rotations keep the shape the <b>same size</b> — they are congruent. An
          enlargement with scale factor k multiplies lengths by k and the <b>area by k²</b>. A negative scale factor
          flips the image through the centre.
        </Insight>
        <Challenge>
          Reflect the flag in y = x, then compare it with a rotation of 90°. Are the images the same? Which single
          transformation maps (1, 1) to (−1, −1)?
        </Challenge>
      </div>
    </div>
  );
}
