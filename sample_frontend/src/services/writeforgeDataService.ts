import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  WriteForgeMigrationResult,
  WriteForgeRemoteMeta,
} from "@/lib/supabase/writeforgeBackend";
import {
  getSupabaseUser,
  loadWriteForgeSnapshot,
  migrateWriteForgeSnapshot,
  applyWriteForgeSnapshot,
} from "@/lib/supabase/writeforgeBackend";
import type { WriteForgeSnapshot } from "@/lib/storageKeys";
import {
  hasMigratableData,
  mergeRemoteSnapshot,
} from "@/lib/writeforgeStorage";
import { getWriteForgeRuntimeEnvironment } from "@/services/writeforgeEnvironment";

export type WriteForgeBackendMode = "local" | "supabase";

export interface WriteForgeBootstrapResult {
  backendMode: WriteForgeBackendMode;
  canMigrate: boolean;
  didMigrate: boolean;
  isLocalhost: boolean;
  meta: WriteForgeRemoteMeta;
  snapshot: WriteForgeSnapshot;
  userId: string | null;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const withRetries = async <T,>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        throw error;
      }

      await wait(attempt * 250);
    }
  }

  throw lastError;
};

export const syncWriteForgeSnapshot = async (
  client: SupabaseClient,
  snapshot: WriteForgeSnapshot,
) =>
  withRetries(
    () => applyWriteForgeSnapshot(client, snapshot),
    3,
  );

export const runWriteForgeMigration = async (
  client: SupabaseClient,
  snapshot: WriteForgeSnapshot,
): Promise<WriteForgeMigrationResult> =>
  withRetries(
    () => migrateWriteForgeSnapshot(client, snapshot),
    3,
  );

export const bootstrapWriteForgeData = async (
  client: SupabaseClient,
  localSnapshot: WriteForgeSnapshot,
  currentUser?: User | null,
): Promise<WriteForgeBootstrapResult> => {
  const runtime = getWriteForgeRuntimeEnvironment();
  const user =
    currentUser === undefined
      ? await withRetries(() => getSupabaseUser(client), 2)
      : currentUser;

  if (!user) {
    return {
      backendMode: "local",
      canMigrate: false,
      didMigrate: false,
      isLocalhost: runtime.isLocalhost,
      meta: {
        backendEnabled: false,
        hasRemoteData: false,
        lastSnapshotSyncedAt: null,
        migrated: false,
        migrationCompleted: false,
        migrationVersion: 0,
      },
      snapshot: localSnapshot,
      userId: null,
    };
  }

  const remoteState = await withRetries(() => loadWriteForgeSnapshot(client, user.id), 2);
  const localHasMigratableData = hasMigratableData(localSnapshot);
  const canMigrate =
    runtime.isProductionRuntime &&
    !remoteState.meta.hasRemoteData &&
    !remoteState.meta.migrated &&
    localHasMigratableData;

  if (runtime.isLocalhost) {
    if (!remoteState.meta.hasRemoteData) {
      return {
        backendMode: "local",
        canMigrate: false,
        didMigrate: false,
        isLocalhost: true,
        meta: remoteState.meta,
        snapshot: localSnapshot,
        userId: user.id,
      };
    }

    return {
      backendMode: "supabase",
      canMigrate: false,
      didMigrate: false,
      isLocalhost: true,
      meta: remoteState.meta,
      snapshot: mergeRemoteSnapshot(remoteState.snapshot, localSnapshot),
      userId: user.id,
    };
  }

  if (canMigrate) {
    const migrationResult = await runWriteForgeMigration(client, localSnapshot);
    const migratedState = await withRetries(() => loadWriteForgeSnapshot(client, user.id), 2);

    return {
      backendMode: "supabase",
      canMigrate: false,
      didMigrate: migrationResult.migrated,
      isLocalhost: false,
      meta: migratedState.meta,
      snapshot: mergeRemoteSnapshot(migratedState.snapshot, localSnapshot),
      userId: user.id,
    };
  }

  return {
    backendMode: "supabase",
    canMigrate,
    didMigrate: false,
    isLocalhost: false,
    meta: remoteState.meta,
    snapshot: mergeRemoteSnapshot(remoteState.snapshot, localSnapshot),
    userId: user.id,
  };
};
