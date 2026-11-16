import { Suspense } from "react";
import Link from "next/link";
import { BoardBrand } from "@/components/board/BoardBrand";
import { BoardJoinForm } from "@/components/board/BoardAuthForms";

export const metadata = { title: "Join a class", description: "Join your teacher's D-Maths Board class with the 6-digit PIN." };

// Where learners come in: the PIN and their name — no account. Bright, and
// like opening an app on a phone.
const FLOATS: [string, string, string, string, string][] = [["+", "8%", "14%", "64px", "-12deg"], ["÷", "82%", "10%", "72px", "10deg"], ["π", "70%", "34%", "56px", "-8deg"], ["×", "12%", "46%", "60px", "14deg"], ["√", "86%", "62%", "64px", "-6deg"], ["=", "6%", "78%", "70px", "8deg"], ["%", "60%", "86%", "54px", "-14deg"]];
export default function BoardJoinPage() {
  return (
    <div className="lrn-join relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden>{FLOATS.map(([c, l, t, size, r], i) => <span key={c} className="lrn-float" style={{ left: l, top: t, fontSize: size, ["--r" as string]: r, animationDelay: `${i * 0.6}s` }}>{c}</span>)}</div>
      <header className="relative z-10 mx-auto flex w-full max-w-md items-center px-5 pt-5">
        <BoardBrand light />
        <Link href="/login" className="ml-auto rounded-full bg-white/15 px-3 py-2 text-xs font-black text-white ring-1 ring-white/30">I&apos;m a teacher</Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-10 pt-6">
        <p className="text-sm font-black uppercase tracking-[.2em] text-[#FDE047]">Students</p>
        <h1 className="mt-1 font-display text-4xl font-black leading-tight text-white">Join your class <span aria-hidden>🚀</span></h1>
        <p className="mt-1 text-sm font-semibold text-white/80">Type the PIN your teacher shows you. No account needed.</p>
        <div className="mt-5 rounded-[1.75rem] bg-white p-5 shadow-[0_30px_60px_-25px_rgba(46,16,101,.7)] sm:p-7">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-violet-100" />}><BoardJoinForm /></Suspense>
        </div>
      </main>
    </div>
  );
}
