// Server-side bridge to the Apps Script email relay.
// The secret never reaches the browser.

// Returns the relay's outcome so callers can report WHY a send failed
// (e.g. "unauthorized" = secret mismatch, "Service invoked too many times"
// = Gmail quota). Use this when you need the reason; use sendEmail() when a
// simple success boolean is enough.
export type EmailAttachment = { name: string; mimeType: string; base64: string };

export async function sendEmailResult(
  template: string,
  to: string,
  data: Record<string, any>,
  attachments?: EmailAttachment[],
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.EMAIL_RELAY_URL) {
    return { ok: false, error: "EMAIL_RELAY_URL is not set" };
  }
  try {
    const res = await fetch(process.env.EMAIL_RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.EMAIL_RELAY_SECRET, template, to, data, ...(attachments?.length ? { attachments } : {}) }),
      redirect: "follow", // Apps Script redirects POST responses
    });
    const json = await res.json().catch(() => ({ ok: false, error: `relay returned non-JSON (HTTP ${res.status})` }));
    if (!json.ok) console.warn("email relay failed:", template, json.error);
    return { ok: json.ok === true, error: json.error };
  } catch (e) {
    console.warn("email relay error:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Convenience wrapper — returns just the success boolean (most callers).
export async function sendEmail(template: string, to: string, data: Record<string, any>, attachments?: EmailAttachment[]) {
  return (await sendEmailResult(template, to, data, attachments)).ok;
}
