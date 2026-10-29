"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { loadPdfReader, putSigned } from "@/components/live/board/slides";
import { reportProblem } from "@/lib/liveDiag";

// "Check my class" — run before a class (teacher) or when something seems
// wrong (learner). Each check is real: it talks to the server, opens a live
// connection and waits for its own message to come back, loads the PDF reader,
// and (for a signed-in teacher) uploads and reads back a small picture.
type State = "wait" | "run" | "ok" | "warn" | "bad";
type Check = { key: string; title: string; state: State; note: string };

const START: Check[] = [
  { key: "server", title: "Server", state: "wait", note: "" },
  { key: "database", title: "Database updates", state: "wait", note: "" },
  { key: "live", title: "Live board connection", state: "wait", note: "" },
  { key: "pdf", title: "PDF reader (slides)", state: "wait", note: "" },
  { key: "upload", title: "Uploading slides & pictures", state: "wait", note: "" },
];

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<T>((_, no) => setTimeout(() => no(new Error(`${what} took longer than ${ms / 1000}s`)), ms))]);

function testPicture(): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0E6E72"; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#C6F35C"; ctx.fillRect(16, 16, 32, 32);
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't make a test picture"))), "image/jpeg", 0.8));
}

// Join a throwaway channel, send one message and wait for it to come back.
async function liveRoundTrip(): Promise<number> {
  const supabase = supabaseBrowser();
  const ch = supabase.channel(`class-check:${crypto.randomUUID()}`, { config: { broadcast: { self: true, ack: false } } });
  try {
    return await withTimeout(new Promise<number>((ok, no) => {
      let sentAt = 0;
      ch.on("broadcast", { event: "ping" }, () => ok(Date.now() - sentAt));
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") { sentAt = Date.now(); ch.send({ type: "broadcast", event: "ping", payload: { at: sentAt } }); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") no(new Error(status === "TIMED_OUT" ? "the connection timed out" : "the connection was refused"));
      });
    }), 12_000, "The live connection");
  } finally { supabase.removeChannel(ch); }
}

export default function ClassCheck() {
  const [checks, setChecks] = useState<Check[]>(START);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    setRunning(true); setDone(false);
    const out = START.map((c) => ({ ...c }));
    const set = (key: string, state: State, note: string) => {
      const c = out.find((x) => x.key === key)!; c.state = state; c.note = note;
      setChecks(out.map((x) => ({ ...x })));
    };
    out.forEach((c) => (c.state = "run")); setChecks(out.map((x) => ({ ...x })));

    // 1–2. Server and database.
    try {
      const t0 = Date.now();
      const r = await withTimeout(fetch("/api/live-sessions/check", { cache: "no-store" }), 15_000, "The server");
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `the server answered ${r.status}`);
      const ms = Date.now() - t0;
      set("server", ms > 4000 ? "warn" : "ok", ms > 4000 ? `Answering, but slowly (${(ms / 1000).toFixed(1)}s) — the internet here is weak.` : `Answering (${ms} ms).`);
      const missing = (j.database ?? []).filter((d: any) => !d.ready);
      set("database", missing.length ? "bad" : "ok", missing.length
        ? `Not set up yet: ${missing.map((d: any) => `${d.name} — run supabase/${d.file} in Supabase → SQL Editor`).join("; ")}.`
        : "Everything the live classes need is in place.");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      set("server", "bad", `Couldn't reach the server (${m}). Check the internet connection.`);
      set("database", "warn", "Not checked — the server didn't answer.");
    }

    // 3. Live connection.
    try {
      const ms = await liveRoundTrip();
      set("live", ms > 3000 ? "warn" : "ok", ms > 3000
        ? `Working but slow (${(ms / 1000).toFixed(1)}s per message). Writing will still arrive — the board also uses a backup route.`
        : `Working — a message went out and back in ${ms} ms.`);
    } catch (e) {
      set("live", "bad", `The live connection didn't work (${e instanceof Error ? e.message : e}). Writing will still reach the teacher through the backup route, but more slowly. Try another network (or turn off a VPN / data saver) for the best class.`);
    }

    // 4. PDF reader.
    try {
      await withTimeout(loadPdfReader(), 30_000, "The PDF reader");
      const w = await withTimeout(fetch("/pdf.worker.min.mjs", { cache: "force-cache" }), 30_000, "The PDF helper");
      if (!w.ok) throw new Error(`helper file answered ${w.status}`);
      set("pdf", "ok", "Ready — PDFs can be turned into slides on this device.");
    } catch (e) {
      set("pdf", "bad", `The PDF reader didn't load (${e instanceof Error ? e.message : e}). Pictures (JPG/PNG) still upload; try PDFs on a stronger connection.`);
    }

    // 5. A real upload, for a signed-in teacher.
    try {
      const r = await fetch("/api/live-sessions/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upload" }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) set("upload", "warn", "Sign in as a teacher and run this again to test uploads (learners don't upload slides).");
      else if (!r.ok) throw new Error(j.error ?? `the server answered ${r.status}`);
      else {
        const t0 = Date.now(), pic = await testPicture();
        let via = "";
        try { await withTimeout(putSigned(j, pic, () => {}), 45_000, "The upload"); }
        catch (direct) {
          // Storage can't be reached from this network: try the board's second road, through our server.
          const form = new FormData(); form.append("path", j.path); form.append("token", j.token); form.append("file", pic, "check.jpg");
          const r2 = await withTimeout(fetch("/api/live-sessions/slides/upload", { method: "POST", body: form }), 45_000, "The upload through the server");
          if (!r2.ok) throw new Error(`${direct instanceof Error ? direct.message : direct}; through the server: ${(await r2.json().catch(() => ({}))).error ?? r2.status}`);
          via = " (through the server — this network blocks direct uploads, so the board will use that road)";
        }
        const back = await withTimeout(fetch(`${j.url}?t=${Date.now()}`, { cache: "no-store" }), 20_000, "Reading the picture back");
        if (!back.ok) throw new Error(`uploaded, but learners couldn't open it (${back.status}) — the "materials" storage bucket must be public`);
        set("upload", via ? "warn" : "ok", `Working — a test picture uploaded and opened again in ${((Date.now() - t0) / 1000).toFixed(1)}s${via}.`);
      }
    } catch (e) {
      set("upload", "bad", `Upload failed (${e instanceof Error ? e.message : e}). Check the internet; if it keeps failing, tell support.`);
    }

    const bad = out.filter((c) => c.state === "bad");
    reportProblem(bad.length ? "check-failed" : "check-passed", { message: bad.map((c) => `${c.title}: ${c.note}`).join(" | ").slice(0, 300) || "all good" });
    setRunning(false); setDone(true);
  }

  const bad = checks.filter((c) => c.state === "bad").length, warn = checks.filter((c) => c.state === "warn").length;
  return (
    <div>
      <p className="text-sm text-dmb-muted">Run this before class, on the device and internet you&apos;ll teach with. It takes under a minute and tests the real thing.</p>
      <button onClick={run} disabled={running} className="dmb-btn mt-4 w-full disabled:opacity-60">
        {running ? "Checking…" : done ? "Check again" : "Start the check"}
      </button>
      <ul className="mt-5 space-y-3" aria-live="polite">
        {checks.map((c) => (
          <li key={c.key} className="flex gap-3 rounded-2xl border border-dmb-rule p-3">
            <Dot state={c.state} />
            <div className="min-w-0">
              <p className="font-semibold">{c.title}</p>
              {c.note && <p className="mt-0.5 break-words text-sm text-dmb-muted">{c.note}</p>}
            </div>
          </li>
        ))}
      </ul>
      {done && (
        <p className={`mt-5 rounded-2xl p-4 text-sm font-semibold ${bad ? "bg-red-50 text-red-900" : warn ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
          {bad ? `${bad} check${bad === 1 ? "" : "s"} failed — see the advice above.` : warn ? "Ready, with the notes above." : "All good — you're ready for class."}
        </p>
      )}
    </div>
  );
}

function Dot({ state }: { state: State }) {
  const label = { wait: "Not run yet", run: "Checking", ok: "Passed", warn: "Note", bad: "Failed" }[state];
  const cls = { wait: "bg-dmb-rule text-dmb-muted", run: "bg-dmb-teal/15 text-dmb-teal", ok: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", bad: "bg-red-100 text-red-800" }[state];
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`} role="img" aria-label={label}>
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${state === "run" ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {state === "ok" ? <path d="M5 12.5l4.5 4.5L19 7.5" />
          : state === "bad" ? <path d="M7 7l10 10M17 7L7 17" />
          : state === "warn" ? <path d="M12 7v6M12 17h.01" />
          : state === "run" ? <path d="M12 3a9 9 0 1 0 9 9" />
          : <circle cx="12" cy="12" r="3" />}
      </svg>
    </span>
  );
}
