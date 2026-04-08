import {
  LOCAL_ONLY_STORAGE_KEYS,
  MIGRATABLE_STORAGE_KEYS,
  WRITEFORGE_LEGACY_KAEL_SEEDED_KEY,
  WRITEFORGE_STORAGE_KEYS,
  WRITEFORGE_THEME_KEY,
  type MigratableStorageKey,
  type WriteForgeSnapshot,
  type WriteForgeStorageKey,
} from "@/lib/storageKeys";

const toObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const readBrowserStorageValue = <K extends WriteForgeStorageKey>(
  key: K,
): WriteForgeSnapshot[K] | undefined => {
  if (typeof window === "undefined") return undefined;

  const raw = window.localStorage.getItem(key);
  if (raw === null) return undefined;

  if (key === WRITEFORGE_THEME_KEY) {
    return raw as WriteForgeSnapshot[K];
  }

  try {
    return JSON.parse(raw) as WriteForgeSnapshot[K];
  } catch {
    return undefined;
  }
};

export const writeBrowserStorageValue = <K extends WriteForgeStorageKey>(
  key: K,
  value: WriteForgeSnapshot[K],
) => {
  if (typeof window === "undefined") return;

  if (value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }

  if (key === WRITEFORGE_THEME_KEY) {
    window.localStorage.setItem(key, String(value));
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const removeBrowserStorageValue = (key: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

export const readBrowserSnapshot = (): WriteForgeSnapshot => {
  const snapshot: WriteForgeSnapshot = {};

  WRITEFORGE_STORAGE_KEYS.forEach((key) => {
    const value = readBrowserStorageValue(key);

    if (value !== undefined) {
      snapshot[key] = value as never;
    }
  });

  return snapshot;
};

export const buildMigratablePayload = (
  snapshot: WriteForgeSnapshot,
): Partial<Record<MigratableStorageKey, unknown>> => {
  const payload: Partial<Record<MigratableStorageKey, unknown>> = {};

  MIGRATABLE_STORAGE_KEYS.forEach((key) => {
    if (snapshot[key] !== undefined) {
      payload[key] = snapshot[key];
    }
  });

  return payload;
};

export const hasMigratableData = (snapshot: WriteForgeSnapshot): boolean =>
  MIGRATABLE_STORAGE_KEYS.some((key) => snapshot[key] !== undefined);

export const applySnapshotToBrowserStorage = (
  snapshot: WriteForgeSnapshot,
  { includeLocalOnly = true }: { includeLocalOnly?: boolean } = {},
) => {
  MIGRATABLE_STORAGE_KEYS.forEach((key) => {
    if (snapshot[key] === undefined) {
      removeBrowserStorageValue(key);
      return;
    }

    writeBrowserStorageValue(key, snapshot[key]);
  });

  if (!includeLocalOnly) return;

  LOCAL_ONLY_STORAGE_KEYS.forEach((key) => {
    if (snapshot[key] === undefined) return;
    writeBrowserStorageValue(key, snapshot[key]);
  });
};

export const clearBrowserStorageKeys = (keys: readonly string[]) => {
  if (typeof window === "undefined") return;

  keys.forEach((key) => window.localStorage.removeItem(key));
};

export const clearLegacyLocalKeys = () => {
  clearBrowserStorageKeys([WRITEFORGE_LEGACY_KAEL_SEEDED_KEY]);
};

export const setSnapshotValue = <K extends WriteForgeStorageKey>(
  snapshot: WriteForgeSnapshot,
  key: K,
  value: WriteForgeSnapshot[K],
): WriteForgeSnapshot => {
  const nextSnapshot = { ...snapshot };

  if (value === undefined) {
    delete nextSnapshot[key];
    return nextSnapshot;
  }

  nextSnapshot[key] = value as never;
  return nextSnapshot;
};

export const pickLocalOnlySnapshot = (
  snapshot: WriteForgeSnapshot,
): Partial<WriteForgeSnapshot> => {
  const next: Partial<WriteForgeSnapshot> = {};

  LOCAL_ONLY_STORAGE_KEYS.forEach((key) => {
    if (snapshot[key] !== undefined) {
      next[key] = snapshot[key];
    }
  });

  return next;
};

export const mergeRemoteSnapshot = (
  remoteSnapshot: WriteForgeSnapshot,
  localSnapshot: WriteForgeSnapshot,
): WriteForgeSnapshot => ({
  ...remoteSnapshot,
  ...pickLocalOnlySnapshot(localSnapshot),
});

export const normalizeSnapshotFromPayload = (value: unknown): WriteForgeSnapshot => {
  const record = toObject(value);
  const snapshot: WriteForgeSnapshot = {};

  WRITEFORGE_STORAGE_KEYS.forEach((key) => {
    if (record[key] !== undefined) {
      snapshot[key] = record[key] as never;
    }
  });

  return snapshot;
};
