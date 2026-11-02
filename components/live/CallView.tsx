"use client";
import { useEffect, useRef, type ReactNode } from "react";
import type { CallView as View } from "@/lib/callLayout";

// The video call on top of the board: a gallery of everyone, or the person
// talking (or the shared screen) big with a strip of others. "Board" shrinks it
// back to a corner picture so the lesson is on screen again.
export type Tile = { id: string; name: string; stream: MediaStream | null; muted: boolean; talking: boolean; me?: boolean; host?: boolean; hand?: boolean };

export default function CallView({ view, onView, big, screen, tiles, page, pages, onPage, count, bar }: {
  view: Exclude<View, "board">; onView: (v: View) => void; big: Tile | null; screen: { name: string; stream: MediaStream | null } | null;
  tiles: Tile[]; page: number; pages: number; onPage: (p: number) => void; count: number; bar: ReactNode;
}) {
  const tab = (v: View, label: string) => (
    <button type="button" onClick={() => onView(v)} aria-pressed={view === v} className={`min-h-[34px] rounded-lg px-3 text-xs font-black ${view === v ? "bg-white text-[#0B1220]" : "text-white/75 hover:bg-white/10"}`}>{label}</button>
  );
  return (
    <section aria-label="Video call" className="absolute inset-0 z-30 flex flex-col bg-[#0B1220] text-white">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <p className="mr-auto flex items-center gap-2 text-sm font-black"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />Video call · {count} {count === 1 ? "person" : "people"}</p>
        <div className="flex gap-1 rounded-xl bg-white/10 p-1" role="group" aria-label="Call layout">
          {tab("gallery", "Gallery")}{tab("speaker", "Speaker")}{tab("board", "Back to the board")}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-2">
        {view === "speaker" ? (
          <div className="flex h-full flex-col gap-2">
            <div className="min-h-0 flex-1">
              {screen ? <Frame name={`${screen.name}'s screen`} stream={screen.stream} contain /> : big ? <Person t={big} large /> : <Empty />}
            </div>
            {tiles.length > 0 && <div className="grid h-24 shrink-0 grid-cols-5 gap-2 sm:h-28">{tiles.map((t) => <Person key={t.id} t={t} />)}</div>}
          </div>
        ) : (
          <div className={`grid h-full gap-2 ${tiles.length <= 1 ? "grid-cols-1" : tiles.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`} style={{ gridAutoRows: "1fr" }}>
            {tiles.map((t) => <Person key={t.id} t={t} />)}
            {!tiles.length && <Empty />}
          </div>
        )}
      </div>
      {view === "gallery" && pages > 1 && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs font-black">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0} className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-30" aria-label="Previous page of people">←</button>
          <span>Page {page + 1} of {pages}</span>
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages - 1} className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-30" aria-label="Next page of people">→</button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 p-2">{bar}</div>
    </section>
  );
}

function Person({ t, large = false }: { t: Tile; large?: boolean }) {
  return (
    <div className={`relative h-full min-h-0 overflow-hidden rounded-xl bg-[#1E293B] ring-2 transition ${t.talking && !t.muted ? "ring-emerald-400" : "ring-transparent"}`} aria-label={`${t.name}${t.me ? " (you)" : ""}${t.muted ? ", muted" : ""}${t.talking && !t.muted ? ", talking" : ""}`}>
      {t.stream ? <Frame name={t.name} stream={t.stream} mirror={t.me} /> : (
        <div className="flex h-full items-center justify-center">
          <span className={`flex items-center justify-center rounded-full bg-[#1657C9] font-black ${large ? "h-28 w-28 text-4xl" : "h-12 w-12 text-lg"}`} aria-hidden>{initials(t.name)}</span>
        </div>
      )}
      <span className="absolute bottom-1 left-1 flex max-w-[90%] items-center gap-1 truncate rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold">
        {t.muted ? <span aria-hidden>🔇</span> : <span aria-hidden>🎙</span>}{t.hand && <span aria-hidden>✋</span>}{t.name}{t.me ? " (you)" : t.host ? " · teacher" : ""}
      </span>
    </div>
  );
}

function Frame({ name, stream, mirror = false, contain = false }: { name: string; stream: MediaStream | null; mirror?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v && v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); } }, [stream]);
  return <video ref={ref} autoPlay playsInline muted aria-label={`Video of ${name}`} className={`h-full w-full ${contain ? "object-contain" : "object-cover"} ${mirror ? "-scale-x-100" : ""}`} />;
}

function Empty() {
  return <div className="flex h-full items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-white/60">Nobody else has joined yet.</div>;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
