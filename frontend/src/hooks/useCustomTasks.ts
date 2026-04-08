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
  const defaultTasks = useMemo(
    () => tasks.filter((task) => task.source === "default"),
    [tasks],
  );
  const customTasks = useMemo(
    () => tasks.filter((task) => task.source === "custom"),
    [tasks],
  );

  const setTasks = (value: CustomTaskUpdater) => {
    setStoredTasks((prev) => {
      const current = syncCustomTasks(prev);
      const nextValue = typeof value === "function" ? value(current) : value;
      return syncCustomTasks(nextValue);
    });
  };

  const setCustomTasks = (value: CustomTaskUpdater) => {
    setStoredTasks((prev) => {
      const current = syncCustomTasks(prev);
      const currentCustomTasks = current.filter((task) => task.source === "custom");
      const nextCustomTasks = typeof value === "function" ? value(currentCustomTasks) : value;

      return syncCustomTasks([
        ...current.filter((task) => task.source === "default"),
        ...nextCustomTasks.map((task) => ({
          ...task,
          source: "custom" as const,
        })),
      ]);
    });
  };

  return { tasks, defaultTasks, customTasks, setTasks, setCustomTasks };
}
