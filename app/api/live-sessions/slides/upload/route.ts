import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/ratelimit";

// The second road for slides and pictures. Normally the browser uploads each
// picture straight to storage; on networks where that keeps failing (storage
// blocked or very slow), it sends the picture here and this server stores it.
// The one-use ticket from /api/live-sessions/slides is the permission: storage
// only accepts it for the exact path it was made for.
//   POST multipart { path, token, file }
export const dynamic = "force-dynamic";
const MAX_BYTES = 4 * 1024 * 1024; // the hosting limit on a request is 4.5 MB
const PATH = /^slides\/[a-z0-9-]{1,60}\/[\w.-]{1,80}\.(jpg|png|webp)$/i;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "slide-relay"), 120, 60_000)) return bad("Too many uploads — wait a minute.", 429);
  const form = await req.formData().catch(() => null);
  const path = String(form?.get("path") ?? "");
  const token = String(form?.get("token") ?? "");
  const file = form?.get("file");
  if (!PATH.test(path) || path.includes("..") || !token) return bad("That upload ticket can't be read.");
  if (!(file instanceof Blob) || !file.size) return bad("No picture was sent.");
  if (file.size > MAX_BYTES) return bad("That picture is too big.", 413);
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return bad("Slides must be JPG, PNG or WebP pictures.", 415);
  const { error } = await supabaseAdmin().storage.from("materials")
    .uploadToSignedUrl(path, token, file, { contentType: file.type, cacheControl: "31536000", upsert: true });
  if (error && !/already exists|duplicate/i.test(error.message)) return bad(`Storage refused: ${error.message}`, 502);
  return NextResponse.json({ ok: true });
}
