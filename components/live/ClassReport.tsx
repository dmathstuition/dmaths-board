"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { classResults, type MarkRow, type QuizAnswerRow, type QuizInfo } from "@/lib/classResults";
import { cleanContact, reportMessage, scoreLine, MAX_COVERED, MAX_HOMEWORK } from "@/lib/classReport";
import { waNumber } from "@/lib/whatsapp";

type Person = { id: string; name: string };
type Sent = "sending" | "sent" | "failed";

// After class: write what the class covered, then send each learner's parent a
// report (their marks + a link to the full report) by email or WhatsApp.
export default function ClassReport({ sessionId, people, title, teacher, date, board }: {
  sessionId: string; people: Person[]; title: string; teacher: string; date: string; board: boolean;
}) {
  const store = `class-report:${sessionId}`;
  const [covered, setCovered] = useState("");
  const [homework, setHomework] = useState("");
  const [data, setData] = useState<{ marks: MarkRow[]; quizzes: QuizInfo[]; answers: QuizAnswerRow[] } | null>(null);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [contactsReady, setContactsReady] = useState(true);
  const [links, setLinks] = useState<Record<string, string> | null>(null);
  const [preparedFor, setPreparedFor] = useState("");
  const [sent, setSent] = useState<Record<string, Sent>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try { const j = JSON.parse(localStorage.getItem(store) ?? "{}"); setCovered(j.c ?? ""); setHomework(j.h ?? ""); } catch { /* fresh */ }
  }, [store]);
  useEffect(() => { try { localStorage.setItem(store, JSON.stringify({ c: covered, h: homework })); } catch { /* private mode */ } }, [store, covered, homework]);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([
      fetch(`/api/live-sessions/results?id=${sessionId}`, { cache: "no-store" }).catch(() => null),
      fetch(`/api/live-sessions/report?id=${sessionId}`, { cache: "no-store" }).catch(() => null),
    ]);
    const rj = r?.ok ? await r.json().catch(() => null) : null;
    const cj = c?.ok ? await c.json().catch(() => null) : null;
    if (rj) setData(rj);
    if (cj) { setContacts((cur) => ({ ...cj.contacts, ...cur })); setContactsReady(cj.ready !== false); }
    if (!rj) setErr("Couldn't load the class results — check the internet.");
  }, [sessionId]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => (data ? classResults(people, data.marks, data.quizzes, data.answers) : []).sort((a, b) => a.name.localeCompare(b.name)), [data, people]);
  const textKey = `${covered}\u0000${homework}`;
  const stale = !!links && preparedFor !== textKey;

  async function prepare() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/live-sessions/report", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, action: "links", studentIds: rows.map((x) => x.id), covered, homework }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { setErr(j.error ?? "Couldn't prepare the reports — try again."); return; }
    setLinks(j.links); setPreparedFor(textKey); setSent({});
  }
  async function saveContact(id: string, value: string) {
    setContacts((cur) => ({ ...cur, [id]: value }));
    if (!board) return; // academy classes: used for this report only
    const r = await fetch("/api/live-sessions/report", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, action: "contact", studentId: id, contact: value }) }).catch(() => null);
    if (r && !r.ok && r.status !== 501) { const j = await r.json().catch(() => ({})); setErr(j.error ?? null); }
  }
  async function email(id: string) {
    const to = cleanContact(contacts[id]);
    if (to?.kind !== "email") return;
    setSent((s) => ({ ...s, [id]: "sending" }));
    const r = await fetch("/api/live-sessions/report", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sessionId, action: "email", studentId: id, to: to.value, covered, homework }) }).catch(() => null);
    setSent((s) => ({ ...s, [id]: r?.ok ? "sent" : "failed" }));
  }
  async function emailAll() {
    for (const row of rows) if (cleanContact(contacts[row.id])?.kind === "email" && sent[row.id] !== "sent") await email(row.id);
  }
  const message = (id: string) => {
    const row = rows.find((x) => x.id === id)!;
    return reportMessage({ learner: row.name, title, teacher, date, covered: covered.trim(), homework: homework.trim(), row, url: links?.[id] ?? "" });
  };
  async function copy(id: string) {
    try { await navigator.clipboard.writeText(message(id)); setCopied(id); setTimeout(() => setCopied(null), 2000); } catch { prompt("Copy this report:", message(id)); }
  }
  const emails = rows.filter((x) => cleanContact(contacts[x.id])?.kind === "email").length;

  return (
    <section className="card p-5 sm:p-6" aria-label="Class report to parents">
      <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Class report</p>
      <h2 className="mt-1 font-display text-2xl font-black text-ink">Send a report to parents</h2>
      <p className="mt-1 text-sm text-ink/60">Each parent gets what the class covered, their child&apos;s marks and a link to a full report — by email or WhatsApp.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-black text-ink/60">What we covered
          <textarea value={covered} maxLength={MAX_COVERED} rows={3} onChange={(e) => setCovered(e.target.value)} placeholder="e.g. Adding fractions with different denominators, using fraction walls."
            className="field mt-1 w-full resize-y" />
        </label>
        <label className="text-xs font-black text-ink/60">Homework (optional)
          <textarea value={homework} maxLength={MAX_HOMEWORK} rows={3} onChange={(e) => setHomework(e.target.value)} placeholder="e.g. Exercise 4B, questions 1–10."
            className="field mt-1 w-full resize-y" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={prepare} disabled={busy || !rows.length} className="btn-gold !min-h-[44px] disabled:opacity-50">{busy ? "Preparing…" : links ? (stale ? "Update the reports" : "Reports ready ✓") : "Prepare reports"}</button>
        {links && !stale && emails > 0 && <button type="button" onClick={emailAll} className="btn-ghost !min-h-[44px]">Email all parents ({emails})</button>}
        {stale && <p className="text-xs font-bold text-amber-700">You changed the text — update the reports before sending.</p>}
      </div>
      {!contactsReady && board && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">To keep parents&apos; contacts, run <code>supabase/migration-class-reports.sql</code> in Supabase. You can still type them in below and send.</p>}
      {err && <p className="mt-3 text-sm font-semibold text-red-600" role="alert">{err}</p>}

      {!data ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-ink/5" /> : !rows.length ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-ink/60">No learners joined this class.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((row) => {
            const c = cleanContact(contacts[row.id]);
            const ready = !!links && !stale;
            const wa = ready ? (c?.kind === "whatsapp" ? `https://wa.me/${waNumber(c.value)}?text=${encodeURIComponent(message(row.id))}` : `https://wa.me/?text=${encodeURIComponent(message(row.id))}`) : null;
            const st = sent[row.id];
            return (
              <li key={row.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{row.name}</p>
                  <p className="text-xs text-ink/55">{scoreLine(row)}</p>
                </div>
                <ContactInput label={`Parent of ${row.name}`} value={contacts[row.id] ?? ""} onSave={(v) => saveContact(row.id, v)} />
                <div className="flex flex-wrap gap-1.5">
                  {c?.kind === "email" && (
                    <button type="button" disabled={!ready || st === "sending" || st === "sent"} onClick={() => email(row.id)}
                      className="min-h-[40px] rounded-lg bg-[#1657C9] px-3 text-xs font-black text-white disabled:opacity-50">{st === "sent" ? "Emailed ✓" : st === "sending" ? "Sending…" : st === "failed" ? "Try again" : "Email"}</button>
                  )}
                  {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg bg-[#25D366] px-3 text-xs font-black text-white">WhatsApp</a>
                    : <span className="inline-flex min-h-[40px] items-center rounded-lg bg-[#25D366]/40 px-3 text-xs font-black text-white" aria-disabled>WhatsApp</span>}
                  <button type="button" disabled={!ready} onClick={() => copy(row.id)} className="min-h-[40px] rounded-lg bg-ink/5 px-3 text-xs font-black text-ink/70 disabled:opacity-50">{copied === row.id ? "Copied ✓" : "Copy"}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!links && rows.length > 0 && <p className="mt-2 text-xs font-semibold text-ink/50">Write what you covered, then press <b>Prepare reports</b> to send them.</p>}
    </section>
  );
}

// A parent's email or WhatsApp number, saved when the teacher leaves the box.
function ContactInput({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const bad = !!v.trim() && !cleanContact(v);
  return (
    <label className="min-w-0">
      <span className="sr-only">{label} — email or WhatsApp</span>
      <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (!bad && v.trim() !== value.trim()) onSave(v.trim()); }}
        placeholder="Parent's email or WhatsApp" aria-invalid={bad}
        className={`field w-full !min-h-[40px] text-sm ${bad ? "!border-red-400" : ""}`} />
      {bad && <span className="mt-0.5 block text-[11px] font-bold text-red-600">Not an email or phone number</span>}
    </label>
  );
}
