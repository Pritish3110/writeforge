import { describe, expect, it } from "vitest";
import {
  AI_INTENT,
  AI_ROUTE,
  SIMPLE_AI_ROUTE,
  detectIntent,
} from "@/ai/intentDetector";

describe("intentDetector", () => {
  it("supports the simple string-based API for workspace-aware queries", () => {
    const result = detectIntent("What did I write in my draft notes?");

    expect(result).toBe(SIMPLE_AI_ROUTE.RAG);
  });

  it("supports the simple string-based API for general writing help", () => {
    const result = detectIntent("Help me outline a tense chapter ending.");

    expect(result).toBe(SIMPLE_AI_ROUTE.LLM);
  });

  it("keeps general capability questions on the LLM path", () => {
    const result = detectIntent("What can you do for me?");

    expect(result).toBe(SIMPLE_AI_ROUTE.LLM);
  });

  it("keeps general creative requests on the LLM path", () => {
    const result = detectIntent("write me punchline");

    expect(result).toBe(SIMPLE_AI_ROUTE.LLM);
  });

  it("does not let a user-data hint force non-writing queries into RAG", () => {
    const result = detectIntent("What can you do for me?", [AI_INTENT.USER_DATA]);

    expect(result).toBe(SIMPLE_AI_ROUTE.LLM);
  });

  it("routes workspace-specific requests to RAG", () => {
    const result = detectIntent({
      message: "What are my saved drafts from this workspace?",
    });

    expect(result.intent).toBe(AI_INTENT.USER_DATA);
    expect(result.route).toBe(AI_ROUTE.RAG);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("routes general writing help to the LLM", () => {
    const result = detectIntent({
      message: "Help me write a stronger opening line for a fantasy chapter.",
    });

    expect(result.intent).toBe(AI_INTENT.GENERAL);
    expect(result.route).toBe(AI_ROUTE.LLM);
  });
});
