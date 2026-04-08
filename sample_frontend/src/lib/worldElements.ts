import {
  formatWorldElementLabel,
  normalizeWorldCategory,
  type GeneratedWorldElementPrompt,
  type WorldCategory,
} from "@/data/worldEngine";

export interface WorldElementContent {
  concept: string;
  mechanics: string;
  impact: string;
  tradeoffs: string;
  storyUse: string;
}

export interface WorldElementBreakdown {
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
}

export interface WorldElementRecord {
  id: string;
  category: WorldCategory;
  element: string;
  title: string;
  content: WorldElementContent;
  createdAt: string;
  updatedAt: string;
  prompt?: string;
  breakdown?: WorldElementBreakdown;
}

export interface WorldElementSceneReference {
  id: string;
  title: string;
  category: WorldCategory;
  element: string;
  prompt: string;
  summary: string;
  content: WorldElementContent;
  sentAt: string;
}

export const WORLD_ELEMENTS_STORAGE_KEY = "writeforge-world-elements";
export const WORLD_ELEMENT_SCENE_REFERENCE_KEY = "writeforge-scene-practice-world-element";

const SMALL_TITLE_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
const TITLE_BREAK_WORDS = new Set(["because", "that", "when", "where", "which", "while", "who", "with"]);

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

const toLineText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => toText(item).trim())
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const toTitleCase = (value: string) => {
  const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return words
    .map((word, index) => {
      if (index > 0 && index < words.length - 1 && SMALL_TITLE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

export const createEmptyWorldElementContent = (): WorldElementContent => ({
  concept: "",
  mechanics: "",
  impact: "",
  tradeoffs: "",
  storyUse: "",
});

export const countFilledWorldSections = (content: WorldElementContent): number =>
  Object.values(content).filter((value) => value.trim().length > 0).length;

export const suggestWorldElementTitle = (concept: string): string => {
  const cleaned = concept.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const primaryClause = cleaned.split(/[.!?]/)[0]?.split(/[,;:]/)[0]?.trim() || "";
  if (!primaryClause) return "";

  const words = primaryClause
    .split(/\s+/)
    .map((word) => word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9'-]+$/g, ""))
    .filter(Boolean);

  const selectedWords: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const normalized = word.toLowerCase();

    if (index > 0 && TITLE_BREAK_WORDS.has(normalized)) break;
    selectedWords.push(word);

    if (selectedWords.length >= 5) break;
  }

  return toTitleCase(selectedWords.join(" "));
};

const normalizeContent = (value: unknown): WorldElementContent => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    concept: toText(record.concept) || toText(record.coreConcept),
    mechanics: toText(record.mechanics),
    impact: toText(record.impact) || toLineText(record.affectedGroups),
    tradeoffs:
      toText(record.tradeoffs) ||
      [toLineText(record.costs), toLineText(record.limitations)].filter(Boolean).join("\n"),
    storyUse: toText(record.storyUse) || toLineText(record.storyConflicts),
  };
};

const normalizeBreakdown = (value: unknown): WorldElementBreakdown | undefined => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const core = toText(record.core);
  const mechanic = toText(record.mechanic);
  const impact = toText(record.impact);
  const consequence = toText(record.consequence);

  if (!core && !mechanic && !impact && !consequence) return undefined;

  return {
    core,
    mechanic,
    impact,
    consequence,
  };
};

export const normalizeWorldElementRecord = (value: unknown, index: number): WorldElementRecord => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content = normalizeContent(record.content ?? record);
  const createdAt = toText(record.createdAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;
  const title =
    toText(record.title).trim() ||
    suggestWorldElementTitle(content.concept) ||
    formatWorldElementLabel(toText(record.element)) ||
    `World Element ${index + 1}`;

  return {
    id: toText(record.id) || crypto.randomUUID(),
    category: normalizeWorldCategory(record.category),
    element: toText(record.element).trim() || "custom element",
    title,
    content,
    createdAt,
    updatedAt,
    prompt: toText(record.prompt),
    breakdown: normalizeBreakdown(record.breakdown),
  };
};

export const readStoredWorldElements = (): WorldElementRecord[] => {
  try {
    const stored = localStorage.getItem(WORLD_ELEMENTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry, index) => normalizeWorldElementRecord(entry, index))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  } catch {
    return [];
  }
};

const summarizeForSceneReference = (record: WorldElementRecord) => {
  const lines = [
    record.content.concept,
    record.content.mechanics && `Mechanics: ${record.content.mechanics}`,
    record.content.impact && `Impact: ${record.content.impact}`,
    record.content.tradeoffs && `Trade-offs: ${record.content.tradeoffs}`,
    record.content.storyUse && `Story Use: ${record.content.storyUse}`,
  ].filter(Boolean);

  return lines.join("\n\n").trim();
};

export const buildWorldElementSceneReference = (
  record: WorldElementRecord,
): WorldElementSceneReference => ({
  id: record.id,
  title: record.title,
  category: record.category,
  element: record.element,
  prompt: record.prompt || "",
  summary: summarizeForSceneReference(record),
  content: record.content,
  sentAt: new Date().toISOString(),
});

export const storeWorldElementSceneReference = (record: WorldElementRecord) => {
  try {
    localStorage.setItem(
      WORLD_ELEMENT_SCENE_REFERENCE_KEY,
      JSON.stringify(buildWorldElementSceneReference(record)),
    );
  } catch {
    // Ignore local storage failures so the editor remains usable.
  }
};

export const readStoredWorldElementSceneReference = (): WorldElementSceneReference | null => {
  try {
    const stored = localStorage.getItem(WORLD_ELEMENT_SCENE_REFERENCE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const category = normalizeWorldCategory(parsed.category);
    const content = normalizeContent(parsed.content);

    return {
      id: toText(parsed.id) || crypto.randomUUID(),
      title:
        toText(parsed.title).trim() ||
        suggestWorldElementTitle(content.concept) ||
        formatWorldElementLabel(toText(parsed.element)) ||
        "World Element Reference",
      category,
      element: toText(parsed.element).trim() || "custom element",
      prompt: toText(parsed.prompt),
      summary: toText(parsed.summary) || summarizeForSceneReference({
        id: toText(parsed.id) || crypto.randomUUID(),
        title: toText(parsed.title) || "World Element Reference",
        category,
        element: toText(parsed.element).trim() || "custom element",
        content,
        createdAt: toText(parsed.sentAt) || new Date().toISOString(),
        updatedAt: toText(parsed.sentAt) || new Date().toISOString(),
        prompt: toText(parsed.prompt),
      }),
      content,
      sentAt: toText(parsed.sentAt) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const clearStoredWorldElementSceneReference = () => {
  try {
    localStorage.removeItem(WORLD_ELEMENT_SCENE_REFERENCE_KEY);
  } catch {
    // Ignore local storage failures.
  }
};

export const buildWorldElementRecord = ({
  id,
  category,
  element,
  title,
  content,
  createdAt,
  updatedAt,
  generatedPrompt,
}: {
  id: string;
  category: WorldCategory;
  element: string;
  title: string;
  content: WorldElementContent;
  createdAt: string;
  updatedAt: string;
  generatedPrompt?: GeneratedWorldElementPrompt | null;
}): WorldElementRecord => ({
  id,
  category,
  element,
  title,
  content,
  createdAt,
  updatedAt,
  prompt: generatedPrompt?.prompt,
  breakdown: generatedPrompt
    ? {
        core: generatedPrompt.core,
        mechanic: generatedPrompt.mechanic,
        impact: generatedPrompt.impact,
        consequence: generatedPrompt.consequence,
      }
    : undefined,
});
