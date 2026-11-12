"use client";
// The lab room: every piece of apparatus for physics, chemistry, biology and
// maths, on shelves by section. Open one to see what it is, its properties, how
// to use it safely, and try it out; pick what you need, set it out on your
// bench and plan a practical — checked against the real practical, with a risk
// assessment — then start it. Works without an account: the plan is kept on
// this device.
import { useEffect, useMemo, useRef, useState } from "react";
import { LAB, SUBJECTS, type LabSubject } from "@/lib/lab/catalog";
import { ROOMS, SECTIONS, type Item } from "@/lib/lab/room/inventory";
import { NEEDS, checkPlan, emptyPlan, riskAssessment, safetyItem, type Plan } from "@/lib/lab/room/plans";
import { Apparatus, BenchDefs, dims } from "@/components/lab/bench/Apparatus";
import TryIt from "@/components/lab/room/TryIt";

export const START_EVENT = "lab-room-start"; // detail: a practical's slug (the lab opens it)
const SUBS = Object.keys(SUBJECTS) as LabSubject[];
type Saved = { picked: string[]; pos: Record<string, { x: number; y: number }>; plan: Plan };
const KEY = (s: LabSubject) => `dm-lab-room:${s}`;
const load = (s: LabSubject): Saved => { try { const j = JSON.parse(localStorage.getItem(KEY(s)) ?? "null"); if (j && Array.isArray(j.picked)) return { picked: j.picked, pos: j.pos ?? {}, plan: { ...emptyPlan(), ...j.plan } }; } catch { /* storage blocked */ } return { picked: [], pos: {}, plan: emptyPlan() }; };
const chip = "min-h-[36px] shrink-0 rounded-full px-3 text-xs font-black";
const field = "w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]";

export function ItemPic({ item, size = 64 }: { item: Item; size?: number }) {
  if (!item.bench) return <span aria-hidden className="flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.55 }}>{item.icon}</span>;
  const it = { id: item.id, kind: item.bench.kind, x: 0, y: 0, props: item.bench.props ?? {} }, { w, h } = dims(it);
  if (w / h > 4 || h / w > 6) return <span aria-hidden className="flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.55 }}>{item.icon}</span>; // too long and thin to see small
  return <svg aria-hidden viewBox={`${-w / 2 - 12} ${-h - 12} ${w + 24} ${h + 24}`} style={{ width: size, height: size }}><Apparatus it={it} /></svg>;
}

export default function LabRoom({ subject: first = "physics" }: { subject?: LabSubject }) {
  const [subject, setSubject] = useState<LabSubject>(first);
  const [q, setQ] = useState(""), [section, setSection] = useState("all");
  const [open, setOpen] = useState<string | null>(null), [planning, setPlanning] = useState(false);
  const [saved, setSaved] = useState<Saved>(() => load(first));
  const [more, setMore] = useState(60);
  useEffect(() => { setSaved(load(subject)); setSection("all"); setMore(60); setQ(""); }, [subject]);
  const save = (fn: (s: Saved) => Saved) => setSaved((cur) => { const next = fn(cur); try { localStorage.setItem(KEY(subject), JSON.stringify(next)); } catch { /* storage blocked */ } return next; });
  const room = ROOMS[subject];
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return room.filter((x) => (section === "all" || x.sections.includes(section)) && (!t || x.name.toLowerCase().includes(t) || x.about.toLowerCase().includes(t)));
  }, [room, q, section]);
  const picked = saved.picked.map((id) => room.find((x) => x.id === id)).filter(Boolean) as Item[];
  const toggle = (id: string) => save((s) => ({ ...s, picked: s.picked.includes(id) ? s.picked.filter((x) => x !== id) : [...s.picked, id] }));
  const item = open ? room.find((x) => x.id === open) ?? null : null;
  const colour = SUBJECTS[subject].color;

  return (
    <section aria-label="Lab room" className="relative text-white">
      <svg width="0" height="0" className="absolute" aria-hidden><BenchDefs /></svg>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Which lab" className="flex gap-1.5 overflow-x-auto">
          {SUBS.map((s) => <button key={s} type="button" role="tab" aria-selected={subject === s} onClick={() => setSubject(s)} className={`${chip} ${subject === s ? "text-[#0B1220]" : "bg-white/10 text-white/80"}`} style={subject === s ? { background: SUBJECTS[s].color } : undefined}>{SUBJECTS[s].label} lab</button>)}
        </div>
        <label className="ml-auto w-full sm:w-64"><span className="sr-only">Search the apparatus</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${room.length} items — e.g. burette`} className="h-10 w-full rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]" />
        </label>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Shelves">
        {["all", ...SECTIONS[subject]].map((s) => <button key={s} type="button" aria-pressed={section === s} onClick={() => { setSection(s); setMore(60); }} className={`${chip} ${section === s ? "bg-white text-[#0B1220]" : "bg-white/5 text-white/70 ring-1 ring-white/10"}`}>{s === "all" ? `Everything (${room.length})` : s}</button>)}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 pb-24 sm:grid-cols-3 lg:grid-cols-5">
        {list.slice(0, more).map((x) => {
          const on = saved.picked.includes(x.id);
          return (
            <li key={x.id} className={`flex flex-col rounded-2xl p-2 ring-1 transition ${on ? "bg-[#38BDF8]/15 ring-[#38BDF8]" : "bg-white/5 ring-white/10 hover:ring-white/30"}`}>
              <button type="button" onClick={() => setOpen(x.id)} aria-label={`About the ${x.name}`} className="flex flex-1 flex-col items-center gap-1 text-center">
                <ItemPic item={x} />
                <span className="text-xs font-black leading-tight">{x.name}</span>
                <span className="line-clamp-2 text-[11px] text-white/50">{x.about}</span>
              </button>
              <button type="button" onClick={() => toggle(x.id)} aria-pressed={on} aria-label={`${on ? "Put back" : "Pick"} the ${x.name}`} className={`mt-1.5 min-h-[34px] rounded-lg text-xs font-black ${on ? "bg-[#38BDF8] text-[#0B1220]" : "bg-white/10 text-white"}`}>{on ? "✓ On my bench" : "＋ Pick"}</button>
            </li>
          );
        })}
      </ul>
      {list.length > more && <button type="button" onClick={() => setMore((m) => m + 120)} className="mx-auto -mt-20 mb-24 block rounded-xl bg-white/10 px-4 py-2 text-sm font-black">Show more ({list.length - more} more)</button>}
      {!list.length && <p className="py-10 text-center text-sm text-white/50">Nothing on these shelves matches that.</p>}

      {/* My bench: always at hand */}
      <div className="fixed inset-x-2 bottom-3 z-[100] mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-[#0B1220]/95 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur">
        <span className="ml-1 text-sm font-black">🧰 My bench · {picked.length}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-white/50">{picked.map((x) => x.name).join(", ") || "Pick the apparatus you need"}</span>
        <button type="button" onClick={() => setPlanning(true)} className="min-h-[40px] rounded-xl px-3 text-sm font-black text-[#0B1220]" style={{ background: colour }}>Plan my practical</button>
      </div>

      {item && <ItemSheet item={item} on={saved.picked.includes(item.id)} onToggle={() => toggle(item.id)} onClose={() => setOpen(null)} />}
      {planning && <Planner subject={subject} saved={saved} save={save} picked={picked} onOpen={(id) => setOpen(id)} onClose={() => setPlanning(false)} />}
    </section>
  );
}

function ItemSheet({ item, on, onToggle, onClose }: { item: Item; on: boolean; onToggle: () => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={item.name} className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-2 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#111A2E] p-4 text-white shadow-2xl ring-1 ring-white/15">
        <div className="flex items-start gap-3">
          <ItemPic item={item} size={84} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black">{item.name}</h3>
            <p className="text-[11px] font-bold" style={{ color: SUBJECTS[item.subject].color }}>{SUBJECTS[item.subject].label} · {item.sections.join(" · ")}</p>
            <p className="mt-1 text-sm text-white/80">{item.about}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0 rounded-lg bg-white/10 text-lg font-black">×</button>
        </div>
        {item.props.length > 0 && <dl className="mt-3 grid grid-cols-2 gap-x-3 rounded-xl bg-white/5 p-2 text-xs">{item.props.map(([k, v]) => <div key={k} className="contents"><dt className="text-white/50">{k}</dt><dd className="text-right font-bold">{v}</dd></div>)}</dl>}
        <p className="mt-3 text-xs font-black uppercase tracking-wide text-white/50">How to use it</p><p className="text-sm">{item.use}</p>
        <p className="mt-2 text-xs font-black uppercase tracking-wide text-amber-300/80">⚠ Safety</p><p className="text-sm text-amber-100/90">{item.safety}</p>
        <p className="mt-3 text-xs font-black uppercase tracking-wide text-white/50">Try it</p>
        <div className="mt-1"><TryIt key={item.id} item={item} /></div>
        <button type="button" onClick={onToggle} aria-pressed={on} className={`mt-3 min-h-[46px] w-full rounded-xl text-sm font-black ${on ? "bg-white/10 text-white" : "bg-[#38BDF8] text-[#0B1220]"}`}>{on ? "Put it back on the shelf" : "＋ Put it on my bench"}</button>
      </div>
    </div>
  );
}

function Planner({ subject, saved, save, picked, onOpen, onClose }: { subject: LabSubject; saved: Saved; save: (fn: (s: Saved) => Saved) => void; picked: Item[]; onOpen: (id: string) => void; onClose: () => void }) {
  const plan = saved.plan, setPlan = (p: Partial<Plan>) => save((s) => ({ ...s, plan: { ...s.plan, ...p } }));
  const practicals = LAB.filter((e) => e.practical && NEEDS[e.slug]?.subject === subject);
  const check = checkPlan(subject, saved.picked, plan.target);
  const risk = riskAssessment(picked);
  const room = ROOMS[subject];
  const add = (names: string[]) => save((s) => ({ ...s, picked: [...s.picked, ...names.map((n) => room.find((x) => x.name === n)?.id ?? safetyItem(subject, n)?.id).filter((id): id is string => !!id && !s.picked.includes(id))] }));
  const target = practicals.find((e) => e.slug === plan.target) ?? null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Plan my practical" className="fixed inset-0 z-[125] overflow-y-auto bg-[#060B16] p-2 text-white sm:p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 text-lg font-black">🧰 Plan my {SUBJECTS[subject].label.toLowerCase()} practical</h3>
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl bg-white/10 px-3 text-sm font-black">Back to the shelves</button>
        </div>

        <Bench items={picked} pos={saved.pos} onMove={(id, p) => save((s) => ({ ...s, pos: { ...s.pos, [id]: p } }))} onRemove={(id) => save((s) => ({ ...s, picked: s.picked.filter((x) => x !== id) }))} onOpen={onOpen} />

        <section aria-label="Which practical" className="mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <label className="block text-xs font-black text-white/70">Which practical are you planning?
            <select value={plan.target ?? ""} onChange={(e) => setPlan({ target: e.target.value || null, title: plan.title || (practicals.find((p) => p.slug === e.target.value)?.title ?? "") })} className={`${field} mt-1`}>
              <option value="">My own practical</option>
              {practicals.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </label>
          {check && (check.ready
            ? <p role="status" className="mt-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-200">✓ You have all {check.of} pieces of apparatus this practical needs.</p>
            : <div role="status" className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
                <b>{check.have} of {check.of}.</b> Still needed: {check.missing.join(", ")}.
                <button type="button" onClick={() => add(check.missing)} className="ml-2 rounded-lg bg-amber-400 px-2 py-1 text-xs font-black text-[#0B1220]">＋ Add them</button>
              </div>)}
          {target && <p className="mt-2 text-xs text-white/60">{target.blurb}</p>}
        </section>

        <section aria-label="My plan" className="mt-4 grid gap-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <label className="text-xs font-black text-white/70">Title<input value={plan.title} onChange={(e) => setPlan({ title: e.target.value })} className={`${field} mt-1`} /></label>
          <label className="text-xs font-black text-white/70">Aim<textarea value={plan.aim} onChange={(e) => setPlan({ aim: e.target.value })} rows={2} placeholder="To find out how… / To measure…" className={`${field} mt-1`} /></label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-black text-white/70">I will change (independent)<input value={plan.independent} onChange={(e) => setPlan({ independent: e.target.value })} className={`${field} mt-1`} /></label>
            <label className="text-xs font-black text-white/70">I will measure (dependent)<input value={plan.dependent} onChange={(e) => setPlan({ dependent: e.target.value })} className={`${field} mt-1`} /></label>
            <label className="text-xs font-black text-white/70">I will keep the same (controls)<input value={plan.controls} onChange={(e) => setPlan({ controls: e.target.value })} className={`${field} mt-1`} /></label>
          </div>
          <p className="text-xs font-black text-white/70">Method</p>
          <ol className="grid gap-1.5">
            {plan.method.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 w-5 text-right text-xs font-black text-white/50">{i + 1}.</span>
                <input value={m} onChange={(e) => setPlan({ method: plan.method.map((x, k) => (k === i ? e.target.value : x)) })} aria-label={`Step ${i + 1}`} className={field} />
                <button type="button" onClick={() => setPlan({ method: plan.method.length > 1 ? plan.method.filter((_, k) => k !== i) : [""] })} aria-label={`Remove step ${i + 1}`} className="rounded-lg bg-white/10 px-2 text-sm font-black">×</button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setPlan({ method: [...plan.method, ""] })} className="justify-self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black">＋ Add a step</button>
        </section>

        <section aria-label="Risk assessment" className="mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="text-sm font-black">⚠ Risk assessment <span className="font-semibold text-white/50">· from what's on your bench</span></p>
          {risk.rows.length ? <table className="mt-2 w-full text-left text-sm"><thead><tr className="text-[11px] uppercase tracking-wide text-white/50"><th className="p-1">Hazard</th><th className="p-1">How to stay safe</th></tr></thead>
            <tbody>{risk.rows.map((r) => <tr key={r.hazard} className="border-t border-white/10"><td className="p-1 font-black capitalize">{r.hazard}</td><td className="p-1 text-white/80">{r.control}</td></tr>)}</tbody></table>
            : <p className="mt-1 text-sm text-white/60">Pick your apparatus and substances — the hazards appear here.</p>}
          {risk.missingSafety.length > 0 && <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-100">You should also have: {risk.missingSafety.join(", ")}.
            <button type="button" onClick={() => add(risk.missingSafety)} className="ml-2 rounded-lg bg-amber-400 px-2 py-1 text-xs font-black text-[#0B1220]">＋ Add</button></p>}
        </section>

        <div className="mt-4 flex flex-wrap gap-2 pb-8">
          {target && <button type="button" disabled={!check?.ready} onClick={() => window.dispatchEvent(new CustomEvent(START_EVENT, { detail: target.slug }))} className="min-h-[48px] rounded-xl bg-emerald-500 px-4 text-sm font-black text-[#0B1220] disabled:opacity-40">▶ Start the practical</button>}
          <button type="button" onClick={() => printPlan(subject, plan, picked, risk.rows)} className="min-h-[48px] rounded-xl bg-white/10 px-4 text-sm font-black">🖨 Print / save as PDF</button>
          <button type="button" onClick={() => { if (window.confirm("Clear this plan and your bench?")) save(() => ({ picked: [], pos: {}, plan: emptyPlan() })); }} className="min-h-[48px] rounded-xl px-4 text-sm font-black text-red-300">Clear</button>
        </div>
      </div>
    </div>
  );
}

// The bench: drag the apparatus where you want it (tap one to look at it again).
function Bench({ items, pos, onMove, onRemove, onOpen }: { items: Item[]; pos: Saved["pos"]; onMove: (id: string, p: { x: number; y: number }) => void; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null), drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const at = (it: Item, i: number) => pos[it.id] ?? { x: 4 + (i % 6) * 16, y: 8 + Math.floor(i / 6) * 34 };
  return (
    <div ref={box} aria-label="My bench" className="relative mt-3 h-72 overflow-hidden rounded-2xl ring-1 ring-white/15" style={{ background: "linear-gradient(#1E293B 0 62%, #CBD5E1 62% 64%, #94A3B8 64%)", touchAction: "none" }}>
      {!items.length && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/60">Your bench is empty — go back to the shelves and pick the apparatus you need.</p>}
      {items.map((it, i) => { const p = at(it, i); return (
        <div key={it.id} className="absolute flex w-24 cursor-grab select-none flex-col items-center rounded-xl bg-[#0B1220]/70 p-1 ring-1 ring-white/20" style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onPointerDown={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); drag.current = { id: it.id, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { const d = drag.current, b = box.current?.getBoundingClientRect(); if (!d || d.id !== it.id || !b) return; d.moved = true;
            onMove(it.id, { x: Math.max(0, Math.min(88, ((e.clientX - d.dx - b.left) / b.width) * 100)), y: Math.max(0, Math.min(70, ((e.clientY - d.dy - b.top) / b.height) * 100)) }); }}
          onPointerUp={() => { const d = drag.current; drag.current = null; if (d && !d.moved) onOpen(it.id); }}>
          <ItemPic item={it} size={48} />
          <span className="line-clamp-2 text-center text-[10px] font-black leading-tight">{it.name}</span>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(it.id)} aria-label={`Take the ${it.name} off the bench`} className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-red-500 text-xs font-black">×</button>
        </div>
      ); })}
    </div>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function printPlan(subject: LabSubject, plan: Plan, items: Item[], risk: { hazard: string; control: string }[]) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(plan.title || "Practical plan")}</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:22px}h2{font-size:15px;margin-top:18px;border-bottom:1px solid #ccc}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left}table{border-collapse:collapse;width:100%}</style>
<h1>${esc(plan.title || "My practical plan")}</h1><p>${esc(SUBJECTS[subject].label)} · ${new Date().toLocaleDateString()}</p>
<h2>Aim</h2><p>${esc(plan.aim || "—")}</p>
<h2>Variables</h2><p><b>Independent:</b> ${esc(plan.independent || "—")}<br><b>Dependent:</b> ${esc(plan.dependent || "—")}<br><b>Controlled:</b> ${esc(plan.controls || "—")}</p>
<h2>Apparatus</h2><ul>${items.map((i) => `<li>${esc(i.name)}${i.props.find((p) => p[0] === "Smallest division") ? ` (to ${esc(i.props.find((p) => p[0] === "Smallest division")![1])})` : ""}</li>`).join("") || "<li>—</li>"}</ul>
<h2>Method</h2><ol>${plan.method.filter((m) => m.trim()).map((m) => `<li>${esc(m)}</li>`).join("") || "<li>—</li>"}</ol>
<h2>Risk assessment</h2><table><tr><th>Hazard</th><th>Control</th></tr>${risk.map((r) => `<tr><td>${esc(r.hazard)}</td><td>${esc(r.control)}</td></tr>`).join("") || "<tr><td colspan=2>—</td></tr>"}</table>
<script>setTimeout(()=>print(),300)</script>`);
  w.document.close();
}
