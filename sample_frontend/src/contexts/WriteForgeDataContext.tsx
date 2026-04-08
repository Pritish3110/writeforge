import type { User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAuth,
  type AuthStatus,
  type AuthProfileUpdateInput,
  type AuthSignUpResult,
  type PendingAuthAction,
} from "@/contexts/AuthContext";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import {
  getUserAvatarUrl,
  getUserBio,
  getUserDisplayName,
} from "@/lib/identity";
import { type WriteForgeMigrationResult } from "@/lib/supabase/writeforgeBackend";
import {
  MIGRATABLE_STORAGE_KEYS,
  WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY,
  WRITEFORGE_CHARACTER_SEED_VERSION_KEY,
  WRITEFORGE_CHARACTERS_KEY,
  WRITEFORGE_CUSTOM_TASKS_KEY,
  WRITEFORGE_DRAFTS_KEY,
  WRITEFORGE_KNOWLEDGE_BASE_KEY,
  WRITEFORGE_LEGACY_KAEL_SEEDED_KEY,
  WRITEFORGE_PLOT_BUILDER_KEY,
  WRITEFORGE_SCENE_WORLD_REFERENCE_KEY,
  WRITEFORGE_TASKS_KEY,
  WRITEFORGE_TASK_TEMPLATES_KEY,
  WRITEFORGE_THEME_KEY,
  WRITEFORGE_WORLD_ELEMENTS_KEY,
  type WriteForgeSnapshot,
  type WriteForgeStorageKey,
} from "@/lib/storageKeys";
import {
  applySnapshotToBrowserStorage,
  clearBrowserStorageKeys,
  clearLegacyLocalKeys,
  hasMigratableData,
  readBrowserSnapshot,
  setSnapshotValue,
} from "@/lib/writeforgeStorage";
import {
  bootstrapWriteForgeData,
  runWriteForgeMigration,
  syncWriteForgeSnapshot,
  type WriteForgeBackendMode,
} from "@/services/writeforgeDataService";
import { getWriteForgeRuntimeEnvironment } from "@/services/writeforgeEnvironment";

type StorageStatus = "booting" | "ready" | "syncing" | "migrating" | "error";
export type WriteForgeProfileUpdateInput = AuthProfileUpdateInput;
export type WriteForgeSignUpResult = AuthSignUpResult;

interface WriteForgeDataContextValue {
  authStatus: AuthStatus;
  backendMode: WriteForgeBackendMode;
  canMigrate: boolean;
  changePassword: (password: string) => Promise<void>;
  emailVerified: boolean;
  hasBackend: boolean;
  hasItem: (key: WriteForgeStorageKey) => boolean;
  hasRemoteData: boolean;
  getItem: <T>(key: WriteForgeStorageKey, initialValue: T) => T;
  isAuthenticated: boolean;
  isLocalhost: boolean;
  isReady: boolean;
  lastError: string | null;
  lastSignInAt: string | null;
  lastSyncedAt: string | null;
  migrationCompleted: boolean;
  pendingAuthAction: PendingAuthAction;
  removeItem: (key: WriteForgeStorageKey) => void;
  resendVerificationEmail: () => Promise<void>;
  resetProgressData: () => void;
  runMigration: () => Promise<WriteForgeMigrationResult | null>;
  setItem: <T>(
    key: WriteForgeStorageKey,
    value: T | ((prev: T) => T),
    initialValue: T,
  ) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<WriteForgeSignUpResult>;
  status: StorageStatus;
  updateProfile: (input: WriteForgeProfileUpdateInput) => Promise<void>;
  userAvatarUrl: string | null;
  userBio: string | null;
  userDisplayName: string | null;
  userEmail: string | null;
  userEmailConfirmedAt: string | null;
  userId: string | null;
}

const WriteForgeDataContext = createContext<WriteForgeDataContextValue | null>(null);

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "Unknown backend sync error";
};

const PROGRESS_RESET_KEYS: WriteForgeStorageKey[] = [
  WRITEFORGE_TASKS_KEY,
  WRITEFORGE_CHARACTERS_KEY,
  WRITEFORGE_CHARACTER_SEED_VERSION_KEY,
  WRITEFORGE_CHARACTER_RELATIONSHIPS_KEY,
  WRITEFORGE_CUSTOM_TASKS_KEY,
  WRITEFORGE_TASK_TEMPLATES_KEY,
  WRITEFORGE_PLOT_BUILDER_KEY,
  WRITEFORGE_DRAFTS_KEY,
  WRITEFORGE_WORLD_ELEMENTS_KEY,
  WRITEFORGE_KNOWLEDGE_BASE_KEY,
  WRITEFORGE_SCENE_WORLD_REFERENCE_KEY,
];

const buildSignedOutSnapshot = (
  snapshot: WriteForgeSnapshot,
): WriteForgeSnapshot => {
  const nextSnapshot: WriteForgeSnapshot = {};

  if (snapshot[WRITEFORGE_THEME_KEY] !== undefined) {
    nextSnapshot[WRITEFORGE_THEME_KEY] = snapshot[WRITEFORGE_THEME_KEY];
  }

  return nextSnapshot;
};

export const useOptionalWriteForgeData = () => useContext(WriteForgeDataContext);

export const useWriteForgeData = () => {
  const value = useContext(WriteForgeDataContext);

  if (!value) {
    throw new Error("useWriteForgeData must be used inside WriteForgeDataProvider");
  }

  return value;
};

export const WriteForgeDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    changePassword,
    loading: authLoading,
    pendingAuthAction,
    resendVerificationEmail,
    signIn,
    signOut,
    signUp,
    updateProfile,
    user,
  } = useAuth();
  const runtime = getWriteForgeRuntimeEnvironment();
  const [snapshot, setSnapshot] = useState<WriteForgeSnapshot>(() => readBrowserSnapshot());
  const [status, setStatus] = useState<StorageStatus>(hasSupabaseConfig ? "booting" : "ready");
  const [backendMode, setBackendMode] = useState<WriteForgeBackendMode>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [canMigrate, setCanMigrate] = useState(false);
  const [hasRemoteData, setHasRemoteData] = useState(false);
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(runtime.isLocalhost);

  const snapshotRef = useRef(snapshot);
  const syncTimeoutRef = useRef<number | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const syncQueuedRef = useRef(false);
  const authRequestIdRef = useRef(0);
  const previousUserIdRef = useRef<string | null>(null);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const bootstrappingUserIdRef = useRef<string | null>(null);

  const authStatus: AuthStatus = !hasSupabaseConfig
    ? "disabled"
    : authLoading
      ? "checking"
      : user
        ? "authenticated"
        : "unauthenticated";
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const userDisplayName = getUserDisplayName(user);
  const userAvatarUrl = getUserAvatarUrl(user);
  const userBio = getUserBio(user);
  const userEmailConfirmedAt = user?.email_confirmed_at ?? null;
  const lastSignInAt = user?.last_sign_in_at ?? null;

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const flushSnapshotSync = useCallback(async () => {
    if (backendMode !== "supabase") return;

    const client = getSupabaseClient();
    if (!client) return;

    if (syncInFlightRef.current) {
      syncQueuedRef.current = true;
      return;
    }

    const runSync = async () => {
      try {
        setStatus("syncing");
        await syncWriteForgeSnapshot(client, snapshotRef.current);
        clearLegacyLocalKeys();
        setCanMigrate(false);
        setHasRemoteData(hasMigratableData(snapshotRef.current));
        setLastSyncedAt(new Date().toISOString());
        setLastError(null);
        setStatus("ready");
      } catch (error) {
        console.error("WriteForge snapshot sync failed", error);
        setLastError(describeError(error));
        setStatus("error");
      } finally {
        syncInFlightRef.current = null;

        if (syncQueuedRef.current) {
          syncQueuedRef.current = false;
          void flushSnapshotSync();
        }
      }
    };

    syncInFlightRef.current = runSync();
    await syncInFlightRef.current;
  }, [backendMode]);

  const scheduleSnapshotSync = useCallback(() => {
    if (backendMode !== "supabase") return;

    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null;
      void flushSnapshotSync();
    }, 120);
  }, [backendMode, flushSnapshotSync]);

  const applyBootstrapResult = useCallback(
    ({
      backendMode: nextBackendMode,
      canMigrate: nextCanMigrate,
      isLocalhost: nextIsLocalhost,
      meta,
      snapshot: nextSnapshot,
    }: Awaited<ReturnType<typeof bootstrapWriteForgeData>>) => {
      setSnapshot(nextSnapshot);
      snapshotRef.current = nextSnapshot;
      applySnapshotToBrowserStorage(nextSnapshot, { includeLocalOnly: true });
      clearLegacyLocalKeys();
      setBackendMode(nextBackendMode);
      setCanMigrate(nextCanMigrate);
      setHasRemoteData(meta.hasRemoteData);
      setMigrationCompleted(meta.migrated);
      setIsLocalhost(nextIsLocalhost);
      setLastSyncedAt(meta.lastSnapshotSyncedAt);
      setLastError(null);
      setStatus("ready");
    },
    [],
  );

  const setUnauthenticatedState = useCallback(
    (clearLocalData = false) => {
      authRequestIdRef.current += 1;
      bootstrappedUserIdRef.current = null;
      bootstrappingUserIdRef.current = null;

      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      syncQueuedRef.current = false;

      if (clearLocalData) {
        const nextSnapshot = buildSignedOutSnapshot(snapshotRef.current);
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        applySnapshotToBrowserStorage(nextSnapshot, { includeLocalOnly: false });
        clearBrowserStorageKeys([
          WRITEFORGE_SCENE_WORLD_REFERENCE_KEY,
          WRITEFORGE_LEGACY_KAEL_SEEDED_KEY,
        ]);
        clearLegacyLocalKeys();
      }

      setBackendMode("local");
      setCanMigrate(false);
      setHasRemoteData(false);
      setMigrationCompleted(false);
      setIsLocalhost(runtime.isLocalhost);
      setLastSyncedAt(null);
      setLastError(null);
      setStatus("ready");
    },
    [runtime.isLocalhost],
  );

  const bootstrapAuthenticatedUser = useCallback(
    async (user: User) => {
      const client = getSupabaseClient();

      if (!client) {
        setStatus("ready");
        return;
      }

      bootstrappingUserIdRef.current = user.id;
      const requestId = ++authRequestIdRef.current;

      setStatus("booting");
      setLastError(null);

      try {
        const result = await bootstrapWriteForgeData(client, snapshotRef.current, user);

        if (requestId !== authRequestIdRef.current) {
          return;
        }

        applyBootstrapResult(result);
        bootstrappedUserIdRef.current = user.id;
      } catch (error) {
        console.error("WriteForge backend bootstrap failed", error);

        if (requestId !== authRequestIdRef.current) {
          return;
        }

        applySnapshotToBrowserStorage(snapshotRef.current, { includeLocalOnly: true });
        clearLegacyLocalKeys();
        setBackendMode("local");
        setCanMigrate(false);
        setHasRemoteData(false);
        setMigrationCompleted(false);
        setIsLocalhost(runtime.isLocalhost);
        setLastSyncedAt(null);
        setStatus("error");
        setLastError(describeError(error));
        bootstrappedUserIdRef.current = user.id;
      } finally {
        if (bootstrappingUserIdRef.current === user.id) {
          bootstrappingUserIdRef.current = null;
        }
      }
    },
    [applyBootstrapResult, runtime.isLocalhost],
  );

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setStatus("ready");
      setIsLocalhost(runtime.isLocalhost);
      return;
    }

    if (authLoading) {
      setIsLocalhost(runtime.isLocalhost);
      return;
    }

    const nextUserId = user?.id ?? null;
    const previousUserId = previousUserIdRef.current;
    const shouldClearLocalData = Boolean(previousUserId) && !nextUserId;
    previousUserIdRef.current = nextUserId;

    if (!user) {
      setUnauthenticatedState(shouldClearLocalData);
      return;
    }

    setLastError(null);

    if (
      bootstrappedUserIdRef.current !== user.id &&
      bootstrappingUserIdRef.current !== user.id
    ) {
      void bootstrapAuthenticatedUser(user);
    }

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [
    authLoading,
    bootstrapAuthenticatedUser,
    runtime.isLocalhost,
    setUnauthenticatedState,
    user,
  ]);

  const runMigration = useCallback(async (): Promise<WriteForgeMigrationResult | null> => {
    if (
      authStatus !== "authenticated" ||
      isLocalhost ||
      !canMigrate ||
      !hasSupabaseConfig
    ) {
      return null;
    }

    const client = getSupabaseClient();
    if (!client) return null;

    try {
      setStatus("migrating");

      const migrationResult = await runWriteForgeMigration(client, snapshotRef.current);
      const nextState = await bootstrapWriteForgeData(client, snapshotRef.current, user);

      applyBootstrapResult(nextState);
      setStatus("ready");

      return migrationResult;
    } catch (error) {
      console.error("WriteForge manual migration failed", error);
      setLastError(describeError(error));
      setStatus("error");
      return null;
    }
  }, [applyBootstrapResult, authStatus, canMigrate, isLocalhost, user]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setLastError(null);

    try {
      await signIn(email, password);
    } catch (error) {
      setLastError(describeError(error));
      throw error;
    }
  }, [signIn]);

  const handleSignUp = useCallback(
    async (email: string, password: string): Promise<WriteForgeSignUpResult> => {
      setLastError(null);

      try {
        return await signUp(email, password);
      } catch (error) {
        setLastError(describeError(error));
        throw error;
      }
    },
    [signUp],
  );

  const handleSignOut = useCallback(async () => {
    setLastError(null);

    try {
      await signOut();
    } catch (error) {
      setLastError(describeError(error));
      throw error;
    }
  }, [signOut]);

  const handleUpdateProfile = useCallback(async (input: WriteForgeProfileUpdateInput) => {
    setLastError(null);

    try {
      await updateProfile(input);
    } catch (error) {
      setLastError(describeError(error));
      throw error;
    }
  }, [updateProfile]);

  const handleChangePassword = useCallback(async (password: string) => {
    setLastError(null);

    try {
      await changePassword(password);
    } catch (error) {
      setLastError(describeError(error));
      throw error;
    }
  }, [changePassword]);

  const handleResendVerificationEmail = useCallback(async () => {
    setLastError(null);

    try {
      await resendVerificationEmail();
    } catch (error) {
      setLastError(describeError(error));
      throw error;
    }
  }, [resendVerificationEmail]);

  const hasItem = useCallback(
    (key: WriteForgeStorageKey) => snapshot[key] !== undefined,
    [snapshot],
  );

  const getItem = useCallback(
    <T,>(key: WriteForgeStorageKey, initialValue: T): T => {
      const value = snapshot[key];
      return (value === undefined ? initialValue : value) as T;
    },
    [snapshot],
  );

  const setItem = useCallback(
    <T,>(
      key: WriteForgeStorageKey,
      value: T | ((prev: T) => T),
      initialValue: T,
    ) => {
      setSnapshot((prev) => {
        const currentValue = (prev[key] === undefined ? initialValue : prev[key]) as T;
        const nextValue =
          typeof value === "function"
            ? (value as (previous: T) => T)(currentValue)
            : value;
        const nextSnapshot = setSnapshotValue(prev, key, nextValue as never);

        snapshotRef.current = nextSnapshot;
        applySnapshotToBrowserStorage(nextSnapshot, { includeLocalOnly: true });

        if (MIGRATABLE_STORAGE_KEYS.includes(key) && backendMode === "supabase") {
          scheduleSnapshotSync();
        }

        return nextSnapshot;
      });
    },
    [backendMode, scheduleSnapshotSync],
  );

  const removeItem = useCallback(
    (key: WriteForgeStorageKey) => {
      setSnapshot((prev) => {
        const nextSnapshot = setSnapshotValue(prev, key, undefined);

        snapshotRef.current = nextSnapshot;
        clearBrowserStorageKeys([key]);

        if (MIGRATABLE_STORAGE_KEYS.includes(key) && backendMode === "supabase") {
          scheduleSnapshotSync();
        }

        return nextSnapshot;
      });
    },
    [backendMode, scheduleSnapshotSync],
  );

  const resetProgressData = useCallback(() => {
    setSnapshot((prev) => {
      const nextSnapshot = { ...prev };

      PROGRESS_RESET_KEYS.forEach((key) => {
        delete nextSnapshot[key];
      });

      snapshotRef.current = nextSnapshot;
      clearBrowserStorageKeys([
        ...PROGRESS_RESET_KEYS,
        WRITEFORGE_LEGACY_KAEL_SEEDED_KEY,
      ]);

      if (backendMode === "supabase") {
        scheduleSnapshotSync();
      }

      return nextSnapshot;
    });
  }, [backendMode, scheduleSnapshotSync]);

  const value = useMemo<WriteForgeDataContextValue>(
    () => ({
      authStatus,
      backendMode,
      canMigrate,
      changePassword: handleChangePassword,
      emailVerified: Boolean(userEmailConfirmedAt),
      hasBackend: hasSupabaseConfig,
      hasItem,
      hasRemoteData,
      getItem,
      isAuthenticated: authStatus === "authenticated",
      isLocalhost,
      isReady:
        authStatus !== "checking" &&
        status !== "booting" &&
        status !== "migrating",
      lastError,
      lastSignInAt,
      lastSyncedAt,
      migrationCompleted,
      pendingAuthAction,
      removeItem,
      resendVerificationEmail: handleResendVerificationEmail,
      resetProgressData,
      runMigration,
      setItem,
      signIn: handleSignIn,
      signOut: handleSignOut,
      signUp: handleSignUp,
      status,
      updateProfile: handleUpdateProfile,
      userAvatarUrl,
      userBio,
      userDisplayName,
      userEmail,
      userEmailConfirmedAt,
      userId,
    }),
    [
      authStatus,
      backendMode,
      canMigrate,
      handleChangePassword,
      handleResendVerificationEmail,
      handleSignIn,
      handleSignOut,
      handleSignUp,
      handleUpdateProfile,
      getItem,
      hasItem,
      hasRemoteData,
      isLocalhost,
      lastError,
      lastSignInAt,
      lastSyncedAt,
      migrationCompleted,
      pendingAuthAction,
      removeItem,
      resetProgressData,
      runMigration,
      setItem,
      status,
      userAvatarUrl,
      userBio,
      userDisplayName,
      userEmail,
      userEmailConfirmedAt,
      userId,
    ],
  );

  return (
    <WriteForgeDataContext.Provider value={value}>
      {children}
    </WriteForgeDataContext.Provider>
  );
};
