// Browser side of signed teacher messages (see lib/liveSign.ts). A teacher's
// message carries `_ts` and `_sig`; boards accept a "teacher" message only if
// the signature checks out with the class's public key.

// Messages only the teacher sends, plus anything marked `host: true`.
export const HOST_EVENTS = new Set([
  "board-clear", "board-paper", "board-page", "board-delpage", "board-sync", "board-page-data",
  "board-digest", "board-view", "board-widgets", "ab-round", "poll-round", "pulse-reset", "grp-plan", "voice", "exam", "lb-show",
]);
export const needsSignature = (event: string, payload: any) => HOST_EVENTS.has(event) || payload?.host === true;

const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIG = { name: "ECDSA", hash: "SHA-256" } as const;
const enc = new TextEncoder();
const b64u = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

// What gets signed: the class, the event, the time and the message itself.
export const signedText = (sessionId: string, event: string, ts: number, body: unknown) => `${sessionId}|${event}|${ts}|${JSON.stringify(body)}`;
const strip = (p: any) => { const { _ts, _sig, ...rest } = p ?? {}; return rest; };

export const cryptoReady = () => typeof crypto !== "undefined" && !!crypto.subtle;

export async function importKeys(k: { pub?: JsonWebKey; priv?: JsonWebKey }) {
  const [verify, sign] = await Promise.all([
    k.pub ? crypto.subtle.importKey("jwk", k.pub, ALG, false, ["verify"]) : null,
    k.priv ? crypto.subtle.importKey("jwk", k.priv, ALG, false, ["sign"]) : null,
  ]);
  return { verify, sign };
}

export async function signPayload(key: CryptoKey, sessionId: string, event: string, payload: unknown) {
  const body = JSON.parse(JSON.stringify(payload ?? {})); // exactly what will travel
  const ts = Date.now();
  const sig = await crypto.subtle.sign(SIG, key, enc.encode(signedText(sessionId, event, ts, body)));
  return { ...body, _ts: ts, _sig: b64u(sig) };
}

export async function verifyPayload(key: CryptoKey, sessionId: string, event: string, payload: any): Promise<boolean> {
  if (typeof payload?._sig !== "string" || !Number.isFinite(payload?._ts)) return false;
  try {
    return await crypto.subtle.verify(SIG, key, unb64u(payload._sig), enc.encode(signedText(sessionId, event, payload._ts, strip(payload))));
  } catch { return false; }
}
