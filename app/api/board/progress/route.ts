import { NextResponse } from "next/server";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { signProgress } from "@/lib/classReportLink";
import { cleanDays } from "@/lib/termProgress";

// A link to a learner's term progress page (/progress), to open or send home.
//   GET ?sessionId=&name=&days=   the teacher: any learner by name; a learner: only themself
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v) return NextResponse.json({ error: "Join the class first." }, { status: 403 });
  if (!rateLimit(`progress-link:${v.id}`, 40, 60_000)) return NextResponse.json({ error: "Wait a moment and try again." }, { status: 429 });
  const host = v.session.host_id;
  if (!host) return NextResponse.json({ error: "This class has no teacher." }, { status: 404 });
  const name = (v.host ? url.searchParams.get("name") ?? "" : v.name).trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Which learner?" }, { status: 400 });
  const link = `/progress?t=${encodeURIComponent(signProgress({ h: host, n: name, d: cleanDays(url.searchParams.get("days")) }))}`;
  return NextResponse.json({ link }, { headers: { "Cache-Control": "no-store" } });
}
