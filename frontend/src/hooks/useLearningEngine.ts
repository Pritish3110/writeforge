import { useCallback, useEffect, useState } from "react";
import {
  fetchLearningProgress,
  fetchLearningToday,
  submitSkillBuilderWriting,
  submitLearningPerformance,
  type LearningPerformance,
  type LearningProgressSummary,
  type LearningTodaySummary,
  type SkillBuilderSubmitResponse,
} from "@/services/learningClient";

interface UseLearningEngineOptions {
  loadToday?: boolean;
  loadProgress?: boolean;
}

const LOAD_ERROR = "Unable to load content. Please try again.";
const SUBMIT_ERROR = "Submission failed. Try again.";

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
      setError(LOAD_ERROR);
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
      setError(LOAD_ERROR);
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

  const submitWriting = useCallback(
    async (topicId: string, content: string): Promise<SkillBuilderSubmitResponse | null> => {
      setSubmittingTopicId(topicId);
      setError(null);

      try {
        const payload = await submitSkillBuilderWriting(topicId, content);
        setProgress(payload.progress);

        if (loadToday) {
          const refreshPayload = await refreshToday();
          if (!refreshPayload) {
            setError(null);
            setProgress(payload.progress);
          }
        }

        if (loadProgress && !loadToday) {
          const refreshPayload = await refreshProgress();
          if (!refreshPayload) {
            setError(null);
            setProgress(payload.progress);
          }
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
    submitWriting,
  };
};
