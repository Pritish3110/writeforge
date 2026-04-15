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
const ensureSentenceCase = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

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

const COMPARISON_UPGRADES: Array<[RegExp, string]> = [
  [/\bbull\b/gi, "raging bull"],
  [/\bstone\b/gi, "unyielding stone"],
  [/\bwind\b/gi, "roaring wind"],
];

const splitSentences = (content: string) =>
  content
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const normalizeSpacing = (sentence: string) => sentence.replace(/\s+/g, " ").trim();

const fixBrokenGrammar = (sentence: string) => {
  let nextSentence = normalizeSpacing(sentence);

  nextSentence = nextSentence.replace(
    /^(He|She|They|It)\s+(in|inside|within|at|under|on|through|across)\b/i,
    (_, __, preposition: string) => ensureSentenceCase(preposition.toLowerCase()),
  );
  nextSentence = nextSentence.replace(/\b(he|she|they|it)\s+in\s+the\b/i, "in the");
  nextSentence = nextSentence.replace(/^(He|She|They)\s+(strong|weak|brave|fierce)\b/i, "$1 stood $2");

  return normalizeSpacing(nextSentence);
};

const startsWithSubject = (sentence: string) =>
  /^(he|she|they|it|the|a|an|this|that|these|those|my|our|his|her|their)\b/i.test(sentence);

const startsWithIntroPhrase = (sentence: string) =>
  /^(in|inside|within|at|under|on|near|through|across|beyond|during|after|before|while|when)\b/i.test(
    sentence,
  );

const ensureSubjectExists = (sentence: string) => {
  if (startsWithSubject(sentence) || startsWithIntroPhrase(sentence)) {
    return sentence;
  }

  if (/\b(as|like)\b/i.test(sentence) || /^(strong|brave|fierce|steady|silent|wild)\b/i.test(sentence)) {
    return `The figure was ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
  }

  return `The figure ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
};

const strengthenComparisons = (sentence: string) =>
  COMPARISON_UPGRADES.reduce(
    (nextSentence, [pattern, replacement]) => nextSentence.replace(pattern, replacement),
    sentence,
  );

const hasLocationContext = (sentence: string) =>
  /\b(arena|battlefield|storm|forest|street|room|river|shore|sky|sea|crowd|city|hall|field|desert|castle|mountain)\b/i.test(
    sentence,
  );

const chooseLocationContext = (content: string) => {
  if (/\b(battle|war|sword|shield|soldier)\b/i.test(content)) return "on the battlefield";
  if (/\b(storm|thunder|rain|lightning|wind)\b/i.test(content)) return "inside the storm";
  if (/\b(crowd|cheer|fighter|bull|strength|roar)\b/i.test(content)) return "in the arena";

  return "in the scene";
};

const appendContextIfMissing = (sentence: string, fullContent: string) =>
  hasLocationContext(sentence) ? sentence : `${sentence} ${chooseLocationContext(fullContent)}`;

const buildSupportSentence = (topic: LearningTopic, baseSentence: string) => {
  if (/\b(battle|war|sword|shield)\b/i.test(baseSentence)) {
    return "The image keeps the same fierce meaning while making the scene easier to picture.";
  }

  if (topic.id === "simile") {
    return "The comparison now feels more vivid without changing the original meaning.";
  }

  return `The ${topic.title.toLowerCase()} now feels clearer, stronger, and easier to picture.`;
};

const rewritePrimarySentence = (sentence: string, topic: LearningTopic, fullContent: string) => {
  let nextSentence = fixBrokenGrammar(sentence);
  nextSentence = ensureSubjectExists(nextSentence);
  nextSentence = strengthenComparisons(nextSentence);
  nextSentence = appendContextIfMissing(nextSentence, fullContent);

  if (topic.id === "simile" && /\bas\s+\w+\s+as\b/i.test(nextSentence) && !/\bwas\b/i.test(nextSentence)) {
    nextSentence = nextSentence.replace(/\bstood as\b/i, "was as");
  }

  return ensureSentenceEnding(ensureSentenceCase(normalizeSpacing(nextSentence)));
};

export const buildRuleBasedImprovement = (content: string, topic: LearningTopic) => {
  const sentences = splitSentences(content);
  if (sentences.length === 0) return "";

  const primarySentence = rewritePrimarySentence(sentences[0], topic, content);
  const secondarySentence = sentences[1]
    ? ensureSentenceEnding(ensureSentenceCase(normalizeSpacing(fixBrokenGrammar(sentences[1]))))
    : buildSupportSentence(topic, primarySentence);

  return `${primarySentence} ${secondarySentence}`;
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
