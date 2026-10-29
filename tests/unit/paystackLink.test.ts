import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";
import { recordPayment, validStudentId } from "@/lib/paystack";

let admin: ReturnType<typeof makeMockSupabaseClient>;

const txn = (over: any = {}) => ({
  reference: "PSK-1", amount: 2500000, currency: "NGN", channel: "card", status: "success",
  paid_at: "2026-03-01T10:00:00Z", customer: { email: "Mum@Example.com" }, metadata: {}, ...over,
});

beforeEach(() => { admin = makeMockSupabaseClient(); });

describe("validStudentId", () => {
  it("returns the id for a real student", async () => {
    admin._qb.maybeSingle.mockResolvedValue({ data: { id: "stu-1", role: "student" }, error: null });
    expect(await validStudentId(admin as any, "stu-1")).toBe("stu-1");
  });

  it("rejects a non-student profile", async () => {
    admin._qb.maybeSingle.mockResolvedValue({ data: { id: "adm-1", role: "admin" }, error: null });
    expect(await validStudentId(admin as any, "adm-1")).toBeNull();
  });

  it("rejects a missing profile and an empty id", async () => {
    admin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await validStudentId(admin as any, "ghost")).toBeNull();
    expect(await validStudentId(admin as any, "")).toBeNull();
    expect(await validStudentId(admin as any, undefined)).toBeNull();
  });
});

describe("recordPayment", () => {
  it("links the payment to the learner when a validated id is passed", async () => {
    await recordPayment(admin as any, txn(), "stu-1");
    const row = admin._qb.upsert.mock.calls[0][0];
    expect(row).toMatchObject({ reference: "PSK-1", email: "mum@example.com", amount: 25000, student_id: "stu-1" });
    expect(admin._qb.upsert.mock.calls[0][1]).toEqual({ onConflict: "reference" });
  });

  it("omits the link when no student is given", async () => {
    await recordPayment(admin as any, txn());
    expect(admin._qb.upsert.mock.calls[0][0]).not.toHaveProperty("student_id");
  });

  it("retries without the link on an old database missing the column", async () => {
    admin._qb.upsert
      .mockResolvedValueOnce({ error: { message: 'column "student_id" does not exist' } })
      .mockResolvedValueOnce({ error: null });
    await recordPayment(admin as any, txn(), "stu-1");
    expect(admin._qb.upsert).toHaveBeenCalledTimes(2);
    expect(admin._qb.upsert.mock.calls[1][0]).not.toHaveProperty("student_id");
  });
});
