import {
  WORLD_CATEGORY_PROMPT_BANKS,
  WORLD_ELEMENT_PROMPT_BANKS,
  WORLD_TEMPLATES,
  type WorldPromptBank,
} from "@/data/worldElementPromptBanks";

type BuiltInWorldCategory = "physical" | "cultural" | "magic";

export type WorldCategory = BuiltInWorldCategory | "custom";

export interface GenerateWorldElementPromptOptions {
  category?: WorldCategory | string | null;
  element?: string | null;
}

export interface InterpretedWorldElement {
  type: string;
  domain: string;
  function: string;
  categoryBias: BuiltInWorldCategory;
}

export interface GeneratedWorldElementPrompt {
  prompt: string;
  title: string;
  description: string;
  category: WorldCategory;
  element: string;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
  tags: string[];
  interpretation?: InterpretedWorldElement;
  recycledPool: boolean;
  usedCount: number;
}

export const WORLD_CATEGORIES: WorldCategory[] = ["physical", "cultural", "magic", "custom"];
const BUILT_IN_WORLD_CATEGORIES: BuiltInWorldCategory[] = [
  "physical",
  "cultural",
  "magic",
];

export const WORLD_CATEGORY_LABELS: Record<WorldCategory, string> = {
  physical: "Physical",
  cultural: "Cultural",
  magic: "Magic",
  custom: "Custom",
};

export const WORLD_ELEMENT_OPTIONS: Record<WorldCategory, string[]> = {
  physical: [
    "weather",
    "terrain",
    "flora",
    "fauna",
    "cosmology",
    "tectonic activity",
    "climate",
    "visuals",
    "oceans",
    "seasons",
    "geology",
    "natural disasters",
    "celestial bodies",
    "rivers",
    "coastlines",
    "caves",
    "glaciers",
    "soil",
    "air quality",
    "day-night cycle",
    "mineral deposits",
    "biomes",
    "water systems",
    "mountain ranges",
    "volcanic zones",
  ],
  cultural: [
    "religion",
    "economics",
    "borders",
    "food lore",
    "fashion",
    "gender roles",
    "military",
    "languages",
    "taboos",
    "social hierarchy",
    "rites of passage",
    "law",
    "education",
    "governance",
    "trade routes",
    "festivals",
    "family structure",
    "funeral customs",
    "hospitality codes",
    "mythmaking",
    "storytelling traditions",
    "naming customs",
    "currency",
    "labor systems",
    "citizenship",
    "urban etiquette",
    "arts",
    "diaspora identity",
  ],
  magic: [
    "magic flow",
    "energy source",
    "spell system",
    "corruption",
    "artifacts",
    "rituals",
    "limitations",
    "costs",
    "inheritance",
    "interaction with society",
    "scaling system",
    "anti-magic",
    "magical institutions",
    "side effects",
    "magic ecology",
    "access methods",
    "divination",
    "healing magic",
    "illusion magic",
    "summoning",
    "warding",
    "enchantments",
    "spirit bonds",
    "magic storage",
    "elemental attunement",
    "teleportation",
    "necromancy",
    "magic detection",
  ],
  custom: [],
};

export { WORLD_CATEGORY_PROMPT_BANKS, WORLD_ELEMENT_PROMPT_BANKS, WORLD_TEMPLATES };

const ALL_WORLD_PROMPT_BANKS = [
  ...Object.values(WORLD_CATEGORY_PROMPT_BANKS),
  ...Object.values(WORLD_ELEMENT_PROMPT_BANKS).flatMap((group) => Object.values(group)),
];

export const CORES = ALL_WORLD_PROMPT_BANKS.flatMap((group) => group.cores);
export const MECHANICS = ALL_WORLD_PROMPT_BANKS.flatMap((group) => group.mechanics);
export const IMPACTS = ALL_WORLD_PROMPT_BANKS.flatMap((group) => group.impacts);
export const CONSEQUENCES = ALL_WORLD_PROMPT_BANKS.flatMap((group) => group.consequences);

const usedWorldPrompts = new Set<string>();
const MAX_WORLD_PROMPT_ATTEMPTS = 20;
const DEBUG_WORLD_ENGINE = import.meta.env.DEV;

if (DEBUG_WORLD_ENGINE) {
  console.log("WORLD DATA CHECK", {
    templates: WORLD_TEMPLATES?.length,
    cores: CORES?.length,
    mechanics: MECHANICS?.length,
  });
}

export function getRandom<T>(arr: readonly T[] | undefined | null): T {
  if (!arr || arr.length === 0) return "unknown" as T;
  return arr[Math.floor(Math.random() * arr.length)];
}

const hashString = (value: string): number =>
  value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);

const getSeeded = <T,>(arr: readonly T[] | undefined | null, seed: number, salt = 0): T => {
  if (!arr || arr.length === 0) return "unknown" as T;
  return arr[(seed + salt) % arr.length];
};

export function capitalize(str: string): string {
  const trimmed = str.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

export const formatWorldCategoryLabel = (category: WorldCategory): string =>
  WORLD_CATEGORY_LABELS[category];

export const normalizeWorldCategory = (value?: WorldCategory | string | null): WorldCategory => {
  if (value === "physical" || value === "cultural" || value === "magic" || value === "custom") {
    return value;
  }
  return "physical";
};

export const normalizeWorldElement = (
  category: WorldCategory,
  value?: string | null,
): string => {
  const trimmed = value?.trim();
  if (category === "custom") return trimmed || "";
  return trimmed || getRandom(getWorldElementsForCategory(category));
};

export const getWorldElementsForCategory = (category: WorldCategory): string[] =>
  WORLD_ELEMENT_OPTIONS[category];

const normalizeFreeformElement = (value: string) => value.trim().toLowerCase();
const includesAny = (value: string, keywords: readonly string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const SIMPLE_TAG_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "through",
  "to",
  "with",
  "who",
]);

const GENERIC_TAG_WORDS = new Set([
  "daily",
  "domain",
  "life",
  "physical",
  "pressure",
  "social",
  "world",
]);

const GENERIC_TAG_PHRASES = new Set([
  "daily life",
  "physical system",
  "social physical",
  "world element",
]);

const TITLE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

interface WorldConceptAnchor {
  meaning: string;
  role: string;
  aliases?: readonly string[];
  categoryBias?: BuiltInWorldCategory;
  type?: string;
  domain?: string;
  function?: string;
  frames?: {
    core: readonly string[];
    mechanic: readonly string[];
    impact: readonly string[];
    consequence: readonly string[];
  };
}

const WORLD_CONCEPT_ANCHORS: Record<string, WorldConceptAnchor> = {
  sports: {
    meaning: "organized competition, public status, and controlled rivalry",
    role: "status, identity, and social mobility",
    aliases: ["sport", "games", "tournaments", "athletics", "league"],
    categoryBias: "cultural",
    type: "cultural system",
    domain: "cultural / civic",
    function: "status and competition",
    frames: {
      core: ["organized competition", "public contests", "ranked athletic events"],
      mechanic: ["structured leagues and ranking rules", "ritual matches and training systems", "sponsors, coaches, and public standings"],
      impact: ["status, identity, and social mobility", "public fame and civic pride", "political attention and communal rivalry"],
      consequence: ["corruption, unrest, and public distrust", "match-fixing and legitimacy crises", "violent rivalry and loss of trust"],
    },
  },
  trade: {
    meaning: "the exchange of goods, routes, and bargaining power",
    role: "wealth, access, and political leverage",
    aliases: ["commerce", "markets"],
    categoryBias: "cultural",
    type: "resource economy",
    domain: "economic / social",
    function: "trade and labor",
  },
  religion: {
    meaning: "shared belief, ritual authority, and moral order",
    role: "identity, legitimacy, and public behavior",
    categoryBias: "cultural",
    type: "cultural system",
    domain: "cultural / civic",
    function: "belief and moral order",
  },
  war: {
    meaning: "organized violence, coercive force, and strategic power",
    role: "security, fear, and political control",
    aliases: ["battle", "armies"],
    categoryBias: "cultural",
    type: "cultural system",
    domain: "cultural / military",
    function: "conflict and coercion",
    frames: {
      core: ["organized violence", "standing armies", "contested fronts"],
      mechanic: ["command chains and military logistics", "conscription, drilling, and supply networks", "strategic alliances and disciplined force"],
      impact: ["border control, fear, and political power", "labor demands, taxation, and public loyalty", "status, grief, and civilian life"],
      consequence: ["coup risk, famine, and civic collapse", "war profiteering and public revolt", "occupation, trauma, and loss of trust"],
    },
  },
  "labor systems": {
    meaning: "how work is assigned, rewarded, and controlled",
    role: "production, class power, and worker leverage",
  },
  "diaspora identity": {
    meaning: "how displaced communities keep ties to home while adapting elsewhere",
    role: "belonging, reputation, and political trust",
  },
  "air quality": {
    meaning: "the safety and condition of the air people breathe",
    role: "health, labor, and settlement",
  },
};

const findWorldConceptAnchor = (value: string): WorldConceptAnchor | null => {
  const normalizedValue = normalizeFreeformElement(value);

  for (const [key, anchor] of Object.entries(WORLD_CONCEPT_ANCHORS)) {
    if (normalizedValue === key) return anchor;
    if (anchor.aliases?.some((alias) => normalizedValue === alias || normalizedValue.includes(alias))) {
      return anchor;
    }
  }

  return null;
};

const inferFunction = (normalizedElement: string): string => {
  if (includesAny(normalizedElement, ["sport", "sports", "game", "games", "league", "tournament", "athletic", "arena", "competition"])) {
    return "status and competition";
  }

  if (includesAny(normalizedElement, ["laundry", "wash", "clean", "linen", "fabric", "soap"])) {
    return "cleaning and upkeep";
  }

  if (includesAny(normalizedElement, ["blind", "vision", "sight", "eye", "seeing"])) {
    return "perception and access";
  }

  if (includesAny(normalizedElement, ["law", "court", "justice", "rights", "citizen", "citizenship"])) {
    return "rules and disputes";
  }

  if (includesAny(normalizedElement, ["trade", "market", "currency", "tax", "labor", "work"])) {
    return "trade and labor";
  }

  if (includesAny(normalizedElement, ["war", "battle", "soldier", "army", "weapon", "combat"])) {
    return "conflict and coercion";
  }

  if (includesAny(normalizedElement, ["school", "library", "archive", "education", "guild"])) {
    return "learning and memory";
  }

  if (includesAny(normalizedElement, ["ritual", "magic", "spell", "curse", "ward", "artifact", "divination"])) {
    return "power and control";
  }

  if (includesAny(normalizedElement, ["road", "bridge", "water", "sewer", "transit", "transport", "system"])) {
    return "movement and maintenance";
  }

  return "daily life and pressure";
};

const interpretCustomWorldElement = (element: string): InterpretedWorldElement => {
  const normalizedElement = normalizeFreeformElement(element);
  const anchoredConcept = findWorldConceptAnchor(normalizedElement);

  if (anchoredConcept?.type && anchoredConcept.categoryBias) {
    return {
      type: anchoredConcept.type,
      domain: anchoredConcept.domain || `${anchoredConcept.categoryBias}`,
      function: anchoredConcept.function || inferFunction(normalizedElement),
      categoryBias: anchoredConcept.categoryBias,
    };
  }

  const isMagic = includesAny(normalizedElement, [
    "magic",
    "spell",
    "ritual",
    "curse",
    "artifact",
    "ward",
    "divination",
    "spirit",
    "arcane",
    "enchantment",
  ]);
  const isGroup = includesAny(normalizedElement, [
    "people",
    "folk",
    "citizens",
    "community",
    "tribe",
    "clan",
    "workers",
    "blind",
  ]);
  const isLaw = includesAny(normalizedElement, [
    "law",
    "code",
    "court",
    "rights",
    "citizenship",
    "policy",
    "charter",
  ]);
  const isInstitution = includesAny(normalizedElement, [
    "school",
    "archive",
    "library",
    "guild",
    "academy",
    "hospital",
  ]);
  const isEconomy = includesAny(normalizedElement, [
    "trade",
    "market",
    "currency",
    "tax",
    "labor",
    "work",
    "industry",
  ]);
  const isInfrastructure = includesAny(normalizedElement, [
    "system",
    "network",
    "grid",
    "laundry",
    "water",
    "sewer",
    "road",
    "transit",
    "transport",
    "process",
    "cycle",
  ]);

  if (isMagic) {
    return {
      type: "magical framework",
      domain: "arcane / social",
      function: inferFunction(normalizedElement),
      categoryBias: "magic",
    };
  }

  if (isGroup) {
    return {
      type: "social group",
      domain: "cultural / civic",
      function: inferFunction(normalizedElement),
      categoryBias: "cultural",
    };
  }

  if (isLaw) {
    return {
      type: "governing structure",
      domain: "legal / civic",
      function: inferFunction(normalizedElement),
      categoryBias: "cultural",
    };
  }

  if (isInstitution) {
    return {
      type: "institutional network",
      domain: "cultural / administrative",
      function: inferFunction(normalizedElement),
      categoryBias: "cultural",
    };
  }

  if (isEconomy) {
    return {
      type: "resource economy",
      domain: "economic / social",
      function: inferFunction(normalizedElement),
      categoryBias: "cultural",
    };
  }

  if (isInfrastructure) {
    return {
      type: "infrastructure system",
      domain: "social / physical",
      function: inferFunction(normalizedElement),
      categoryBias: "physical",
    };
  }

  return {
    type: "world element",
    domain: "social / physical",
    function: inferFunction(normalizedElement),
    categoryBias: "physical",
  };
};

const CUSTOM_TYPE_FRAMES: Record<
  string,
  {
    core: readonly string[];
    mechanic: readonly string[];
    impact: readonly string[];
    consequence: readonly string[];
  }
> = {
  "infrastructure system": {
    core: [
      "{function} across homes and shared spaces",
      "a public network for {function}",
      "the daily work behind {function}",
    ],
    mechanic: [
      "workers, routes, supplies, and access rules",
      "shared facilities and steady upkeep",
      "timed service, repair work, and supply flow",
    ],
    impact: [
      "hygiene, labor roles, and daily routine",
      "class comfort, city trust, and public health",
      "household status, street rhythm, and reliable service",
    ],
    consequence: [
      "service failure, contamination, and delay",
      "scarcity, resentment, and breakdown",
      "public strain when upkeep stops",
    ],
  },
  "social group": {
    core: [
      "a community shaped by {function}",
      "shared life built around {function}",
      "people defined by {function}",
    ],
    mechanic: [
      "adaptation, shared knowledge, and access tools",
      "mutual support and practical routines",
      "learned methods for movement and survival",
    ],
    impact: [
      "architecture, etiquette, and public access",
      "law, education, and social belonging",
      "family life, movement, and civic response",
    ],
    consequence: [
      "exclusion, dependency, and neglect",
      "civic tension when access fails",
      "segregation or resistance",
    ],
  },
  "governing structure": {
    core: [
      "the rules behind {function}",
      "who may act within {function}",
      "authority over {function}",
    ],
    mechanic: [
      "officials, records, and enforcement",
      "precedent, judgment, and selective power",
      "public process and rule interpretation",
    ],
    impact: [
      "public trust, class safety, and dispute outcomes",
      "citizenship, obedience, and political loyalty",
      "daily risk and family security",
    ],
    consequence: [
      "corruption, loopholes, and bias",
      "public distrust and abuse",
      "rule without justice",
    ],
  },
  "institutional network": {
    core: [
      "an institution built around {function}",
      "controlled access to {function}",
      "organized memory around {function}",
    ],
    mechanic: [
      "admission rules, records, and rank",
      "training paths and protected knowledge",
      "bureaucracy, archives, and gatekeeping",
    ],
    impact: [
      "social mobility, prestige, and expert power",
      "public memory, labor access, and legitimacy",
      "regional influence and opportunity",
    ],
    consequence: [
      "gatekeeping, stagnation, and capture",
      "knowledge hoarding and exclusion",
      "loss of trust in the institution",
    ],
  },
  "resource economy": {
    core: [
      "{function} as a survival system",
      "control over {function}",
      "daily dependence on {function}",
    ],
    mechanic: [
      "pricing, contracts, and supply chains",
      "exchange rules and material scarcity",
      "labor control and regulated flow",
    ],
    impact: [
      "class mobility, comfort, and leverage",
      "family stability and civic resentment",
      "regional hierarchy and dependency",
    ],
    consequence: [
      "hoarding, unrest, and inequality",
      "corruption and public distrust",
      "shortage when the flow breaks",
    ],
  },
  "cultural system": {
    core: [
      "shared rules around {function}",
      "public life shaped by {function}",
      "collective status built on {function}",
    ],
    mechanic: [
      "ritual habits, ranking rules, and public expectations",
      "institutions, oversight, and repeated performance",
      "training, reputation, and social enforcement",
    ],
    impact: [
      "status, belonging, and political attention",
      "class mobility, loyalty, and public trust",
      "identity, opportunity, and civic pressure",
    ],
    consequence: [
      "corruption, unrest, and distrust",
      "loss of legitimacy and public backlash",
      "division, scandal, and social fracture",
    ],
  },
  "magical framework": {
    core: [
      "{function} at the center of power",
      "a controlled form of {function}",
      "social authority built on {function}",
    ],
    mechanic: [
      "rituals, attunement, and limits",
      "dangerous access and strict control",
      "costs, symbols, and containment",
    ],
    impact: [
      "social rank, fear, and authority",
      "warfare, healing, and taboo",
      "who may alter reality",
    ],
    consequence: [
      "corruption, backlash, and overreach",
      "panic when containment fails",
      "dependence on unstable power",
    ],
  },
  "world element": {
    core: [
      "shared dependence on {function}",
      "a public structure shaped by {function}",
      "an everyday institution tied to {function}",
    ],
    mechanic: [
      "routine roles, access rules, and material limits",
      "public routines, supply flow, and social expectations",
      "training, oversight, and repeated coordination",
    ],
    impact: [
      "status, opportunity, and daily choices",
      "public trust, work, and belonging",
      "conflict, identity, and resource access",
    ],
    consequence: [
      "scarcity, conflict, and public backlash",
      "resentment, abuse, and instability",
      "crisis when the structure collapses",
    ],
  },
};

const fillTemplate = (template: string, interpretation: InterpretedWorldElement) =>
  template.replace(/\{function\}/g, interpretation.function);

const getCustomFrameSet = (
  element: string,
  interpretation: InterpretedWorldElement,
) => {
  const anchoredConcept = findWorldConceptAnchor(element);

  if (anchoredConcept?.frames) {
    return anchoredConcept.frames;
  }

  return CUSTOM_TYPE_FRAMES[interpretation.type] || CUSTOM_TYPE_FRAMES["world element"];
};

const interpretBuiltInWorldElement = (
  category: BuiltInWorldCategory,
  element: string,
): InterpretedWorldElement => {
  const normalizedElement = normalizeFreeformElement(element);

  if (category === "magic") {
    return {
      type: "magic system",
      domain: "magic",
      function: inferFunction(normalizedElement),
      categoryBias: category,
    };
  }

  if (category === "cultural") {
    return {
      type: "cultural system",
      domain: "cultural",
      function: inferFunction(normalizedElement),
      categoryBias: category,
    };
  }

  return {
    type: "physical system",
    domain: "physical",
    function: inferFunction(normalizedElement),
    categoryBias: category,
  };
};

const normalizePromptPhrase = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "")
    .trim();

const normalizeTagPhrase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/[/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const collectTagCandidates = (value: string): string[] => {
  const cleaned = normalizeTagPhrase(value);

  if (!cleaned) return [];

  const words = cleaned
    .split(/\s+/)
    .filter((word) => word && !SIMPLE_TAG_STOPWORDS.has(word) && !GENERIC_TAG_WORDS.has(word));
  const phrases = new Set<string>();

  words.forEach((word, index) => {
    const nextWord = words[index + 1];
    if (nextWord) {
      phrases.add(`${word} ${nextWord}`);
    }
    phrases.add(word);
  });

  return Array.from(phrases).filter((phrase) => phrase.split(/\s+/).length <= 2);
};

const addWorldTag = (
  tags: string[],
  occupiedWords: Set<string>,
  candidate: string,
) => {
  const normalizedTag = normalizeTagPhrase(candidate);

  if (!normalizedTag || GENERIC_TAG_PHRASES.has(normalizedTag)) return;

  const words = normalizedTag.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 2) return;
  if (words.every((word) => SIMPLE_TAG_STOPWORDS.has(word) || GENERIC_TAG_WORDS.has(word))) return;
  if (tags.includes(normalizedTag)) return;

  if (words.length === 1 && occupiedWords.has(words[0])) return;

  tags.push(normalizedTag);

  if (words.length === 2) {
    words.forEach((word) => occupiedWords.add(word));
  }
};

const addFallbackWordTag = (
  tags: string[],
  candidate: string,
) => {
  const normalizedWord = normalizeTagPhrase(candidate);

  if (!normalizedWord) return;
  if (normalizedWord.includes(" ")) return;
  if (SIMPLE_TAG_STOPWORDS.has(normalizedWord) || GENERIC_TAG_WORDS.has(normalizedWord)) return;
  if (tags.includes(normalizedWord)) return;

  tags.push(normalizedWord);
};

const buildWorldTags = ({
  category,
  element,
  interpretation,
  core,
  mechanic,
  impact,
  consequence,
}: {
  category: WorldCategory;
  element: string;
  interpretation?: InterpretedWorldElement;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
}) => {
  const uniqueTags: string[] = [];
  const occupiedWords = new Set<string>();

  if (category !== "custom") {
    addWorldTag(uniqueTags, occupiedWords, category);
  } else if (interpretation?.categoryBias) {
    addWorldTag(uniqueTags, occupiedWords, interpretation.categoryBias);
  }

  addWorldTag(uniqueTags, occupiedWords, element);

  if (interpretation?.type === "social group") {
    addWorldTag(uniqueTags, occupiedWords, interpretation.type);
  }

  [
    interpretation?.function || "",
    core,
    mechanic,
    impact,
    consequence,
  ]
    .flatMap(collectTagCandidates)
    .forEach((tag) => {
      addWorldTag(uniqueTags, occupiedWords, tag);
    });

  if (uniqueTags.length < 6) {
    [
      element,
      core,
      mechanic,
      impact,
      consequence,
    ]
      .map(normalizeTagPhrase)
      .flatMap((value) => value.split(/\s+/))
      .forEach((word) => {
        if (uniqueTags.length >= 6) return;
        addFallbackWordTag(uniqueTags, word);
      });
  }

  return uniqueTags.slice(0, 8);
};

const getWorldPromptBank = (
  category: WorldCategory,
  element: string,
): WorldPromptBank => {
  if (category === "custom") {
    return {
      templates: WORLD_TEMPLATES,
      cores: CORES,
      mechanics: MECHANICS,
      impacts: IMPACTS,
      consequences: CONSEQUENCES,
    };
  }

  return WORLD_ELEMENT_PROMPT_BANKS[category][element] || WORLD_CATEGORY_PROMPT_BANKS[category];
};

export const formatWorldElementLabel = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === "of" || word === "with" || word === "and" || word === "to") return word;
      return capitalize(word);
    })
    .join(" ");

type WorldPromptTone = "design" | "build" | "treat";
type WorldPromptVariant = 0 | 1 | 2;

export const getRandomWorldSelection = (category?: WorldCategory | string | null) => {
  const normalizedCategory = category ? normalizeWorldCategory(category) : null;
  const nextCategory =
    normalizedCategory && normalizedCategory !== "custom"
      ? normalizedCategory
      : getRandom(BUILT_IN_WORLD_CATEGORIES);
  return {
    category: nextCategory,
    element: getRandom(getWorldElementsForCategory(nextCategory)),
  };
};

export function generateWorldTitle({
  core,
  element,
}: {
  core: string;
  element: string;
}) {
  const formattedElement = formatWorldElementLabel(element);
  const normalizedCore = normalizePromptPhrase(core);
  const titleWords = normalizedCore
    .split(/\s+/)
    .filter(Boolean)
    .filter((word, index) => !(index === 0 && TITLE_SMALL_WORDS.has(word.toLowerCase())))
    .slice(0, 4);

  const tail = titleWords
    .map((word, index) => {
      const normalizedWord = word.toLowerCase();
      if (index > 0 && index < titleWords.length - 1 && TITLE_SMALL_WORDS.has(normalizedWord)) {
        return normalizedWord;
      }

      return normalizedWord.charAt(0).toUpperCase() + normalizedWord.slice(1);
    })
    .join(" ");

  if (!tail || tail.toLowerCase() === formattedElement.toLowerCase()) {
    return formattedElement;
  }

  return `${formattedElement}: ${tail}`;
}

const sentenceCase = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const lowerSentenceCase = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
};

const limitPhraseWords = (value: string, maxWords = 8) =>
  normalizePromptPhrase(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");

const normalizeWorldFunction = (value: string) =>
  value === "daily life and pressure" ? "daily life" : value;

const getWorldPromptTone = (template: string): WorldPromptTone => {
  const normalizedTemplate = template.trim().toLowerCase();

  if (normalizedTemplate.startsWith("build ")) return "build";
  if (normalizedTemplate.startsWith("treat ")) return "treat";
  return "design";
};

const getWorldPromptVariant = (template: string): WorldPromptVariant =>
  (hashString(template) % 3) as WorldPromptVariant;

const buildCoreSentence = (value: string, tone: WorldPromptTone, variant: WorldPromptVariant) => {
  const phrase = lowerSentenceCase(limitPhraseWords(value, 8));

  if (tone === "build") {
    return [
      `Its foundation rests on ${phrase}.`,
      `Its base is shaped by ${phrase}.`,
      `Its structure begins with ${phrase}.`,
    ][variant];
  }

  if (tone === "treat") {
    return [
      `Its center is organized around ${phrase}.`,
      `Its focus remains on ${phrase}.`,
      `Its center turns on ${phrase}.`,
    ][variant];
  }

  return [
    `Its core is ${phrase}.`,
    `Its defining feature is ${phrase}.`,
    `Its center depends on ${phrase}.`,
  ][variant];
};

const buildMechanicSentence = (value: string, tone: WorldPromptTone, variant: WorldPromptVariant) => {
  const phrase = lowerSentenceCase(limitPhraseWords(value, 8));

  if (tone === "build") {
    return [
      `It operates through ${phrase}.`,
      `It is sustained by ${phrase}.`,
      `It is organized through ${phrase}.`,
    ][variant];
  }

  if (tone === "treat") {
    return [
      `It is guided by ${phrase}.`,
      `It moves through ${phrase}.`,
      `It is regulated by ${phrase}.`,
    ][variant];
  }

  return [
    `It relies on ${phrase}.`,
    `It runs on ${phrase}.`,
    `It is maintained through ${phrase}.`,
  ][variant];
};

const buildImpactSentence = (value: string, tone: WorldPromptTone, variant: WorldPromptVariant) => {
  const phrase = lowerSentenceCase(limitPhraseWords(value, 8));

  if (tone === "build") {
    return [
      `It changes ${phrase}.`,
      `It governs ${phrase}.`,
      `It redirects ${phrase}.`,
    ][variant];
  }

  if (tone === "treat") {
    return [
      `Its effects reach ${phrase}.`,
      `It reaches into ${phrase}.`,
      `It reshapes ${phrase}.`,
    ][variant];
  }

  return [
    `This shapes ${phrase}.`,
    `That influences ${phrase}.`,
    `As a result, it steers ${phrase}.`,
  ][variant];
};

const buildConsequenceSentence = (value: string, tone: WorldPromptTone, variant: WorldPromptVariant) => {
  const phrase = lowerSentenceCase(limitPhraseWords(value, 8));

  if (tone === "build") {
    return [
      `Breakdown can trigger ${phrase}.`,
      `Failure can unleash ${phrase}.`,
      `Collapse can open the way to ${phrase}.`,
    ][variant];
  }

  if (tone === "treat") {
    return [
      `Failure invites ${phrase}.`,
      `When it fails, it invites ${phrase}.`,
      `A breakdown leaves room for ${phrase}.`,
    ][variant];
  }

  return [
    `Failure brings ${phrase}.`,
    `When it fails, ${phrase} emerges.`,
    `If it collapses, ${phrase} follows.`,
  ][variant];
};

const buildWorldDescription = ({
  element,
  interpretation,
  tone,
  variant,
  core,
  mechanic,
  impact,
  consequence,
}: {
  element: string;
  interpretation: InterpretedWorldElement;
  tone: WorldPromptTone;
  variant: WorldPromptVariant;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
}) => {
  const elementLabel = formatWorldElementLabel(element);
  const functionLabel = normalizeWorldFunction(interpretation.function);
  const corePhrase = lowerSentenceCase(limitPhraseWords(core, 8));
  const mechanicPhrase = lowerSentenceCase(limitPhraseWords(mechanic, 8));
  const impactPhrase = lowerSentenceCase(limitPhraseWords(impact, 8));
  const consequencePhrase = lowerSentenceCase(limitPhraseWords(consequence, 8));
  const anchoredConcept = findWorldConceptAnchor(element);

  if (anchoredConcept && tone === "build") {
    return [
      `${elementLabel} organizes ${anchoredConcept.meaning}. Here, the system is built around ${corePhrase} and sustained by ${mechanicPhrase}, shaping ${impactPhrase}. When that order fails, ${consequencePhrase} follows.`,
      `${elementLabel} governs ${anchoredConcept.meaning}. In this world, ${corePhrase} and ${mechanicPhrase} make it central to ${anchoredConcept.role}. If it breaks, ${consequencePhrase} follows.`,
      `${elementLabel} structures ${anchoredConcept.meaning}. In practice, it is upheld by ${corePhrase} and ${mechanicPhrase}, which push into ${impactPhrase}. If it fails, ${consequencePhrase} spreads quickly.`,
    ][variant];
  }

  if (anchoredConcept && tone === "treat") {
    return [
      `${elementLabel} shapes how people navigate ${anchoredConcept.meaning}. At the center is ${corePhrase}, and it operates through ${mechanicPhrase}. Failure invites ${consequencePhrase}.`,
      `${elementLabel} turns ${anchoredConcept.meaning} into a public force. In this world, ${corePhrase} and ${mechanicPhrase} drive its influence over ${impactPhrase}. If it breaks, ${consequencePhrase} follows.`,
      `${elementLabel} channels ${anchoredConcept.meaning} into everyday life. Here, it works through ${corePhrase} and ${mechanicPhrase}, reaching into ${impactPhrase}. A collapse leaves room for ${consequencePhrase}.`,
    ][variant];
  }

  if (anchoredConcept) {
    return [
      `${elementLabel} governs ${anchoredConcept.meaning}. In this world, ${corePhrase} and ${mechanicPhrase} make it central to ${impactPhrase}. If it breaks, ${consequencePhrase} follows.`,
      `${elementLabel} defines ${anchoredConcept.meaning}. Here, it relies on ${corePhrase} and ${mechanicPhrase}, which give it influence over ${impactPhrase}. Failure brings ${consequencePhrase}.`,
      `${elementLabel} controls ${anchoredConcept.meaning}. In practice, ${corePhrase} and ${mechanicPhrase} push it toward ${anchoredConcept.role}. When it fails, ${consequencePhrase} emerges.`,
    ][variant];
  }

  if (tone === "build") {
    return [
      `Here, the ${interpretation.type} behind ${elementLabel} is built around ${corePhrase}. It stays coherent through ${mechanicPhrase}, which pushes into ${impactPhrase}. If it breaks down, ${consequencePhrase} can follow.`,
      `Here, the ${interpretation.type} behind ${elementLabel} is built around ${corePhrase}. Its structure holds through ${mechanicPhrase}, giving it weight in ${impactPhrase}. When that order fails, ${consequencePhrase} follows.`,
      `Here, the ${interpretation.type} behind ${elementLabel} is built around ${corePhrase}. It gains stability from ${mechanicPhrase} and extends that influence into ${impactPhrase}. A collapse can open the way to ${consequencePhrase}.`,
    ][variant];
  }

  if (tone === "treat") {
    return [
      `Here, the ${interpretation.type} behind ${elementLabel} is something people must navigate. At its center is ${corePhrase}, and ${mechanicPhrase} carries its effects into ${impactPhrase}. Failure opens the door to ${consequencePhrase}.`,
      `Here, the ${interpretation.type} behind ${elementLabel} is something people must navigate. It keeps ${corePhrase} at its center, while ${mechanicPhrase} pushes its influence into ${impactPhrase}. If it frays, ${consequencePhrase} follows.`,
      `Here, the ${interpretation.type} behind ${elementLabel} is something people must respond to. It turns on ${corePhrase} and moves through ${mechanicPhrase}, reaching into ${impactPhrase}. A breakdown leaves room for ${consequencePhrase}.`,
    ][variant];
  }

  return [
    `Here, the ${interpretation.type} behind ${elementLabel} shapes ${functionLabel}. It is anchored by ${corePhrase}, and it runs through ${mechanicPhrase}. This affects ${impactPhrase} and can lead to ${consequencePhrase}.`,
    `Here, the ${interpretation.type} behind ${elementLabel} shapes ${functionLabel}. It stays active through ${mechanicPhrase} and gives it influence over ${impactPhrase}. If it fails, ${consequencePhrase} follows.`,
    `Here, the ${interpretation.type} behind ${elementLabel} turns ${functionLabel} into a visible system. It is organized around ${corePhrase} and stays in motion through ${mechanicPhrase}, reaching into ${impactPhrase}. A breakdown can bring ${consequencePhrase}.`,
  ][variant];
};

const buildWorldPrompt = ({
  title,
  description,
  core,
  mechanic,
  impact,
  consequence,
  tags,
}: {
  title: string;
  description: string;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
  tags: string[];
}) => {
  const structureLines = [
    `- Core: ${core}`,
    `- Mechanic: ${mechanic}`,
    `- Impact: ${impact}`,
    `- Consequence: ${consequence}`,
  ];

  return `${title}

${description}

${structureLines.join("\n")}

Tags: ${tags.join(" · ")}`;
};

export function generateWorldElementPrompt({
  category,
  element,
}: GenerateWorldElementPromptOptions = {}): GeneratedWorldElementPrompt {
  const normalizedCategory = normalizeWorldCategory(category);
  const normalizedElement = normalizeWorldElement(normalizedCategory, element);

  if (normalizedCategory === "custom") {
    const interpretation = interpretCustomWorldElement(normalizedElement);
    const seed = hashString(normalizedElement);
    const selectedTemplate = getSeeded(WORLD_TEMPLATES, seed, 0);
    const tone = getWorldPromptTone(selectedTemplate);
    const variant = getWorldPromptVariant(selectedTemplate);
    const frameSet = getCustomFrameSet(normalizedElement, interpretation);
    const rawCore = normalizePromptPhrase(fillTemplate(getSeeded(frameSet.core, seed, 1), interpretation));
    const rawMechanic = normalizePromptPhrase(getSeeded(frameSet.mechanic, seed, 2));
    const rawImpact = normalizePromptPhrase(getSeeded(frameSet.impact, seed, 3));
    const rawConsequence = normalizePromptPhrase(getSeeded(frameSet.consequence, seed, 4));
    const title = generateWorldTitle({ core: rawCore, element: normalizedElement });
    const description = buildWorldDescription({
      element: normalizedElement,
      interpretation,
      tone,
      variant,
      core: rawCore,
      mechanic: rawMechanic,
      impact: rawImpact,
      consequence: rawConsequence,
    });
    const tags = buildWorldTags({
      category: normalizedCategory,
      element: normalizedElement,
      interpretation,
      core: rawCore,
      mechanic: rawMechanic,
      impact: rawImpact,
      consequence: rawConsequence,
    });
    const core = buildCoreSentence(rawCore, tone, variant);
    const mechanic = buildMechanicSentence(rawMechanic, tone, variant);
    const impact = buildImpactSentence(rawImpact, tone, variant);
    const consequence = buildConsequenceSentence(rawConsequence, tone, variant);
    const prompt = buildWorldPrompt({
      title,
      description,
      core,
      mechanic,
      impact,
      consequence,
      tags,
    });

    if (usedWorldPrompts.has(prompt)) {
      usedWorldPrompts.clear();
    }

    usedWorldPrompts.add(prompt);

    return {
      prompt,
      title,
      description,
      category: normalizedCategory,
      element: normalizedElement,
      core,
      mechanic,
      impact,
      consequence,
      tags,
      interpretation,
      recycledPool: false,
      usedCount: usedWorldPrompts.size,
    };
  }

  const interpretation = interpretBuiltInWorldElement(normalizedCategory, normalizedElement);
  const promptBank = getWorldPromptBank(normalizedCategory, normalizedElement);
  let selectedTemplate = getRandom(promptBank.templates);
  let tone = getWorldPromptTone(selectedTemplate);
  let variant = getWorldPromptVariant(selectedTemplate);
  let rawCore = normalizePromptPhrase(getRandom(promptBank.cores));
  let rawMechanic = normalizePromptPhrase(getRandom(promptBank.mechanics));
  let rawImpact = normalizePromptPhrase(getRandom(promptBank.impacts));
  let rawConsequence = normalizePromptPhrase(getRandom(promptBank.consequences));
  let title = generateWorldTitle({ core: rawCore, element: normalizedElement });
  let description = buildWorldDescription({
    element: normalizedElement,
    interpretation,
    tone,
    variant,
    core: rawCore,
    mechanic: rawMechanic,
    impact: rawImpact,
    consequence: rawConsequence,
  });
  let tags = buildWorldTags({
    category: normalizedCategory,
    element: normalizedElement,
    interpretation,
    core: rawCore,
    mechanic: rawMechanic,
    impact: rawImpact,
    consequence: rawConsequence,
  });
  let core = buildCoreSentence(rawCore, tone, variant);
  let mechanic = buildMechanicSentence(rawMechanic, tone, variant);
  let impact = buildImpactSentence(rawImpact, tone, variant);
  let consequence = buildConsequenceSentence(rawConsequence, tone, variant);
  let prompt = buildWorldPrompt({
    title,
    description,
    core,
    mechanic,
    impact,
    consequence,
    tags,
  });
  let attempts = 0;
  let recycledPool = false;

  if (DEBUG_WORLD_ENGINE) {
    console.log("Generating world prompt...");
  }

  while (usedWorldPrompts.has(prompt) && attempts < MAX_WORLD_PROMPT_ATTEMPTS) {
    selectedTemplate = getRandom(promptBank.templates);
    tone = getWorldPromptTone(selectedTemplate);
    variant = getWorldPromptVariant(selectedTemplate);
    rawCore = normalizePromptPhrase(getRandom(promptBank.cores));
    rawMechanic = normalizePromptPhrase(getRandom(promptBank.mechanics));
    rawImpact = normalizePromptPhrase(getRandom(promptBank.impacts));
    rawConsequence = normalizePromptPhrase(getRandom(promptBank.consequences));
    title = generateWorldTitle({ core: rawCore, element: normalizedElement });
    description = buildWorldDescription({
      element: normalizedElement,
      interpretation,
      tone,
      variant,
      core: rawCore,
      mechanic: rawMechanic,
      impact: rawImpact,
      consequence: rawConsequence,
    });
    tags = buildWorldTags({
      category: normalizedCategory,
      element: normalizedElement,
      interpretation,
      core: rawCore,
      mechanic: rawMechanic,
      impact: rawImpact,
      consequence: rawConsequence,
    });
    core = buildCoreSentence(rawCore, tone, variant);
    mechanic = buildMechanicSentence(rawMechanic, tone, variant);
    impact = buildImpactSentence(rawImpact, tone, variant);
    consequence = buildConsequenceSentence(rawConsequence, tone, variant);
    prompt = buildWorldPrompt({
      title,
      description,
      core,
      mechanic,
      impact,
      consequence,
      tags,
    });
    attempts += 1;
  }

  if (usedWorldPrompts.has(prompt)) {
    usedWorldPrompts.clear();
    recycledPool = true;
  }

  usedWorldPrompts.add(prompt);

  if (DEBUG_WORLD_ENGINE) {
    console.log({ category: normalizedCategory, prompt });
  }

  return {
    prompt,
    title,
    description,
    category: normalizedCategory,
    element: normalizedElement,
    core,
    mechanic,
    impact,
    consequence,
    tags,
    interpretation,
    recycledPool,
    usedCount: usedWorldPrompts.size,
  };
}
