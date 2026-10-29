import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true, limit: async () => true, clientKey: (_r: unknown, s: string) => s }));

const aiChat = vi.fn();
let configured = true;
vi.mock("@/lib/ai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai")>("@/lib/ai");
  return { ...actual, aiChat: (...a: unknown[]) => aiChat(...a), aiConfigured: () => configured };
});

import { GET } from "@/app/api/games/ai-pack/route";

const get = (skill: string, d = "medium") => GET(new Request(`https://dmaths.test/api/games/ai-pack?skill=${skill}&d=${d}`));

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  aiChat.mockReset();
  configured = true;
});

describe("GET /api/games/ai-pack", () => {
  it("needs a signed-in user", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await get("idioms")).status).toBe(401);
  });

  it("returns nothing for maths skills (they never use the A.I)", async () => {
    const j = await (await get("multiplication")).json();
    expect(j).toEqual({ kind: null, items: [] });
    expect(aiChat).not.toHaveBeenCalled();
  });

  it("tops up a small pool: keeps only valid, new items and stores them", async () => {
    mockAdmin._qb._setDirectResolve({ data: [], error: null }); // empty pool in the table
    aiChat.mockResolvedValue(JSON.stringify({ items: [
      ["under the same roof", "living in the same house"],  // valid
      ["let the cat out of the bag", "reveal a secret"],    // duplicate of a built-in idiom
      ["bad", ""],                                         // invalid
      "not even an array",
    ] }));
    const j = await (await get("idioms", "medium")).json();
    expect(j.kind).toBe("idioms");
    expect(j.generated).toBe(1);
    expect(j.items).toEqual([["under the same roof", "living in the same house"]]);
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ kind: "idioms", difficulty: "medium", item_key: "under the same roof" })],
      { onConflict: "kind,difficulty,item_key", ignoreDuplicates: true },
    );
  });

  it("serves the stored pool without calling the A.I when it isn't configured", async () => {
    configured = false;
    mockAdmin._qb._setDirectResolve({ data: [{ item: { word: "zeppelin", clue: "A large airship" } }], error: null });
    const j = await (await get("scramble", "easy")).json();
    expect(j.kind).toBe("spelling");
    expect(j.items).toEqual([{ word: "zeppelin", clue: "A large airship" }]);
    expect(aiChat).not.toHaveBeenCalled();
  });

  it("still answers (with the built-in game untouched) if the A.I fails", async () => {
    mockAdmin._qb._setDirectResolve({ data: [], error: null });
    aiChat.mockRejectedValue(new Error("boom"));
    const res = await get("homophones", "hard");
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual([]);
  });

  it("works without the table, using a short-lived memory pool", async () => {
    mockAdmin._qb._setDirectResolve({ data: null, error: { message: 'relation "game_ai_items" does not exist' } });
    aiChat.mockResolvedValue(JSON.stringify({ items: [["serene", "calm and peaceful"]] }));
    const j = await (await get("vocabulary", "medium")).json();
    expect(j.items).toEqual([["serene", "calm and peaceful"]]);
    expect(mockAdmin._qb.upsert).not.toHaveBeenCalled();
  });
});
