// BROWSER — one person's voice-and-camera connection for a class (see
// lib/voice.ts and app/api/live-sessions/voice). It can send this device's
// microphone and camera, and receive other people's. Every change to the
// connection goes through one queue, so offers and answers never cross.

// A speaker: their Cloudflare session `s`, microphone track `t`, camera track `v`
// when it's on, shared screen `sc` (the teacher), and whether they're muted.
export type Speaker = { id: string; name: string; s: string; t: string; v?: string; sc?: string; muted?: boolean };
type Api = (op: string, extra?: Record<string, unknown>) => Promise<any>;
type Pass = { pass: string; exp: number };
type Sent = { stream: MediaStream; tx: RTCRtpTransceiver; track: string };
type Got = { mid: string; kind: "audio" | "video"; audio?: HTMLAudioElement; stream?: MediaStream; rx?: RTCRtpReceiver };

// Small, light video: the board is the lesson; the face is a corner picture.
// About 250 kbit/s at most ≈ 110 MB an hour for each person watching.
const CAMERA: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 15 }, facingMode: "user" };
const CAMERA_SEND: RTCRtpEncodingParameters = { maxBitrate: 250_000, maxFramerate: 15 };
// A shared screen: sharp but slow-moving (slides, documents).
const SCREEN_SEND: RTCRtpEncodingParameters = { maxBitrate: 900_000, maxFramerate: 8 };

export function voiceApi(classId: string): Api {
  return async (op, extra = {}) => {
    const r = await fetch("/api/live-sessions/voice", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: classId, op, ...extra }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) throw new Error(j.error ?? "Voice couldn't connect. Check your connection.");
    return j;
  };
}

export class VoiceLink {
  private pc: RTCPeerConnection | null = null;
  private session = "";
  private ticket = "";
  private queue: Promise<unknown> = Promise.resolve();
  private mic: Sent | null = null;
  private cam: Sent | null = null;
  private scr: Sent | null = null;
  onShareEnded: () => void = () => {}; // the browser's own "Stop sharing" was pressed
  private pulled = new Map<string, Got>(); // by track name
  onState: (s: RTCPeerConnectionState) => void = () => {};
  // The connection dropped for good (or never came up): everything sent and
  // received is gone; the next action opens a fresh one.
  onLost: () => void = () => {};
  private dropTimer: ReturnType<typeof setTimeout> | null = null;
  onChange: () => void = () => {};

  constructor(private api: Api) {}

  get connected() { return !!this.pc && this.pc.connectionState !== "closed" && this.pc.connectionState !== "failed"; }
  get sessionId() { return this.session; }

  private run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => {});
    return next;
  }

  private async open() {
    if (this.pc && this.connected) return this.pc;
    const r = await this.api("start");
    this.session = r.session; this.ticket = r.ticket;
    const pc = new RTCPeerConnection({ iceServers: r.iceServers ?? [], bundlePolicy: "max-bundle" });
    pc.addEventListener("connectionstatechange", () => {
      this.onState(pc.connectionState);
      if (this.pc !== pc) return;
      if (this.dropTimer) { clearTimeout(this.dropTimer); this.dropTimer = null; }
      // "disconnected" often comes back by itself (a network blip); "failed" doesn't.
      if (pc.connectionState === "failed") this.lose();
      else if (pc.connectionState === "disconnected") this.dropTimer = setTimeout(() => { if (this.pc === pc && pc.connectionState !== "connected") this.lose(); }, 8000);
    });
    this.pc = pc;
    return pc;
  }

  private lose() { this.close(); this.onLost(); }

  // Cloudflare only takes new tracks on a connection that is up ("Session
  // appears to be disconnected"): after the first exchange, wait for it.
  private ready(ms = 15_000): Promise<void> {
    const pc = this.pc;
    if (!pc || !pc.remoteDescription || pc.connectionState === "connected") return Promise.resolve();
    if (pc.connectionState === "failed" || pc.connectionState === "closed") return Promise.reject(new Error("The call connection dropped — try again."));
    return new Promise((ok, no) => {
      const done = (f: () => void) => { clearTimeout(t); pc.removeEventListener("connectionstatechange", on); f(); };
      const on = () => {
        if (pc.connectionState === "connected") done(ok);
        else if (pc.connectionState === "failed" || pc.connectionState === "closed") done(() => no(new Error("The call connection dropped — try again.")));
      };
      const t = setTimeout(() => done(() => no(new Error("The call is taking long to connect — check the internet and try again."))), ms);
      pc.addEventListener("connectionstatechange", on);
    });
  }
  // One request to Cloudflare (through our server), waiting for the connection
  // first, and once more if Cloudflare says it isn't up yet.
  private async cf(op: string, extra: Record<string, unknown>) {
    await this.ready();
    try { return await this.api(op, { session: this.session, ticket: this.ticket, ...extra }); }
    catch (e) {
      if (!/disconnected|PeerConnection is connected/i.test(String((e as Error)?.message))) throw e;
      await new Promise((r) => setTimeout(r, 1200));
      await this.ready();
      return this.api(op, { session: this.session, ticket: this.ticket, ...extra });
    }
  }

  // Send one of my tracks to Cloudflare (offer → answer). Video: some phones
  // can't send the H.264 settings agreed for them, or refuse limits set before
  // the connection is agreed ("Failed to set remote answer… send parameters"),
  // so prefer VP8, set the limits afterwards, and if a phone still says no,
  // try once more letting the browser choose.
  private async push(kind: "mic" | "cam" | "scr", stream: MediaStream, pass?: Pass): Promise<Sent> {
    try { return await this.pushOnce(kind, stream, pass, true); }
    catch (e) {
      if (kind === "mic" || (e as any)?.denied) { stream.getTracks().forEach((t) => t.stop()); throw e; }
      try { return await this.pushOnce(kind, stream, pass, false); }
      catch (e2) { stream.getTracks().forEach((t) => t.stop()); throw e2; }
    }
  }
  private async pushOnce(kind: "mic" | "cam" | "scr", stream: MediaStream, pass: Pass | undefined, preferVp8: boolean): Promise<Sent> {
    const pc = await this.open();
    const track = kind === "mic" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    const tx = pc.addTransceiver(track, { direction: "sendonly" });
    if (kind !== "mic" && preferVp8) preferCodec(tx, "video/VP8");
    await this.ready().catch((e) => { try { tx.stop(); } catch { /* */ } throw e; });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    try {
      const r = await this.cf("push", { sdp: offer.sdp, mid: tx.mid, kind, ...(pass ?? {}) })
        .catch((e) => { throw Object.assign(e, { denied: true }); }); // the server said no: don't retry
      await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
      if (kind !== "mic") await limit(tx.sender, kind === "cam" ? CAMERA_SEND : SCREEN_SEND);
      return { stream, tx, track: r.track };
    } catch (e) {
      try { tx.stop(); } catch { /* already stopped */ }
      await pc.setLocalDescription({ type: "rollback" }).catch(() => {}); // back to before this offer
      throw e;
    }
  }

  // Send my microphone. `pass` is a learner's speaking pass.
  speak(pass?: Pass): Promise<{ s: string; t: string }> {
    return this.run(async () => {
      if (!this.mic) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        this.mic = await this.push("mic", stream, pass);
      }
      return { s: this.session, t: this.mic.track };
    });
  }

  // Send my camera (only while speaking).
  camera(pass?: Pass): Promise<{ v: string }> {
    return this.run(async () => {
      if (!this.cam) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA });
        this.cam = await this.push("cam", stream, pass);
        this.onChange();
      }
      return { v: this.cam.track };
    });
  }
  get cameraStream() { return this.cam?.stream ?? null; }

  // Share my screen (the teacher). The browser asks which screen or window.
  share(): Promise<{ sc: string }> {
    return this.run(async () => {
      if (!this.scr) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 8, max: 10 } }, audio: false });
        this.scr = await this.push("scr", stream);
        stream.getVideoTracks()[0]?.addEventListener("ended", () => { this.stopShare().then(() => this.onShareEnded()).catch(() => {}); });
        this.onChange();
      }
      return { sc: this.scr.track };
    });
  }
  stopShare(): Promise<void> { return this.run(() => this.unsend("scr")); }
  get screenStream() { return this.scr?.stream ?? null; }

  mute(on: boolean) { this.mic?.stream.getAudioTracks().forEach((t) => { t.enabled = !on; }); }
  get muted() { return !!this.mic && !this.mic.stream.getAudioTracks()[0]?.enabled; }
  get speaking() { return !!this.mic; }

  private async unsend(which: "mic" | "cam" | "scr") {
    const m = this[which];
    if (!m) return;
    this[which] = null;
    m.stream.getTracks().forEach((t) => t.stop());
    await this.closeMids([m.tx.mid ?? ""].filter(Boolean), [m.tx]);
    this.onChange();
  }
  stopCamera(): Promise<void> { return this.run(() => this.unsend("cam")); }
  // Stop talking: the camera goes off with the microphone.
  stopSpeaking(): Promise<void> { return this.run(async () => { await this.unsend("scr"); await this.unsend("cam"); await this.unsend("mic"); }); }

  // Receive exactly these speakers' microphones, and their cameras (and shared
  // screens) when `video` is on — or only the video tracks named in `video`, to
  // save data in a big call. My own tracks are never played back.
  listen(speakers: Speaker[], video: boolean | Set<string> = false): Promise<void> {
    return this.run(async () => {
      const want = new Map<string, { s: string; kind: "audio" | "video" }>();
      const wantVideo = (t: string | undefined) => !!t && (video === true || (video instanceof Set && video.has(t)));
      for (const sp of speakers) {
        if (sp.s === this.session) continue;
        want.set(sp.t, { s: sp.s, kind: "audio" });
        if (wantVideo(sp.v)) want.set(sp.v!, { s: sp.s, kind: "video" });
        if (wantVideo(sp.sc)) want.set(sp.sc!, { s: sp.s, kind: "video" });
      }
      const gone = [...this.pulled.entries()].filter(([t]) => !want.has(t));
      if (gone.length) {
        for (const [, p] of gone) { p.audio?.pause(); if (p.audio) p.audio.srcObject = null; }
        gone.forEach(([t]) => this.pulled.delete(t));
        const txs = this.pc?.getTransceivers().filter((x) => gone.some(([, p]) => p.mid === x.mid)) ?? [];
        await this.closeMids(gone.map(([, p]) => p.mid), txs);
        this.onChange();
      }
      const add = [...want.entries()].filter(([t]) => !this.pulled.has(t));
      if (!add.length) return;
      const pc = await this.open();
      const r = await this.cf("pull", { tracks: add.map(([t, w]) => ({ s: w.s, t })) });
      if (r.sdp) {
        await pc.setRemoteDescription({ type: "offer", sdp: r.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.api("answer", { session: this.session, ticket: this.ticket, sdp: answer.sdp }); // part of the same exchange: no waiting
      }
      for (const t of r.tracks ?? []) {
        if (!t.mid) continue;
        const tx = pc.getTransceivers().find((x) => x.mid === t.mid);
        const kind = want.get(t.t)?.kind;
        if (!tx || !kind) continue;
        const stream = new MediaStream([tx.receiver.track]);
        if (kind === "audio") {
          const audio = new Audio();
          audio.autoplay = true;
          audio.srcObject = stream;
          audio.play().catch(() => {});
          this.pulled.set(t.t, { mid: t.mid, kind, audio, rx: tx.receiver });
        } else {
          this.pulled.set(t.t, { mid: t.mid, kind, stream });
        }
      }
      this.onChange();
    });
  }

  // The video received for a camera track, if it's being received.
  videoFor(track: string | undefined) { return track ? this.pulled.get(track)?.stream ?? null : null; }

  // Phones only play sound after a tap: call this from the tap.
  resume() { for (const p of this.pulled.values()) p.audio?.play().catch(() => {}); }
  get listening() { return [...this.pulled.values()].filter((p) => p.kind === "audio").length; }
  // How loud someone is right now (0–1), from their microphone track: who's talking.
  level(track: string | undefined): number {
    const rx = track ? this.pulled.get(track)?.rx : undefined;
    try { return rx?.getSynchronizationSources?.()[0]?.audioLevel ?? 0; } catch { return 0; }
  }

  private async closeMids(mids: string[], txs: RTCRtpTransceiver[]) {
    const pc = this.pc;
    if (!pc || !mids.length || pc.connectionState === "closed") return;
    txs.forEach((t) => { try { t.stop(); } catch { /* already stopped */ } });
    try {
      await this.ready();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await this.cf("close", { sdp: offer.sdp, mids });
      if (r.sdp) await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
    } catch {
      // Don't leave the connection waiting for an answer: the next change starts clean.
      if (pc.signalingState === "have-local-offer") await pc.setLocalDescription({ type: "rollback" }).catch(() => {});
    }
  }

  close() {
    for (const m of [this.mic, this.cam, this.scr]) m?.stream.getTracks().forEach((t) => t.stop());
    this.mic = null; this.cam = null; this.scr = null;
    for (const p of this.pulled.values()) { p.audio?.pause(); if (p.audio) p.audio.srcObject = null; }
    this.pulled.clear();
    if (this.dropTimer) { clearTimeout(this.dropTimer); this.dropTimer = null; }
    const pc = this.pc;
    this.pc = null; this.session = ""; this.ticket = "";
    pc?.close();
    this.onChange();
  }
}

// Put one video codec first (where the browser lets us choose).
function preferCodec(tx: RTCRtpTransceiver, mime: string) {
  try {
    const caps = (RTCRtpSender as any).getCapabilities?.("video")?.codecs as RTCRtpCodec[] | undefined;
    if (!caps?.length || !tx.setCodecPreferences) return;
    const first = caps.filter((c) => c.mimeType.toLowerCase() === mime.toLowerCase());
    if (first.length) tx.setCodecPreferences([...first, ...caps.filter((c) => !first.includes(c))]);
  } catch { /* the browser's own order */ }
}
// Keep video light once it's flowing (bitrate and frame rate).
async function limit(sender: RTCRtpSender, cap: RTCRtpEncodingParameters) {
  try {
    const p = sender.getParameters();
    if (!p.encodings?.length) p.encodings = [{}];
    p.encodings[0].maxBitrate = cap.maxBitrate;
    if (cap.maxFramerate) p.encodings[0].maxFramerate = cap.maxFramerate;
    await sender.setParameters(p);
  } catch { /* fine without the limit */ }
}

// A sentence a person can act on, instead of the browser's WebRTC wording.
export function friendlyMediaError(e: unknown, what: "microphone" | "camera" | "screen"): string {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  if (/NotAllowed|Permission|denied/i.test(m)) return `Allow the ${what} in your browser's settings for this site, then try again.`;
  if (/NotFound|DevicesNotFound/i.test(m)) return `No ${what} was found on this device.`;
  if (/NotReadable|TrackStart|in use/i.test(m)) return `The ${what} is being used by another app — close it and try again.`;
  if (/SessionDescription|setRemoteDescription|setLocalDescription|sdp|m-section|RTCPeerConnection/i.test(m)) return `Your ${what} couldn't connect to the call from this device — try again, or switch browser (Chrome works best).`;
  return e instanceof Error && e.message.length < 120 ? e.message : `The ${what} couldn't start — try again.`;
}
