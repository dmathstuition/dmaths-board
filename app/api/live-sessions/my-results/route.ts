import { NextResponse } from "next/server";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { learnerDetail } from "@/lib/learnerResults";
import { signReport } from "@/lib/classReportLink";
import { standings } from "@/lib/starsServer";
import { nameKey } from "@/lib/stars";

// A learner's own results from a class (during it, or after it ends):
//   GET ?id= → { detail, link }   (link: their report page, to keep or send home)
// Only the learner themself; the teacher has /api/live-sessions/results.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const v = await sessionViewer(id).catch(() => null);
  if (!v || v.host) return NextResponse.json({ error: "Join the class to see your results." }, { status: 403 });
  if (!rateLimit(`my-results:${v.id}`, 30, 60_000)) return NextResponse.json({ error: "Wait a moment and try again." }, { status: 429 });
  const detail = await learnerDetail(id, v.id).catch(() => null);
  if (!detail) return NextResponse.json({ error: "Your results aren't ready yet." }, { status: 404 });
  const link = `/report?t=${encodeURIComponent(signReport({ s: id, g: v.id, c: "", h: "" }))}`;
  // Their stars and badges across this teacher's classes (matched by name).
  let stars = null;
  if (v.session.host_id) {
    const all = await standings(v.session.host_id, id, v.session.created_at, "all").catch(() => null);
    const i = all ? all.list.findIndex((p) => p.key === nameKey(v.name)) : -1;
    if (all && i >= 0) stars = { stars: all.list[i].stars, classStars: all.list[i].classStars, badges: all.list[i].badges, rank: i + 1, of: all.list.length };
  }
  return NextResponse.json({ detail, link, stars }, { headers: { "Cache-Control": "no-store" } });
}
