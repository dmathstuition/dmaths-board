import { describe, expect, it } from "vitest";
import { cleanRound, hasAnswered, shareOut, taskFor } from "@/lib/answerBoards";

const PIC = "https://abc.supabase.co/storage/v1/object/public/materials/slides/s1/123-01.jpg";

describe("class work for each learner", () => {
  it("shares questions out in turn, round again when there are more learners", () => {
    const out = shareOut(["Q1", " ", "Q2"], ["a", "b", "c"]);
    expect(out).toEqual({ a: { q: "Q1", img: null }, b: { q: "Q2", img: null }, c: { q: "Q1", img: null } });
    expect(shareOut([], ["a"])).toEqual({});
  });

  it("gives a learner their own task, or the question for everyone", () => {
    const OWN = PIC.replace("01.jpg", "02.jpg");
    const r = { q: "All", img: PIC, per: { a: { q: "Mine", img: null }, c: { q: "", img: OWN } } };
    expect(taskFor(r, "a")).toEqual({ q: "Mine", img: PIC }); // their question on the picture for everyone
    expect(taskFor(r, "c")).toEqual({ q: "All", img: OWN });
    expect(taskFor(r, "b")).toEqual({ q: "All", img: PIC });
  });

  it("keeps only board pictures and drops empty tasks", () => {
    const r = cleanRound({
      id: "r1", q: "Q", open: true, img: "https://evil.example/x.jpg",
      per: { a: { q: "x".repeat(400), img: PIC }, b: { q: " ", img: null }, c: { q: "", img: PIC } },
      show: { strokes: [], text: "", img: PIC, bg: "javascript:alert(1)", name: null },
    })!;
    expect(r.img).toBeNull();
    expect(r.per.a.q).toHaveLength(300);
    expect(r.per.a.img).toBe(PIC);
    expect(r.per.b).toBeUndefined();
    expect(r.per.c).toEqual({ q: "", img: PIC });
    expect(r.show?.img).toBe(PIC);
    expect(r.show?.bg).toBeNull();
  });

  it("older rounds without pictures or tasks still work", () => {
    const r = cleanRound({ id: "r1", q: "Q", open: true })!;
    expect(r.img).toBeNull();
    expect(r.per).toEqual({});
  });

  it("a photo counts as an answer", () => {
    expect(hasAnswered({ strokes: [], text: "", img: PIC })).toBe(true);
    expect(hasAnswered({ strokes: [], text: "" })).toBe(false);
  });
});
