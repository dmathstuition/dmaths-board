import { describe, expect, it } from "vitest";
import { friendlyMediaError } from "@/lib/voiceClient";

const err = (name: string, message: string) => Object.assign(new Error(message), { name });
describe("camera and microphone errors people can act on", () => {
  it("turns WebRTC wording into plain words", () => {
    const sdp = err("InvalidAccessError", "Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': Failed to set remote answer sdp: Failed to set remote video description send parameters for m-section with mid='3'.");
    expect(friendlyMediaError(sdp, "camera")).toBe("Your camera couldn't connect to the call from this device — try again, or switch browser (Chrome works best).");
    expect(friendlyMediaError(err("NotAllowedError", "Permission denied"), "camera")).toMatch(/Allow the camera/);
    expect(friendlyMediaError(err("NotReadableError", "Could not start video source"), "camera")).toMatch(/another app/);
    expect(friendlyMediaError(err("NotFoundError", "Requested device not found"), "microphone")).toBe("No microphone was found on this device.");
    expect(friendlyMediaError("x".repeat(300), "camera")).toBe("The camera couldn't start — try again.");
  });
});
