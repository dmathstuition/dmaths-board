import type { ClassPoint } from "@/lib/termProgress";

// The term's class scores as a line (one point per class they came to), with
// a dashed trend line and grey ticks for missed classes. Server-rendered SVG;
// each point has a hover title, and the table below the chart has every number.
const W = 340, H = 180, L = 30, R = 10, T = 12, B = 26;
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function ProgressChart({ classes, slope }: { classes: ClassPoint[]; slope: number }) {
  const n = classes.length;
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (p: number) => T + ((100 - p) * (H - T - B)) / 100;
  const pts = classes.map((c, i) => ({ c, i })).filter((p) => p.c.percent != null);
  // Trend: least-squares line through the scored classes, drawn across them.
  let trend: string | null = null;
  if (pts.length >= 2) {
    const idx = pts.map((_, k) => k), ys = pts.map((p) => p.c.percent as number);
    const mx = idx.reduce((a, b) => a + b, 0) / idx.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const at = (k: number) => Math.max(0, Math.min(100, my + slope * (k - mx)));
    trend = `M${x(pts[0].i)},${y(at(0))} L${x(pts[pts.length - 1].i)},${y(at(pts.length - 1))}`;
  }
  const line = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.c.percent as number)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Class scores over the term${last ? `, latest ${last.c.percent}%` : ""}`}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#DDE7E7" strokeWidth={1} />
            <text x={L - 6} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="#556B6E">{g}%</text>
          </g>
        ))}
        {classes.map((c, i) => !c.attended && (
          <g key={c.id}><line x1={x(i)} x2={x(i)} y1={H - B - 6} y2={H - B} stroke="#9AAEB0" strokeWidth={2} strokeLinecap="round" /><title>{`${short(c.at)}: missed`}</title></g>
        ))}
        {trend && <path d={trend} stroke="#C2451C" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />}
        {line && <path d={line} stroke="#0E6E72" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map(({ c, i }) => (
          <g key={c.id}>
            <circle cx={x(i)} cy={y(c.percent as number)} r={12} fill="transparent" />
            <circle cx={x(i)} cy={y(c.percent as number)} r={4.5} fill="#0E6E72" stroke="#fff" strokeWidth={2} />
            <title>{`${short(c.at)} · ${c.title}: ${c.percent}%`}</title>
          </g>
        ))}
        {last && <text x={Math.min(x(last.i), W - R - 2)} y={y(last.c.percent as number) - 9} textAnchor={x(last.i) > W - 40 ? "end" : "middle"} fontSize="11" fontWeight="700" fill="#0F2326">{last.c.percent}%</text>}
        {n > 0 && <text x={x(0)} y={H - 8} textAnchor={n > 1 ? "start" : "middle"} fontSize="10" fill="#556B6E">{short(classes[0].at)}</text>}
        {n > 1 && <text x={x(n - 1)} y={H - 8} textAnchor="end" fontSize="10" fill="#556B6E">{short(classes[n - 1].at)}</text>}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dmb-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-dmb-board" aria-hidden />Score each class</span>
        {trend && <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-dmb-pen" aria-hidden />Trend</span>}
        {classes.some((c) => !c.attended) && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-0.5 rounded bg-[#9AAEB0]" aria-hidden />Missed class</span>}
      </figcaption>
    </figure>
  );
}
