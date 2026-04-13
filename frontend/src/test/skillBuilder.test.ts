import { describe, expect, it } from "vitest";
import { buildSkillBuilderImprovementPrompt } from "@/lib/promptEngine";
import {
  buildCoachFallback,
  buildDailyChallengeTask,
  validateSkillBuilderDraft,
} from "@/lib/skillBuilder";
import type { LearningTopic } from "@/services/learningClient";

const simileTopic: LearningTopic = {
  id: "simile",
  order: 1,
  title: "Simile",
  definition: "Comparison using like or as",
  conceptGuide: {
    what: "A simile compares two things with like or as.",
    why: "It makes description easier to picture.",
    steps: ["Pick an image", "Connect with like or as"],
    examples: ["As brave as a lion", "Runs like the wind"],
  },
  examples: ["As brave as a lion", "Runs like the wind"],
  themeId: "figuresOfSpeech",
  themeTitle: "Figures Of Speech",
};

describe("skillBuilder helpers", () => {
  it("validates for multi-sentence writing", () => {
    const invalid = validateSkillBuilderDraft("As brave as a lion.");
    const valid = validateSkillBuilderDraft(
      "She stood as brave as a lion in the storm. Her voice stayed steady even when the crowd turned uneasy.",
    );

    expect(invalid.isValid).toBe(false);
    expect(valid.isValid).toBe(true);
    expect(valid.sentenceCount).toBe(2);
  });

  it("builds a daily challenge task from the topic data", () => {
    const task = buildDailyChallengeTask(
      simileTopic,
      [
        { id: "simile", title: "Simile" },
        { id: "metaphor", title: "Metaphor" },
        { id: "hyperbole", title: "Hyperbole" },
      ],
      "2026-04-13",
    );

    expect(["write", "identify", "transform"]).toContain(task.type);
    expect(task.prompt.length).toBeGreaterThan(10);
  });

  it("creates the coaching prompt and fallback rewrite", () => {
    const prompt = buildSkillBuilderImprovementPrompt({
      topicTitle: "Simile",
      content: "He was as strong as a bull. He never flinched.",
    });
    const fallback = buildCoachFallback(
      "He was as strong as a bull. He never flinched.",
      simileTopic,
    );

    expect(prompt).toContain("You are a writing coach.");
    expect(prompt).toContain("Simile");
    expect(fallback.length).toBeGreaterThan(20);
  });
});
