import { DAYS, getDayName } from "@/data/tasks";
import {
  getAllTrackableTasks,
  getDailyTasksForDay,
  type CustomTask,
  type DailyTaskListItem,
} from "@/lib/customTasks";

export interface TaskRecord {
  taskId: string;
  weekKey: string;
  completed: boolean;
  completedOn: string | null;
}

export interface DayCompletionSummary {
  date: string;
  day: string;
  completed: number;
  total: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

export interface WeekCompletionSummary {
  day: string;
  date: string;
  tasks: DailyTaskListItem[];
  completed: number;
  total: number;
}

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const createLocalNoonDate = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, 12, 0, 0, 0);

const isValidLocalDateString = (value: unknown): value is string =>
  typeof value === "string" && parseLocalDate(value) !== null;

export const formatLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (value: string): Date | null => {
  const match = LOCAL_DATE_PATTERN.exec(value);

  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = createLocalNoonDate(Number(year), Number(month) - 1, Number(day));

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
};

export const getWeekStartDate = (date: Date = new Date()): Date => {
  const localDate = createLocalNoonDate(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (localDate.getDay() + 6) % 7;

  localDate.setDate(localDate.getDate() - mondayOffset);

  return localDate;
};

export const getWeekKey = (date: Date = new Date()): string => formatLocalDate(getWeekStartDate(date));

const isCompletedValue = (value: unknown): boolean => value === true;

export const normalizeTaskRecord = (value: unknown): TaskRecord | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const taskId = typeof record.taskId === "string" ? record.taskId : "";
  const completed = isCompletedValue(record.completed);
  const weekKey = typeof record.weekKey === "string" ? record.weekKey : "";
  const completedOn = isValidLocalDateString(record.completedOn)
    ? record.completedOn
    : isValidLocalDateString(record.date)
      ? record.date
      : null;

  if (taskId && parseLocalDate(weekKey)) {
    return {
      taskId,
      weekKey,
      completed,
      completedOn: completed ? completedOn : null,
    };
  }

  const legacyDate = typeof record.date === "string" ? record.date : "";
  const parsedLegacyDate = parseLocalDate(legacyDate);

  if (!taskId || !parsedLegacyDate) return null;

  return {
    taskId,
    weekKey: getWeekKey(parsedLegacyDate),
    completed,
    completedOn: completed ? legacyDate : null,
  };
};

export const syncTaskRecords = (value: unknown): TaskRecord[] => {
  if (!Array.isArray(value)) return [];

  const records = new Map<string, TaskRecord>();

  value.forEach((item) => {
    const record = normalizeTaskRecord(item);

    if (record) {
      records.set(`${record.weekKey}:${record.taskId}`, record);
    }
  });

  return Array.from(records.values()).sort(
    (left, right) => left.weekKey.localeCompare(right.weekKey) || left.taskId.localeCompare(right.taskId),
  );
};

const getTaskDayLookup = (customTasks: CustomTask[]): Map<string, string> => {
  const lookup = new Map<string, string>();

  DAYS.forEach((day) => {
    getDailyTasksForDay(day, customTasks).forEach((task) => {
      if (!lookup.has(task.id)) {
        lookup.set(task.id, day);
      }
    });
  });

  return lookup;
};

const getScheduledDateForTask = (
  taskId: string,
  weekKey: string,
  taskDayLookup: Map<string, string>,
): string | null => {
  const dayName = taskDayLookup.get(taskId);
  const weekStart = parseLocalDate(weekKey);

  if (!dayName || !weekStart) return null;

  const scheduledDate = createLocalNoonDate(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate(),
  );
  const dayIndex = DAYS.indexOf(dayName);

  if (dayIndex < 0) return null;

  scheduledDate.setDate(scheduledDate.getDate() + dayIndex);

  return formatLocalDate(scheduledDate);
};

export const resolveTaskRecords = (value: unknown, customTasks: CustomTask[]): TaskRecord[] =>
  {
    const taskDayLookup = getTaskDayLookup(customTasks);

    return syncTaskRecords(value).map((record) => {
      if (!record.completed || record.completedOn) return record;

      const completedOn = getScheduledDateForTask(record.taskId, record.weekKey, taskDayLookup);

      return completedOn ? { ...record, completedOn } : record;
    });
  };

const isTaskCompletedInWeek = (records: TaskRecord[], taskId: string, weekKey: string): boolean =>
  records.some((record) => record.weekKey === weekKey && record.taskId === taskId && record.completed);

const getTaskIdsForDay = (dayName: string, customTasks: CustomTask[]): Set<string> =>
  new Set(getDailyTasksForDay(dayName, customTasks).map((task) => task.id));

export const isTaskCompletedForDate = (
  records: TaskRecord[],
  taskId: string,
  date: Date = new Date(),
): boolean => isTaskCompletedInWeek(records, taskId, getWeekKey(date));

export const getDayCompletionSummary = (
  records: TaskRecord[],
  customTasks: CustomTask[],
  date: Date = new Date(),
): DayCompletionSummary => {
  const dayName = getDayName(date);
  const tasks = getDailyTasksForDay(dayName, customTasks);
  const completed = tasks.filter((task) => isTaskCompletedInWeek(records, task.id, getWeekKey(date))).length;

  return {
    date: formatLocalDate(date),
    day: dayName.slice(0, 3),
    completed,
    total: tasks.length,
  };
};

export const getDayActivitySummary = (
  records: TaskRecord[],
  customTasks: CustomTask[],
  date: Date = new Date(),
): DayCompletionSummary => {
  const dayName = getDayName(date);
  const dateStr = formatLocalDate(date);
  const tasks = getDailyTasksForDay(dayName, customTasks);
  const taskIds = getTaskIdsForDay(dayName, customTasks);
  const completed = records.filter(
    (record) =>
      record.completed &&
      record.completedOn === dateStr &&
      taskIds.has(record.taskId),
  ).length;

  return {
    date: dateStr,
    day: dayName.slice(0, 3),
    completed,
    total: tasks.length,
  };
};

export const getCompletionHistory = (
  records: TaskRecord[],
  customTasks: CustomTask[],
  days: number,
  endDate: Date = new Date(),
): DayCompletionSummary[] => {
  const history: DayCompletionSummary[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = createLocalNoonDate(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    date.setDate(date.getDate() - index);
    history.push(getDayActivitySummary(records, customTasks, date));
  }

  return history;
};

export const getCurrentWeekSummary = (
  records: TaskRecord[],
  customTasks: CustomTask[],
  date: Date = new Date(),
): WeekCompletionSummary[] => {
  const weekStart = getWeekStartDate(date);
  const weekKey = getWeekKey(date);

  return DAYS.map((day, index) => {
    const dayDate = createLocalNoonDate(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    dayDate.setDate(dayDate.getDate() + index);

    const tasks = getDailyTasksForDay(day, customTasks);
    const completed = tasks.filter((task) => isTaskCompletedInWeek(records, task.id, weekKey)).length;

    return {
      day,
      date: formatLocalDate(dayDate),
      tasks,
      completed,
      total: tasks.length,
    };
  });
};

export const getStreakInfo = (
  records: TaskRecord[],
  customTasks: CustomTask[],
  lookbackDays = 365,
  endDate: Date = new Date(),
): StreakInfo => {
  let longest = 0;
  let running = 0;
  const dailyActivity: boolean[] = [];

  for (let index = lookbackDays - 1; index >= 0; index -= 1) {
    const date = createLocalNoonDate(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    date.setDate(date.getDate() - index);
    const daySummary = getDayActivitySummary(records, customTasks, date);
    const hasCompletedTask = daySummary.completed > 0;

    dailyActivity.push(hasCompletedTask);

    if (hasCompletedTask) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  let currentIndex = dailyActivity.length - 1;

  if (currentIndex >= 0 && !dailyActivity[currentIndex]) {
    currentIndex -= 1;
  }

  while (currentIndex >= 0 && dailyActivity[currentIndex]) {
    current += 1;
    currentIndex -= 1;
  }

  return { current, longest };
};

export const getCategoryStats = (
  records: TaskRecord[],
  customTasks: CustomTask[],
): Array<{ name: string; value: number }> => {
  const stats: Record<string, number> = {};
  const taskLookup = new Map(getAllTrackableTasks(customTasks).map((task) => [task.id, task]));

  records
    .filter((record) => record.completed)
    .forEach((record) => {
      const task = taskLookup.get(record.taskId);

      if (task) {
        stats[task.category] = (stats[task.category] || 0) + 1;
      }
    });

  return Object.entries(stats).map(([name, value]) => ({ name, value }));
};
