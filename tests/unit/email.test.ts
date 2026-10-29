import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import "../mocks/server";
import { server } from "../mocks/server";
import { sendEmail } from "@/lib/email";

const RELAY_URL = "https://script.google.com/fake";

describe("sendEmail", () => {
  it("returns true when the relay responds { ok: true }", async () => {
    const result = await sendEmail("credentials", "student@test.com", { name: "Alice" });
    expect(result).toBe(true);
  });

  it("returns false when the relay responds { ok: false }", async () => {
    server.use(
      http.post(RELAY_URL, () => HttpResponse.json({ ok: false, error: "quota exceeded" }))
    );
    const result = await sendEmail("credentials", "student@test.com", {});
    expect(result).toBe(false);
  });

  it("returns false on network failure (does not throw)", async () => {
    server.use(http.post(RELAY_URL, () => HttpResponse.error()));
    const result = await sendEmail("notice", "student@test.com", {});
    expect(result).toBe(false);
  });

  it("returns false when the relay returns non-JSON (e.g. HTML 500)", async () => {
    server.use(
      http.post(RELAY_URL, () => new HttpResponse("<html>Error</html>", { status: 500 }))
    );
    const result = await sendEmail("graded", "student@test.com", {});
    expect(result).toBe(false);
  });

  it("sends the correct secret in the request body", async () => {
    let capturedBody: any = null;
    server.use(
      http.post(RELAY_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );
    await sendEmail("credentials", "test@test.com", { key: "val" });
    expect(capturedBody.secret).toBe("test-secret");
  });

  it("sends template, to, and data in the request body", async () => {
    let capturedBody: any = null;
    server.use(
      http.post(RELAY_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ok: true });
      })
    );
    await sendEmail("graded", "a@b.com", { grade: 85 });
    expect(capturedBody.template).toBe("graded");
    expect(capturedBody.to).toBe("a@b.com");
    expect(capturedBody.data).toEqual({ grade: 85 });
  });
});
