import Link from "next/link";
import { useId } from "react";

// The D-Maths Board mark: a teal "D" with a lime tick cutting through it
// (public/brand/d-maths-board-logo.webp is the full logo as supplied). The cut
// around the tick is a real gap (a mask), so it looks right on any background.
// `onDark`: a pale D, for the teal hero (the teal D would vanish into it).
export function BoardMark({ className = "h-9 w-9", onDark = false }: { className?: string; onDark?: boolean }) {
  const id = `dmb-mark${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={onDark ? "#F2FFFC" : "#0E7C7B"} />
          <stop offset="1" stopColor={onDark ? "#BFE8E3" : "#0B3B48"} />
        </linearGradient>
        <linearGradient id={`${id}-t`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4CBF26" />
          <stop offset="1" stopColor="#A6E22E" />
        </linearGradient>
        <mask id={`${id}-m`}>
          <rect width="48" height="48" fill="#fff" />
          <path d="M16 27l6.5 6.5L45 6" fill="none" stroke="#000" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <path mask={`url(#${id}-m)`} fill={`url(#${id}-g)`} fillRule="evenodd"
        d="M5 5h15.5C33 5 42 13.5 42 24.5S33 44 20.5 44H5Zm8.5 8v22.5h7c7.4 0 12.6-4.6 12.6-11.25S27.9 13 20.5 13Z" />
      <path d="M16 27l6.5 6.5L45 6" fill="none" stroke={`url(#${id}-t)`} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The full logo. `light`: on the teal hero (white "D-Maths"). `tagline`: the
// "BY D-MATHS ACADEMY" line under the name.
export function BoardBrand({ href = "/", light = false, tagline = false }: { href?: string; light?: boolean; tagline?: boolean }) {
  return (
    <Link href={href} className="dmb-link flex items-center gap-2 rounded-lg" aria-label="D-Maths Board by D-Maths Academy — home">
      <BoardMark onDark={light} className={tagline ? "h-10 w-10 shrink-0" : "h-8 w-8 shrink-0"} />
      <span className="flex flex-col leading-none">
        <span className={`whitespace-nowrap font-dmbDisplay text-xl font-bold tracking-tight ${light ? "text-white" : "text-[#0B2A33]"}`}>
          D-Maths <span className="text-[#7CCB1E]">Board</span>
        </span>
        {tagline && (
          <span className={`mt-1 flex items-center gap-1.5 whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[.28em] ${light ? "text-white/75" : "text-[#0B2A33]/70"}`}>
            <span className={`h-px w-3 ${light ? "bg-white/50" : "bg-[#0B2A33]/50"}`} aria-hidden />by D-Maths Academy<span className={`h-px w-3 ${light ? "bg-white/50" : "bg-[#0B2A33]/50"}`} aria-hidden />
          </span>
        )}
      </span>
    </Link>
  );
}

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/join", label: "Join a class" },
];

// Top bar for the public D-Maths Board pages. `onTeal`: sits inside the teal hero.
export function BoardTopBar({ onTeal = false }: { onTeal?: boolean }) {
  return (
    <header className={onTeal ? "relative z-30" : "sticky top-0 z-30 border-b border-dmb-rule bg-white"}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
        <BoardBrand light={onTeal} tagline />
        <nav className="mx-auto hidden items-center gap-7 text-sm md:flex" aria-label="D-Maths Board">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`dmb-link rounded transition-colors ${onTeal ? "text-white/75 hover:text-white" : "text-dmb-muted hover:text-dmb-ink"}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="/join" className={`dmb-link hidden whitespace-nowrap rounded px-2 text-sm sm:inline md:hidden ${onTeal ? "text-white/80" : "text-dmb-muted"}`}>Join a class</Link>
          <Link href="/login" className="dmb-btn-dark !min-h-[40px] whitespace-nowrap !pl-1.5 !pr-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-dmb-lime text-dmb-ink" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </span>
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BoardFooter() {
  return (
    <footer className="border-t border-dmb-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-dmb-muted sm:flex-row sm:items-center">
        <div className="flex items-center gap-2"><BoardMark className="h-6 w-6" /><span>D-Maths Board · by D-Maths Academy</span></div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto" aria-label="Footer">
          <Link href="/terms" className="dmb-link hover:text-dmb-ink">Terms</Link>
          <Link href="/privacy" className="dmb-link hover:text-dmb-ink">Privacy</Link>
          <Link href="/refunds" className="dmb-link hover:text-dmb-ink">Refunds</Link>
          <a href="mailto:support@dmaths.academy" className="dmb-link hover:text-dmb-ink">support@dmaths.academy</a>
        </nav>
      </div>
    </footer>
  );
}

// A centred card page (sign up, sign in, confirm email, join a class): a teal
// band with the title, and the form on a white card that overlaps it.
export function BoardFormPage({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <div className="dmb-sky flex min-h-dvh flex-col">
      <div className="dmb-hero pb-28">
        <BoardTopBar onTeal />
        <div className="mx-auto max-w-md px-4 pt-8 text-white">
          {kicker && <p className="text-sm text-white/75">{kicker}</p>}
          <h1 className="mt-1 font-dmbDisplay text-[38px] font-normal leading-[1.1]">{title}</h1>
        </div>
      </div>
      <main className="mx-auto -mt-20 w-full max-w-md flex-1 px-4 pb-14">
        <div className="rounded-3xl bg-white p-6 shadow-[0_20px_50px_-25px_rgba(15,35,38,.35)] sm:p-8">{children}</div>
      </main>
      <BoardFooter />
    </div>
  );
}
