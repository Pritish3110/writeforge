import {
  getLearningProgress,
  getLearningToday,
  submitLearningReview,
} from "../services/learning/engine.js";

const resolveLearningUserId = (request) => {
  const headerValue = request.headers["x-learning-user-id"];
  const queryValue = request.query?.user_id;
  const bodyValue = request.body?.user_id;

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
