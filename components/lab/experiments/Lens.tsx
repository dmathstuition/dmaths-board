"use client";
import { useState } from "react";
import { Panel, Slider, Readout, Insight, Challenge } from "@/components/lab/LabUI";
import { imageDistance, magnification, imageNature } from "@/lib/lab/sims";

const C = "#F59E0B";

export default function Lens() {
  const [f, setF] = useState(10);
  const [u, setU] = useState(25);
  const v = imageDistance(u, f);
  const m = magnification(u, f);
  const nature = imageNature(u, f);

  // Optical bench: lens at x=330, 8 px per cm, axis at y=170, object 50 px tall.
  const S = 8, LX = 330, AY = 170, OH = 50;
  const ox = LX - u * S;
  const ix = v === null ? null : LX + v * S;
  const ih = m === null ? 0 : -m * OH; // image height (up is positive)
  const F1 = LX - f * S, F2 = LX + f * S;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-5">
        <Panel title="Ray diagram">
          <svg viewBox="0 0 660 340" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={nature ? `Image is ${nature.real ? "real" : "virtual"}, ${nature.inverted ? "inverted" : "upright"} and ${nature.size}` : "Object at the focal point: no image forms"}>
            <defs>
              <clipPath id="bench"><rect x="0" y="0" width="660" height="340" /></clipPath>
              <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#FDE68A" /></marker>
            </defs>
            <line x1="0" x2="660" y1={AY} y2={AY} stroke="rgba(255,255,255,.3)" strokeDasharray="4 4" />
            {/* lens */}
            <ellipse cx={LX} cy={AY} rx="10" ry="110" fill="rgba(56,189,248,.18)" stroke="#38BDF8" strokeWidth="2" />
            {[F1, F2].map((x, i) => (
              <g key={i}><circle cx={x} cy={AY} r="4" fill="#F472B6" /><text x={x} y={AY + 18} fontSize="11" textAnchor="middle" fill="#F9A8D4">F</text></g>
            ))}
            {[LX - 2 * f * S, LX + 2 * f * S].map((x, i) => (
              <g key={i}><circle cx={x} cy={AY} r="3" fill="#A78BFA" /><text x={x} y={AY + 18} fontSize="11" textAnchor="middle" fill="#C4B5FD">2F</text></g>
            ))}
            <g clipPath="url(#bench)">
              {/* object */}
              <line x1={ox} x2={ox} y1={AY} y2={AY - OH} stroke="#34D399" strokeWidth="4" markerEnd="url(#arr)" />
              {ix !== null && (
                <>
                  {/* ray 1: parallel to axis, then through F2 */}
                  <line x1={ox} y1={AY - OH} x2={LX} y2={AY - OH} stroke="#FDE68A" strokeWidth="1.5" />
                  <line x1={LX} y1={AY - OH} x2={LX + 900} y2={AY - OH + ((AY - (AY - OH)) / (F2 - LX)) * 900} stroke="#FDE68A" strokeWidth="1.5" />
                  {/* ray 2: through optical centre, undeviated */}
                  <line x1={ox} y1={AY - OH} x2={LX + 900} y2={AY - OH + (OH / (LX - ox)) * 900} stroke="#FCA5A5" strokeWidth="1.5" />
                  {/* virtual image: dashed back-extensions */}
                  {!nature?.real && (
                    <>
                      <line x1={LX} y1={AY - OH} x2={ix} y2={AY - ih} stroke="#FDE68A" strokeDasharray="5 4" />
                      <line x1={ox} y1={AY - OH} x2={ix} y2={AY - ih} stroke="#FCA5A5" strokeDasharray="5 4" />
                    </>
                  )}
                  {/* image */}
                  <line x1={ix} x2={ix} y1={AY} y2={AY - ih} stroke="#F472B6" strokeWidth="4" strokeDasharray={nature?.real ? undefined : "6 4"} markerEnd="url(#arr)" />
                </>
              )}
            </g>
            <text x="12" y="22" fontSize="12" fill="rgba(255,255,255,.6)">Object</text>
            <text x="648" y="22" fontSize="12" textAnchor="end" fill="rgba(255,255,255,.6)">Screen side</text>
          </svg>
        </Panel>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Image distance v" value={v === null ? "∞" : v.toFixed(1)} unit="cm" color="#F472B6" />
          <Readout label="Magnification" value={m === null ? "—" : Math.abs(m).toFixed(2)} unit="×" color={C} />
          <Readout label="Image" value={nature ? (nature.real ? "Real" : "Virtual") : "None"} color="#34D399" />
        </div>
      </div>
      <div className="space-y-5">
        <Panel title="Controls">
          <div className="space-y-4">
            <Slider label="Object distance u" value={u} min={3} max={40} step={0.5} unit=" cm" color="#34D399" onChange={setU} />
            <Slider label="Focal length f" value={f} min={5} max={15} unit=" cm" color={C} onChange={setF} />
          </div>
          {nature && (
            <p className="mt-4 text-sm text-white/75">
              The image is <b>{nature.real ? "real" : "virtual"}</b>, <b>{nature.inverted ? "inverted" : "upright"}</b> and <b>{nature.size}</b>.
              {!nature.real && " This is how a magnifying glass works."}
            </p>
          )}
          {!nature && <p className="mt-4 text-sm text-amber-200">Object at F: the rays leave parallel, so no image forms.</p>}
        </Panel>
        <Insight color={C}>
          For a thin converging lens, <b>1/f = 1/u + 1/v</b> and magnification <b>m = v/u</b>. Beyond 2F the image is
          diminished (a camera); between F and 2F it is magnified (a projector); inside F it is virtual and upright.
        </Insight>
        <Challenge>Find the object distance where the image is exactly the same size as the object. What is special about it?</Challenge>
      </div>
    </div>
  );
}
