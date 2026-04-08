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
  hydrateWorkspaceSnapshot,
  readStoredBackendUser,
  readWorkspaceSnapshot,
} from "@/lib/backend/workspaceSnapshot";
import { getSnapshot, saveSnapshot } from "@/services/snapshotService.js";

type BackendSyncStatus =
  | "disabled"
  | "booting"
  | "ready"
  | "syncing"
  | "error";

interface BackendSyncContextValue {
  enabled: boolean;
  status: BackendSyncStatus;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
}

const BackendSyncContext = createContext<BackendSyncContextValue>({
  enabled: false,
  status: "disabled",
  lastSyncedAt: null,
  syncNow: async () => {},
});

const SYNC_DEBOUNCE_MS = 3000;

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
  const lastSnapshotRef = useRef<string>("");
  const syncInFlightRef = useRef(false);
  const pendingSyncTimeoutRef = useRef<number | null>(null);
  const queuedSyncRef = useRef(false);
  const hydratingSnapshotRef = useRef(false);
  const scheduleSyncRef = useRef<(delay?: number) => void>(() => {});

  const clearPendingSync = useCallback(() => {
    if (pendingSyncTimeoutRef.current !== null) {
      window.clearTimeout(pendingSyncTimeoutRef.current);
      pendingSyncTimeoutRef.current = null;
    }
  }, []);

  const syncNow = useCallback(async () => {
    clearPendingSync();

    if (!enabled || !userId) return;

    if (syncInFlightRef.current) {
      queuedSyncRef.current = true;
      return;
    }

    syncInFlightRef.current = true;
    setStatus("syncing");

    try {
      const snapshot = readWorkspaceSnapshot(userId);
      const savedSnapshot = await saveSnapshot(userId, snapshot);
      hydratingSnapshotRef.current = true;
      hydrateWorkspaceSnapshot(savedSnapshot);
      lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
      setLastSyncedAt(new Date().toISOString());
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      console.error("Workspace sync failed.", error);
      throw error;
    } finally {
      hydratingSnapshotRef.current = false;
      syncInFlightRef.current = false;

      if (
        queuedSyncRef.current ||
        (enabled &&
          userId &&
          JSON.stringify(readWorkspaceSnapshot(userId)) !== lastSnapshotRef.current)
      ) {
        queuedSyncRef.current = false;
        scheduleSyncRef.current();
      }
    }
  }, [clearPendingSync, enabled, userId]);

  const scheduleSync = useCallback(
    (delay = SYNC_DEBOUNCE_MS) => {
      if (!enabled || !userId || !bootResolved) return;

      clearPendingSync();
      pendingSyncTimeoutRef.current = window.setTimeout(() => {
        pendingSyncTimeoutRef.current = null;
        void syncNow();
      }, delay);
    },
    [bootResolved, clearPendingSync, enabled, syncNow, userId],
  );

  useEffect(() => {
    scheduleSyncRef.current = scheduleSync;
  }, [scheduleSync]);

  useEffect(() => {
    setStatus(enabled ? "booting" : "disabled");
    setBootResolved(!enabled);
    lastSnapshotRef.current = "";
    queuedSyncRef.current = false;
    hydratingSnapshotRef.current = false;
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

        if (!remoteSnapshot) {
          await saveSnapshot(userId, snapshot);
        }

        if (!active) return;

        hydratingSnapshotRef.current = true;
        hydrateWorkspaceSnapshot(snapshot);
        lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
        setLastSyncedAt(new Date().toISOString());
        setStatus("ready");
      } catch (error) {
        if (!active) return;

        console.error("Unable to load the saved workspace snapshot.", error);
        hydratingSnapshotRef.current = true;
        hydrateWorkspaceSnapshot(fallbackSnapshot);
        lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
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

    return subscribeToStorage(() => {
      if (hydratingSnapshotRef.current) {
        return;
      }

      const currentSignature = JSON.stringify(readWorkspaceSnapshot(userId));

      if (currentSignature === lastSnapshotRef.current) {
        return;
      }

      scheduleSync();
    });
  }, [bootResolved, enabled, scheduleSync, userId]);

  useEffect(() => clearPendingSync, [clearPendingSync]);

  const value = useMemo(
    () => ({
      enabled,
      status,
      lastSyncedAt,
      syncNow,
    }),
    [enabled, lastSyncedAt, status, syncNow],
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
