import { describe, expect, it } from "vitest";
import {
  WORLD_ELEMENT_OPTIONS,
  generateWorldElementPrompt,
  getRandomWorldSelection,
} from "@/data/worldEngine";
import {
  buildWorldElementRecord,
  createEmptyWorldElementContent,
  suggestWorldElementTitle,
} from "@/lib/worldElements";

describe("worldEngine", () => {
  it("generates a fully resolved world prompt", () => {
    const result = generateWorldElementPrompt({ category: "magic" });

    expect(result.category).toBe("magic");
    expect(WORLD_ELEMENT_OPTIONS.magic).toContain(result.element);
    expect(result.prompt).not.toContain("{");
    expect(result.prompt.toLowerCase()).toContain("magic");
    expect(result.prompt.toLowerCase()).toContain(result.element);
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.core.trim().length).toBeGreaterThan(0);
    expect(result.mechanic.trim().length).toBeGreaterThan(0);
    expect(result.impact.trim().length).toBeGreaterThan(0);
    expect(result.consequence.trim().length).toBeGreaterThan(0);
  });

  it("returns an element that belongs to the selected category", () => {
    const selection = getRandomWorldSelection("cultural");

    expect(selection.category).toBe("cultural");
    expect(WORLD_ELEMENT_OPTIONS.cultural).toContain(selection.element);
  });
});

describe("worldElements helpers", () => {
  it("suggests a readable title from the concept", () => {
    expect(suggestWorldElementTitle("bioluminescent trees that store moonlight for winter")).toBe(
      "Bioluminescent Trees",
    );
  });

  it("stores generated prompt breakdown on saved records", () => {
    const generatedPrompt = generateWorldElementPrompt({ category: "physical" });
    const record = buildWorldElementRecord({
      id: "world-1",
      category: "physical",
      element: "flora",
      title: "Moonroot Forest",
      content: {
        ...createEmptyWorldElementContent(),
        concept: "A forest of roots that drink starlight.",
      },
      createdAt: "2026-04-04T00:00:00.000Z",
      updatedAt: "2026-04-04T00:00:00.000Z",
      generatedPrompt,
    });

    expect(record.prompt).toBe(generatedPrompt.prompt);
    expect(record.breakdown).toEqual({
      core: generatedPrompt.core,
      mechanic: generatedPrompt.mechanic,
      impact: generatedPrompt.impact,
      consequence: generatedPrompt.consequence,
    });
  });
});
