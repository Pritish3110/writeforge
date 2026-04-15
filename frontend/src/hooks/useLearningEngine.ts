import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  type LearningCycleSummary,
  fetchLearningProgress,
  fetchLearningToday,
  submitSkillBuilderWriting,
  submitLearningPerformance,
  type LearningPerformance,
  type LearningProgressResponse,
  type LearningProgressSummary,
  type LearningTodayResponse,
  type LearningTodaySummary,
  type SkillBuilderSubmitResponse,
} from "@/services/learningClient";

interface UseLearningEngineOptions {
  loadToday?: boolean;
  loadProgress?: boolean;
}

const LOAD_ERROR = "Unable to load content. Please try again.";
const SUBMIT_ERROR = "Submission failed. Try again.";
const LEARNING_STALE_TIME = 1000 * 60 * 5;
const LEARNING_GC_TIME = 1000 * 60 * 15;

const buildLearningTodayKey = (userId: string) => ["learning", userId, "today"] as const;
const buildLearningProgressKey = (userId: string) => ["learning", userId, "progress"] as const;

const createProgressResponse = (
  userId: string,
  progress: LearningProgressSummary,
): LearningProgressResponse => ({
  success: true,
  userId,
  progress,
});

const syncLearningCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  progress: LearningProgressSummary,
) => {
  queryClient.setQueryData(buildLearningProgressKey(userId), createProgressResponse(userId, progress));
  queryClient.setQueryData(
    buildLearningTodayKey(userId),
    (current: LearningTodayResponse | undefined) =>
      current
        ? {
            ...current,
            progress,
          }
        : current,
  );
};

export const useLearningEngine = ({
  loadToday = true,
  loadProgress = true,
}: UseLearningEngineOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingTopicId, setSubmittingTopicId] = useState<string | null>(null);
  const learningUserId = user?.id || "local-workspace";
  const todayQueryKey = useMemo(() => buildLearningTodayKey(learningUserId), [learningUserId]);
  const progressQueryKey = useMemo(
    () => buildLearningProgressKey(learningUserId),
    [learningUserId],
  );

  const todayQuery = useQuery<LearningTodayResponse>({
    queryKey: todayQueryKey,
    queryFn: async () => {
      const payload = await fetchLearningToday();
      syncLearningCaches(queryClient, learningUserId, payload.progress);
      return payload;
    },
    enabled: loadToday,
    staleTime: LEARNING_STALE_TIME,
    gcTime: LEARNING_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const progressQuery = useQuery<LearningProgressResponse>({
    queryKey: progressQueryKey,
    queryFn: fetchLearningProgress,
    enabled: loadProgress && !loadToday,
    staleTime: LEARNING_STALE_TIME,
    gcTime: LEARNING_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const refreshToday = useCallback(async () => {
    if (!loadToday) return null;

    const result = await todayQuery.refetch();
    return result.data || null;
  }, [loadToday, todayQuery]);

  const refreshProgress = useCallback(async () => {
    if (loadToday) {
      const todayPayload = await refreshToday();
      return todayPayload
        ? createProgressResponse(todayPayload.userId, todayPayload.progress)
        : null;
    }

    if (!loadProgress) return null;

    const result = await progressQuery.refetch();
    return result.data || null;
  }, [loadProgress, loadToday, progressQuery, refreshToday]);

  const syncProgress = useCallback(
    (progress: LearningProgressSummary) => {
      syncLearningCaches(queryClient, learningUserId, progress);
    },
    [learningUserId, queryClient],
  );

  const submitPerformance = useCallback(
    async (topicId: string, performance: LearningPerformance) => {
      setSubmittingTopicId(topicId);
      setSubmitError(null);

      try {
        const payload = await submitLearningPerformance(topicId, performance);
        syncLearningCaches(queryClient, learningUserId, payload.progress);

        if (loadToday) {
          await refreshToday();
        }

        return payload;
      } catch {
        setSubmitError(SUBMIT_ERROR);
        return null;
      } finally {
        setSubmittingTopicId(null);
      }
    },
    [learningUserId, loadToday, queryClient, refreshToday],
  );

  const submitWriting = useCallback(
    async (topicId: string, content: string): Promise<SkillBuilderSubmitResponse | null> => {
      setSubmittingTopicId(topicId);
      setSubmitError(null);

      try {
        const payload = await submitSkillBuilderWriting(topicId, content);
        syncLearningCaches(queryClient, learningUserId, payload.progress);
        return payload;
      } catch {
        setSubmitError(SUBMIT_ERROR);
        return null;
      } finally {
        setSubmittingTopicId(null);
      }
    },
    [learningUserId, queryClient],
  );

  const error = useMemo(() => {
    if (submitError) return submitError;
    if (todayQuery.isError || progressQuery.isError) return LOAD_ERROR;
    return null;
  }, [progressQuery.isError, submitError, todayQuery.isError]);

  const today = todayQuery.data?.today || null;
  const progress = loadToday
    ? todayQuery.data?.progress || null
    : progressQuery.data?.progress || null;
  const cycle: LearningCycleSummary | null = todayQuery.data?.cycle || null;
  const loadingToday = loadToday ? todayQuery.isPending : false;
  const loadingProgress = loadProgress
    ? loadToday
      ? todayQuery.isPending
      : progressQuery.isPending
    : false;

  return {
    today: today as LearningTodaySummary | null,
    progress: progress as LearningProgressSummary | null,
    cycle,
    error,
    loadingToday,
    loadingProgress,
    submittingTopicId,
    refreshToday,
    refreshProgress,
    syncProgress,
    submitPerformance,
    submitWriting,
  };
};
