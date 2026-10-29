"use client";
import { useState } from "react";
import { Panel, Insight, Challenge, LabButton, Segmented } from "@/components/lab/LabUI";
import { FOODS, FOOD_TESTS, foodTestResult, type FoodTest } from "@/lib/lab/sims";

const C = "#84CC16";
type Cell = { positive: boolean; heated: boolean };

export default function FoodTests() {
  const [food, setFood] = useState(FOODS[0].id);
  const [test, setTest] = useState<FoodTest>("benedicts");
  const [heated, setHeated] = useState(false);
  const [done, setDone] = useState(false);
  const [table, setTable] = useState<Record<string, Cell>>({});

  const t = FOOD_TESTS.find((x) => x.id === test)!;
  const positive = done && foodTestResult(food, test, heated);
  const tubeColor = !done ? "#E2E8F0" : positive ? t.posColor : t.negColor;

  function run() {
    setDone(true);
    setTable((tb) => ({ ...tb, [`${food}:${test}`]: { positive: foodTestResult(food, test, heated), heated } }));
  }
  function change(fn: () => void) { fn(); setDone(false); setHeated(false); }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Panel title="Test tube">
          <svg viewBox="0 0 300 300" className="h-auto w-full rounded-2xl bg-black/30" role="img"
            aria-label={done ? `${t.label} test: ${positive ? t.positive : t.negative}` : "Sample ready to test"}>
            {/* water bath for Benedict's */}
            {test === "benedicts" && (
              <g>
                <rect x="70" y="150" width="160" height="110" rx="8" fill={heated ? "rgba(248,113,113,.18)" : "rgba(125,211,252,.12)"} stroke="rgba(255,255,255,.25)" />
                <text x="150" y="250" fontSize="11" textAnchor="middle" fill="rgba(255,255,255,.6)">{heated ? "Water bath ~80 °C" : "Water bath (off)"}</text>
                {heated && [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={95 + i * 26} cy={225 - (i % 2) * 18} r="3" fill="rgba(255,255,255,.55)" />)}
              </g>
            )}
            {/* tube */}
            <path d="M130 30 V210 Q130 240 150 240 Q170 240 170 210 V30" fill="rgba(255,255,255,.06)" stroke="#CBD5E1" strokeWidth="3" />
            <path d="M133 110 V210 Q133 236 150 236 Q167 236 167 210 V110 Z" fill={tubeColor} opacity={test === "emulsion" && done && positive ? 0.95 : 0.85}
              style={{ transition: "fill .9s ease" }} />
            {test === "benedicts" && done && positive && <path d="M135 200 Q150 236 165 200 Z" fill="#9A3412" />}
            <text x="150" y="285" fontSize="12" textAnchor="middle" fontWeight="700" fill={done ? (positive ? "#BEF264" : "rgba(255,255,255,.7)") : "rgba(255,255,255,.6)"}>
              {done ? (positive ? `Positive — ${t.positive}` : `Negative — ${t.negative}`) : `${FOODS.find((f) => f.id === food)!.label} + ${t.label}`}
            </text>
          </svg>
          <div className="mt-4 flex flex-wrap gap-2">
            {t.needsHeat && <LabButton variant="ghost" onClick={() => setHeated((h) => !h)}>{heated ? "Turn water bath off" : "Heat in water bath"}</LabButton>}
            <LabButton color={C} onClick={run}>Add reagent</LabButton>
          </div>
        </Panel>
        <Panel title="Choose">
          <div className="space-y-3">
            <Segmented label="Test" value={test} onChange={(v) => change(() => setTest(v))} color={C}
              options={FOOD_TESTS.map((x) => ({ value: x.id, label: x.label }))} />
            <div className="flex flex-wrap gap-1.5">
              {FOODS.map((f) => (
                <button key={f.id} type="button" onClick={() => change(() => setFood(f.id))} aria-pressed={food === f.id}
                  className={`min-h-[40px] rounded-xl border px-3 text-sm font-bold transition ${food === f.id ? "border-lime-300/60 bg-lime-300/15 text-lime-100" : "border-white/10 bg-black/25 text-white/70 hover:bg-white/5"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className="space-y-5">
        <Panel title="Results table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs text-white/75">
              <thead><tr className="text-white/45"><th className="py-2 pr-2">Food</th>{FOOD_TESTS.map((x) => <th key={x.id} className="px-1">{x.label}<span className="block font-normal text-white/35">{x.detects}</span></th>)}</tr></thead>
              <tbody>{FOODS.map((f) => (
                <tr key={f.id} className="border-t border-white/5">
                  <td className="py-2 pr-2 font-semibold">{f.label}</td>
                  {FOOD_TESTS.map((x) => {
                    const c = table[`${f.id}:${x.id}`];
                    return <td key={x.id} className="px-1">{c ? (c.positive ? <span className="font-bold text-lime-300">✓ present</span> : <span className="text-white/45">✗ absent{x.needsHeat && !c.heated ? " (not heated)" : ""}</span>) : <span className="text-white/20">—</span>}</td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
        <Insight color={C}>
          <b>Benedict&apos;s</b> (heated) turns brick-red with reducing sugars · <b>iodine</b> turns blue-black with starch ·
          <b> Biuret</b> turns purple with protein · shaking with <b>ethanol</b> then adding water gives a cloudy emulsion with fats.
          Distilled water is the <b>control</b>: it should test negative for everything.
        </Insight>
        <Challenge>Fill the whole table. Which food contains three nutrients? What happens if you forget to heat the Benedict&apos;s test?</Challenge>
      </div>
    </div>
  );
}
