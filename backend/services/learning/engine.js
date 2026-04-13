import { readCurriculum } from "./curriculum.js";
import {
  getNextEaseFactor,
  getNextInterval,
  roundIntervalDays,
} from "./scheduler.js";
import { getNextStage, createStagePayload } from "./stages.js";
import {
  readLearningProgressStore,
  readSkillBuilderEntriesStore,
  writeLearningProgressStore,
  writeSkillBuilderEntriesStore,
} from "./store.js";

const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL_DAYS = 1;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEAK_SCORE_THRESHOLD = 70;

const toDateKey = (value = new Date()) => value.toISOString().slice(0, 10);

const toSafeDateKey = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toDateKey(date);
};

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

const countWords = (value) => {
  const matches = String(value || "").match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

const clampScore = (value) => Math.min(Math.max(Math.round(value), 0), 100);

const scoreToPerformance = (score) => {
  if (score < 45) return "again";
  if (score < 70) return "hard";
  if (score >= 88) return "easy";
  return "good";
};

const getFirstLetters = (content) =>
  String(content || "")
    .toLowerCase()
    .match(/\b[a-z][a-z']*\b/g)
    ?.map((word) => word[0]) || [];

const hasAlliteration = (content) => {
  const letters = getFirstLetters(content);
  let runLength = 1;

  for (let index = 1; index < letters.length; index += 1) {
    runLength = letters[index] === letters[index - 1] ? runLength + 1 : 1;
    if (runLength >= 3) return true;
  }

  return false;
};

const evaluateRequiredStructure = (topic, content) => {
  const normalized = String(content || "").toLowerCase();

  if (topic.id === "simile") {
    return /\b(like|as)\b/i.test(content);
  }

  if (topic.id === "metaphor") {
    return /\b(is|are|was|were|becomes?|became)\b/i.test(content) && !/\b(like|as)\b/i.test(content);
  }

  if (topic.id === "personification") {
    return /\b(whispered|danced|sang|sighed|called|watched|slept|smiled|cried|argued|begged|waited)\b/i.test(content);
  }

  if (topic.id === "hyperbole") {
    return /\b(million|billion|forever|never|always|ton|ocean|mountain|endless|starving|dying|impossible)\b/i.test(content);
  }

  if (topic.id === "alliteration") {
    return hasAlliteration(content);
  }

  if (topic.id === "onomatopoeia") {
    return /\b(bang|buzz|crash|sizzle|whisper|clang|pop|snap|boom|hiss|thud|tick|tock)\b/i.test(content);
  }

  if (topic.id === "oxymoron") {
    return /\b(deafening silence|bittersweet|living dead|open secret|seriously funny|awfully good|small crowd)\b/i.test(normalized);
  }

  return countWords(content) >= 4;
};

const getStructureHint = (topic) => {
  if (topic.id === "simile") return 'Try using "like" or "as" to make the comparison clear.';
  if (topic.id === "metaphor") return 'Try making a direct comparison without "like" or "as".';
  if (topic.id === "alliteration") return "Try repeating the same starting sound across nearby words.";
  if (topic.id === "onomatopoeia") return "Try adding a word that imitates a sound.";
  if (topic.id === "hyperbole") return "Try pushing the exaggeration further so the emphasis is unmistakable.";
  if (topic.id === "personification") return "Try giving the object or idea a more human action.";
  if (topic.id === "oxymoron") return "Try placing two contradictory ideas directly together.";
  return `Try making ${topic.title.toLowerCase()} easier to spot in the sentence.`;
};

const evaluateWriting = ({ topic, content }) => {
  const trimmedContent = String(content || "").trim();
  const wordCount = countWords(trimmedContent);
  const hasRequiredStructure = evaluateRequiredStructure(topic, trimmedContent);
  const hasUsefulLength = wordCount >= 7;
  const score = clampScore(
    trimmedContent
      ? 35 + (hasRequiredStructure ? 45 : 0) + (hasUsefulLength ? 15 : 5) + (/[.!?]$/.test(trimmedContent) ? 5 : 0)
      : 0,
  );
  const tags = [
    score >= WEAK_SCORE_THRESHOLD ? "correct" : "needs_improvement",
    hasRequiredStructure ? "structure_found" : "structure_missing",
    hasUsefulLength ? "developing_detail" : "brief",
  ];
  const feedback = hasRequiredStructure
    ? hasUsefulLength
      ? "Good use of comparison. Try making the image even more vivid."
      : "Good start. Try adding a little more detail so the image lands harder."
    : `Sentence does not clearly use ${topic.title.toLowerCase()}. ${getStructureHint(topic)}`;

  return {
    score,
    tags,
    feedback,
    suggestion: hasRequiredStructure
      ? "Try adding more vivid comparison."
      : getStructureHint(topic),
  };
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

const normalizeSkillBuilderEntry = (value, fallbackIndex) => {
  const record = value && typeof value === "object" ? value : {};
  const evaluationScore =
    typeof record.evaluation_score === "number" && Number.isFinite(record.evaluation_score)
      ? clampScore(record.evaluation_score)
      : 0;

  return {
    id: String(record.id || `skill-builder-entry-${fallbackIndex + 1}`),
    user_id: String(record.user_id || "local-workspace"),
    topic_id: String(record.topic_id || ""),
    content: String(record.content || ""),
    created_at: String(record.created_at || new Date().toISOString()),
    evaluation_score: evaluationScore,
    tags: Array.isArray(record.tags)
      ? record.tags.map((tag) => String(tag)).filter(Boolean)
      : [],
    feedback: String(record.feedback || ""),
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

const readUserSkillBuilderEntries = async (userId) => {
  const store = await readSkillBuilderEntriesStore();
  return store
    .map(normalizeSkillBuilderEntry)
    .filter((record) => record.user_id === userId);
};

const writeUserSkillBuilderEntries = async (userId, entries) => {
  const store = await readSkillBuilderEntriesStore();
  const nextStore = store
    .map(normalizeSkillBuilderEntry)
    .filter((record) => record.user_id !== userId)
    .concat(entries);

  await writeSkillBuilderEntriesStore(nextStore);
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

const buildSkillBuilderInsights = (curriculum, entries) => {
  const entriesByTopicId = new Map();
  const heatmap = Array.from({ length: 35 }, (_, index) => {
    const dateKey = addDays(toDateKey(), -(35 - index - 1));
    const count = entries.filter((entry) => toSafeDateKey(entry.created_at) === dateKey).length;

    return {
      date: dateKey,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3,
    };
  });

  entries.forEach((entry) => {
    const current = entriesByTopicId.get(entry.topic_id) || [];
    current.push(entry);
    entriesByTopicId.set(entry.topic_id, current);
  });

  const topicStats = Array.from(entriesByTopicId.entries())
    .map(([topicId, topicEntries]) => {
      const topic = curriculum.find((item) => item.id === topicId);
      const avgScore =
        topicEntries.length > 0
          ? Math.round(
              topicEntries.reduce((sum, entry) => sum + entry.evaluation_score, 0) /
                topicEntries.length,
            )
          : 0;

      return topic
        ? {
            topicId,
            title: topic.title,
            themeTitle: topic.themeTitle,
            attempts: topicEntries.length,
            avgScore,
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title));
  const avgScore =
    entries.length > 0
      ? Math.round(
          entries.reduce((sum, entry) => sum + entry.evaluation_score, 0) / entries.length,
        )
      : 0;

  return {
    entriesCount: entries.length,
    totalWritingCount: entries.length,
    totalWritingWords: entries.reduce((sum, entry) => sum + countWords(entry.content), 0),
    avgScore,
    heatmap,
    topicsPracticed: topicStats,
    weakAreas: topicStats
      .filter((topic) => topic.avgScore < WEAK_SCORE_THRESHOLD)
      .map((topic) => ({
        ...topic,
        recommendation: `Practice ${topic.title.toLowerCase()} with one clearer example.`,
      })),
  };
};

const buildActivityHeatmap = (records, entries = [], windowDays = 28) =>
  Array.from({ length: windowDays }, (_, index) => {
    const dateKey = addDays(toDateKey(), -(windowDays - index - 1));
    const reviewCount = records.reduce(
      (total, record) =>
        total +
        record.review_history.filter((entry) => entry.date === dateKey).length,
      0,
    );
    const entryCount = entries.filter((entry) => toSafeDateKey(entry.created_at) === dateKey).length;
    const count = reviewCount + entryCount;

    return {
      date: dateKey,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3,
    };
  });

const buildProgressSummary = (curriculum, records, entries = []) => {
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
    heatmap: buildActivityHeatmap(records, entries),
    skillBuilderInsights: buildSkillBuilderInsights(curriculum, entries),
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
    topic,
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
          topic: unlockedNewTopic,
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
          topic: applicationCandidate,
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
  const entries = await readUserSkillBuilderEntries(userId);

  return {
    today: buildTodayPayload(curriculum, records),
    progress: buildProgressSummary(curriculum, records, entries),
  };
};

export const getLearningProgress = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const entries = await readUserSkillBuilderEntries(userId);

  return buildProgressSummary(curriculum, records, entries);
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
  const entries = await readUserSkillBuilderEntries(userId);

  return {
    topicId,
    performance: normalizedPerformance,
    stage: nextStage,
    nextReview: nextRecord.next_review,
    intervalDays: nextRecord.interval_days,
    easeFactor: nextRecord.ease_factor,
    reinforcementTriggered: normalizedPerformance === "again",
    progress: buildProgressSummary(curriculum, nextRecords, entries),
  };
};

export const submitSkillBuilderWriting = async ({
  userId,
  topicId,
  content,
}) => {
  const trimmedContent = String(content || "").trim();
  const curriculum = await readCurriculum();
  const topic = curriculum.find((item) => item.id === topicId);

  if (!topic) {
    const error = new Error("Learning topic not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!trimmedContent) {
    const error = new Error("content is required.");
    error.statusCode = 400;
    throw error;
  }

  const evaluation = evaluateWriting({ topic, content: trimmedContent });
  const performance = scoreToPerformance(evaluation.score);
  const progressResult = await submitLearningReview({
    userId,
    topicId,
    performance,
  });
  const existingEntries = await readUserSkillBuilderEntries(userId);
  const now = new Date().toISOString();
  const entry = normalizeSkillBuilderEntry(
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicId,
      content: trimmedContent,
      created_at: now,
      evaluation_score: evaluation.score,
      tags: evaluation.tags,
      feedback: evaluation.feedback,
    },
    existingEntries.length,
  );
  const nextEntries = [entry, ...existingEntries];
  const records = await readUserProgress(userId);

  await writeUserSkillBuilderEntries(userId, nextEntries);

  return {
    entry,
    evaluation,
    performance,
    progress: buildProgressSummary(curriculum, records, nextEntries),
    stage: progressResult.stage,
    nextReview: progressResult.nextReview,
  };
};
