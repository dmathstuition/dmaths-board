import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

// Handles email sign-in links (password reset). Supabase sends either
// ?token_hash=…&type=recovery (custom email template) or ?code=… (the default
// template). Either way we set the session cookies, then go to `next`.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  // Only ever go to a path on this site (never "//evil.com" or another origin).
  const requested = url.searchParams.get("next") || "";
  const next = /^\/(?!\/)/.test(requested) ? requested : "/reset-password";

  const supabase = supabaseServer();
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=reset", url.origin));
}
