// BROWSER — class sound that is as loud and clear as a Zoom call.
//
// Sending: the microphone goes through a voice chain before it's sent — cut
// the rumble below 80 Hz, even out loud and soft speech (compressor), lift it
// (gain), and a limiter on top so shouting never crackles. Quiet laptop and
// phone microphones come through strong.
//
// Hearing: a web page's own volume stops at 100%. The class sound is played
// through Web Audio instead, where it can be lifted past that (Normal 1×,
// Loud 2×, Extra loud 3×) with a limiter so it stays clean.

let ctx: AudioContext | null = null;
export function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state !== "closed") return ctx;
  const C = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!C) return null;
  try { ctx = new C({ latencyHint: "interactive" }); } catch { ctx = null; }
  return ctx;
}
// Phones only start sound after a tap: call this from one.
export function wakeAudio() { audioContext()?.resume().catch(() => {}); }

const limiter = (c: AudioContext) => {
  const l = c.createDynamicsCompressor();
  l.threshold.value = -3; l.knee.value = 0; l.ratio.value = 20; l.attack.value = 0.002; l.release.value = 0.1;
  return l;
};

// The microphone, made loud and even. `stream` is what's sent; `raw` is the
// microphone itself (mute it to mute). Without Web Audio, the raw microphone is sent.
export function boostMic(raw: MediaStream, lift = 2.4): { stream: MediaStream; stop: () => void } {
  const c = audioContext();
  if (!c || !raw.getAudioTracks().length) return { stream: raw, stop: () => raw.getTracks().forEach((t) => t.stop()) };
  c.resume().catch(() => {});
  try {
    const src = c.createMediaStreamSource(raw);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -30; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
    const gain = c.createGain(); gain.gain.value = lift;
    const lim = limiter(c);
    const dest = c.createMediaStreamDestination();
    src.connect(hp); hp.connect(comp); comp.connect(gain); gain.connect(lim); lim.connect(dest);
    return {
      stream: dest.stream,
      stop: () => { raw.getTracks().forEach((t) => t.stop()); dest.stream.getTracks().forEach((t) => t.stop()); try { src.disconnect(); lim.disconnect(); } catch { /* gone */ } },
    };
  } catch { return { stream: raw, stop: () => raw.getTracks().forEach((t) => t.stop()) }; }
}

export const VOLUMES = [{ v: 1, label: "Normal" }, { v: 2, label: "Loud" }, { v: 3, label: "Extra loud" }] as const;

// Play someone's sound, lifted to `volume`. Chrome only lets sound from a call
// into Web Audio while it's also attached to an <audio> element, so one is
// kept (muted) alongside. Without Web Audio, the <audio> element plays it.
export type Player = { setVolume: (v: number) => void; resume: () => void; stop: () => void };
export function playLoud(stream: MediaStream, volume: number): Player {
  const el = new Audio();
  el.autoplay = true;
  el.srcObject = stream;
  const c = audioContext();
  if (!c) { el.play().catch(() => {}); return { setVolume: () => {}, resume: () => { el.play().catch(() => {}); }, stop: () => { el.pause(); el.srcObject = null; } }; }
  el.muted = true;
  el.play().catch(() => {});
  try {
    const src = c.createMediaStreamSource(stream);
    const gain = c.createGain(); gain.gain.value = volume;
    const lim = limiter(c);
    src.connect(gain); gain.connect(lim); lim.connect(c.destination);
    c.resume().catch(() => {});
    return {
      setVolume: (v) => { gain.gain.setTargetAtTime(v, c.currentTime, 0.05); },
      resume: () => { c.resume().catch(() => {}); el.play().catch(() => {}); },
      stop: () => { try { src.disconnect(); gain.disconnect(); lim.disconnect(); } catch { /* gone */ } el.pause(); el.srcObject = null; },
    };
  } catch {
    el.muted = false;
    return { setVolume: () => {}, resume: () => { el.play().catch(() => {}); }, stop: () => { el.pause(); el.srcObject = null; } };
  }
}
