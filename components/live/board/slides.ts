// Turns what a tutor uploads into one picture per slide, in the browser:
// a PDF (PowerPoint → File → Save As → PDF) page by page with pdf.js, or
// picture files as they are. Pictures are scaled to the board's size and
// saved as JPEG so they load quickly for learners on mobile data.
//
// The pdf.js worker is served from /pdf.worker.min.mjs — copy it from
// node_modules/pdfjs-dist/legacy/build/ whenever pdfjs-dist is upgraded.
//
// Made to cope with phones and patchy connections:
//   • the PDF reader is fetched early (warmSlides) and retried, so the first
//     upload doesn't fail just because it was still downloading;
//   • one drawing canvas is reused and freed, so long PDFs don't run a phone
//     out of memory part-way;
//   • each slide uploads as soon as it's ready, with a time limit, retries and
//     real progress — and one slide failing doesn't lose the others.
import { BOARD_H, BOARD_MAX_PAGES, BOARD_W } from "@/lib/whiteboard";
import { supabaseBrowser } from "@/lib/supabase/client";

export const MAX_SLIDES = BOARD_MAX_PAGES;
export const SLIDE_ACCEPT = ".pdf,application/pdf,image/*,.heic,.heif";
export const PICTURE_ACCEPT = "image/*,.heic,.heif";
export function isPowerPoint(f: File) { return /\.(pptx?|key|odp)$/i.test(f.name); }
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isPicture = (f: File) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(f.name);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetries<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; if ((e as { stop?: boolean })?.stop) break; if (i < tries - 1) await wait(800 * 2 ** i); }
  }
  throw last;
}

// ── The PDF reader ──
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export const loadPdfReader = () => pdfjs();
let pdfjsP: Promise<PdfJs> | null = null;
function pdfjs(): Promise<PdfJs> {
  pdfjsP ??= withRetries(async () => {
    const m = await import("pdfjs-dist/legacy/build/pdf.mjs");
    m.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return m;
  }, 4).catch((e) => { pdfjsP = null; throw e; }); // a later try starts afresh
  return pdfjsP;
}
// Fetch the PDF reader ahead of time (when the board opens), so choosing a
// file doesn't wait on — or fail on — a big download.
let warmed = false;
export function warmSlides() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const go = () => { pdfjs().catch(() => {}); fetch("/pdf.worker.min.mjs", { cache: "force-cache" }).catch(() => { warmed = false; }); };
  const idle = (window as any).requestIdleCallback as ((f: () => void, o?: object) => void) | undefined;
  if (idle) idle(go, { timeout: 4000 }); else setTimeout(go, 1500);
}

async function openPdf(f: File) {
  const lib = await pdfjs();
  const data = new Uint8Array(await f.arrayBuffer());
  try {
    return await lib.getDocument({ data: data.slice() }).promise;
  } catch (e) {
    // The background reader can fail to start on a flaky connection — try once more.
    if (/worker|fetch|network|load/i.test(String((e as Error)?.message ?? e))) {
      await wait(800);
      return await lib.getDocument({ data }).promise;
    }
    throw e;
  }
}

// Read a picture file, whatever the phone gave us. createImageBitmap is fast
// but fails on some phones and formats, so fall back to an <img>, which also
// reads iPhone HEIC photos in Safari. Very large camera photos are decoded
// smaller where the browser can, so they don't run a phone out of memory.
type Pic = { w: number; h: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void };
export async function decodePicture(f: File): Promise<Pic> {
  try {
    const b = await createImageBitmap(f, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const big = Math.max(b.width / (BOARD_W * 1.5), b.height / (BOARD_H * 1.5));
    if (big > 2) {
      // Decode again at a sensible size (a 48-megapixel photo is ~190 MB in memory).
      const small = await createImageBitmap(f, { imageOrientation: "from-image", resizeWidth: Math.round(b.width / big), resizeHeight: Math.round(b.height / big), resizeQuality: "high" } as ImageBitmapOptions).catch(() => null);
      if (small) { b.close(); return { w: small.width, h: small.height, draw: (c, w, h) => c.drawImage(small, 0, 0, w, h), close: () => small.close() }; }
    }
    return { w: b.width, h: b.height, draw: (c, w, h) => c.drawImage(b, 0, 0, w, h), close: () => b.close() };
  } catch { /* try the other way */ }
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error("unreadable picture")); img.src = url; });
    if (!img.naturalWidth) throw new Error("unreadable picture");
    return { w: img.naturalWidth, h: img.naturalHeight, draw: (c, w, h) => c.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw Object.assign(new Error(/heic|heif/i.test(f.name + f.type)
      ? "This phone can't open HEIC photos here — take a screenshot of the photo, or set the camera to 'Most compatible', and upload that"
      : "That picture can't be opened — save it as JPG or PNG and try again"), { stop: true, cause: e });
  }
}

// One canvas, reused for every slide and emptied afterwards (phones limit the
// total canvas memory a page may hold).
let canvas: HTMLCanvasElement | null = null;
function board(w: number, h: number) {
  canvas ??= document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w)); canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { c: canvas, ctx };
}
function freeCanvas() { if (canvas) { canvas.width = 0; canvas.height = 0; } }
const toJpeg = (c: HTMLCanvasElement) => new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't read that slide"))), "image/jpeg", 0.82));

// Each source slide, ready to be drawn when its turn comes.
type Source = { render: () => Promise<Blob> };
async function sourcesFor(files: File[], room: number): Promise<{ list: Source[]; close: () => Promise<void> }> {
  const list: Source[] = [], docs: { destroy: () => Promise<void> }[] = [];
  for (const f of files) {
    if (list.length >= room) break;
    if (isPdf(f)) {
      const doc = await openPdf(f);
      docs.push(doc);
      const n = Math.min(doc.numPages, room - list.length);
      for (let i = 1; i <= n; i++) {
        list.push({
          render: async () => {
            const page = await doc.getPage(i);
            const base = page.getViewport({ scale: 1 });
            const vp = page.getViewport({ scale: Math.min(BOARD_W / base.width, BOARD_H / base.height) });
            const { c, ctx } = board(vp.width, vp.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            page.cleanup();
            return toJpeg(c);
          },
        });
      }
    } else if (isPicture(f)) {
      list.push({
        render: async () => {
          const img = await decodePicture(f);
          try {
            const k = Math.min(BOARD_W / img.w, BOARD_H / img.h, 1.5);
            const { c, ctx } = board(img.w * k, img.h * k);
            img.draw(ctx, c.width, c.height);
            return await toJpeg(c);
          } finally { img.close(); }
        },
      });
    }
  }
  return { list, close: async () => { freeCanvas(); await Promise.all(docs.map((d) => d.destroy().catch(() => {}))); } };
}

// ── Uploading ──
type Ticket = { path: string; token: string; url: string };
type Target = { sessionId?: string; lessonId?: string; answer?: boolean }; // answer: a learner's photo of their work

async function tickets(target: Target, count: number): Promise<Ticket[]> {
  return withRetries(async () => {
    const r = await fetch("/api/live-sessions/slides", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, count, type: "image/jpeg" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(j.uploads)) throw Object.assign(new Error(j.error ?? "Couldn't start the upload"), { stop: r.status >= 400 && r.status < 500 && r.status !== 429 });
    return j.uploads as Ticket[];
  });
}

// One picture to storage with a signed ticket: the same request the Supabase
// library makes, but with a time limit and upload progress.
export function putSigned(t: Ticket, blob: Blob, onProgress: (f: number) => void): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const path = t.path.split("/").map(encodeURIComponent).join("/");
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open("PUT", `${base}/storage/v1/object/upload/sign/materials/${path}?token=${encodeURIComponent(t.token)}`);
    x.setRequestHeader("apikey", key);
    x.setRequestHeader("Authorization", `Bearer ${key}`);
    x.setRequestHeader("x-upsert", "true");
    x.timeout = 90_000;
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return ok();
      if (/already exists|duplicate/i.test(x.responseText)) return ok();
      no(Object.assign(new Error(`upload failed (${x.status})`), { stop: x.status === 400 || x.status === 403 }));
    };
    x.onerror = () => no(new Error("network"));
    x.ontimeout = () => no(new Error("timed out"));
    const form = new FormData();
    form.append("cacheControl", "31536000");
    form.append("", blob, "slide.jpg");
    x.send(form);
  });
}
// If the direct request keeps failing, the Supabase library gets one go.
async function putWithLibrary(t: Ticket, blob: Blob) {
  const { error } = await supabaseBrowser().storage.from("materials").uploadToSignedUrl(t.path, t.token, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}
// The second road: through our own server, for networks where storage can't
// be reached directly (/api/live-sessions/slides/upload).
async function putViaServer(t: Ticket, blob: Blob) {
  const form = new FormData();
  form.append("path", t.path); form.append("token", t.token);
  form.append("file", blob, "slide.jpg");
  const r = await fetch("/api/live-sessions/slides/upload", { method: "POST", body: form, signal: AbortSignal.timeout(90_000) });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(j.error ?? `upload failed (${r.status})`), { stop: r.status === 400 || r.status === 413 || r.status === 415 });
  }
}
// Once direct uploads have failed in this visit, go through the server first.
let directFails = 0;
async function sendOne(t: Ticket, blob: Blob, onProgress: (f: number) => void) {
  const direct = async () => {
    try { await withRetries(() => putSigned(t, blob, onProgress), 2); }
    catch { await withRetries(() => putWithLibrary(t, blob), 1); }
  };
  const relay = () => withRetries(() => putViaServer(t, blob), 2);
  if (directFails >= 2) {
    try { await relay(); } catch { await direct(); }
  } else {
    try { await direct(); }
    catch { directFails++; await relay(); }
  }
  onProgress(1);
}

// Prepare and upload slides together: each slide starts uploading as soon as
// it's drawn. Returns each slide's address in order — null where one couldn't
// be sent (the rest still arrive).
export async function sendSlides(target: Target, files: File[], room: number, onStep: (msg: string) => void): Promise<(string | null)[]> {
  onStep("Opening your file…");
  const { list, close } = await sourcesFor(files, room);
  try {
    if (!list.length) return [];
    const total = list.length;
    onStep(total === 1 ? "Preparing…" : `Preparing ${total} slides…`);
    const ts = await tickets(target, total);
    const progress = new Array(total).fill(0);
    const urls: (string | null)[] = new Array(total).fill(null);
    let drawn = 0;
    const report = () => {
      const done = progress.filter((p) => p >= 1).length;
      const pct = Math.round((progress.reduce((a, b) => a + b, 0) / total) * 100);
      onStep(total === 1 ? `Uploading… ${pct}%` : `Slides: ${drawn} of ${total} ready · ${done} uploaded (${pct}%)`);
    };
    const uploads: Promise<void>[] = [];
    let running = 0;
    for (let i = 0; i < total; i++) {
      const blob = await list[i].render(); // one at a time: kind to phone memory
      drawn++; report();
      while (running >= 3) await wait(120); // a few uploads at once
      running++;
      uploads.push(sendOne(ts[i], blob, (f) => { progress[i] = Math.max(progress[i], f); report(); })
        .then(() => { urls[i] = ts[i].url; }, () => { urls[i] = null; })
        .finally(() => { running--; }));
    }
    await Promise.all(uploads);
    // Anything that still didn't arrive gets one more go by itself, with fresh
    // tickets, before the teacher is told — instead of "upload it again".
    const missed = urls.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
    if (missed.length) {
      onStep(`Retrying ${missed.length} slide${missed.length === 1 ? "" : "s"}…`);
      await wait(1500);
      const again = await tickets(target, missed.length).catch(() => null);
      if (again) {
        for (let k = 0; k < missed.length; k++) {
          const i = missed[k];
          const blob = await list[i].render();
          await sendOne(again[k], blob, () => {}).then(() => { urls[i] = again[k].url; }, () => {});
        }
      }
    }
    return urls;
  } finally { await close(); }
}

// One picture for the board ("Insert a picture"): the same road as slides.
// Returns its address and its height ÷ width.
export async function sendPicture(target: Target, file: File, onStep: (msg: string) => void): Promise<{ url: string; ratio: number }> {
  if (!isPicture(file)) throw Object.assign(new Error("Choose a picture (a photo, JPG or PNG)"), { stop: true });
  const pic = await decodePicture(file);
  const ratio = pic.h / pic.w; pic.close();
  onStep("Uploading the picture…");
  const [url] = await sendSlides(target, [file], 1, (m) => onStep(m.replace(/^Uploading…/, "Uploading the picture…").replace(/^Retrying 1 slide/, "Retrying")));
  if (!url) throw new Error("the upload didn't go through");
  return { url, ratio };
}
