import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendHomeworkReminders } from "@/lib/homeworkReminders";

// The evening homework reminder (lib/homeworkReminders.ts). Called by Vercel
// Cron with Authorization: Bearer <CRON_SECRET>, or by hand with ?key=<CRON_SECRET>.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!secret || (header !== `Bearer ${secret}` && key !== secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out = await sendHomeworkReminders(supabaseAdmin()).catch(() => ({ assignments: 0, sent: 0 }));
  return NextResponse.json({ ok: true, ...out });
}
