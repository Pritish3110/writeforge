import { sortCharactersByPriority } from "@/lib/characterPriority";

export const CHARACTER_RELATIONSHIP_STORAGE_KEY = "writeforge-character-relationships";
export const CHARACTER_RELATIONSHIP_TEMPLATE_STORAGE_KEY =
  "writeforge-character-relationship-templates";

export const RELATIONSHIP_TYPES = [
  {
    value: "Ally",
    color: "hsl(var(--neon-cyan))",
    background: "hsl(var(--neon-cyan) / 0.12)",
    border: "hsl(var(--neon-cyan) / 0.35)",
  },
  {
    value: "Enemy",
    color: "hsl(var(--neon-pink))",
    background: "hsl(var(--neon-pink) / 0.12)",
    border: "hsl(var(--neon-pink) / 0.35)",
  },
  {
    value: "Mentor",
    color: "hsl(var(--neon-purple))",
    background: "hsl(var(--neon-purple) / 0.14)",
    border: "hsl(var(--neon-purple) / 0.4)",
  },
  {
    value: "Family",
    color: "hsl(38 92% 58%)",
    background: "hsl(38 92% 58% / 0.12)",
    border: "hsl(38 92% 58% / 0.35)",
  },
  {
    value: "Unknown",
    color: "hsl(var(--muted-foreground))",
    background: "hsl(var(--muted) / 0.7)",
    border: "hsl(var(--border))",
  },
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]["value"];

export interface RelationshipCharacter {
  id: string;
  name: string;
  type: string;
  logline: string;
  pinned: boolean;
}

export interface RelationshipTimelineEntry {
  id: string;
  label: string;
  note: string;
}

export interface CharacterRelationship {
  id: string;
  characterAId: string;
  characterBId: string;
  type: RelationshipType;
  description: string;
  strength: number;
  timeline: RelationshipTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipFormState {
  characterAId: string;
  characterBId: string;
  type: RelationshipType;
  description: string;
  strength: number;
  timeline: RelationshipTimelineEntry[];
}

export interface RelationshipGraphTemplate {
  id: string;
  title: string;
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

const RELATIONSHIP_TYPE_SET = new Set<string>(RELATIONSHIP_TYPES.map((type) => type.value));

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const isRelationshipType = (value: unknown): value is RelationshipType =>
  typeof value === "string" && RELATIONSHIP_TYPE_SET.has(value);

export const createTimelineEntry = (): RelationshipTimelineEntry => ({
  id: crypto.randomUUID(),
  label: "",
  note: "",
});

export const createRelationshipFormState = (
  characters: RelationshipCharacter[],
): RelationshipFormState => ({
  characterAId: characters[0]?.id || "",
  characterBId: characters[1]?.id || characters[0]?.id || "",
  type: "Unknown",
  description: "",
  strength: 55,
  timeline: [createTimelineEntry()],
});

const normalizeTimelineEntry = (value: unknown): RelationshipTimelineEntry => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || crypto.randomUUID(),
    label: toText(record.label),
    note: toText(record.note),
  };
};

export const normalizeRelationshipCharacter = (
  value: unknown,
  fallbackIndex: number,
): RelationshipCharacter => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || `character-${fallbackIndex + 1}`,
    name: toText(record.name) || `Character ${fallbackIndex + 1}`,
    type: toText(record.type),
    logline: toText(record.logline),
    pinned: record.pinned === true,
  };
};

export const normalizeRelationshipCharacters = (
  value: unknown,
): RelationshipCharacter[] => {
  if (!Array.isArray(value) || value.length === 0) return [];

  return sortCharactersByPriority(
    value
      .map((character, index) => normalizeRelationshipCharacter(character, index))
      .filter((character) => character.name.trim().length > 0),
  );
};

export const normalizeCharacterRelationship = (
  value: unknown,
  fallbackIndex: number,
): CharacterRelationship => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const createdAt = toText(record.createdAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;
  const timeline = Array.isArray(record.timeline)
    ? record.timeline.map(normalizeTimelineEntry)
    : [];

  return {
    id: toText(record.id) || `relationship-${fallbackIndex + 1}`,
    characterAId: toText(record.characterAId),
    characterBId: toText(record.characterBId),
    type: isRelationshipType(record.type) ? record.type : "Unknown",
    description: toText(record.description),
    strength: clamp(toNumber(record.strength, 55), 1, 100),
    timeline: timeline.length > 0 ? timeline : [createTimelineEntry()],
    createdAt,
    updatedAt,
  };
};

export const normalizeCharacterRelationships = (
  value: unknown,
): CharacterRelationship[] =>
  Array.isArray(value)
    ? value.map((relationship, index) =>
        normalizeCharacterRelationship(relationship, index),
      )
    : [];

export const normalizeRelationshipGraphTemplate = (
  value: unknown,
  fallbackIndex: number,
): RelationshipGraphTemplate => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const createdAt = toText(record.createdAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;

  return {
    id: toText(record.id) || `relationship-template-${fallbackIndex + 1}`,
    title: toText(record.title).trim() || `Relationship Template ${fallbackIndex + 1}`,
    characterIds: normalizeStringArray(record.characterIds),
    createdAt,
    updatedAt,
  };
};

export const normalizeRelationshipGraphTemplates = (
  value: unknown,
): RelationshipGraphTemplate[] =>
  Array.isArray(value)
    ? value
        .map((template, index) => normalizeRelationshipGraphTemplate(template, index))
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )
    : [];

export const getRelationshipTypeStyle = (type: RelationshipType) =>
  RELATIONSHIP_TYPES.find((item) => item.value === type) || RELATIONSHIP_TYPES[4];

export const isSameRelationshipPair = (
  leftAId: string,
  leftBId: string,
  rightAId: string,
  rightBId: string,
) =>
  (leftAId === rightAId && leftBId === rightBId) ||
  (leftAId === rightBId && leftBId === rightAId);
