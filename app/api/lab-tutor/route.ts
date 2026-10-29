import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse } from "@/lib/ai";
import { findExperiment } from "@/lib/lab/catalog";
import { forSpeech, guideFor } from "@/lib/lab/guides";

// "Ask the tutor" in the e-lab voice tutor. POST { slug, question, step? } →
// a short spoken-style answer grounded in that experiment's guide.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to ask the tutor." }, { status: 401 });
  if (!rateLimit(`lab-tutor:${user.id}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "You've asked a lot of questions — try the steps for a bit, then ask again." }, { status: 429 });
  }
  const b = await req.json().catch(() => null);
  const entry = findExperiment(String(b?.slug ?? ""));
  const guide = entry ? guideFor(entry.slug) : null;
  const question = String(b?.question ?? "").trim().slice(0, 400);
  if (!entry || !guide) return NextResponse.json({ error: "Open an experiment first." }, { status: 400 });
  if (question.length < 3) return NextResponse.json({ error: "Ask a question about the experiment." }, { status: 400 });
  const step = Number.isInteger(b?.step) && b.step >= 1 && b.step <= guide.steps.length ? b.step : null;

  const system = `You are a friendly, encouraging science and maths lab tutor speaking aloud to a secondary-school learner (${entry.level}) doing a virtual practical in the Novelia e-laboratory.
Experiment: ${entry.title}. ${entry.blurb}
Aim: ${guide.aim}
Steps (the learner uses these on-screen controls):
${guide.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}
Tips: ${guide.tips.join(" ")}
Conclusion: ${guide.conclusion}
${step ? `The learner is on step ${step}.` : ""}
Rules: answer in 2 to 4 short sentences that sound natural when read aloud. No markdown, bullet points, emojis or symbols — write units and formulas in words. Refer to the on-screen controls by their names when telling the learner what to do. Guide them to discover the answer rather than just giving final results. If the question is not about this experiment or school science/maths, gently steer back to the practical.`;
  try {
    const answer = await aiChat({ system, user: question, maxTokens: 260 });
    return NextResponse.json({ answer: forSpeech(answer) });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
