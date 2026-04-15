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
  difficultyLabel?: string;
  requirements?: string[];
  placeholder?: string;
  ctaLabel?: string;
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

const hardChallengeBank: Record<
  string,
  {
    identify: Omit<SkillBuilderChallengeTask, "type">;
    transform: Omit<SkillBuilderChallengeTask, "type">;
    write: Omit<SkillBuilderChallengeTask, "type">;
  }
> = {
  simile: {
    identify: {
      title: "Challenge: Separate Simile From Nearby Devices",
      difficultyLabel: "Hard",
      prompt: "Which line uses a true simile, not a metaphor, personification, or plain image?",
      options: [
        {
          id: "simile-correct",
          label: "The moon hung like a tarnished coin above the ruined abbey.",
        },
        {
          id: "simile-metaphor",
          label: "The moon was a tarnished coin above the ruined abbey.",
        },
        {
          id: "simile-personification",
          label: "The moon peered over the abbey with a watchman's patience.",
        },
        {
          id: "simile-plain",
          label: "The moonlight silvered the broken stone of the abbey.",
        },
      ],
      answerId: "simile-correct",
      requirements: [
        "Choose the line that keeps the comparison explicit with like or as.",
      ],
    },
    transform: {
      title: "Challenge: Raise the Comparison",
      difficultyLabel: "Hard",
      prompt: 'Transform this plain line into 2-3 sentences shaped by simile: "The queen entered the court in silence."',
      requirements: [
        "Make the simile reveal power or emotional tension.",
        "Avoid stock images such as lion, storm, or fire.",
        "Keep the comparison elegant enough for a novel scene.",
      ],
      placeholder: "Build a charged entrance with one memorable simile and enough setting detail to make it breathe.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Compose Under Constraint",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which a character hides fear behind perfect manners, using simile without sounding ornamental.",
      requirements: [
        "Let the simile deepen character, not just description.",
        "Make the tone feel literary rather than decorative.",
        "Keep every sentence aimed at the same emotional pressure.",
      ],
      placeholder: "Write a polished, tense passage that uses simile as part of the character's mask.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  metaphor: {
    identify: {
      title: "Challenge: Find the Direct Metaphor",
      difficultyLabel: "Hard",
      prompt: "Which line lands as a metaphor because it states the image directly?",
      options: [
        {
          id: "metaphor-correct",
          label: "By dusk, the ballroom was a gilded trap with music for bars.",
        },
        {
          id: "metaphor-simile",
          label: "By dusk, the ballroom felt like a gilded trap with music for bars.",
        },
        {
          id: "metaphor-personification",
          label: "By dusk, the ballroom lured its guests deeper into the light.",
        },
        {
          id: "metaphor-plain",
          label: "By dusk, the ballroom glittered while the doors stayed shut.",
        },
      ],
      answerId: "metaphor-correct",
      requirements: [
        "Pick the line where the comparison is declared, not merely suggested.",
      ],
    },
    transform: {
      title: "Challenge: Turn Meaning Into Image",
      difficultyLabel: "Hard",
      prompt: 'Rewrite this line as 2-3 sentences driven by metaphor: "He felt guilty after betraying his brother."',
      requirements: [
        "Choose one central image and sustain it.",
        "Let the metaphor carry moral weight, not just decoration.",
        "Avoid explaining the emotion after the metaphor lands.",
      ],
      placeholder: "Turn guilt into a physical, memorable image that could sit inside a serious novel.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Write With Compression",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which a once-glorious city is revealed through metaphor alone.",
      requirements: [
        "Let the metaphor expose decay and history at once.",
        "Keep the prose controlled rather than purple.",
        "Make the image specific enough to feel lived in.",
      ],
      placeholder: "Shape the city through a single forceful metaphor and let the details support it.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  personification: {
    identify: {
      title: "Challenge: Hear the Setting Act",
      difficultyLabel: "Hard",
      prompt: "Which line uses personification rather than simple description or metaphor?",
      options: [
        {
          id: "personification-correct",
          label: "The corridor held its breath as the verdict approached.",
        },
        {
          id: "personification-plain",
          label: "The corridor fell completely silent as the verdict approached.",
        },
        {
          id: "personification-metaphor",
          label: "The corridor was a throat narrowing around the witnesses.",
        },
        {
          id: "personification-hyperbole",
          label: "The corridor was so quiet it could have shattered glass.",
        },
      ],
      answerId: "personification-correct",
      requirements: [
        "Choose the line where the setting receives a distinctly human action.",
      ],
    },
    transform: {
      title: "Challenge: Animate the Scene",
      difficultyLabel: "Hard",
      prompt: 'Transform this into 2-3 sentences using personification: "Rain fell on the city after midnight."',
      requirements: [
        "Give the weather an action that matches the mood of the scene.",
        "Keep the tone restrained enough for literary prose.",
        "Make the city feel implicated, not merely described.",
      ],
      placeholder: "Let the rain behave like a character entering the city with intention.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Make the Setting Judge the Character",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which an empty house seems to remember the person walking through it.",
      requirements: [
        "Use personification to shape mood, not fantasy.",
        "Let the house feel watchful or accusatory.",
        "Avoid repeating the same verb or emotion twice.",
      ],
      placeholder: "Write a haunted yet controlled passage in which the house seems aware.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  hyperbole: {
    identify: {
      title: "Challenge: Spot the Deliberate Overstatement",
      difficultyLabel: "Hard",
      prompt: "Which line uses hyperbole instead of vivid but literal description?",
      options: [
        {
          id: "hyperbole-correct",
          label: "He had waited a century in that anteroom before the duke summoned him.",
        },
        {
          id: "hyperbole-plain",
          label: "He had waited for hours in that anteroom before the duke summoned him.",
        },
        {
          id: "hyperbole-metaphor",
          label: "The anteroom was a prison of velvet and incense.",
        },
        {
          id: "hyperbole-personification",
          label: "The anteroom stared back with its gilded portraits and patient chairs.",
        },
      ],
      answerId: "hyperbole-correct",
      requirements: [
        "Choose the line whose exaggeration is intentional, obvious, and expressive.",
      ],
    },
    transform: {
      title: "Challenge: Exaggerate Without Losing Control",
      difficultyLabel: "Hard",
      prompt: 'Turn this into 2-3 sentences using hyperbole: "She was tired after the battle."',
      requirements: [
        "Make the exaggeration reveal exhaustion and cost.",
        "Keep the tone dramatic, not comic.",
        "Anchor the overstatement in physical detail.",
      ],
      placeholder: "Push the fatigue far beyond literal truth while keeping the scene serious.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Heighten the Emotion",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which a lover's delay feels intolerable, using hyperbole without sounding melodramatic.",
      requirements: [
        "Let the exaggeration arise from genuine feeling.",
        "Balance intensity with elegance.",
        "Keep the image rooted in one scene rather than abstract complaint.",
      ],
      placeholder: "Write a heightened, emotionally precise passage shaped by hyperbole.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  alliteration: {
    identify: {
      title: "Challenge: Hear the Music Under the Line",
      difficultyLabel: "Hard",
      prompt: "Which line relies on alliteration as a real sound pattern rather than a coincidence?",
      options: [
        {
          id: "alliteration-correct",
          label: "Black banners beat against the battlements in the bitter dawn.",
        },
        {
          id: "alliteration-assonance",
          label: "Low stone roads opened slowly over the moor.",
        },
        {
          id: "alliteration-plain",
          label: "Dark banners moved against the battlements at dawn.",
        },
        {
          id: "alliteration-repetition",
          label: "The banners, the banners, the banners would not fall.",
        },
      ],
      answerId: "alliteration-correct",
      requirements: [
        "Choose the line where repeated initial consonants create deliberate rhythm.",
      ],
    },
    transform: {
      title: "Challenge: Shape Sound Into Mood",
      difficultyLabel: "Hard",
      prompt: 'Rewrite this line with controlled alliteration: "Snow moved across the mountain pass."',
      requirements: [
        "Let the repeated sound match the mood of the weather.",
        "Keep the sentence readable and elegant.",
        "Do not turn the line into a tongue twister.",
      ],
      placeholder: "Use sound to create atmosphere without sacrificing clarity.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Build Music Without Excess",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences describing a royal procession, using alliteration to create grandeur and menace at the same time.",
      requirements: [
        "Use repeated consonants with control, not clutter.",
        "Let the sound pattern serve mood and pacing.",
        "Make the prose feel ceremonial yet dangerous.",
      ],
      placeholder: "Write a rich procession scene whose music sharpens the tension.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  onomatopoeia: {
    identify: {
      title: "Challenge: Hear the Sound-Word",
      difficultyLabel: "Hard",
      prompt: "Which line uses onomatopoeia as an active part of the prose?",
      options: [
        {
          id: "onomatopoeia-correct",
          label: "The hinges shrieked as the chapel door dragged inward.",
        },
        {
          id: "onomatopoeia-plain",
          label: "The chapel door opened with a harsh, rusty sound.",
        },
        {
          id: "onomatopoeia-alliteration",
          label: "The chapel door scraped slowly through stale dust.",
        },
        {
          id: "onomatopoeia-personification",
          label: "The chapel door protested the hand that forced it wide.",
        },
      ],
      answerId: "onomatopoeia-correct",
      requirements: [
        "Choose the line where the chosen word imitates the sound it describes.",
      ],
    },
    transform: {
      title: "Challenge: Let the Noise Strike the Reader",
      difficultyLabel: "Hard",
      prompt: 'Transform this into 2-3 sentences using onomatopoeia: "Arrows hit the shields during the siege."',
      requirements: [
        "Use sound-words that feel embedded in the action.",
        "Make the sonic detail intensify danger, not distract from it.",
        "Keep the passage tense and vivid.",
      ],
      placeholder: "Write the impact so the reader can almost hear the siege ring through the line.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Score the Scene With Sound",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which a duel is conveyed through sharply chosen sound-words and controlled narration.",
      requirements: [
        "Let the sounds punctuate action instead of replacing it.",
        "Keep the prose visual as well as audible.",
        "Choose sound-words that feel precise rather than childish.",
      ],
      placeholder: "Write a duel where the soundscape does real narrative work.",
      ctaLabel: "Submit Pressure Test",
    },
  },
  oxymoron: {
    identify: {
      title: "Challenge: Catch the Productive Contradiction",
      difficultyLabel: "Hard",
      prompt: "Which line turns contradiction into meaning through oxymoron?",
      options: [
        {
          id: "oxymoron-correct",
          label: "A jubilant grief ran through the hall when the lost prince returned maimed.",
        },
        {
          id: "oxymoron-plain",
          label: "Joy and grief ran together through the hall when the prince returned.",
        },
        {
          id: "oxymoron-metaphor",
          label: "The hall became a wound lit by trumpets when the prince returned.",
        },
        {
          id: "oxymoron-hyperbole",
          label: "The hall nearly burst apart when the prince returned alive.",
        },
      ],
      answerId: "oxymoron-correct",
      requirements: [
        "Choose the line where apparently opposing terms are fused to express a layered truth.",
      ],
    },
    transform: {
      title: "Challenge: Hold Two Truths At Once",
      difficultyLabel: "Hard",
      prompt: 'Rewrite this as 2-3 sentences using oxymoron: "She smiled while signing the surrender."',
      requirements: [
        "Use contradiction to reveal emotional conflict.",
        "Avoid familiar phrases such as bittersweet or deafening silence.",
        "Keep the prose sharp enough for a serious novel scene.",
      ],
      placeholder: "Write a surrender scene where opposite meanings press against each other in the language.",
      ctaLabel: "Submit Pressure Test",
    },
    write: {
      title: "Challenge: Write the Impossible Feeling",
      difficultyLabel: "Hard",
      prompt: "Write 2-3 sentences in which a long-awaited reunion feels both merciful and ruinous, using oxymoron with precision.",
      requirements: [
        "Let the contradiction emerge from the emotion, not from random word pairing.",
        "Keep the phrasing surprising and controlled.",
        "Make the scene feel intimate and costly.",
      ],
      placeholder: "Write a reunion that carries mutually true but warring emotions.",
      ctaLabel: "Submit Pressure Test",
    },
  },
};

export const buildDailyChallengeTask = (
  topic: LearningTopic,
  _allTopics: Array<Pick<LearningTopic, "id" | "title">>,
  dateKey: string,
): SkillBuilderChallengeTask => {
  const rotation = (hashString(`${topic.id}-${dateKey}`) + topic.order) % 3;
  const challengeSet = hardChallengeBank[topic.id];

  if (challengeSet) {
    if (rotation === 1) {
      return {
        type: "identify",
        ...challengeSet.identify,
      };
    }

    if (rotation === 2) {
      return {
        type: "transform",
        ...challengeSet.transform,
      };
    }

    return {
      type: "write",
      ...challengeSet.write,
    };
  }

  return rotation === 1
    ? {
        type: "identify",
        title: "Challenge: Identify the Device",
        difficultyLabel: "Hard",
        prompt: `Which line most clearly demonstrates ${topic.title}?`,
        options: (topic.conceptGuide.examples.length > 0 ? topic.conceptGuide.examples : topic.examples)
          .slice(0, 1)
          .map((example, index) => ({
            id: `fallback-${index + 1}`,
            label: example,
          })),
        answerId: "fallback-1",
      }
    : {
        type: rotation === 2 ? "transform" : "write",
        title: rotation === 2 ? "Challenge: Transform the Line" : "Challenge: Write Under Pressure",
        difficultyLabel: "Hard",
        prompt:
          rotation === 2
            ? `Rewrite a plain sentence so ${topic.title.toLowerCase()} carries the emotional weight of the scene.`
            : `Write 2-3 sentences that use ${topic.title.toLowerCase()} with precision, control, and fresh imagery.`,
        requirements: [
          "Keep the prose vivid and deliberate.",
          "Avoid cliche or filler phrasing.",
          "Let the device deepen the scene, not merely decorate it.",
        ],
        placeholder: "Write with pressure, precision, and a strong sense of scene.",
        ctaLabel: "Submit Pressure Test",
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
