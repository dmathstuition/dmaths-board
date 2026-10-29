"use client";
import type { HostBase } from "@/lib/liveSession";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Row = { id: string; title: string; subject: string; shared: boolean; pages: number; items: number; updated_at: string; ownerName?: string };

// Lesson boards: prepare whiteboard lessons before class and share them.
export default function LessonLibrary({ base }: { base: HostBase }) {
  const router = useRouter();
  const [lists, setLists] = useState<{ mine: Row[]; shared: Row[] } | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(""); const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => fetch("/api/board-lessons").then(async (r) => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Couldn't load your lessons");
    setLists({ mine: j.mine ?? [], shared: j.shared ?? [] });
  }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function post(body: object) {
    const r = await fetch("/api/board-lessons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Something went wrong");
    return j;
  }
  async function create() {
    setBusy("new"); setError("");
    try { const j = await post({ action: "save", title: title || "Untitled lesson", subject }); router.push(`${base}/lessons/${j.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't create the lesson"); setBusy(""); }
  }
  async function act(id: string, what: "copy" | "share" | "unshare" | "delete") {
    if (what === "delete" && !confirm("Delete this lesson? This can't be undone.")) return;
    setBusy(id); setError("");
    try {
      if (what === "copy") { const j = await post({ action: "copy", id }); router.push(`${base}/lessons/${j.id}`); return; }
      if (what === "delete") { const r = await fetch(`/api/board-lessons?id=${id}`, { method: "DELETE" }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't delete"); }
      else await post({ action: "save", id, shared: what === "share" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(""); }
  }
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const card = "rounded-2xl bg-white p-4 ring-1 ring-line";
  return (
    <div className="space-y-5">
      <div className={card}>
        <p className="font-display text-lg font-black text-ink">Prepare a new lesson</p>
        <p className="mt-1 text-sm text-ink/60">Add slides, writing, activities and class tools now — then open it in one click from <b>Lessons</b> on the interactive board.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Lesson title, e.g. Adding fractions" aria-label="Lesson title" className="field min-w-[220px] flex-1 !w-auto" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="Subject" aria-label="Subject" className="field !w-40" />
          <button type="button" onClick={create} disabled={!!busy} className="btn-ink">{busy === "new" ? "Creating…" : "Create lesson"}</button>
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{error}</p>}
      {!lists && !error && <div className="card h-40 animate-pulse" />}
      {lists && (base === "/app" ? (["mine"] as const) : (["mine", "shared"] as const)).map((k) => (
        <section key={k} className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-ink/50">{k === "mine" ? "My lessons" : "Shared by other tutors"}</h2>
          {!lists[k].length && <p className="text-sm text-ink/50">{k === "mine" ? "No lessons yet." : "Nothing shared yet."}</p>}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists[k].map((l) => (
              <li key={l.id} className={`${card} flex flex-col gap-2`}>
                <div>
                  <p className="font-black text-ink">{l.title}</p>
                  <p className="text-xs font-semibold text-ink/55">{[l.subject, `${l.pages} page${l.pages === 1 ? "" : "s"}`, k === "shared" ? l.ownerName : null, `updated ${when(l.updated_at)}`].filter(Boolean).join(" · ")}</p>
                  {k === "mine" && l.shared && <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">Shared with tutors</span>}
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {k === "mine" ? (
                    <>
                      <Link href={`${base}/lessons/${l.id}`} className="btn-ink !min-h-[38px] !px-3 !text-xs">Edit</Link>
                      {base !== "/app" && <button type="button" disabled={busy === l.id} onClick={() => act(l.id, l.shared ? "unshare" : "share")} className="btn-ghost !min-h-[38px] !px-3 !text-xs">{l.shared ? "Stop sharing" : "Share"}</button>}
                      <button type="button" disabled={busy === l.id} onClick={() => act(l.id, "delete")} className="btn-ghost !min-h-[38px] !px-3 !text-xs !text-red-600">Delete</button>
                    </>
                  ) : (
                    <>
                      <Link href={`${base}/lessons/${l.id}`} className="btn-ghost !min-h-[38px] !px-3 !text-xs">View</Link>
                      <button type="button" disabled={busy === l.id} onClick={() => act(l.id, "copy")} className="btn-ink !min-h-[38px] !px-3 !text-xs">Copy to my lessons</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
