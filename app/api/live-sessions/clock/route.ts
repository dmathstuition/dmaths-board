import { NextResponse } from "next/server";

// The server's clock, so every phone in a class counts down to the same moment
// even when a phone's own clock is wrong (lib/serverClock.ts).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
