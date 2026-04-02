import { DAILY_TASKS, DAYS, getDayName, type TaskDefinition } from "@/data/tasks";

export const CUSTOM_TASK_STORAGE_KEY = "writeforge-custom-tasks";
export const CUSTOM_TASK_CATEGORIES = ["Action", "Dialogue", "Emotion", "Worldbuilding", "Custom"] as const;

export type CustomTaskCategory = (typeof CUSTOM_TASK_CATEGORIES)[number];
export type CustomTaskDay = (typeof DAYS)[number];

export interface CustomTaskStep {
  id: string;
  text: string;
}

export interface CustomTaskRule {
  id: string;
  text: string;
  enabled: boolean;
}

export interface CustomTask {
  id: string;
  title: string;
  category: CustomTaskCategory;
  durationMinutes: number;
  prompt: string;
  steps: CustomTaskStep[];
  importantRules: CustomTaskRule[];
  assignedDay: CustomTaskDay;
  savedAsTemplate: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTaskListItem extends TaskDefinition {
  source: "default" | "custom";
  assignedDay?: CustomTaskDay;
  savedAsTemplate?: boolean;
}

const CATEGORY_VALUES = new Set<string>(CUSTOM_TASK_CATEGORIES);
const DAY_VALUES = new Set<string>(DAYS);

const DEFAULT_CUSTOM_WRITING_PRINCIPLES = [
  "Make the prompt specific enough to create pressure.",
  "Use steps to guide focus, not to over-explain.",
  "Refine the task after each session based on what worked.",
];

const DEFAULT_CUSTOM_REVIEW = [
  "Did the prompt create the kind of writing pressure you wanted?",
  "Which step helped most, and which one needs refinement?",
  "What would make this exercise sharper next time?",
];

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const toBoolean = (value: unknown): boolean => value === true;

const isCustomTaskCategory = (value: unknown): value is CustomTaskCategory =>
  typeof value === "string" && CATEGORY_VALUES.has(value);

const isCustomTaskDay = (value: unknown): value is CustomTaskDay =>
  typeof value === "string" && DAY_VALUES.has(value);

export const createCustomTaskStep = (text = ""): CustomTaskStep => ({
  id: crypto.randomUUID(),
  text,
});

export const createCustomTaskRule = (text = "", enabled = true): CustomTaskRule => ({
  id: crypto.randomUUID(),
  text,
  enabled,
});

export const createEmptyCustomTask = (): CustomTask => {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "",
    category: "Custom",
    durationMinutes: 10,
    prompt: "",
    steps: [createCustomTaskStep()],
    importantRules: [createCustomTaskRule()],
    assignedDay: getDayName() as CustomTaskDay,
    savedAsTemplate: false,
    order: Number.MAX_SAFE_INTEGER,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const normalizeStep = (value: unknown): CustomTaskStep => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || crypto.randomUUID(),
    text: toText(record.text),
  };
};

const normalizeRule = (value: unknown): CustomTaskRule => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || crypto.randomUUID(),
    text: toText(record.text),
    enabled: toBoolean(record.enabled),
  };
};

export const normalizeCustomTask = (value: unknown, fallbackOrder: number): CustomTask => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const createdAt = toText(record.createdAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;
  const steps = Array.isArray(record.steps)
    ? record.steps.map(normalizeStep)
    : [];
  const importantRules = Array.isArray(record.importantRules)
    ? record.importantRules.map(normalizeRule)
    : [];

  return {
    id: toText(record.id) || crypto.randomUUID(),
    title: toText(record.title),
    category: isCustomTaskCategory(record.category) ? record.category : "Custom",
    durationMinutes: Math.max(1, toNumber(record.durationMinutes, 10)),
    prompt: toText(record.prompt),
    steps: steps.length > 0 ? steps : [createCustomTaskStep()],
    importantRules: importantRules.length > 0 ? importantRules : [createCustomTaskRule()],
    assignedDay: isCustomTaskDay(record.assignedDay) ? record.assignedDay : "Monday",
    savedAsTemplate: toBoolean(record.savedAsTemplate),
    order: toNumber(record.order, fallbackOrder),
    createdAt,
    updatedAt,
  };
};

export const sortCustomTasks = (tasks: CustomTask[]): CustomTask[] =>
  [...tasks].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.title.localeCompare(right.title);
  });

export const assignCustomTaskOrder = (tasks: CustomTask[]): CustomTask[] =>
  tasks.map((task, index) => ({
    ...task,
    order: index,
  }));

export const syncCustomTasks = (value: unknown): CustomTask[] => {
  const normalized = Array.isArray(value)
    ? value.map((task, index) => normalizeCustomTask(task, index))
    : [];

  return assignCustomTaskOrder(sortCustomTasks(normalized));
};

export const cloneCustomTask = (task: CustomTask): CustomTask => ({
  ...task,
  steps: task.steps.map((step) => ({ ...step })),
  importantRules: task.importantRules.map((rule) => ({ ...rule })),
});

export const duplicateCustomTask = (task: CustomTask): CustomTask => {
  const timestamp = new Date().toISOString();

  return {
    ...cloneCustomTask(task),
    id: crypto.randomUUID(),
    title: `${task.title || "Untitled Task"} Copy`,
    steps: task.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
    importantRules: task.importantRules.map((rule) => ({ ...rule, id: crypto.randomUUID() })),
    order: Number.MAX_SAFE_INTEGER,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const buildCustomTaskDefinition = (task: CustomTask): DailyTaskListItem => ({
  id: task.id,
  title: task.title.trim() || "Untitled Task",
  category: task.category,
  prompt: task.prompt.trim() || "No prompt yet.",
  steps: task.steps.map((step) => step.text.trim()).filter(Boolean),
  durationMinutes: task.durationMinutes,
  importantRules: task.importantRules
    .filter((rule) => rule.enabled)
    .map((rule) => rule.text.trim())
    .filter(Boolean),
  writingPrinciples: DEFAULT_CUSTOM_WRITING_PRINCIPLES,
  review: DEFAULT_CUSTOM_REVIEW,
  source: "custom",
  assignedDay: task.assignedDay,
  savedAsTemplate: task.savedAsTemplate,
});

export const getDailyTasksForDay = (
  day: string,
  customTasks: CustomTask[],
): DailyTaskListItem[] => {
  const defaultTasks = (DAILY_TASKS[day] || []).map((task) => ({
    ...task,
    source: "default" as const,
  }));

  const assignedCustomTasks = customTasks
    .filter((task) => task.assignedDay === day)
    .map(buildCustomTaskDefinition);

  return [...defaultTasks, ...assignedCustomTasks];
};

export const getAllTrackableTasks = (customTasks: CustomTask[]): DailyTaskListItem[] => [
  ...Object.values(DAILY_TASKS).flat().map((task) => ({
    ...task,
    source: "default" as const,
  })),
  ...customTasks.map(buildCustomTaskDefinition),
];
