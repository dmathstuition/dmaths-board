// A small picture of a practical's bench as it starts (for the lab picker).
import { practicalFor as practicalBySlug } from "@/lib/lab/bench/all";
import { seeded } from "@/lib/lab/bench/run";
import { Apparatus, BenchDefs, Front, Room, W, hasFront } from "@/components/lab/bench/Apparatus";

export default function PracticalThumb({ slug }: { slug: string }) {
  const p = practicalBySlug(slug);
  if (!p) return null;
  const items = p.layout(p.init(seeded(1)), 0).filter((x) => !x.hidden).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  return (
    <svg viewBox={`0 24 ${W} 700`} className="block h-auto w-full" aria-hidden style={{ fontFamily: "system-ui, sans-serif" }}>
      <BenchDefs />
      <Room />
      {items.map((it) => <g key={it.id} transform={`translate(${it.x},${it.y})`}><Apparatus it={it} /></g>)}
      {items.filter((x) => hasFront(x.kind)).map((x) => <g key={`f${x.id}`} transform={`translate(${x.x},${x.y})`}><Front it={x} /></g>)}
    </svg>
  );
}
