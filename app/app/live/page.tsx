import { Suspense } from "react";
import LiveHub from "@/components/live/LiveHub";
import { boardPage } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classes" };

export default async function BoardLivePage() {
  await boardPage();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-black text-ink">Interactive classes</h1>
      <Suspense fallback={<div className="card h-64 animate-pulse" />}><LiveHub base="/app" classes={[]} /></Suspense>
    </div>
  );
}
