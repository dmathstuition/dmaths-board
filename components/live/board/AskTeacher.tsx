"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { BoardIcon } from "@/components/live/board/BoardIcons";
import { Speak } from "@/components/live/Reading";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import { useClassScale } from "@/lib/classScale";

// Ask the teacher privately: a learner's question that only the teacher sees.
// The teacher replies to that learner alone, or shows the question to the
// whole class without the learner's name.
//
// Messages:
//   "ask"       learner → teacher (the teacher-only channel): { id, by, name, text, at } — sent again until the teacher has it
//   "ask-ack"   teacher → all (signed): { ids } — "got it", so learners stop resending
//   "ask-reply" teacher → all (signed): { to, id, text } — shown only on that learner's screen
//   "ask-show"  teacher → all (signed): { shown: { q, a } | null } — on everyone's screen, no name; re-sent while showing
export type Ask = { id: string; by: string; name: string; text: string; at: number; reply?: string; done?: boolean };
type Mine = { id: string; text: string; at: number; got: boolean; reply?: string };
type Shown = { q: string; a: string };
const MAX_TEXT = 300;
const clean = (t: unknown, n = MAX_TEXT) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export default function AskTeacher({ host, myId, myName, open, onClose, onCount, keep }: {
  host: boolean; myId: string; myName: string; open: boolean; onClose: () => void;
  onCount?: (unanswered: number) => void; // teacher: for the badge on the toolbar button
  keep?: KeepStore;
}) {
  const scale = useClassScale();
  const [asks, setAsks] = useKeptState<Ask[]>(keep, "ask:list", []);            // teacher
  const [mine, setMine] = useKeptState<Mine[]>(keep, "ask:mine", []);            // learner
  const [shown, setShown] = useKeptState<Shown | null>(keep, "ask:shown", null); // teacher: on everyone's screen; learner: what's shown
  const [hideShown, setHideShown] = useState(false);
  const [draft, setDraft] = useState("");                                        // learner: the question being written
  const mineRef = useRef(mine); mineRef.current = mine;

  const send = useLive({
    ask: (p) => {
      if (!host || typeof p?.id !== "string" || typeof p?.by !== "string") return;
      const text = clean(p.text);
      if (!text) return;
      setAsks((cur) => (cur.some((a) => a.id === p.id) ? cur : [...cur, { id: p.id.slice(0, 40), by: p.by.slice(0, 60), name: clean(p.name, 60) || "Learner", text, at: Date.now() }].slice(-100)));
      send("ask-ack", { host: true, ids: [p.id] });
    },
    "ask-ack": (p) => {
      if (host || !p?.host || !Array.isArray(p.ids)) return;
      const ids = new Set(p.ids.map(String));
      setMine((cur) => (cur.some((m) => ids.has(m.id) && !m.got) ? cur.map((m) => (ids.has(m.id) ? { ...m, got: true } : m)) : cur));
    },
    "ask-reply": (p) => {
      if (host || !p?.host || p.to !== myId) return;
      setMine((cur) => cur.map((m) => (m.id === p.id ? { ...m, got: true, reply: clean(p.text, 600) } : m)));
    },
    "ask-show": (p) => {
      if (host || !p?.host) return;
      const s = p.shown && typeof p.shown.q === "string" ? { q: clean(p.shown.q), a: clean(p.shown.a, 600) } : null;
      setShown((cur) => { if (JSON.stringify(cur) !== JSON.stringify(s)) setHideShown(false); return s; });
    },
  });

  // Teacher: keep what's shown on everyone's screen (late joiners).
  useEffect(() => {
    if (!host || !shown) return;
    send("ask-show", { host: true, shown });
    const t = setInterval(() => send("ask-show", { host: true, shown }), 6000 * scale);
    return () => clearInterval(t);
  }, [host, shown, send, scale]);
  // Learner: send again any question the teacher hasn't got yet.
  useEffect(() => {
    if (host) return;
    const t = setInterval(() => {
      for (const m of mineRef.current) if (!m.got && Date.now() - m.at < 30 * 60_000) send("ask", { id: m.id, by: myId, name: myName, text: m.text, at: m.at });
    }, 8000 * scale);
    return () => clearInterval(t);
  }, [host, myId, myName, send, scale]);
  const unanswered = asks.filter((a) => !a.done && !a.reply).length;
  useEffect(() => { onCount?.(unanswered); }, [unanswered, onCount]);

  // ── Learner ──
  if (!host) {
    return (
      <>
        {shown && !hideShown && (
          <div role="dialog" aria-label="A question from the class" className="fixed inset-x-0 top-2 z-[97] mx-auto w-[min(32rem,94vw)] rounded-2xl bg-white p-4 text-ink shadow-2xl ring-1 ring-[#A9D6D3]">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-[11px] font-black uppercase tracking-wider text-[#0E6E72]">A classmate asked</p>
              <button type="button" onClick={() => setHideShown(true)} aria-label="Close" className="rounded-lg px-2 text-ink/50 hover:bg-ink/5">✕</button>
            </div>
            <div className="flex items-start gap-2"><p className="flex-1 text-base font-black">{shown.q}</p><Speak text={`${shown.q}. ${shown.a}`} /></div>
            {shown.a && <p className="mt-2 rounded-xl bg-[#E2F3F2] p-2 text-sm font-semibold text-[#0A4F52]"><b>Teacher:</b> {shown.a}</p>}
          </div>
        )}
        {open && (
          <div role="dialog" aria-modal="true" aria-label="Ask your teacher privately" className="fixed inset-0 z-[98] flex items-end justify-center bg-black/50 p-3 sm:items-center">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 text-ink shadow-2xl">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-lg font-black">🙋 Ask privately</p>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-ink/60 hover:bg-ink/5">✕</button>
              </div>
              <p className="text-sm text-ink/60">Only your teacher sees this. If they share it with the class, your name isn&apos;t shown.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const text = clean(draft);
                if (!text) return;
                const m: Mine = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text, at: Date.now(), got: false };
                setMine((cur) => [...cur, m].slice(-20)); setDraft("");
                send("ask", { id: m.id, by: myId, name: myName, text, at: m.at });
              }} className="mt-3 grid gap-2">
                <label htmlFor="ask-text" className="sr-only">Your question</label>
                <textarea id="ask-text" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_TEXT} rows={3} placeholder="e.g. I don't understand why we add 180°"
                  className="w-full rounded-xl bg-slate-50 p-3 text-base ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
                <button type="submit" disabled={!clean(draft)} className="min-h-[44px] rounded-xl bg-[#0E6E72] px-4 font-black text-white disabled:opacity-40">Send to my teacher</button>
              </form>
              {mine.length > 0 && (
                <ul className="mt-3 grid max-h-[40vh] gap-2 overflow-y-auto" aria-label="My questions">
                  {[...mine].reverse().map((m) => (
                    <li key={m.id} className="rounded-xl bg-slate-50 p-2.5 text-sm">
                      <p className="font-bold">{m.text}</p>
                      {m.reply ? <p className="mt-1 rounded-lg bg-[#E2F3F2] p-2 font-semibold text-[#0A4F52]"><b>Teacher:</b> {m.reply}</p>
                        : <p className="mt-1 text-xs font-bold text-ink/50">{m.got ? "✓ Your teacher has it" : "Sending…"}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {!open && <ReplyNote mine={mine} />}
      </>
    );
  }

  // ── Teacher ──
  if (!open) return null;
  const update = (id: string, p: Partial<Ask>) => setAsks((cur) => cur.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const list = [...asks].sort((a, b) => Number(!!a.done || !!a.reply) - Number(!!b.done || !!b.reply) || b.at - a.at);
  return (
    <div role="dialog" aria-modal="true" aria-label="Private questions" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3F2] text-lg">🙋</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black">Private questions</p>
            <p className="text-xs font-bold text-ink/55">Only you see these. {unanswered ? `${unanswered} waiting` : "All answered"}</p>
          </div>
          {shown && <button type="button" onClick={() => { setShown(null); send("ask-show", { host: true, shown: null }); }} className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">Stop showing</button>}
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5"><BoardIcon name="close" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {!list.length && <p className="p-6 text-center text-sm font-bold text-ink/50">No questions yet. Learners tap “🙋 Ask privately” on their board.</p>}
          <ul className="grid gap-2">
            {list.map((a) => <AskRow key={a.id} a={a} onReply={(text) => { update(a.id, { reply: text }); send("ask-reply", { host: true, to: a.by, id: a.id, text }); }}
              onShow={(text) => { const s = { q: a.text, a: text }; setShown(s); if (text) update(a.id, { reply: a.reply ?? text }); else update(a.id, { done: true }); }}
              onDone={() => update(a.id, { done: !a.done })} />)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AskRow({ a, onReply, onShow, onDone }: { a: Ask; onReply: (t: string) => void; onShow: (t: string) => void; onDone: () => void }) {
  const [text, setText] = useState(a.reply ?? "");
  const answered = !!a.reply || !!a.done;
  return (
    <li className={`rounded-xl p-3 ring-1 ${answered ? "bg-slate-50 ring-slate-200" : "bg-amber-50 ring-amber-200"}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-ink/55">{a.name} · {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{a.reply ? " · replied" : a.done ? " · done" : ""}</p>
          <p className="mt-0.5 font-bold">{a.text}</p>
        </div>
        <button type="button" onClick={onDone} className="rounded-lg px-2 py-1 text-xs font-black text-ink/60 hover:bg-ink/5">{a.done ? "Reopen" : "Done"}</button>
      </div>
      <label className="sr-only" htmlFor={`reply-${a.id}`}>Reply to {a.name}</label>
      <textarea id={`reply-${a.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={2} placeholder="Your answer (optional)"
        className="mt-2 w-full rounded-lg bg-white p-2 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button type="button" disabled={!text.trim()} onClick={() => onReply(clean(text, 600))} className="min-h-[36px] rounded-lg bg-[#0E6E72] px-3 text-xs font-black text-white disabled:opacity-40">Reply privately to {a.name.split(" ")[0]}</button>
        <button type="button" onClick={() => onShow(clean(text, 600))} className="min-h-[36px] rounded-lg bg-slate-100 px-3 text-xs font-black text-ink/75">Show to class (no name){text.trim() ? " with answer" : ""}</button>
      </div>
    </li>
  );
}

// A small note when the teacher replies while the dialog is closed.
function ReplyNote({ mine }: { mine: Mine[] }) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const latest = [...mine].reverse().find((m) => m.reply && !seen.has(m.id));
  if (!latest) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-20 z-[97] mx-auto w-[min(28rem,94vw)] rounded-2xl bg-[#0A4F52] p-3 text-white shadow-2xl">
      <p className="text-[11px] font-black uppercase tracking-wider text-[#C6F35C]">Your teacher replied</p>
      <p className="mt-0.5 text-sm text-white/75">“{latest.text}”</p>
      <div className="mt-1 flex items-start gap-2"><p className="flex-1 font-bold">{latest.reply}</p><Speak text={latest.reply ?? ""} /></div>
      <button type="button" onClick={() => setSeen((s) => new Set(s).add(latest.id))} className="mt-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-black">OK</button>
    </div>
  );
}
