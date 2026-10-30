"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BoardBrand } from "@/components/board/BoardBrand";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/board", label: "Teachers" },
];

// The admin section's header: dashboard and teacher list, plus a way back to the board.
export default function AdminNav({ name }: { name: string }) {
  const path = usePathname();
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.assign("/login");
  }
  return (
    <header className="sticky top-0 z-30 border-b border-dmb-rule bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-3 pt-2.5 sm:px-4">
        <BoardBrand href="/admin" />
        <span className="rounded-full bg-dmb-ink px-2.5 py-1 text-xs font-bold text-white">Admin</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm font-medium text-dmb-muted sm:inline">{name}</span>
          <Link href="/app" className="dmb-link min-h-[36px] rounded-lg px-3 py-2 text-sm font-semibold text-dmb-ink ring-1 ring-dmb-rule hover:bg-dmb-paper">Open the board</Link>
          <button type="button" onClick={signOut} className="dmb-link min-h-[36px] rounded-lg px-3 text-sm font-semibold text-dmb-ink ring-1 ring-dmb-rule hover:bg-dmb-paper">Sign out</button>
        </div>
        <nav className="-mb-px flex w-full gap-1 overflow-x-auto" aria-label="Admin">
          {LINKS.map((l) => {
            const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
                className={`dmb-link shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${on ? "border-dmb-board text-dmb-ink" : "border-transparent text-dmb-muted hover:text-dmb-ink"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
