// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { sessionKeys } from "@/lib/liveSign";

// A pretend realtime server: every channel on the same topic hears the others.
type Sub = { topic: string; fn: (m: any) => void };
const subs: Sub[] = [];
function fakeChannel(topic: string) {
  let me: Sub | null = null;
  const ch: any = {
    on: (_t: string, _f: unknown, fn: (m: any) => void) => { me = { topic, fn }; subs.push(me); return ch; },
    subscribe: (cb: (s: string) => void) => { setTimeout(() => cb("SUBSCRIBED"), 0); return ch; },
    send: async (m: any) => { subs.filter((s) => s.topic === topic && s !== me).forEach((s) => s.fn(m)); return "ok"; },
  };
  return ch;
}
vi.mock("@/lib/supabase/client", () => ({ supabaseBrowser: () => ({ channel: (t: string) => fakeChannel(t), removeChannel: () => {} }) }));
// Pretend a student's phone could inject any raw message onto the channel.
const inject = (topic: string, m: any) => subs.filter((s) => s.topic === topic).forEach((s) => s.fn(m));

import { LiveChannelProvider, useLive } from "@/components/live/LiveChannel";

const SID = "11111111-1111-1111-1111-111111111111";
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

function stubKeys(role: Record<string, "host" | "student">) {
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: any) => {
    const who = init?.headers?.["x-who"] ?? currentWho;
    const k = sessionKeys(SID);
    return new Response(JSON.stringify(role[who] === "host" ? k : { pub: k.pub }), { status: 200 });
  }));
}
let currentWho = "host";

let hostSend: (e: string, p?: unknown) => void = () => {};
function Host() { hostSend = useLive({}); return null; }
const got: { event: string; p: any }[] = [];
function Student() { useLive({ "board-clear": (p) => got.push({ event: "board-clear", p }), "board-stroke": (p) => got.push({ event: "board-stroke", p }) }); return null; }

afterEach(() => { cleanup(); subs.length = 0; got.length = 0; vi.unstubAllGlobals(); });

describe("live channel: signed teacher messages", () => {
  it("delivers the teacher's messages and drops a student's fakes", async () => {
    stubKeys({ host: "host", student: "student" });
    currentWho = "host";
    render(<LiveChannelProvider sessionId={SID}><Host /></LiveChannelProvider>);
    await new Promise((r) => setTimeout(r, 20));
    currentWho = "student";
    render(<LiveChannelProvider sessionId={SID}><Student /></LiveChannelProvider>);
    await new Promise((r) => setTimeout(r, 50));

    hostSend("board-clear", { host: true, page: 0 });
    await waitFor(() => expect(got.filter((g) => g.event === "board-clear")).toHaveLength(1));

    // A student pretending to be the teacher: no signature → ignored.
    inject(`live-class:${SID}`, { event: "board-clear", payload: { host: true, page: 0 } });
    // A student's own (allowed) stroke, not claiming to be the teacher → delivered.
    inject(`live-class:${SID}`, { event: "board-stroke", payload: { host: false, stroke: { id: "x", by: "s1" } } });
    await waitFor(() => expect(got.some((g) => g.event === "board-stroke")).toBe(true));
    expect(got.filter((g) => g.event === "board-clear")).toHaveLength(1);
  });
});
