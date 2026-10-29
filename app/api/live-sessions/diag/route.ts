import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser } from "@/lib/sessionAccess";
import { clientKey, rateLimit } from "@/lib/ratelimit";

// The class problem log: boards, quizzes and uploads report trouble here (lib/liveDiag)
// and it lands in audit_log as "live_problem", shown on Admin → System health.
//   POST { event, sessionId?, ...detail }
export const dynamic = "force-dynamic";
const EVENTS = new Set(["live-offline", "live-recovered", "backup-route-used", "backup-route-missing", "upload-failed", "upload-partial", "pdf-unreadable", "check-failed", "check-passed"]);

// Up to 10 simple values, each clipped — never the raw client object.
function smallObject(v: unknown): Record<string, string | number | boolean> | null {
  if (!v || typeof v !== "object") return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, x] of Object.entries(v).slice(0, 10)) {
    if (typeof x === "number" || typeof x === "boolean") out[k.slice(0, 30)] = x;
    else if (typeof x === "string") out[k.slice(0, 30)] = x.slice(0, 120);
  }
  return out;
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "live-diag"), 30, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? "");
  if (!EVENTS.has(event)) return NextResponse.json({ ok: false }, { status: 400 });
  const me = await currentUser().catch(() => null);
  const clip = (v: unknown, n = 200) => (v == null ? null : String(v).slice(0, n));
  const detail = {
    event, sessionId: clip(body?.sessionId, 40), role: clip(body?.role, 20), page: clip(body?.page, 120),
    message: clip(body?.message, 300), online: body?.online === true, connection: clip(body?.connection, 12),
    ua: clip(body?.ua, 160), extra: smallObject(body?.extra),
  };
  await supabaseAdmin().from("audit_log").insert({ actor_id: me?.id ?? null, action: "live_problem", detail }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
