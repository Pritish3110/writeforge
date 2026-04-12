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

const TODAY_LOAD_ERROR = "Unable to load today's practice. Please try again in a moment.";
const PROGRESS_LOAD_ERROR = "Unable to load your skill insights. Please try again in a moment.";
const SUBMIT_ERROR = "Unable to save your practice just now. Please try again in a moment.";

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
    } catch {
      setError(TODAY_LOAD_ERROR);
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
    } catch {
      setError(PROGRESS_LOAD_ERROR);
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
      } catch {
        setError(SUBMIT_ERROR);
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
