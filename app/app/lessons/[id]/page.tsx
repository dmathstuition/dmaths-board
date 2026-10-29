import LessonEditor from "@/components/live/LessonEditor";
import { boardPage } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lesson board" };

export default async function BoardLessonEditorPage({ params }: { params: { id: string } }) {
  const t = await boardPage();
  return <LessonEditor id={params.id} base="/app" myId={t.id} />;
}
