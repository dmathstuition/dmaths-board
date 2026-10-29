import Link from "next/link";
import { BoardFooter, BoardTopBar } from "@/components/board/BoardBrand";

// D-Maths Board's own legal pages (terms, privacy, refunds) — separate from
// the academy's, in the board's look.
export default function BoardLegal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="dmb-sky flex min-h-dvh flex-col">
      <BoardTopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-board">D-Maths Board · updated {updated}</p>
        <h1 className="mt-2 font-dmbDisplay text-[44px] leading-tight">{title}</h1>
        <article className="dmb-glass mt-6 p-6 sm:p-10">
          <nav className="flex flex-wrap gap-2 text-sm font-semibold" aria-label="D-Maths Board policies">
            {[["/terms", "Terms"], ["/privacy", "Privacy"], ["/refunds", "Payments & refunds"]].map(([h, l]) => (
              <Link key={h} href={h} className="dmb-link rounded-full border border-dmb-rule bg-white px-3 py-1.5 text-dmb-muted hover:text-dmb-ink">{l}</Link>
            ))}
          </nav>
          <div className="mt-8 space-y-5 text-[15.5px] leading-relaxed text-dmb-muted [&_b]:text-dmb-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
        </article>
      </main>
      <BoardFooter />
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-3 font-dmbDisplay text-[26px] text-dmb-ink">{children}</h2>;
}
