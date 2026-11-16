import { notFound } from "next/navigation";
import LearnerRoom from "@/components/live/LearnerRoom";
import { BoardBrand } from "@/components/board/BoardBrand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Class", robots: { index: false } };

// A student in a D-Maths Board class. Who they are comes from the guest pass
// cookie set when they joined; the API checks it on every request.
export default function BoardClassPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  return (
    <div className="learner-app min-h-dvh">
      <header className="border-b border-white/60 bg-white/80 backdrop-blur max-sm:hidden [@media(max-height:520px)]:hidden">
        <div className="mx-auto flex max-w-7xl items-center px-3 py-2"><BoardBrand href="/join" /></div>
      </header>
      <main className="mx-auto max-w-7xl p-2 max-sm:pb-24 sm:p-4"><LearnerRoom id={params.id} guest /></main>
    </div>
  );
}
