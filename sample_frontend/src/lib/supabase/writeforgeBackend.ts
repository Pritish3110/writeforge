import type { User, SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseSession } from "@/lib/supabase/client";
import {
  CURRENT_WRITEFORGE_MIGRATION_VERSION,
  WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY,
  WRITEFORGE_CHARACTER_SEED_VERSION_KEY,
  WRITEFORGE_CHARACTERS_KEY,
  WRITEFORGE_CUSTOM_TASKS_KEY,
  WRITEFORGE_DRAFTS_KEY,
  WRITEFORGE_KNOWLEDGE_BASE_KEY,
  WRITEFORGE_PLOT_BUILDER_KEY,
  WRITEFORGE_TASKS_KEY,
  WRITEFORGE_TASK_TEMPLATES_KEY,
  WRITEFORGE_THEME_KEY,
  WRITEFORGE_WORLD_ELEMENTS_KEY,
  type WriteForgeSnapshot,
} from "@/lib/storageKeys";
import { buildMigratablePayload } from "@/lib/writeforgeStorage";

interface UserSettingsRow {
  theme: string | null;
  character_seed_version: number | null;
  backend_enabled: boolean | null;
  migrated: boolean | null;
  migration_version: number | null;
  migration_completed_at: string | null;
  last_snapshot_synced_at: string | null;
}

interface TaskRow {
  task_id: string;
  week_key: string;
  completed: boolean;
  completed_on: string | null;
}

interface CustomTaskRow {
  original_id: string;
  title: string;
  category: string;
  duration_minutes: number;
  prompt: string;
  steps: unknown;
  important_rules: unknown;
  assigned_day: string;
  saved_as_template: boolean;
  position_order: number;
  created_at: string;
  updated_at: string;
}

interface TaskTemplateRow {
  original_id: string;
  name: string;
  tasks: unknown;
}

interface CharacterRow {
  original_id: string;
  name: string;
  character_type: string;
  logline: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
  truth: string;
  designing_principle: string;
  moral_problem: string;
  worthy_cause: string;
  personality_traits: unknown;
  theme: unknown;
  contradictions: unknown;
  pinned: boolean;
  position_order: number;
}

interface CharacterRelationshipRow {
  original_id: string;
  character_a_original_id: string;
  character_b_original_id: string;
  relationship_type: string;
  description: string;
  strength: number;
  timeline: unknown;
  created_at: string;
  updated_at: string;
}

interface PlotPointRow {
  original_id: string;
  phase: string;
  title: string;
  description: string;
  character_ids: string[] | null;
  scene_ids: string[] | null;
  stakes: string;
  conflict_level: number;
  foreshadowing_ids: string[] | null;
  position_order: number;
  created_at: string;
  updated_at: string;
}

interface DraftRow {
  original_id: string;
  title: string;
  draft_type: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  saved_at: string;
}

interface WorldElementRow {
  original_id: string;
  category: string;
  element: string;
  title: string;
  content: unknown;
  prompt: string | null;
  breakdown: unknown;
  created_at: string;
  updated_at: string;
}

interface KnowledgeBaseSectionRow {
  original_id: string;
  title: string;
  items: string[] | null;
  position_order: number;
}

export interface WriteForgeRemoteMeta {
  backendEnabled: boolean;
  hasRemoteData: boolean;
  migrated: boolean;
  migrationCompleted: boolean;
  migrationVersion: number;
  lastSnapshotSyncedAt: string | null;
}

export interface WriteForgeRemoteLoadResult {
  snapshot: WriteForgeSnapshot;
  meta: WriteForgeRemoteMeta;
}

interface WriteForgeMigrationRpcResult {
  migrated?: boolean | null;
  reason?: string | null;
  skipped?: boolean | null;
}

export interface WriteForgeMigrationResult {
  migrated: boolean;
  reason: string | null;
  skipped: boolean;
}

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const toBoolean = (value: unknown): boolean => value === true;
const toArray = <T = unknown,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const getSupabaseUser = async (
  client: SupabaseClient,
): Promise<User | null> => {
  await requireSupabaseSession(client);

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  return user ?? null;
};

const buildTasksSnapshot = (rows: TaskRow[]) =>
  rows.map((row) => ({
    taskId: row.task_id,
    weekKey: row.week_key,
    completed: toBoolean(row.completed),
    completedOn: row.completed ? row.completed_on : null,
  }));

const buildCustomTasksSnapshot = (rows: CustomTaskRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    title: row.title,
    category: row.category,
    durationMinutes: toNumber(row.duration_minutes, 10),
    prompt: row.prompt,
    steps: toArray(row.steps),
    importantRules: toArray(row.important_rules),
    assignedDay: row.assigned_day,
    savedAsTemplate: toBoolean(row.saved_as_template),
    order: toNumber(row.position_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

const buildTaskTemplatesSnapshot = (rows: TaskTemplateRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    name: row.name,
    tasks: toArray(row.tasks),
  }));

const buildCharactersSnapshot = (rows: CharacterRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    name: row.name,
    type: row.character_type,
    logline: row.logline,
    ghost: row.ghost,
    lie: row.lie,
    want: row.want,
    need: row.need,
    truth: row.truth,
    designing_principle: row.designing_principle,
    moral_problem: row.moral_problem,
    worthy_cause: row.worthy_cause,
    personality_traits: toArray(row.personality_traits),
    theme: toObject(row.theme),
    contradictions: toArray(row.contradictions),
    pinned: toBoolean(row.pinned),
    order: toNumber(row.position_order),
  }));

const buildCharacterRelationshipsSnapshot = (rows: CharacterRelationshipRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    characterAId: row.character_a_original_id,
    characterBId: row.character_b_original_id,
    type: row.relationship_type,
    description: row.description,
    strength: toNumber(row.strength, 55),
    timeline: toArray(row.timeline),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

const buildPlotPointsSnapshot = (rows: PlotPointRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    phase: row.phase,
    title: row.title,
    description: row.description,
    characterIds: toArray<string>(row.character_ids),
    sceneIds: toArray<string>(row.scene_ids),
    stakes: row.stakes,
    conflictLevel: toNumber(row.conflict_level, 55),
    foreshadowingIds: toArray<string>(row.foreshadowing_ids),
    order: toNumber(row.position_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

const buildDraftsSnapshot = (rows: DraftRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    title: row.title,
    type: row.draft_type,
    content: row.content,
    text: row.content,
    wordCount: toNumber(row.word_count, 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    savedAt: row.saved_at,
  }));

const buildWorldElementsSnapshot = (rows: WorldElementRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    category: row.category,
    element: row.element,
    title: row.title,
    content: toObject(row.content),
    prompt: toText(row.prompt),
    breakdown: row.breakdown ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

const buildKnowledgeBaseSnapshot = (rows: KnowledgeBaseSectionRow[]) =>
  rows.map((row) => ({
    id: row.original_id,
    title: row.title,
    items: toArray<string>(row.items),
  }));

export const loadWriteForgeSnapshot = async (
  client: SupabaseClient,
  userId: string,
): Promise<WriteForgeRemoteLoadResult> => {
  await requireSupabaseSession(client);

  const [
    settingsResult,
    tasksResult,
    customTasksResult,
    templatesResult,
    charactersResult,
    relationshipsResult,
    plotPointsResult,
    draftsResult,
    worldElementsResult,
    knowledgeBaseResult,
  ] = await Promise.all([
    client
      .from("user_settings")
      .select("theme, character_seed_version, backend_enabled, migrated, migration_version, migration_completed_at, last_snapshot_synced_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("tasks")
      .select("task_id, week_key, completed, completed_on")
      .eq("user_id", userId)
      .order("week_key", { ascending: true })
      .order("task_id", { ascending: true }),
    client
      .from("custom_tasks")
      .select("original_id, title, category, duration_minutes, prompt, steps, important_rules, assigned_day, saved_as_template, position_order, created_at, updated_at")
      .eq("user_id", userId)
      .order("position_order", { ascending: true })
      .order("title", { ascending: true }),
    client
      .from("task_templates")
      .select("original_id, name, tasks")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    client
      .from("characters")
      .select("original_id, name, character_type, logline, ghost, lie, want, need, truth, designing_principle, moral_problem, worthy_cause, personality_traits, theme, contradictions, pinned, position_order")
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("position_order", { ascending: true })
      .order("name", { ascending: true }),
    client
      .from("character_relationships")
      .select("original_id, character_a_original_id, character_b_original_id, relationship_type, description, strength, timeline, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client
      .from("plot_points")
      .select("original_id, phase, title, description, character_ids, scene_ids, stakes, conflict_level, foreshadowing_ids, position_order, created_at, updated_at")
      .eq("user_id", userId)
      .order("phase", { ascending: true })
      .order("position_order", { ascending: true }),
    client
      .from("drafts")
      .select("original_id, title, draft_type, content, word_count, created_at, updated_at, saved_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client
      .from("world_elements")
      .select("original_id, category, element, title, content, prompt, breakdown, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    client
      .from("knowledge_base_sections")
      .select("original_id, title, items, position_order")
      .eq("user_id", userId)
      .order("position_order", { ascending: true }),
  ]);

  [
    settingsResult,
    tasksResult,
    customTasksResult,
    templatesResult,
    charactersResult,
    relationshipsResult,
    plotPointsResult,
    draftsResult,
    worldElementsResult,
    knowledgeBaseResult,
  ].forEach((result) => {
    if (result.error) {
      throw result.error;
    }
  });

  const settings = (settingsResult.data || null) as UserSettingsRow | null;
  const tasks = (tasksResult.data || []) as TaskRow[];
  const customTasks = (customTasksResult.data || []) as CustomTaskRow[];
  const templates = (templatesResult.data || []) as TaskTemplateRow[];
  const characters = (charactersResult.data || []) as CharacterRow[];
  const relationships = (relationshipsResult.data || []) as CharacterRelationshipRow[];
  const plotPoints = (plotPointsResult.data || []) as PlotPointRow[];
  const drafts = (draftsResult.data || []) as DraftRow[];
  const worldElements = (worldElementsResult.data || []) as WorldElementRow[];
  const knowledgeBase = (knowledgeBaseResult.data || []) as KnowledgeBaseSectionRow[];

  const snapshot: WriteForgeSnapshot = {};

  if (settings?.theme) {
    snapshot[WRITEFORGE_THEME_KEY] = settings.theme;
  }

  if (typeof settings?.character_seed_version === "number") {
    snapshot[WRITEFORGE_CHARACTER_SEED_VERSION_KEY] = settings.character_seed_version;
  }

  if (tasks.length > 0) {
    snapshot[WRITEFORGE_TASKS_KEY] = buildTasksSnapshot(tasks);
  }

  if (customTasks.length > 0) {
    snapshot[WRITEFORGE_CUSTOM_TASKS_KEY] = buildCustomTasksSnapshot(customTasks);
  }

  if (templates.length > 0) {
    snapshot[WRITEFORGE_TASK_TEMPLATES_KEY] = buildTaskTemplatesSnapshot(templates);
  }

  if (characters.length > 0) {
    snapshot[WRITEFORGE_CHARACTERS_KEY] = buildCharactersSnapshot(characters);
  }

  if (relationships.length > 0) {
    snapshot[WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY] = buildCharacterRelationshipsSnapshot(relationships);
  }

  if (plotPoints.length > 0) {
    snapshot[WRITEFORGE_PLOT_BUILDER_KEY] = buildPlotPointsSnapshot(plotPoints);
  }

  if (drafts.length > 0) {
    snapshot[WRITEFORGE_DRAFTS_KEY] = buildDraftsSnapshot(drafts);
  }

  if (worldElements.length > 0) {
    snapshot[WRITEFORGE_WORLD_ELEMENTS_KEY] = buildWorldElementsSnapshot(worldElements);
  }

  if (knowledgeBase.length > 0) {
    snapshot[WRITEFORGE_KNOWLEDGE_BASE_KEY] = buildKnowledgeBaseSnapshot(knowledgeBase);
  }

  const hasSettingsData =
    Boolean(settings?.theme) ||
    typeof settings?.character_seed_version === "number" ||
    settings?.migrated === true ||
    Boolean(settings?.migration_completed_at);

  const hasRemoteData =
    hasSettingsData ||
    tasks.length > 0 ||
    customTasks.length > 0 ||
    templates.length > 0 ||
    characters.length > 0 ||
    relationships.length > 0 ||
    plotPoints.length > 0 ||
    drafts.length > 0 ||
    worldElements.length > 0 ||
    knowledgeBase.length > 0 ||
    Boolean(settings?.migration_completed_at);

  return {
    snapshot,
    meta: {
      backendEnabled: settings?.backend_enabled === true,
      hasRemoteData,
      migrated: settings?.migrated === true,
      migrationCompleted: Boolean(settings?.migration_completed_at),
      migrationVersion: toNumber(settings?.migration_version, 0),
      lastSnapshotSyncedAt: settings?.last_snapshot_synced_at || null,
    },
  };
};

export const applyWriteForgeSnapshot = async (
  client: SupabaseClient,
  snapshot: WriteForgeSnapshot,
) => {
  await requireSupabaseSession(client);

  const payload = buildMigratablePayload(snapshot);

  const { error } = await client.rpc("apply_writeforge_snapshot", {
    snapshot_payload: payload,
    snapshot_version: CURRENT_WRITEFORGE_MIGRATION_VERSION,
  });

  if (error) {
    throw error;
  }
};

export const migrateWriteForgeSnapshot = async (
  client: SupabaseClient,
  snapshot: WriteForgeSnapshot,
): Promise<WriteForgeMigrationResult> => {
  await requireSupabaseSession(client);

  const payload = buildMigratablePayload(snapshot);

  const { data, error } = await client.rpc("migrate_writeforge_snapshot", {
    snapshot_payload: payload,
    snapshot_version: CURRENT_WRITEFORGE_MIGRATION_VERSION,
  });

  if (error) {
    throw error;
  }

  const result = (data || null) as WriteForgeMigrationRpcResult | null;

  return {
    migrated: result?.migrated === true,
    reason: typeof result?.reason === "string" ? result.reason : null,
    skipped: result?.skipped === true,
  };
};
