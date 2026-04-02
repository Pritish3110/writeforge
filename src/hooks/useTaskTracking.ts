import { useLocalStorage } from "./useLocalStorage";
import { DAYS, getDayName } from "@/data/tasks";
import { useCustomTasks } from "@/hooks/useCustomTasks";
import { getAllTrackableTasks, getDailyTasksForDay } from "@/lib/customTasks";

export interface TaskRecord {
  date: string;
  taskId: string;
  completed: boolean;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

const todayStr = () => new Date().toISOString().split("T")[0];

export function useTaskTracking() {
  const [records, setRecords] = useLocalStorage<TaskRecord[]>("writeforge-tasks", []);
  const { tasks: customTasks } = useCustomTasks();

  const toggleTask = (taskId: string) => {
    const date = todayStr();
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === date && r.taskId === taskId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], completed: !copy[idx].completed };
        return copy;
      }
      return [...prev, { date, taskId, completed: true }];
    });
  };

  const isCompleted = (taskId: string, date?: string) => {
    const d = date || todayStr();
    return records.some((r) => r.date === d && r.taskId === taskId && r.completed);
  };

  const getTodayCompleted = () => {
    const date = todayStr();
    const dayTasks = getDailyTasksForDay(getDayName(), customTasks);
    const completed = dayTasks.filter((t) => isCompleted(t.id, date)).length;
    return { completed, total: dayTasks.length };
  };

  const getLast7Days = () => {
    const result: { date: string; day: string; completed: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const dayTasks = getDailyTasksForDay(dayName, customTasks);
      const completed = dayTasks.filter((t) =>
        records.some((r) => r.date === dateStr && r.taskId === t.id && r.completed)
      ).length;
      result.push({ date: dateStr, day: dayName.slice(0, 3), completed, total: dayTasks.length });
    }
    return result;
  };

  const getStreak = (): StreakInfo => {
    let current = 0;
    let longest = 0;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const dayTasks = getDailyTasksForDay(dayName, customTasks);
      const completed = dayTasks.filter((t) =>
        records.some((r) => r.date === dateStr && r.taskId === t.id && r.completed)
      ).length;
      if (completed > 0) {
        streak++;
        longest = Math.max(longest, streak);
        if (i <= 1) current = streak;
      } else if (i > 0) {
        streak = 0;
      }
    }
    return { current, longest };
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    const taskLookup = new Map(getAllTrackableTasks(customTasks).map((task) => [task.id, task]));

    records.filter((r) => r.completed).forEach((r) => {
      const task = taskLookup.get(r.taskId);

      if (task) {
        stats[task.category] = (stats[task.category] || 0) + 1;
      }
    });

    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const resetAll = () => setRecords([]);

  return { records, toggleTask, isCompleted, getTodayCompleted, getLast7Days, getStreak, getCategoryStats, resetAll };
}
