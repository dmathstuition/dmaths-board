import { Suspense } from "react";
import { BoardFormPage } from "@/components/board/BoardBrand";
import { BoardJoinForm } from "@/components/board/BoardAuthForms";

export const metadata = { title: "Join a class", description: "Join your teacher's D-Maths Board class with the 6-digit PIN." };

export default function BoardJoinPage() {
  return (
    <BoardFormPage kicker="Students" title="Join your class">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-mist/40" />}><BoardJoinForm /></Suspense>
    </BoardFormPage>
  );
}
