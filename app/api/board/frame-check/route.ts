import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { frameVerdict, isPrivateIp, webAddress, type FrameVerdict } from "@/lib/webView";

// The board's web browser (lib/webView.ts): does this site let itself be shown
// inside another page?   POST { sessionId, url } → { verdict: "ok" | "blocked" | "unknown", url }
//
// Only the class's teacher may ask, a few times a minute. The address must be
// a public https site (checked again after every redirect, and by where its
// name really points), only the response headers are read, and nothing from
// the site is ever sent back — just the verdict.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function publicHost(host: string): Promise<boolean> {
  try {
    const found = await lookup(host, { all: true });
    return found.length > 0 && found.every((a) => !isPrivateIp(a.address));
  } catch { return false; }
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const v = await sessionViewer(String(b?.sessionId ?? "")).catch(() => null);
  if (!v?.host) return bad("Only the teacher can open web pages.", 403);
  if (!rateLimit(`frame-check:${v.id}`, 30, 60_000)) return bad("Wait a moment and try again.", 429);
  const self = new URL(req.url);
  let url = webAddress(String(b?.url ?? ""), self.hostname);
  if (!url) return bad("That isn't a web address we can open.");

  let verdict: FrameVerdict = "unknown";
  try {
    for (let hop = 0; hop < 5; hop++) {
      if (!(await publicHost(new URL(url).hostname))) return bad("That isn't a web address we can open.");
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(6000), cache: "no-store",
        headers: { "user-agent": "Mozilla/5.0 (compatible; DMathsBoard/1.0; +https://dmaths.academy)", accept: "text/html,*/*;q=0.5" } });
      void res.body?.cancel().catch(() => {});
      const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (next) {
        const to = webAddress(new URL(next, url).toString(), self.hostname);
        if (!to) break; // redirects somewhere we won't follow: leave it "unknown"
        url = to; continue;
      }
      verdict = res.status < 400 ? frameVerdict({ xfo: res.headers.get("x-frame-options"), csp: res.headers.get("content-security-policy") }, self.origin)
        : "unknown"; // some sites turn away anything that isn't a browser: we can't tell
      break;
    }
  } catch { verdict = "unknown"; }
  return NextResponse.json({ verdict, url }, { headers: { "Cache-Control": "no-store" } });
}
