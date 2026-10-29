"use client";
import { useEffect, useRef, useState } from "react";

export type RosterPerson = { id: string; name: string; online: boolean; canWrite: boolean; handAt?: string | null };
export type RosterProps = {
  people: RosterPerson[];
  allCanWrite: boolean;
  onWrite: (id: string, value: boolean) => void;
  onLowerHand: (id: string) => void;
  onLowerAll: () => void;
};

// Who's in the class, on the full-screen board: names, raised hands (in the
// order they went up) and who may write. Folds to a small pill so the board
// keeps its space; a raised hand always shows, even when folded.
export default function Roster({ people, allCanWrite, onWrite, onLowerHand, onLowerAll, compact }: RosterProps & { compact: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const hands = people.filter((p) => p.handAt).sort((a, b) => String(a.handAt).localeCompare(String(b.handAt)));
  const here = people.filter((p) => p.online).length;

  // A new hand goes up → a short note, even with the list folded.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = new Set(hands.map((p) => p.id));
    if (seen.current) {
      const fresh = hands.find((p) => !seen.current!.has(p.id));
      if (fresh) { setToast(`${fresh.name} raised a hand`); const t = setTimeout(() => setToast(null), 3500); seen.current = now; return () => clearTimeout(t); }
    }
    seen.current = now;
  }, [hands.map((p) => p.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hands first (in order), then people here, then those who left; filtered by name.
  const order = (p: RosterPerson) => (p.handAt ? 0 : p.online ? 1 : 2);
  const shown = people
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => order(a) - order(b) || (a.handAt && b.handAt ? String(a.handAt).localeCompare(String(b.handAt)) : a.name.localeCompare(b.name)));

  const toastEl = toast && (
    <p role="status" className="pointer-events-none absolute right-2 top-2 z-[5] rounded-xl bg-amber-400 px-3 py-2 text-sm font-black text-amber-950 shadow-lg">✋ {toast}</p>
  );

  if (!open) {
    return (
      <div className="relative flex shrink-0 flex-col items-center">
        {toastEl}
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-label={`Show class list: ${here} here${hands.length ? `, ${hands.length} hands up` : ""}`}
          className={`flex w-[72px] flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-white ring-1 transition sm:w-[84px] ${hands.length ? "bg-amber-400/90 text-amber-950 ring-amber-300" : "bg-white/5 ring-white/10 hover:bg-white/10"}`}>
          <span className="text-lg" aria-hidden>{hands.length ? "✋" : "👥"}</span>
          <span className="text-xs font-black">{hands.length ? `${hands.length} up` : `${here} here`}</span>
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Class list" className="relative flex w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white/5 text-white ring-1 ring-white/10 sm:w-[230px]">
      {toastEl}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="flex-1 text-sm font-black">Class <span className="font-semibold text-white/60">· {here} here</span></p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fold class list" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">›</button>
      </div>
      {hands.length > 0 && (
        <div className="flex items-center justify-between bg-amber-400/15 px-3 py-1.5 text-xs font-black text-amber-200">
          <span>✋ {hands.length} hand{hands.length === 1 ? "" : "s"} up</span>
          <button type="button" onClick={onLowerAll} className="rounded-md px-1.5 py-1 hover:bg-white/10">Lower all</button>
        </div>
      )}
      {people.length > 8 && (
        <div className="px-2 pt-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a name" aria-label="Find a name"
            className="w-full rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-white/40" />
        </div>
      )}
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {shown.map((p) => {
          const pos = p.handAt ? hands.findIndex((h) => h.id === p.id) + 1 : 0;
          return (
            <li key={p.id} className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-white/5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${p.online ? "bg-emerald-400" : "bg-white/25"}`} aria-hidden />
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${p.online ? "" : "text-white/45"}`} title={p.name}>{p.name}</span>
              {pos > 0 && (
                <button type="button" onClick={() => onLowerHand(p.id)} title="Lower hand" aria-label={`Lower ${p.name}'s hand (number ${pos})`}
                  className="flex h-8 items-center rounded-md bg-amber-400 px-1.5 text-xs font-black text-amber-950">✋{pos}</button>
              )}
              <button type="button" disabled={allCanWrite} onClick={() => onWrite(p.id, !p.canWrite)} aria-pressed={p.canWrite || allCanWrite}
                aria-label={`${p.canWrite ? "Stop" : "Let"} ${p.name} write`} title={allCanWrite ? "Everyone can write" : p.canWrite ? "Can write — tap to stop" : "Let them write"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm transition ${p.canWrite || allCanWrite ? "bg-emerald-400/25 ring-1 ring-emerald-300" : "bg-white/5 opacity-60 grayscale hover:opacity-100"} disabled:cursor-default`}>✏️</button>
            </li>
          );
        })}
        {!people.length && <li className="p-3 text-center text-xs text-white/55">No one has joined yet.</li>}
        {people.length > 0 && !shown.length && <li className="p-3 text-center text-xs text-white/55">No one by that name.</li>}
      </ul>
    </aside>
  );
}
