"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BoardBrand } from "@/components/board/BoardBrand";

const LINKS = [
  { href: "/app", label: "Home" },
  { href: "/app/live", label: "Classes" },
  { href: "/app/lessons", label: "Lessons" },
  { href: "/app/quizzes", label: "Quizzes" },
  { href: "/app/billing", label: "Billing" },
];

export default function BoardAppNav({ name, badge, isAdmin = false }: { name: string; badge: string | null; isAdmin?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === href : path.startsWith(href));
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.assign(isAdmin ? "/login" : "/login");
  }
  return (
    <header className="sticky top-0 z-30 border-b border-dmb-rule bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2.5 sm:px-4">
        <BoardBrand href="/app" />
        {badge && <span className="rounded-full bg-dmb-mint px-2.5 py-1 text-xs font-bold text-dmb-board">{badge}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm font-medium text-dmb-muted sm:inline">{name}</span>
          {isAdmin && <Link href="/admin" className="dmb-link min-h-[36px] rounded-lg px-3 py-2 text-sm font-semibold text-dmb-ink ring-1 ring-dmb-rule hover:bg-dmb-paper">Admin</Link>}
          <button type="button" onClick={signOut} className="dmb-link min-h-[36px] rounded-lg px-3 text-sm font-semibold text-dmb-ink ring-1 ring-dmb-rule hover:bg-dmb-paper">Sign out</button>
        </div>
        <nav className="-mb-px flex w-full gap-1 overflow-x-auto" aria-label="D-Maths Board">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
              className={`dmb-link shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${active(l.href) ? "border-dmb-board text-dmb-ink" : "border-transparent text-dmb-muted hover:text-dmb-ink"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
