import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiConfigured, extractJson } from "@/lib/ai";
import { aiKindFor, buildPrompt, validateBatch } from "@/lib/games/aiBank";
import { itemKey, type BankKind } from "@/lib/games/englishBank";
import { DIFFICULTIES, type Difficulty } from "@/lib/games/generators";

// GET /api/games/ai-pack?skill=idioms&d=hard
// Returns a random handful of A.I-written bank items for a word/grammar game,
// to be mixed in with the built-in questions. The shared pool grows over
// time: when it's below target, this call asks the A.I for a fresh batch,
// validates every item and stores the good ones (game_ai_items). Learners
// never wait on it — the game starts with the built-in questions and blends
// these in once they arrive.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POOL_TARGET = 400;     // stop topping up a bank/level once it has this many A.I items
const PACK_SIZE = 40;        // items returned per game
const BATCH = 15;            // items requested from the A.I per top-up
const TOPUP_GAP_MS = 90_000; // at most one top-up per bank/level per server instance in this window

// Fallback store when the table hasn't been created yet (per server instance).
const memory = new Map<string, unknown[]>();
const lastTopUp = new Map<string, number>();

function sample<T>(xs: T[], n: number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

async function readPool(kind: BankKind, d: Difficulty): Promise<{ items: unknown[]; db: boolean }> {
  const { data, error } = await supabaseAdmin().from("game_ai_items")
    .select("item").eq("kind", kind).eq("difficulty", d).eq("hidden", false)
    .order("created_at", { ascending: false }).limit(POOL_TARGET);
  if (error) return { items: memory.get(`${kind}:${d}`) ?? [], db: false };
  return { items: (data ?? []).map((r: { item: unknown }) => r.item), db: true };
}

async function topUp(kind: BankKind, d: Difficulty, pool: unknown[], db: boolean): Promise<unknown[]> {
  const avoid = pool.map((x) => itemKey(kind, x));
  const text = await aiChat({ system: buildPrompt(kind, d, BATCH, avoid), user: "Write the items now.", maxTokens: 2500 });
  const parsed = extractJson<{ items?: unknown[] }>(text);
  const raw = Array.isArray(parsed?.items) ? parsed!.items! : Array.isArray(parsed) ? (parsed as unknown[]) : [];
  const fresh = validateBatch(kind, d, raw, pool);
  if (!fresh.length) return [];
  if (db) {
    await supabaseAdmin().from("game_ai_items").upsert(
      fresh.map((item) => ({ kind, difficulty: d, item_key: itemKey(kind, item), item })),
      { onConflict: "kind,difficulty,item_key", ignoreDuplicates: true },
    );
  } else {
    memory.set(`${kind}:${d}`, [...pool, ...fresh].slice(-150));
  }
  return fresh;
}

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const url = new URL(req.url);
  const skill = url.searchParams.get("skill") ?? "";
  const d = (DIFFICULTIES as string[]).includes(url.searchParams.get("d") ?? "") ? (url.searchParams.get("d") as Difficulty) : "medium";
  const kind = aiKindFor(skill);
  if (!kind) return NextResponse.json({ kind: null, items: [] });
  if (!rateLimit(`ai-pack:${user.id}`, 12, 60_000)) return NextResponse.json({ kind, items: [] });

  let { items, db } = await readPool(kind, d);

  const key = `${kind}:${d}`;
  const due = Date.now() - (lastTopUp.get(key) ?? 0) > TOPUP_GAP_MS;
  let generated = 0;
  if (aiConfigured() && items.length < (db ? POOL_TARGET : 150) && due) {
    lastTopUp.set(key, Date.now());
    try {
      const fresh = await topUp(kind, d, items, db);
      generated = fresh.length;
      items = [...items, ...fresh];
    } catch (err: any) {
      console.error("ai-pack top-up failed", kind, d, err?.message);
    }
  }

  return NextResponse.json({ kind, items: sample(items, PACK_SIZE), pool: items.length, generated });
}
