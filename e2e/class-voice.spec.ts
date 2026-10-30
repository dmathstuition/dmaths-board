import { test, expect, type Browser, type Page } from "@playwright/test";
import { SID, agree, classServer, realtimeHub } from "./helpers";

// Class voice from start to finish, with real audio. Cloudflare's SFU is played
// by a third browser page that forwards tracks the way Cloudflare does: each
// person has one connection; pushing a microphone is offer → answer; pulling a
// track gives back an offer to answer.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-features=WebRtcHideLocalIpsWithMdns"] } });

async function fakeSfu(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("about:blank");
  await page.evaluate(() => {
    const pcs: Record<string, RTCPeerConnection> = {};
    const tracks: Record<string, MediaStreamTrack> = {};
    const gathered = (pc: RTCPeerConnection) => new Promise<void>((ok) => {
      if (pc.iceGatheringState === "complete") return ok();
      pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") ok(); });
      setTimeout(ok, 3000);
    });
    const pcFor = (id: string) => (pcs[id] ??= new RTCPeerConnection());
    let n = 0;
    (window as any).sfu = {
      start: () => { const id = `sfusession${++n}`; pcFor(id); return id; },
      async push(id: string, sdp: string, mid: string, name: string) {
        const pc = pcFor(id);
        await pc.setRemoteDescription({ type: "offer", sdp });
        const tx = pc.getTransceivers().find((t) => t.mid === mid)!;
        tx.direction = "recvonly";
        tracks[name] = tx.receiver.track;
        // Chrome only decodes incoming audio that is played somewhere; play it (muted) so it can be forwarded.
        const keep = new Audio(); keep.muted = true; keep.srcObject = new MediaStream([tx.receiver.track]); keep.play().catch(() => {});
        await pc.setLocalDescription(await pc.createAnswer());
        await gathered(pc);
        return { sessionDescription: { type: "answer", sdp: pc.localDescription!.sdp }, tracks: [{ mid, trackName: name }] };
      },
      async pull(id: string, list: { sessionId: string; trackName: string }[]) {
        const pc = pcFor(id);
        const txs = list.map((t) => ({ t, tx: pc.addTransceiver(tracks[t.trackName], { direction: "sendonly" }) }));
        await pc.setLocalDescription(await pc.createOffer());
        await gathered(pc);
        return { requiresImmediateRenegotiation: true, sessionDescription: { type: "offer", sdp: pc.localDescription!.sdp }, tracks: txs.map(({ t, tx }) => ({ ...t, mid: tx.mid })) };
      },
      async answer(id: string, sdp: string) { await pcs[id].setRemoteDescription({ type: "answer", sdp }); return {}; },
      async close(id: string, sdp: string) {
        const pc = pcs[id];
        await pc.setRemoteDescription({ type: "offer", sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        return { sessionDescription: { type: "answer", sdp: pc.localDescription!.sdp } };
      },
      // Audio packets the SFU has received from / sent to a session.
      async packets(id: string) {
        let inn = 0, out = 0;
        (await pcs[id]?.getStats())?.forEach((r: any) => {
          if (r.type === "inbound-rtp" && r.kind === "audio") inn += r.packetsReceived ?? 0;
          if (r.type === "outbound-rtp" && r.kind === "audio") out += r.packetsSent ?? 0;
        });
        return { in: inn, out };
      },
    };
  });
  return page;
}

async function openClass(browser: Browser) {
  const hub = realtimeHub("normal"), server = classServer(), sfu = await fakeSfu(browser);
  const sessions: Record<string, string> = {};
  const open = async (who: "teacher" | "learner") => {
    const ctx = await browser.newContext({ permissions: ["microphone"] });
    await hub.attach(ctx, who);
    await server.attach(ctx, who);
    await ctx.route("**/api/live-sessions/voice", async (r) => {
      const b = JSON.parse(r.request().postData() ?? "{}");
      const run = (fn: string, ...args: unknown[]) => sfu.evaluate(([f, a]) => (window as any).sfu[f as string](...(a as unknown[])), [fn, args] as const);
      let json: any = {};
      if (b.op === "config") json = { on: true };
      else if (b.op === "start") { const id = await run("start"); sessions[who] = id as string; json = { session: id, ticket: "t", iceServers: [] }; }
      else if (b.op === "allow") json = { pass: "pass", exp: Date.now() + 3_600_000 };
      else if (b.op === "push") { const res: any = await run("push", b.session, b.sdp, b.mid, `mic-${who}`); json = { sdp: res.sessionDescription.sdp, track: `mic-${who}` }; }
      else if (b.op === "pull") {
        const res: any = await run("pull", b.session, b.tracks.map((t: any) => ({ sessionId: t.s, trackName: t.t })));
        json = { sdp: res.sessionDescription.sdp, tracks: res.tracks.map((t: any) => ({ mid: t.mid, s: t.sessionId, t: t.trackName, error: null })) };
      } else if (b.op === "answer") { await run("answer", b.session, b.sdp); json = { ok: true }; }
      else if (b.op === "close") { const res: any = await run("close", b.session, b.sdp); json = { sdp: res.sessionDescription.sdp }; }
      await r.fulfill({ json });
    });
    const page = await ctx.newPage();
    await page.goto(who === "teacher" ? `/e2e-host?id=${SID}` : `/class/${SID}`, { waitUntil: "networkidle" });
    await agree(page);
    return page;
  };
  const teacher = await open("teacher"), learner = await open("learner");
  await expect(teacher.locator("canvas").first()).toBeVisible();
  await expect(learner.locator("canvas").first()).toBeVisible();
  await teacher.waitForTimeout(1500);
  const packets = (who: "teacher" | "learner") => sfu.evaluate((id) => (window as any).sfu.packets(id), sessions[who]) as Promise<{ in: number; out: number }>;
  return { teacher, learner, packets };
}

const flowing = async (check: () => Promise<boolean>) => expect.poll(check, { timeout: 20_000, intervals: [500] }).toBe(true);

test("the teacher talks and a learner hears it; a learner given a turn is heard by the teacher", async ({ browser }) => {
  test.setTimeout(240_000);
  const { teacher, learner, packets } = await openClass(browser);

  // The teacher goes on air.
  await teacher.getByRole("button", { name: /Start voice/ }).click();
  await expect(teacher.getByRole("button", { name: "Mute my microphone" })).toBeVisible();
  await flowing(async () => (await packets("teacher")).in > 20); // the SFU hears the teacher

  // The learner taps to listen, and the teacher's audio reaches them.
  await learner.getByRole("button", { name: "Listen to the class" }).click();
  await expect(learner.getByRole("status").filter({ hasText: "Listening" })).toBeVisible();
  await flowing(async () => (await packets("learner")).out > 20); // the SFU sends the teacher's audio to the learner

  // Mute stops the microphone; unmute brings it back.
  await teacher.getByRole("button", { name: "Mute my microphone" }).click();
  await expect(teacher.getByRole("button", { name: "Unmute my microphone" })).toBeVisible();
  await teacher.getByRole("button", { name: "Unmute my microphone" }).click();

  // The learner raises a hand; the teacher lets them speak; the teacher hears them.
  await learner.getByRole("button", { name: "Raise my hand" }).click();
  await teacher.getByRole("button", { name: "Let Emmanuel speak" }).click();
  await learner.getByRole("button", { name: "Speak to the class" }).click();
  await expect(learner.getByRole("button", { name: "Stop speaking" })).toBeVisible();
  await expect(teacher.getByText(/Emmanuel is speaking/)).toBeVisible({ timeout: 10_000 });
  await flowing(async () => (await packets("learner")).in > 20 && (await packets("teacher")).out > 20);

  // The teacher ends the learner's turn: their microphone goes off.
  await teacher.getByRole("button", { name: "Stop Emmanuel speaking" }).click();
  await expect(learner.getByRole("button", { name: "Stop speaking" })).toBeHidden({ timeout: 10_000 });
  await expect(learner.getByRole("button", { name: "Speak to the class" })).toBeHidden();

  // The teacher stops voice: the learner's controls go away.
  await teacher.getByRole("button", { name: "Stop voice" }).click();
  await expect(learner.getByRole("status").filter({ hasText: "Listening" })).toBeHidden({ timeout: 10_000 });
});

test("voice stays hidden when it isn't set up", async ({ browser }) => {
  const hub = realtimeHub("normal"), server = classServer();
  const ctx = await browser.newContext();
  await hub.attach(ctx, "teacher");
  await server.attach(ctx, "teacher");
  await ctx.route("**/api/live-sessions/voice", (r) => r.fulfill({ json: { on: false } }));
  const page: Page = await ctx.newPage();
  await page.goto(`/e2e-host?id=${SID}`, { waitUntil: "networkidle" });
  await agree(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByRole("button", { name: /Start voice|Talk to the class/ })).toHaveCount(0);
});
