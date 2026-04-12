import { auth } from "@/firebase/auth";
import { readStoredBackendUser } from "@/lib/backend/workspaceSnapshot";
import { buildApiUrl } from "@/services/apiBase";

export type LearningPerformance = "again" | "hard" | "good" | "easy";
export type LearningStage = "learn" | "recognize" | "apply" | "mastered";

export interface LearningTopic {
  id: string;
  order: number;
  title: string;
  definition: string;
  examples: string[];
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

  return readJson<LearningTodayResponse>(response);
};

export const fetchLearningProgress = async (): Promise<LearningProgressResponse> => {
  const response = await fetch(buildApiUrl("/api/learning/progress"), {
    headers: await createLearningHeaders(),
  });

  return readJson<LearningProgressResponse>(response);
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

  return readJson<LearningSubmitResponse>(response);
};
