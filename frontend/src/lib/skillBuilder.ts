import type { LearningTopic, SkillBuilderTrend } from "@/services/learningClient";

export type SkillBuilderTaskType = "write" | "identify" | "transform";

export interface SkillBuilderValidationResult {
  wordCount: number;
  sentenceCount: number;
  isValid: boolean;
  message: string;
}

export interface SkillBuilderChallengeTask {
  type: SkillBuilderTaskType;
  title: string;
  prompt: string;
  options?: Array<{
    id: string;
    label: string;
  }>;
  answerId?: string;
  sampleAnswer?: string;
}

const ensureSentenceEnding = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);

const MIN_SENTENCES = 2;
const MAX_SENTENCES = 3;
const MIN_WORDS = 18;

const countWords = (value: string) => {
  const matches = value.match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

export const countSentences = (value: string) =>
  value
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;

export const validateSkillBuilderDraft = (content: string): SkillBuilderValidationResult => {
  const wordCount = countWords(content);
  const sentenceCount = countSentences(content);

  if (!content.trim()) {
    return {
      wordCount,
      sentenceCount,
      isValid: false,
      message: "Write 2-3 sentences to continue.",
    };
  }

  if (sentenceCount < MIN_SENTENCES) {
    return {
      wordCount,
      sentenceCount,
      isValid: false,
      message: "Add one more sentence so the idea has room to develop.",
    };
  }

  if (sentenceCount > MAX_SENTENCES) {
    return {
      wordCount,
      sentenceCount,
      isValid: false,
      message: "Keep it to 2-3 sentences so the practice stays focused.",
    };
  }

  if (wordCount < MIN_WORDS) {
    return {
      wordCount,
      sentenceCount,
      isValid: false,
      message: "Add more detail before submitting.",
    };
  }

  return {
    wordCount,
    sentenceCount,
    isValid: true,
    message: "Ready to evaluate.",
  };
};

const hashString = (value: string) =>
  value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

export const buildDailyChallengeTask = (
  topic: LearningTopic,
  allTopics: Array<Pick<LearningTopic, "id" | "title">>,
  dateKey: string,
): SkillBuilderChallengeTask => {
  const rotation = (hashString(`${topic.id}-${dateKey}`) + topic.order) % 3;
  const examples = topic.conceptGuide.examples.length > 0 ? topic.conceptGuide.examples : topic.examples;

  if (rotation === 1) {
    const distractors = allTopics
      .filter((candidate) => candidate.id !== topic.id)
      .slice(0, 3)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.title,
      }));

    return {
      type: "identify",
      title: "Challenge: Identify",
      prompt: `Which technique is being used here: "${examples[0] || topic.definition}"`,
      options: [...distractors, { id: topic.id, label: topic.title }].sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
      answerId: topic.id,
    };
  }

  if (rotation === 2) {
    return {
      type: "transform",
      title: "Challenge: Transform",
      prompt: `Turn this plain line into one that clearly uses ${topic.title}: "The night was very quiet and tense."`,
      sampleAnswer: topic.id === "oxymoron" ? "The house held a deafening silence all night." : undefined,
    };
  }

  return {
    type: "write",
    title: "Challenge: Write",
    prompt: `Write 2 fresh sentences using ${topic.title.toLowerCase()} in a different situation from your main response.`,
  };
};

export const buildCoachFallback = (content: string, topic: LearningTopic) => {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const base = sentences.join(" ");
  const firstSentence = sentences[0] || base;
  const secondSentence =
    sentences[1] ||
    `The image becomes clearer when the ${topic.title.toLowerCase()} carries emotion and setting.`;

  return `${firstSentence.replace(/\s+$/, "")} ${secondSentence} The comparison now feels more grounded and vivid.`;
};

const addSubjectIfMissing = (sentence: string) => {
  if (/^(he|she|they|it|the|a|an)\b/i.test(sentence)) return sentence;
  return `He ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
};

const enhanceSimile = (content: string) => {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  let firstSentence = addSubjectIfMissing(sentences[0] || trimmed);

  firstSentence = firstSentence
    .replace(/\bbull\b/i, "raging bull")
    .replace(/\blion\b/i, "battle-ready lion")
    .replace(/\bwind\b/i, "winter wind");

  if (!/\bin\b/i.test(firstSentence)) {
    firstSentence += " in the arena";
  }

  const secondSentence =
    sentences[1] ||
    "The moment stayed tense, and everyone around him could feel that strength.";

  return `${ensureSentenceEnding(firstSentence)} ${ensureSentenceEnding(secondSentence)}`;
};

const enhanceWithContext = (content: string, topic: LearningTopic) => {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const firstSentence = ensureSentenceEnding(addSubjectIfMissing(sentences[0] || trimmed));
  const secondSentence =
    sentences[1] ||
    `The ${topic.title.toLowerCase()} lands better when the scene includes a setting and one stronger detail.`;

  return `${firstSentence} ${ensureSentenceEnding(secondSentence)}`;
};

export const buildRuleBasedImprovement = (content: string, topic: LearningTopic) => {
  if (topic.id === "simile" && /\b(as|like)\b/i.test(content)) {
    return enhanceSimile(content);
  }

  return enhanceWithContext(content, topic);
};

export const getImprovementChecklist = (topic: LearningTopic) => [
  "Add a setting so the reader knows where it happens.",
  `Use a stronger ${topic.id === "simile" ? "comparison word" : "descriptive word"}.`,
  "Add a second descriptive detail that supports the same image.",
];

export const getTrendLabel = (trend: SkillBuilderTrend) => {
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Cooling";
  return "Steady";
};
