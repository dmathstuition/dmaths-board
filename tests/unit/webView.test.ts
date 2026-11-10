import { describe, expect, it } from "vitest";
import { cleanWebShare, frameVerdict, hostOf, isPrivateIp, QUICK_LINKS, webAddress, wikiSearch } from "@/lib/webView";
import { HOST_EVENTS } from "@/lib/liveSignClient";

describe("the board's web browser: which addresses open", () => {
  it("accepts ordinary web addresses, with or without https://", () => {
    expect(webAddress("desmos.com/calculator")).toBe("https://desmos.com/calculator");
    expect(webAddress("  https://www.geogebra.org/classic?lang=en  ")).toBe("https://www.geogebra.org/classic?lang=en");
    expect(webAddress("http://example.org/page")).toBe("https://example.org/page"); // always https
    expect(webAddress("HTTPS://En.Wikipedia.org/wiki/Pi")).toBe("https://en.wikipedia.org/wiki/Pi");
  });
  it("refuses anything that isn't a public https web page", () => {
    for (const bad of ["", "hello world", "javascript:alert(1)", "data:text/html,<b>x</b>", "file:///etc/passwd", "ftp://example.org", "about:blank", "blob:https://x.org/1",
      "localhost", "localhost:3000", "http://127.0.0.1/", "192.168.1.1", "10.0.0.5/admin", "https://[::1]/", "https://169.254.169.254/latest/meta-data", "router.local", "db.internal",
      "https://user:pass@example.org", "https://example.org:8443/", "intranet", "https://example.org/a b"]) expect(webAddress(bad), bad).toBeNull();
  });
  it("never opens this site inside itself", () => {
    expect(webAddress("dmaths.academy/dashboard", "dmaths.academy")).toBeNull();
    expect(webAddress("https://board.dmaths.academy/", "dmaths.academy")).toBeNull();
    expect(webAddress("https://notdmaths.academy/", "dmaths.academy")).toBe("https://notdmaths.academy/");
  });
  it("knows private network addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "[::1]"]) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "104.16.1.1", "2606:4700::1111", "192.169.0.1"]) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it("words are looked up on Wikipedia", () => {
    expect(wikiSearch("pythagoras theorem")).toBe("https://en.wikipedia.org/w/index.php?search=pythagoras%20theorem");
    expect(hostOf("https://www.desmos.com/calculator")).toBe("desmos.com");
  });
  it("every quick link is an address we'd open", () => {
    for (const q of QUICK_LINKS) expect(webAddress(q.url), q.label).toBe(q.url);
  });
});

describe("does a site let itself be shown inside the class?", () => {
  it("X-Frame-Options says no", () => {
    expect(frameVerdict({ xfo: "DENY" })).toBe("blocked");
    expect(frameVerdict({ xfo: "SAMEORIGIN" })).toBe("blocked");
    expect(frameVerdict({})).toBe("ok");
  });
  it("frame-ancestors decides when it's there", () => {
    expect(frameVerdict({ csp: "default-src 'self'; frame-ancestors 'none'" })).toBe("blocked");
    expect(frameVerdict({ csp: "frame-ancestors 'self' https://partner.example" })).toBe("blocked");
    expect(frameVerdict({ csp: "frame-ancestors *", xfo: "DENY" })).toBe("ok"); // the newer rule wins
    expect(frameVerdict({ csp: "frame-ancestors 'self' https://dmaths.academy" }, "https://dmaths.academy")).toBe("ok");
    expect(frameVerdict({ csp: "script-src 'self'" })).toBe("ok");
  });
});

describe("what the class is shown", () => {
  it("only a real web address gets through, and only the teacher can send it", () => {
    expect(cleanWebShare({ id: "w", url: "https://www.desmos.com/calculator", open: 1 })).toEqual({ id: "w", url: "https://www.desmos.com/calculator", open: true });
    expect(cleanWebShare({ id: "w", url: "javascript:alert(1)", open: true })).toBeNull();
    expect(cleanWebShare({ id: "w", url: "http://192.168.1.1/", open: true })).toBeNull();
    expect(cleanWebShare({ url: "https://example.org" })).toBeNull();
    expect(HOST_EVENTS.has("web-share")).toBe(true);
  });
});
