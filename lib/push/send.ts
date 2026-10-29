import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Web Push sender (VAPID). Runs server-side only (Node runtime) — never import
// from a client component. VAPID keys live in env; if they're missing we no-op
// so the rest of the app keeps working.
let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@dmaths.academy";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string; // absolute or root-relative path to open on click
}

// Send a push to every device the user has registered. Expired/invalid
// subscriptions (404/410) are pruned. Never throws — push is best-effort.
export async function sendPush(
  admin: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
  });

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      );
      sent++;
    } catch (err: any) {
      const code = err?.statusCode;
      // Gone / not found → the browser dropped it; remove so we stop trying.
      if (code === 404 || code === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.warn("push send failed:", code ?? err?.message);
      }
    }
  }
  return sent;
}
