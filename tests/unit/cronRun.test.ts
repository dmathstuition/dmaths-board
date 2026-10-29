import { describe, it, expect, vi } from "vitest";
import { recordCronRun, cronOk } from "@/lib/cronRun";

function client(opts: { upsertError?: any; priorRuns?: number; throwOn?: boolean } = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: opts.upsertError ?? null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.priorRuns === undefined ? null : { runs: opts.priorRuns }, error: null,
  });
  const from = vi.fn(() => {
    if (opts.throwOn) throw new Error("table exploded");
    return { select: () => ({ eq: () => ({ maybeSingle }) }), upsert };
  });
  return { upsert, client: { from } as any };
}

describe("recordCronRun", () => {
  it("stamps the run and counts up from the previous total", async () => {
    const { client: c, upsert } = client({ priorRuns: 41 });
    await recordCronRun(c, "nudges", { sent: 3 });

    const row = upsert.mock.calls[0][0];
    expect(row.job).toBe("nudges");
    expect(row.last_status).toBe("ok");
    expect(row.last_detail).toEqual({ sent: 3 });
    expect(row.runs).toBe(42);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "job" });
  });

  it("starts a brand-new job at one run", async () => {
    const { client: c, upsert } = client();
    await recordCronRun(c, "classes");
    expect(upsert.mock.calls[0][0].runs).toBe(1);
  });

  // The heartbeat exists to report problems, never to cause them.
  it("swallows a write failure", async () => {
    const { client: c } = client({ upsertError: { code: "42P01" } });
    await expect(recordCronRun(c, "nudges")).resolves.toBeUndefined();
  });

  it("swallows a thrown error too (table missing entirely)", async () => {
    const { client: c } = client({ throwOn: true });
    await expect(recordCronRun(c, "nudges")).resolves.toBeUndefined();
  });
});

describe("cronOk", () => {
  it("records the run and returns the job's own payload", async () => {
    const { client: c, upsert } = client({ priorRuns: 0 });
    const res = await cronOk(c, "broadcasts", { sent: 2, broadcasts: 1 });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sent: 2, broadcasts: 1 });
    expect(upsert.mock.calls[0][0].last_detail).toEqual({ sent: 2, broadcasts: 1 });
  });

  it("still answers the caller when the heartbeat can't be written", async () => {
    const { client: c } = client({ throwOn: true });
    const res = await cronOk(c, "broadcasts", { sent: 0 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sent: 0 });
  });
});
