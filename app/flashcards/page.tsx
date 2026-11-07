import { BoardFormPage } from "@/components/board/BoardBrand";
import Flashcards from "@/components/study/Flashcards";
import { readReport } from "@/lib/classReportLink";

// Revision flashcards for a lesson, opened from a results link.
export const dynamic = "force-dynamic";
export const metadata = { title: "Revision flashcards", robots: { index: false, follow: false } };

export default function FlashcardsPage({ searchParams }: { searchParams: { t?: string } }) {
  const ok = !!readReport(searchParams.t);
  return (
    <BoardFormPage kicker="Revise" title="Flashcards">
      {ok ? <Flashcards token={searchParams.t!} /> : <p className="text-dmb-muted">This link isn&apos;t valid. Open it again from your results.</p>}
    </BoardFormPage>
  );
}
