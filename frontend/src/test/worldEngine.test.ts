import { describe, expect, it } from "vitest";
import {
  WORLD_ELEMENT_OPTIONS,
  WORLD_ELEMENT_PROMPT_BANKS,
  WORLD_TEMPLATES,
  generateWorldElementPrompt,
  getRandomWorldSelection,
} from "@/data/worldEngine";
import {
  buildWorldElementRecord,
  createEmptyWorldElementContent,
  suggestWorldElementTitle,
} from "@/lib/worldElements";

describe("worldEngine", () => {
  it("exposes expanded element options for each world category", () => {
    expect(WORLD_ELEMENT_OPTIONS.physical).toEqual(
      expect.arrayContaining(["rivers", "caves", "biomes"]),
    );
    expect(WORLD_ELEMENT_OPTIONS.cultural).toEqual(
      expect.arrayContaining(["family structure", "storytelling traditions", "currency"]),
    );
    expect(WORLD_ELEMENT_OPTIONS.magic).toEqual(
      expect.arrayContaining(["divination", "summoning", "magic detection"]),
    );
  });

  it("keeps element options and templates free of exact duplicates", () => {
    Object.values(WORLD_ELEMENT_OPTIONS).forEach((items) => {
      expect(new Set(items).size).toBe(items.length);
    });

    expect(new Set(WORLD_TEMPLATES).size).toBe(WORLD_TEMPLATES.length);
  });

  it("provides an element-specific prompt bank for every built-in world element", () => {
    Object.entries(WORLD_ELEMENT_OPTIONS).forEach(([category, items]) => {
      items.forEach((element) => {
        const bank = WORLD_ELEMENT_PROMPT_BANKS[category as keyof typeof WORLD_ELEMENT_PROMPT_BANKS][element];

        expect(bank).toBeDefined();
        expect(bank.templates.length).toBeGreaterThan(0);
        expect(bank.cores.length).toBeGreaterThan(0);
        expect(bank.mechanics.length).toBeGreaterThan(0);
        expect(bank.impacts.length).toBeGreaterThan(0);
        expect(bank.consequences.length).toBeGreaterThan(0);
      });
    });
  });

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

  it("honors the currently selected element when generating a prompt", () => {
    const result = generateWorldElementPrompt({
      category: "magic",
      element: "teleportation",
    });
    const promptBank = WORLD_ELEMENT_PROMPT_BANKS.magic.teleportation;

    expect(result.category).toBe("magic");
    expect(result.element).toBe("teleportation");
    expect(result.prompt.toLowerCase()).toContain("teleportation");
    expect(promptBank.cores).toContain(result.core);
    expect(promptBank.mechanics).toContain(result.mechanic);
    expect(promptBank.impacts).toContain(result.impact);
    expect(promptBank.consequences).toContain(result.consequence);
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
