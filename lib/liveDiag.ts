// Browser side of the class problem log (see /api/live-sessions/diag). A board,
// quiz or upload that hits trouble reports it once per page visit, so after a
// class the admin can see what went wrong, where and on what device.
const sent = new Set<string>();

export function reportProblem(event: string, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const key = `${event}:${String(detail.sessionId ?? "")}`;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({
    event, ...detail,
    page: location.pathname, online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType ?? null,
    ua: navigator.userAgent.slice(0, 160),
  });
  try {
    if (navigator.sendBeacon?.("/api/live-sessions/diag", new Blob([body], { type: "application/json" }))) return;
  } catch { /* fall through */ }
  fetch("/api/live-sessions/diag", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
