import { BoardFormPage } from "@/components/board/BoardBrand";
import ProgressChart from "@/components/board/ProgressChart";
import ProgressShare from "@/components/board/ProgressShare";
import { readProgress } from "@/lib/classReportLink";
import { termRows } from "@/lib/starsServer";
import { TERM_RANGES, progressSummary, termProgress, type ClassPoint } from "@/lib/termProgress";

// A learner's term progress, for them and their parents: attendance, scores
// class by class with a trend line, stars and badges. The link is signed
// (lib/classReportLink.ts) and the numbers are read fresh each time.
export const dynamic = "force-dynamic";
export const metadata = { title: "Term progress", robots: { index: false, follow: false } };

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const frac = (p: [number, number] | null) => (p ? `${p[0]}/${p[1]}` : "—");

export default async function ProgressPage({ searchParams }: { searchParams: { t?: string } }) {
  const link = readProgress(searchParams.t);
  const p = link ? termProgress(await termRows(link.h, link.d).catch(() => ({ sessions: [], guests: [], marks: [], quiz: [], exams: [], games: [], titles: {}, asked: [] })), link.n, link.d) : null;
  if (!link || !p) {
    return (
      <BoardFormPage kicker="Term progress" title={link ? link.n : "Progress not found"}>
        <p className="text-dmb-muted">{link ? "No classes found for this learner in this period yet. Results appear here after their first class." : "This link isn't valid. Ask the teacher to send it again."}</p>
      </BoardFormPage>
    );
  }
  const range = TERM_RANGES.find((r) => r.days === p.days)?.label ?? `Last ${p.days} days`;
  const trend = p.trend.direction === "up" ? { icon: "↗", text: "Improving", tone: "bg-emerald-50 text-emerald-800" }
    : p.trend.direction === "down" ? { icon: "↘", text: "Dipping — needs support", tone: "bg-dmb-penSoft text-dmb-pen" }
      : p.trend.direction === "steady" ? { icon: "→", text: "Steady", tone: "bg-dmb-mint text-dmb-tealDark" } : null;
  const recent = [...p.classes].reverse();
  return (
    <BoardFormPage kicker={`Term progress · ${range}`} title={p.name}>
      <div className="space-y-5">
        <p className="text-dmb-ink">{progressSummary(p)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Attendance" value={p.attendance == null ? "—" : `${p.attendance}%`} sub={`${p.attended} of ${p.held} classes`} />
          <Tile label="Average score" value={p.averages.overall == null ? "—" : `${p.averages.overall}%`} sub={trend ? `${trend.icon} ${trend.text}` : "Needs 2 scored classes"} />
          <Tile label="Stars" value={`⭐ ${p.stars}`} sub={p.badges.length ? p.badges.map((b) => b.icon).join(" ") : "Badges come with stars"} />
          <Tile label="Best class" value={p.best?.percent != null ? `${p.best.percent}%` : "—"} sub={p.best ? date(p.best.at) : ""} />
        </div>

        <section aria-label="Scores over the term" className="rounded-2xl border border-dmb-rule p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">Score each class</p>
            {trend && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${trend.tone}`}>{trend.icon} {trend.text}</span>}
          </div>
          {p.classes.some((c) => c.percent != null) ? <ProgressChart classes={p.classes} slope={p.trend.slope} /> : <p className="text-sm text-dmb-muted">No marked work, quizzes or exams yet.</p>}
        </section>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Small label="Class work" v={p.averages.work} />
          <Small label="Live quizzes" v={p.averages.quiz} />
          <Small label="Exams" v={p.averages.exam} />
        </div>

        {p.badges.length > 0 && (
          <div className="rounded-2xl bg-dmb-ink p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/60">Badges</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">{p.badges.map((b) => <li key={b.id} className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{b.icon} {b.label}</li>)}</ul>
          </div>
        )}

        <details className="rounded-2xl border border-dmb-rule p-4" open>
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.14em] text-dmb-muted">Class by class</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-dmb-muted"><tr><th className="py-1 pr-2 font-semibold">Class</th><th className="px-1 font-semibold">Work</th><th className="px-1 font-semibold">Quiz</th><th className="px-1 font-semibold">Exam</th><th className="pl-1 text-right font-semibold">Score</th></tr></thead>
              <tbody>{recent.map((c) => <Row key={c.id} c={c} />)}</tbody>
            </table>
          </div>
        </details>

        <ProgressShare text={`${p.name}'s term progress on D-Maths Board: ${progressSummary(p)}`} />
        <p className="text-xs text-dmb-muted">Learners are matched by the name they type when joining a class, so use the same name each time.</p>
      </div>
    </BoardFormPage>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dmb-rule p-3">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-dmb-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-dmb-ink">{value}</p>
      <p className="mt-0.5 text-xs text-dmb-muted">{sub}</p>
    </div>
  );
}
function Small({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="rounded-xl bg-dmb-mint p-2">
      <p className="text-lg font-bold tabular-nums text-dmb-ink">{v == null ? "—" : `${v}%`}</p>
      <p className="text-[11px] font-semibold text-dmb-tealDark">{label}</p>
    </div>
  );
}
function Row({ c }: { c: ClassPoint }) {
  return (
    <tr className="border-t border-dmb-rule align-top">
      <td className="py-1.5 pr-2"><span className="block font-semibold">{date(c.at)}</span><span className="block max-w-[9rem] truncate text-xs text-dmb-muted">{c.title}</span></td>
      {c.attended ? (
        <>
          <td className="px-1 tabular-nums">{frac(c.work)}</td>
          <td className="px-1 tabular-nums">{frac(c.quiz)}</td>
          <td className="px-1 tabular-nums">{frac(c.exam)}</td>
          <td className="pl-1 text-right font-bold tabular-nums">{c.percent == null ? "✓" : `${c.percent}%`}</td>
        </>
      ) : <td colSpan={4} className="px-1 text-right text-xs font-semibold text-dmb-muted">Missed</td>}
    </tr>
  );
}
