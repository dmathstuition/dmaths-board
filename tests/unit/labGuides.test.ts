import { describe, it, expect } from "vitest";
import { LAB } from "@/lib/lab/catalog";
import { GUIDES, guideFor, guideScript, parseCommand, forSpeech } from "@/lib/lab/guides";

describe("voice tutor guides", () => {
  it("covers every experiment in the e-lab", () => {
    for (const e of LAB.filter((x) => x.status !== "soon")) {
      const g = guideFor(e.slug);
      expect(g, e.slug).not.toBeNull();
      expect(g!.steps.length, e.slug).toBeGreaterThanOrEqual(3);
      expect(g!.tips.length, e.slug).toBeGreaterThanOrEqual(1);
      expect(g!.aim && g!.conclusion, e.slug).toBeTruthy();
    }
    expect(Object.keys(GUIDES).every((slug) => LAB.some((e) => e.slug === slug))).toBe(true);
  });
  it("is written for speech — no markdown or stray symbols", () => {
    for (const [slug, g] of Object.entries(GUIDES)) {
      for (const t of [g.aim, g.conclusion, ...g.steps, ...g.tips]) expect(t, slug).not.toMatch(/[*#`$\\=<>]/);
    }
  });
  it("reads aim, numbered steps, tips, then the conclusion", () => {
    const s = guideScript(GUIDES.pendulum);
    expect(s[0]).toMatchObject({ kind: "aim" });
    expect(s[1]).toMatchObject({ kind: "step", n: 1, text: expect.stringMatching(/^Step 1\. /) });
    expect(s.at(-1)).toMatchObject({ kind: "conclusion" });
    expect(s.filter((l) => l.kind === "tip").length).toBe(GUIDES.pendulum.tips.length);
  });
});

describe("hands-free commands", () => {
  it("understands what learners say", () => {
    expect(parseCommand("Next")).toBe("next");
    expect(parseCommand("ok I'm done")).toBe("next");
    expect(parseCommand("can you repeat that")).toBe("repeat");
    expect(parseCommand("go back")).toBe("back");
    expect(parseCommand("pause")).toBe("pause");
    expect(parseCommand("what is the period")).toBeNull();
  });
  it("cleans A.I answers for speaking", () => {
    expect(forSpeech("**Great** question!\n- Time $10$ swings")).toBe("Great question!\nTime 10 swings");
  });
});
