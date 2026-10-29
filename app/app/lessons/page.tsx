import LessonLibrary from "@/components/live/LessonLibrary";
import { boardPage } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lessons" };

export default async function BoardLessonsPage() {
  await boardPage();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black text-ink">Lesson boards</h1>
        <p className="text-sm text-ink/60">Prepare a board with slides, writing, activities and class tools — then open it in one click from <b>Lessons</b> on the board during class.</p>
      </div>
      <LessonLibrary base="/app" />
    </div>
  );
}
