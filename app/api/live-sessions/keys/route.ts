import { NextResponse } from "next/server";
import { sessionViewer } from "@/lib/sessionAccess";
import { sessionKeys } from "@/lib/liveSign";

// The class's message-signing keys: everyone in the class gets the public
// key (to check the teacher's messages); only the host gets the private key.
//   GET ?id=<sessionId>
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad class." }, { status: 400 });
  const v = await sessionViewer(id);
  if (!v) return NextResponse.json({ error: "You're not in this class." }, { status: 403 });
  const { pub, priv } = sessionKeys(id);
  return NextResponse.json(v.host ? { pub, priv } : { pub }, { headers: { "Cache-Control": "private, no-store" } });
}
