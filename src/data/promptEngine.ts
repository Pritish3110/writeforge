import { WRITING_PROMPTS } from "@/data/tasks";

export type PromptTone = "dark" | "emotional" | "action" | "mystery";
export type StoryPhase = "Promise" | "Progress" | "Payoff";

export interface PromptCharacter {
  id: string;
  name: string;
  personalityTraits: string[];
  contradictions: string[];
}

type PromptCharacterInput = PromptCharacter | string | null | undefined;

export interface GenerateSmartPromptOptions {
  tone?: PromptTone | null;
  character?: PromptCharacterInput;
  phase?: StoryPhase | string | null;
}

export interface GeneratedPromptResult {
  prompt: string;
  title: string;
  tone: PromptTone;
  phase: StoryPhase;
  characterLabel: string;
  tags: string[];
  usedCount: number;
  recycledPool: boolean;
  source: "combinator" | "fallback";
}

export const PROMPT_TONES: PromptTone[] = ["dark", "emotional", "action", "mystery"];
export const STORY_PHASES: StoryPhase[] = ["Promise", "Progress", "Payoff"];

export const PROMPT_TEMPLATES = [
  "{character} discovers {conflict} in {location}, forcing them to confront {twist} during the {phase} phase.",
  "While in {location}, {character} realizes {conflict}, but {twist} changes everything in the {phase} phase.",
  "{character} is pushed into {conflict} when they arrive at {location}, unaware that {twist}.",
  "During the {phase} phase, {character} must face {conflict} inside {location}, where {twist}.",
  "{character} enters {location} expecting safety, but instead finds {conflict}, complicated by {twist}.",
  "A quiet moment in {location} turns into {conflict} for {character}, especially when {twist}.",
  "{character} tries to escape {conflict} but is trapped within {location}, where {twist}.",
  "In {location}, {character} encounters {conflict}, leading to a realization that {twist}.",
  "{character} believes they understand {conflict}, but in {location}, {twist} proves them wrong.",
  "A decision made by {character} in {location} triggers {conflict}, escalating when {twist}.",
  "{character} is forced to choose between two paths in {location}, both tied to {conflict}, while {twist}.",
  "{character} uncovers {conflict} hidden deep within {location}, only to learn that {twist}.",
  "While dealing with {conflict}, {character} returns to {location}, where {twist}.",
  "{character} attempts to suppress {conflict}, but {location} reveals that {twist}.",
  "In the heart of {location}, {character} must survive {conflict}, as {twist}.",
  "{character} witnesses {conflict} unfolding in {location}, realizing too late that {twist}.",
  "{character} enters {location} with a goal, but encounters {conflict}, complicated by {twist}.",
  "A hidden truth about {conflict} emerges in {location}, where {character} learns that {twist}.",
  "{character} is confronted with {conflict} in {location}, leading to a moment where {twist}.",
  "{character} revisits {location}, only to face {conflict} again, this time with {twist}.",
  "An unexpected event in {location} forces {character} into {conflict}, especially when {twist}.",
  "{character} struggles with {conflict} while navigating {location}, unaware that {twist}.",
  "{character} finds themselves in {location}, where {conflict} becomes unavoidable and {twist}.",
  "During {phase}, {character} must resolve {conflict} in {location}, before {twist}.",
  "{character} tries to change the outcome of {conflict} in {location}, but {twist} makes it worse.",
] as const;

export const CONFLICTS = [
  "a truth they cannot accept",
  "a betrayal from someone they trust",
  "a decision that could destroy everything",
  "a past they tried to forget resurfacing",
  "an internal battle they are losing",
  "a growing corruption inside them",
  "a promise they cannot keep",
  "a moral choice with no right answer",
  "a secret that could ruin their future",
  "a fear they can no longer ignore",
  "an enemy who knows their weakness",
  "a responsibility they never wanted",
  "a realization that changes their identity",
  "a bond that is slowly breaking",
  "a sacrifice that must be made",
  "a lie they have been living",
  "a hidden truth about themselves",
  "a moment of irreversible change",
  "a consequence of their past actions",
  "a test of their true nature",
] as const;

export const LOCATIONS = [
  "an abandoned temple",
  "a war-torn battlefield",
  "a silent forest at night",
  "a ruined city",
  "a forgotten underground chamber",
  "a burning village",
  "a frozen wasteland",
  "a hidden sanctuary",
  "a cursed ruin",
  "a crowded marketplace",
  "a collapsing structure",
  "a sacred ground",
  "a battlefield after the war",
  "a dimly lit corridor",
  "a forbidden library",
  "a shattered kingdom",
  "a storm-ravaged coastline",
  "a place from their childhood",
  "an unfamiliar world",
  "a dreamlike illusion space",
] as const;

export const TWISTS = [
  "they were responsible all along",
  "someone close to them caused it",
  "it was all a lie",
  "they cannot trust their own memories",
  "the enemy was protecting them",
  "they are becoming what they feared",
  "the truth was hidden inside them",
  "they made the wrong choice before",
  "someone they trusted betrays them",
  "the situation is not real",
  "they are not who they think they are",
  "everything repeats in a loop",
  "their actions caused the current disaster",
  "they lose control at the worst moment",
  "someone sacrifices themselves unexpectedly",
  "the past and present collide",
  "they are being manipulated",
  "their goal was flawed from the start",
  "they must choose who to save",
  "they realize it is too late",
] as const;

const MAX_USED_PROMPTS = 100;
const usedPrompts = new Set<string>();

const TONE_GUIDANCE: Record<PromptTone, string[]> = {
  dark: [
    "Keep the tone dark, psychologically tense, and quietly unsettling.",
    "Lean into dread, moral pressure, and the sense that something inside the scene is rotting.",
    "Write it with a heavy atmosphere and a feeling of irreversible damage approaching.",
  ],
  emotional: [
    "Keep the tone emotionally raw, intimate, and character-first.",
    "Let the scene focus on vulnerability, connection, and what the characters struggle to say directly.",
    "Write it with tenderness, tension, and emotional precision.",
  ],
  action: [
    "Keep the tone urgent, kinetic, and physically immediate.",
    "Write with momentum, pressure, and choices that have to be made in motion.",
    "Let the scene feel fast, dangerous, and full of visible consequence.",
  ],
  mystery: [
    "Keep the tone curious, tense, and layered with suspicion.",
    "Write it so every detail feels like it might mean more than it first appears.",
    "Let uncertainty, discovery, and hidden intent drive the scene forward.",
  ],
};

const PHASE_GUIDANCE: Record<StoryPhase, string[]> = {
  Promise: [
    "Use this scene to introduce the central pressure and hint at what the story will demand later.",
    "Make it feel like the first meaningful step into the story's deeper conflict.",
    "Let the scene plant expectations, danger, or emotional stakes that can pay off later.",
  ],
  Progress: [
    "Use this scene to escalate the problem and make the character's options harder.",
    "Let the conflict deepen and show how the situation is becoming more expensive to ignore.",
    "Make the scene feel like momentum, complication, and tightening pressure.",
  ],
  Payoff: [
    "Use this scene to force consequence, revelation, or emotional resolution.",
    "Let the scene pay off earlier tension with a choice that feels earned and defining.",
    "Make the moment feel decisive, irreversible, and emotionally loaded.",
  ],
};

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const SMALL_TITLE_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

export function getRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function capitalize(str: string): string {
  const trimmed = str.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
}

const stripLeadingArticle = (value: string): string => value.replace(/^(a|an|the)\s+/i, "").trim();

const toTitleCase = (value: string): string => {
  const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return words
    .map((word, index) => {
      if (index > 0 && index < words.length - 1 && SMALL_TITLE_WORDS.has(word)) return word;
      return capitalize(word);
    })
    .join(" ");
};

const normalizeTone = (tone?: PromptTone | null): PromptTone =>
  tone && PROMPT_TONES.includes(tone) ? tone : "dark";

const normalizePhase = (phase?: StoryPhase | string | null): StoryPhase => {
  const normalized = toText(phase).trim().toLowerCase();

  if (normalized === "promise") return "Promise";
  if (normalized === "payoff") return "Payoff";
  return "Progress";
};

const getCharacterPromptName = (character?: PromptCharacterInput): string => {
  if (typeof character === "string") return character.trim() || "A character";
  return character?.name.trim() ? character.name.trim() : "A character";
};

const getCharacterLabel = (character?: PromptCharacterInput): string => {
  if (typeof character === "string") return character.trim() || "Unknown Character";
  return character?.name.trim() ? character.name.trim() : "Unknown Character";
};

const getNamedCharacter = (character?: PromptCharacterInput): string => {
  const label = getCharacterLabel(character);
  if (!label || label === "Unknown Character") return "";
  return label;
};

const buildCharacterNote = (character: PromptCharacterInput, tone: PromptTone): string => {
  if (!character || typeof character === "string") return "";

  const contradiction = getRandom(character.contradictions || []);
  if (contradiction) {
    if (tone === "dark") return `${character.name}'s contradiction between ${contradiction} should make the scene feel more unstable.`;
    if (tone === "emotional") return `Let ${character.name}'s contradiction between ${contradiction} influence what they hide and what they reveal.`;
    if (tone === "action") return `Let ${character.name}'s contradiction between ${contradiction} shape how they move under pressure.`;
    return `Let ${character.name}'s contradiction between ${contradiction} affect what they notice, suspect, or misread.`;
  }

  const trait = getRandom(character.personalityTraits || []);
  if (trait) {
    if (tone === "dark") return `Use ${character.name}'s trait "${trait}" to sharpen the danger or psychological unease.`;
    if (tone === "emotional") return `Use ${character.name}'s trait "${trait}" to influence the emotional texture of the scene.`;
    if (tone === "action") return `Use ${character.name}'s trait "${trait}" to affect how they react when the pressure spikes.`;
    return `Use ${character.name}'s trait "${trait}" to shape how they interpret the scene's hidden truth.`;
  }

  return "";
};

const replacePlaceholders = (template: string, replacements: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, token) => replacements[token] || "");

const polishPrompt = (value: string): string =>
  value.replace(/\s+/g, " ").replace(/\s([,.;!?])/g, "$1").trim();

const getFallbackPrompt = (character: PromptCharacterInput, phase: StoryPhase, tone: PromptTone): string => {
  const basePrompt = getRandom(WRITING_PROMPTS);
  return polishPrompt(`${basePrompt} Keep the tone ${tone}. Treat this as a ${phase.toLowerCase()} phase scene for ${getCharacterPromptName(character)}.`);
};

const getFallbackTitle = (character: PromptCharacterInput, phase: StoryPhase): string => {
  const namedCharacter = getNamedCharacter(character);
  if (namedCharacter) return `${namedCharacter} in ${phase}`;
  return `The ${phase} Scene`;
};

export function generateTitle({
  character,
  conflict,
  location,
}: {
  character?: PromptCharacterInput;
  conflict: string;
  location: string;
}): string {
  const namedCharacter = getNamedCharacter(character);
  const rawConflict = conflict.trim();
  const rawLocation = location.trim();
  const dramaticConflict = toTitleCase(stripLeadingArticle(rawConflict) || rawConflict);
  const formats = [
    toTitleCase(`${rawConflict} in ${rawLocation}`),
    `The ${dramaticConflict}`,
    toTitleCase(`${rawLocation}: ${rawConflict}`),
  ];

  if (namedCharacter) {
    formats.push(`${namedCharacter} and the ${dramaticConflict}`);
  }

  return getRandom(formats);
}

export const normalizePromptCharacter = (value: unknown, fallbackIndex: number): PromptCharacter => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const personalityTraits = Array.isArray(record.personality_traits)
    ? record.personality_traits
        .map((trait) => {
          const traitRecord = trait && typeof trait === "object" ? (trait as Record<string, unknown>) : {};
          return toText(traitRecord.title);
        })
        .filter(Boolean)
    : [];
  const contradictions = Array.isArray(record.contradictions)
    ? record.contradictions
        .map((contradiction) => {
          const contradictionRecord =
            contradiction && typeof contradiction === "object" ? (contradiction as Record<string, unknown>) : {};
          const left = toText(contradictionRecord.left).trim();
          const right = toText(contradictionRecord.right).trim();
          const description = toText(contradictionRecord.description).trim();

          if (left && right) return `${left} and ${right}`;
          if (description) return description;
          return "";
        })
        .filter(Boolean)
    : [];

  return {
    id: toText(record.id) || `prompt-character-${fallbackIndex + 1}`,
    name: toText(record.name).trim() || `Character ${fallbackIndex + 1}`,
    personalityTraits: unique(personalityTraits),
    contradictions: unique(contradictions),
  };
};

export const syncPromptCharacters = (value: unknown): PromptCharacter[] =>
  Array.isArray(value) ? value.map((character, index) => normalizePromptCharacter(character, index)) : [];

export const resetUsedPrompts = () => {
  usedPrompts.clear();
};

export const getUsedPromptCount = () => usedPrompts.size;

export function generateSmartPrompt({ tone, character, phase }: GenerateSmartPromptOptions): GeneratedPromptResult {
  const resolvedTone = normalizeTone(tone);
  const resolvedPhase = normalizePhase(phase);
  const characterName = getCharacterPromptName(character);
  const characterNote = buildCharacterNote(character, resolvedTone);

  if (PROMPT_TEMPLATES.length === 0 || CONFLICTS.length === 0 || LOCATIONS.length === 0 || TWISTS.length === 0) {
    const fallbackPrompt = getFallbackPrompt(character, resolvedPhase, resolvedTone);
    usedPrompts.add(fallbackPrompt);

    return {
      prompt: fallbackPrompt,
      title: getFallbackTitle(character, resolvedPhase),
      tone: resolvedTone,
      phase: resolvedPhase,
      characterLabel: getCharacterLabel(character),
      tags: ["fallback", "legacy"],
      usedCount: usedPrompts.size,
      recycledPool: false,
      source: "fallback",
    };
  }

  let nextPrompt = "";
  let nextTitle = "";
  let attempts = 0;

  while (attempts < 40) {
    const template = getRandom(PROMPT_TEMPLATES);
    const conflict = getRandom(CONFLICTS);
    const location = getRandom(LOCATIONS);
    const twist = getRandom(TWISTS);
    const toneGuidance = getRandom(TONE_GUIDANCE[resolvedTone]);
    const phaseGuidance = getRandom(PHASE_GUIDANCE[resolvedPhase]);

    nextPrompt = polishPrompt(
      [
        replacePlaceholders(template, {
          character: characterName,
          phase: resolvedPhase.toLowerCase(),
          conflict,
          location,
          twist,
        }),
        toneGuidance,
        phaseGuidance,
        characterNote,
      ]
        .filter(Boolean)
        .join(" "),
    );
    nextTitle = generateTitle({
      character,
      conflict,
      location,
    });

    if (!usedPrompts.has(nextPrompt)) break;
    attempts += 1;
  }

  if (!nextPrompt || usedPrompts.has(nextPrompt)) {
    resetUsedPrompts();
    const conflict = getRandom(CONFLICTS);
    const location = getRandom(LOCATIONS);
    const twist = getRandom(TWISTS);
    nextPrompt = polishPrompt(
      `${replacePlaceholders(getRandom(PROMPT_TEMPLATES), {
        character: characterName,
        phase: resolvedPhase.toLowerCase(),
        conflict,
        location,
        twist,
      })} ${getRandom(TONE_GUIDANCE[resolvedTone])} ${getRandom(PHASE_GUIDANCE[resolvedPhase])} ${characterNote}`,
    );
    nextTitle = generateTitle({
      character,
      conflict,
      location,
    });
  }

  usedPrompts.add(nextPrompt);

  let recycledPool = false;
  if (usedPrompts.size > MAX_USED_PROMPTS) {
    usedPrompts.clear();
    usedPrompts.add(nextPrompt);
    recycledPool = true;
  }

  return {
    prompt: nextPrompt,
    title: nextTitle || getFallbackTitle(character, resolvedPhase),
    tone: resolvedTone,
    phase: resolvedPhase,
    characterLabel: getCharacterLabel(character),
    tags: ["combinator", "no-repeat"],
    usedCount: usedPrompts.size,
    recycledPool,
    source: "combinator",
  };
}
