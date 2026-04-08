import { useEffect, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  CUSTOM_TASK_STORAGE_KEY,
  syncCustomTasks,
  type CustomTask,
} from "@/lib/customTasks";

type CustomTaskUpdater = CustomTask[] | ((prev: CustomTask[]) => CustomTask[]);

export function useCustomTasks() {
  const [storedTasks, setStoredTasks] = useLocalStorage<unknown[]>(CUSTOM_TASK_STORAGE_KEY, []);

  useEffect(() => {
    setStoredTasks((prev) => {
      const synced = syncCustomTasks(prev);
      return JSON.stringify(prev) === JSON.stringify(synced) ? prev : synced;
    });
  }, [setStoredTasks]);

  const tasks = useMemo(() => syncCustomTasks(storedTasks), [storedTasks]);

  const setTasks = (value: CustomTaskUpdater) => {
    setStoredTasks((prev) => {
      const current = syncCustomTasks(prev);
      const nextValue = typeof value === "function" ? value(current) : value;
      return syncCustomTasks(nextValue);
    });
  };

  return { tasks, setTasks };
}
