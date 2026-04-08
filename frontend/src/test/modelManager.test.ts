import { beforeEach, describe, expect, it, vi } from "vitest";

const backendAiMock = vi.hoisted(() => {
  return {
    callBackendAI: vi.fn(),
  };
});

const authMock = vi.hoisted(() => ({
  currentUser: { uid: "user-1" },
}));

vi.mock("@/services/backendAiClient", () => ({
  callBackendAI: backendAiMock.callBackendAI,
}));

vi.mock("@/firebase/auth", () => ({
  auth: authMock,
}));

import {
  PRIMARY_MODEL_NAME,
  QUOTA_EXHAUSTED_MESSAGE,
  canCallAI,
  getSimpleReply,
  isTruncated,
  localFallback,
  resetModelManagerStateForTests,
  safeGenerate,
} from "@/ai/modelManager";

describe("modelManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetModelManagerStateForTests();
    authMock.currentUser = { uid: "user-1" };
  });

  it("uses a higher output token budget for model generation", async () => {
    backendAiMock.callBackendAI.mockResolvedValueOnce({
      text: "Here is a complete answer.",
    });

    await safeGenerate("Help me with this.", {
      fallbackInput: "help me with this",
    });

    expect(backendAiMock.callBackendAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: PRIMARY_MODEL_NAME,
        generationConfig: expect.objectContaining({
          maxOutputTokens: 150,
          temperature: 0.7,
        }),
      }),
    );
  });

  it("retries once when the first response looks truncated", async () => {
    backendAiMock.callBackendAI
      .mockResolvedValueOnce({
        text: "Well, Und...",
      })
      .mockResolvedValueOnce({
        text: "Well, under that surface, the scene wants more tension.",
      });

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(backendAiMock.callBackendAI).toHaveBeenCalledTimes(2);
    expect(result.text).toBe(
      "Well, under that surface, the scene wants more tension.",
    );
  });

  it("returns a minimum fallback when the response is too short", async () => {
    backendAiMock.callBackendAI
      .mockResolvedValueOnce({
        text: "ok",
      })
      .mockResolvedValueOnce({
        text: "no",
      });

    const result = await safeGenerate("hi", {
      fallbackInput: "hi",
    });

    expect(result.text).toBe("Want to expand that?");
  });

  it("falls back to the next model when the retry request fails", async () => {
    backendAiMock.callBackendAI
      .mockResolvedValueOnce({
        text: "Well, Und...",
      })
      .mockRejectedValueOnce(new Error("503 overloaded"));

    backendAiMock.callBackendAI.mockResolvedValueOnce({
      text: "Well, underneath her calm, the scene wants more pressure.",
    });

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(backendAiMock.callBackendAI).toHaveBeenCalledTimes(3);
    expect(result.text).toBe(
      "Well, underneath her calm, the scene wants more pressure.",
    );
    expect(result.model).toBe("models/gemini-2.0-flash");
    expect(result.usedFallback).toBe(true);
  });

  it("stops immediately when the primary model hits quota exhaustion", async () => {
    backendAiMock.callBackendAI.mockRejectedValueOnce(
      new Error("429 quota exceeded"),
    );

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(backendAiMock.callBackendAI).toHaveBeenCalledTimes(1);
    expect(result.text).toBe(QUOTA_EXHAUSTED_MESSAGE);
    expect(result.quotaLimited).toBe(true);
  });

  it("blocks later requests for a short window after quota exhaustion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T00:00:00.000Z"));

    backendAiMock.callBackendAI.mockRejectedValueOnce(
      new Error("429 quota exceeded"),
    );

    await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    vi.setSystemTime(new Date("2026-04-07T00:00:03.000Z"));

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(backendAiMock.callBackendAI).toHaveBeenCalledTimes(1);
    expect(result.text).toBe(QUOTA_EXHAUSTED_MESSAGE);
    expect(result.quotaLimited).toBe(true);
  });

  it("recognizes obviously truncated text", () => {
    expect(isTruncated("Well, Und...")).toBe(true);
    expect(isTruncated("Hey there!")).toBe(false);
    expect(isTruncated("Hey 👋")).toBe(false);
    expect(isTruncated("Start with the wound")).toBe(false);
    expect(isTruncated("That lands cleanly.")).toBe(false);
  });

  it("uses the local fallback helper for lightweight offline guidance", () => {
    expect(localFallback("continue this scene")).toBe("Where should it go next?");
    expect(localFallback("idea for a villain")).toBe("Want a few directions?");
  });

  it("returns cached simple replies without touching the API", () => {
    expect(getSimpleReply("hi")).toBe("Hey 👋");
    expect(getSimpleReply("hello")).toBe("Hey 👋");
    expect(getSimpleReply("hey!")).toBe("Hey 👋");
    expect(getSimpleReply("what can you do")).toBeNull();
    expect(getSimpleReply("what can you do for me?")).toBeNull();
    expect(getSimpleReply("write me punchline")).toBeNull();
    expect(getSimpleReply("help me outline a chapter")).toBeNull();
  });

  it("rate limits repeated calls", () => {
    expect(canCallAI()).toBe(true);
    expect(canCallAI()).toBe(false);
  });
});
