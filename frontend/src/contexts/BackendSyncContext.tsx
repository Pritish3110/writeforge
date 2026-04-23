import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  auth,
} from "@/firebase/auth.js";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToStorage } from "@/lib/backend/storageAdapter";
import {
  createEmptyWorkspaceSnapshot,
  getWorkspaceSyncTargetForStorageKey,
  hydrateWorkspaceSnapshot,
  readStoredBackendUser,
  readWorkspaceCollection,
  readWorkspaceSnapshot,
  readWorkspaceUser,
  WORKSPACE_COLLECTION_KEYS,
  type WorkspaceCollectionKey,
  type WorkspaceSnapshot,
} from "@/lib/backend/workspaceSnapshot";
import {
  getSnapshot,
  saveWorkspaceData,
  saveWorkspaceUser,
  syncWorkspaceCollection,
} from "@/services/snapshotService.js";

type BackendSyncStatus =
  | "disabled"
  | "booting"
  | "ready"
  | "syncing"
  | "error";

type WorkspaceSyncTarget = "user" | WorkspaceCollectionKey;

interface BackendSyncContextValue {
  enabled: boolean;
  status: BackendSyncStatus;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  syncTargetsNow: (targets: WorkspaceSyncTarget[]) => Promise<void>;
}

const BackendSyncContext = createContext<BackendSyncContextValue>({
  enabled: false,
  status: "disabled",
  lastSyncedAt: null,
  syncNow: async () => {},
  syncTargetsNow: async () => {},
});

const SYNC_DEBOUNCE_MS = 3000;
const ALL_WORKSPACE_SYNC_TARGETS: WorkspaceSyncTarget[] = [
  "user",
  ...WORKSPACE_COLLECTION_KEYS,
];

const areSerializedValuesEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const cloneWorkspaceSnapshot = (
  snapshot: WorkspaceSnapshot,
): WorkspaceSnapshot => {
  const clonedSnapshot = createEmptyWorkspaceSnapshot(snapshot.user?.id || "");
  clonedSnapshot.user = snapshot.user ? { ...snapshot.user } : null;

  WORKSPACE_COLLECTION_KEYS.forEach((key) => {
    clonedSnapshot[key] = Array.isArray(snapshot[key]) ? [...snapshot[key]] : [];
  });

  return clonedSnapshot;
};

export const useBackendSync = () => useContext(BackendSyncContext);

export const BackendSyncProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = auth.currentUser?.uid || user?.id || "";
  const enabled = Boolean(userId);
  const [status, setStatus] = useState<BackendSyncStatus>(
    enabled ? "booting" : "disabled",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [bootResolved, setBootResolved] = useState(!enabled);
  const syncInFlightRef = useRef(false);
  const pendingSyncTimeoutRef = useRef<number | null>(null);
  const pendingTargetsRef = useRef<Set<WorkspaceSyncTarget>>(new Set());
  const hydratingSnapshotRef = useRef(false);
  const lastSyncedWorkspaceRef = useRef<WorkspaceSnapshot | null>(null);
  const scheduleSyncRef = useRef(
    (_targets?: Iterable<WorkspaceSyncTarget>, _delay?: number) => {},
  );

  const clearPendingSync = useCallback(() => {
    if (pendingSyncTimeoutRef.current !== null) {
      window.clearTimeout(pendingSyncTimeoutRef.current);
      pendingSyncTimeoutRef.current = null;
    }
  }, []);

  const normalizeTargets = useCallback(
    (targets?: Iterable<WorkspaceSyncTarget>) =>
      Array.from(new Set(targets ? Array.from(targets) : ALL_WORKSPACE_SYNC_TARGETS)),
    [],
  );

  const getLastSyncedWorkspace = useCallback(
    () => lastSyncedWorkspaceRef.current || createEmptyWorkspaceSnapshot(userId),
    [userId],
  );

  const readLocalTargetValue = useCallback(
    (target: WorkspaceSyncTarget) =>
      target === "user"
        ? readWorkspaceUser(userId)
        : readWorkspaceCollection(target),
    [userId],
  );

  const updateLastSyncedTarget = useCallback(
    (target: WorkspaceSyncTarget, value: unknown) => {
      const currentSnapshot =
        lastSyncedWorkspaceRef.current || createEmptyWorkspaceSnapshot(userId);

      if (target === "user") {
        currentSnapshot.user = value as WorkspaceSnapshot["user"];
      } else {
        currentSnapshot[target] = Array.isArray(value) ? value : [];
      }

      lastSyncedWorkspaceRef.current = currentSnapshot;
    },
    [userId],
  );

  const syncTargets = useCallback(
    async (targets?: Iterable<WorkspaceSyncTarget>) => {
      clearPendingSync();

      if (!enabled || !userId) return;

      const resolvedTargets = normalizeTargets(targets);

      if (!resolvedTargets.length) {
        return;
      }

      if (syncInFlightRef.current) {
        resolvedTargets.forEach((target) => pendingTargetsRef.current.add(target));
        return;
      }

      syncInFlightRef.current = true;
      setStatus("syncing");

      try {
        let savedAnyTarget = false;

        for (const target of resolvedTargets) {
          const currentValue = readLocalTargetValue(target);
          const previousSnapshot = getLastSyncedWorkspace();
          const previousValue =
            target === "user" ? previousSnapshot.user : previousSnapshot[target];

          if (areSerializedValuesEqual(currentValue, previousValue)) {
            continue;
          }

          if (target === "user") {
            const savedUser = await saveWorkspaceUser(
              userId,
              currentValue as WorkspaceSnapshot["user"],
            );
            updateLastSyncedTarget(target, savedUser);
          } else {
            const savedCollection = await syncWorkspaceCollection(
              userId,
              target,
              currentValue as unknown[],
              Array.isArray(previousValue) ? previousValue : [],
            );
            updateLastSyncedTarget(target, savedCollection);
          }

          savedAnyTarget = true;
        }

        if (savedAnyTarget) {
          setLastSyncedAt(new Date().toISOString());
        }

        setStatus("ready");
      } catch (error) {
        setStatus("error");
        console.error("Workspace sync failed.", error);
        throw error;
      } finally {
        syncInFlightRef.current = false;

        if (pendingTargetsRef.current.size > 0) {
          const pendingTargets = Array.from(pendingTargetsRef.current);
          pendingTargetsRef.current.clear();
          scheduleSyncRef.current(pendingTargets, 0);
        }
      }
    },
    [
      clearPendingSync,
      enabled,
      getLastSyncedWorkspace,
      normalizeTargets,
      readLocalTargetValue,
      updateLastSyncedTarget,
      userId,
    ],
  );

  const syncNow = useCallback(
    async () => syncTargets(ALL_WORKSPACE_SYNC_TARGETS),
    [syncTargets],
  );

  const syncTargetsNow = useCallback(
    async (targets: WorkspaceSyncTarget[]) => syncTargets(targets),
    [syncTargets],
  );

  const scheduleSync = useCallback(
    (
      targets: Iterable<WorkspaceSyncTarget> = ALL_WORKSPACE_SYNC_TARGETS,
      delay = SYNC_DEBOUNCE_MS,
    ) => {
      if (!enabled || !userId || !bootResolved) return;

      normalizeTargets(targets).forEach((target) =>
        pendingTargetsRef.current.add(target),
      );

      clearPendingSync();
      pendingSyncTimeoutRef.current = window.setTimeout(() => {
        pendingSyncTimeoutRef.current = null;
        const pendingTargets = Array.from(pendingTargetsRef.current);
        pendingTargetsRef.current.clear();
        void syncTargets(pendingTargets);
      }, delay);
    },
    [
      bootResolved,
      clearPendingSync,
      enabled,
      normalizeTargets,
      syncTargets,
      userId,
    ],
  );

  useEffect(() => {
    scheduleSyncRef.current = scheduleSync;
  }, [scheduleSync]);

  useEffect(() => {
    setStatus(enabled ? "booting" : "disabled");
    setBootResolved(!enabled);
    hydratingSnapshotRef.current = false;
    lastSyncedWorkspaceRef.current = null;
    pendingTargetsRef.current.clear();
    clearPendingSync();
  }, [clearPendingSync, enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    let active = true;

    const bootstrap = async () => {
      const storedWorkspaceUser = readStoredBackendUser();
      const fallbackSnapshot =
        storedWorkspaceUser?.id === userId
          ? readWorkspaceSnapshot(userId)
          : createEmptyWorkspaceSnapshot(userId);

      try {
        const remoteSnapshot = await getSnapshot(userId);
        const snapshot = remoteSnapshot || fallbackSnapshot;
        const savedSnapshot = remoteSnapshot
          ? snapshot
          : await saveWorkspaceData(userId, snapshot);

        if (!active) return;

        hydratingSnapshotRef.current = true;
        hydrateWorkspaceSnapshot(savedSnapshot);
        lastSyncedWorkspaceRef.current = cloneWorkspaceSnapshot(savedSnapshot);
        setLastSyncedAt(new Date().toISOString());
        setStatus("ready");
      } catch (error) {
        if (!active) return;

        console.error("Unable to load the saved workspace data.", error);
        hydratingSnapshotRef.current = true;
        hydrateWorkspaceSnapshot(fallbackSnapshot);
        lastSyncedWorkspaceRef.current = cloneWorkspaceSnapshot(fallbackSnapshot);
        setStatus("error");
      } finally {
        hydratingSnapshotRef.current = false;

        if (active) {
          setBootResolved(true);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !userId || !bootResolved) return;

    return subscribeToStorage((changedKey) => {
      if (hydratingSnapshotRef.current) {
        return;
      }

      const target = getWorkspaceSyncTargetForStorageKey(changedKey);

      if (!target) {
        return;
      }

      scheduleSync([target]);
    });
  }, [bootResolved, enabled, scheduleSync, userId]);

  useEffect(() => clearPendingSync, [clearPendingSync]);

  const value = useMemo(
    () => ({
      enabled,
      status,
      lastSyncedAt,
      syncNow,
      syncTargetsNow,
    }),
    [enabled, lastSyncedAt, status, syncNow, syncTargetsNow],
  );

  if (!bootResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        Opening your workspace...
      </div>
    );
  }

  return (
    <BackendSyncContext.Provider value={value}>
      {children}
    </BackendSyncContext.Provider>
  );
};
