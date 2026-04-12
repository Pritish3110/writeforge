import { describe, expect, it } from "vitest";
import {
  PROMPT_TONES,
  STORY_PHASES,
  generateSmartPrompt,
  resetUsedPrompts,
} from "@/lib/promptEngine";

describe("promptEngine", () => {
  it("exposes the expanded tone list for scene practice", () => {
    expect(PROMPT_TONES).toEqual(
      expect.arrayContaining(["romantic", "horror", "hopeful", "comedic"]),
    );
  });

  it("enhances a base prompt without dropping the original task goal", () => {
    resetUsedPrompts();

    const result = generateSmartPrompt({
      basePrompt: "Write a confrontation where two siblings circle around an old betrayal",
      tone: "mystery",
      character: "Kael",
      phase: "Payoff",
      avoidRepeat: true,
    });

    expect(result.prompt).toContain("Write a confrontation where two siblings circle around an old betrayal");
    expect(result.prompt).toContain("Keep the original exercise goal at the center of the scene");
    expect(result.tone).toBe("mystery");
    expect(result.phase).toBe("Payoff");
    expect(result.characterLabel).toBe("Kael");
    expect(result.tags).toContain("enhanced");
  });

  it("supports open-ended filters by resolving to valid prompt metadata", () => {
    resetUsedPrompts();

    const result = generateSmartPrompt({
      basePrompt: "Turn this task into a stronger dramatic writing challenge",
      tone: null,
      character: null,
      phase: null,
      avoidRepeat: false,
    });

    expect(PROMPT_TONES).toContain(result.tone);
    expect(STORY_PHASES).toContain(result.phase);
    expect(result.prompt.length).toBeGreaterThan(0);
  });

  it("generates prompts for newly added tones", () => {
    resetUsedPrompts();

    const result = generateSmartPrompt({
      tone: "hopeful",
      character: "Iris",
      phase: "Promise",
      avoidRepeat: false,
    });

    expect(result.tone).toBe("hopeful");
    expect(result.phase).toBe("Promise");
    expect(result.characterLabel).toBe("Iris");
    expect(result.prompt.length).toBeGreaterThan(0);
  });
});
