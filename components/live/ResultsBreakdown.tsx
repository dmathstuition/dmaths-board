import type { LearnerDetail } from "@/lib/learnerResults";

// A learner's results, question by question: class work (mark, the tutor's
// feedback, what they handed in) and each live-quiz question. No hooks, so the
// learner's class page and the report page can both show it.
export default function ResultsBreakdown({ d }: { d: LearnerDetail }) {
  const r = d.row;
  const strongest = d.work.filter((w) => w.mark != null && w.mark >= w.max).length
    + d.quizzes.reduce((n, q) => n + q.items.filter((i) => i.correct).length, 0);
  const toReview = d.work.filter((w) => w.mark != null && w.mark < w.max).length
    + d.quizzes.reduce((n, q) => n + q.items.filter((i) => !i.correct).length, 0);
  return (
    <div className="grid gap-4 text-ink">
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="Your score" value={r.totalMax ? `${r.total} / ${r.totalMax}` : "—"} sub={r.percent != null ? `${r.percent}%` : "Nothing marked yet"} strong />
        <Stat label="Class average" value={d.classAverage != null ? `${d.classAverage}%` : "—"} sub={r.percent != null && d.classAverage != null ? (r.percent >= d.classAverage ? "You're at or above it 🎉" : "Keep practising — you'll get there") : ""} />
        <Stat label="Right / to review" value={`${strongest} / ${toReview}`} sub="questions" />
      </div>
      {r.percent != null && (
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`You scored ${r.percent}%${d.classAverage != null ? `; the class average was ${d.classAverage}%` : ""}`}>
          <div className="h-full rounded-full bg-[#1657C9]" style={{ width: `${r.percent}%` }} />
          {d.classAverage != null && <div className="absolute top-0 h-full w-0.5 bg-amber-500" style={{ left: `${d.classAverage}%` }} />}
        </div>
      )}

      {d.work.length > 0 && (
        <section aria-label="Class work">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1657C9]">Class work</h3>
          <ol className="mt-2 grid gap-2">
            {d.work.map((w, i) => (
              <li key={i} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm font-bold">{w.question || `Question ${i + 1}`}</p>
                  <Badge mark={w.mark} max={w.max} />
                </div>
                {w.answer?.text && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-2 py-1 text-sm text-ink/80"><span className="font-black text-ink/50">You wrote: </span>{w.answer.text}</p>}
                {!!w.answer?.imgs.length && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {w.answer.imgs.map((u, k) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg ring-1 ring-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`Your work, page ${k + 1}`} className="h-24 w-auto max-w-[8rem] bg-white object-contain" />
                      </a>
                    ))}
                  </div>
                )}
                {w.feedback && <p className="mt-2 rounded-lg bg-[#EEF6FF] px-2 py-1.5 text-sm font-semibold"><span className="font-black text-[#1657C9]">💬 Your tutor: </span>{w.feedback}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {d.exams?.length > 0 && (
        <section aria-label="Exams">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1657C9]">Exams</h3>
          <ul className="mt-2 grid gap-2">
            {d.exams.map((e, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <span className="min-w-0 flex-1 text-sm font-bold">📝 {e.title}</span>
                <span className="text-sm font-black">{e.submitted && e.score != null ? `${e.score} / ${e.total} (${Math.round((e.score / Math.max(1, e.total ?? 1)) * 100)}%)` : "Not handed in yet"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.quizzes.map((q, qi) => (
        <section key={qi} aria-label={`Quiz: ${q.title}`}>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1657C9]">Live quiz · {q.title} <span className="text-ink/45">({q.items.filter((i) => i.correct).length} / {q.items.length})</span></h3>
          <ol className="mt-2 grid gap-2">
            {q.items.map((it, i) => (
              <li key={i} className={`rounded-xl p-3 ring-1 ${it.correct ? "bg-emerald-50 ring-emerald-200" : "bg-red-50 ring-red-200"}`}>
                <p className="text-sm font-bold"><span aria-hidden>{it.correct ? "✓" : "✗"} </span>{it.q}</p>
                <p className="mt-0.5 text-xs font-semibold text-ink/70">
                  {it.choice == null ? "You didn't answer" : `You chose: ${it.options[it.choice] ?? "—"}`}
                  {!it.correct && it.options[it.answer] != null && <> · <span className="font-black text-emerald-800">Answer: {it.options[it.answer]}</span></>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {!d.work.length && !d.quizzes.length && !d.exams?.length && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-ink/60">Nothing has been marked yet. Your results appear here once your tutor marks your work or runs a quiz.</p>}
    </div>
  );
}

function Stat({ label, value, sub, strong = false }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ring-1 ${strong ? "bg-[#1657C9] text-white ring-[#1657C9]" : "bg-white ring-slate-200"}`}>
      <p className={`text-[11px] font-black uppercase tracking-wider ${strong ? "text-white/75" : "text-ink/50"}`}>{label}</p>
      <p className="mt-0.5 text-2xl font-black">{value}</p>
      {sub && <p className={`text-xs font-bold ${strong ? "text-white/80" : "text-ink/55"}`}>{sub}</p>}
    </div>
  );
}

function Badge({ mark, max }: { mark: number | null; max: number }) {
  if (mark == null) return <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-ink/60">Not marked</span>;
  const full = mark >= max, none = mark === 0;
  return <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${full ? "bg-emerald-100 text-emerald-800" : none ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-900"}`}>{max === 1 ? (full ? "✓ Correct" : "✗ Not yet") : `${mark} / ${max}`}</span>;
}
