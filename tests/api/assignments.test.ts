import { describe, it, expect, vi, beforeEach } from "vitest";
import { memDb } from "../mocks/memdb";

let db = memDb();
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => db }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: () => true, limit: async () => true }));
// In class: the host, or a learner with their class pass.
let viewer: any = null;
vi.mock("@/lib/sessionAccess", () => ({ sessionViewer: async () => viewer }));
import { GET, POST } from "@/app/api/board/assignments/route";
import { signHomework } from "@/lib/homeworkLink";

const SID = "11111111-1111-4111-8111-111111111111", ADA = "g-ada", BOLA = "g-bola";
const PIC = "https://x.supabase.co/storage/v1/object/public/materials/slides/s1/p-01.jpg";
const get = async (q: string) => { const r = await GET(new Request(`https://board.test/api/board/assignments?${q}`)); return { status: r.status, j: await r.json() }; };
const post = async (b: unknown) => { const r = await POST(new Request("https://board.test/api/board/assignments", { method: "POST", body: JSON.stringify(b) })); return { status: r.status, j: await r.json() }; };
const teacher = () => { viewer = { id: "t1", name: "Mr B", host: true, session: { id: SID } }; };
const link = (g: string) => signHomework({ s: SID, g });

beforeEach(() => {
  db = memDb({
    live_sessions: [{ id: SID, title: "JSS2 Maths", host_id: "t1" }],
    profiles: [{ id: "t1", first_name: "Mr", last_name: "Bello" }],
    live_session_guests: [{ id: ADA, session_id: SID, name: "Ada", removed: false, joined_at: "1" }, { id: BOLA, session_id: SID, name: "Bola", removed: false, joined_at: "2" }],
  });
  teacher();
});

async function make(extra: Record<string, unknown> = {}) {
  const { status, j } = await post({ action: "create", sessionId: SID, title: "Fractions 3", dueAt: "2099-01-01T18:00:00Z", items: [
    { kind: "choice", q: "1/2 of 10?", options: ["2", "5"], answer: 1, why: "10 ÷ 2" },
    { kind: "typed", q: "1/4 of 20?", answer: "5", marks: 2 },
    { kind: "board", q: "Show 3/4 of 12", marks: 3 },
    { kind: "upload", q: "Exercise 4B", marks: 5 },
  ], ...extra });
  expect(status).toBe(200);
  return j.id as string;
}

describe("assignments", () => {
  it("a learner opens it by their link, saves as they go, hands in; the teacher marks and returns it", async () => {
    const id = await make();
    viewer = null; // at home: no class pass, just the link
    let r = await get(`t=${encodeURIComponent(link(ADA))}`);
    expect(r.status).toBe(200);
    expect(r.j.klass).toEqual({ title: "JSS2 Maths", teacher: "Mr Bello" });
    expect(r.j.assignments).toMatchObject([{ id, title: "Fractions 3", state: "not-started", count: 4 }]);
    r = await get(`t=${encodeURIComponent(link(ADA))}&id=${id}`);
    expect(r.j.assignment.items[0].answer).toBe(-1); // no answers before it's marked
    expect(r.j.assignment.items[0].why).toBeUndefined();

    for (const [n, value] of [[0, 1], [1, "5"], [2, { ink: [{ id: "s", by: ADA, color: "#000", w: 4, pts: [0.1, 0.1, 0.4, 0.4] }] }], [3, { imgs: [PIC] }]] as const)
      expect((await post({ action: "answer", t: link(ADA), id, n, value })).status).toBe(200);
    expect((await post({ action: "submit", t: link(ADA), id })).j).toEqual({ ok: true, late: false });
    expect((await post({ action: "answer", t: link(ADA), id, n: 1, value: "6" })).status).toBe(409); // handed in: locked
    expect((await post({ action: "unsubmit", t: link(ADA), id })).status).toBe(200);                // take it back…
    expect((await post({ action: "submit", t: link(ADA), id })).status).toBe(200);                  // …and hand in again

    teacher();
    r = await get(`sessionId=${SID}`);
    expect(r.j.assignments[0].counts).toMatchObject({ for: 2, started: 1, handedIn: 1, returned: 0 });
    r = await get(`sessionId=${SID}&id=${id}`);
    const ada = r.j.learners.find((l: any) => l.id === ADA), bola = r.j.learners.find((l: any) => l.id === BOLA);
    expect(ada).toMatchObject({ state: "handed-in", score: 3, total: 11, toMark: 2 });
    expect(bola).toMatchObject({ state: "not-started" });
    expect(bola.link).toMatch(/^https:\/\/board\.test\/homework\?t=/);

    expect((await post({ action: "return", sessionId: SID, id, studentId: ADA })).j.error).toMatch(/Mark Q3, Q4 first/);
    expect((await post({ action: "annotate", sessionId: SID, id, studentId: ADA, key: "3.0", ink: [{ id: "tk-1", by: "t", color: "#16A34A", w: 8, pts: [0.5, 0.5, 0.6, 0.6] }], note: "Neat" })).status).toBe(200);
    expect((await post({ action: "annotate", sessionId: SID, id, studentId: ADA, key: "1", ink: [] })).status).toBe(400); // can't draw on a short answer
    expect((await post({ action: "mark", sessionId: SID, id, studentId: ADA, n: 2, mark: 2 })).j).toMatchObject({ score: 5, toMark: [3] });
    expect((await post({ action: "mark", sessionId: SID, id, studentId: ADA, n: 3, mark: 99 })).j).toMatchObject({ score: 10, toMark: [] }); // capped at 5
    expect((await post({ action: "return", sessionId: SID, id, studentId: ADA, feedback: "Great work!" })).j).toEqual({ ok: true, score: 10, total: 11 });

    viewer = null;
    r = await get(`t=${encodeURIComponent(link(ADA))}&id=${id}`);
    expect(r.j.status).toBe("returned");
    expect(r.j.entry).toMatchObject({ score: 10, total: 11, feedback: "Great work!", marks: [1, 2, 2, 5] });
    expect(r.j.entry.notes["3.0"].note).toBe("Neat");
    expect(r.j.assignment.items[0]).toMatchObject({ answer: 1, why: "10 ÷ 2" }); // answers once it's marked
    expect(r.j.can.ok).toBe(false);
  });

  it("sends work back to try again, and keeps late work apart", async () => {
    const id = await make({ dueAt: "2020-01-01T00:00:00Z" });
    viewer = null;
    await post({ action: "answer", t: link(BOLA), id, n: 0, value: 0 });
    expect((await post({ action: "submit", t: link(BOLA), id })).j.late).toBe(true);
    teacher();
    expect((await get(`sessionId=${SID}&id=${id}`)).j.learners.find((l: any) => l.id === BOLA)).toMatchObject({ state: "late", late: true });
    await post({ action: "redo", sessionId: SID, id, studentId: BOLA, feedback: "Read Q1 again" });
    viewer = null;
    const r = await get(`t=${encodeURIComponent(link(BOLA))}&id=${id}`);
    expect(r.j).toMatchObject({ status: "sent-back", can: { ok: true }, entry: { feedback: "Read Q1 again", tries: 1 } });
    // Late work not allowed: closed at the due date.
    teacher(); await post({ action: "settings", sessionId: SID, id, lateOk: false }); viewer = null;
    expect((await post({ action: "answer", t: link(BOLA), id, n: 0, value: 1 })).j.error).toBe("The due date has passed.");
  });

  it("only for chosen learners; links can't be made up; learners can't mark", async () => {
    const id = await make({ forIds: [ADA] });
    viewer = null;
    expect((await get(`t=${encodeURIComponent(link(BOLA))}`)).j.assignments).toEqual([]);
    expect((await get(`t=${encodeURIComponent(link(BOLA))}&id=${id}`)).status).toBe(404);
    expect((await get(`t=${encodeURIComponent(link(ADA).slice(0, -2) + "xx")}`)).status).toBe(403);
    expect((await get(`t=${encodeURIComponent(signHomework({ s: SID, g: "g-nobody" }))}`)).status).toBe(403);
    // A learner in class (their class pass) can't use the teacher's actions.
    viewer = { id: ADA, name: "Ada", host: false, session: { id: SID } };
    expect((await post({ action: "mark", sessionId: SID, id, studentId: ADA, n: 0, mark: 1 })).j.error).toBe("Unknown action.");
    expect(db.tables.board_assignment_entries ?? []).toEqual([]);
    expect((await get(`sessionId=${SID}`)).j.link).toMatch(/^\/homework\?t=/); // and gets their own link
    // A removed learner's link stops working.
    db.tables.live_session_guests[0].removed = true; viewer = null;
    expect((await get(`t=${encodeURIComponent(link(ADA))}`)).status).toBe(403);
  });

  it("adds someone who missed the class, with their own link; needs at least one question", async () => {
    const r = await post({ action: "add-learner", sessionId: SID, name: "Chidi" });
    expect(r.j.link).toMatch(/\/homework\?t=/);
    expect(db.tables.live_session_guests.find((g) => g.name === "Chidi")?.token_hash).toBeTruthy();
    expect((await post({ action: "create", sessionId: SID, title: "x", items: [] })).status).toBe(400);
  });

  it("says what to run when the tables aren't there yet", async () => {
    const real = db.from;
    db.from = ((t: string) => (t.startsWith("board_assignment") ? { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'relation "board_assignments" does not exist' } }) }) }) } : real(t))) as any;
    const r = await post({ action: "create", sessionId: SID, items: [{ kind: "board", q: "x" }] });
    expect(r.status).toBe(501); expect(r.j.error).toMatch(/migration-assignments\.sql/);
  });
});
