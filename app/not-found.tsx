import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-dmb-paper p-6 text-center">
      <p className="font-dmbDisplay text-7xl font-semibold text-dmb-ink">404</p>
      <h1 className="mt-2 font-dmbDisplay text-2xl font-semibold text-dmb-ink">This page isn&apos;t on the board</h1>
      <p className="mt-2 max-w-sm text-[15px] text-dmb-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="dmb-btn-dark">Back to home</Link>
        <Link href="/join" className="dmb-btn">Join a class</Link>
      </div>
    </main>
  );
}
