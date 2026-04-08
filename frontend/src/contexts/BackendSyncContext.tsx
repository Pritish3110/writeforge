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

  const syncNow = useCallback(async () => {
    if (!enabled || !userId || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setStatus("syncing");

    try {
      const snapshot = readWorkspaceSnapshot(userId);
      const savedSnapshot = await saveSnapshot(userId, snapshot);
      hydrateWorkspaceSnapshot(savedSnapshot);
      lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
      setLastSyncedAt(new Date().toISOString());
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      console.error("Workspace sync failed.", error);
      throw error;
    } finally {
      syncInFlightRef.current = false;
    }
  }, [enabled, userId]);

  useEffect(() => {
    setStatus(enabled ? "booting" : "disabled");
    setBootResolved(!enabled);
    lastSnapshotRef.current = "";
  }, [enabled, userId]);

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

        hydrateWorkspaceSnapshot(snapshot);
        lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
        setLastSyncedAt(new Date().toISOString());
        setStatus("ready");
      } catch (error) {
        if (!active) return;

        console.error("Unable to load the saved workspace snapshot.", error);
        hydrateWorkspaceSnapshot(fallbackSnapshot);
        lastSnapshotRef.current = JSON.stringify(readWorkspaceSnapshot(userId));
        setStatus("error");
      } finally {
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

    const interval = window.setInterval(() => {
      const currentSignature = JSON.stringify(readWorkspaceSnapshot(userId));

      if (
        currentSignature !== lastSnapshotRef.current &&
        !syncInFlightRef.current
      ) {
        void syncNow();
      }
    }, 1500);

    return () => {
      window.clearInterval(interval);
    };
  }, [bootResolved, enabled, syncNow, userId]);

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
