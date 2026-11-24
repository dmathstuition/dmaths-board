import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import { boardTeacherCanUse, requireBoardOrStaff } from "@/lib/boardAccess";
import { BOARD_MAX_PAGES, isSlideUrl } from "@/lib/whiteboard";
import { removeSlidePictures } from "@/lib/slideStore";
import { readHomework } from "@/lib/homeworkLink";
import { MAX_UPLOADS, canWork, cleanItems, isFor } from "@/lib/assignments";

// Slides and pictures for an interactive class. The host's browser turns a
// PDF (a PowerPoint saved as PDF) or pictures into one image per slide, asks
// here for permission to store them, then uploads each image straight to
// storage. Nothing large passes through this function, so it stays well
// inside the hosting limits on request size and run time.
//   POST   { sessionId | lessonId, count, type } → { uploads: [{ path, token, url }] }
//   POST   { sessionId, answer: true, count: 1 } → a learner's photo of their work for an answer board
//   POST   { homework: link, assignmentId, count } → a learner's photos / PDF pages of their homework (after class too)
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
  let folderFor = "";
  if (body?.homework) {
    // A learner's homework, through their personal link: their own work, while they can still change it.
    const h = readHomework(body.homework);
    const admin = supabaseAdmin();
    const g = h ? (await admin.from("live_session_guests").select("id, removed").eq("id", h.g).eq("session_id", h.s).maybeSingle()).data : null;
    if (!h || !g || g.removed) return bad("This homework link doesn't work any more.", 403);
    const aid = String(body?.assignmentId ?? "");
    const { data: a } = /^[0-9a-f-]{36}$/i.test(aid) ? await admin.from("board_assignments").select("id, status, due_at, late_ok, for_ids, items").eq("id", aid).eq("session_id", h.s).maybeSingle() : { data: null };
    if (!a || !isFor({ forIds: Array.isArray(a.for_ids) ? a.for_ids : null }, h.g) || !cleanItems(a.items).some((it) => it.kind === "upload")) return bad("That assignment has nothing to upload.", 404);
    const { data: e } = await admin.from("board_assignment_entries").select("submitted_at, returned_at").eq("assignment_id", a.id).eq("student_id", h.g).maybeSingle();
    const can = canWork({ status: a.status, dueAt: a.due_at, lateOk: a.late_ok !== false }, e ? { submittedAt: e.submitted_at, returnedAt: e.returned_at } : null);
    if (!can.ok) return bad(can.why!, 409);
    if (count > MAX_UPLOADS) return bad(`Up to ${MAX_UPLOADS} pages at a time.`);
    if (!rateLimit(`hw-photo:${h.g}`, 20, 60_000)) return bad("Too many uploads — wait a minute.", 429);
    who = h.g; folderFor = h.s;
    prefix = `hw-${h.g.replace(/[^a-z0-9]/gi, "").slice(0, 12)}-`;
  } else if (body?.answer === true && sessionId) {
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
  const folder = (folderFor || (lessonId ? `lesson-${lessonId}` : sessionId)).replace(/[^a-z0-9-]/gi, "").slice(0, 48);
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
  const urls: unknown[] = (Array.isArray(body?.urls) ? body.urls : []).slice(0, MAX_SLIDES_PER_UPLOAD * 2);
  // Only pictures in this class's (or lesson's) own folder, and none still in use elsewhere.
  const out = await removeSlidePictures(urls, owner.folder, { sessionId, lessonId });
  if (out.error) return bad(`Storage refused: ${out.error}`, 502);
  return NextResponse.json({ removed: out.removed, kept: out.kept });
}

