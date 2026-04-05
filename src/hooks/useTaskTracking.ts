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
  syncTaskRecords,
  type StreakInfo,
  type TaskRecord,
} from "@/lib/taskTracking";

export function useTaskTracking() {
  const [storedRecords, setStoredRecords] = useLocalStorage<unknown[]>("writeforge-tasks", []);
  const { tasks: customTasks } = useCustomTasks();
  const records = useMemo(() => syncTaskRecords(storedRecords), [storedRecords]);

  const toggleTask = (taskId: string, date: Date = new Date()) => {
    const weekKey = getWeekKey(date);
    const completedOn = formatLocalDate(date);
    setStoredRecords((prev) => {
      const nextRecords = syncTaskRecords(prev);
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
    const summary = getDayCompletionSummary(records, customTasks);
    return { completed: summary.completed, total: summary.total };
  };

  const getLast7Days = () => getCompletionHistory(records, customTasks, 7);

  const getLast28Days = () => getCompletionHistory(records, customTasks, 28);

  const getCurrentWeek = () => getCurrentWeekSummary(records, customTasks);

  const getStreak = (): StreakInfo => getStreakInfo(records, customTasks);

  const getCategoryStats = () => buildCategoryStats(records, customTasks);

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
