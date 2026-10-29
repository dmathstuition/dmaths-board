import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { canWrite } from "@/lib/liveSession";
import { BOARD_MAX_PAGES, cleanStroke } from "@/lib/whiteboard";

// Backup route for live-class writing (supabase/migration-board-inbox.sql).
// A learner's board posts an item here when the live connection can't deliver
// it; the teacher's board collects new items every few seconds.
//   POST { id, page, kind: "add" | "move", item }   — a learner who may write
//   GET  ?id=&since=<iso>                            — the host
export const dynamic = "force-dynamic";
const MISSING = /live_board_inbox/i;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const v = await sessionViewer(id).catch(() => null);
  if (!v || v.host) return bad("Only learners in this class send writing this way.", 403);
  if (!canWrite(v.session, v, v.seat)) return bad("Your teacher hasn't let you write yet.", 403);
  if (!rateLimit(`inbox:${v.id}`, 240, 60_000)) return bad("Slow down a little.", 429);
  const item = cleanStroke(body?.item);
  if (!item) return bad("That item can't be read.");
  if (String(item.by) !== v.id) return bad("You can only send your own writing.", 403);
  const kind = body?.kind === "move" ? "move" : "add";
  const page = Math.max(0, Math.min(BOARD_MAX_PAGES - 1, Math.round(Number(body?.page) || 0)));
  const { error } = await supabaseAdmin().from("live_board_inbox").upsert(
    { session_id: id, item_id: item.id, kind, sender: v.id, page, item, at: new Date().toISOString() },
    { onConflict: "session_id,item_id,kind" },
  );
  if (error) return MISSING.test(error.message) ? bad("missing", 501) : bad(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const since = url.searchParams.get("since") ?? "";
  const v = await sessionViewer(id).catch(() => null);
  if (!v?.host) return bad("Only the host collects writing.", 403);
  let q = supabaseAdmin().from("live_board_inbox").select("item_id, kind, sender, page, item, at").eq("session_id", id).order("at", { ascending: true }).limit(500);
  if (since && !Number.isNaN(Date.parse(since))) q = q.gt("at", since);
  const { data, error } = await q;
  if (error) return MISSING.test(error.message) ? bad("missing", 501) : bad(error.message, 500);
  return NextResponse.json({ items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
