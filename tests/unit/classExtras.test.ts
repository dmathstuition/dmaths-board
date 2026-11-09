import { describe, expect, it } from "vitest";
import {
  CHAT_KEEP, CHAT_MAX, addMsg, awayNow, changed, cleanAway, cleanBurst, cleanChatState, cleanLock, cleanReaction, cleanRollCall, cleanWatch, embedUrl,
  expectedPos, follow, mayPost, newRollCall, newWatch, rollLeft, rollResult, takeSay, videoId, type ChatMsg,
} from "@/lib/classExtras";
import { HOST_EVENTS } from "@/lib/liveSignClient";

const people = [{ id: "a", name: "Ada", online: true }, { id: "b", name: "Bo", online: true }, { id: "c", name: "Chi", online: false }];

describe("class chat", () => {
  it("takes a learner's message with their real name, tidied and cut to size", () => {
    const m = takeSay({ by: "a", name: "Mr B (teacher)", text: `  hello\n\tthere ${"x".repeat(400)}` }, people, 5000)!;
    expect(m.name).toBe("Ada"); // from the class list, not from the message
    expect(m.text.startsWith("hello there x")).toBe(true);
    expect(m.text).toHaveLength(CHAT_MAX);
    expect(m.at).toBe(5000);
    expect(m.host).toBeUndefined();
    expect(takeSay({ by: "a", text: "   " }, people, 1)).toBeNull();
    expect(takeSay({ text: "hi" }, people, 1)).toBeNull();
  });
  it("lets each learner post only every couple of seconds", () => {
    const last = new Map<string, number>();
    expect(mayPost(last, "a", 1000)).toBe(true);
    expect(mayPost(last, "a", 2000)).toBe(false);
    expect(mayPost(last, "b", 2000)).toBe(true);
    expect(mayPost(last, "a", 3100)).toBe(true);
  });
  it("keeps the newest messages and cleans what arrives", () => {
    let msgs: ChatMsg[] = [];
    for (let i = 0; i < CHAT_KEEP + 5; i++) msgs = addMsg(msgs, { id: `m${i}`, by: "a", name: "Ada", text: `n${i}`, at: i });
    expect(msgs).toHaveLength(CHAT_KEEP);
    expect(msgs[0].id).toBe("m5");
    expect(cleanChatState(null)).toEqual({ mode: "off", react: false, msgs: [] });
    const s = cleanChatState({ mode: "weird", react: 1, msgs: [{ id: "x", by: "a", name: "", text: "hi" }, { id: "y", text: "" }, "junk"] });
    expect(s).toEqual({ mode: "off", react: true, msgs: [{ id: "x", by: "a", name: "Learner", text: "hi", at: 0 }] });
    expect(cleanChatState({ mode: "approve" }).mode).toBe("approve");
  });
  it("only known reactions get through", () => {
    expect(cleanReaction("👍")).toBe("👍");
    expect(cleanReaction("<b>")).toBeNull();
    expect(cleanBurst({ items: [{ e: "🎉", by: "a" }, { e: "💩", by: "b" }, null] })).toEqual([{ e: "🎉", by: "a" }]);
  });
});

describe("focus tools", () => {
  it("the lock has a message", () => {
    expect(cleanLock({ on: 1, msg: "" })).toEqual({ on: true, msg: "Eyes on the teacher" });
    expect(cleanLock({ on: false, msg: "Pens down" })).toEqual({ on: false, msg: "Pens down" });
  });
  it("lists who is looking away: in the class, away, longest first", () => {
    const entries = [cleanAway({ by: "b", away: true }, 2000)!, cleanAway({ by: "a", away: true }, 1000)!, cleanAway({ by: "c", away: true }, 500)!, cleanAway({ by: "zz", away: true }, 100)!];
    expect(awayNow(entries, people).map((e) => e.name)).toEqual(["Ada", "Bo"]); // Chi has left; zz isn't in the class
    expect(awayNow([cleanAway({ by: "a", away: false }, 1)!], people)).toEqual([]);
    expect(cleanAway({ away: true }, 1)).toBeNull();
  });
  it("a roll call runs for 30 seconds and says who didn't answer", () => {
    const r = newRollCall(10_000);
    expect(rollLeft(r, 10_000)).toBe(30);
    expect(rollLeft(r, 39_100)).toBe(1);
    expect(rollLeft(r, 50_000)).toBe(0);
    expect(rollLeft({ ...r, open: false }, 10_000)).toBe(0);
    const res = rollResult(people, ["a", "c"]);
    expect(res.here.map((p) => p.name)).toEqual(["Ada"]);
    expect(res.missing.map((p) => p.name)).toEqual(["Bo"]); // Chi isn't in the class now, so isn't "missing"
    expect(cleanRollCall({ id: "" })).toBeNull();
  });
});

describe("watching a video together", () => {
  it("finds the video in every usual kind of link", () => {
    for (const link of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=abc", "youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?t=42&v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"]) expect(videoId(link), link).toBe("dQw4w9WgXcQ");
    for (const link of ["", "hello", "https://vimeo.com/12345", "https://evil.example/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=short", "javascript:alert(1)"]) expect(videoId(link), link).toBeNull();
  });
  it("knows where the video should be", () => {
    const w = { ...newWatch("dQw4w9WgXcQ", 1000), playing: true, pos: 10, at: 1000 };
    expect(expectedPos(w, 4000)).toBe(13);
    expect(expectedPos({ ...w, playing: false }, 4000)).toBe(10);
  });
  it("a follower plays, pauses and jumps to match the teacher", () => {
    const w = { ...newWatch("dQw4w9WgXcQ", 0), playing: true, pos: 60, at: 0 };
    expect(follow(w, { playing: true, pos: 61.2 }, 1000)).toEqual({});                       // close enough
    expect(follow(w, { playing: false, pos: 61 }, 1000)).toEqual({ play: true });
    expect(follow(w, { playing: true, pos: 20 }, 1000)).toEqual({ seek: 61 });              // the teacher jumped
    expect(follow({ ...w, playing: false }, { playing: true, pos: 63 }, 9000)).toEqual({ play: false, seek: 60 });
  });
  it("the teacher's player moving is news only for play, pause or a jump", () => {
    const w = { ...newWatch("dQw4w9WgXcQ", 0), playing: true, pos: 0, at: 0 };
    expect(changed(w, { playing: true, pos: 5.3 }, 5000)).toBe(false); // just playing on
    expect(changed(w, { playing: false, pos: 5 }, 5000)).toBe(true);
    expect(changed(w, { playing: true, pos: 90 }, 5000)).toBe(true);
  });
  it("only a real video id is accepted from the network, and the player comes from YouTube's no-cookie site", () => {
    expect(cleanWatch({ id: "w", video: "../../evil", open: true })).toBeNull();
    expect(cleanWatch({ id: "w", video: "dQw4w9WgXcQ", pos: -5, open: 1 })).toMatchObject({ pos: 0, open: true, playing: false });
    expect(embedUrl("dQw4w9WgXcQ", "https://dmaths.academy", true)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?enablejsapi=1.*origin=https%3A%2F%2Fdmaths\.academy$/);
  });
});

describe("only the teacher can send what the class sees", () => {
  it("the class-wide messages are signed", () => {
    for (const ev of ["chat-state", "react-burst", "focus-lock", "rollcall", "watch", "buzz-round", "reward"]) expect(HOST_EVENTS.has(ev), ev).toBe(true);
  });
});
