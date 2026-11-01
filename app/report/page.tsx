import Link from "next/link";
import { BoardFormPage } from "@/components/board/BoardBrand";
import { readReport } from "@/lib/classReportLink";
import { learnerDetail } from "@/lib/learnerResults";
import ResultsBreakdown from "@/components/live/ResultsBreakdown";
import { praise, scoreLine } from "@/lib/classReport";

// A parent's class report: what the class covered and how their child did.
// The link is signed (lib/classReportLink.ts); the marks are read fresh.
export const dynamic = "force-dynamic";
export const metadata = { title: "Class report", robots: { index: false, follow: false } };

export default async function ClassReportPage({ searchParams }: { searchParams: { t?: string } }) {
  const link = readReport(searchParams.t);
  const r = link ? await learnerDetail(link.s, link.g).catch(() => null) : null;
  if (!link || !r) {
    return (
      <BoardFormPage kicker="Class report" title="Report not found">
        <p className="text-dmb-muted">This report link isn&apos;t valid, or the class has been deleted. Ask the teacher to send it again.</p>
      </BoardFormPage>
    );
  }
  const { row } = r;
  return (
    <BoardFormPage kicker={`Class report · ${r.date}`} title={r.learner}>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-board">Class</p>
          <p className="mt-1 text-lg font-bold">{r.title}</p>
          {r.teacher && <p className="text-sm text-dmb-muted">with {r.teacher}</p>}
        </div>
        {link.c && (
          <div className="rounded-2xl bg-dmb-mint p-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-board">What we covered</p>
            <p className="mt-1 whitespace-pre-wrap text-dmb-ink">{link.c}</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {row.workMax > 0 && <Score label="Class work" value={`${row.work} / ${row.workMax}`} />}
          {row.quizAsked > 0 && <Score label="Live quiz" value={`${row.quizCorrect} / ${row.quizAsked} correct`} />}
        </div>
        <div className="rounded-2xl border border-dmb-rule p-4">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">Total</p>
          <p className="mt-1 font-dmbDisplay text-3xl">{scoreLine(row)}</p>
          {row.percent != null && (
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-dmb-mint" aria-hidden>
              <div className="h-full rounded-full bg-dmb-board" style={{ width: `${row.percent}%` }} />
            </div>
          )}
          <p className="mt-2 font-semibold">{praise(row.percent)}</p>
        </div>
        {(r.work.length > 0 || r.quizzes.length > 0) && (
          <details className="rounded-2xl border border-dmb-rule p-4" open>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">Question by question</summary>
            <div className="mt-3"><ResultsBreakdown d={r} /></div>
          </details>
        )}
        {link.h && (
          <div className="rounded-2xl bg-dmb-penSoft p-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-pen">Homework</p>
            <p className="mt-1 whitespace-pre-wrap">{link.h}</p>
          </div>
        )}
        <div className="rounded-2xl bg-dmb-ink p-5 text-white">
          <p className="font-dmbDisplay text-xl">Taught live on D-Maths Board</p>
          <p className="mt-1 text-sm text-white/75">The interactive whiteboard where every learner takes part from their phone — live quizzes, answer boards, group work and reports like this one.</p>
          <Link href="/" className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-dmb-lime px-4 font-bold text-dmb-ink">Teachers: try it free →</Link>
        </div>
      </div>
    </BoardFormPage>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dmb-rule p-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
