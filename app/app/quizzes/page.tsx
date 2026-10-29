import { Suspense } from "react";
import QuizLibrary from "@/components/live/QuizLibrary";
import { boardPage } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quizzes" };

export default async function BoardQuizzesPage() {
  await boardPage();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Live quizzes</h1>
        <p className="text-sm text-ink/60">Prepare quizzes before class. During a class, open the Live quiz tab and launch one — students answer on their phones.</p>
      </div>
      <Suspense fallback={<div className="card h-64 animate-pulse" />}><QuizLibrary bank={false} /></Suspense>
    </div>
  );
}
