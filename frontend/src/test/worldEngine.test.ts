import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatWorldElementLabel,
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(result.prompt).not.toContain("Rules:");
    expect(result.prompt).not.toContain("Use simple and clear language");
    expect(result.description.trim().length).toBeGreaterThan(0);
    expect(result.prompt).toContain(result.title);
    expect(result.prompt).toContain(result.description);
    expect(result.prompt).toContain("- Core:");
    expect(result.prompt).toContain("- Mechanic:");
    expect(result.prompt).toContain("- Impact:");
    expect(result.prompt).toContain("- Consequence:");
    expect(result.prompt).toContain("Tags:");
    expect(result.prompt).toContain(" · ");
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.title.startsWith(formatWorldElementLabel(result.element))).toBe(true);
    expect(result.core.trim().length).toBeGreaterThan(0);
    expect(result.mechanic.trim().length).toBeGreaterThan(0);
    expect(result.impact.trim().length).toBeGreaterThan(0);
    expect(result.consequence.trim().length).toBeGreaterThan(0);
    [result.core, result.mechanic, result.impact, result.consequence].forEach((point) => {
      expect(point).toMatch(/^[A-Z]/);
      expect(point).toMatch(/[.]$/);
      expect(point.split(/\s+/).length).toBeLessThanOrEqual(15);
    });
    expect(result.tags.length).toBeGreaterThanOrEqual(6);
    expect(result.tags.length).toBeLessThanOrEqual(8);
    result.tags.forEach((tag) => {
      expect(tag.split(/\s+/).length).toBeLessThanOrEqual(2);
      expect(tag).not.toMatch(/[.,;:!?]/);
    });
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
    expect(result.description.toLowerCase()).toContain("teleportation");
    expect(promptBank.cores.some((entry) => result.description.toLowerCase().includes(entry.toLowerCase()))).toBe(true);
    expect(result.core.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(result.mechanic.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(result.impact.split(/\s+/).length).toBeLessThanOrEqual(15);
    expect(result.consequence.split(/\s+/).length).toBeLessThanOrEqual(15);
  });

  it("changes wording when different predefined templates are selected", () => {
    const randomSpy = vi.spyOn(Math, "random");
    randomSpy
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01);

    const first = generateWorldElementPrompt({
      category: "magic",
      element: "teleportation",
    });

    randomSpy.mockReset();
    randomSpy
      .mockReturnValueOnce(0.34)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01)
      .mockReturnValueOnce(0.01);

    const second = generateWorldElementPrompt({
      category: "magic",
      element: "teleportation",
    });

    expect(first.description).not.toBe(second.description);
    expect(first.core).not.toBe(second.core);
    expect(first.mechanic).not.toBe(second.mechanic);
  });

  it("returns an element that belongs to the selected category", () => {
    const selection = getRandomWorldSelection("cultural");

    expect(selection.category).toBe("cultural");
    expect(WORLD_ELEMENT_OPTIONS.cultural).toContain(selection.element);
  });

  it("supports custom categories with freeform elements", () => {
    const result = generateWorldElementPrompt({
      category: "custom",
      element: "sentient weather archives",
    });

    expect(result.category).toBe("custom");
    expect(result.element).toBe("sentient weather archives");
    expect(result.description.toLowerCase()).toContain("sentient weather archives");
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.tags.length).toBeGreaterThanOrEqual(6);
  });

  it("interprets infrastructure-like custom input before generating the prompt", () => {
    const result = generateWorldElementPrompt({
      category: "custom",
      element: "laundry system",
    });

    expect(result.category).toBe("custom");
    expect(result.interpretation).toMatchObject({
      type: "infrastructure system",
      domain: "social / physical",
      function: "cleaning and upkeep",
    });
    expect(result.core.trim().length).toBeGreaterThan(0);
    expect(result.description).toContain("Laundry System");
    expect(result.description).toContain("infrastructure system");
    expect(result.prompt).not.toContain("Keep sentences short.");
    expect(result.core).toMatch(/[.]$/);
    expect(result.tags).toContain("laundry system");
  });

  it("interprets social-group custom input instead of falling back to random prompt parts", () => {
    const result = generateWorldElementPrompt({
      category: "custom",
      element: "blind people",
    });

    expect(result.interpretation).toMatchObject({
      type: "social group",
      domain: "cultural / civic",
      function: "perception and access",
    });
    expect(result.mechanic.toLowerCase()).not.toContain("ley-line");
    expect(result.impact.toLowerCase()).toMatch(/architecture|law|education|social/);
    expect(result.description.toLowerCase()).toContain("blind people");
    expect(result.tags).toContain("blind people");
    expect(new Set(result.tags).size).toBe(result.tags.length);
  });

  it("anchors common custom concepts in real-world meaning before adapting them", () => {
    const result = generateWorldElementPrompt({
      category: "custom",
      element: "sports",
    });

    expect(result.interpretation).toMatchObject({
      type: "cultural system",
      categoryBias: "cultural",
      function: "status and competition",
    });
    expect(result.description.toLowerCase()).toContain("organized competition");
    expect(result.description.toLowerCase()).toMatch(/status|identity|social mobility/);
    expect(result.core.toLowerCase()).toMatch(/competition|contests|athletic/);
    expect(result.tags).toContain("sports");
  });

  it("keeps random world selection on built-in categories", () => {
    const selection = getRandomWorldSelection("custom");

    expect(["physical", "cultural", "magic"]).toContain(selection.category);
    expect(WORLD_ELEMENT_OPTIONS[selection.category]).toContain(selection.element);
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
    expect(record.description).toBe(generatedPrompt.description);
    expect(record.tags).toEqual(generatedPrompt.tags);
    expect(record.breakdown).toEqual({
      core: generatedPrompt.core,
      mechanic: generatedPrompt.mechanic,
      impact: generatedPrompt.impact,
      consequence: generatedPrompt.consequence,
    });
  });
});
