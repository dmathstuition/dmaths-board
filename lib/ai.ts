import OpenAI from "openai";
import { NextResponse } from "next/server";

// Shared DeepSeek (OpenAI-compatible) client + helpers for the AI features.
// One place for the model/base-url config and friendly error mapping so every
// AI endpoint behaves the same. Server-side only.

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export function aiConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

// One completion. Throws on failure — callers wrap with aiErrorResponse.
export async function aiChat(opts: {
  system: string;
  user?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw Object.assign(new Error("not_configured"), { code: "not_configured" });

  const client = new OpenAI({ apiKey: key, baseURL: BASE_URL });
  const messages = [
    { role: "system" as const, content: opts.system },
    ...(opts.messages ?? []),
    ...(opts.user ? [{ role: "user" as const, content: opts.user }] : []),
  ];
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    messages: messages as any,
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

// Pull a JSON value out of a model reply, tolerating ```json fences and prose
// around it. Returns null if nothing parses.
export function extractJson<T = any>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const tryParse = (s: string): T | null => { try { return JSON.parse(s) as T; } catch { return null; } };
  const direct = tryParse(cleaned);
  if (direct !== null) return direct;
  // Fall back to the first {...} or [...] block.
  const match = cleaned.match(/[[{][\s\S]*[\]}]/);
  return match ? tryParse(match[0]) : null;
}

// Map an aiChat failure to a friendly API response.
export function aiErrorResponse(err: any): NextResponse {
  if (err?.code === "not_configured" || err instanceof OpenAI.AuthenticationError) {
    return NextResponse.json({ error: "The A.I isn't switched on yet — ask the admin to set DEEPSEEK_API_KEY." }, { status: 503 });
  }
  if (err instanceof OpenAI.RateLimitError) {
    return NextResponse.json({ error: "The A.I is busy right now — try again in a moment." }, { status: 429 });
  }
  console.error("ai error", err?.status, err?.message);
  return NextResponse.json({ error: "Sorry, the A.I couldn't respond just now. Please try again." }, { status: 502 });
}
