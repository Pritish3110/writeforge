export interface GeneratedTaskResult {
  title: string;
  description: string;
  focus: string;
  usedCount: number;
  recycledPool: boolean;
}

export const TASK_TEMPLATES = [
  "Write a focused exercise that strengthens {focus}, and keep the prose concrete, readable, and controlled.",
  "Develop a short passage centered on {focus}, making the skill visible through clear choices on the page.",
  "Create a writing drill where {focus} becomes the main craft challenge and avoid generic phrasing.",
  "Write a controlled scene exercise emphasizing {focus}, and revise any line that feels vague or repetitive.",
  "Build a short practice passage where {focus} drives the page-level decisions from start to finish.",
  "Design a writing task that isolates {focus} so you can practice it without leaning on easy shortcuts.",
  "Write a passage where {focus} is revealed indirectly through actions, rhythm, and specific detail.",
  "Create a task focusing on {focus}, ensuring clarity, pressure, and deliberate execution.",
  "Develop a compact writing exercise where {focus} sharpens the scene instead of sitting in the background.",
  "Write a short skill drill centered on {focus}, and keep every sentence serving that goal.",
] as const;

export const TASK_FOCUS = [
  "character contradiction",
  "internal conflict",
  "subtle emotional expression",
  "dialogue without tags",
  "environmental storytelling",
  "pacing control",
  "tension building",
  "decision making under pressure",
  "sensory immersion",
  "non-verbal communication",
  "power dynamics",
  "psychological tension",
  "show vs tell balance",
  "scene transitions",
  "character motivation clarity",
] as const;

const MAX_USED_TASKS = 120;
const usedTasks = new Set<string>();

export function getRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const replacePlaceholders = (template: string, replacements: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => replacements[key] || "");

export function generateTaskTitle({ focus }: { focus: string }) {
  const formattedFocus = toTitleCase(focus);
  const formats = [
    `Focus: ${formattedFocus}`,
    `Exercise: ${formattedFocus}`,
    `Practice: ${formattedFocus}`,
    `Skill Drill: ${formattedFocus}`,
  ];

  return getRandom(formats);
}

export const resetUsedTasks = () => {
  usedTasks.clear();
};

export const getUsedTaskCount = () => usedTasks.size;

export function generateTask(): GeneratedTaskResult {
  let attempts = 0;
  let description = "";
  let focus = getRandom(TASK_FOCUS);

  while (attempts < 20) {
    const template = getRandom(TASK_TEMPLATES);
    focus = getRandom(TASK_FOCUS);

    description = replacePlaceholders(template, {
      focus,
    });

    if (!usedTasks.has(description)) break;
    attempts += 1;
  }

  let recycledPool = false;
  if (usedTasks.has(description)) {
    usedTasks.clear();
    recycledPool = true;
  }

  usedTasks.add(description);

  if (usedTasks.size > MAX_USED_TASKS) {
    usedTasks.clear();
    usedTasks.add(description);
    recycledPool = true;
  }

  return {
    title: generateTaskTitle({ focus }),
    description,
    focus,
    usedCount: usedTasks.size,
    recycledPool,
  };
}
