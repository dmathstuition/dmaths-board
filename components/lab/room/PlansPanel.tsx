"use client";
// The teacher's view of the plans learners have handed in from a lab room:
// who has handed in, how complete each plan is, the plan itself with its
// apparatus check, risks and observations, and a reply to each learner.
import { useState } from "react";
import { LAB, SUBJECTS } from "@/lib/lab/catalog";
import { planScore, type Assignment, type PlanReport, type Reply } from "@/lib/lab/room/planShare";

const titleOf = (slug: string | null) => (slug ? LAB.find((e) => e.slug === slug)?.title ?? slug : "Their own practical");
const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)} min ago` : new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

export default function PlansPanel({ plans, replies, assignment, onReply, onClose }: {
  plans: Record<string, PlanReport>; replies: Record<string, Reply>; assignment: Assignment | null;
  onReply: (to: string, text: string, ok: boolean) => void; onClose: () => void;
}) {
  const list = Object.values(plans).sort((a, b) => b.at - a.at);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  return (
    <section aria-label="Learners' plans" className="absolute inset-0 z-20 overflow-y-auto bg-[#060B16] p-3 text-white sm:p-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex-1 text-lg font-black">📋 Learners&apos; plans · {list.length}</h3>
          {list.length > 0 && <button type="button" onClick={() => printAll(list)} className="min-h-[40px] rounded-xl bg-white/10 px-3 text-sm font-black">🖨 Print them all</button>}
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl bg-white px-3 text-sm font-black text-[#0B1220]">Back to the lab room</button>
        </div>
        {assignment && <p className="mt-2 rounded-lg bg-[#38BDF8]/10 px-3 py-2 text-sm font-bold text-[#BAE6FD]">📌 Set for the class: {assignment.title} ({SUBJECTS[assignment.subject].label}){assignment.note ? ` — “${assignment.note}”` : ""}</p>}
        {!list.length && <p className="mt-8 text-center text-sm text-white/55">No plans yet. Learners plan on their phones and press “Hand in my plan” — their plans appear here.</p>}
        <ul className="mt-3 grid gap-2">
          {list.map((r) => {
            const sc = planScore(r), rep = replies[r.by], on = open === r.by;
            return (
              <li key={r.by} className="rounded-2xl bg-white/5 ring-1 ring-white/10">
                <button type="button" onClick={() => setOpen(on ? null : r.by)} aria-expanded={on} className="flex w-full flex-wrap items-center gap-2 p-3 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-black">{r.name}</span><span className="block text-xs text-white/55">{r.plan.title || titleOf(r.plan.target)} · {SUBJECTS[r.subject].label} · {ago(r.at)}</span></span>
                  {r.check && <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${r.check.missing.length ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}>🧰 {r.check.have}/{r.check.of}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${sc.got === sc.of ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10"}`}>Plan {sc.got}/{sc.of}</span>
                  {r.seen.length > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black">📓 {r.seen.length}</span>}
                  {rep && <span className="rounded-full bg-[#38BDF8]/20 px-2 py-0.5 text-[11px] font-black text-[#BAE6FD]">{rep.ok ? "✓ approved" : "💬 replied"}</span>}
                </button>
                {on && (
                  <div className="grid gap-2 border-t border-white/10 p-3 text-sm">
                    {sc.missing.length > 0 && <p className="text-amber-200">Missing from the plan: {sc.missing.join(", ")}.</p>}
                    <p><b>Aim:</b> {r.plan.aim || "—"}</p>
                    <p><b>Changes:</b> {r.plan.independent || "—"} · <b>Measures:</b> {r.plan.dependent || "—"} · <b>Keeps the same:</b> {r.plan.controls || "—"}</p>
                    <div><b>Method:</b>{r.plan.method.filter(Boolean).length ? <ol className="ml-5 list-decimal">{r.plan.method.filter(Boolean).map((m, i) => <li key={i}>{m}</li>)}</ol> : " —"}</div>
                    <p><b>Apparatus:</b> {r.picked.join(", ") || "—"}{r.check?.missing.length ? <span className="text-amber-200"> (still needs: {r.check.missing.join(", ")})</span> : null}</p>
                    <p><b>Hazards:</b> {r.hazards.join(", ") || "none listed"}</p>
                    {r.seen.length > 0 && <div><b>Observations:</b><ol className="ml-5 list-decimal text-white/80">{r.seen.map((o, i) => <li key={i}>{o}</li>)}</ol></div>}
                    <div className="mt-1 flex flex-wrap gap-2">
                      <input value={text[r.by] ?? ""} onChange={(e) => setText({ ...text, [r.by]: e.target.value })} maxLength={500} aria-label={`Reply to ${r.name}`} placeholder="Write a reply — e.g. Add a white tile under the flask"
                        className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/35" />
                      <button type="button" onClick={() => { onReply(r.by, text[r.by] ?? "", false); setText({ ...text, [r.by]: "" }); }} disabled={!(text[r.by] ?? "").trim()} className="min-h-[40px] rounded-lg bg-white/10 px-3 text-xs font-black disabled:opacity-40">💬 Send to {r.name.split(" ")[0]}</button>
                      <button type="button" onClick={() => { onReply(r.by, (text[r.by] ?? "").trim() || "Good plan — go ahead and start the practical.", true); setText({ ...text, [r.by]: "" }); }} className="min-h-[40px] rounded-lg bg-emerald-500 px-3 text-xs font-black text-[#0B1220]">✓ Approve</button>
                    </div>
                    {rep && <p className="text-xs text-white/55">You replied {ago(rep.at)}: “{rep.text}”</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function printAll(list: PlanReport[]) {
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Practical plans</title><style>body{font:13px/1.5 system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px}section{page-break-after:always}h2{margin:0}h3{font-size:13px;margin:10px 0 2px}</style>
${list.map((r) => `<section><h2>${esc(r.name)} — ${esc(r.plan.title || titleOf(r.plan.target))}</h2><p>${esc(SUBJECTS[r.subject].label)} · ${new Date(r.at).toLocaleString()}</p>
<h3>Aim</h3><p>${esc(r.plan.aim || "—")}</p><h3>Variables</h3><p>Independent: ${esc(r.plan.independent || "—")}<br>Dependent: ${esc(r.plan.dependent || "—")}<br>Controlled: ${esc(r.plan.controls || "—")}</p>
<h3>Apparatus</h3><p>${esc(r.picked.join(", ") || "—")}</p><h3>Method</h3><ol>${r.plan.method.filter(Boolean).map((m) => `<li>${esc(m)}</li>`).join("")}</ol>
<h3>Hazards</h3><p>${esc(r.hazards.join(", ") || "—")}</p>${r.seen.length ? `<h3>Observations</h3><ol>${r.seen.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>` : ""}</section>`).join("")}
<script>setTimeout(()=>print(),300)</script>`);
  w.document.close();
}
