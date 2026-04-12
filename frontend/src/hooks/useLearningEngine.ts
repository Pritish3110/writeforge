import { useCallback, useEffect, useState } from "react";
import {
  fetchLearningProgress,
  fetchLearningToday,
  submitLearningPerformance,
  type LearningPerformance,
  type LearningProgressSummary,
  type LearningTodaySummary,
} from "@/services/learningClient";

interface UseLearningEngineOptions {
  loadToday?: boolean;
  loadProgress?: boolean;
}

export const useLearningEngine = ({
  loadToday = true,
  loadProgress = true,
}: UseLearningEngineOptions = {}) => {
  const [today, setToday] = useState<LearningTodaySummary | null>(null);
  const [progress, setProgress] = useState<LearningProgressSummary | null>(null);
  const [loadingToday, setLoadingToday] = useState(loadToday);
  const [loadingProgress, setLoadingProgress] = useState(loadProgress && !loadToday);
  const [error, setError] = useState<string | null>(null);
  const [submittingTopicId, setSubmittingTopicId] = useState<string | null>(null);

  const refreshToday = useCallback(async () => {
    if (!loadToday) return null;

    setLoadingToday(true);
    setError(null);

    try {
      const payload = await fetchLearningToday();
      setToday(payload.today);
      setProgress(payload.progress);
      return payload;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load today’s learning queue.",
      );
      return null;
    } finally {
      setLoadingToday(false);
      if (loadProgress) {
        setLoadingProgress(false);
      }
    }
  }, [loadProgress, loadToday]);

  const refreshProgress = useCallback(async () => {
    if (!loadProgress) return null;

    setLoadingProgress(true);
    setError(null);

    try {
      const payload = await fetchLearningProgress();
      setProgress(payload.progress);
      return payload;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load learning progress.",
      );
      return null;
    } finally {
      setLoadingProgress(false);
    }
  }, [loadProgress]);

  useEffect(() => {
    if (loadToday) {
      void refreshToday();
      return;
    }

    if (loadProgress) {
      void refreshProgress();
    }
  }, [loadProgress, loadToday, refreshProgress, refreshToday]);

  const submitPerformance = useCallback(
    async (topicId: string, performance: LearningPerformance) => {
      setSubmittingTopicId(topicId);
      setError(null);

      try {
        const payload = await submitLearningPerformance(topicId, performance);
        setProgress(payload.progress);

        if (loadToday) {
          await refreshToday();
        }

        if (loadProgress && !loadToday) {
          await refreshProgress();
        }

        return payload;
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to submit learning feedback.",
        );
        return null;
      } finally {
        setSubmittingTopicId(null);
      }
    },
    [loadProgress, loadToday, refreshProgress, refreshToday],
  );

  return {
    today,
    progress,
    error,
    loadingToday,
    loadingProgress,
    submittingTopicId,
    refreshToday,
    refreshProgress,
    submitPerformance,
  };
};
