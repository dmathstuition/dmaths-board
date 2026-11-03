import { describe, expect, it } from "vitest";
import { canHear, cleanRooms, getBreakout, roomOf, setBreakout, type Rooms } from "@/lib/breakout";

const rooms = (extra: Partial<Rooms> = {}): Rooms => ({
  id: "p1", host: "T", visit: null, all: false,
  groups: [{ id: "g1", name: "Group 1", members: ["a", "b"] }, { id: "g2", name: "Group 2", members: ["c", "d"] }],
  ...extra,
});

describe("breakout groups with sound", () => {
  it("lets everyone hear everyone when there are no groups", () => {
    expect(canHear(null, "a", "c")).toBe(true);
    expect(canHear(null, "a", "T")).toBe(true);
  });

  it("keeps each group to itself", () => {
    const r = rooms();
    expect(canHear(r, "a", "b")).toBe(true);
    expect(canHear(r, "a", "c")).toBe(false);
    expect(canHear(r, "c", "d")).toBe(true);
    expect(canHear(r, "a", "a")).toBe(false);
    expect(canHear(r, "late", "a")).toBe(false); // not in a group yet
  });

  it("the teacher is only heard by, and only hears, the group they join", () => {
    const r = rooms({ visit: "g2" });
    expect(canHear(r, "c", "T")).toBe(true);
    expect(canHear(r, "a", "T")).toBe(false);
    expect(canHear(r, "T", "d")).toBe(true);
    expect(canHear(r, "T", "a")).toBe(false);
    expect(canHear(rooms(), "T", "a")).toBe(false);
    expect(canHear(rooms(), "a", "T")).toBe(false);
  });

  it("talking to all groups reaches every learner", () => {
    const r = rooms({ all: true, visit: "g1" });
    expect(canHear(r, "a", "T")).toBe(true);
    expect(canHear(r, "d", "T")).toBe(true);
    expect(canHear(r, "late", "T")).toBe(true);
    expect(canHear(r, "T", "a")).toBe(false); // the teacher isn't flooded by every group at once
    expect(canHear(r, "a", "c")).toBe(false);
  });

  it("cleans rooms from the network", () => {
    const r = cleanRooms({ id: "p", host: "T", visit: "nope", all: 1, groups: [{ id: "g1", members: ["a", "a", 5] }, { id: "g2", members: ["a", "b"] }, { name: "x" }] })!;
    expect(r.visit).toBeNull();
    expect(r.all).toBe(true);
    expect(r.groups).toEqual([{ id: "g1", name: "Group", members: ["a", "5"] }, { id: "g2", name: "Group", members: ["b"] }]);
    expect(cleanRooms({ id: "p", host: "T", groups: [] })).toBeNull();
    expect(roomOf(r, "b")?.id).toBe("g2");
  });

  it("shares state on this device", () => {
    setBreakout({ rooms: rooms(), sound: true });
    expect(getBreakout().rooms?.id).toBe("p1");
    const before = getBreakout();
    setBreakout({ rooms: rooms() });
    expect(getBreakout()).toBe(before); // nothing changed, no re-render
    setBreakout({ rooms: null, sound: false });
    expect(getBreakout().rooms).toBeNull();
  });
});
