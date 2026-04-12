import { DAILY_TASKS, DAYS, getDayName, type TaskDefinition } from "@/data/tasks";

export const CUSTOM_TASK_STORAGE_KEY = "writeforge-custom-tasks";
export const CUSTOM_TASK_CATEGORIES = [
  "Character",
  "Emotion",
  "Plot",
  "Dialogue",
  "Action",
  "World",
  "Worldbuilding",
  "Prose",
  "Custom",
] as const;

export type CustomTaskCategory = (typeof CUSTOM_TASK_CATEGORIES)[number];
export type CustomTaskDay = (typeof DAYS)[number];
export type CustomTaskSource = "default" | "custom";

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
  writingPrinciples: string[];
  review: string[];
  assignedDay: CustomTaskDay;
  savedAsTemplate: boolean;
  source: CustomTaskSource;
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
const DEFAULT_TASK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

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

const isCustomTaskSource = (value: unknown): value is CustomTaskSource =>
  value === "default" || value === "custom";

const normalizeStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => toText(entry).trim())
        .filter(Boolean)
    : [];

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
    writingPrinciples: [...DEFAULT_CUSTOM_WRITING_PRINCIPLES],
    review: [...DEFAULT_CUSTOM_REVIEW],
    assignedDay: getDayName() as CustomTaskDay,
    savedAsTemplate: false,
    source: "custom",
    order: Number.MAX_SAFE_INTEGER,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createSeededStep = (taskId: string, index: number, text: string): CustomTaskStep => ({
  id: `${taskId}-step-${index + 1}`,
  text,
});

const createSeededRule = (taskId: string, index: number, text: string, enabled = true): CustomTaskRule => ({
  id: `${taskId}-rule-${index + 1}`,
  text,
  enabled,
});

const normalizeStep = (value: unknown, fallbackId = crypto.randomUUID()): CustomTaskStep => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || fallbackId,
    text: toText(record.text),
  };
};

const normalizeRule = (value: unknown, fallbackId = crypto.randomUUID()): CustomTaskRule => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    id: toText(record.id) || fallbackId,
    text: toText(record.text),
    enabled: toBoolean(record.enabled),
  };
};

const buildDefaultTaskLibrary = (): CustomTask[] =>
  DAYS.flatMap((day) =>
    (DAILY_TASKS[day] || []).map((task, index) => ({
      id: task.id,
      title: task.title,
      category: isCustomTaskCategory(task.category) ? task.category : "Custom",
      durationMinutes: task.durationMinutes,
      prompt: task.prompt,
      steps: task.steps.map((step, stepIndex) => createSeededStep(task.id, stepIndex, step)),
      importantRules: task.importantRules.map((rule, ruleIndex) =>
        createSeededRule(task.id, ruleIndex, rule),
      ),
      writingPrinciples: [...task.writingPrinciples],
      review: [...task.review],
      assignedDay: day as CustomTaskDay,
      savedAsTemplate: false,
      source: "default" as const,
      order: index,
      createdAt: DEFAULT_TASK_TIMESTAMP,
      updatedAt: DEFAULT_TASK_TIMESTAMP,
    })),
  );

const DEFAULT_TASK_LIBRARY = buildDefaultTaskLibrary();
const DEFAULT_TASK_LOOKUP = new Map(DEFAULT_TASK_LIBRARY.map((task) => [task.id, task]));

export const normalizeCustomTask = (
  value: unknown,
  fallbackOrder: number,
  fallbackTask?: CustomTask,
): CustomTask => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const taskId = toText(record.id) || fallbackTask?.id || crypto.randomUUID();
  const createdAt = toText(record.createdAt) || fallbackTask?.createdAt || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;
  const steps = Array.isArray(record.steps)
    ? record.steps.map((step, index) => normalizeStep(step, createSeededStep(taskId, index, "").id))
    : fallbackTask?.steps.map((step) => ({ ...step })) || [];
  const importantRules = Array.isArray(record.importantRules)
    ? record.importantRules.map((rule, index) => normalizeRule(rule, createSeededRule(taskId, index, "").id))
    : fallbackTask?.importantRules.map((rule) => ({ ...rule })) || [];
  const source =
    fallbackTask?.source === "default"
      ? "default"
      : isCustomTaskSource(record.source)
        ? record.source
        : fallbackTask?.source || "custom";
  const writingPrinciples = normalizeStringList(record.writingPrinciples);
  const review = normalizeStringList(record.review);

  return {
    id: taskId,
    title: toText(record.title) || fallbackTask?.title || "",
    category: isCustomTaskCategory(record.category)
      ? record.category
      : fallbackTask?.category || "Custom",
    durationMinutes: Math.max(1, toNumber(record.durationMinutes, fallbackTask?.durationMinutes || 10)),
    prompt: toText(record.prompt) || fallbackTask?.prompt || "",
    steps: steps.length > 0 ? steps : [createCustomTaskStep()],
    importantRules: importantRules.length > 0 ? importantRules : [createCustomTaskRule()],
    writingPrinciples:
      writingPrinciples.length > 0
        ? writingPrinciples
        : fallbackTask?.writingPrinciples || [...DEFAULT_CUSTOM_WRITING_PRINCIPLES],
    review: review.length > 0 ? review : fallbackTask?.review || [...DEFAULT_CUSTOM_REVIEW],
    assignedDay: isCustomTaskDay(record.assignedDay)
      ? record.assignedDay
      : fallbackTask?.assignedDay || "Monday",
    savedAsTemplate:
      source === "custom" &&
      (record.savedAsTemplate === undefined
        ? fallbackTask?.savedAsTemplate || false
        : toBoolean(record.savedAsTemplate)),
    source,
    order: toNumber(record.order, fallbackTask?.order ?? fallbackOrder),
    createdAt,
    updatedAt,
  };
};

export const sortCustomTasks = (tasks: CustomTask[]): CustomTask[] =>
  [...tasks].sort((left, right) => {
    if (left.source !== right.source) return left.source === "default" ? -1 : 1;

    if (left.source === "default" && right.source === "default") {
      const leftDayIndex = DAYS.indexOf(left.assignedDay);
      const rightDayIndex = DAYS.indexOf(right.assignedDay);

      if (leftDayIndex !== rightDayIndex) return leftDayIndex - rightDayIndex;
    }

    if (left.order !== right.order) return left.order - right.order;
    return left.title.localeCompare(right.title);
  });

export const assignCustomTaskOrder = (tasks: CustomTask[]): CustomTask[] =>
  {
    let customOrder = 0;

    return tasks.map((task) =>
      task.source === "custom"
        ? {
            ...task,
            order: customOrder++,
          }
        : task,
    );
  };

export const syncCustomTasks = (value: unknown): CustomTask[] => {
  const normalized = Array.isArray(value)
    ? value.map((task, index) => {
        const record = task && typeof task === "object" ? (task as Record<string, unknown>) : {};
        return normalizeCustomTask(task, index, DEFAULT_TASK_LOOKUP.get(toText(record.id)));
      })
    : [];

  const tasksById = new Map(normalized.map((task) => [task.id, task]));

  DEFAULT_TASK_LIBRARY.forEach((task) => {
    if (!tasksById.has(task.id)) {
      tasksById.set(task.id, {
        ...task,
        steps: task.steps.map((step) => ({ ...step })),
        importantRules: task.importantRules.map((rule) => ({ ...rule })),
        writingPrinciples: [...task.writingPrinciples],
        review: [...task.review],
      });
    }
  });

  return assignCustomTaskOrder(sortCustomTasks(Array.from(tasksById.values())));
};

export const cloneCustomTask = (task: CustomTask): CustomTask => ({
  ...task,
  steps: task.steps.map((step) => ({ ...step })),
  importantRules: task.importantRules.map((rule) => ({ ...rule })),
  writingPrinciples: [...task.writingPrinciples],
  review: [...task.review],
});

export const duplicateCustomTask = (task: CustomTask): CustomTask => {
  const timestamp = new Date().toISOString();

  return {
    ...cloneCustomTask(task),
    id: crypto.randomUUID(),
    title: `${task.title || "Untitled Task"} Copy`,
    steps: task.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
    importantRules: task.importantRules.map((rule) => ({ ...rule, id: crypto.randomUUID() })),
    source: "custom",
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
  writingPrinciples: task.writingPrinciples.length > 0 ? task.writingPrinciples : DEFAULT_CUSTOM_WRITING_PRINCIPLES,
  review: task.review.length > 0 ? task.review : DEFAULT_CUSTOM_REVIEW,
  source: task.source,
  assignedDay: task.assignedDay,
  savedAsTemplate: task.source === "custom" ? task.savedAsTemplate : false,
});

export const getDailyTasksForDay = (
  day: string,
  customTasks: CustomTask[],
): DailyTaskListItem[] =>
  syncCustomTasks(customTasks)
    .filter((task) => task.assignedDay === day)
    .map(buildCustomTaskDefinition);

export const getAllTrackableTasks = (customTasks: CustomTask[]): DailyTaskListItem[] => [
  ...syncCustomTasks(customTasks).map(buildCustomTaskDefinition),
];
