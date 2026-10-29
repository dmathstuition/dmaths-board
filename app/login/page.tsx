import { Suspense } from "react";
import { BoardFormPage } from "@/components/board/BoardBrand";
import { BoardLoginForm } from "@/components/board/BoardAuthForms";

export const metadata = { title: "Sign in" };

export default function BoardLoginPage() {
  return (
    <BoardFormPage kicker="Teachers" title="Sign in to D-Maths Board">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-mist/40" />}><BoardLoginForm /></Suspense>
    </BoardFormPage>
  );
}
