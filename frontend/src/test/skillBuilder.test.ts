import { describe, expect, it } from "vitest";
import {
  buildDailyChallengeTask,
  buildRuleBasedImprovement,
  getImprovementChecklist,
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

  it("creates a deterministic rewrite and checklist", () => {
    const rewrite = buildRuleBasedImprovement(
      "He was as strong as a bull. He never flinched.",
      simileTopic,
    );
    const checklist = getImprovementChecklist(simileTopic);

    expect(rewrite).toContain("raging bull");
    expect(rewrite).toContain("arena");
    expect(checklist).toHaveLength(3);
  });

  it("adds a subject and context when the draft starts abruptly", () => {
    const rewrite = buildRuleBasedImprovement("Strong as a bull.", simileTopic);

    expect(rewrite).toContain("The figure");
    expect(rewrite).toContain("raging bull");
    expect(rewrite).toContain("arena");
  });

  it("repairs broken opening grammar without changing the scene intent", () => {
    const rewrite = buildRuleBasedImprovement(
      "He in the heart of battle stood like stone.",
      simileTopic,
    );

    expect(rewrite).toContain("In the heart of battle");
    expect(rewrite).toContain("unyielding stone");
  });
});
