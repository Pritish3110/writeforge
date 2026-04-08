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
  return {
    user: buildWorkspaceUser(userId),
    taskRecords: parseStoredValue(STORAGE_KEYS.tasks, []),
    customTasks: parseStoredValue(STORAGE_KEYS.customTasks, []),
    taskTemplates: parseStoredValue(STORAGE_KEYS.taskTemplates, []),
    characters: parseStoredValue(STORAGE_KEYS.characters, []),
    characterRelationships: parseStoredValue(STORAGE_KEYS.characterRelationships, []),
    plotPoints: parseStoredValue(STORAGE_KEYS.plotBuilder, []),
    drafts: parseStoredValue(STORAGE_KEYS.drafts, []),
    worldElements: parseStoredValue(STORAGE_KEYS.worldElements, []),
    knowledgeBaseSections: parseStoredValue(STORAGE_KEYS.knowledgeBase, []),
  };
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

  writeStoredValue(STORAGE_KEYS.tasks, snapshot.taskRecords || []);
  writeStoredValue(STORAGE_KEYS.customTasks, snapshot.customTasks || []);
  writeStoredValue(STORAGE_KEYS.taskTemplates, snapshot.taskTemplates || []);
  writeStoredValue(STORAGE_KEYS.characters, snapshot.characters || []);
  writeStoredValue(
    STORAGE_KEYS.characterRelationships,
    snapshot.characterRelationships || [],
  );
  writeStoredValue(STORAGE_KEYS.plotBuilder, snapshot.plotPoints || []);
  writeStoredValue(STORAGE_KEYS.drafts, snapshot.drafts || []);
  writeStoredValue(STORAGE_KEYS.worldElements, snapshot.worldElements || []);
  writeStoredValue(
    STORAGE_KEYS.knowledgeBase,
    snapshot.knowledgeBaseSections || [],
  );
};

export const clearStoredBackendUser = () => {
  removeStoredValue(STORAGE_KEYS.backendUser);
};
