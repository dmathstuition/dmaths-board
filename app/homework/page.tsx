import { Suspense } from "react";
import HomeworkApp from "@/components/homework/HomeworkApp";

// A learner's homework, through their personal link (lib/homeworkLink.ts).
export const metadata = { title: "My homework", robots: { index: false, follow: false } };

export default function HomeworkPage() {
  return <Suspense fallback={<div className="learner-app min-h-dvh" />}><HomeworkApp /></Suspense>;
}
