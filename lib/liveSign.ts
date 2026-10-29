// SERVER ONLY — signing keys for a live class's realtime channel.
//
// Everyone in a class shares one broadcast channel, so any phone could send a
// message that claims to be from the teacher (clear the board, change page…).
// Each class gets its own P-256 key pair, derived here from a server secret
// (nothing to store): only the host is given the private half and signs their
// messages; every board checks them with the public half (lib/liveSignClient).
import crypto from "crypto";

const secret = () => process.env.LIVE_SIGN_SECRET || process.env.BOARD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dmaths-live";
const b64u = (b: Buffer) => b.toString("base64url");

export type SessionKeys = { pub: JsonWebKey; priv: JsonWebKey };

export function sessionKeys(sessionId: string): SessionKeys {
  for (let i = 0; i < 16; i++) {
    const d = crypto.createHmac("sha256", secret()).update(`live-sign:${sessionId}:${i}`).digest();
    try {
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(d); // throws in the (vanishingly rare) case d isn't a valid key
      const raw = ecdh.getPublicKey(); // 0x04 ‖ X ‖ Y
      const pub: JsonWebKey = { kty: "EC", crv: "P-256", x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)), ext: true };
      return { pub, priv: { ...pub, d: b64u(d) } };
    } catch { /* try the next one */ }
  }
  throw new Error("Couldn't make a signing key");
}
