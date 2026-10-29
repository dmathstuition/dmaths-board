import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Records the current user's last sign-in time. Called by the login page after
// a successful sign-in. Server-side + service role so the timestamp is trusted.
export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await supabaseAdmin()
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);
  return NextResponse.json({ ok: true });
}
