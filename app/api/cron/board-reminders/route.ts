import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendBoardReminders } from "@/lib/boardReminders";

// Daily renewal reminders (14 and 3 days before a plan ends). Called by Vercel
// Cron with Authorization: Bearer <CRON_SECRET>, or by hand with ?key=<CRON_SECRET>.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!secret || (header !== `Bearer ${secret}` && key !== secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sent = await sendBoardReminders(supabaseAdmin()).catch(() => 0);
  return NextResponse.json({ ok: true, sent });
}
