import { describe, it, expect } from "vitest";
import { sessionKeys } from "@/lib/liveSign";
import { importKeys, needsSignature, signPayload, verifyPayload } from "@/lib/liveSignClient";

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222";

describe("signed teacher messages", () => {
  it("gives each class its own stable key pair", () => {
    expect(sessionKeys(A)).toEqual(sessionKeys(A));
    expect(sessionKeys(A).pub.x).not.toBe(sessionKeys(B).pub.x);
    expect(sessionKeys(A).pub).not.toHaveProperty("d");
  });
  it("a teacher's message checks out; a student's fake or an edited one doesn't", async () => {
    const host = await importKeys(sessionKeys(A));
    const student = await importKeys({ pub: sessionKeys(A).pub });
    const msg = await signPayload(host.sign!, A, "board-clear", { host: true, page: 2 });
    expect(await verifyPayload(student.verify!, A, "board-clear", msg)).toBe(true);
    expect(await verifyPayload(student.verify!, A, "board-clear", { ...msg, page: 0 })).toBe(false);   // edited
    expect(await verifyPayload(student.verify!, A, "board-page", msg)).toBe(false);                    // another event
    expect(await verifyPayload(student.verify!, B, "board-clear", msg)).toBe(false);                   // another class
    expect(await verifyPayload(student.verify!, A, "board-clear", { host: true, page: 2 })).toBe(false); // unsigned fake
    const other = await importKeys(sessionKeys(B));
    const forged = await signPayload(other.sign!, A, "board-clear", { host: true, page: 2 });
    expect(await verifyPayload(student.verify!, A, "board-clear", forged)).toBe(false);                // wrong key
  });
  it("knows which messages must be signed", () => {
    expect(needsSignature("board-clear", {})).toBe(true);
    expect(needsSignature("board-stroke", { host: true })).toBe(true);
    expect(needsSignature("board-stroke", { host: false })).toBe(false);
    expect(needsSignature("hand", {})).toBe(false);
  });
});
