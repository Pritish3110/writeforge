import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { useCustomTasks } from "@/hooks/useCustomTasks";
import {
  getCategoryStats as buildCategoryStats,
  getCompletionHistory,
  getCurrentWeekSummary,
  getDayCompletionSummary,
  formatLocalDate,
  getStreakInfo,
  getWeekKey,
  isTaskCompletedForDate,
  resolveTaskRecords,
  type StreakInfo,
  type TaskRecord,
} from "@/lib/taskTracking";

export function useTaskTracking() {
  const [storedRecords, setStoredRecords] = useLocalStorage<unknown[]>("writeforge-tasks", []);
  const { tasks } = useCustomTasks();
  const records = useMemo(
    () => resolveTaskRecords(storedRecords, tasks),
    [storedRecords, tasks],
  );

  const toggleTask = (taskId: string, date: Date = new Date()) => {
    const weekKey = getWeekKey(date);
    const completedOn = formatLocalDate(date);
    setStoredRecords((prev) => {
      const nextRecords = resolveTaskRecords(prev, tasks);
      const idx = nextRecords.findIndex((record) => record.weekKey === weekKey && record.taskId === taskId);

      if (idx >= 0) {
        const copy = [...nextRecords];
        copy[idx] = {
          ...copy[idx],
          completed: !copy[idx].completed,
          completedOn: copy[idx].completed ? null : completedOn,
        };
        return copy;
      }

      return [...nextRecords, { weekKey, taskId, completed: true, completedOn }];
    });
  };

  const isCompleted = (taskId: string, date: Date = new Date()) => isTaskCompletedForDate(records, taskId, date);

  const getTodayCompleted = () => {
    const summary = getDayCompletionSummary(records, tasks);
    return { completed: summary.completed, total: summary.total };
  };

  const getLast7Days = () => getCompletionHistory(records, tasks, 7);

  const getLast28Days = () => getCompletionHistory(records, tasks, 28);

  const getCurrentWeek = () => getCurrentWeekSummary(records, tasks);

  const getStreak = (): StreakInfo => getStreakInfo(records, tasks);

  const getCategoryStats = () => buildCategoryStats(records, tasks);

  const resetAll = () => setStoredRecords([]);

  return {
    records,
    toggleTask,
    isCompleted,
    getTodayCompleted,
    getLast7Days,
    getLast28Days,
    getCurrentWeek,
    getStreak,
    getCategoryStats,
    resetAll,
  };
}
