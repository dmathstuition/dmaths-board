// SERVER ONLY — deleting uploaded pictures (slides, exam paper pages) from
// storage. Only pictures in the class's (or lesson's) own folder, and never one
// that a saved lesson, another board or another exam still shows.
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSlideUrl } from "@/lib/whiteboard";

const pathOf = (u: string) => u.split("/object/public/materials/")[1] ?? "";
const MISSING = /does not exist|could not find|schema cache/i;

export async function removeSlidePictures(urls: unknown[], folder: string, skip: { sessionId?: string; lessonId?: string; examId?: string } = {}): Promise<{ removed: number; kept: number; error?: string }> {
  const mine = [...new Set(urls.filter(isSlideUrl))].filter((u) => pathOf(u).startsWith(`slides/${folder}/`)).slice(0, 200);
  if (!mine.length) return { removed: 0, kept: 0 };
  const admin = supabaseAdmin();
  const inUse = await Promise.all(mine.map(async (u) => {
    let lessons = admin.from("board_lessons").select("id").contains("board", { bg: [u] }).limit(1);
    if (skip.lessonId) lessons = lessons.neq("id", skip.lessonId);
    let boards = admin.from("live_sessions").select("id").contains("board", { bg: [u] }).limit(1);
    if (skip.sessionId) boards = boards.neq("id", skip.sessionId);
    let exams = admin.from("board_exams").select("id").contains("questions", [{ img: u }]).limit(1);
    if (skip.examId) exams = exams.neq("id", skip.examId);
    let booklets = admin.from("board_exams").select("id").contains("booklet", [u]).limit(1);
    if (skip.examId) booklets = booklets.neq("id", skip.examId);
    const [a, b, c, d] = await Promise.all([lessons, boards, exams, booklets]);
    // If we can't tell, keep it (a missing exams table or booklet column just means none).
    const used = (r: { error: { message: string } | null; data: unknown[] | null }) => (r.error ? !MISSING.test(r.error.message) : !!r.data?.length);
    const examUse = used(c) || used(d);
    return !!(a.error || b.error || a.data?.length || b.data?.length || examUse);
  }));
  const paths = mine.filter((_, i) => !inUse[i]).map(pathOf);
  if (paths.length) {
    const { error } = await admin.storage.from("materials").remove(paths);
    if (error) return { removed: 0, kept: mine.length, error: error.message };
  }
  return { removed: paths.length, kept: mine.length - paths.length };
}
