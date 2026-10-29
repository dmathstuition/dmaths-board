// Pure helpers for the interactive-class room screen (tested in
// tests/unit/roomPredict.test.ts).
import type { RoomState } from "@/components/live/HostRoom";

// What a host action will do, applied to the screen straight away (the
// server confirms it a moment later).
export function predictRoom(room: RoomState, body: Record<string, unknown>): RoomState {
  let people = room.people, all = room.session.allCanWrite;
  const who = String(body.studentId ?? "");
  switch (body.action) {
    case "everyoneOff": all = false; people = people.map((p) => ({ ...p, canWrite: false })); break;
    case "allWrite": all = !!body.value; break;
    case "write": people = people.map((p) => (p.id === who ? { ...p, canWrite: !!body.value } : p)); break;
    case "lowerHand": people = people.map((p) => (p.id === who ? { ...p, handAt: null } : p)); break;
    case "lowerAll": people = people.map((p) => ({ ...p, handAt: null })); break;
    case "remove": people = people.filter((p) => p.id !== who); break;
    default: return room;
  }
  return { ...room, session: { ...room.session, allCanWrite: all }, people, writers: all ? "all" : people.filter((p) => p.canWrite).map((p) => p.id) };
}
