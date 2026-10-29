import { describe, it, expect } from "vitest";
import { predictRoom } from "@/lib/roomPredict";
import type { RoomState } from "@/components/live/HostRoom";

const room = (): RoomState => ({
  session: { id: "s", code: "1", title: "T", status: "live", allCanWrite: false, classId: null, subject: null, hostName: "H", link: "" },
  me: { id: "h", name: "H", host: true, canWrite: true },
  writers: ["a"],
  people: [
    { id: "a", name: "Ada", canWrite: true, online: true, joinedAt: "", handAt: "2026-01-01T10:00:00Z" },
    { id: "b", name: "Bola", canWrite: false, online: true, joinedAt: "", handAt: "2026-01-01T10:00:05Z" },
  ],
});

describe("predictRoom (instant host buttons)", () => {
  it("lets one learner write, or stops them", () => {
    const r = predictRoom(room(), { action: "write", studentId: "b", value: true });
    expect(r.people.find((p) => p.id === "b")?.canWrite).toBe(true);
    expect(r.writers).toEqual(["a", "b"]);
  });
  it("everyone / only me", () => {
    expect(predictRoom(room(), { action: "allWrite", value: true }).writers).toBe("all");
    const off = predictRoom(room(), { action: "everyoneOff" });
    expect(off.writers).toEqual([]);
    expect(off.people.every((p) => !p.canWrite)).toBe(true);
  });
  it("lowers one hand, or all of them, and removes a learner", () => {
    expect(predictRoom(room(), { action: "lowerHand", studentId: "a" }).people.map((p) => !!p.handAt)).toEqual([false, true]);
    expect(predictRoom(room(), { action: "lowerAll" }).people.some((p) => p.handAt)).toBe(false);
    expect(predictRoom(room(), { action: "remove", studentId: "a" }).people.map((p) => p.id)).toEqual(["b"]);
  });
  it("leaves the screen alone for anything else", () => {
    const r = room();
    expect(predictRoom(r, { action: "end" })).toBe(r);
  });
});
