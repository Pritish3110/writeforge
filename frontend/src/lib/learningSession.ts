import type { LearningSessionStep, LearningSessionSummary } from "@/services/learningClient";

const emptySessionSteps: Record<LearningSessionStep, boolean> = {
  learn: false,
  write: false,
  improve: false,
  challenge: false,
};

interface CreateEmptySessionSummaryOptions {
  date?: string;
  topicId?: string;
}

interface MergeLearningSessionSummaryOptions {
  previous: LearningSessionSummary | null;
  incoming?: Partial<LearningSessionSummary> | null;
  overrides?: Partial<LearningSessionSummary>;
  defaultDate?: string;
  defaultTopicId?: string;
  preserveCompletedSteps?: boolean;
}

const mergeSessionSteps = (
  previousSteps: Record<LearningSessionStep, boolean> | undefined,
  incomingSteps: Partial<Record<LearningSessionStep, boolean>> | undefined,
  overrideSteps: Partial<Record<LearningSessionStep, boolean>> | undefined,
  preserveCompletedSteps: boolean,
) => {
  const mergedSteps = {
    ...emptySessionSteps,
    ...(previousSteps || {}),
    ...(incomingSteps || {}),
    ...(overrideSteps || {}),
  };

  if (!preserveCompletedSteps || !previousSteps) {
    return mergedSteps;
  }

  return {
    learn: Boolean(previousSteps.learn || incomingSteps?.learn || overrideSteps?.learn),
    write: Boolean(previousSteps.write || incomingSteps?.write || overrideSteps?.write),
    improve: Boolean(previousSteps.improve || incomingSteps?.improve || overrideSteps?.improve),
    challenge: Boolean(previousSteps.challenge || incomingSteps?.challenge || overrideSteps?.challenge),
  };
};

export const createEmptySessionSummary = ({
  date = "",
  topicId = "",
}: CreateEmptySessionSummaryOptions = {}): LearningSessionSummary => ({
  id: "",
  date,
  topicId,
  steps: { ...emptySessionSteps },
  writeScore: null,
  challengeScore: null,
  finalScore: null,
  completed: false,
});

export const mergeLearningSessionSummary = ({
  previous,
  incoming,
  overrides,
  defaultDate = "",
  defaultTopicId = "",
  preserveCompletedSteps = false,
}: MergeLearningSessionSummaryOptions): LearningSessionSummary => {
  const base = previous || createEmptySessionSummary({ date: defaultDate, topicId: defaultTopicId });
  const resolvedId = String(overrides?.id || incoming?.id || base.id || "");
  const resolvedDate = String(overrides?.date || incoming?.date || base.date || defaultDate);
  const resolvedTopicId = String(overrides?.topicId || incoming?.topicId || base.topicId || defaultTopicId);
  const sameSession =
    Boolean(previous) &&
    resolvedDate === previous.date &&
    resolvedTopicId === previous.topicId &&
    (resolvedId ? resolvedId === previous.id : true);
  const steps = mergeSessionSteps(
    sameSession ? previous?.steps : base.steps,
    incoming?.steps,
    overrides?.steps,
    preserveCompletedSteps && sameSession,
  );
  const merged = {
    ...base,
    ...(incoming || {}),
    ...(overrides || {}),
    id: resolvedId,
    date: resolvedDate,
    topicId: resolvedTopicId,
    steps,
  };

  return {
    ...merged,
    completed: Boolean(merged.completed || steps.challenge),
  };
};

