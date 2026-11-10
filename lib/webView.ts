// The web browser on the board: the teacher opens a web page inside the class,
// full screen, and can put the same page on every learner's screen. Pure:
// which addresses are allowed, whether a site lets itself be shown inside
// another page, and what travels over the class channel.
//
// Pages are shown in a sandboxed frame — they are never fetched and re-served
// by us. Many sites (Google, most banks and social networks) refuse to be
// shown inside another page; for those the teacher gets "open in a new tab".

const str = (x: unknown, n: number) => String(x ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
export const MAX_URL = 600;

// An IPv4 or IPv6 address that isn't on the public internet (this machine,
// a home or office network, link-local, multicast…).
export function isPrivateIp(ip: string): boolean {
  const t = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = t.match(/^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (!t.includes(":")) return false; // not an address at all
  return t === "::" || t === "::1" || /^f[cd]/.test(t) || /^fe[89ab]/.test(t) || t.startsWith("ff") || t.startsWith("::ffff:") || t.startsWith("64:ff9b:");
}
const looksLikeIp = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");

// What was typed → a web address we're willing to open, or null. Only https
// pages on public sites: no other schemes, no logins in the address, nothing
// on this machine or a private network, and never this site itself.
export function webAddress(input: string, selfHost = ""): string | null {
  let t = str(input, MAX_URL);
  if (!t || /\s/.test(t)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t)) return null; // javascript:, data:, file:, …
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  let u: URL;
  try { u = new URL(t); } catch { return null; }
  if (u.protocol === "http:") u.protocol = "https:";
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") && !host.includes(":")) return null;                 // "localhost", "intranet"
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example)$/.test(host)) return null;
  if (looksLikeIp(host.replace(/^\[|\]$/g, ""))) return null;                  // addresses by number aren't web sites a class needs
  if (selfHost && (host === selfHost.toLowerCase() || host.endsWith(`.${selfHost.toLowerCase()}`))) return null;
  return u.toString().slice(0, MAX_URL);
}
// Text that isn't an address: look it up on Wikipedia (which can be shown inside the class).
export const wikiSearch = (q: string) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(str(q, 120))}`;
export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };

// Does the site let other pages show it? From its response headers.
export type FrameVerdict = "ok" | "blocked" | "unknown";
export function frameVerdict(headers: { xfo?: string | null; csp?: string | null }, selfOrigin = ""): FrameVerdict {
  const csp = String(headers.csp ?? "").toLowerCase();
  const fa = csp.split(/[;,]/).map((d) => d.trim()).find((d) => d.startsWith("frame-ancestors"));
  if (fa) { // when present, this decides (and X-Frame-Options is ignored)
    const sources = fa.split(/\s+/).slice(1);
    const self = selfOrigin.toLowerCase();
    return sources.some((s) => s === "*" || s === "https:" || s === "https://*" || (!!self && s === self)) ? "ok" : "blocked";
  }
  const xfo = String(headers.xfo ?? "").toLowerCase();
  if (/deny|sameorigin|allow-from/.test(xfo)) return "blocked";
  return "ok";
}

// Good starting points for a maths and science class (each is checked when opened).
export const QUICK_LINKS: { label: string; url: string; hint: string }[] = [
  { label: "Desmos", url: "https://www.desmos.com/calculator", hint: "Graphing calculator" },
  { label: "GeoGebra", url: "https://www.geogebra.org/classic", hint: "Geometry and graphs" },
  { label: "PhET", url: "https://phet.colorado.edu/en/simulations/filter?type=html", hint: "Science simulations" },
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Main_Page", hint: "Encyclopedia" },
  { label: "Maths Is Fun", url: "https://www.mathsisfun.com/", hint: "Explanations and puzzles" },
  { label: "Periodic table", url: "https://ptable.com/", hint: "Interactive elements" },
];

// What the class sees (teacher → all, signed): "web-share".
export type WebShare = { id: string; url: string; open: boolean };
export function cleanWebShare(p: any): WebShare | null {
  if (!p || typeof p.id !== "string" || !p.id) return null;
  const url = webAddress(String(p.url ?? ""));
  return url ? { id: str(p.id, 40), url, open: !!p.open } : null;
}
