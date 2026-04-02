import { format, subDays } from "date-fns";

export interface WritingDraft {
  id: string;
  text: string;
  wordCount: number;
  savedAt: string;
}

interface DatedDraft extends WritingDraft {
  savedDate: Date | null;
}

interface WordFrequency {
  word: string;
  count: number;
}

export interface WritingHeatmapCell {
  date: string;
  label: string;
  sessions: number;
  words: number;
  level: number;
}

export interface DailyWordSeriesPoint {
  date: string;
  label: string;
  words: number;
  sessions: number;
}

export interface WritingAnalyticsSummary {
  totalWords: number;
  sessionsCompleted: number;
  avgSessionLengthMinutes: number;
  avgSentenceLength: number;
  dialogueRatio: number;
  narrationRatio: number;
  currentStreak: number;
  longestStreak: number;
  clarityScore: number;
  overDescriptionScore: number;
  actionDensity: number;
  wordsPerDay: DailyWordSeriesPoint[];
  heatmap: WritingHeatmapCell[];
  topWords: WordFrequency[];
  repetition: WordFrequency[];
  repeatedPhrases: WordFrequency[];
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has", "have",
  "he", "her", "hers", "him", "his", "i", "if", "in", "into", "is", "it", "its", "me", "my", "of", "on",
  "or", "our", "ours", "she", "so", "that", "the", "their", "them", "there", "they", "this", "to", "was",
  "we", "were", "with", "you", "your", "yours", "up", "down", "out", "over", "under", "again", "then",
  "than", "very", "just", "not", "no", "yes", "too", "can", "could", "would", "should", "will", "shall",
  "do", "does", "did", "done", "am", "who", "what", "when", "where", "why", "how", "all", "any", "some",
  "each", "few", "more", "most", "other", "such", "only", "own", "same", "s", "t",
]);

const DESCRIPTIVE_WORDS = new Set([
  "beautiful", "gorgeous", "delicate", "ornate", "vivid", "glowing", "shimmering", "endless", "soft",
  "gentle", "massive", "towering", "elegant", "fragile", "lush", "ancient", "detailed", "rich", "velvet",
  "golden", "silken", "radiant", "intricate", "lovely", "perfect",
]);

const ACTION_WORDS = new Set([
  "run", "ran", "walk", "walked", "move", "moved", "grab", "grabbed", "pull", "pulled", "push", "pushed",
  "turn", "turned", "slam", "slammed", "rush", "rushed", "climb", "climbed", "fall", "fell", "fight",
  "fought", "kick", "kicked", "hit", "strike", "struck", "jump", "jumped", "dart", "darted", "drive",
  "drove", "sprint", "sprinted", "snatch", "snatched", "open", "opened", "close", "closed",
]);

const FILLER_WORDS = new Set([
  "really", "very", "quite", "just", "maybe", "perhaps", "somehow", "somewhat", "actually", "literally",
]);

const normalizeWord = (word: string) => word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, "");

const countWords = (text: string) => {
  const matches = text.match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

const parseSavedDate = (savedAt: string): Date | null => {
  const parsed = new Date(savedAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getWordCounts = (text: string) => {
  const counts = new Map<string, number>();

  text
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

  return counts;
};

const getBigramCounts = (text: string) => {
  const counts = new Map<string, number>();
  const words = text
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  for (let index = 0; index < words.length - 1; index += 1) {
    const phrase = `${words[index]} ${words[index + 1]}`;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }

  return counts;
};

const toRankedList = (counts: Map<string, number>, limit: number, minimum = 1): WordFrequency[] =>
  [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));

const getSentenceCount = (text: string) => {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches?.length || (text.trim() ? 1 : 0);
};

const getDialogueWordCount = (text: string) => {
  const matches = text.match(/"[^"]+"|'[^']+'/g) || [];
  return matches.reduce((total, segment) => total + countWords(segment), 0);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getStreakInfo = (datedDrafts: DatedDraft[]) => {
  const dayKeys = new Set(
    datedDrafts
      .filter((draft) => draft.savedDate)
      .map((draft) => format(draft.savedDate as Date, "yyyy-MM-dd")),
  );

  let current = 0;
  let longest = 0;
  let running = 0;

  for (let index = 0; index < 365; index += 1) {
    const dayKey = format(subDays(new Date(), index), "yyyy-MM-dd");
    if (dayKeys.has(dayKey)) {
      running += 1;
      longest = Math.max(longest, running);
      if (index === current) current = running;
    } else {
      if (index === 0) current = 0;
      running = 0;
    }
  }

  if (current === 0 && dayKeys.has(format(new Date(), "yyyy-MM-dd"))) {
    current = 1;
    for (let index = 1; index < 365; index += 1) {
      const dayKey = format(subDays(new Date(), index), "yyyy-MM-dd");
      if (!dayKeys.has(dayKey)) break;
      current += 1;
    }
  }

  return { current, longest };
};

const buildWordsPerDay = (datedDrafts: DatedDraft[], windowDays = 14): DailyWordSeriesPoint[] => {
  const totals = new Map<string, { words: number; sessions: number }>();

  datedDrafts.forEach((draft) => {
    if (!draft.savedDate) return;
    const key = format(draft.savedDate, "yyyy-MM-dd");
    const current = totals.get(key) || { words: 0, sessions: 0 };
    totals.set(key, {
      words: current.words + draft.wordCount,
      sessions: current.sessions + 1,
    });
  });

  return Array.from({ length: windowDays }, (_, index) => {
    const date = subDays(new Date(), windowDays - index - 1);
    const key = format(date, "yyyy-MM-dd");
    const value = totals.get(key) || { words: 0, sessions: 0 };
    return {
      date: key,
      label: format(date, "MMM d"),
      words: value.words,
      sessions: value.sessions,
    };
  });
};

const buildHeatmap = (datedDrafts: DatedDraft[], windowDays = 35): WritingHeatmapCell[] => {
  const totals = new Map<string, { words: number; sessions: number }>();

  datedDrafts.forEach((draft) => {
    if (!draft.savedDate) return;
    const key = format(draft.savedDate, "yyyy-MM-dd");
    const current = totals.get(key) || { words: 0, sessions: 0 };
    totals.set(key, {
      words: current.words + draft.wordCount,
      sessions: current.sessions + 1,
    });
  });

  return Array.from({ length: windowDays }, (_, index) => {
    const date = subDays(new Date(), windowDays - index - 1);
    const key = format(date, "yyyy-MM-dd");
    const value = totals.get(key) || { words: 0, sessions: 0 };
    const level =
      value.words === 0
        ? 0
        : value.words < 300
          ? 1
          : value.words < 700
            ? 2
            : 3;

    return {
      date: key,
      label: format(date, "EEE"),
      words: value.words,
      sessions: value.sessions,
      level,
    };
  });
};

export const analyzeWritingDrafts = (drafts: WritingDraft[]): WritingAnalyticsSummary => {
  const datedDrafts = drafts.map((draft) => ({
    ...draft,
    savedDate: parseSavedDate(draft.savedAt),
  }));
  const combinedText = drafts.map((draft) => draft.text).join("\n\n");
  const totalWords = drafts.reduce((sum, draft) => sum + draft.wordCount, 0);
  const sessionsCompleted = drafts.length;
  const sentenceCount = getSentenceCount(combinedText);
  const avgSentenceLength = sentenceCount > 0 ? totalWords / sentenceCount : 0;
  const dialogueWords = getDialogueWordCount(combinedText);
  const narrationWords = Math.max(0, totalWords - dialogueWords);
  const dialogueRatio = totalWords > 0 ? dialogueWords / totalWords : 0;
  const narrationRatio = totalWords > 0 ? narrationWords / totalWords : 0;

  const allWords = combinedText
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  const descriptiveCount = allWords.filter((word) => word.endsWith("ly") || DESCRIPTIVE_WORDS.has(word)).length;
  const actionCount = allWords.filter((word) => ACTION_WORDS.has(word)).length;
  const fillerCount = allWords.filter((word) => FILLER_WORDS.has(word)).length;
  const repetition = toRankedList(getWordCounts(combinedText), 8, 3);
  const repeatedPhrases = toRankedList(getBigramCounts(combinedText), 6, 2);
  const topWords = toRankedList(getWordCounts(combinedText), 14, 2);
  const repetitionWeight = repetition.slice(0, 5).reduce((sum, item) => sum + item.count, 0);

  const clarityScore = clamp(
    Math.round(
      100
        - Math.max(0, avgSentenceLength - 18) * 1.5
        - (totalWords > 0 ? (fillerCount / totalWords) * 220 : 0)
        - (totalWords > 0 ? (repetitionWeight / totalWords) * 120 : 0),
    ),
    20,
    98,
  );

  const overDescriptionScore = clamp(
    Math.round(totalWords > 0 ? (descriptiveCount / totalWords) * 1000 : 0),
    0,
    100,
  );

  const actionDensity = clamp(
    Math.round(totalWords > 0 ? (actionCount / totalWords) * 1000 : 0),
    0,
    100,
  );

  const { current, longest } = getStreakInfo(datedDrafts);

  return {
    totalWords,
    sessionsCompleted,
    avgSessionLengthMinutes:
      sessionsCompleted > 0 ? Math.max(1, Math.round(totalWords / sessionsCompleted / 25)) : 0,
    avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
    dialogueRatio,
    narrationRatio,
    currentStreak: current,
    longestStreak: longest,
    clarityScore,
    overDescriptionScore,
    actionDensity,
    wordsPerDay: buildWordsPerDay(datedDrafts),
    heatmap: buildHeatmap(datedDrafts),
    topWords,
    repetition,
    repeatedPhrases,
  };
};
