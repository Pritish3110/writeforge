import { beforeEach, describe, expect, it, vi } from "vitest";

const geminiMock = vi.hoisted(() => {
  const primaryGenerateContent = vi.fn();
  const fallbackGenerateContent = vi.fn();
  const getGenerativeModel = vi.fn(({ model }) => {
    if (model === "models/gemini-2.5-flash") {
      return {
        generateContent: primaryGenerateContent,
      };
    }

    return {
      generateContent: fallbackGenerateContent,
    };
  });

  return {
    primaryGenerateContent,
    fallbackGenerateContent,
    getGenerativeModel,
  };
});

vi.mock("@/ai/gemini.js", () => ({
  hasGeminiApiKey: true,
  default: {
    getGenerativeModel: geminiMock.getGenerativeModel,
  },
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
  });

  it("uses a higher output token budget for model generation", async () => {
    geminiMock.primaryGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Here is a complete answer.",
      },
    });

    await safeGenerate("Help me with this.", {
      fallbackInput: "help me with this",
    });

    expect(geminiMock.getGenerativeModel).toHaveBeenCalledWith(
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
    geminiMock.primaryGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => "Well, Und...",
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => "Well, under that surface, the scene wants more tension.",
        },
      });

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(geminiMock.primaryGenerateContent).toHaveBeenCalledTimes(2);
    expect(result.text).toBe(
      "Well, under that surface, the scene wants more tension.",
    );
  });

  it("returns a minimum fallback when the response is too short", async () => {
    geminiMock.primaryGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => "ok",
        },
      })
      .mockResolvedValueOnce({
        response: {
          text: () => "no",
        },
      });

    const result = await safeGenerate("hi", {
      fallbackInput: "hi",
    });

    expect(result.text).toBe("Hmm... try that again?");
  });

  it("falls back to the next model when the retry request fails", async () => {
    geminiMock.primaryGenerateContent
      .mockResolvedValueOnce({
        response: {
          text: () => "Well, Und...",
        },
      })
      .mockRejectedValueOnce(new Error("503 overloaded"));

    geminiMock.fallbackGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "Well, underneath her calm, the scene wants more pressure.",
      },
    });

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(geminiMock.primaryGenerateContent).toHaveBeenCalledTimes(2);
    expect(geminiMock.fallbackGenerateContent).toHaveBeenCalledTimes(1);
    expect(result.text).toBe(
      "Well, underneath her calm, the scene wants more pressure.",
    );
    expect(result.model).toBe("models/gemini-2.0-flash");
    expect(result.usedFallback).toBe(true);
  });

  it("stops immediately when the primary model hits quota exhaustion", async () => {
    geminiMock.primaryGenerateContent.mockRejectedValueOnce(
      new Error("429 quota exceeded"),
    );

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(geminiMock.primaryGenerateContent).toHaveBeenCalledTimes(1);
    expect(geminiMock.fallbackGenerateContent).not.toHaveBeenCalled();
    expect(result.text).toBe(QUOTA_EXHAUSTED_MESSAGE);
    expect(result.quotaLimited).toBe(true);
  });

  it("blocks later requests for a short window after quota exhaustion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T00:00:00.000Z"));

    geminiMock.primaryGenerateContent.mockRejectedValueOnce(
      new Error("429 quota exceeded"),
    );

    await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    vi.setSystemTime(new Date("2026-04-07T00:00:03.000Z"));

    const result = await safeGenerate("help me raise the tension", {
      fallbackInput: "help me raise the tension",
    });

    expect(geminiMock.primaryGenerateContent).toHaveBeenCalledTimes(1);
    expect(geminiMock.fallbackGenerateContent).not.toHaveBeenCalled();
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
