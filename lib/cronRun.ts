import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Heartbeat for the scheduled jobs.
//
// Recording a run must NEVER be able to break the job it is recording — if the
// table is missing (migration not run) or the write fails, we swallow it and
// carry on. A missing heartbeat shows up as "never ran" in Admin → System
// health, which is exactly the signal you'd want anyway.
export async function recordCronRun(
  admin: SupabaseClient,
  job: string,
  detail: Record<string, unknown> = {},
  status = "ok",
): Promise<void> {
  try {
    // Read the running total first so the count survives across runs; a fresh
    // job simply starts at 1.
    const { data: prior } = await admin.from("cron_runs").select("runs").eq("job", job).maybeSingle();
    await admin.from("cron_runs").upsert(
      {
        job,
        last_run_at: new Date().toISOString(),
        last_status: status,
        last_detail: detail,
        runs: (prior?.runs ?? 0) + 1,
      },
      { onConflict: "job" },
    );
  } catch {
    /* heartbeat is best-effort by design */
  }
}

// What a cron endpoint returns on success: stamp the heartbeat, then reply with
// the same payload the job already reported. Using this at every successful
// return (including the "nothing to do" ones — a quiet run is still a run)
// keeps the health page honest.
export async function cronOk(
  admin: SupabaseClient,
  job: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  await recordCronRun(admin, job, payload);
  return NextResponse.json(payload);
}
