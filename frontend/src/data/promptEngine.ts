import {
  PROMPT_CHOICES,
  PROMPT_CONFLICTS,
  PROMPT_EMOTIONS,
  PROMPT_LIBRARY,
  PROMPT_LOCATIONS,
  PROMPT_STAKES,
  PROMPT_TONES as TASK_PROMPT_TONES,
  PROMPT_TWISTS,
  STORY_PHASES as TASK_STORY_PHASES,
  WRITING_PROMPTS,
  type PromptTone,
  type StoryPhase,
} from "@/data/tasks";
import { sortCharactersByPriority } from "@/lib/characterPriority";

export type { PromptTone, StoryPhase };

export interface PromptCharacter {
  id: string;
  name: string;
  type: string;
  pinned: boolean;
  personalityTraits: string[];
  contradictions: string[];
}

type PromptCharacterInput = PromptCharacter | string | null | undefined;

export interface GenerateSmartPromptOptions {
  basePrompt?: string | null;
  tone?: PromptTone | "Any" | null;
  character?: PromptCharacterInput;
  phase?: StoryPhase | "Any" | string | null;
  avoidRepeat?: boolean;
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

export const PROMPT_TONES = TASK_PROMPT_TONES;
export const STORY_PHASES = TASK_STORY_PHASES;

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
  romantic: [
    "Keep the tone intimate, charged, and attentive to longing as much as dialogue.",
    "Let attraction, restraint, and emotional risk shape the rhythm of the scene.",
    "Write with chemistry, vulnerability, and the sense that one honest line could change everything.",
  ],
  horror: [
    "Keep the tone claustrophobic, uncanny, and increasingly hard to dismiss.",
    "Let the terror feel sensory, immediate, and just a little ahead of the character's understanding.",
    "Write with escalating dread and the sense that safety has already been compromised.",
  ],
  hopeful: [
    "Keep the tone resilient, tender, and grounded in earned possibility.",
    "Let the scene acknowledge pain without surrendering the future to it.",
    "Write with quiet courage, small proof of change, and forward motion that feels real.",
  ],
  comedic: [
    "Keep the tone bright, sharp, and driven by escalating awkwardness.",
    "Let timing, reversal, and character-specific embarrassment carry the momentum.",
    "Write it so the chaos stays playful even while the stakes keep getting funnier and messier.",
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

const normalizeTone = (tone?: PromptTone | "Any" | null): PromptTone => {
  if (tone && PROMPT_TONES.includes(tone as PromptTone)) return tone as PromptTone;
  return getRandom(PROMPT_TONES);
};

const normalizePhase = (phase?: StoryPhase | "Any" | string | null): StoryPhase => {
  const normalized = toText(phase).trim().toLowerCase();

  if (normalized === "promise") return "Promise";
  if (normalized === "payoff") return "Payoff";
  if (normalized === "progress") return "Progress";
  return getRandom(STORY_PHASES);
};

const normalizePromptCharacterInput = (character?: PromptCharacterInput): PromptCharacterInput => {
  if (typeof character !== "string") return character;
  return character.trim().toLowerCase() === "any" ? null : character;
};

const TONE_TRAIT_HINT_FALLBACKS: Record<PromptTone, string> = {
  dark: "their usual defenses are starting to crack",
  emotional: "their restraint is working against what they most need to say",
  action: "their body is reacting before they can think it through",
  mystery: "their instincts keep noticing what the room wants hidden",
  romantic: "they want more from the moment than they are willing to admit",
  horror: "their nerves are telling them the threat is already too close",
  hopeful: "they are more ready for repair than they expected",
  comedic: "their need to look composed is making everything worse",
};

const TONE_INNER_PRESSURE_FALLBACKS: Record<PromptTone, string> = {
  dark: "their own worst instinct keeps sounding reasonable",
  emotional: "what they feel is larger than what they can say cleanly",
  action: "they cannot afford a still moment to think",
  mystery: "every answer creates a second, more dangerous question",
  romantic: "desire and self-protection keep pulling them in opposite directions",
  horror: "their fear is making every next choice less reliable",
  hopeful: "they are frightened by how much they want this to work",
  comedic: "every attempt to recover their dignity only escalates the mess",
};

const ensureSentence = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const enhanceBasePrompt = ({
  basePrompt,
  generatedPrompt,
}: {
  basePrompt: string;
  generatedPrompt: string;
}) =>
  polishPrompt(
    [
      ensureSentence(basePrompt),
      generatedPrompt,
      "Keep the original exercise goal at the center of the scene and use the added pressure to sharpen the writing task.",
    ]
      .filter(Boolean)
      .join(" "),
  );

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

const buildTraitHint = (character: PromptCharacterInput, tone: PromptTone): string => {
  if (!character || typeof character === "string") return TONE_TRAIT_HINT_FALLBACKS[tone];

  const trait = getRandom(character.personalityTraits || []);
  if (!trait) return TONE_TRAIT_HINT_FALLBACKS[tone];

  switch (tone) {
    case "dark":
      return `their "${trait}" instinct keeps tilting the scene toward danger`;
    case "emotional":
      return `their "${trait}" nature affects what they can bear to say aloud`;
    case "action":
      return `their "${trait}" streak changes how they react under live pressure`;
    case "mystery":
      return `their "${trait}" nature shapes what they notice first`;
    case "romantic":
      return `their "${trait}" side changes how attraction leaks through restraint`;
    case "horror":
      return `their "${trait}" instinct keeps colliding with survival panic`;
    case "hopeful":
      return `their "${trait}" side makes every act of trust feel more specific`;
    case "comedic":
      return `their "${trait}" streak keeps sabotaging their attempt to stay cool`;
  }

  return TONE_TRAIT_HINT_FALLBACKS[tone];
};

const buildInnerPressure = (character: PromptCharacterInput, tone: PromptTone): string => {
  if (!character || typeof character === "string") return TONE_INNER_PRESSURE_FALLBACKS[tone];

  const contradiction = getRandom(character.contradictions || []);
  if (!contradiction) return TONE_INNER_PRESSURE_FALLBACKS[tone];

  switch (tone) {
    case "dark":
      return `their contradiction between ${contradiction} keeps pushing them toward the worst possible reading`;
    case "emotional":
      return `their contradiction between ${contradiction} makes honesty feel both necessary and dangerous`;
    case "action":
      return `their contradiction between ${contradiction} makes every split-second move more complicated`;
    case "mystery":
      return `their contradiction between ${contradiction} shapes what they suspect and what they miss`;
    case "romantic":
      return `their contradiction between ${contradiction} turns every intimate beat into risk`;
    case "horror":
      return `their contradiction between ${contradiction} makes the fear feel personal, not just external`;
    case "hopeful":
      return `their contradiction between ${contradiction} keeps testing whether they can believe in change`;
    case "comedic":
      return `their contradiction between ${contradiction} keeps wrecking their timing in exactly the wrong way`;
  }

  return TONE_INNER_PRESSURE_FALLBACKS[tone];
};

const buildCharacterNote = (character: PromptCharacterInput, tone: PromptTone): string => {
  if (!character || typeof character === "string") return "";

  const contradiction = getRandom(character.contradictions || []);
  if (contradiction) {
    switch (tone) {
      case "dark":
        return `${character.name}'s contradiction between ${contradiction} should make the scene feel more unstable.`;
      case "emotional":
        return `Let ${character.name}'s contradiction between ${contradiction} influence what they hide and what they reveal.`;
      case "action":
        return `Let ${character.name}'s contradiction between ${contradiction} shape how they move under pressure.`;
      case "mystery":
        return `Let ${character.name}'s contradiction between ${contradiction} affect what they notice, suspect, or misread.`;
      case "romantic":
        return `Let ${character.name}'s contradiction between ${contradiction} shape what they dare to admit or leave unsaid.`;
      case "horror":
        return `Let ${character.name}'s contradiction between ${contradiction} blur the line between fear, instinct, and perception.`;
      case "hopeful":
        return `Let ${character.name}'s contradiction between ${contradiction} reveal what future they still want badly enough to fight for.`;
      case "comedic":
        return `Let ${character.name}'s contradiction between ${contradiction} wreck their timing in ways that make the scene sharper and funnier.`;
    }

    return "";
  }

  const trait = getRandom(character.personalityTraits || []);
  if (trait) {
    switch (tone) {
      case "dark":
        return `Use ${character.name}'s trait "${trait}" to sharpen the danger or psychological unease.`;
      case "emotional":
        return `Use ${character.name}'s trait "${trait}" to influence the emotional texture of the scene.`;
      case "action":
        return `Use ${character.name}'s trait "${trait}" to affect how they react when the pressure spikes.`;
      case "mystery":
        return `Use ${character.name}'s trait "${trait}" to shape how they interpret the scene's hidden truth.`;
      case "romantic":
        return `Use ${character.name}'s trait "${trait}" to shape the chemistry, hesitation, and vulnerability in the scene.`;
      case "horror":
        return `Use ${character.name}'s trait "${trait}" to sharpen the survival instinct and uncanny unease.`;
      case "hopeful":
        return `Use ${character.name}'s trait "${trait}" to make trust, repair, or courage feel earned.`;
      case "comedic":
        return `Use ${character.name}'s trait "${trait}" to shape the timing, awkwardness, or escalation.`;
    }

    return "";
  }

  return "";
};

const replacePlaceholders = (template: string, replacements: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (_, token) => replacements[token] || "");

const polishPrompt = (value: string): string =>
  value.replace(/\s+/g, " ").replace(/\s([,.;!?])/g, "$1").trim();

const buildPromptFromSelection = ({
  template,
  tone,
  phase,
  character,
  characterName,
  characterNote,
  basePrompt,
  conflict,
  location,
  twist,
}: {
  template: string;
  tone: PromptTone;
  phase: StoryPhase;
  character: PromptCharacterInput;
  characterName: string;
  characterNote: string;
  basePrompt: string;
  conflict: string;
  location: string;
  twist: string;
}) => {
  const generatedPrompt = polishPrompt(
    [
      replacePlaceholders(template, {
        character: characterName,
        phase: phase.toLowerCase(),
        conflict,
        location,
        twist,
        emotion: getRandom(PROMPT_EMOTIONS[tone]),
        stakes: getRandom(PROMPT_STAKES[tone]),
        choice: getRandom(PROMPT_CHOICES[tone]),
        traitHint: buildTraitHint(character, tone),
        innerPressure: buildInnerPressure(character, tone),
      }),
      getRandom(TONE_GUIDANCE[tone]),
      getRandom(PHASE_GUIDANCE[phase]),
      characterNote,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return basePrompt
    ? enhanceBasePrompt({
        basePrompt,
        generatedPrompt,
      })
    : generatedPrompt;
};

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
    type: toText(record.type),
    pinned: record.pinned === true,
    personalityTraits: unique(personalityTraits),
    contradictions: unique(contradictions),
  };
};

export const syncPromptCharacters = (value: unknown): PromptCharacter[] =>
  Array.isArray(value)
    ? sortCharactersByPriority(
        value.map((character, index) => normalizePromptCharacter(character, index)),
      )
    : [];

export const resetUsedPrompts = () => {
  usedPrompts.clear();
};

export const getUsedPromptCount = () => usedPrompts.size;

export function generateSmartPrompt({
  basePrompt,
  tone,
  character,
  phase,
  avoidRepeat = true,
}: GenerateSmartPromptOptions): GeneratedPromptResult {
  const resolvedTone = normalizeTone(tone);
  const resolvedPhase = normalizePhase(phase);
  const normalizedCharacter = normalizePromptCharacterInput(character);
  const characterName = getCharacterPromptName(normalizedCharacter);
  const characterNote = buildCharacterNote(normalizedCharacter, resolvedTone);
  const cleanedBasePrompt = toText(basePrompt).trim();
  const templates = PROMPT_LIBRARY[resolvedTone];
  const conflicts = PROMPT_CONFLICTS[resolvedTone];
  const locations = PROMPT_LOCATIONS[resolvedTone];
  const twists = PROMPT_TWISTS[resolvedTone];
  const choices = PROMPT_CHOICES[resolvedTone];
  const emotions = PROMPT_EMOTIONS[resolvedTone];
  const stakes = PROMPT_STAKES[resolvedTone];

  if (
    templates.length === 0 ||
    conflicts.length === 0 ||
    locations.length === 0 ||
    twists.length === 0 ||
    choices.length === 0 ||
    emotions.length === 0 ||
    stakes.length === 0
  ) {
    const fallbackPrompt = getFallbackPrompt(normalizedCharacter, resolvedPhase, resolvedTone);
    const finalPrompt = cleanedBasePrompt
      ? enhanceBasePrompt({
          basePrompt: cleanedBasePrompt,
          generatedPrompt: fallbackPrompt,
        })
      : fallbackPrompt;

    if (avoidRepeat) {
      usedPrompts.add(finalPrompt);
    }

    return {
      prompt: finalPrompt,
      title: getFallbackTitle(normalizedCharacter, resolvedPhase),
      tone: resolvedTone,
      phase: resolvedPhase,
      characterLabel: getCharacterLabel(normalizedCharacter),
      tags: cleanedBasePrompt ? ["fallback", "legacy", "enhanced"] : ["fallback", "legacy"],
      usedCount: usedPrompts.size,
      recycledPool: false,
      source: "fallback",
    };
  }

  let nextPrompt = "";
  let nextTitle = "";
  let attempts = 0;

  while (attempts < 40) {
    const template = getRandom(templates).template;
    const conflict = getRandom(conflicts);
    const location = getRandom(locations);
    const twist = getRandom(twists);

    nextPrompt = buildPromptFromSelection({
      template,
      tone: resolvedTone,
      phase: resolvedPhase,
      character: normalizedCharacter,
      characterName,
      characterNote,
      basePrompt: cleanedBasePrompt,
      conflict,
      location,
      twist,
    });
    nextTitle = generateTitle({
      character: normalizedCharacter,
      conflict,
      location,
    });

    if (!avoidRepeat || !usedPrompts.has(nextPrompt)) break;
    attempts += 1;
  }

  if (!nextPrompt || (avoidRepeat && usedPrompts.has(nextPrompt))) {
    resetUsedPrompts();
    const template = getRandom(templates).template;
    const conflict = getRandom(conflicts);
    const location = getRandom(locations);
    const twist = getRandom(twists);
    nextPrompt = buildPromptFromSelection({
      template,
      tone: resolvedTone,
      phase: resolvedPhase,
      character: normalizedCharacter,
      characterName,
      characterNote,
      basePrompt: cleanedBasePrompt,
      conflict,
      location,
      twist,
    });
    nextTitle = generateTitle({
      character: normalizedCharacter,
      conflict,
      location,
    });
  }

  if (avoidRepeat) {
    usedPrompts.add(nextPrompt);
  }

  let recycledPool = false;
  if (avoidRepeat && usedPrompts.size > MAX_USED_PROMPTS) {
    usedPrompts.clear();
    usedPrompts.add(nextPrompt);
    recycledPool = true;
  }

  return {
    prompt: nextPrompt,
    title: nextTitle || getFallbackTitle(normalizedCharacter, resolvedPhase),
    tone: resolvedTone,
    phase: resolvedPhase,
    characterLabel: getCharacterLabel(normalizedCharacter),
    tags: [
      "combinator",
      ...(avoidRepeat ? ["no-repeat"] : []),
      ...(cleanedBasePrompt ? ["enhanced"] : []),
    ],
    usedCount: usedPrompts.size,
    recycledPool,
    source: "combinator",
  };
}
