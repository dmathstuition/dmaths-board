import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionViewer } from "@/lib/sessionAccess";
import { limit } from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { siteBaseUrl } from "@/lib/siteUrl";
import { cleanContact, cleanCovered, cleanHomework, reportMessage } from "@/lib/classReport";
import { signReport } from "@/lib/classReportLink";
import { learnerReport } from "@/lib/classReportData";

// Class reports to parents (the class's teacher only):
//   GET  ?id=                                   → { ready, contacts: { learnerId: "email or +234…" } }
//   POST { id, action: "contact", studentId, contact }        → save a parent's contact (D-Maths Board learners)
//   POST { id, action: "links", studentIds, covered, homework } → { links: { learnerId: url } }
//   POST { id, action: "email", studentId, to, covered, homework } → email that learner's report to the parent
// Parent contacts need supabase/migration-class-reports.sql.
export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const MISSING = /parent_contact/i;
const linkFor = (s: string, g: string, c: string, h: string) => `${siteBaseUrl()}/report?t=${signReport({ s, g, c, h })}`;

async function host(id: string) {
  const v = await sessionViewer(id).catch(() => null);
  return v?.host ? v : null;
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const v = await host(id);
  if (!v) return bad("Only the class's teacher can send reports.", 403);
  if (v.session.kind !== "board") return NextResponse.json({ ready: true, contacts: {} });
  const { data, error } = await supabaseAdmin().from("live_session_guests").select("id, parent_contact").eq("session_id", id).limit(500);
  if (error) return MISSING.test(error.message) ? NextResponse.json({ ready: false, contacts: {} }) : bad(error.message, 500);
  const contacts: Record<string, string> = {};
  for (const g of data ?? []) if (g.parent_contact) contacts[g.id] = g.parent_contact;
  return NextResponse.json({ ready: true, contacts }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  const v = await host(id);
  if (!v) return bad("Only the class's teacher can send reports.", 403);
  const action = String(body?.action ?? "");
  const covered = cleanCovered(body?.covered), homework = cleanHomework(body?.homework);

  if (action === "contact") {
    if (v.session.kind !== "board") return bad("Parent contacts are kept for D-Maths Board classes.", 409);
    const raw = String(body?.contact ?? "").trim();
    const c = cleanContact(raw);
    if (raw && !c) return bad("Enter a parent's email or WhatsApp number.");
    const { error } = await supabaseAdmin().from("live_session_guests").update({ parent_contact: c?.value ?? null })
      .eq("session_id", id).eq("id", String(body?.studentId ?? ""));
    if (error) return MISSING.test(error.message) ? bad("To keep parent contacts, run supabase/migration-class-reports.sql.", 501) : bad(error.message, 500);
    return NextResponse.json({ ok: true, contact: c?.value ?? null });
  }

  if (action === "links") {
    const ids = (Array.isArray(body?.studentIds) ? body.studentIds : []).map((x: unknown) => String(x).slice(0, 60)).filter(Boolean).slice(0, 300);
    const links: Record<string, string> = {};
    for (const g of ids) links[g] = linkFor(id, g, covered, homework);
    return NextResponse.json({ links });
  }

  if (action === "email") {
    if (!(await limit(`class-report-mail:${v.id}`, 300, 60 * 60_000))) return bad("That's a lot of emails — wait a while before sending more.", 429);
    const to = cleanContact(body?.to);
    if (to?.kind !== "email") return bad("That isn't an email address.");
    const studentId = String(body?.studentId ?? "").slice(0, 60);
    const r = await learnerReport(id, studentId);
    if (!r) return bad("We couldn't find that learner in this class.", 404);
    const url = linkFor(id, studentId, covered, homework);
    const ok = await sendEmail("notice", to.value, {
      firstName: "", title: `Class report: ${r.learner} — ${r.title}`,
      body: reportMessage({ learner: r.learner, title: r.title, teacher: r.teacher, date: r.date, covered, homework, row: r.row, url }),
      loginUrl: url, linkUrl: url, linkText: "See the full report",
    }).catch(() => false);
    if (!ok) return bad("The email didn't go — try again in a moment.", 502);
    return NextResponse.json({ ok: true });
  }
  return bad("Unknown action.");
}
