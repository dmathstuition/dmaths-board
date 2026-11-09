"use client";
import { useEffect, useRef, useState } from "react";
import { useLive } from "@/components/live/LiveChannel";
import { useClassScale } from "@/lib/classScale";
import { serverNow } from "@/lib/serverClock";
import { useKeptState, type KeepStore } from "@/lib/keptState";
import {
  CHAT_EVERY_MS, CHAT_MAX, CHAT_OFF, REACTIONS, REACT_EVERY_MS, addMsg, cleanBurst, cleanChatState, cleanChatText, cleanReaction, mayPost, takeSay,
  type ChatMode, type ChatMsg, type ChatState, type Person, type Reaction,
} from "@/lib/classExtras";

// Class chat and reactions (lib/classExtras.ts). Both are off until the
// teacher turns them on. A learner's message goes to the teacher's screen
// first; it reaches the class only from there — straight away, or after the
// teacher lets it through ("Approve first"). The teacher can take a message
// down or stop a learner posting. Reactions float up on every screen.
//
// Messages: "chat-say" and "react" (learner → teacher), "chat-state" and
// "react-burst" (teacher → all, signed).

type Float = { id: number; e: string; x: number };
const MODES: [ChatMode, string, string][] = [["off", "Off", "No chat"], ["open", "On", "Messages show straight away"], ["approve", "Approve first", "You let each message through"]];

export default function ClassChat({ host, myId, myName, people, open, onClose, onCount, keep }: {
  host: boolean; myId: string; myName: string; people: Person[]; open: boolean; onClose: () => void;
  onCount?: (waiting: number) => void; keep?: KeepStore;
}) {
  const k = (n: string) => `chat:${n}`;
  const [chat, setChat] = useKeptState<ChatState>(keep, k("state"), CHAT_OFF);
  const chatRef = useRef(chat); chatRef.current = chat;
  const [pending, setPending] = useKeptState<ChatMsg[]>(keep, k("pending"), []);   // teacher: waiting to be let through
  const [muted, setMuted] = useKeptState<string[]>(keep, k("muted"), []);
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const [unread, setUnread] = useKeptState(keep, k("unread"), 0);
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState(false);            // learner: the chat is open
  const [note, setNote] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const peopleRef = useRef(people); peopleRef.current = people;
  const openRef = useRef(open); openRef.current = open;
  const sheetRef = useRef(sheet); sheetRef.current = sheet;
  const lastPost = useRef(new Map<string, number>());
  const lastReact = useRef(new Map<string, number>());
  const queue = useRef<Reaction[]>([]);
  const seq = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  const scale = useClassScale();

  function float(items: string[]) {
    if (!items.length) return;
    const add = items.slice(0, 12).map((e) => ({ id: ++seq.current, e, x: 8 + Math.random() * 84 }));
    setFloats((cur) => [...cur, ...add].slice(-40));
    setTimeout(() => setFloats((cur) => cur.filter((f) => !add.some((a) => a.id === f.id))), 2600);
  }

  const send = useLive({
    "chat-say": (p) => {
      if (!host) return;
      const c = chatRef.current;
      if (c.mode === "off" || typeof p?.by !== "string" || mutedRef.current.includes(p.by) || !mayPost(lastPost.current, p.by, Date.now(), CHAT_EVERY_MS * 0.8)) return;
      const m = takeSay(p, peopleRef.current, serverNow());
      if (!m) return;
      if (c.mode === "approve") setPending((cur) => [...cur, m].slice(-40));
      else setChat((cur) => ({ ...cur, msgs: addMsg(cur.msgs, m) }));
      if (!openRef.current) setUnread((n) => n + 1);
    },
    react: (p) => {
      if (!host || !chatRef.current.react || typeof p?.by !== "string") return;
      const e = cleanReaction(p.e);
      if (e && mayPost(lastReact.current, p.by, Date.now(), REACT_EVERY_MS * 0.8)) queue.current.push({ e, by: p.by.slice(0, 80) });
    },
    "chat-state": (p) => {
      if (host || !p?.host) return;
      const next = cleanChatState(p.state), last = chatRef.current.msgs.at(-1)?.id;
      if (!sheetRef.current && next.msgs.length && next.msgs.at(-1)!.id !== last && next.msgs.at(-1)!.by !== myId) setUnread((n) => n + 1);
      setChat(next);
    },
    "react-burst": (p) => { if (!host && p?.host) float(cleanBurst(p).filter((r) => r.by !== myId).map((r) => r.e)); },
  });

  // Teacher: every screen has the chat as it is now (and late joiners get it).
  useEffect(() => {
    if (!host) return;
    send("chat-state", { host: true, state: chat });
    if (chat.mode === "off" && !chat.react) return;
    const t = setInterval(() => send("chat-state", { host: true, state: chatRef.current }), 6000 * scale);
    return () => clearInterval(t);
  }, [host, chat, send, scale]);
  // Teacher: reactions go out in small bursts.
  useEffect(() => {
    if (!host) return;
    const t = setInterval(() => {
      const items = queue.current.splice(0, 24);
      if (!items.length) return;
      send("react-burst", { host: true, items });
      float(items.map((r) => r.e));
    }, 700);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, send]);
  useEffect(() => { onCount?.(host ? unread + pending.length : 0); }, [host, unread, pending.length, onCount]);
  useEffect(() => { if (host ? open : sheet) { setUnread(0); end.current?.scrollIntoView({ block: "nearest" }); } }, [host, open, sheet, chat.msgs.length, setUnread]);

  const floatLayer = floats.length > 0 && (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-24 z-[119] h-0">
      {floats.map((f) => <span key={f.id} className="react-float absolute text-4xl" style={{ left: `${f.x}%` }}>{f.e}</span>)}
    </div>
  );
  const list = (mine: string) => (
    <ul className="grid gap-1.5" aria-label="Messages">
      {chat.msgs.map((m) => (
        <li key={m.id} className={`flex items-start gap-2 rounded-xl px-3 py-1.5 ${m.host ? "bg-[#E2F3F2]" : m.by === mine ? "bg-amber-50" : "bg-slate-50"}`}>
          <p className="min-w-0 flex-1 break-words text-sm"><b className={m.host ? "text-[#0A4F52]" : ""}>{m.host ? `${m.name} (teacher)` : m.by === mine ? "You" : m.name}:</b> {m.text}</p>
          {host && !m.host && (
            <span className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setChat((c) => ({ ...c, msgs: c.msgs.filter((x) => x.id !== m.id) }))} aria-label={`Remove ${m.name}'s message`} title="Take this message down" className="rounded-md px-1.5 text-xs font-black text-ink/50 hover:bg-red-100 hover:text-red-700">✕</button>
              <button type="button" onClick={() => { setMuted((cur) => (cur.includes(m.by) ? cur : [...cur, m.by])); setChat((c) => ({ ...c, msgs: c.msgs.filter((x) => x.by !== m.by) })); }} aria-label={`Stop ${m.name} posting`} title="Stop this learner posting (and remove their messages)" className="rounded-md px-1.5 text-xs font-black text-ink/50 hover:bg-red-100 hover:text-red-700">🔇</button>
            </span>
          )}
        </li>
      ))}
      {!chat.msgs.length && <li className="rounded-xl bg-slate-50 p-3 text-center text-xs font-bold text-ink/50">No messages yet.</li>}
    </ul>
  );

  // ── Teacher ──
  if (host) {
    const post = () => {
      const text = cleanChatText(draft);
      if (!text) return;
      setChat((c) => ({ ...c, msgs: addMsg(c.msgs, { id: `${Date.now().toString(36)}t`, by: myId, name: myName, text, at: serverNow(), host: true }) }));
      setDraft("");
    };
    const mutedNames = muted.map((id) => people.find((p) => p.id === id)?.name ?? "A learner");
    return (
      <>
        {floatLayer}
        {open && (
          <div role="dialog" aria-modal="true" aria-label="Class chat" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-3">
            <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl">
              <div className="flex items-center gap-2 border-b border-line p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E2F3F2] text-lg">💬</span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black">Class chat</p>
                  <p className="text-xs font-bold text-ink/55">{MODES.find((m) => m[0] === chat.mode)![2]}{chat.react ? " · reactions on" : ""}</p>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5">✕</button>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <div role="group" aria-label="Chat" className="flex gap-1">
                  {MODES.map(([m, label, hint]) => (
                    <button key={m} type="button" title={hint} aria-pressed={chat.mode === m}
                      onClick={() => { if (m !== "approve" && pending.length) setPending([]); setChat((c) => ({ ...c, mode: m, msgs: m === "off" ? [] : c.msgs })); }}
                      className={`min-h-[36px] rounded-xl px-3 text-xs font-black ring-1 ${chat.mode === m ? "bg-[#0E6E72] text-white ring-[#0E6E72]" : "bg-white text-ink/70 ring-slate-200"}`}>{label}</button>
                  ))}
                </div>
                <label className="ml-auto flex items-center gap-2 text-xs font-black text-ink/70">
                  <input type="checkbox" checked={chat.react} onChange={(e) => setChat((c) => ({ ...c, react: e.target.checked }))} className="h-4 w-4 accent-[#0E6E72]" /> Reactions {REACTIONS.slice(0, 3).join("")}
                </label>
              </div>
              <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto p-3">
                {chat.mode === "off" ? <p className="p-4 text-center text-sm font-bold text-ink/55">Chat is off. Turn it on and learners can write to the class — you can take any message down.</p> : (
                  <>
                    {pending.length > 0 && (
                      <section aria-label="Waiting for you" className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200">
                        <p className="mb-1 text-xs font-black text-amber-800">Waiting for you ({pending.length})</p>
                        <ul className="grid gap-1">
                          {pending.map((m) => (
                            <li key={m.id} className="flex items-start gap-2 rounded-lg bg-white px-2 py-1.5">
                              <p className="min-w-0 flex-1 break-words text-sm"><b>{m.name}:</b> {m.text}</p>
                              <button type="button" onClick={() => { setPending((cur) => cur.filter((x) => x.id !== m.id)); setChat((c) => ({ ...c, msgs: addMsg(c.msgs, m) })); }} aria-label={`Show ${m.name}'s message to the class`} className="rounded-md bg-[#0E6E72] px-2 py-0.5 text-xs font-black text-white">Show</button>
                              <button type="button" onClick={() => setPending((cur) => cur.filter((x) => x.id !== m.id))} aria-label={`Don't show ${m.name}'s message`} className="rounded-md bg-ink/5 px-2 py-0.5 text-xs font-black text-ink/70">✕</button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {list("")}
                  </>
                )}
                {muted.length > 0 && <p className="text-xs text-ink/55">Can&apos;t post: {mutedNames.join(", ")} · <button type="button" onClick={() => setMuted([])} className="font-black underline">let them post again</button></p>}
                <div ref={end} />
              </div>
              {chat.mode !== "off" && (
                <form onSubmit={(e) => { e.preventDefault(); post(); }} className="flex gap-2 border-t border-line p-3">
                  <input value={draft} maxLength={CHAT_MAX} onChange={(e) => setDraft(e.target.value)} placeholder="Write to the class…" aria-label="Your message"
                    className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
                  <button type="submit" disabled={!draft.trim()} className="rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white disabled:opacity-40">Send</button>
                </form>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Learner ──
  if (chat.mode === "off" && !chat.react) return <>{floatLayer}</>;
  const say = () => {
    const text = cleanChatText(draft);
    if (!text) return;
    if (!mayPost(lastPost.current, myId, Date.now())) return setNote("Wait a moment before your next message.");
    send("chat-say", { by: myId, name: myName, text });
    setDraft(""); setNote(chat.mode === "approve" ? "Sent — your teacher will check it first." : null);
  };
  const react = (e: string) => {
    if (!mayPost(lastReact.current, myId, Date.now(), REACT_EVERY_MS)) return;
    send("react", { by: myId, e }); float([e]);
  };
  return (
    <>
      {floatLayer}
      {!sheet ? (
        <button type="button" onClick={() => setSheet(true)} aria-label={`${chat.mode === "off" ? "Reactions" : "Class chat"}${unread ? `, ${unread} new` : ""}`}
          className="fixed bottom-[4.5rem] left-4 z-[94] flex h-11 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-sm font-black text-ink shadow-xl ring-1 ring-line">
          {chat.mode === "off" ? "😀" : "💬"}{unread > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C2451C] px-1 text-[11px] text-white">{unread}</span>}
        </button>
      ) : (
        <div role="dialog" aria-label="Class chat" className="fixed inset-x-3 bottom-20 z-[95] mx-auto flex max-h-[70vh] max-w-md flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-line">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <p className="min-w-0 flex-1 text-sm font-black">{chat.mode === "off" ? "Reactions" : "Class chat"}</p>
            <button type="button" onClick={() => setSheet(false)} className="rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs font-black text-ink/70">Hide</button>
          </div>
          {chat.react && (
            <div role="group" aria-label="Send a reaction" className="flex justify-around border-b border-line px-2 py-1.5">
              {REACTIONS.map((e) => <button key={e} type="button" onClick={() => react(e)} aria-label={`React ${e}`} className="h-11 w-11 rounded-full text-2xl transition active:scale-125 hover:bg-ink/5">{e}</button>)}
            </div>
          )}
          {chat.mode !== "off" && (
            <>
              <div className="min-h-[80px] flex-1 overflow-y-auto p-3">{list(myId)}<div ref={end} /></div>
              <form onSubmit={(e) => { e.preventDefault(); say(); }} className="border-t border-line p-3">
                <div className="flex gap-2">
                  <input value={draft} maxLength={CHAT_MAX} onChange={(e) => { setDraft(e.target.value); setNote(null); }} placeholder="Write to the class…" aria-label="Your message" enterKeyHint="send"
                    className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2 text-base font-semibold ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E6E72]" />
                  <button type="submit" disabled={!draft.trim()} className="rounded-xl bg-[#0E6E72] px-4 text-sm font-black text-white disabled:opacity-40">Send</button>
                </div>
                <p role="status" className="mt-1 min-h-[1rem] text-xs font-bold text-ink/55">{note ?? "Be kind — your teacher sees every message."}</p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
