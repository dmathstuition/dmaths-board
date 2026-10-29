import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Server-side route protection for D-Maths Board.
// - /app is for board teachers and admins; /admin is for admins only.
// - An account with two-factor turned on must finish it before using any page or API.
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  if (path.startsWith("/api")) {
    // The cron route checks its own secret and is called without a session.
    if (path.startsWith("/api/cron/")) return res;
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      return NextResponse.json({ error: "Two-factor verification required. Please sign in again." }, { status: 403 });
    }
    return res;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    return NextResponse.redirect(new URL("/login?mfa=1", req.url));
  }

  const isPrefetch = req.headers.get("next-router-prefetch") === "1" || req.headers.get("purpose") === "prefetch";
  if (!isPrefetch) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role;
    if (path.startsWith("/admin") && role !== "admin") return NextResponse.redirect(new URL("/app", req.url));
    if (path.startsWith("/app") && role !== "board_teacher" && role !== "admin") return NextResponse.redirect(new URL("/login", req.url));
  }

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export const config = { matcher: ["/app", "/app/:path*", "/admin/:path*", "/api/:path*"] };
