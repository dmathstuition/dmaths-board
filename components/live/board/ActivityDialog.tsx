"use client";
import { useState } from "react";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { buildMatching, buildSorting, parseLines } from "@/lib/boardActivities";
import type { Stroke } from "@/lib/whiteboard";

// Make a sorting or matching activity: type it in, and it's laid out on a page.
export default function ActivityDialog({ kind, by, idp, onDone, onClose }: {
  kind: "sorting" | "matching"; by: string; idp: string; onDone: (items: Stroke[]) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(kind === "sorting" ? "Sort these into the right group" : "Match each one to its answer");
  const [groups, setGroups] = useState([{ name: "Even", items: "2, 8, 14, 20" }, { name: "Odd", items: "3, 7, 11, 19" }]);
  const [pairs, setPairs] = useState("3 × 4 = 12\n5 × 6 = 30\n7 × 8 = 56\n9 × 9 = 81");
  const items = kind === "sorting"
    ? buildSorting({ title, groups: groups.map((g) => ({ name: g.name, items: parseLines(g.items) })) }, { by, idp })
    : buildMatching({ title, pairs: pairs.split("\n").map((l) => { const [left, ...rest] = l.split("="); return { left: left ?? "", right: rest.join("=") }; }) }, { by, idp });
  const field = "w-full rounded-lg bg-slate-50 px-2.5 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1657C9]";
  return (
    <div role="dialog" aria-modal="true" aria-label={kind === "sorting" ? "Make a sorting activity" : "Make a matching activity"} className="fixed inset-0 z-[97] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 text-ink shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-black">{kind === "sorting" ? "Sorting activity" : "Matching activity"}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        <label className="mb-3 block text-xs font-black text-ink/60">Instruction
          <input className={`${field} mt-1`} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </label>
        {kind === "sorting" ? (
          <div className="grid gap-2">
            {groups.map((g, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
                <div className="flex gap-2">
                  <input className={field} value={g.name} maxLength={40} placeholder={`Group ${i + 1}`} aria-label={`Group ${i + 1} name`}
                    onChange={(e) => setGroups(groups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  {groups.length > 2 && <button type="button" onClick={() => setGroups(groups.filter((_, j) => j !== i))} aria-label={`Remove group ${i + 1}`} className="rounded-lg px-2 text-ink/50 hover:bg-red-50 hover:text-red-600"><BoardIcon name="trash" className="h-4 w-4" /></button>}
                </div>
                <textarea className={`${field} mt-1.5`} rows={2} value={g.items} placeholder="Items for this group — separate with commas or new lines" aria-label={`Items for group ${i + 1}`}
                  onChange={(e) => setGroups(groups.map((x, j) => (j === i ? { ...x, items: e.target.value } : x)))} />
              </div>
            ))}
            {groups.length < 4 && <button type="button" onClick={() => setGroups([...groups, { name: "", items: "" }])} className="rounded-lg bg-slate-100 py-2 text-sm font-black hover:bg-slate-200">+ Add a group</button>}
          </div>
        ) : (
          <label className="block text-xs font-black text-ink/60">Pairs — one per line, as <span className="font-mono">question = answer</span>
            <textarea className={`${field} mt-1 font-mono`} rows={6} value={pairs} onChange={(e) => setPairs(e.target.value)} />
          </label>
        )}
        <p className="mt-3 text-xs font-semibold text-ink/55">
          {items.length ? `${items.filter((s) => s.kind === "card" && s.group != null).length} cards to ${kind === "sorting" ? "sort" : "match"} — learners who can write drag them into place; you press “Check answers”.`
            : kind === "sorting" ? "Add at least two groups with names." : "Add at least two pairs."}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-black text-ink/70 hover:bg-ink/5">Cancel</button>
          <button type="button" disabled={!items.length} onClick={() => onDone(items)} className="rounded-xl bg-[#1657C9] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Put it on the board</button>
        </div>
      </div>
    </div>
  );
}
