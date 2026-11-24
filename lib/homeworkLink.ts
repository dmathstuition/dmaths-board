// A learner's homework link (/homework?t=…): which class and which learner,
// signed so it can't be changed or made up. It doesn't run out, so it works
// days after the class — learners have no account, so this link is how they
// come back. It opens every assignment their teacher sets for that class.
// Server only.
import crypto from "crypto";

export type HomeworkLink = { s: string; g: string };
const secret = () => process.env.REPORT_SECRET || process.env.BOARD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dmaths-report";
const sig = (body: string) => crypto.createHmac("sha256", secret()).update(`homework:${body}`).digest("base64url").slice(0, 32);
const ID = /^[\w-]{1,60}$/;

export function signHomework(h: HomeworkLink): string {
  const body = Buffer.from(JSON.stringify({ s: h.s, g: h.g })).toString("base64url");
  return `${body}.${sig(body)}`;
}
export function readHomework(token: unknown): HomeworkLink | null {
  const [body, mac] = String(token ?? "").split(".");
  if (!body || !mac || body.length > 400) return null;
  const want = sig(body);
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const j = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return ID.test(j?.s) && ID.test(j?.g) ? { s: j.s, g: j.g } : null;
  } catch { return null; }
}
export const homeworkPath = (h: HomeworkLink) => `/homework?t=${encodeURIComponent(signHomework(h))}`;
