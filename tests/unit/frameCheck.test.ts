import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The board's web browser asks the server whether a site lets itself be shown
// inside another page (app/api/board/frame-check). The server must only ever
// talk to public web sites, for the class's teacher, and give nothing back but
// the verdict.
const viewer = vi.fn();
const dns = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: unknown[]) => viewer(...a) }));
vi.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => dns(...a), default: { lookup: (...a: unknown[]) => dns(...a) } }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true }));

const ask = async (url: unknown) => {
  const { POST } = await import("@/app/api/board/frame-check/route");
  const res = await POST(new Request("https://dmaths.academy/api/board/frame-check", { method: "POST", body: JSON.stringify({ sessionId: "s", url }) }));
  return { status: res.status, body: await res.json() };
};
const page = (headers: Record<string, string> = {}, status = 200) => new Response(status >= 300 && status < 400 ? null : "<html>secret page text</html>", { status, headers });
let fetched: string[] = [];

beforeEach(() => {
  fetched = [];
  viewer.mockResolvedValue({ id: "t", host: true });
  dns.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  vi.stubGlobal("fetch", vi.fn(async (u: string) => { fetched.push(String(u)); return page(); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("frame-check", () => {
  it("is for the class's teacher only", async () => {
    viewer.mockResolvedValue({ id: "g", host: false });
    expect((await ask("https://www.desmos.com/calculator")).status).toBe(403);
    viewer.mockResolvedValue(null);
    expect((await ask("https://www.desmos.com/calculator")).status).toBe(403);
    expect(fetched).toEqual([]);
  });
  it("says a site can be shown, and gives back only the verdict", async () => {
    const r = await ask("desmos.com/calculator");
    expect(r).toEqual({ status: 200, body: { verdict: "ok", url: "https://desmos.com/calculator" } });
    expect(JSON.stringify(r.body)).not.toContain("secret");
  });
  it("says when a site refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page({ "x-frame-options": "SAMEORIGIN" })));
    expect((await ask("https://google.com")).body.verdict).toBe("blocked");
    vi.stubGlobal("fetch", vi.fn(async () => page({ "content-security-policy": "frame-ancestors 'none'" })));
    expect((await ask("https://bank.example.org")).body.verdict).toBe("blocked");
  });
  it("can't tell when the site turns it away or doesn't answer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page({}, 403)));
    expect((await ask("https://example.org")).body.verdict).toBe("unknown");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    expect((await ask("https://example.org")).body.verdict).toBe("unknown");
  });
  it("never talks to this machine or a private network", async () => {
    for (const bad of ["http://localhost:3000/", "https://127.0.0.1/", "https://169.254.169.254/latest/meta-data/", "https://[::1]/", "file:///etc/passwd", "https://dmaths.academy/api/x"]) expect((await ask(bad)).status, bad).toBe(400);
    // A public-looking name that really points inside.
    dns.mockResolvedValue([{ address: "10.0.0.7", family: 4 }]);
    expect((await ask("https://innocent.example.org/")).status).toBe(400);
    dns.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "::1", family: 6 }]);
    expect((await ask("https://innocent.example.org/")).status).toBe(400);
    expect(fetched).toEqual([]);
  });
  it("follows redirects, checking each stop again", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { fetched.push(String(u)); return String(u).includes("short.example.org") ? page({ location: "https://www.geogebra.org/classic" }, 302) : page(); }));
    expect((await ask("https://short.example.org/abc")).body).toEqual({ verdict: "ok", url: "https://www.geogebra.org/classic" });
    expect(fetched).toEqual(["https://short.example.org/abc", "https://www.geogebra.org/classic"]);
    // A redirect that points inside is not followed.
    fetched = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { fetched.push(String(u)); return page({ location: "http://169.254.169.254/latest/meta-data/" }, 302); }));
    expect((await ask("https://short.example.org/abc")).body.verdict).toBe("unknown");
    expect(fetched).toEqual(["https://short.example.org/abc"]);
    // Nor is an endless chain.
    fetched = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { fetched.push(String(u)); return page({ location: `https://loop.example.org/${fetched.length}` }, 301); }));
    expect((await ask("https://loop.example.org/0")).body.verdict).toBe("unknown");
    expect(fetched.length).toBeLessThanOrEqual(5);
  });
});
