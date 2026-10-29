import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push/send";

// One call to reach a user both ways: the in-app notification bell (a row in
// the `notifications` table, read via RLS) AND a Web Push to their devices.
// Push is best-effort and never blocks the in-app row. Server-side only.
export interface NotifyInput {
  title: string;
  body?: string;
  link?: string; // root-relative path, e.g. "/portal/progress"
}

export async function notifyUser(
  admin: SupabaseClient,
  userId: string,
  { title, body, link }: NotifyInput,
): Promise<void> {
  // 1) In-app bell (durable, always works).
  await admin.from("notifications").insert({
    user_id: userId,
    title,
    body: body ?? null,
    link: link ?? null,
  });
  // 2) Push (best-effort; no-ops if the user has no subscriptions / no VAPID).
  await sendPush(admin, userId, { title, body, url: link ?? "/" });
}

// Notify every admin account (e.g. "new payment received").
export async function notifyAdmins(admin: SupabaseClient, input: NotifyInput): Promise<void> {
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (!admins?.length) return;
  await Promise.all(admins.map((a: { id: string }) => notifyUser(admin, a.id, input)));
}
