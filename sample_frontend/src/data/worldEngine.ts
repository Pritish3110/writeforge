export type WorldCategory = "physical" | "cultural" | "magic";

export interface GenerateWorldElementPromptOptions {
  category?: WorldCategory | string | null;
}

export interface GeneratedWorldElementPrompt {
  prompt: string;
  title: string;
  category: WorldCategory;
  element: string;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
  recycledPool: boolean;
  usedCount: number;
}

export const WORLD_CATEGORIES: WorldCategory[] = ["physical", "cultural", "magic"];

export const WORLD_CATEGORY_LABELS: Record<WorldCategory, string> = {
  physical: "Physical",
  cultural: "Cultural",
  magic: "Magic",
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
  ],
};

export const WORLD_TEMPLATES = [
  "Design a system where {core} functions through {mechanic}, creating {impact} but causing {consequence}.",
  "In a world where {core} is defined by {mechanic}, society experiences {impact}, leading to {consequence}.",
  "Create a {category} element where {core} operates via {mechanic}, affecting {impact} and resulting in {consequence}.",
  "Build a system in which {core} depends on {mechanic}, shaping {impact} while introducing {consequence}.",
  "Imagine a world where {core} evolves through {mechanic}, influencing {impact} but at the cost of {consequence}.",
  "Develop a structure where {core} is controlled by {mechanic}, impacting {impact} and producing {consequence}.",
  "Construct a {category} phenomenon where {core} emerges from {mechanic}, creating {impact} and triggering {consequence}.",
  "Design a world element in which {core} is sustained by {mechanic}, altering {impact} and leading to {consequence}.",
  "What if {core} existed because of {mechanic}, changing {impact} and forcing {consequence}?",
  "Create a system where {core} is limited by {mechanic}, influencing {impact} and resulting in {consequence}.",
  "In this world, {core} interacts with {mechanic}, producing {impact} but also {consequence}.",
  "Design a dynamic where {core} relies on {mechanic}, shaping {impact} and creating {consequence}.",
  "Build a concept where {core} evolves under {mechanic}, affecting {impact} while causing {consequence}.",
  "Imagine {core} as a result of {mechanic}, influencing {impact} and resulting in {consequence}.",
  "Develop a world where {core} is unstable due to {mechanic}, leading to {impact} and {consequence}.",
  "Create a system where {core} spreads through {mechanic}, shaping {impact} but risking {consequence}.",
  "Design a world element where {core} emerges from {mechanic}, creating {impact} but also {consequence}.",
  "Construct a structure where {core} is governed by {mechanic}, affecting {impact} and leading to {consequence}.",
  "What happens when {core} is controlled by {mechanic}, influencing {impact} and producing {consequence}?",
  "Create a setting where {core} depends entirely on {mechanic}, shaping {impact} and triggering {consequence}.",
  "Design a system in which {core} adapts through {mechanic}, impacting {impact} but causing {consequence}.",
  "Build a world element where {core} is enforced by {mechanic}, shaping {impact} and leading to {consequence}.",
  "Develop a phenomenon where {core} grows through {mechanic}, influencing {impact} but resulting in {consequence}.",
  "Create a system where {core} is inherited via {mechanic}, affecting {impact} and causing {consequence}.",
  "Design a world element where {core} collapses due to {mechanic}, reshaping {impact} and creating {consequence}.",
] as const;

const WORLD_PROMPT_COMPONENTS: Record<
  WorldCategory,
  {
    cores: readonly string[];
    mechanics: readonly string[];
    impacts: readonly string[];
    consequences: readonly string[];
  }
> = {
  physical: {
    cores: [
      "weather fronts",
      "tectonic fault lines",
      "migratory fauna",
      "forest canopies",
      "river deltas",
      "tidal systems",
      "mountain passes",
      "desert ecology",
      "glacial shelves",
      "atmospheric visibility",
    ],
    mechanics: [
      "seasonal pressure shifts",
      "erosion cycles",
      "ocean-current feedback",
      "geothermal pressure",
      "predator-prey balance",
      "wind corridors",
      "lunar pull",
      "mineral runoff",
      "biotic symbiosis",
      "storm accumulation",
    ],
    impacts: [
      "travel routes",
      "settlement safety",
      "food supply",
      "resource harvesting",
      "border defense",
      "navigation",
      "agriculture",
      "seasonal migration",
      "architecture",
      "trade access",
    ],
    consequences: [
      "flooding",
      "crop failure",
      "habitat collapse",
      "erosion damage",
      "resource scarcity",
      "terrain fractures",
      "storm saturation",
      "navigation loss",
      "ecological imbalance",
      "regional isolation",
    ],
  },
  cultural: {
    cores: [
      "ancestor worship",
      "market guilds",
      "border rituals",
      "harvest cuisine",
      "court fashion",
      "marriage customs",
      "rank inheritance",
      "military oaths",
      "dialect drift",
      "forbidden festivals",
    ],
    mechanics: [
      "ritual repetition",
      "public shame",
      "trade dependency",
      "oral tradition",
      "clan enforcement",
      "ceremonial exchange",
      "state propaganda",
      "generational duty",
      "legal precedent",
      "social performance",
    ],
    impacts: [
      "family structure",
      "political legitimacy",
      "class mobility",
      "community trust",
      "religious identity",
      "food security",
      "diplomatic relations",
      "military loyalty",
      "language preservation",
      "social belonging",
    ],
    consequences: [
      "social unrest",
      "cultural erosion",
      "class resentment",
      "identity fracture",
      "ritual stagnation",
      "black-market power",
      "border violence",
      "institutional hypocrisy",
      "generational conflict",
      "public distrust",
    ],
  },
  magic: {
    cores: [
      "ley-line flow",
      "spell lattice design",
      "artifact binding",
      "ritual circles",
      "mana inheritance",
      "corruption bloom",
      "ward networks",
      "soul-fueled casting",
      "anti-magic fields",
      "summoning contracts",
    ],
    mechanics: [
      "magical resonance",
      "bloodline attunement",
      "energy siphoning",
      "ritual activation",
      "memory-linked casting",
      "sacrifice exchange",
      "cosmic alignment",
      "stored charge decay",
      "sympathetic links",
      "runic stabilization",
    ],
    impacts: [
      "combat doctrine",
      "healing access",
      "social status",
      "institutional control",
      "territorial power",
      "education systems",
      "religious authority",
      "daily labor",
      "border security",
      "resource control",
    ],
    consequences: [
      "corruption spread",
      "spell burnout",
      "artifact failure",
      "runaway mutations",
      "soul damage",
      "power monopolies",
      "ritual collapse",
      "mana drought",
      "summoning breaches",
      "loss of control",
    ],
  },
};

export const CORES = Object.values(WORLD_PROMPT_COMPONENTS).flatMap(
  (group) => group.cores,
);
export const MECHANICS = Object.values(WORLD_PROMPT_COMPONENTS).flatMap(
  (group) => group.mechanics,
);
export const IMPACTS = Object.values(WORLD_PROMPT_COMPONENTS).flatMap(
  (group) => group.impacts,
);
export const CONSEQUENCES = Object.values(WORLD_PROMPT_COMPONENTS).flatMap(
  (group) => group.consequences,
);

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

export function capitalize(str: string): string {
  const trimmed = str.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

export const formatWorldCategoryLabel = (category: WorldCategory): string =>
  WORLD_CATEGORY_LABELS[category];

export const normalizeWorldCategory = (value?: WorldCategory | string | null): WorldCategory => {
  if (value === "physical" || value === "cultural" || value === "magic") return value;
  return "physical";
};

export const getWorldElementsForCategory = (category: WorldCategory): string[] =>
  WORLD_ELEMENT_OPTIONS[category];

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

export const getRandomWorldSelection = (category?: WorldCategory | string | null) => {
  const nextCategory = category ? normalizeWorldCategory(category) : getRandom(WORLD_CATEGORIES);
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
  const formats = [
    `${formattedElement}: ${capitalize(core)}`,
    `The ${formattedElement} of ${capitalize(core)}`,
    `${capitalize(core)} ${formattedElement}`,
    `${formattedElement} and ${capitalize(core)}`,
  ];

  return formats[Math.floor(Math.random() * formats.length)];
}

const buildWorldPrompt = ({
  category,
  element,
  template,
  core,
  mechanic,
  impact,
  consequence,
}: {
  category: WorldCategory;
  element: string;
  template: string;
  core: string;
  mechanic: string;
  impact: string;
  consequence: string;
}) =>
  `${template
    .replace("{category}", category || "world")
    .replace("{core}", core)
    .replace("{mechanic}", mechanic)
    .replace("{impact}", impact)
    .replace("{consequence}", consequence)} Focus the topic on ${formatWorldElementLabel(element)} within the ${formatWorldCategoryLabel(category).toLowerCase()} side of the world.`;

export function generateWorldElementPrompt({
  category,
}: GenerateWorldElementPromptOptions = {}): GeneratedWorldElementPrompt {
  const normalizedCategory = normalizeWorldCategory(category);
  const element = getRandom(getWorldElementsForCategory(normalizedCategory));
  const promptComponents = WORLD_PROMPT_COMPONENTS[normalizedCategory];
  let template = getRandom(WORLD_TEMPLATES);
  let core = getRandom(promptComponents.cores);
  let mechanic = getRandom(promptComponents.mechanics);
  let impact = getRandom(promptComponents.impacts);
  let consequence = getRandom(promptComponents.consequences);
  let prompt = buildWorldPrompt({
    category: normalizedCategory,
    element,
    template,
    core,
    mechanic,
    impact,
    consequence,
  });
  let attempts = 0;
  let recycledPool = false;

  if (DEBUG_WORLD_ENGINE) {
    console.log("Generating world prompt...");
  }

  while (usedWorldPrompts.has(prompt) && attempts < MAX_WORLD_PROMPT_ATTEMPTS) {
    template = getRandom(WORLD_TEMPLATES);
    core = getRandom(promptComponents.cores);
    mechanic = getRandom(promptComponents.mechanics);
    impact = getRandom(promptComponents.impacts);
    consequence = getRandom(promptComponents.consequences);
    prompt = buildWorldPrompt({
      category: normalizedCategory,
      element,
      template,
      core,
      mechanic,
      impact,
      consequence,
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
    title: generateWorldTitle({ core, element }),
    category: normalizedCategory,
    element,
    core,
    mechanic,
    impact,
    consequence,
    recycledPool,
    usedCount: usedWorldPrompts.size,
  };
}
