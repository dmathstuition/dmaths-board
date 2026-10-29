import { describe, expect, it } from "vitest";
import { applyLive, assemble, chunkItems, pageDigest } from "@/lib/boardSync";
import type { Stroke } from "@/lib/whiteboard";

const st = (id: string, n = 4, extra: Partial<Stroke> = {}): Stroke => ({ id, by: "u", color: "#0B1220", w: 4, pts: Array.from({ length: n }, (_, i) => (i % 10) / 10), ...extra });

describe("page fingerprints", () => {
  it("match when pages hold the same items and differ otherwise", () => {
    const a = [st("a"), st("b")];
    expect(pageDigest(a)).toBe(pageDigest([st("a"), st("b")]));
    expect(pageDigest(a)).not.toBe(pageDigest([st("a")])); // a stroke went missing
    expect(pageDigest(a)).not.toBe(pageDigest([st("a"), st("b", 6)])); // only part of a stroke arrived
    expect(pageDigest(a)).not.toBe(pageDigest([st("a"), { ...st("b"), pts: [0.5, 0.5, 0.6, 0.6] }])); // moved
    expect(pageDigest([])).toBe("0:" + pageDigest([]).split(":")[1]);
  });
});

describe("sending pages in pieces", () => {
  it("splits big pages and puts them back together in order", () => {
    const items = Array.from({ length: 60 }, (_, i) => st(`s${i}`, 400));
    const parts = chunkItems(items, 20_000);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(JSON.stringify(p).length).toBeLessThan(26_000);
    const got: (Stroke[] | undefined)[] = [];
    [...parts.keys()].reverse().forEach((i) => { got[i] = parts[i]; }); // pieces may arrive in any order
    expect(assemble(got, parts.length)?.map((s) => s.id)).toEqual(items.map((s) => s.id));
    expect(assemble([parts[0]], parts.length)).toBeNull();
    expect(chunkItems([])).toEqual([[]]);
  });
});

describe("live strokes", () => {
  it("adds new points, and waits for the finished stroke after a missed update", () => {
    const head = st("x", 0);
    const one = applyLive(undefined, head, 0, [0.1, 0.1, 0.2, 0.2])!;
    const two = applyLive(one, head, 4, [0.3, 0.3])!;
    expect(two.pts).toEqual([0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
    expect(applyLive(two, head, 10, [0.9, 0.9])).toBeNull(); // an update in between was lost
  });
});

describe("a class on a bad connection", () => {
  it("ends with every screen the same once the board repairs itself", () => {
    // The host's page, and a learner who missed some messages.
    const hostPage = [st("a"), st("b", 40), st("c")];
    let learner = [st("a"), st("b", 12)]; // missed "c"; only part of "b"
    const digest = pageDigest(hostPage);
    expect(pageDigest(learner)).not.toBe(digest); // → the learner asks for the page
    const pieces = chunkItems(hostPage, 200);
    learner = assemble(pieces, pieces.length)!;
    expect(pageDigest(learner)).toBe(digest);
  });
});
