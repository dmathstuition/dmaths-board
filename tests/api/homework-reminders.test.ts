import { describe, it, expect, vi, beforeEach } from "vitest";
import { memDb } from "../mocks/memdb";

let db = memDb();
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => db }));
const sendEmail = vi.fn(async (..._a: unknown[]) => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
import { sendHomeworkReminders } from "@/lib/homeworkReminders";
import { GET } from "@/app/api/cron/homework-reminders/route";

const NOW = new Date("2026-11-25T17:00:00Z").getTime(), SID = "s-1";
const iso = (h: number) => new Date(NOW + h * 3_600_000).toISOString();
beforeEach(() => {
  sendEmail.mockClear();
  db = memDb({
    live_sessions: [{ id: SID, title: "JSS2 Maths", host_id: "t1" }],
    profiles: [{ id: "t1", first_name: "Mr", last_name: "Bello" }],
    live_session_guests: [
      { id: "g-ada", session_id: SID, name: "Ada", removed: false, parent_contact: "mum@school.ng" },
      { id: "g-bola", session_id: SID, name: "Bola", removed: false, parent_contact: "dad@school.ng" },
      { id: "g-chidi", session_id: SID, name: "Chidi", removed: false, parent_contact: "+2348031234567" }, // WhatsApp only
    ],
    board_assignments: [
      { id: "a-soon", session_id: SID, title: "Fractions 3", due_at: iso(24), for_ids: null, remind: true, reminded_at: null, status: "open" },
      { id: "a-later", session_id: SID, title: "Next week", due_at: iso(24 * 6), for_ids: null, remind: true, reminded_at: null, status: "open" },
      { id: "a-off", session_id: SID, title: "No reminder", due_at: iso(20), for_ids: null, remind: false, reminded_at: null, status: "open" },
      { id: "a-closed", session_id: SID, title: "Closed", due_at: iso(20), for_ids: null, remind: true, reminded_at: null, status: "closed" },
    ],
    board_assignment_entries: [{ assignment_id: "a-soon", student_id: "g-bola", submitted_at: iso(-2), returned_at: null }],
  });
});

describe("homework reminder emails", () => {
  it("the evening before: parents with an email, whose child hasn't handed in — once", async () => {
    expect(await sendHomeworkReminders(db as any, NOW)).toEqual({ assignments: 1, sent: 1 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [, to, data] = sendEmail.mock.calls[0] as [string, string, any];
    expect(to).toBe("mum@school.ng");
    expect(data.title).toMatch(/Ada — "Fractions 3" is due/);
    expect(data.linkUrl).toMatch(/\/homework\?t=/);
    expect(db.tables.board_assignments.find((a) => a.id === "a-soon")!.reminded_at).toBeTruthy();
    // The next run (or a second one) sends nothing again.
    expect(await sendHomeworkReminders(db as any, NOW + 3_600_000)).toEqual({ assignments: 0, sent: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
  it("needs the cron secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await GET(new Request("https://x/api/cron/homework-reminders"))).status).toBe(401);
    expect((await GET(new Request("https://x/api/cron/homework-reminders", { headers: { authorization: "Bearer s3cret" } }))).status).toBe(200);
  });
});
