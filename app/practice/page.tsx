import { BoardFormPage } from "@/components/board/BoardBrand";
import Practice from "@/components/study/Practice";
import { readReport } from "@/lib/classReportLink";

// "Fix my mistakes", opened from a learner's results link.
export const dynamic = "force-dynamic";
export const metadata = { title: "Fix my mistakes", robots: { index: false, follow: false } };

export default function PracticePage({ searchParams }: { searchParams: { t?: string } }) {
  const ok = !!readReport(searchParams.t)?.g;
  return (
    <BoardFormPage kicker="Practice" title="Fix my mistakes">
      {ok ? <Practice token={searchParams.t!} /> : <p className="text-dmb-muted">This link isn&apos;t valid. Open it again from your results.</p>}
    </BoardFormPage>
  );
}
