import { describe, expect, it } from "vitest";
import { galleryOrder, nextActive, onScreen, pageCount, perPage, type CallPerson } from "@/lib/callLayout";

const P = (id: string, extra: Partial<CallPerson> = {}): CallPerson => ({ id, name: id, hasVideo: false, muted: true, ...extra });
const people = [P("zed"), P("amy", { hasVideo: true }), P("me", { me: true }), P("teach", { host: true }), ...Array.from({ length: 10 }, (_, i) => P(`p${i}`))];

describe("video call layout", () => {
  it("fits fewer tiles on a phone", () => {
    expect(perPage(400)).toBe(4); expect(perPage(900)).toBe(6); expect(perPage(1400)).toBe(9);
    expect(pageCount(14, 4)).toBe(4); expect(pageCount(0, 4)).toBe(1);
  });
  it("puts the teacher, then me, then cameras on, first", () => {
    expect(galleryOrder(people).slice(0, 4).map((p) => p.id)).toEqual(["teach", "me", "amy", "p0"]);
  });
  it("shows one page of the gallery at a time (only those videos are received)", () => {
    expect(onScreen("gallery", people, 0, 4, null, false).tiles.map((p) => p.id)).toEqual(["teach", "me", "amy", "p0"]);
    expect(onScreen("gallery", people, 3, 4, null, false).tiles.map((p) => p.id)).toEqual(["p9", "zed"]);
    expect(onScreen("gallery", people, 99, 4, null, false).tiles.length).toBeGreaterThan(0); // past the end: the last page
  });
  it("speaker view: the person talking big (never me), else the teacher; a screen takes the stage", () => {
    expect(onScreen("speaker", people, 0, 9, "amy", false).big?.id).toBe("amy");
    expect(onScreen("speaker", people, 0, 9, "me", false).big?.id).toBe("teach");
    expect(onScreen("speaker", people, 0, 9, null, false).tiles).toHaveLength(5);
    expect(onScreen("speaker", people, 0, 9, "amy", true).big).toBeNull();
    expect(onScreen("board", people, 0, 9, null, false).tiles).toEqual([]);
  });
  it("the big picture follows whoever talks, without flicking about", () => {
    expect(nextActive({ a: 0.2, b: 0.01 }, null, 0, 1000)).toEqual({ id: "a", since: 1000 });
    expect(nextActive({ a: 0.1, b: 0.3 }, "a", 1000, 1500)).toEqual({ id: "a", since: 1000 }); // a is still talking: hold
    expect(nextActive({ a: 0.0, b: 0.3 }, "a", 1000, 1500)).toEqual({ id: "b", since: 1500 }); // a stopped
    expect(nextActive({ a: 0.1, b: 0.3 }, "a", 1000, 3000)).toEqual({ id: "b", since: 3000 }); // held long enough
    expect(nextActive({ a: 0.01 }, "b", 1000, 3000)).toEqual({ id: "b", since: 1000 }); // silence: keep who it was
  });
});
