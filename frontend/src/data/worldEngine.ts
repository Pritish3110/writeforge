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
    .replace(/\{category\}/g, category || "world")
    .replace(/\{elementLabel\}/g, formatWorldElementLabel(element))
    .replace(/\{core\}/g, core)
    .replace(/\{mechanic\}/g, mechanic)
    .replace(/\{impact\}/g, impact)
    .replace(/\{consequence\}/g, consequence)} Focus the topic on ${formatWorldElementLabel(element)} within the ${formatWorldCategoryLabel(category).toLowerCase()} side of the world.`;

export function generateWorldElementPrompt({
  category,
  element,
}: GenerateWorldElementPromptOptions = {}): GeneratedWorldElementPrompt {
  const normalizedCategory = normalizeWorldCategory(category);
  const normalizedElement = normalizeWorldElement(normalizedCategory, element);
  const promptBank = getWorldPromptBank(normalizedCategory, normalizedElement);
  let template = getRandom(promptBank.templates);
  let core = getRandom(promptBank.cores);
  let mechanic = getRandom(promptBank.mechanics);
  let impact = getRandom(promptBank.impacts);
  let consequence = getRandom(promptBank.consequences);
  let prompt = buildWorldPrompt({
    category: normalizedCategory,
    element: normalizedElement,
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
    template = getRandom(promptBank.templates);
    core = getRandom(promptBank.cores);
    mechanic = getRandom(promptBank.mechanics);
    impact = getRandom(promptBank.impacts);
    consequence = getRandom(promptBank.consequences);
    prompt = buildWorldPrompt({
      category: normalizedCategory,
      element: normalizedElement,
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
    title: generateWorldTitle({ core, element: normalizedElement }),
    category: normalizedCategory,
    element: normalizedElement,
    core,
    mechanic,
    impact,
    consequence,
    recycledPool,
    usedCount: usedWorldPrompts.size,
  };
}
