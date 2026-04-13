import { auth } from "@/firebase/auth";
import { readStoredBackendUser } from "@/lib/backend/workspaceSnapshot";
import { buildApiUrl } from "@/services/apiBase";

export type LearningPerformance = "again" | "hard" | "good" | "easy";
export type LearningStage = "learn" | "recognize" | "apply" | "mastered";
export type LearningPathStatus = "completed" | "current" | "upcoming";
export type SkillBuilderTrend = "improving" | "declining" | "steady";

export interface LearningConceptGuide {
  what: string;
  why: string;
  steps: string[];
  examples: string[];
}

export interface LearningTopic {
  id: string;
  order: number;
  title: string;
  definition: string;
  examples: string[];
  conceptGuide: LearningConceptGuide;
  themeId: string;
  themeTitle: string;
}

export interface LearningThemeSummary {
  id: string;
  title: string;
  totalTopics: number;
  masteredTopics: number;
  status: "completed" | "in_progress" | "up_next";
}

export interface LearningWeakTopic {
  topicId: string;
  title: string;
  themeTitle: string;
  stage: LearningStage;
  weaknessScore: number;
  againCount: number;
  hardCount: number;
  recommendation: string;
}

export interface LearningProgressSummary {
  totalTopics: number;
  topicsStarted: number;
  topicsCompleted: number;
  dueToday: number;
  streak: {
    current: number;
    longest: number;
  };
  weakTopics: LearningWeakTopic[];
  stageBreakdown: Record<string, number>;
  themes: LearningThemeSummary[];
  activeTheme: LearningThemeSummary | null;
  heatmap: Array<{
    date: string;
    count: number;
    level: number;
  }>;
  learningPath: LearningPathItem[];
  skillBuilderInsights?: SkillBuilderInsights;
}

export interface SkillBuilderTopicStat {
  topicId: string;
  title: string;
  themeTitle: string;
  attempts: number;
  avgScore: number;
  latestScore: number;
  mastery: number;
  trend: SkillBuilderTrend;
  recommendation?: string;
}

export interface LearningPathItem {
  topicId: string;
  title: string;
  themeTitle: string;
  stage: LearningStage | "unseen";
  completed: boolean;
  status: LearningPathStatus;
  mastery: number;
}

export interface SkillBuilderBreakdownCategory {
  score: number;
  label: string;
  detail: string;
}

export interface SkillBuilderAttemptSummary {
  id: string;
  topicId: string;
  title: string;
  content: string;
  feedback: string;
  score: number;
  createdAt: string;
  tags: string[];
  breakdown: {
    structure: SkillBuilderBreakdownCategory;
    creativity: SkillBuilderBreakdownCategory;
    clarity: SkillBuilderBreakdownCategory;
  };
}

export interface SkillBuilderInsights {
  entriesCount: number;
  totalWritingCount: number;
  totalWritingWords: number;
  avgScore: number;
  trend: SkillBuilderTrend;
  heatmap: Array<{
    date: string;
    count: number;
    level: number;
  }>;
  topicsPracticed: SkillBuilderTopicStat[];
  weakAreas: SkillBuilderTopicStat[];
  recentAttempts: SkillBuilderAttemptSummary[];
}

interface LearningPayloadBase {
  type: "learn" | "mcq" | "write";
  stage: LearningStage;
}

export interface LearningLearnPayload extends LearningPayloadBase {
  type: "learn";
  data: LearningTopic;
}

export interface LearningMcqPayload extends LearningPayloadBase {
  type: "mcq";
  question: string;
  options: Array<{
    id: string;
    label: string;
  }>;
  answerId: string;
}

export interface LearningWritePayload extends LearningPayloadBase {
  type: "write";
  prompt: string;
  guidance: string;
}

export type LearningStagePayload =
  | LearningLearnPayload
  | LearningMcqPayload
  | LearningWritePayload;

export interface LearningQueueItem {
  topicId: string;
  title: string;
  themeTitle: string;
  stage: LearningStage;
  topic?: LearningTopic;
  payload: LearningStagePayload;
}

export interface LearningTodaySummary {
  theme: LearningThemeSummary | null;
  new: LearningQueueItem | null;
  reviews: LearningQueueItem[];
  application: LearningQueueItem | null;
}

export interface LearningTodayResponse {
  success: boolean;
  userId: string;
  today: LearningTodaySummary;
  progress: LearningProgressSummary;
}

export interface LearningProgressResponse {
  success: boolean;
  userId: string;
  progress: LearningProgressSummary;
}

export interface LearningSubmitResponse {
  success: boolean;
  userId: string;
  topicId: string;
  performance: LearningPerformance;
  stage: LearningStage;
  nextReview: string;
  intervalDays: number;
  easeFactor: number;
  reinforcementTriggered: boolean;
  progress: LearningProgressSummary;
}

export interface SkillBuilderEntry {
  id: string;
  user_id: string;
  topic_id: string;
  content: string;
  created_at: string;
  evaluation_score: number;
  tags: string[];
  feedback: string;
  breakdown: {
    structure: SkillBuilderBreakdownCategory;
    creativity: SkillBuilderBreakdownCategory;
    clarity: SkillBuilderBreakdownCategory;
  };
  weak_parts: string[];
  metrics: {
    wordCount: number;
    sentenceCount: number;
  };
}

export interface SkillBuilderEvaluation {
  score: number;
  tags: string[];
  feedback: string;
  suggestion: string;
  breakdown: {
    structure: SkillBuilderBreakdownCategory;
    creativity: SkillBuilderBreakdownCategory;
    clarity: SkillBuilderBreakdownCategory;
  };
  weakParts: string[];
  metrics: {
    wordCount: number;
    sentenceCount: number;
  };
}

export interface SkillBuilderSubmitResponse {
  success: boolean;
  userId: string;
  entry: SkillBuilderEntry;
  evaluation: SkillBuilderEvaluation;
  performance: LearningPerformance;
  progress: LearningProgressSummary;
  stage: LearningStage;
  nextReview: string;
}

const resolveLearningUserId = async () => {
  const currentUser = auth.currentUser;

  if (currentUser?.uid) {
    return currentUser.uid;
  }

  return readStoredBackendUser()?.id || "local-workspace";
};

const createLearningHeaders = async () => ({
  "Content-Type": "application/json",
  "x-learning-user-id": await resolveLearningUserId(),
});

const normalizeBreakdownCategory = (
  value: Partial<SkillBuilderBreakdownCategory> | null | undefined,
  fallbackLabel: string,
  fallbackDetail: string,
): SkillBuilderBreakdownCategory => ({
  score: typeof value?.score === "number" ? value.score : 0,
  label: typeof value?.label === "string" && value.label.trim() ? value.label : fallbackLabel,
  detail:
    typeof value?.detail === "string" && value.detail.trim()
      ? value.detail
      : fallbackDetail,
});

const normalizeTopic = (topic: Partial<LearningTopic> | null | undefined): LearningTopic => {
  const examples = Array.isArray(topic?.examples)
    ? topic.examples.map((example) => String(example))
    : [];
  const rawGuide = topic?.conceptGuide as
    | Partial<LearningConceptGuide>
    | {
        definition?: string;
        how?: string[];
      }
    | undefined;
  const what =
    typeof rawGuide?.what === "string" && rawGuide.what.trim()
      ? rawGuide.what
      : typeof rawGuide?.definition === "string" && rawGuide.definition.trim()
        ? rawGuide.definition
        : String(topic?.definition || "");
  const why =
    typeof rawGuide?.why === "string" && rawGuide.why.trim()
      ? rawGuide.why
      : `Use ${String(topic?.title || "this technique").toLowerCase()} to make your writing more expressive.`;
  const steps = Array.isArray(rawGuide?.steps)
    ? rawGuide.steps.map((step) => String(step))
    : Array.isArray(rawGuide?.how)
      ? rawGuide.how.map((step) => String(step))
      : [];
  const conceptExamples = Array.isArray(rawGuide?.examples)
    ? rawGuide.examples.map((example) => String(example))
    : examples;

  return {
    id: String(topic?.id || ""),
    order: typeof topic?.order === "number" ? topic.order : 0,
    title: String(topic?.title || "Writing Topic"),
    definition: String(topic?.definition || what || ""),
    examples,
    conceptGuide: {
      what,
      why,
      steps,
      examples: conceptExamples,
    },
    themeId: String(topic?.themeId || ""),
    themeTitle: String(topic?.themeTitle || ""),
  };
};

const normalizeQueueItem = (item: LearningQueueItem | null | undefined): LearningQueueItem | null => {
  if (!item) return null;

  const normalizedTopic = item.topic ? normalizeTopic(item.topic) : undefined;
  const normalizedPayload =
    item.payload?.type === "learn"
      ? {
          ...item.payload,
          data: normalizeTopic(item.payload.data),
        }
      : item.payload;

  return {
    ...item,
    topic: normalizedTopic,
    payload: normalizedPayload,
  };
};

const normalizeProgress = (
  progress: Partial<LearningProgressSummary> | null | undefined,
): LearningProgressSummary => ({
  totalTopics: typeof progress?.totalTopics === "number" ? progress.totalTopics : 0,
  topicsStarted: typeof progress?.topicsStarted === "number" ? progress.topicsStarted : 0,
  topicsCompleted: typeof progress?.topicsCompleted === "number" ? progress.topicsCompleted : 0,
  dueToday: typeof progress?.dueToday === "number" ? progress.dueToday : 0,
  streak: {
    current: typeof progress?.streak?.current === "number" ? progress.streak.current : 0,
    longest: typeof progress?.streak?.longest === "number" ? progress.streak.longest : 0,
  },
  weakTopics: Array.isArray(progress?.weakTopics) ? progress.weakTopics : [],
  stageBreakdown:
    progress?.stageBreakdown && typeof progress.stageBreakdown === "object"
      ? progress.stageBreakdown
      : {},
  themes: Array.isArray(progress?.themes) ? progress.themes : [],
  activeTheme: progress?.activeTheme || null,
  heatmap: Array.isArray(progress?.heatmap) ? progress.heatmap : [],
  learningPath: Array.isArray(progress?.learningPath) ? progress.learningPath : [],
  skillBuilderInsights: progress?.skillBuilderInsights
    ? {
        entriesCount:
          typeof progress.skillBuilderInsights.entriesCount === "number"
            ? progress.skillBuilderInsights.entriesCount
            : 0,
        totalWritingCount:
          typeof progress.skillBuilderInsights.totalWritingCount === "number"
            ? progress.skillBuilderInsights.totalWritingCount
            : 0,
        totalWritingWords:
          typeof progress.skillBuilderInsights.totalWritingWords === "number"
            ? progress.skillBuilderInsights.totalWritingWords
            : 0,
        avgScore:
          typeof progress.skillBuilderInsights.avgScore === "number"
            ? progress.skillBuilderInsights.avgScore
            : 0,
        trend:
          progress.skillBuilderInsights.trend === "improving" ||
          progress.skillBuilderInsights.trend === "declining"
            ? progress.skillBuilderInsights.trend
            : "steady",
        heatmap: Array.isArray(progress.skillBuilderInsights.heatmap)
          ? progress.skillBuilderInsights.heatmap
          : [],
        topicsPracticed: Array.isArray(progress.skillBuilderInsights.topicsPracticed)
          ? progress.skillBuilderInsights.topicsPracticed.map((topic) => ({
              ...topic,
              latestScore: typeof topic.latestScore === "number" ? topic.latestScore : topic.avgScore || 0,
              mastery: typeof topic.mastery === "number" ? topic.mastery : 0,
              trend:
                topic.trend === "improving" || topic.trend === "declining"
                  ? topic.trend
                  : "steady",
            }))
          : [],
        weakAreas: Array.isArray(progress.skillBuilderInsights.weakAreas)
          ? progress.skillBuilderInsights.weakAreas.map((topic) => ({
              ...topic,
              latestScore: typeof topic.latestScore === "number" ? topic.latestScore : topic.avgScore || 0,
              mastery: typeof topic.mastery === "number" ? topic.mastery : 0,
              trend:
                topic.trend === "improving" || topic.trend === "declining"
                  ? topic.trend
                  : "steady",
            }))
          : [],
        recentAttempts: Array.isArray(progress.skillBuilderInsights.recentAttempts)
          ? progress.skillBuilderInsights.recentAttempts.map((attempt) => ({
              ...attempt,
              tags: Array.isArray(attempt.tags) ? attempt.tags : [],
              breakdown: {
                structure: normalizeBreakdownCategory(
                  attempt.breakdown?.structure,
                  "needs_work",
                  "Structure details will appear after newer evaluations.",
                ),
                creativity: normalizeBreakdownCategory(
                  attempt.breakdown?.creativity,
                  "basic",
                  "Creativity details will appear after newer evaluations.",
                ),
                clarity: normalizeBreakdownCategory(
                  attempt.breakdown?.clarity,
                  "needs_detail",
                  "Clarity details will appear after newer evaluations.",
                ),
              },
            }))
          : [],
      }
    : undefined,
});

const normalizeSubmitResponse = (
  payload: SkillBuilderSubmitResponse,
): SkillBuilderSubmitResponse => ({
  ...payload,
  progress: normalizeProgress(payload.progress),
  entry: {
    ...payload.entry,
    breakdown: {
      structure: normalizeBreakdownCategory(
        payload.entry?.breakdown?.structure,
        "needs_work",
        "Structure details will appear after evaluation.",
      ),
      creativity: normalizeBreakdownCategory(
        payload.entry?.breakdown?.creativity,
        "basic",
        "Creativity details will appear after evaluation.",
      ),
      clarity: normalizeBreakdownCategory(
        payload.entry?.breakdown?.clarity,
        "needs_detail",
        "Clarity details will appear after evaluation.",
      ),
    },
    weak_parts: Array.isArray(payload.entry?.weak_parts) ? payload.entry.weak_parts : [],
    metrics: {
      wordCount: typeof payload.entry?.metrics?.wordCount === "number" ? payload.entry.metrics.wordCount : 0,
      sentenceCount:
        typeof payload.entry?.metrics?.sentenceCount === "number"
          ? payload.entry.metrics.sentenceCount
          : 0,
    },
  },
  evaluation: {
    ...payload.evaluation,
    tags: Array.isArray(payload.evaluation?.tags) ? payload.evaluation.tags : [],
    breakdown: {
      structure: normalizeBreakdownCategory(
        payload.evaluation?.breakdown?.structure,
        "needs_work",
        "Structure details will appear after evaluation.",
      ),
      creativity: normalizeBreakdownCategory(
        payload.evaluation?.breakdown?.creativity,
        "basic",
        "Creativity details will appear after evaluation.",
      ),
      clarity: normalizeBreakdownCategory(
        payload.evaluation?.breakdown?.clarity,
        "needs_detail",
        "Clarity details will appear after evaluation.",
      ),
    },
    weakParts: Array.isArray(payload.evaluation?.weakParts) ? payload.evaluation.weakParts : [],
    metrics: {
      wordCount:
        typeof payload.evaluation?.metrics?.wordCount === "number"
          ? payload.evaluation.metrics.wordCount
          : 0,
      sentenceCount:
        typeof payload.evaluation?.metrics?.sentenceCount === "number"
          ? payload.evaluation.metrics.sentenceCount
          : 0,
    },
  },
});

const readJson = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T & { success?: boolean; error?: string };

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || "Learning request failed");
  }

  return payload;
};

export const fetchLearningToday = async (): Promise<LearningTodayResponse> => {
  const response = await fetch(buildApiUrl("/api/learning/today"), {
    headers: await createLearningHeaders(),
  });

  const payload = await readJson<LearningTodayResponse>(response);

  return {
    ...payload,
    today: {
      ...payload.today,
      new: normalizeQueueItem(payload.today?.new),
      reviews: Array.isArray(payload.today?.reviews)
        ? payload.today.reviews.map((item) => normalizeQueueItem(item)).filter(Boolean) as LearningQueueItem[]
        : [],
      application: normalizeQueueItem(payload.today?.application),
    },
    progress: normalizeProgress(payload.progress),
  };
};

export const fetchLearningProgress = async (): Promise<LearningProgressResponse> => {
  const response = await fetch(buildApiUrl("/api/learning/progress"), {
    headers: await createLearningHeaders(),
  });

  const payload = await readJson<LearningProgressResponse>(response);

  return {
    ...payload,
    progress: normalizeProgress(payload.progress),
  };
};

export const submitLearningPerformance = async (
  topicId: string,
  performance: LearningPerformance,
): Promise<LearningSubmitResponse> => {
  const response = await fetch(buildApiUrl("/api/learning/submit"), {
    method: "POST",
    headers: await createLearningHeaders(),
    body: JSON.stringify({
      topic_id: topicId,
      performance,
    }),
  });

  const payload = await readJson<LearningSubmitResponse>(response);

  return {
    ...payload,
    progress: normalizeProgress(payload.progress),
  };
};

export const submitSkillBuilderWriting = async (
  topicId: string,
  content: string,
): Promise<SkillBuilderSubmitResponse> => {
  const response = await fetch(buildApiUrl("/api/learning/submit-writing"), {
    method: "POST",
    headers: await createLearningHeaders(),
    body: JSON.stringify({
      topicId,
      content,
    }),
  });

  const payload = await readJson<SkillBuilderSubmitResponse>(response);

  return normalizeSubmitResponse(payload);
};
