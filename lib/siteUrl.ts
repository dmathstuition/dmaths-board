// Single source of truth for the public site URL used in email links.
// Reads NEXT_PUBLIC_SITE_URL, validates it, and falls back to the production
// domain so a missing/malformed env var never produces a broken/empty button.

const FALLBACK = "https://dmaths.academy";

export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin; // strips any trailing slash / path
    } catch {
      /* malformed env value — use fallback */
    }
  }
  return FALLBACK;
}

export const loginUrl = () => `${siteBaseUrl()}/login`;
