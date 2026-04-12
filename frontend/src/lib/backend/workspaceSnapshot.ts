import {
  readStoredJsonValue,
  readStoredStringValue,
  removeStoredValue as clearStoredValue,
  writeStoredJsonValue,
  writeStoredStringValue,
} from "@/lib/backend/storageAdapter";
import { getFallbackDisplayName } from "@/lib/identity";
import { STORAGE_KEYS } from "@/lib/storageKeys";

export interface BackendWorkspaceUser {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  theme: "dark" | "light";
  characterSeedVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  user: BackendWorkspaceUser | null;
  taskRecords: unknown[];
  customTasks: unknown[];
  taskTemplates: unknown[];
  characters: unknown[];
  characterRelationships: unknown[];
  plotPoints: unknown[];
  drafts: unknown[];
  worldElements: unknown[];
  knowledgeBaseSections: unknown[];
}

export type WorkspaceCollectionKey = Exclude<keyof WorkspaceSnapshot, "user">;

export const WORKSPACE_COLLECTIONS = [
  {
    snapshotKey: "taskRecords",
    storageKey: STORAGE_KEYS.tasks,
    collectionName: "taskRecords",
  },
  {
    snapshotKey: "customTasks",
    storageKey: STORAGE_KEYS.customTasks,
    collectionName: "customTasks",
  },
  {
    snapshotKey: "taskTemplates",
    storageKey: STORAGE_KEYS.taskTemplates,
    collectionName: "taskTemplates",
  },
  {
    snapshotKey: "characters",
    storageKey: STORAGE_KEYS.characters,
    collectionName: "characters",
  },
  {
    snapshotKey: "characterRelationships",
    storageKey: STORAGE_KEYS.characterRelationships,
    collectionName: "characterRelationships",
  },
  {
    snapshotKey: "plotPoints",
    storageKey: STORAGE_KEYS.plotBuilder,
    collectionName: "plotPoints",
  },
  {
    snapshotKey: "drafts",
    storageKey: STORAGE_KEYS.drafts,
    collectionName: "drafts",
  },
  {
    snapshotKey: "worldElements",
    storageKey: STORAGE_KEYS.worldElements,
    collectionName: "worldElements",
  },
  {
    snapshotKey: "knowledgeBaseSections",
    storageKey: STORAGE_KEYS.knowledgeBase,
    collectionName: "knowledgeBaseSections",
  },
] as const satisfies ReadonlyArray<{
  snapshotKey: WorkspaceCollectionKey;
  storageKey: string;
  collectionName: string;
}>;

export const WORKSPACE_COLLECTION_KEYS = WORKSPACE_COLLECTIONS.map(
  ({ snapshotKey }) => snapshotKey,
) as WorkspaceCollectionKey[];

export const WORKSPACE_USER_STORAGE_KEYS = [
  STORAGE_KEYS.backendUser,
  STORAGE_KEYS.theme,
  STORAGE_KEYS.characterSeedVersion,
] as const;

const WORKSPACE_COLLECTION_LOOKUP = Object.fromEntries(
  WORKSPACE_COLLECTIONS.map((config) => [config.snapshotKey, config]),
) as Record<
  WorkspaceCollectionKey,
  (typeof WORKSPACE_COLLECTIONS)[number]
>;

const parseStoredValue = <T,>(key: string, fallback: T): T => {
  return readStoredJsonValue(key, fallback);
};

const readStoredString = (key: string, fallback: string): string => {
  return readStoredStringValue(key, fallback);
};

const writeStoredValue = (key: string, value: unknown) => {
  writeStoredJsonValue(key, value);
};

const removeStoredValue = (key: string) => {
  clearStoredValue(key);
};

const isThemeValue = (value: unknown): value is "dark" | "light" =>
  value === "dark" || value === "light";

export const readStoredBackendUser = (): BackendWorkspaceUser | null =>
  parseStoredValue<BackendWorkspaceUser | null>(STORAGE_KEYS.backendUser, null);

export const writeStoredBackendUser = (user: BackendWorkspaceUser) => {
  writeStoredValue(STORAGE_KEYS.backendUser, user);
};

export const getStoredDisplayName = () =>
  readStoredBackendUser()?.displayName || "UndyingKoi";

const buildWorkspaceUser = (userId: string): BackendWorkspaceUser => {
  const now = new Date().toISOString();
  const storedUser = readStoredBackendUser();
  const matchingStoredUser = storedUser?.id === userId ? storedUser : null;
  const rawTheme = readStoredString(
    STORAGE_KEYS.theme,
    matchingStoredUser?.theme || "dark",
  );
  const theme = isThemeValue(rawTheme) ? rawTheme : "dark";
  const characterSeedVersion = Number(
    readStoredString(
      STORAGE_KEYS.characterSeedVersion,
      String(matchingStoredUser?.characterSeedVersion || 0),
    ),
  ) || 0;

  return {
    id: userId,
    displayName:
      matchingStoredUser?.displayName ||
      getFallbackDisplayName(matchingStoredUser?.email) ||
      "Story Crafter",
    email: matchingStoredUser?.email || "",
    photoURL: matchingStoredUser?.photoURL || "",
    bio: matchingStoredUser?.bio || "",
    theme,
    characterSeedVersion,
    createdAt: matchingStoredUser?.createdAt || now,
    updatedAt: matchingStoredUser?.updatedAt || now,
  };
};

export const readWorkspaceUser = (userId: string): BackendWorkspaceUser =>
  buildWorkspaceUser(userId);

export const readWorkspaceCollection = (
  snapshotKey: WorkspaceCollectionKey,
): unknown[] =>
  parseStoredValue(WORKSPACE_COLLECTION_LOOKUP[snapshotKey].storageKey, []);

export const writeWorkspaceCollection = (
  snapshotKey: WorkspaceCollectionKey,
  value: unknown[],
) => {
  writeStoredValue(WORKSPACE_COLLECTION_LOOKUP[snapshotKey].storageKey, value);
};

export const getWorkspaceSyncTargetForStorageKey = (
  key: string,
): WorkspaceCollectionKey | "user" | null => {
  if (
    WORKSPACE_USER_STORAGE_KEYS.includes(
      key as (typeof WORKSPACE_USER_STORAGE_KEYS)[number],
    )
  ) {
    return "user";
  }

  const config = WORKSPACE_COLLECTIONS.find(
    (entry) => entry.storageKey === key,
  );

  return config?.snapshotKey || null;
};

export const createEmptyWorkspaceSnapshot = (userId: string): WorkspaceSnapshot => ({
  user: buildWorkspaceUser(userId),
  taskRecords: [],
  customTasks: [],
  taskTemplates: [],
  characters: [],
  characterRelationships: [],
  plotPoints: [],
  drafts: [],
  worldElements: [],
  knowledgeBaseSections: [],
});

export const readWorkspaceSnapshot = (userId: string): WorkspaceSnapshot => {
  const snapshot = createEmptyWorkspaceSnapshot(userId);
  snapshot.user = buildWorkspaceUser(userId);

  WORKSPACE_COLLECTIONS.forEach(({ snapshotKey }) => {
    snapshot[snapshotKey] = readWorkspaceCollection(snapshotKey);
  });

  return snapshot;
};

export const hydrateWorkspaceSnapshot = (snapshot: WorkspaceSnapshot) => {
  if (snapshot.user) {
    writeStoredBackendUser(snapshot.user);
    writeStoredStringValue(STORAGE_KEYS.theme, snapshot.user.theme);
    writeStoredStringValue(
      STORAGE_KEYS.characterSeedVersion,
      String(snapshot.user.characterSeedVersion ?? 0),
    );
  }

  WORKSPACE_COLLECTIONS.forEach(({ snapshotKey }) => {
    writeWorkspaceCollection(snapshotKey, snapshot[snapshotKey] || []);
  });
};

export const clearStoredBackendUser = () => {
  removeStoredValue(STORAGE_KEYS.backendUser);
};
