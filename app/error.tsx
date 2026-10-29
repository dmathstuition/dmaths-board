"use client";
import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dmb-paper p-6 text-center">
      <h1 className="font-dmbDisplay text-2xl font-semibold text-dmb-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-[15px] text-dmb-muted">Please try again. If it keeps happening, refresh the page.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="dmb-btn-dark">Try again</button>
        <Link href="/" className="dmb-btn">Home</Link>
      </div>
    </main>
  );
}
