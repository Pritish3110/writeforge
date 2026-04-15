import {
  getLearningSessionToday,
  getLearningProgress,
  getLearningToday,
  resetSkillBuilderProgress,
  submitSkillBuilderChallenge,
  submitSkillBuilderWriting,
  submitLearningReview,
  updateLearningSession,
} from "../services/learning/engine.js";

const resolveLearningUserId = (request) => {
  const headerValue = request.headers["x-learning-user-id"];
  const queryValue = request.query?.user_id;
  const bodyValue = request.body?.user_id || request.body?.userId;

  return (
    request.user?.uid ||
    (typeof headerValue === "string" && headerValue.trim()) ||
    (typeof queryValue === "string" && queryValue.trim()) ||
    (typeof bodyValue === "string" && bodyValue.trim()) ||
    "local-workspace"
  );
};

export const getTodayLearning = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const payload = await getLearningToday(userId);

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const submitLearning = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const topicId = typeof request.body?.topic_id === "string" ? request.body.topic_id : "";
    const performance =
      typeof request.body?.performance === "string" ? request.body.performance : "good";

    if (!topicId.trim()) {
      response.status(400).json({
        success: false,
        error: "topic_id is required.",
      });
      return;
    }

    const payload = await submitLearningReview({
      userId,
      topicId: topicId.trim(),
      performance,
    });

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const submitWriting = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const topicId =
      typeof request.body?.topicId === "string"
        ? request.body.topicId
        : typeof request.body?.topic_id === "string"
          ? request.body.topic_id
          : "";
    const content = typeof request.body?.content === "string" ? request.body.content : "";

    if (!topicId.trim()) {
      response.status(400).json({
        success: false,
        error: "topicId is required.",
      });
      return;
    }

    if (!content.trim()) {
      response.status(400).json({
        success: false,
        error: "content is required.",
      });
      return;
    }

    const payload = await submitSkillBuilderWriting({
      userId,
      topicId: topicId.trim(),
      content,
    });

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const getLearningProgressSummary = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const payload = await getLearningProgress(userId);

    response.status(200).json({
      success: true,
      userId,
      progress: payload,
    });
  } catch (error) {
    next(error);
  }
};

export const getTodaySession = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const payload = await getLearningSessionToday(userId);

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const topicId = typeof request.body?.topicId === "string" ? request.body.topicId.trim() : "";
    const step = typeof request.body?.step === "string" ? request.body.step.trim() : "";
    const completed = request.body?.completed !== false;
    const date = typeof request.body?.date === "string" ? request.body.date.trim() : undefined;

    if (!topicId) {
      response.status(400).json({
        success: false,
        error: "topicId is required.",
      });
      return;
    }

    const payload = await updateLearningSession({
      userId,
      topicId,
      step,
      completed,
      date,
    });

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const submitChallenge = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const topicId = typeof request.body?.topicId === "string" ? request.body.topicId.trim() : "";
    const content = typeof request.body?.content === "string" ? request.body.content : "";
    const challengeScore =
      typeof request.body?.challengeScore === "number" ? request.body.challengeScore : undefined;

    if (!topicId) {
      response.status(400).json({
        success: false,
        error: "topicId is required.",
      });
      return;
    }

    const payload = await submitSkillBuilderChallenge({
      userId,
      topicId,
      content,
      challengeScore,
    });

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const resetLearningProgress = async (request, response, next) => {
  try {
    const userId = resolveLearningUserId(request);
    const topicId =
      typeof request.body?.topicId === "string"
        ? request.body.topicId.trim()
        : typeof request.query?.topicId === "string"
          ? request.query.topicId.trim()
          : "";

    if (!topicId) {
      response.status(400).json({
        success: false,
        error: "topicId is required.",
      });
      return;
    }

    const payload = await resetSkillBuilderProgress({
      userId,
      topicId,
    });

    response.status(200).json({
      success: true,
      userId,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};
