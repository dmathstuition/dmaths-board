import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { boardTeacherCanUse, requireBoardOrStaff } from "@/lib/boardAccess";
import { BOARD_MAX_PAGES, isSlideUrl } from "@/lib/whiteboard";

// Slides and pictures for an interactive class. The host's browser turns a
// PDF (a PowerPoint saved as PDF) or pictures into one image per slide, asks
// here for permission to store them, then uploads each image straight to
// storage. Nothing large passes through this function, so it stays well
// inside the hosting limits on request size and run time.
//   POST   { sessionId | lessonId, count, type } → { uploads: [{ path, token, url }] }
//   POST   { sessionId, answer: true, count: 1 } → a learner's photo of their work for an answer board
//   DELETE { sessionId | lessonId, urls }         → remove those slide pictures from storage
//          ("Remove slides"), keeping any a saved lesson or another board still uses
// (lessonId: a lesson being prepared in the lesson library — its owner or an admin)
export const dynamic = "force-dynamic";

const MAX_SLIDES_PER_UPLOAD = BOARD_MAX_PAGES;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? "");
  const count = Math.round(Number(body?.count) || 0);
  const type = String(body?.type ?? "image/jpeg");
  const lessonId = String(body?.lessonId ?? "");
  let who = "";
  let prefix = "";
  if (body?.answer === true && sessionId) {
    // A learner in this class sending a photo of their work: one at a time.
    const v = await sessionViewer(sessionId).catch(() => null);
    if (!v || v.host) return bad("Join the class to send a photo.", 403);
    if (v.session.status !== "live") return bad("This class has ended.", 409);
    if (count !== 1) return bad("One photo at a time.");
    if (!rateLimit(`answer-photo:${v.id}`, 10, 60_000)) return bad("Too many photos — wait a minute.", 429);
    who = v.id;
    prefix = `answer-${v.id.replace(/[^a-z0-9]/gi, "").slice(0, 12)}-`;
  } else if (lessonId) {
    const me = await requireBoardOrStaff();
    const { data: l } = me ? await supabaseAdmin().from("board_lessons").select("owner_id").eq("id", lessonId).maybeSingle() : { data: null };
    if (!me || !l || (l.owner_id !== me.id && me.role !== "admin")) return bad("Only the tutor who made this lesson can add slides.", 403);
    who = me.id;
  } else {
    const v = await sessionViewer(sessionId).catch(() => null);
    if (!v?.host) return bad("Only the host can add slides.", 403);
    if (v.role === "board_teacher" && !(await boardTeacherCanUse(v.id))) return bad("Your D-Maths Board trial or year has ended — renew to add slides.", 402);
    who = v.id;
  }
  if (!prefix && !rateLimit(`live-slides:${who}`, 20, 60_000)) return bad("Too many uploads — wait a minute.", 429);
  if (count < 1) return bad("No slides were sent.");
  if (count > MAX_SLIDES_PER_UPLOAD) return bad(`Up to ${MAX_SLIDES_PER_UPLOAD} slides at a time.`);
  if (!TYPES[type]) return bad("Slides must be JPG, PNG or WebP pictures.", 415);

  const store = supabaseAdmin().storage.from("materials");
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const folder = (lessonId ? `lesson-${lessonId}` : sessionId).replace(/[^a-z0-9-]/gi, "").slice(0, 48);
  const uploads = await Promise.all(Array.from({ length: count }, async (_, i) => {
    const path = `slides/${folder}/${prefix}${stamp}-${String(i + 1).padStart(2, "0")}.${TYPES[type]}`;
    const { data, error } = await store.createSignedUploadUrl(path);
    if (error || !data?.token) throw new Error(error?.message ?? "no upload token");
    return { path, token: data.token, url: store.getPublicUrl(path).data.publicUrl };
  })).catch((e: Error) => e);
  if (uploads instanceof Error) return bad(`Couldn't prepare the upload: ${uploads.message}`, 500);
  return NextResponse.json({ uploads });
}

// Who may change this class's (or lesson's) slides, and the storage folder they live in.
async function slideOwner(sessionId: string, lessonId: string): Promise<{ who: string; folder: string } | null> {
  if (lessonId) {
    const me = await requireBoardOrStaff();
    const { data: l } = me ? await supabaseAdmin().from("board_lessons").select("owner_id").eq("id", lessonId).maybeSingle() : { data: null };
    if (!me || !l || (l.owner_id !== me.id && me.role !== "admin")) return null;
    return { who: me.id, folder: `lesson-${lessonId}`.replace(/[^a-z0-9-]/gi, "").slice(0, 48) };
  }
  const v = await sessionViewer(sessionId).catch(() => null);
  if (!v?.host) return null;
  return { who: v.id, folder: sessionId.replace(/[^a-z0-9-]/gi, "").slice(0, 48) };
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = String(body?.sessionId ?? ""), lessonId = String(body?.lessonId ?? "");
  const owner = await slideOwner(sessionId, lessonId);
  if (!owner) return bad("Only the teacher can remove these slides.", 403);
  if (!rateLimit(`live-slides-del:${owner.who}`, 20, 60_000)) return bad("Wait a minute.", 429);
  const urls: string[] = (Array.isArray(body?.urls) ? body.urls : []).filter(isSlideUrl).slice(0, MAX_SLIDES_PER_UPLOAD * 2);
  // Only pictures in this class's (or lesson's) own folder.
  const mine = [...new Set(urls)].filter((u) => u.split("/object/public/materials/")[1]?.startsWith(`slides/${owner.folder}/`));
  if (!mine.length) return NextResponse.json({ removed: 0, kept: 0 });
  // Keep any picture a saved lesson or another class's board still shows.
  const admin = supabaseAdmin();
  const inUse = await Promise.all(mine.map(async (u) => {
    let lessons = admin.from("board_lessons").select("id").contains("board", { bg: [u] }).limit(1);
    if (lessonId) lessons = lessons.neq("id", lessonId);
    let boards = admin.from("live_sessions").select("id").contains("board", { bg: [u] }).limit(1);
    if (sessionId) boards = boards.neq("id", sessionId);
    const [a, b] = await Promise.all([lessons, boards]);
    // If we can't tell, keep it.
    return !!(a.error || b.error || a.data?.length || b.data?.length);
  }));
  const paths = mine.filter((_, i) => !inUse[i]).map((u) => u.split("/object/public/materials/")[1]);
  if (paths.length) {
    const { error } = await admin.storage.from("materials").remove(paths);
    if (error) return bad(`Storage refused: ${error.message}`, 502);
  }
  return NextResponse.json({ removed: paths.length, kept: mine.length - paths.length });
}

