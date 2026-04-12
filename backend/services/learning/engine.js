import { readCurriculum } from "./curriculum.js";
import {
  getNextEaseFactor,
  getNextInterval,
  roundIntervalDays,
} from "./scheduler.js";
import { getNextStage, createStagePayload } from "./stages.js";
import {
  readLearningProgressStore,
  writeLearningProgressStore,
} from "./store.js";

const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL_DAYS = 1;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toDateKey = (value = new Date()) => value.toISOString().slice(0, 10);

const addDays = (dateKey, days) => {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
};

const normalizePerformance = (value) => {
  if (value === "again" || value === "hard" || value === "good" || value === "easy") {
    return value;
  }

  return "good";
};

const normalizeProgressRecord = (value, fallbackIndex) => {
  const record = value && typeof value === "object" ? value : {};
  const reviewHistory = Array.isArray(record.review_history)
    ? record.review_history
        .map((entry, historyIndex) => ({
          id: String(entry?.id || `review-${fallbackIndex + 1}-${historyIndex + 1}`),
          date: DATE_KEY_PATTERN.test(String(entry?.date || "")) ? String(entry.date) : null,
          performance: normalizePerformance(entry?.performance),
          stage: String(entry?.stage || "learn"),
        }))
        .filter((entry) => entry.date)
    : [];

  return {
    id: String(record.id || `learning-progress-${fallbackIndex + 1}`),
    user_id: String(record.user_id || "local-workspace"),
    topic_id: String(record.topic_id || ""),
    stage: String(record.stage || "learn"),
    last_reviewed: DATE_KEY_PATTERN.test(String(record.last_reviewed || ""))
      ? String(record.last_reviewed)
      : null,
    next_review: DATE_KEY_PATTERN.test(String(record.next_review || ""))
      ? String(record.next_review)
      : toDateKey(),
    interval_days:
      typeof record.interval_days === "number" && Number.isFinite(record.interval_days)
        ? record.interval_days
        : DEFAULT_INTERVAL_DAYS,
    ease_factor:
      typeof record.ease_factor === "number" && Number.isFinite(record.ease_factor)
        ? record.ease_factor
        : DEFAULT_EASE_FACTOR,
    again_count:
      typeof record.again_count === "number" && Number.isFinite(record.again_count)
        ? record.again_count
        : 0,
    hard_count:
      typeof record.hard_count === "number" && Number.isFinite(record.hard_count)
        ? record.hard_count
        : 0,
    good_count:
      typeof record.good_count === "number" && Number.isFinite(record.good_count)
        ? record.good_count
        : 0,
    easy_count:
      typeof record.easy_count === "number" && Number.isFinite(record.easy_count)
        ? record.easy_count
        : 0,
    review_history: reviewHistory,
    created_at: String(record.created_at || new Date().toISOString()),
    updated_at: String(record.updated_at || new Date().toISOString()),
  };
};

const readUserProgress = async (userId) => {
  const store = await readLearningProgressStore();
  return store
    .map(normalizeProgressRecord)
    .filter((record) => record.user_id === userId);
};

const writeUserProgress = async (userId, records) => {
  const store = await readLearningProgressStore();
  const nextStore = store
    .map(normalizeProgressRecord)
    .filter((record) => record.user_id !== userId)
    .concat(records);

  await writeLearningProgressStore(nextStore);
};

const buildThemeSummary = (curriculum, progressByTopicId) => {
  const grouped = new Map();

  curriculum.forEach((topic) => {
    const currentGroup = grouped.get(topic.themeId) || {
      id: topic.themeId,
      title: topic.themeTitle,
      totalTopics: 0,
      masteredTopics: 0,
    };

    currentGroup.totalTopics += 1;

    if (progressByTopicId.get(topic.id)?.stage === "mastered") {
      currentGroup.masteredTopics += 1;
    }

    grouped.set(topic.themeId, currentGroup);
  });

  return Array.from(grouped.values()).map((theme) => ({
    ...theme,
    status:
      theme.masteredTopics === theme.totalTopics
        ? "completed"
        : theme.masteredTopics > 0
          ? "in_progress"
          : "up_next",
  }));
};

const getLearningStreak = (records) => {
  const dayKeys = Array.from(
    new Set(
      records.flatMap((record) =>
        record.review_history.map((entry) => entry.date).filter(Boolean),
      ),
    ),
  ).sort();

  if (dayKeys.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let running = 0;
  let previousDate = null;

  dayKeys.forEach((dayKey) => {
    if (!previousDate) {
      running = 1;
    } else {
      const expectedNextDay = addDays(previousDate, 1);
      running = expectedNextDay === dayKey ? running + 1 : 1;
    }

    longest = Math.max(longest, running);
    previousDate = dayKey;
  });

  let current = 0;
  let cursor = toDateKey();

  while (dayKeys.includes(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
};

const buildWeakTopics = (curriculum, records) =>
  records
    .map((record) => {
      const topic = curriculum.find((item) => item.id === record.topic_id);
      const weaknessScore = record.again_count * 3 + record.hard_count * 2 - record.easy_count;

      return topic
        ? {
            topicId: record.topic_id,
            title: topic.title,
            themeTitle: topic.themeTitle,
            stage: record.stage,
            weaknessScore,
            againCount: record.again_count,
            hardCount: record.hard_count,
            recommendation:
              record.again_count > 0
                ? `Reset to learn mode and revisit the definition plus one fresh example for ${topic.title}.`
                : `Stay in ${record.stage} a little longer and do one more recognition pass for ${topic.title}.`,
          }
        : null;
    })
    .filter(Boolean)
    .filter((item) => item.weaknessScore > 0)
    .sort(
      (left, right) =>
        right.weaknessScore - left.weaknessScore || left.title.localeCompare(right.title),
    )
    .slice(0, 4);

const buildStageBreakdown = (curriculum, progressByTopicId) => {
  const counters = {
    unseen: 0,
    learn: 0,
    recognize: 0,
    apply: 0,
    mastered: 0,
  };

  curriculum.forEach((topic) => {
    const currentStage = progressByTopicId.get(topic.id)?.stage || "unseen";
    counters[currentStage] += 1;
  });

  return counters;
};

const buildActivityHeatmap = (records, windowDays = 28) =>
  Array.from({ length: windowDays }, (_, index) => {
    const dateKey = addDays(toDateKey(), -(windowDays - index - 1));
    const count = records.reduce(
      (total, record) =>
        total +
        record.review_history.filter((entry) => entry.date === dateKey).length,
      0,
    );

    return {
      date: dateKey,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3,
    };
  });

const buildProgressSummary = (curriculum, records) => {
  const progressByTopicId = new Map(records.map((record) => [record.topic_id, record]));
  const stageBreakdown = buildStageBreakdown(curriculum, progressByTopicId);
  const streak = getLearningStreak(records);
  const themes = buildThemeSummary(curriculum, progressByTopicId);
  const activeTheme =
    themes.find((theme) => theme.status !== "completed") || themes[0] || null;

  return {
    totalTopics: curriculum.length,
    topicsStarted: records.length,
    topicsCompleted: records.filter((record) => record.stage === "mastered").length,
    dueToday: records.filter((record) => record.next_review <= toDateKey()).length,
    streak,
    weakTopics: buildWeakTopics(curriculum, records),
    stageBreakdown,
    themes,
    activeTheme,
    heatmap: buildActivityHeatmap(records),
  };
};

const buildTodayPayload = (curriculum, records) => {
  const todayKey = toDateKey();
  const progressByTopicId = new Map(records.map((record) => [record.topic_id, record]));
  const dueTopics = records
    .filter((record) => record.next_review <= todayKey)
    .map((record) => ({
      topic: curriculum.find((item) => item.id === record.topic_id),
      record,
    }))
    .filter((entry) => entry.topic)
    .sort(
      (left, right) =>
        left.record.next_review.localeCompare(right.record.next_review) ||
        left.topic.order - right.topic.order,
    );
  const unlockedNewTopic =
    curriculum.find((topic) => !progressByTopicId.has(topic.id)) || null;
  const reviewEntries = dueTopics.slice(0, 2).map(({ topic, record }) => ({
    topicId: topic.id,
    title: topic.title,
    themeTitle: topic.themeTitle,
    stage: record.stage,
    payload: createStagePayload({
      topic,
      stage: record.stage,
      curriculum,
    }),
  }));
  const applicationCandidate =
    curriculum.find((topic) => {
      if (unlockedNewTopic?.id === topic.id) return false;
      if (reviewEntries.some((entry) => entry.topicId === topic.id)) return false;
      return progressByTopicId.has(topic.id);
    }) ||
    dueTopics.find(({ topic }) => !reviewEntries.some((entry) => entry.topicId === topic.id))
      ?.topic ||
    unlockedNewTopic;

  return {
    theme:
      buildThemeSummary(curriculum, progressByTopicId).find((item) => item.status !== "completed") ||
      null,
    new: unlockedNewTopic
      ? {
          topicId: unlockedNewTopic.id,
          title: unlockedNewTopic.title,
          themeTitle: unlockedNewTopic.themeTitle,
          stage: "learn",
          payload: createStagePayload({
            topic: unlockedNewTopic,
            stage: "learn",
            curriculum,
          }),
        }
      : null,
    reviews: reviewEntries,
    application: applicationCandidate
      ? {
          topicId: applicationCandidate.id,
          title: applicationCandidate.title,
          themeTitle: applicationCandidate.themeTitle,
          stage: "apply",
          payload: createStagePayload({
            topic: applicationCandidate,
            stage: "apply",
            curriculum,
          }),
        }
      : null,
  };
};

export const getLearningToday = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);

  return {
    today: buildTodayPayload(curriculum, records),
    progress: buildProgressSummary(curriculum, records),
  };
};

export const getLearningProgress = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);

  return buildProgressSummary(curriculum, records);
};

export const submitLearningReview = async ({
  userId,
  topicId,
  performance,
}) => {
  const normalizedPerformance = normalizePerformance(performance);
  const curriculum = await readCurriculum();
  const topic = curriculum.find((item) => item.id === topicId);

  if (!topic) {
    const error = new Error("Learning topic not found.");
    error.statusCode = 404;
    throw error;
  }

  const records = await readUserProgress(userId);
  const existingRecord =
    records.find((record) => record.topic_id === topicId) || null;
  const todayKey = toDateKey();
  const nextEaseFactor = getNextEaseFactor(
    existingRecord?.ease_factor || DEFAULT_EASE_FACTOR,
    normalizedPerformance,
  );
  const nextInterval = roundIntervalDays(
    getNextInterval(
      existingRecord?.interval_days || DEFAULT_INTERVAL_DAYS,
      existingRecord?.ease_factor || DEFAULT_EASE_FACTOR,
      normalizedPerformance,
    ),
  );
  const nextStage = getNextStage(existingRecord?.stage || "learn", normalizedPerformance);
  const now = new Date().toISOString();

  const nextRecord = normalizeProgressRecord(
    {
      ...existingRecord,
      id: existingRecord?.id || crypto.randomUUID(),
      user_id: userId,
      topic_id: topicId,
      stage: nextStage,
      last_reviewed: todayKey,
      next_review: addDays(todayKey, nextInterval),
      interval_days: nextInterval,
      ease_factor: nextEaseFactor,
      again_count:
        (existingRecord?.again_count || 0) + (normalizedPerformance === "again" ? 1 : 0),
      hard_count:
        (existingRecord?.hard_count || 0) + (normalizedPerformance === "hard" ? 1 : 0),
      good_count:
        (existingRecord?.good_count || 0) + (normalizedPerformance === "good" ? 1 : 0),
      easy_count:
        (existingRecord?.easy_count || 0) + (normalizedPerformance === "easy" ? 1 : 0),
      review_history: [
        ...(existingRecord?.review_history || []),
        {
          id: crypto.randomUUID(),
          date: todayKey,
          performance: normalizedPerformance,
          stage: nextStage,
        },
      ],
      created_at: existingRecord?.created_at || now,
      updated_at: now,
    },
    records.length,
  );

  const nextRecords = existingRecord
    ? records.map((record) => (record.topic_id === topicId ? nextRecord : record))
    : [...records, nextRecord];

  await writeUserProgress(userId, nextRecords);

  return {
    topicId,
    performance: normalizedPerformance,
    stage: nextStage,
    nextReview: nextRecord.next_review,
    intervalDays: nextRecord.interval_days,
    easeFactor: nextRecord.ease_factor,
    reinforcementTriggered: normalizedPerformance === "again",
    progress: buildProgressSummary(curriculum, nextRecords),
  };
};
