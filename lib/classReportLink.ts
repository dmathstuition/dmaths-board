// The link in a class report: who it's for and what the class covered,
// signed so it can't be changed or made up. The report page reads the
// learner's marks fresh from the class results. Server only.
import crypto from "crypto";
import { cleanCovered, cleanHomework } from "@/lib/classReport";

export type ReportLink = { s: string; g: string; c: string; h: string };
const secret = () => process.env.REPORT_SECRET || process.env.BOARD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dmaths-report";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sig = (body: string) => crypto.createHmac("sha256", secret()).update(`class-report:${body}`).digest("base64url").slice(0, 32);

export function signReport(r: ReportLink): string {
  const body = b64(JSON.stringify({ s: r.s, g: r.g, c: cleanCovered(r.c), h: cleanHomework(r.h) }));
  return `${body}.${sig(body)}`;
}

export function readReport(token: unknown): ReportLink | null {
  const [body, mac] = String(token ?? "").split(".");
  if (!body || !mac || body.length > 4000) return null;
  const want = sig(body);
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const j = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof j?.s !== "string" || typeof j?.g !== "string") return null;
    return { s: j.s.slice(0, 40), g: j.g.slice(0, 60), c: cleanCovered(j.c), h: cleanHomework(j.h) };
  } catch { return null; }
}
