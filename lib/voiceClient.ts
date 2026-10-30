// BROWSER — one person's voice connection for a class (see lib/voice.ts and
// app/api/live-sessions/voice). It can send this device's microphone and play
// other people's microphones. Every change to the connection goes through one
// queue, so offers and answers never cross.

export type Speaker = { id: string; name: string; s: string; t: string };
type Api = (op: string, extra?: Record<string, unknown>) => Promise<any>;

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
  private mic: { stream: MediaStream; tx: RTCRtpTransceiver; track: string } | null = null;
  private pulled = new Map<string, { mid: string; audio: HTMLAudioElement }>(); // by track name
  onState: (s: RTCPeerConnectionState) => void = () => {};

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

  // Send my microphone. `pass`/`exp` is a learner's speaking pass.
  speak(pass?: { pass: string; exp: number }): Promise<{ s: string; t: string }> {
    return this.run(async () => {
      const pc = await this.open();
      if (this.mic) return { s: this.session, t: this.mic.track };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const tx = pc.addTransceiver(stream.getAudioTracks()[0], { direction: "sendonly" });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      try {
        const r = await this.api("push", { session: this.session, ticket: this.ticket, sdp: offer.sdp, mid: tx.mid, ...(pass ?? {}) });
        await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
        this.mic = { stream, tx, track: r.track };
        return { s: this.session, t: r.track };
      } catch (e) {
        stream.getTracks().forEach((t) => t.stop());
        tx.stop();
        await pc.setLocalDescription({ type: "rollback" }).catch(() => {}); // back to before this offer
        throw e;
      }
    });
  }

  mute(on: boolean) { this.mic?.stream.getAudioTracks().forEach((t) => { t.enabled = !on; }); }
  get muted() { return !!this.mic && !this.mic.stream.getAudioTracks()[0]?.enabled; }
  get speaking() { return !!this.mic; }

  stopSpeaking(): Promise<void> {
    return this.run(async () => {
      const m = this.mic;
      if (!m) return;
      this.mic = null;
      m.stream.getTracks().forEach((t) => t.stop());
      await this.closeMids([m.tx.mid ?? ""].filter(Boolean), [m.tx]);
    });
  }

  // Listen to exactly these speakers (my own microphone is never played back).
  listen(speakers: Speaker[]): Promise<void> {
    return this.run(async () => {
      const want = new Map(speakers.filter((s) => s.s !== this.session).map((s) => [s.t, s]));
      const gone = [...this.pulled.entries()].filter(([t]) => !want.has(t));
      if (gone.length) {
        for (const [, p] of gone) { p.audio.pause(); p.audio.srcObject = null; }
        gone.forEach(([t]) => this.pulled.delete(t));
        const txs = this.pc?.getTransceivers().filter((x) => gone.some(([, p]) => p.mid === x.mid)) ?? [];
        await this.closeMids(gone.map(([, p]) => p.mid), txs);
      }
      const add = [...want.values()].filter((s) => !this.pulled.has(s.t));
      if (!add.length) return;
      const pc = await this.open();
      const r = await this.api("pull", { session: this.session, ticket: this.ticket, tracks: add.map((s) => ({ s: s.s, t: s.t })) });
      if (r.sdp) {
        await pc.setRemoteDescription({ type: "offer", sdp: r.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.api("answer", { session: this.session, ticket: this.ticket, sdp: answer.sdp });
      }
      for (const t of r.tracks ?? []) {
        if (!t.mid) continue;
        const tx = pc.getTransceivers().find((x) => x.mid === t.mid);
        if (!tx) continue;
        const audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = new MediaStream([tx.receiver.track]);
        audio.play().catch(() => {});
        this.pulled.set(t.t, { mid: t.mid, audio });
      }
    });
  }

  // Phones only play sound after a tap: call this from the tap.
  resume() { for (const p of this.pulled.values()) p.audio.play().catch(() => {}); }
  get listening() { return this.pulled.size; }

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
    this.mic?.stream.getTracks().forEach((t) => t.stop());
    this.mic = null;
    for (const p of this.pulled.values()) { p.audio.pause(); p.audio.srcObject = null; }
    this.pulled.clear();
    this.pc?.close();
    this.pc = null; this.session = ""; this.ticket = "";
  }
}
