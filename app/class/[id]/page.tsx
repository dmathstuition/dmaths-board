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
    <div className="min-h-dvh bg-[#F4F9FF]">
      <header className="border-b border-line bg-white [@media(max-height:520px)]:hidden">
        <div className="mx-auto flex max-w-7xl items-center px-3 py-2"><BoardBrand href="/join" /></div>
      </header>
      <main className="mx-auto max-w-7xl p-2 sm:p-4"><LearnerRoom id={params.id} guest /></main>
    </div>
  );
}
