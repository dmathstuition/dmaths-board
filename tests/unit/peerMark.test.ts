import { describe, it, expect } from "vitest";
import { assignPeers, cleanKey, cleanPeerMark, comparePeer } from "@/lib/peerMark";

describe("peer marking", () => {
  it("gives everyone someone else's work, each marked by exactly one classmate", () => {
    for (const n of [2, 3, 7, 30]) {
      const ids = Array.from({ length: n }, (_, i) => `g${i}`);
      const m = assignPeers(ids);
      expect(Object.keys(m).sort()).toEqual([...ids].sort());
      expect(Object.values(m).sort()).toEqual([...ids].sort());       // each answer is marked once
      for (const [a, b] of Object.entries(m)) expect(a).not.toBe(b);   // nobody marks their own
    }
    const two = assignPeers(["a", "b"]);
    expect(two).toEqual({ a: "b", b: "a" });
    expect(assignPeers(["a"])).toEqual({});
    expect(assignPeers([])).toEqual({});
    expect(Object.keys(assignPeers(["a", "a", "b"]))).toHaveLength(2); // repeats don't count twice
  });
  it("is shuffled, not the same order every time", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `g${i}`);
    const seen = new Set(Array.from({ length: 20 }, () => JSON.stringify(assignPeers(ids))));
    expect(seen.size).toBeGreaterThan(5);
  });
  it("accepts a whole-number mark in range, with a short comment", () => {
    expect(cleanPeerMark({ mark: 2, comment: "  good   method  " }, 3)).toEqual({ mark: 2, comment: "good method" });
    expect(cleanPeerMark({ mark: 0 }, 3)).toEqual({ mark: 0, comment: "" });
    expect(cleanPeerMark({ mark: 4 }, 3)).toBeNull();
    expect(cleanPeerMark({ mark: -1 }, 3)).toBeNull();
    expect(cleanPeerMark({ mark: "" }, 3)).toBeNull();
    expect(cleanPeerMark({}, 3)).toBeNull();
    expect(cleanPeerMark({ mark: 1, comment: "x".repeat(500) }, 3)!.comment).toHaveLength(120);
    expect(cleanKey("  x = 4  ")).toBe("x = 4");
  });
  it("compares peer marks with the teacher's own", () => {
    const peer = { a: { mark: 2, comment: "", by: "x" }, b: { mark: 1, comment: "", by: "y" } };
    expect(comparePeer(["a", "b", "c"], peer, { a: 2, b: 0 })).toEqual({ marked: 2, of: 3, agree: 1, differ: 1 });
    expect(comparePeer(["a"], {}, {})).toEqual({ marked: 0, of: 1, agree: 0, differ: 0 });
  });
});
