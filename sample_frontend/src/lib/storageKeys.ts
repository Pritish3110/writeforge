export const WRITEFORGE_THEME_KEY = "writeforge-theme";
export const WRITEFORGE_TASKS_KEY = "writeforge-tasks";
export const WRITEFORGE_CUSTOM_TASKS_KEY = "writeforge-custom-tasks";
export const WRITEFORGE_TASK_TEMPLATES_KEY = "taskTemplates";
export const WRITEFORGE_CHARACTERS_KEY = "writeforge-characters";
export const WRITEFORGE_CHARACTER_SEED_VERSION_KEY = "writeforge-character-seed-version";
export const WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY = "writeforge-character-relationships";
export const WRITEFORGE_PLOT_BUILDER_KEY = "writeforge-plot-builder";
export const WRITEFORGE_DRAFTS_KEY = "writeforge-drafts";
export const WRITEFORGE_WORLD_ELEMENTS_KEY = "writeforge-world-elements";
export const WRITEFORGE_SCENE_WORLD_REFERENCE_KEY = "writeforge-scene-practice-world-element";
export const WRITEFORGE_KNOWLEDGE_BASE_KEY = "writeforge-knowledge-base";
export const WRITEFORGE_LEGACY_KAEL_SEEDED_KEY = "writeforge-kael-seeded";

export const MIGRATABLE_STORAGE_KEYS = [
  WRITEFORGE_THEME_KEY,
  WRITEFORGE_TASKS_KEY,
  WRITEFORGE_CUSTOM_TASKS_KEY,
  WRITEFORGE_TASK_TEMPLATES_KEY,
  WRITEFORGE_CHARACTERS_KEY,
  WRITEFORGE_CHARACTER_SEED_VERSION_KEY,
  WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY,
  WRITEFORGE_PLOT_BUILDER_KEY,
  WRITEFORGE_DRAFTS_KEY,
  WRITEFORGE_WORLD_ELEMENTS_KEY,
  WRITEFORGE_KNOWLEDGE_BASE_KEY,
] as const;

export const LOCAL_ONLY_STORAGE_KEYS = [
  WRITEFORGE_SCENE_WORLD_REFERENCE_KEY,
] as const;

export const WRITEFORGE_STORAGE_KEYS = [
  ...MIGRATABLE_STORAGE_KEYS,
  ...LOCAL_ONLY_STORAGE_KEYS,
] as const;

export const CURRENT_WRITEFORGE_MIGRATION_VERSION = 1;

export type MigratableStorageKey = (typeof MIGRATABLE_STORAGE_KEYS)[number];
export type LocalOnlyStorageKey = (typeof LOCAL_ONLY_STORAGE_KEYS)[number];
export type WriteForgeStorageKey = (typeof WRITEFORGE_STORAGE_KEYS)[number];

export interface WriteForgeSnapshot {
  [WRITEFORGE_THEME_KEY]?: string;
  [WRITEFORGE_TASKS_KEY]?: unknown[];
  [WRITEFORGE_CUSTOM_TASKS_KEY]?: unknown[];
  [WRITEFORGE_TASK_TEMPLATES_KEY]?: unknown[];
  [WRITEFORGE_CHARACTERS_KEY]?: unknown[];
  [WRITEFORGE_CHARACTER_SEED_VERSION_KEY]?: number;
  [WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY]?: unknown[];
  [WRITEFORGE_PLOT_BUILDER_KEY]?: unknown[];
  [WRITEFORGE_DRAFTS_KEY]?: unknown[];
  [WRITEFORGE_WORLD_ELEMENTS_KEY]?: unknown[];
  [WRITEFORGE_SCENE_WORLD_REFERENCE_KEY]?: unknown | null;
  [WRITEFORGE_KNOWLEDGE_BASE_KEY]?: unknown[];
}

const storageKeySet = new Set<string>(WRITEFORGE_STORAGE_KEYS);
const migratableStorageKeySet = new Set<string>(MIGRATABLE_STORAGE_KEYS);
const localOnlyStorageKeySet = new Set<string>(LOCAL_ONLY_STORAGE_KEYS);

export const isWriteForgeStorageKey = (value: string): value is WriteForgeStorageKey =>
  storageKeySet.has(value);

export const isMigratableStorageKey = (value: string): value is MigratableStorageKey =>
  migratableStorageKeySet.has(value);

export const isLocalOnlyStorageKey = (value: string): value is LocalOnlyStorageKey =>
  localOnlyStorageKeySet.has(value);
