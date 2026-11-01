import { NextResponse } from "next/server";
import { sessionViewer } from "@/lib/sessionAccess";
import { rateLimit } from "@/lib/ratelimit";
import {
  voiceConfigured, cf, iceServers, sessionTicket, ticketOk, speakPass, passOk, micTrack, camTrack, cleanId, cleanSdp, VoiceError, SPEAK_MS,
} from "@/lib/voice";

// Class voice and camera (lib/voice.ts). Everyone in the class may listen and
// watch; the host may speak (and show their camera), and so may a learner
// holding a speaking pass from the host.
//   POST { id, op: "config" }                                   → { on }
//   POST { id, op: "start" }                                    → { session, ticket, iceServers }
//   POST { id, op: "push", session, ticket, sdp, mid, kind?: "mic" | "cam", pass?, exp? } → { sdp, track }  (send my microphone or camera)
//   POST { id, op: "pull", session, ticket, tracks: [{ s, t }] }    → { tracks, sdp? }     (listen; sdp = an offer to answer)
//   POST { id, op: "answer", session, ticket, sdp }             → { ok }
//   POST { id, op: "close", session, ticket, sdp, mids }        → { sdp }
//   POST { id, op: "allow", learner }                           → { pass, exp }  (host only)
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const classId = String(body?.id ?? "");
  const v = await sessionViewer(classId).catch(() => null);
  if (!v) return bad("Join the class first.", 403);
  if (v.session.status !== "live") return bad("This class has ended.", 409);
  const op = String(body?.op ?? "");
  if (op === "config") return NextResponse.json({ on: voiceConfigured() });
  if (!voiceConfigured()) return bad("Voice isn't switched on for this board yet.", 503);
  if (!rateLimit(`voice:${v.id}`, 120, 60_000)) return bad("Too many voice requests — wait a moment.", 429);

  try {
    if (op === "start") {
      const [made, ice] = await Promise.all([cf<{ sessionId: string }>("/sessions/new", { method: "POST" }), iceServers()]);
      const session = cleanId(made?.sessionId);
      if (!session) throw new VoiceError("The voice service didn't open a connection.");
      return NextResponse.json({ session, ticket: sessionTicket(classId, v.id, session), iceServers: ice });
    }
    if (op === "allow") {
      if (!v.host) return bad("Only the teacher can let someone speak.", 403);
      const learner = String(body?.learner ?? "").slice(0, 80);
      if (!learner) return bad("Who should speak?");
      const exp = Date.now() + SPEAK_MS;
      return NextResponse.json({ pass: speakPass(classId, learner, exp), exp });
    }

    const session = cleanId(body?.session);
    if (!ticketOk(classId, v.id, session, body?.ticket)) return bad("That voice connection isn't yours — rejoin voice.", 403);
    const path = `/sessions/${session}`;

    if (op === "push") {
      if (!v.host && !passOk(classId, v.id, body?.pass, body?.exp)) return bad("Your teacher hasn't let you speak.", 403);
      const sdp = cleanSdp(body?.sdp), mid = String(body?.mid ?? "").slice(0, 16);
      if (!sdp || !mid) return bad("Microphone details are missing.");
      const track = body?.kind === "cam" ? camTrack(v.id) : micTrack(v.id);
      const r = await cf(`${path}/tracks/new`, { method: "POST", body: { sessionDescription: { type: "offer", sdp }, tracks: [{ location: "local", mid, trackName: track }] } });
      return NextResponse.json({ sdp: r?.sessionDescription?.sdp ?? "", track });
    }
    if (op === "pull") {
      const tracks = (Array.isArray(body?.tracks) ? body.tracks : []).slice(0, 12)
        .map((t: any) => ({ location: "remote", sessionId: cleanId(t?.s), trackName: String(t?.t ?? "").slice(0, 64) }))
        .filter((t: any) => t.sessionId && /^(mic|cam)-[A-Za-z0-9_-]+$/.test(t.trackName));
      if (!tracks.length) return bad("Nothing to listen to.");
      const r = await cf<any>(`${path}/tracks/new`, { method: "POST", body: { tracks } });
      return NextResponse.json({
        tracks: (r?.tracks ?? []).map((t: any) => ({ mid: t?.mid ?? null, s: t?.sessionId, t: t?.trackName, error: t?.errorDescription ?? null })),
        sdp: r?.requiresImmediateRenegotiation ? r?.sessionDescription?.sdp ?? null : null,
      });
    }
    if (op === "answer") {
      const sdp = cleanSdp(body?.sdp);
      if (!sdp) return bad("The answer is missing.");
      await cf(`${path}/renegotiate`, { method: "PUT", body: { sessionDescription: { type: "answer", sdp } } });
      return NextResponse.json({ ok: true });
    }
    if (op === "close") {
      const sdp = cleanSdp(body?.sdp);
      const mids = (Array.isArray(body?.mids) ? body.mids : []).map((m: unknown) => String(m).slice(0, 16)).slice(0, 12);
      if (!sdp || !mids.length) return bad("Nothing to close.");
      const r = await cf(`${path}/tracks/close`, { method: "PUT", body: { tracks: mids.map((mid: string) => ({ mid })), sessionDescription: { type: "offer", sdp }, force: false } });
      return NextResponse.json({ sdp: r?.sessionDescription?.sdp ?? null });
    }
    return bad("Unknown voice request.");
  } catch (e) {
    if (e instanceof VoiceError) return bad(e.message, e.status);
    return bad("Voice had a problem — try again.", 500);
  }
}
