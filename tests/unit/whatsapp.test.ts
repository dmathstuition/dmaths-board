import { describe, it, expect } from "vitest";
import { waNumber, waLink } from "@/lib/whatsapp";

describe("waNumber", () => {
  it("normalises Nigerian local formats to 234…", () => {
    expect(waNumber("0803 123 4567")).toBe("2348031234567"); // leading 0
    expect(waNumber("8031234567")).toBe("2348031234567");    // no leading 0 (10 digits)
    expect(waNumber("+234 803 123 4567")).toBe("2348031234567"); // already international
    expect(waNumber("234-803-123-4567")).toBe("2348031234567");
    expect(waNumber("00234 803 123 4567")).toBe("2348031234567"); // 00 prefix
  });

  it("returns null for missing or implausible numbers", () => {
    expect(waNumber("")).toBeNull();
    expect(waNumber(null)).toBeNull();
    expect(waNumber("12345")).toBeNull();     // too short after normalising
    expect(waNumber("abc")).toBeNull();
  });
});

describe("waLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    const link = waLink("08031234567", "Hi & welcome!");
    expect(link).toBe("https://wa.me/2348031234567?text=Hi%20%26%20welcome!");
  });
  it("omits the text query when none is given", () => {
    expect(waLink("08031234567")).toBe("https://wa.me/2348031234567");
  });
  it("returns null when the number is invalid", () => {
    expect(waLink("nope", "hi")).toBeNull();
  });
});
