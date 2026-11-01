// BROWSER — one person's voice-and-camera connection for a class (see
// lib/voice.ts and app/api/live-sessions/voice). It can send this device's
// microphone and camera, and receive other people's. Every change to the
// connection goes through one queue, so offers and answers never cross.

// A speaker: their Cloudflare session `s`, microphone track `t`, and camera track `v` when it's on.
export type Speaker = { id: string; name: string; s: string; t: string; v?: string };
type Api = (op: string, extra?: Record<string, unknown>) => Promise<any>;
type Pass = { pass: string; exp: number };
type Sent = { stream: MediaStream; tx: RTCRtpTransceiver; track: string };
type Got = { mid: string; kind: "audio" | "video"; audio?: HTMLAudioElement; stream?: MediaStream };

// Small, light video: the board is the lesson; the face is a corner picture.
// About 250 kbit/s at most ≈ 110 MB an hour for each person watching.
const CAMERA: MediaTrackConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 15 }, facingMode: "user" };
const CAMERA_SEND: RTCRtpEncodingParameters = { maxBitrate: 250_000, maxFramerate: 15 };

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
  private pulled = new Map<string, Got>(); // by track name
  onState: (s: RTCPeerConnectionState) => void = () => {};
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
    pc.addEventListener("connectionstatechange", () => this.onState(pc.connectionState));
    this.pc = pc;
    return pc;
  }

  // Send one of my tracks to Cloudflare (offer → answer).
  private async push(kind: "mic" | "cam", stream: MediaStream, pass?: Pass): Promise<Sent> {
    const pc = await this.open();
    const track = kind === "mic" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    const tx = pc.addTransceiver(track, { direction: "sendonly", ...(kind === "cam" ? { sendEncodings: [CAMERA_SEND] } : {}) });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    try {
      const r = await this.api("push", { session: this.session, ticket: this.ticket, sdp: offer.sdp, mid: tx.mid, kind, ...(pass ?? {}) });
      await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
      return { stream, tx, track: r.track };
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      tx.stop();
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

  mute(on: boolean) { this.mic?.stream.getAudioTracks().forEach((t) => { t.enabled = !on; }); }
  get muted() { return !!this.mic && !this.mic.stream.getAudioTracks()[0]?.enabled; }
  get speaking() { return !!this.mic; }

  private async unsend(which: "mic" | "cam") {
    const m = this[which];
    if (!m) return;
    this[which] = null;
    m.stream.getTracks().forEach((t) => t.stop());
    await this.closeMids([m.tx.mid ?? ""].filter(Boolean), [m.tx]);
    this.onChange();
  }
  stopCamera(): Promise<void> { return this.run(() => this.unsend("cam")); }
  // Stop talking: the camera goes off with the microphone.
  stopSpeaking(): Promise<void> { return this.run(async () => { await this.unsend("cam"); await this.unsend("mic"); }); }

  // Receive exactly these speakers' microphones, and their cameras when `video`
  // is on (my own tracks are never played back).
  listen(speakers: Speaker[], video = false): Promise<void> {
    return this.run(async () => {
      const want = new Map<string, { s: string; kind: "audio" | "video" }>();
      for (const sp of speakers) {
        if (sp.s === this.session) continue;
        want.set(sp.t, { s: sp.s, kind: "audio" });
        if (video && sp.v) want.set(sp.v, { s: sp.s, kind: "video" });
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
      const r = await this.api("pull", { session: this.session, ticket: this.ticket, tracks: add.map(([t, w]) => ({ s: w.s, t })) });
      if (r.sdp) {
        await pc.setRemoteDescription({ type: "offer", sdp: r.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.api("answer", { session: this.session, ticket: this.ticket, sdp: answer.sdp });
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
          this.pulled.set(t.t, { mid: t.mid, kind, audio });
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

  private async closeMids(mids: string[], txs: RTCRtpTransceiver[]) {
    const pc = this.pc;
    if (!pc || !mids.length || pc.connectionState === "closed") return;
    txs.forEach((t) => { try { t.stop(); } catch { /* already stopped */ } });
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await this.api("close", { session: this.session, ticket: this.ticket, sdp: offer.sdp, mids });
      if (r.sdp) await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
    } catch { /* the next change starts clean */ }
  }

  close() {
    for (const m of [this.mic, this.cam]) m?.stream.getTracks().forEach((t) => t.stop());
    this.mic = null; this.cam = null;
    for (const p of this.pulled.values()) { p.audio?.pause(); if (p.audio) p.audio.srcObject = null; }
    this.pulled.clear();
    this.pc?.close();
    this.pc = null; this.session = ""; this.ticket = "";
    this.onChange();
  }
}
