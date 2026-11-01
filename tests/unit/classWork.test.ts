import { describe, expect, it } from "vitest";
import { canEdit, cleanImgs, cleanRound, hasAnswered, shareOut, taskFor, timeLeft, MAX_PHOTOS } from "@/lib/answerBoards";
import { classResults } from "@/lib/classResults";

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
    expect(r.show?.imgs).toEqual([PIC]); // an older board's single photo
    expect(r.show?.bg).toBeNull();
  });

  it("older rounds without pictures or tasks still work", () => {
    const r = cleanRound({ id: "r1", q: "Q", open: true })!;
    expect(r.img).toBeNull();
    expect(r.per).toEqual({});
  });

  it("a photo counts as an answer", () => {
    expect(hasAnswered({ strokes: [], text: "", imgs: [PIC] })).toBe(true);
    expect(hasAnswered({ strokes: [], text: "" })).toBe(false);
  });

  it("keeps up to three photos, all board pictures", () => {
    const pics = [1, 2, 3, 4].map((i) => PIC.replace("01.jpg", `0${i}.jpg`));
    expect(cleanImgs([...pics, "https://evil.example/a.jpg", pics[0]])).toEqual(pics.slice(0, MAX_PHOTOS));
    expect(cleanImgs(undefined, PIC)).toEqual([PIC]);
    expect(cleanImgs(undefined)).toEqual([]);
  });

  it("handing in: feedback, send-backs, closing and time limits", () => {
    const r = cleanRound({ id: "r", open: true, closed: 1, endsAt: 5000, notes: { a: "Well done", b: "  ", c: "x".repeat(300) }, back: { a: 2, b: -1, c: "x" } })!;
    expect(r.closed).toBe(true);
    expect(r.endsAt).toBe(5000);
    expect(r.notes).toEqual({ a: "Well done", c: "x".repeat(200) });
    expect(r.back).toEqual({ a: 2 });
    expect(canEdit({ closed: false, endsAt: null }, false, 0)).toBe(true);
    expect(canEdit({ closed: false, endsAt: null }, true, 0)).toBe(false); // handed in
    expect(canEdit({ closed: true, endsAt: null }, false, 0)).toBe(false);
    expect(canEdit({ closed: false, endsAt: 1000 }, false, 999)).toBe(true);
    expect(canEdit({ closed: false, endsAt: 1000 }, false, 1000)).toBe(false); // time's up
    expect(timeLeft(125_000, 0)).toBe("2:05");
    expect(timeLeft(0, 5000)).toBe("0:00");
  });

  it("feedback without a mark doesn't count in the totals", () => {
    const rows = classResults([{ id: "a", name: "Ada" }], [
      { round_id: "r1", student_id: "a", name: "Ada", question: "Q1", mark: 2, max_mark: 2 },
      { round_id: "r2", student_id: "a", name: "Ada", question: "Q2", mark: null, max_mark: 5 },
    ], [], []);
    expect(rows[0]).toMatchObject({ work: 2, workMax: 2, percent: 100 });
  });
});
