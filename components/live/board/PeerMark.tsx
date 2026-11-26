"use client";
// Peer marking (lib/peerMark.ts), on an answer-board round. The teacher taps
// "Swap & mark": every learner who answered is given a classmate's answer —
// no name — and marks it against the teacher's answer key. The teacher sees
// each peer mark beside their own and can accept them in one tap.
// Messages: "pm-assign" (teacher → one learner, `to`: their classmate's answer
// and the key; re-sent every so often to anyone who hasn't marked yet) and
// "pm-mark" (learner → teacher: the mark — who it's for is the teacher's
// record, not the learner's say).
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { useKeptRef, useKeptState, type KeepStore } from "@/lib/keptState";
import { cleanAnswerStrokes, cleanAnswerText, cleanImgs, type Answer } from "@/lib/answerBoards";
import { MAX_KEY, MAX_PEER_COMMENT, assignPeers, cleanKey, cleanPeerMark, comparePeer, type PeerMarkRow } from "@/lib/peerMark";

export type PeerShown = { strokes: Answer["strokes"]; text: string; imgs?: string[]; bg?: string | null };
type Assign = { round: string; key: string; max: number; map: Record<string, string> }; // marker id → whose answer they mark
type Given = { round: string; key: string; max: number; answer: PeerShown };

const btn = "min-h-[40px] rounded-xl px-3 text-sm font-black";

export function PeerMark({ host, roundId, max, myId, answers, online, label, defaultKey, bgFor, apply, marks, renderAnswer, keep }: {
  host: boolean; roundId: string; max: number; myId: string;
  answers: Answer[]; online: { id: string; name: string }[]; label: (id: string) => string; defaultKey: string;
  bgFor: (id: string) => string | null; apply: (id: string, mark: number) => void; marks: Record<string, number>;
  renderAnswer: (a: PeerShown) => React.ReactNode; keep?: KeepStore;
}) {
  const k = (n: string) => `pm:${n}`;
  const scale = useClassScale();
  // Teacher
  const [assign, setAssign] = useKeptState<Assign | null>(keep, k("assign"), null);
  const assignRef = useRef(assign); assignRef.current = assign;
  const [peer, setPeer] = useKeptState<Record<string, PeerMarkRow>>(keep, k("peer"), {});
  const [key, setKey] = useKeptState<string>(keep, k("key"), "");
  const [edited, setEdited] = useKeptState<boolean>(keep, k("edited"), false); // the tutor has typed their own key
  const answersRef = useRef(answers); answersRef.current = answers;
  const bgRef = useRef(bgFor); bgRef.current = bgFor;
  // Learner
  const [given, setGiven] = useKeptState<Given | null>(keep, k("given"), null);
  const givenRef = useRef(given); givenRef.current = given;
  const [pick, setPick] = useState<number | null>(null), [comment, setComment] = useState(""), [sentMark, setSentMark] = useState<number | null>(null);
  const [hidden, setHidden] = useKeptState<string>(keep, k("hidden"), "");
  const sentFor = useKeptRef<string>(keep, k("sentFor"), "");

  const send = useLive({
    "pm-assign": (p) => {
      if (host || !p?.host || p.to !== myId || typeof p.round !== "string") return;
      const m = Math.max(1, Math.min(100, Math.round(Number(p.max) || 1)));
      const a = p.answer ?? {};
      const cur = givenRef.current;
      if (!cur || cur.round !== p.round) { setPick(null); setComment(""); setSentMark(null); setHidden(""); sentFor.current = ""; }
      setGiven({ round: p.round, key: cleanKey(p.key), max: m, answer: { strokes: cleanAnswerStrokes(a.strokes), text: cleanAnswerText(a.text), imgs: cleanImgs(a.imgs), bg: typeof a.bg === "string" ? a.bg : null } });
    },
    "pm-mark": (p) => {
      const as = assignRef.current;
      if (!host || !as || p?.round !== as.round || typeof p.by !== "string") return;
      const target = as.map[p.by], m = cleanPeerMark(p, as.max);
      if (!target || !m) return;
      setPeer((cur) => ({ ...cur, [target]: { mark: m.mark, comment: m.comment, by: p.by } }));
    },
  });

  // Teacher: one learner's classmate's answer, to them.
  const give = (markerId: string, as: Assign) => {
    const t = answersRef.current.find((a) => a.by === as.map[markerId]);
    if (!t) return;
    send("pm-assign", { host: true, round: as.round, to: markerId, key: as.key, max: as.max, answer: { strokes: t.strokes, text: t.text, imgs: t.imgs ?? [], bg: bgRef.current(t.by) } });
  };
  function swap() {
    const answered = answers.filter((a) => a.by !== myId && (a.strokes.some((s) => !s.erase) || a.text.trim() || a.imgs?.length)).map((a) => a.by);
    const map = assignPeers(answered);
    if (!Object.keys(map).length) return;
    const as: Assign = { round: roundId, key: cleanKey(edited ? key : defaultKey), max, map };
    setAssign(as); setPeer({});
    Object.keys(map).forEach((id, i) => setTimeout(() => give(id, as), i * 60));
  }
  // Teacher: say it again to anyone who hasn't marked yet (late, or a phone that was away).
  const sentRef = useRef(peer); sentRef.current = peer;
  useEffect(() => {
    if (!host || !assign || assign.round !== roundId) return;
    const t = setInterval(() => {
      const as = assignRef.current; if (!as) return;
      const done = new Set(Object.values(sentRef.current).map((p) => p.by));
      Object.keys(as.map).filter((id) => !done.has(id)).forEach((id, i) => setTimeout(() => give(id, as), i * 60));
    }, 15_000 * scale);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, assign?.round, roundId, scale]);

  // ── The teacher ──
  if (host) {
    const here = assign && assign.round === roundId ? assign : null;
    const targets = here ? Object.values(here.map) : [];
    const cmp = here ? comparePeer(targets, peer, marks) : null;
    const answeredN = answers.filter((a) => a.strokes.some((s) => !s.erase) || a.text.trim() || a.imgs?.length).length;
    const accept = (ids: string[]) => ids.forEach((id) => { const p = peer[id]; if (p) apply(id, p.mark); });
    return (
      <details className="mt-3 rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200" open={!!here}>
        <summary className="cursor-pointer text-sm font-black text-sky-900">🔀 Swap &amp; mark <span className="font-bold text-sky-900/60">— learners mark each other&apos;s work, without names</span></summary>
        <div className="mt-2 grid gap-2">
          <label className="text-xs font-black text-ink/60">Answer key (learners mark against this)
            <textarea value={here ? here.key : edited ? key : defaultKey} onChange={(e) => { setEdited(true); setKey(e.target.value); }} rows={2} maxLength={MAX_KEY} aria-label="Answer key for peer marking" disabled={!!here}
              placeholder="e.g. x = 4, because 3x = 12 → x = 12 ÷ 3. Method: divide both sides by 3."
              className="mt-1 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60" />
          </label>
          {!here ? (
            <>
              <p className="text-xs font-bold text-ink/60">{answeredN < 2 ? "Waiting for at least two learners to answer." : `${answeredN} learners have answered. Each marks one classmate's answer out of ${max}.`}</p>
              <button type="button" onClick={swap} disabled={answeredN < 2} className={`${btn} justify-self-start bg-sky-600 text-white disabled:opacity-40`}>🔀 Swap &amp; mark ({answeredN})</button>
            </>
          ) : (
            <>
              <p role="status" className="text-sm font-black text-sky-900">{cmp!.marked} of {cmp!.of} peer-marked{cmp!.differ ? ` · ${cmp!.differ} differ from your mark` : cmp!.agree ? ` · ${cmp!.agree} match yours` : ""}</p>
              <ul className="grid gap-1.5" aria-label="Peer marks">
                {targets.map((id) => {
                  const p = peer[id], mine = marks[id];
                  return (
                    <li key={id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-sky-100">
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{label(id)}</span>
                      {p ? <span className={`rounded-full px-2 py-0.5 text-xs font-black ${mine != null && mine !== p.mark ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"}`} aria-label={`Peer mark for ${label(id)}`}>peer {p.mark} / {here.max}</span>
                        : <span className="text-xs font-bold text-ink/40">waiting…</span>}
                      {p?.comment && <span className="max-w-[12rem] truncate text-xs font-semibold text-ink/60" title={p.comment}>💬 {p.comment}</span>}
                      {mine != null && <span className="text-xs font-black text-ink/60">you {mine}</span>}
                      {p && mine !== p.mark && <button type="button" onClick={() => accept([id])} aria-label={`Use the peer mark for ${label(id)}`} className="min-h-[32px] rounded-lg bg-emerald-600 px-2.5 text-xs font-black text-white">Use it</button>}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => accept(targets.filter((id) => peer[id] && marks[id] !== peer[id].mark))} disabled={!targets.some((id) => peer[id] && marks[id] !== peer[id].mark)} className={`${btn} bg-emerald-600 text-white disabled:opacity-40`}>✓ Use all peer marks</button>
                <button type="button" onClick={() => { setAssign(null); setPeer({}); }} className={`${btn} bg-white text-ink/70 ring-1 ring-slate-200`}>Stop</button>
              </div>
              <p className="text-[11px] font-bold text-ink/50">Peer marks are only a suggestion until you tap Use — then they become the learner&apos;s mark.</p>
            </>
          )}
        </div>
      </details>
    );
  }

  // ── A learner ──
  if (!given || given.round !== roundId || hidden === given.round) return null;
  const marksList = Array.from({ length: given.max + 1 }, (_, m) => m);
  function submit() {
    if (pick == null || !given) return;
    send("pm-mark", { round: given.round, by: myId, mark: pick, comment: comment.trim().slice(0, MAX_PEER_COMMENT) });
    setSentMark(pick); sentFor.current = given.round;
  }
  return (
    <div role="dialog" aria-label="Mark a classmate's work" className="fixed inset-0 z-[98] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="flex max-h-full w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-3xl bg-white p-4 text-ink shadow-2xl">
        <div className="flex items-start gap-2">
          <div className="mr-auto">
            <p className="text-[11px] font-black uppercase tracking-wider text-sky-700">🔀 Peer marking</p>
            <p className="text-lg font-black leading-snug">Mark a classmate&apos;s work</p>
            <p className="text-xs font-semibold text-ink/55">You don&apos;t know whose it is. Be fair and kind.</p>
          </div>
          <button type="button" onClick={() => setHidden(given.round)} aria-label="Close" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-ink/70">Close</button>
        </div>
        <div className="overflow-hidden rounded-2xl ring-2 ring-sky-100" aria-label="Their answer">{renderAnswer(given.answer)}</div>
        {given.key ? (
          <p className="whitespace-pre-wrap rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200"><span className="block text-[11px] font-black uppercase tracking-wider text-emerald-800/70">✅ Your tutor&apos;s answer</span>{given.key}</p>
        ) : <p className="rounded-2xl bg-slate-100 p-3 text-sm font-bold text-ink/65">Your tutor didn&apos;t write an answer — mark it as best you can.</p>}
        <div role="group" aria-label={`Give a mark out of ${given.max}`} className="grid gap-1.5">
          <p className="text-sm font-black text-ink/70">Mark out of {given.max}</p>
          <div className="flex flex-wrap gap-1.5">
            {marksList.map((m) => (
              <button key={m} type="button" onClick={() => setPick(m)} aria-pressed={pick === m} aria-label={`${m} out of ${given.max}`}
                className={`h-12 min-w-[48px] rounded-xl text-base font-black ring-2 ${pick === m ? (m === given.max ? "bg-emerald-600 text-white ring-emerald-600" : m === 0 ? "bg-red-500 text-white ring-red-500" : "bg-sky-600 text-white ring-sky-600") : "bg-white text-ink ring-sky-100"}`}>{m}</button>
            ))}
          </div>
        </div>
        <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={MAX_PEER_COMMENT} aria-label="A short comment (optional)" placeholder="A short comment — e.g. good method, check your sign"
          className="w-full rounded-xl bg-sky-50/60 px-3 py-2.5 text-sm font-semibold ring-1 ring-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500" />
        <button type="button" onClick={submit} disabled={pick == null} className="min-h-[52px] rounded-2xl bg-sky-600 text-base font-black text-white disabled:opacity-40">{sentMark != null ? "Update my mark" : "Send my mark"}</button>
        {sentMark != null && <p role="status" className="text-center text-sm font-black text-emerald-700">✓ Sent {sentMark} / {given.max} — thank you! You can change it until your tutor moves on.</p>}
      </div>
    </div>
  );
}
