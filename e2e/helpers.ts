import crypto from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";

export const SID = "11111111-1111-1111-1111-111111111111";
export const GID = "99999999-9999-9999-9999-999999999999";

export type Net = "normal" | "drop" | "learner-dead" | "teacher-dead";
type Who = "teacher" | "learner";

// A tiny stand-in for Supabase Realtime: joins, heartbeats and broadcasts are
// relayed between the browsers of one test. `drop` loses 60% of what the
// learner sends; `*-dead` refuses that browser's live connection outright.
export function realtimeHub(net: Net = "normal") {
  const topics = new Map<string, Set<any>>();
  const stats = { relayed: 0, dropped: 0, events: new Map<string, number>() };
  const count = (ev: string) => stats.events.set(ev, (stats.events.get(ev) ?? 0) + 1);
  const attach = (ctx: BrowserContext, who: Who) =>
    ctx.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
      if ((net === "learner-dead" && who === "learner") || (net === "teacher-dead" && who === "teacher")) { ws.close({ code: 1011, reason: "blocked" }); return; }
      const lose = () => net === "drop" && who === "learner" && Math.random() < 0.6;
      ws.onMessage((raw) => {
        if (typeof raw !== "string") {
          // realtime-js v2 sends a broadcast as a binary frame (kind 3); pass it on as kind 4.
          const buf = Buffer.from(raw);
          if (buf[0] !== 3) return;
          const [jl, rl, tl, el, ml, enc] = [buf[1], buf[2], buf[3], buf[4], buf[5], buf[6]];
          let o = 7 + jl + rl;
          const topic = buf.subarray(o, o + tl).toString(); o += tl;
          const ev = buf.subarray(o, o + el); o += el;
          const meta = buf.subarray(o, o + ml); o += ml;
          if (lose()) { stats.dropped++; return; }
          stats.relayed++; count(ev.toString());
          const out = Buffer.concat([Buffer.from([4, tl, el, ml, enc]), Buffer.from(topic), ev, meta, buf.subarray(o)]);
          for (const other of topics.get(topic) ?? []) if (other !== ws || selfTopics.has(topic)) other.send(out);
          return;
        }
        let m: any; try { m = JSON.parse(String(raw)); } catch { return; }
        const [joinRef, ref, topic, event, payload] = Array.isArray(m) ? m : [m.join_ref, m.ref, m.topic, m.event, m.payload];
        const send = (arr: unknown[]) => ws.send(JSON.stringify(arr));
        if (event === "phx_join") {
          if (!topics.has(topic)) topics.set(topic, new Set());
          topics.get(topic)!.add(ws);
          if (payload?.config?.broadcast?.self) selfTopics.add(topic);
          send([joinRef, ref, topic, "phx_reply", { status: "ok", response: { postgres_changes: [] } }]);
        } else if (event === "heartbeat") send([null, ref, "phoenix", "phx_reply", { status: "ok", response: {} }]);
        else if (event === "phx_leave") { topics.get(topic)?.delete(ws); send([joinRef, ref, topic, "phx_reply", { status: "ok", response: {} }]); }
        else if (event === "broadcast") {
          if (lose()) { stats.dropped++; return; }
          stats.relayed++; count(String(payload?.event ?? ""));
          for (const other of topics.get(topic) ?? []) if (other !== ws || selfTopics.has(topic)) other.send(JSON.stringify([null, null, topic, "broadcast", payload]));
        }
      });
    });
  const selfTopics = new Set<string>();
  return { attach, stats };
}

// The teacher's signing keys, derived the way lib/liveSign.ts does.
export function signingKeys() {
  const d = crypto.createHmac("sha256", "e2e").update(`live-sign:${SID}:0`).digest();
  const e = crypto.createECDH("prime256v1"); e.setPrivateKey(d);
  const raw = e.getPublicKey();
  const b = (x: Buffer) => x.toString("base64url");
  const pub = { kty: "EC", crv: "P-256", x: b(raw.subarray(1, 33)), y: b(raw.subarray(33, 65)), ext: true };
  return { pub, priv: { ...pub, d: b(d) } };
}

// One class's server: the room, the saved board and the backup inbox.
export function classServer() {
  let savedBoard: unknown = null;
  const inbox: { item_id: string; kind: string; sender: string; page: number; item: any; at: string }[] = [];
  const stats = { backupPosts: 0, saves: 0 };
  let handAt: string | null = null;
  const room = (host: boolean) => ({
    session: { id: SID, code: "482913", title: "Division", status: "live", allCanWrite: false, classId: null, subject: null, hostName: "Mr B", link: "/join?pin=482913", kind: "board", createdAt: new Date().toISOString() },
    me: host ? { id: "h", name: "Mr B", host: true, canWrite: true } : { id: GID, name: "Emmanuel", canWrite: true, handUp: !!handAt },
    writers: [GID],
    people: host ? [{ id: GID, name: "Emmanuel", canWrite: true, online: true, joinedAt: "", handAt }] : [],
    here: 1,
  });
  async function attach(ctx: BrowserContext, who: Who) {
    const host = who === "teacher";
    await ctx.route("**/api/live-sessions?**", (r) => r.fulfill({ json: { ...room(host), ...(r.request().url().includes("board=1") ? { board: savedBoard } : {}) } }));
    await ctx.route("**/api/live-sessions", (r) => {
      if (r.request().method() === "PUT") { savedBoard = JSON.parse(r.request().postData() ?? "{}").board; stats.saves++; }
      if (r.request().method() === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}");
        if (b.action === "hand") handAt = b.up ? new Date().toISOString() : null;
        if (b.action === "lowerHand" || b.action === "lowerAll") handAt = null;
      }
      return r.fulfill({ json: { ok: true } });
    });
    await ctx.route("**/api/live-sessions/inbox**", (r) => {
      if (r.request().method() === "POST") {
        const b = JSON.parse(r.request().postData() ?? "{}"); stats.backupPosts++;
        const row = { item_id: b.item.id, kind: b.kind, sender: GID, page: b.page, item: b.item, at: new Date(Date.now() + inbox.length).toISOString() };
        const i = inbox.findIndex((x) => x.item_id === row.item_id && x.kind === row.kind);
        if (i >= 0) inbox[i] = row; else inbox.push(row);
        return r.fulfill({ json: { ok: true } });
      }
      const since = new URL(r.request().url()).searchParams.get("since") ?? "";
      return r.fulfill({ json: { items: inbox.filter((x) => !since || x.at > since).sort((a, b) => a.at.localeCompare(b.at)) } });
    });
    await ctx.route("**/api/live-sessions/keys**", (r) => r.fulfill({ json: host ? signingKeys() : { pub: signingKeys().pub } }));
    await ctx.route("**/api/live-sessions/diag", (r) => r.fulfill({ json: { ok: true } }));
    for (const pat of ["**/api/live-quiz**", "**/api/quiz-sets**", "**/api/board-lessons**"]) await ctx.route(pat, (r) => r.fulfill({ json: {} }));
  }
  return { attach, stats, saved: () => savedBoard as { pages?: { kind?: string; pts: number[] }[][] } | null };
}

export async function agree(p: Page) {
  const a = p.getByRole("button", { name: /I agree/i });
  if (await a.count()) await a.first().click().catch(() => {});
}

// How many drawn (non-white) pixels the main board canvas holds.
export const ink = (p: Page) => p.evaluate(() => {
  let best: HTMLCanvasElement | null = null;
  for (const c of document.querySelectorAll("canvas")) if (!best || c.width * c.height > best.width * best.height) best = c;
  if (!best) return 0;
  const d = best.getContext("2d")!.getImageData(0, 0, best.width, best.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && !(d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245)) n++;
  return n;
});

// Draw `strokes` wavy lines on the main board canvas.
export async function scribble(p: Page, strokes = 3, y = 120) {
  const canvas = await p.evaluateHandle(() => {
    let best: HTMLCanvasElement | null = null;
    for (const c of document.querySelectorAll("canvas")) if (!best || c.width * c.height > best.width * best.height) best = c;
    return best!;
  });
  await canvas.asElement()!.scrollIntoViewIfNeeded();
  const bb = (await canvas.asElement()!.boundingBox())!;
  for (let s = 0; s < strokes; s++) {
    const x0 = bb.x + 100 + s * 70;
    await p.mouse.move(x0, bb.y + y);
    await p.mouse.down();
    for (let i = 1; i <= 25; i++) await p.mouse.move(x0 + i * 5, bb.y + y + Math.sin(i / 3) * 30 + i * 3);
    await p.mouse.up();
    await p.waitForTimeout(120);
  }
}

// Wait until `check` returns true, polling; returns the seconds taken (or -1).
export async function within(seconds: number, check: () => Promise<boolean>) {
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    if (await check()) return (Date.now() - t0) / 1000;
    await new Promise((r) => setTimeout(r, 250));
  }
  return -1;
}
