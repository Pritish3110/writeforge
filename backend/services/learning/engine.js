import { readCurriculum } from "./curriculum.js";
import {
  getNextEaseFactor,
  getNextInterval,
  roundIntervalDays,
} from "./scheduler.js";
import { getNextStage, createStagePayload } from "./stages.js";
import {
  readLearningSessionsStore,
  readLearningProgressStore,
  readSkillBuilderEntriesStore,
  writeLearningSessionsStore,
  writeLearningProgressStore,
  writeSkillBuilderEntriesStore,
} from "./store.js";

const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL_DAYS = 1;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEAK_SCORE_THRESHOLD = 70;
const MIN_WORDS = 18;
const MIN_SENTENCES = 2;
const MAX_SENTENCES = 3;
const WINDOW_DAYS = 30;
const DEFAULT_SESSION_STEPS = {
  learn: false,
  write: false,
  improve: false,
  challenge: false,
};
const IMAGERY_WORDS = new Set([
  "bright",
  "dark",
  "golden",
  "icy",
  "silent",
  "stormy",
  "fierce",
  "fragile",
  "smoky",
  "wild",
  "gentle",
  "glowing",
  "raging",
  "shivering",
  "shimmering",
  "thunder",
  "shadow",
  "river",
  "fire",
  "rain",
  "wind",
  "stone",
  "glass",
  "velvet",
  "echo",
  "dust",
  "light",
  "night",
  "ocean",
  "flame",
  "whisper",
]);

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

const buildCycleInfo = (dateKey = toDateKey()) => ({
  currentDate: dateKey,
  nextCycleAt: `${addDays(dateKey, 1)}T00:00:00.000Z`,
});

const clampScore = (value) => Math.min(Math.max(Math.round(value), 0), 100);

const normalizePerformance = (value) => {
  if (value === "again" || value === "hard" || value === "good" || value === "easy") {
    return value;
  }

  return "good";
};

const scoreToPerformance = (score) => {
  if (score < 45) return "again";
  if (score < 70) return "hard";
  if (score >= 88) return "easy";
  return "good";
};

const countWords = (value) => {
  const matches = String(value || "").match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

const splitIntoSentences = (value) =>
  String(value || "")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const countSentences = (value) => splitIntoSentences(value).length;

const getWordList = (value) =>
  String(value || "")
    .toLowerCase()
    .match(/\b[a-z][a-z']*\b/g) || [];

const getFirstLetters = (content) => getWordList(content).map((word) => word[0]);

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
    return (
      /\b(is|are|was|were|becomes?|became)\b/i.test(content) &&
      !/\b(like|as)\b/i.test(content)
    );
  }

  if (topic.id === "personification") {
    return /\b(whispered|danced|sang|sighed|called|watched|slept|smiled|cried|argued|begged|waited|stretched|yawned)\b/i.test(
      content,
    );
  }

  if (topic.id === "hyperbole") {
    return /\b(million|billion|forever|never|always|ton|ocean|mountain|endless|starving|dying|impossible)\b/i.test(
      content,
    );
  }

  if (topic.id === "alliteration") {
    return hasAlliteration(content);
  }

  if (topic.id === "onomatopoeia") {
    return /\b(bang|buzz|crash|sizzle|whisper|clang|pop|snap|boom|hiss|thud|tick|tock)\b/i.test(
      content,
    );
  }

  if (topic.id === "oxymoron") {
    return /\b(deafening silence|bittersweet|living dead|open secret|seriously funny|awfully good|small crowd)\b/i.test(
      normalized,
    );
  }

  return countWords(content) >= 4;
};

const getStructureHint = (topic) => {
  if (topic.id === "simile") return 'Use "like" or "as" so the comparison reads clearly.';
  if (topic.id === "metaphor") return 'Make the comparison direct without using "like" or "as".';
  if (topic.id === "alliteration") return "Repeat the same opening sound across nearby words.";
  if (topic.id === "onomatopoeia") return "Add a word that the reader can almost hear.";
  if (topic.id === "hyperbole") return "Push the exaggeration further so the emphasis is unmistakable.";
  if (topic.id === "personification") return "Give the object or setting a more human action.";
  if (topic.id === "oxymoron") return "Place the contradictory words right beside each other.";
  return `Make ${topic.title.toLowerCase()} easier to spot in the writing.`;
};

const getCreativityLabel = (score) => {
  if (score >= 75) return "vivid";
  if (score >= 55) return "developing";
  return "basic";
};

const getClarityLabel = (score) => (score >= 70 ? "clear" : "needs_detail");

const buildActionableTips = ({ topic, hasRequiredStructure, sentenceCount, wordCount, clarityScore }) => {
  const tips = [];

  if (!hasRequiredStructure) {
    tips.push(getStructureHint(topic));
  }

  if (sentenceCount < MIN_SENTENCES) {
    tips.push("Add a second sentence so the technique has space to develop.");
  }

  if (wordCount < MIN_WORDS) {
    tips.push("Add a setting so the reader knows where the moment happens.");
    tips.push("Use one stronger adjective or comparison word.");
  }

  if (clarityScore < 70) {
    tips.push("Add one more descriptive detail that supports the same image.");
  }

  return [...new Set(tips)];
};

const buildFeedback = ({ topic, structureScore, creativityScore, clarityScore, weakParts }) => {
  if (structureScore < 70) {
    return `${topic.title} is not landing clearly yet. ${weakParts[0] || getStructureHint(topic)}`;
  }

  if (creativityScore >= 75 && clarityScore >= 70) {
    return "Clear control. Keep the same idea, then sharpen it with one more specific image or setting detail.";
  }

  if (creativityScore < 60) {
    return "The technique is there, but the image still feels basic. Add a setting, a stronger adjective, and one more concrete detail.";
  }

  if (clarityScore < 70) {
    return "You have a promising idea. Tighten the flow and make every sentence support the same image.";
  }

  return "Good control overall. One more pass for setting and detail would make it stronger.";
};

const evaluateWriting = ({ topic, content }) => {
  const trimmedContent = String(content || "").trim();
  const wordCount = countWords(trimmedContent);
  const sentenceCount = countSentences(trimmedContent);
  const sentences = splitIntoSentences(trimmedContent);
  const hasRequiredStructure = evaluateRequiredStructure(topic, trimmedContent);
  const words = getWordList(trimmedContent);
  const uniqueWords = new Set(words);
  const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
  const imageryHits = words.filter((word) => IMAGERY_WORDS.has(word) || word.endsWith("ly")).length;
  const punctuationComplete = /[.!?]$/.test(trimmedContent);
  const sentenceLengths = sentences.map((sentence) => countWords(sentence));
  const averageSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, length) => sum + length, 0) / sentenceLengths.length
      : 0;
  const structureScore = clampScore(
    (hasRequiredStructure ? 70 : 20) +
      (sentenceCount >= MIN_SENTENCES && sentenceCount <= MAX_SENTENCES ? 20 : 0) +
      (wordCount >= MIN_WORDS ? 10 : 0),
  );
  const creativityScore = clampScore(
    25 +
      Math.min(30, imageryHits * 6) +
      Math.min(25, lexicalDiversity * 35) +
      (wordCount >= MIN_WORDS ? 10 : 0) +
      (wordCount >= 28 ? 10 : 0),
  );
  const clarityScore = clampScore(
    35 +
      (punctuationComplete ? 10 : 0) +
      (sentenceCount >= MIN_SENTENCES && sentenceCount <= MAX_SENTENCES ? 25 : 0) +
      (averageSentenceLength >= 7 && averageSentenceLength <= 22 ? 20 : 8) +
      (lexicalDiversity >= 0.5 ? 10 : 0),
  );
  const score = clampScore(
    structureScore * 0.45 + creativityScore * 0.3 + clarityScore * 0.25,
  );

  const weakParts = buildActionableTips({
    topic,
    hasRequiredStructure,
    sentenceCount,
    wordCount,
    clarityScore,
  });
  if (sentenceCount > MAX_SENTENCES) weakParts.push("Keep it to 2-3 sentences so the idea stays focused.");

  const tags = [];
  if (structureScore >= 70) tags.push("correct");
  if (score < WEAK_SCORE_THRESHOLD) tags.push("needs improvement");
  if (creativityScore >= 75) tags.push("vivid");
  if (creativityScore < 60) tags.push("basic");
  if (clarityScore < 70) tags.push("needs detail");

  return {
    score,
    tags,
    feedback: buildFeedback({
      topic,
      structureScore,
      creativityScore,
      clarityScore,
      weakParts,
    }),
    suggestion:
      weakParts[0] ||
      "Keep the original idea, then add one more precise image to make it feel sharper.",
    breakdown: {
      structure: {
        score: structureScore,
        label: structureScore >= 70 ? "correct" : "needs_work",
        detail:
          structureScore >= 70
            ? `${topic.title} is clearly visible in the writing.`
            : getStructureHint(topic),
      },
      creativity: {
        score: creativityScore,
        label: getCreativityLabel(creativityScore),
        detail:
          creativityScore >= 75
            ? "The imagery feels specific and memorable."
            : "Add stronger sensory detail or a fresher image.",
      },
      clarity: {
        score: clarityScore,
        label: getClarityLabel(clarityScore),
        detail:
          clarityScore >= 70
            ? "The writing reads smoothly and stays easy to follow."
            : "Tighten the sentences so the meaning lands faster.",
      },
    },
    weakParts,
    metrics: {
      wordCount,
      sentenceCount,
    },
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
  const breakdown = record.breakdown && typeof record.breakdown === "object" ? record.breakdown : {};
  const metrics = record.metrics && typeof record.metrics === "object" ? record.metrics : {};

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
    breakdown: {
      structure: {
        score:
          typeof breakdown.structure?.score === "number"
            ? clampScore(breakdown.structure.score)
            : 0,
        label: String(breakdown.structure?.label || "needs_work"),
        detail: String(breakdown.structure?.detail || ""),
      },
      creativity: {
        score:
          typeof breakdown.creativity?.score === "number"
            ? clampScore(breakdown.creativity.score)
            : 0,
        label: String(breakdown.creativity?.label || "basic"),
        detail: String(breakdown.creativity?.detail || ""),
      },
      clarity: {
        score:
          typeof breakdown.clarity?.score === "number"
            ? clampScore(breakdown.clarity.score)
            : 0,
        label: String(breakdown.clarity?.label || "needs_detail"),
        detail: String(breakdown.clarity?.detail || ""),
      },
    },
    weak_parts: Array.isArray(record.weak_parts)
      ? record.weak_parts.map((part) => String(part)).filter(Boolean)
      : [],
    metrics: {
      wordCount:
        typeof metrics.wordCount === "number" && Number.isFinite(metrics.wordCount)
          ? metrics.wordCount
          : countWords(record.content),
      sentenceCount:
        typeof metrics.sentenceCount === "number" && Number.isFinite(metrics.sentenceCount)
          ? metrics.sentenceCount
          : countSentences(record.content),
    },
  };
};

const normalizeSessionRecord = (value, fallbackIndex) => {
  const record = value && typeof value === "object" ? value : {};
  const steps = record.steps && typeof record.steps === "object" ? record.steps : {};

  return {
    id: String(record.id || `learning-session-${fallbackIndex + 1}`),
    user_id: String(record.user_id || "local-workspace"),
    date: DATE_KEY_PATTERN.test(String(record.date || "")) ? String(record.date) : toDateKey(),
    topic_id: String(record.topic_id || ""),
    steps: {
      learn: Boolean(steps.learn),
      write: Boolean(steps.write),
      improve: Boolean(steps.improve),
      challenge: Boolean(steps.challenge),
    },
    write_score:
      typeof record.write_score === "number" && Number.isFinite(record.write_score)
        ? clampScore(record.write_score)
        : null,
    challenge_score:
      typeof record.challenge_score === "number" && Number.isFinite(record.challenge_score)
        ? clampScore(record.challenge_score)
        : null,
    final_score:
      typeof record.final_score === "number" && Number.isFinite(record.final_score)
        ? clampScore(record.final_score)
        : null,
    completed: Boolean(record.completed),
    created_at: String(record.created_at || new Date().toISOString()),
    updated_at: String(record.updated_at || new Date().toISOString()),
  };
};

const hasSessionActivity = (session) =>
  Boolean(
    session &&
      session.steps &&
      Object.values(session.steps).some((value) => Boolean(value)),
  );

const readUserProgress = async (userId) => {
  const store = await readLearningProgressStore();
  return store.map(normalizeProgressRecord).filter((record) => record.user_id === userId);
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
    .filter((record) => record.user_id === userId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
};

const writeUserSkillBuilderEntries = async (userId, entries) => {
  const store = await readSkillBuilderEntriesStore();
  const nextStore = store
    .map(normalizeSkillBuilderEntry)
    .filter((record) => record.user_id !== userId)
    .concat(entries);

  await writeSkillBuilderEntriesStore(nextStore);
};

const readUserLearningSessions = async (userId) => {
  const store = await readLearningSessionsStore();
  return store
    .map(normalizeSessionRecord)
    .filter((record) => record.user_id === userId)
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.updated_at.localeCompare(left.updated_at),
    );
};

const writeUserLearningSessions = async (userId, sessions) => {
  const store = await readLearningSessionsStore();
  const nextStore = store
    .map(normalizeSessionRecord)
    .filter((record) => record.user_id !== userId)
    .concat(sessions);

  await writeLearningSessionsStore(nextStore);
};

const sessionWriteQueue = new Map();

const queueSessionWrite = async (userId, work) => {
  const previousWrite = sessionWriteQueue.get(userId) || Promise.resolve();
  const currentWrite = previousWrite.catch(() => undefined).then(work);
  const trackedWrite = currentWrite.finally(() => {
    if (sessionWriteQueue.get(userId) === trackedWrite) {
      sessionWriteQueue.delete(userId);
    }
  });

  sessionWriteQueue.set(userId, trackedWrite);
  return trackedWrite;
};

const createSessionSnapshot = (session, topicId, dateKey = toDateKey()) =>
  normalizeSessionRecord(
    {
      id: session?.id || crypto.randomUUID(),
      user_id: session?.user_id || "local-workspace",
      date: session?.date || dateKey,
      topic_id: topicId || session?.topic_id || "",
      steps: {
        ...DEFAULT_SESSION_STEPS,
        ...(session?.steps || {}),
      },
      write_score: session?.write_score ?? null,
      challenge_score: session?.challenge_score ?? null,
      final_score: session?.final_score ?? null,
      completed: Boolean(session?.completed),
      created_at: session?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    0,
  );

const getSessionForDate = (sessions, dateKey = toDateKey()) =>
  sessions
    .filter((session) => session.date === dateKey)
    .sort(
      (left, right) =>
        right.updated_at.localeCompare(left.updated_at) ||
        right.id.localeCompare(left.id),
    )[0] || null;

const getTodaySessionRecord = (sessions, topicId, dateKey = toDateKey()) => {
  const sessionsForDate = sessions
    .filter((session) => session.date === dateKey)
    .sort(
      (left, right) =>
        right.updated_at.localeCompare(left.updated_at) ||
        right.id.localeCompare(left.id),
    );
  const sessionForDate = sessionsForDate[0] || null;

  if (!sessionForDate) return null;
  if (!topicId) return sessionForDate;

  const matchingSession = sessionsForDate.find(
    (session) => !session.topic_id || session.topic_id === topicId,
  );

  if (matchingSession) return matchingSession;

  return null;
};

const mergeSessionSnapshots = (existingSession, incomingSession, userId) => {
  const mergedSession = createSessionSnapshot(
    {
      ...(existingSession || {}),
      ...(incomingSession || {}),
      id: existingSession?.id || incomingSession?.id,
      user_id: userId || incomingSession?.user_id || existingSession?.user_id,
      topic_id: incomingSession?.topic_id || existingSession?.topic_id || "",
      date: incomingSession?.date || existingSession?.date || toDateKey(),
      created_at: existingSession?.created_at || incomingSession?.created_at,
      write_score: incomingSession?.write_score ?? existingSession?.write_score ?? null,
      challenge_score: incomingSession?.challenge_score ?? existingSession?.challenge_score ?? null,
      final_score: incomingSession?.final_score ?? existingSession?.final_score ?? null,
      completed: Boolean(incomingSession?.completed || existingSession?.completed),
    },
    incomingSession?.topic_id || existingSession?.topic_id || "",
    incomingSession?.date || existingSession?.date || toDateKey(),
  );

  mergedSession.steps = {
    learn: Boolean(existingSession?.steps?.learn || incomingSession?.steps?.learn),
    write: Boolean(existingSession?.steps?.write || incomingSession?.steps?.write),
    improve: Boolean(existingSession?.steps?.improve || incomingSession?.steps?.improve),
    challenge: Boolean(existingSession?.steps?.challenge || incomingSession?.steps?.challenge),
  };
  mergedSession.completed = Boolean(mergedSession.completed || mergedSession.steps.challenge);

  return mergedSession;
};

const persistSession = async ({ userId, session }) =>
  queueSessionWrite(userId, async () => {
    const latestSessions = await readUserLearningSessions(userId);
    const existingSession = getTodaySessionRecord(latestSessions, session.topic_id, session.date);
    const nextSession = mergeSessionSnapshots(existingSession, session, userId);
    const nextSessions = latestSessions
      .filter((item) => item.id !== nextSession.id && item.date !== nextSession.date)
      .concat(nextSession)
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.updated_at.localeCompare(left.updated_at),
      );

    await writeUserLearningSessions(userId, nextSessions);
    return nextSessions;
  });

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

const getLearningStreak = (records, entries = [], sessions = []) => {
  const dayKeys = Array.from(
    new Set(
      records
        .flatMap((record) => record.review_history.map((entry) => entry.date).filter(Boolean))
        .concat(entries.map((entry) => toSafeDateKey(entry.created_at)).filter(Boolean)),
    ),
  )
    .concat(
      sessions
        .filter(
          (session) =>
            session.steps.learn ||
            session.steps.write ||
            session.steps.improve ||
            session.steps.challenge,
        )
        .map((session) => session.date),
    );
  const uniqueDayKeys = Array.from(new Set(dayKeys)).sort();

  if (uniqueDayKeys.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let running = 0;
  let previousDate = null;

  uniqueDayKeys.forEach((dayKey) => {
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

  while (uniqueDayKeys.includes(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
};

const buildWeakTopics = (curriculum, records, entries) =>
  records
    .map((record) => {
      const topic = curriculum.find((item) => item.id === record.topic_id);
      const topicEntries = entries.filter((entry) => entry.topic_id === record.topic_id);
      const latestScore = topicEntries[0]?.evaluation_score || 0;
      const weaknessScore =
        record.again_count * 3 + record.hard_count * 2 - record.easy_count + (latestScore > 0 ? Math.max(0, 75 - latestScore) / 10 : 0);

      return topic
        ? {
            topicId: record.topic_id,
            title: topic.title,
            themeTitle: topic.themeTitle,
            stage: record.stage,
            weaknessScore: Math.round(weaknessScore),
            againCount: record.again_count,
            hardCount: record.hard_count,
            recommendation:
              record.again_count > 0
                ? `Revisit the concept guide for ${topic.title} and write one clearer example before moving on.`
                : `Stay with ${topic.title} a little longer and push for more vivid detail.`,
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

const getTopicMastery = (record, topicEntries, topicSessions = []) => {
  if (!record && topicEntries.length === 0 && topicSessions.length === 0) return 0;

  const stageWeights = {
    learn: 8,
    recognize: 20,
    apply: 42,
    mastered: 82,
  };
  const stageScore = record ? stageWeights[record.stage] || 0 : 0;
  const combinedScores = topicEntries
    .map((entry) => entry.evaluation_score)
    .concat(topicSessions.map((session) => session.final_score).filter((score) => typeof score === "number"));
  const avgScore =
    combinedScores.length > 0
      ? combinedScores.reduce((sum, score) => sum + score, 0) / combinedScores.length
      : 0;
  const scoredAttempts = combinedScores.length;
  const sustainedScore = avgScore * Math.min(scoredAttempts, 5) / 5;
  const attemptsBoost = Math.min(scoredAttempts * 1.5, 8);
  const challengeBoost = Math.min(topicSessions.length * 5, 10);

  return clampScore(stageScore * 0.55 + sustainedScore * 0.3 + attemptsBoost + challengeBoost);
};

const getTrendDirection = (scores) => {
  if (scores.length < 2) return "steady";
  const firstHalf = scores.slice(Math.floor(scores.length / 2));
  const secondHalf = scores.slice(0, Math.floor(scores.length / 2));
  const recentAverage =
    firstHalf.reduce((sum, score) => sum + score, 0) / Math.max(firstHalf.length, 1);
  const olderAverage =
    secondHalf.reduce((sum, score) => sum + score, 0) / Math.max(secondHalf.length, 1);

  if (recentAverage - olderAverage >= 6) return "improving";
  if (olderAverage - recentAverage >= 6) return "declining";
  return "steady";
};

const buildLearningPath = (curriculum, progressByTopicId, entries, sessions) =>
  curriculum.map((topic) => {
    const record = progressByTopicId.get(topic.id) || null;
    const topicEntries = entries.filter((entry) => entry.topic_id === topic.id);
    const topicSessions = sessions.filter(
      (session) => session.topic_id === topic.id && typeof session.final_score === "number",
    );
    const mastery = getTopicMastery(record, topicEntries, topicSessions);

    return {
      topicId: topic.id,
      title: topic.title,
      themeTitle: topic.themeTitle,
      stage: record?.stage || "unseen",
      completed: record?.stage === "mastered",
      status:
        record?.stage === "mastered"
          ? "completed"
          : record
            ? "current"
            : "upcoming",
      mastery,
    };
  });

const buildSkillBuilderInsights = (curriculum, records, entries, sessions) => {
  const entriesByTopicId = new Map();
  const heatmap = Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const dateKey = addDays(toDateKey(), -(WINDOW_DAYS - index - 1));
    const session = sessions.find((item) => item.date === dateKey) || null;
    const count = hasSessionActivity(session)
      ? session.completed
        ? 2
        : 1
      : entries.filter((entry) => toSafeDateKey(entry.created_at) === dateKey).length;

    return {
      date: dateKey,
      count,
      level:
        count === 0
          ? 0
          : session?.completed
            ? session.final_score >= 85
              ? 3
              : 2
            : count === 1
              ? 1
              : 2,
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
      const record = records.find((item) => item.topic_id === topicId) || null;
      const topicSessions = sessions.filter(
        (session) => session.topic_id === topicId && typeof session.final_score === "number",
      );
      const combinedScores = topicEntries
        .map((entry) => entry.evaluation_score)
        .concat(topicSessions.map((session) => session.final_score));
      const avgScore =
        combinedScores.length > 0
          ? Math.round(
              combinedScores.reduce((sum, score) => sum + score, 0) / combinedScores.length,
            )
          : 0;
      const recentScores = combinedScores.slice(0, 5);

      return topic
        ? {
            topicId,
            title: topic.title,
            themeTitle: topic.themeTitle,
            attempts: topicEntries.length + topicSessions.length,
            avgScore,
            latestScore:
              topicEntries[0]?.evaluation_score ||
              topicSessions[0]?.final_score ||
              0,
            mastery: getTopicMastery(record, topicEntries, topicSessions),
            trend: getTrendDirection(recentScores),
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.title.localeCompare(right.title));

  const allInsightScores = entries
    .map((entry) => entry.evaluation_score)
    .concat(sessions.map((session) => session.final_score).filter((score) => typeof score === "number"));
  const avgScore =
    allInsightScores.length > 0
      ? Math.round(allInsightScores.reduce((sum, score) => sum + score, 0) / allInsightScores.length)
      : 0;
  const recentAttempts = entries.slice(0, 5).map((entry) => {
    const topic = curriculum.find((item) => item.id === entry.topic_id);
    return {
      id: entry.id,
      topicId: entry.topic_id,
      title: topic?.title || "Writing topic",
      content: entry.content,
      feedback: entry.feedback,
      score: entry.evaluation_score,
      createdAt: entry.created_at,
      tags: entry.tags,
      breakdown: entry.breakdown,
    };
  });

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
        recommendation: `Practice ${topic.title.toLowerCase()} with a clearer image and more context.`,
      })),
    recentAttempts,
    trend: getTrendDirection(
      entries
        .slice(0, 6)
        .map((entry) => entry.evaluation_score)
        .concat(
          sessions
            .slice(0, 6)
            .map((session) => session.final_score)
            .filter((score) => typeof score === "number"),
        ),
    ),
  };
};

const buildActivityHeatmap = (records, entries = [], sessions = [], windowDays = WINDOW_DAYS) =>
  Array.from({ length: windowDays }, (_, index) => {
    const dateKey = addDays(toDateKey(), -(windowDays - index - 1));
    const reviewCount = records.reduce(
      (total, record) =>
        total + record.review_history.filter((entry) => entry.date === dateKey).length,
      0,
    );
    const entryCount = entries.filter((entry) => toSafeDateKey(entry.created_at) === dateKey).length;
    const session = sessions.find((item) => item.date === dateKey) || null;
    const sessionCount = hasSessionActivity(session) ? (session.completed ? 2 : 1) : 0;
    const count = Math.max(sessionCount, reviewCount + entryCount);

    return {
      date: dateKey,
      count,
      level:
        count === 0
          ? 0
          : session?.completed
            ? session.final_score >= 85
              ? 3
              : 2
            : count === 1
              ? 1
              : 2,
    };
  });

const buildProgressSummary = (curriculum, records, entries = [], sessions = []) => {
  const progressByTopicId = new Map(records.map((record) => [record.topic_id, record]));
  const stageBreakdown = buildStageBreakdown(curriculum, progressByTopicId);
  const streak = getLearningStreak(records, entries, sessions);
  const themes = buildThemeSummary(curriculum, progressByTopicId);
  const activeTheme = themes.find((theme) => theme.status !== "completed") || themes[0] || null;
  const learningPath = buildLearningPath(curriculum, progressByTopicId, entries, sessions);
  const skillBuilderInsights = buildSkillBuilderInsights(curriculum, records, entries, sessions);

  return {
    totalTopics: curriculum.length,
    topicsStarted: records.length,
    topicsCompleted: records.filter((record) => record.stage === "mastered").length,
    dueToday: records.filter((record) => record.next_review <= toDateKey()).length,
    streak,
    weakTopics: buildWeakTopics(curriculum, records, entries),
    stageBreakdown,
    themes,
    activeTheme,
    heatmap: buildActivityHeatmap(records, entries, sessions),
    learningPath,
    skillBuilderInsights,
  };
};

const buildTodayPayload = (curriculum, records, preferredTopicId = null) => {
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
  const unlockedNewTopic = curriculum.find((topic) => !progressByTopicId.has(topic.id)) || null;
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
  const preferredTopic =
    typeof preferredTopicId === "string" && preferredTopicId.trim()
      ? curriculum.find((topic) => topic.id === preferredTopicId) || null
      : null;
  const applicationCandidate =
    preferredTopic ||
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

const getTodayTopicId = (todayPayload) =>
  todayPayload?.application?.topicId ||
  todayPayload?.new?.topicId ||
  todayPayload?.reviews?.[0]?.topicId ||
  "";

const buildSessionResponse = ({ session, topicId, dateKey = toDateKey() }) => {
  const nextSession = createSessionSnapshot(session, topicId, dateKey);

  return {
    id: nextSession.id,
    date: nextSession.date,
    topicId: nextSession.topic_id,
    steps: nextSession.steps,
    writeScore: nextSession.write_score,
    challengeScore: nextSession.challenge_score,
    finalScore: nextSession.final_score,
    completed: nextSession.completed,
  };
};

export const getLearningToday = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const entries = await readUserSkillBuilderEntries(userId);
  const sessions = await readUserLearningSessions(userId);
  const todaySession = getSessionForDate(sessions);
  const todayPayload = buildTodayPayload(curriculum, records, todaySession?.topic_id || null);

  return {
    today: todayPayload,
    progress: buildProgressSummary(curriculum, records, entries, sessions),
    cycle: buildCycleInfo(),
  };
};

export const getLearningProgress = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const entries = await readUserSkillBuilderEntries(userId);
  const sessions = await readUserLearningSessions(userId);

  return buildProgressSummary(curriculum, records, entries, sessions);
};

export const getLearningSessionToday = async (userId) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const sessions = await readUserLearningSessions(userId);
  const todaySession = getSessionForDate(sessions);
  const todayPayload = buildTodayPayload(curriculum, records, todaySession?.topic_id || null);
  const topicId = getTodayTopicId(todayPayload);
  const session = getTodaySessionRecord(sessions, topicId);

  return {
    session: buildSessionResponse({ session, topicId }),
    cycle: buildCycleInfo(),
  };
};

export const updateLearningSession = async ({ userId, topicId, step, completed = true, date }) => {
  const dateKey = DATE_KEY_PATTERN.test(String(date || "")) ? String(date) : toDateKey();
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const entries = await readUserSkillBuilderEntries(userId);
  const sessions = await readUserLearningSessions(userId);
  const existingSession = getTodaySessionRecord(sessions, topicId, dateKey);
  const nextSession = createSessionSnapshot(existingSession, topicId, dateKey);

  if (!Object.prototype.hasOwnProperty.call(nextSession.steps, step)) {
    const error = new Error("Invalid learning session step.");
    error.statusCode = 400;
    throw error;
  }

  if (step && Object.prototype.hasOwnProperty.call(nextSession.steps, step)) {
    nextSession.steps[step] = Boolean(completed);
  }
  nextSession.completed = Boolean(nextSession.steps.challenge);

  const nextSessions = await persistSession({
    userId,
    session: nextSession,
  });

  return {
    session: buildSessionResponse({ session: nextSession, topicId, dateKey }),
    progress: buildProgressSummary(curriculum, records, entries, nextSessions),
    cycle: buildCycleInfo(dateKey),
  };
};

export const submitLearningReview = async ({ userId, topicId, performance }) => {
  const normalizedPerformance = normalizePerformance(performance);
  const curriculum = await readCurriculum();
  const topic = curriculum.find((item) => item.id === topicId);

  if (!topic) {
    const error = new Error("Learning topic not found.");
    error.statusCode = 404;
    throw error;
  }

  const records = await readUserProgress(userId);
  const existingRecord = records.find((record) => record.topic_id === topicId) || null;
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
  const sessions = await readUserLearningSessions(userId);

  return {
    topicId,
    performance: normalizedPerformance,
    stage: nextStage,
    nextReview: nextRecord.next_review,
    intervalDays: nextRecord.interval_days,
    easeFactor: nextRecord.ease_factor,
    reinforcementTriggered: normalizedPerformance === "again",
    progress: buildProgressSummary(curriculum, nextRecords, entries, sessions),
  };
};

export const submitSkillBuilderWriting = async ({ userId, topicId, content, practiceOnly = false }) => {
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
  const existingEntries = await readUserSkillBuilderEntries(userId);
  const existingSessions = await readUserLearningSessions(userId);
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
      breakdown: evaluation.breakdown,
      weak_parts: evaluation.weakParts,
      metrics: evaluation.metrics,
    },
    existingEntries.length,
  );
  const records = await readUserProgress(userId);

  if (practiceOnly) {
    const existingSession = getTodaySessionRecord(existingSessions, topicId);

    return {
      entry,
      evaluation,
      practiceOnly: true,
      performance: scoreToPerformance(evaluation.score),
      progress: buildProgressSummary(curriculum, records, existingEntries, existingSessions),
      stage: records.find((record) => record.topic_id === topicId)?.stage || "apply",
      nextReview: "",
      session: buildSessionResponse({ session: existingSession, topicId }),
    };
  }

  const performance = scoreToPerformance(evaluation.score);
  const progressResult = await submitLearningReview({
    userId,
    topicId,
    performance,
  });
  const nextEntries = [entry, ...existingEntries];
  const existingSession = getTodaySessionRecord(existingSessions, topicId);
  const nextSession = createSessionSnapshot(existingSession, topicId);
  nextSession.steps.write = true;
  nextSession.write_score = evaluation.score;
  const nextSessions = await persistSession({
    userId,
    session: nextSession,
  });

  await writeUserSkillBuilderEntries(userId, nextEntries);

  return {
    entry,
    evaluation,
    practiceOnly: false,
    performance,
    progress: buildProgressSummary(curriculum, records, nextEntries, nextSessions),
    stage: progressResult.stage,
    nextReview: progressResult.nextReview,
    session: buildSessionResponse({ session: nextSession, topicId }),
  };
};

export const submitSkillBuilderChallenge = async ({
  userId,
  topicId,
  content,
  challengeScore,
}) => {
  const curriculum = await readCurriculum();
  const topic = curriculum.find((item) => item.id === topicId);

  if (!topic) {
    const error = new Error("Learning topic not found.");
    error.statusCode = 404;
    throw error;
  }

  const existingEntries = await readUserSkillBuilderEntries(userId);
  const existingSessions = await readUserLearningSessions(userId);
  const existingSession = getTodaySessionRecord(existingSessions, topicId);
  const records = await readUserProgress(userId);
  const trimmedContent = String(content || "").trim();

  let evaluation;

  if (trimmedContent) {
    evaluation = evaluateWriting({ topic, content: trimmedContent });
  } else {
    const numericChallengeScore =
      typeof challengeScore === "number" && Number.isFinite(challengeScore)
        ? clampScore(challengeScore)
        : 0;
    evaluation = {
      score: numericChallengeScore,
      tags: numericChallengeScore >= 80 ? ["correct", "challenge"] : ["needs improvement", "challenge"],
      feedback:
        numericChallengeScore >= 80
          ? "Challenge complete. You recognized the pattern correctly."
          : "Challenge complete, but the pattern needs another pass.",
      suggestion:
        numericChallengeScore >= 80
          ? "Keep the same control in your next writing round."
          : "Review the concept guide once, then try a fresh example.",
      breakdown: {
        structure: {
          score: numericChallengeScore,
          label: numericChallengeScore >= 80 ? "correct" : "needs_work",
          detail:
            numericChallengeScore >= 80
              ? `${topic.title} was identified correctly.`
              : `Review the structure of ${topic.title} and try again.`,
        },
        creativity: {
          score: numericChallengeScore,
          label: numericChallengeScore >= 80 ? "clear" : "basic",
          detail: "Recognition challenges focus on spotting the correct pattern.",
        },
        clarity: {
          score: numericChallengeScore,
          label: numericChallengeScore >= 80 ? "clear" : "needs_detail",
          detail: "Use the concept guide examples to reinforce the pattern.",
        },
      },
      weakParts:
        numericChallengeScore >= 80
          ? []
          : [
              "Review the core pattern once more before your next challenge.",
              "Compare your answer with one of the concept guide examples.",
            ],
      metrics: {
        wordCount: 0,
        sentenceCount: 0,
      },
    };
  }

  const writeScore = existingSession?.write_score ?? null;
  const finalScore =
    typeof writeScore === "number"
      ? clampScore((writeScore + evaluation.score) / 2)
      : evaluation.score;
  const nextSession = createSessionSnapshot(existingSession, topicId);
  nextSession.steps.challenge = true;
  nextSession.challenge_score = evaluation.score;
  nextSession.final_score = finalScore;
  nextSession.completed = true;

  const nextSessions = await persistSession({
    userId,
    session: nextSession,
  });

  return {
    evaluation,
    finalScore,
    progress: buildProgressSummary(curriculum, records, existingEntries, nextSessions),
    session: buildSessionResponse({ session: nextSession, topicId }),
  };
};

export const resetSkillBuilderProgress = async ({ userId, topicId }) => {
  const curriculum = await readCurriculum();
  const records = await readUserProgress(userId);
  const entries = await readUserSkillBuilderEntries(userId);
  const sessions = await readUserLearningSessions(userId);
  const nextRecords = records.filter((record) => record.topic_id !== topicId);
  const nextEntries = entries.filter((entry) => entry.topic_id !== topicId);
  const nextSessions = sessions.filter((session) => session.topic_id !== topicId);
  const todayPayload = buildTodayPayload(curriculum, nextRecords, getSessionForDate(nextSessions)?.topic_id || null);
  const nextTopicId = getTodayTopicId(todayPayload);
  const nextSession = getTodaySessionRecord(nextSessions, nextTopicId);

  await writeUserProgress(userId, nextRecords);
  await writeUserSkillBuilderEntries(userId, nextEntries);
  await writeUserLearningSessions(userId, nextSessions);

  return {
    session: buildSessionResponse({ session: nextSession, topicId: nextTopicId }),
    progress: buildProgressSummary(curriculum, nextRecords, nextEntries, nextSessions),
    cycle: buildCycleInfo(),
  };
};
