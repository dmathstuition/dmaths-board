import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: any[]) => (sendEmail as any)(...a) }));
import { sendBoardReminders } from "@/lib/boardReminders";

const DAY = 86_400_000, now = Date.parse("2026-10-15T08:00:00Z");
const iso = (d: number) => new Date(now + d * DAY).toISOString();

// A tiny fake of the two queries the reminder job makes.
function fakeAdmin(paid: any[], trials: any[]) {
  const updates: any[] = [];
  let call = 0;
  const chain = (result: any) => new Proxy({}, { get: (_t, k) => (k === "then" ? (ok: any) => ok(result) : () => chain(result)) });
  return {
    updates,
    from: (table: string) => ({
      select: () => (table === "profiles"
        ? chain({ data: [...paid, ...trials].map((a) => ({ id: a.user_id, first_name: "Ada", email: `${a.user_id}@x.ng` })) })
        : chain(call++ === 0 ? { data: paid, error: null } : { data: trials, error: null })),
      update: (patch: any) => ({ eq: async (_c: string, id: string) => { updates.push({ id, ...patch }); return { error: null }; } }),
    }),
  } as any;
}

beforeEach(() => sendEmail.mockClear());

describe("D-Maths Board reminders", () => {
  it("sends the early, last-day and trial-ending emails once and records them", async () => {
    const admin = fakeAdmin(
      [{ user_id: "a", paid_until: iso(4) }, { user_id: "b", paid_until: iso(0.5) }, { user_id: "c", paid_until: iso(4), reminded_14_at: iso(-1) }],
      [{ user_id: "d", trial_ends_at: iso(1.5) }],
    );
    expect(await sendBoardReminders(admin, now)).toBe(3);
    expect(admin.updates).toEqual([
      expect.objectContaining({ id: "a", reminded_14_at: expect.any(String) }),
      expect.objectContaining({ id: "b", reminded_3_at: expect.any(String) }),
      expect.objectContaining({ id: "d", reminded_3_at: expect.any(String) }),
    ]);
    expect(sendEmail).toHaveBeenCalledWith("notice", "d@x.ng", expect.objectContaining({ title: expect.stringMatching(/free trial ends/) }));
    expect(sendEmail).toHaveBeenCalledWith("notice", "a@x.ng", expect.objectContaining({ body: expect.stringMatching(/another month/) }));
    expect(sendEmail.mock.calls.every((c: any[]) => c[2].loginUrl.endsWith("/app/billing"))).toBe(true);
  });
  it("doesn't mark a reminder sent when the email fails", async () => {
    sendEmail.mockResolvedValueOnce(false);
    const admin = fakeAdmin([{ user_id: "a", paid_until: iso(4) }], []);
    expect(await sendBoardReminders(admin, now)).toBe(0);
    expect(admin.updates).toEqual([]);
  });
});
