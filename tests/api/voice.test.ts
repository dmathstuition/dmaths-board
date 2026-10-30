import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const viewer = vi.fn();
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: (...a: unknown[]) => viewer(...a) }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true }));
import { POST } from "@/app/api/live-sessions/voice/route";
import { sessionTicket, speakPass } from "@/lib/voice";

const CLASS = "c0000000-0000-0000-0000-000000000001";
const SDP = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n";
const call = (body: object) => POST(new Request("https://dmaths.test/api/live-sessions/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: CLASS, ...body }) }));
const host = { id: "teacher-1", host: true, session: { status: "live" } };
const learner = { id: "guest-abc123", host: false, session: { status: "live" } };
let cfCalls: { url: string; method: string; body: any }[] = [];

beforeEach(() => {
  viewer.mockReset(); cfCalls = [];
  process.env.CF_REALTIME_APP_ID = "app123"; process.env.CF_REALTIME_APP_TOKEN = "tok";
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    cfCalls.push({ url, method: init?.method, body });
    if (url.endsWith("/sessions/new")) return new Response(JSON.stringify({ sessionId: "cfsession0001" }));
    if (url.includes("/tracks/new") && body?.sessionDescription) return new Response(JSON.stringify({ sessionDescription: { type: "answer", sdp: SDP }, tracks: [{ mid: "0", trackName: body.tracks[0].trackName }] }));
    if (url.includes("/tracks/new")) return new Response(JSON.stringify({ requiresImmediateRenegotiation: true, sessionDescription: { type: "offer", sdp: SDP }, tracks: body.tracks.map((t: any, i: number) => ({ ...t, mid: String(i + 1) })) }));
    return new Response(JSON.stringify({}));
  }));
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.CF_REALTIME_APP_ID; delete process.env.CF_REALTIME_APP_TOKEN; });

describe("class voice API", () => {
  it("is only for people in a live class", async () => {
    viewer.mockResolvedValue(null);
    expect((await call({ op: "start" })).status).toBe(403);
    viewer.mockResolvedValue({ ...learner, session: { status: "ended" } });
    expect((await call({ op: "start" })).status).toBe(409);
  });

  it("says whether voice is set up", async () => {
    viewer.mockResolvedValue(learner);
    expect(await (await call({ op: "config" })).json()).toEqual({ on: true });
    delete process.env.CF_REALTIME_APP_ID;
    expect(await (await call({ op: "config" })).json()).toEqual({ on: false });
    expect((await call({ op: "start" })).status).toBe(503);
  });

  it("opens a Cloudflare session with a ticket and STUN servers", async () => {
    viewer.mockResolvedValue(host);
    const j = await (await call({ op: "start" })).json();
    expect(j.session).toBe("cfsession0001");
    expect(j.ticket).toBe(sessionTicket(CLASS, host.id, "cfsession0001"));
    expect(j.iceServers[0].urls[0]).toContain("stun.cloudflare.com");
    expect(cfCalls[0]).toMatchObject({ url: "https://rtc.live.cloudflare.com/v1/apps/app123/sessions/new", method: "POST" });
  });

  it("lets the teacher send their microphone under their own track name", async () => {
    viewer.mockResolvedValue(host);
    const ticket = sessionTicket(CLASS, host.id, "cfsession0001");
    const res = await call({ op: "push", session: "cfsession0001", ticket, sdp: SDP, mid: "0" });
    expect(await res.json()).toEqual({ sdp: SDP, track: "mic-teacher-1" });
    expect(cfCalls[0].body).toEqual({ sessionDescription: { type: "offer", sdp: SDP }, tracks: [{ location: "local", mid: "0", trackName: "mic-teacher-1" }] });
  });

  it("refuses someone else's session", async () => {
    viewer.mockResolvedValue(learner);
    const hostTicket = sessionTicket(CLASS, host.id, "cfsession0001");
    expect((await call({ op: "pull", session: "cfsession0001", ticket: hostTicket, tracks: [{ s: "cfsession0002", t: "mic-teacher-1" }] })).status).toBe(403);
    expect(cfCalls).toHaveLength(0);
  });

  it("lets a learner speak only with the teacher's pass", async () => {
    viewer.mockResolvedValue(learner);
    const ticket = sessionTicket(CLASS, learner.id, "cfsession0003");
    const push = (extra: object) => call({ op: "push", session: "cfsession0003", ticket, sdp: SDP, mid: "0", ...extra });
    expect((await push({})).status).toBe(403);
    const exp = Date.now() + 60_000;
    expect((await push({ pass: speakPass(CLASS, "someone-else", exp), exp })).status).toBe(403);
    expect((await push({ pass: speakPass(CLASS, learner.id, Date.now() - 1), exp: Date.now() - 1 })).status).toBe(403);
    const ok = await push({ pass: speakPass(CLASS, learner.id, exp), exp });
    expect(ok.status).toBe(200);
    expect((await ok.json()).track).toBe("mic-guest-abc123");
  });

  it("only the teacher hands out speaking passes", async () => {
    viewer.mockResolvedValue(learner);
    expect((await call({ op: "allow", learner: learner.id })).status).toBe(403);
    viewer.mockResolvedValue(host);
    const j = await (await call({ op: "allow", learner: learner.id })).json();
    expect(j.pass).toBe(speakPass(CLASS, learner.id, j.exp));
  });

  it("pulls only microphone tracks and hands back the offer to answer", async () => {
    viewer.mockResolvedValue(learner);
    const ticket = sessionTicket(CLASS, learner.id, "cfsession0003");
    const j = await (await call({ op: "pull", session: "cfsession0003", ticket, tracks: [{ s: "cfsession0001", t: "mic-teacher-1" }, { s: "cfsession0001", t: "screen-x" }] })).json();
    expect(cfCalls[0].body.tracks).toEqual([{ location: "remote", sessionId: "cfsession0001", trackName: "mic-teacher-1" }]);
    expect(j).toEqual({ tracks: [{ mid: "1", s: "cfsession0001", t: "mic-teacher-1", error: null }], sdp: SDP });
    expect((await (await call({ op: "answer", session: "cfsession0003", ticket, sdp: SDP })).json())).toEqual({ ok: true });
    expect(cfCalls[1]).toMatchObject({ url: expect.stringContaining("/sessions/cfsession0003/renegotiate"), method: "PUT", body: { sessionDescription: { type: "answer", sdp: SDP } } });
  });
});
