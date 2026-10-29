"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardAccess } from "@/lib/boardPlan";

type Account = { userId: string; name: string; email: string; school: string | null; phone: string | null; joined: string; access: BoardAccess; paidTotal: number; suspended: boolean };

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const TONE: Record<BoardAccess["state"], string> = {
  trial: "bg-sky-50 text-sky-800", active: "bg-emerald-50 text-emerald-800", expired: "bg-amber-50 text-amber-800",
  suspended: "bg-red-50 text-red-700", unverified: "bg-ink/5 text-ink/60",
};

// Admin view of D-Maths Board subscribers: who's on trial, paid or lapsed,
// revenue, and manual extend / suspend.
export default function BoardAdmin() {
  const [data, setData] = useState<{ accounts: Account[]; revenue: number } | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | BoardAccess["state"]>("all");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/board/admin").catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Couldn't load subscribers."); return; }
    setErr(""); setData(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(a: Account, action: "extend" | "suspend" | "unsuspend") {
    let days: number | undefined;
    if (action === "extend") {
      const v = prompt(`Add how many days for ${a.name || a.email}?`, "30");
      if (!v) return;
      days = Number(v);
      if (!Number.isFinite(days) || days < 1) return;
    } else if (!confirm(`${action === "suspend" ? "Put on hold" : "Restore"} ${a.name || a.email}'s account?`)) return;
    setBusy(a.userId);
    const r = await fetch("/api/board/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.userId, action, days }) }).catch(() => null);
    setBusy("");
    if (!r?.ok) { const j = r ? await r.json().catch(() => ({})) : {}; setErr(j.error ?? "That didn't work."); return; }
    load();
  }

  function downloadCsv() {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Email", "Phone", "School", "Status", "Until", "Paid (NGN)", "Joined"];
    const lines = (data?.accounts ?? []).map((a) => [a.name, a.email, a.phone, a.school, a.access.state, a.access.until?.slice(0, 10), a.paidTotal, a.joined?.slice(0, 10)].map(q).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = `dmaths-board-subscribers-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, trial: 0, active: 0, expired: 0, suspended: 0, unverified: 0 };
    for (const a of data?.accounts ?? []) { c.all++; c[a.access.state]++; }
    return c;
  }, [data]);
  const rows = (data?.accounts ?? []).filter((a) => (filter === "all" || a.access.state === filter) &&
    (!q.trim() || `${a.name} ${a.email} ${a.school ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="space-y-5">
      <div className="page-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-board to-boardDeep p-7 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold">D-Maths Board</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Board subscribers</h1>
        <p className="mt-2 max-w-2xl text-white/75">Teachers outside the academy using the interactive board at <a href="/" className="font-bold underline">dmaths.academy</a>.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="/app" className="btn-gold !min-h-[44px]">Open D-Maths Board</a>
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-xl bg-white/10 px-4 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20">View public page ↗</a>
          {data && <button type="button" onClick={downloadCsv} className="inline-flex min-h-[44px] items-center rounded-xl bg-white/10 px-4 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20">Download CSV</button>}
        </div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{err}</p>}
      {data && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[["Revenue", naira(data.revenue)], ["Paying", String(counts.active)], ["On trial", String(counts.trial)], ["Lapsed", String(counts.expired)]].map(([k, v]) => (
            <div key={k} className="card p-4"><p className="text-xs font-black uppercase tracking-wider text-ink/50">{k}</p><p className="mt-1 font-display text-2xl font-black text-ink">{v}</p></div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or school" aria-label="Search" className="field min-w-[220px] flex-1 !w-auto" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter" className="field !w-44">
          {(["all", "active", "trial", "expired", "unverified", "suspended"] as const).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)} ({counts[s] ?? 0})</option>)}
        </select>
      </div>
      {!data && !err && <div className="card h-48 animate-pulse" />}
      {data && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs font-black uppercase tracking-wider text-ink/50">
              <tr><th className="p-3">Teacher</th><th className="p-3">School</th><th className="p-3">Status</th><th className="p-3">Until</th><th className="p-3">Paid</th><th className="p-3">Joined</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.userId}>
                  <td className="p-3"><p className="font-bold text-ink">{a.name || "—"}</p><p className="text-xs text-ink/55">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p></td>
                  <td className="p-3 text-ink/70">{a.school || "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-black ${TONE[a.access.state]}`}>{a.access.state}</span></td>
                  <td className="p-3 text-ink/70">{day(a.access.until)}</td>
                  <td className="p-3 font-bold text-ink">{naira(a.paidTotal)}</td>
                  <td className="p-3 text-ink/70">{day(a.joined)}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <button type="button" disabled={busy === a.userId} onClick={() => act(a, "extend")} className="rounded-lg px-2 py-1 text-xs font-black text-ink hover:bg-mist/50">+ Days</button>
                    <button type="button" disabled={busy === a.userId} onClick={() => act(a, a.suspended ? "unsuspend" : "suspend")} className={`rounded-lg px-2 py-1 text-xs font-black ${a.suspended ? "text-emerald-700 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"}`}>{a.suspended ? "Restore" : "Hold"}</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-ink/55">No subscribers{filter !== "all" || q ? " match" : " yet"}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
