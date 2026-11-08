import { BoardFormPage } from "@/components/board/BoardBrand";
import SpellingPractice from "@/components/study/SpellingPractice";
import { readReport } from "@/lib/classReportLink";

// A learner's own spelling list (look, cover, write, check), opened from their results link.
export const dynamic = "force-dynamic";
export const metadata = { title: "My spellings", robots: { index: false, follow: false } };

export default function SpellingPage({ searchParams }: { searchParams: { t?: string } }) {
  const ok = !!readReport(searchParams.t)?.g;
  return (
    <BoardFormPage kicker="Practice" title="My spellings">
      {ok ? <SpellingPractice token={searchParams.t!} /> : <p className="text-dmb-muted">This link isn&apos;t valid. Open it again from your results.</p>}
    </BoardFormPage>
  );
}
