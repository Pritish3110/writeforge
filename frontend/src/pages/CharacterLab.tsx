import { type DragEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useMatch, useNavigate } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import { ArrowUpToLine, ChevronDown, ChevronLeft, ChevronRight, Edit2, GripVertical, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { SwipeCardContainer } from "@/components/NarrativeSwipeFlow";

type CharacterType = "Main Character" | "Side Character" | "Activity Character";
type CharacterViewFilter = "All" | CharacterType;
type ProfileSectionKey = "core" | "identity" | "traits" | "theme" | "contradictions";

interface PersonalityTrait {
  id: string;
  title: string;
  description: string;
}

interface CharacterTheme {
  lie_based: string;
  truth_based: string;
}

interface Contradiction {
  left: string;
  right: string;
  description: string;
}

interface Character {
  id: string;
  name: string;
  type: CharacterType | "";
  logline: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
  truth: string;
  designing_principle: string;
  moral_problem: string;
  worthy_cause: string;
  personality_traits: PersonalityTrait[];
  theme: CharacterTheme;
  contradictions: Contradiction[];
  pinned: boolean;
  order: number;
}

interface GuidedFieldDefinition {
  key: string;
  label: string;
  guidance: string[];
  placeholder: string;
  examples: string[];
  suggestedMax: number;
  minHeightClass?: string;
}

export type { GuidedFieldDefinition };

const CHARACTER_TYPES: CharacterType[] = ["Main Character", "Side Character", "Activity Character"];
const CHARACTER_FILTERS: CharacterViewFilter[] = ["All", ...CHARACTER_TYPES];
const FORM_STEPS = [
  { key: "basics", label: "Basics" },
  { key: "identity", label: "Identity" },
  { key: "personality", label: "Personality" },
] as const;
const MILD_EDGE_CLASS = "shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.05)]";
const FORM_PANEL_CLASS = "w-full max-w-none";
const FORM_INPUT_CLASS = `rounded-[16px] border-transparent bg-card/[0.08] px-4 text-[15px] shadow-none placeholder:text-muted-foreground/60 focus-visible:border-transparent focus-visible:bg-card/[0.12] ${MILD_EDGE_CLASS}`;
const FORM_TEXTAREA_CLASS = `rounded-[16px] border-transparent bg-card/[0.08] px-4 py-4 text-[15px] leading-7 shadow-none placeholder:text-muted-foreground/60 focus-visible:border-transparent focus-visible:bg-card/[0.12] ${MILD_EDGE_CLASS}`;
const FORM_COLLAPSIBLE_CLASS = "border-t border-foreground/8 pt-4";
const GUIDED_FIELD_SHELL_CLASS = `grid items-stretch gap-4 rounded-[22px] bg-card/[0.1] p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)] ${MILD_EDGE_CLASS}`;
const NARRATIVE_FIELD_CARD_CLASS = `min-h-[260px] w-full overflow-hidden rounded-[18px] bg-card/[0.08] p-4 md:p-4 ${MILD_EDGE_CLASS}`;

const STEP_ONE_GUIDED_FIELDS: GuidedFieldDefinition[] = [
  {
    key: "ghost",
    label: "Ghost",
    guidance: [
      "The ghost is the unresolved wound, memory, or loss that still shapes how this character reacts in the present.",
      "Think less about the event itself and more about the emotional scar it left behind.",
    ],
    placeholder: "What past wound still follows this character into the present?",
    suggestedMax: 220,
    minHeightClass: "min-h-[190px]",
    examples: [
      "When Mira was eleven, she repeated a private secret to stop her parents from fighting. Instead, it triggered the final argument that split the family into two homes. Even now, she reads every conversation for danger signs and keeps emotional distance, because one careless sentence still feels powerful enough to destroy love.",
      "Rook begged his village council for help before the flood season, but no one listened until his brother was swept away. The lesson burned into him was simple: asking makes you small, and people only move when it's too late. He now solves everything alone, even when that isolation slowly ruins his health and relationships.",
      "Selene grew up in a house where praise only came after perfect scores, flawless recitals, and public wins. Mistakes were met with silence, and silence felt like erasure. As an adult, she overprepares for everything, avoids risks that expose weakness, and reads ordinary criticism as proof she is becoming invisible again.",
    ],
  },
  {
    key: "lie",
    label: "Lie",
    guidance: [
      "The lie is the false belief this character uses to protect themself from that old wound.",
      "It often sounds absolute: always, never, only, no one, everyone.",
    ],
    placeholder: "What false belief about themself, other people, or the world are they living by?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "If people truly know me, they will leave, so I must stay polished, controlled, and slightly out of reach at all times.",
      "Power is the only reliable form of safety; kindness, trust, and loyalty are temporary stories people tell before they betray you.",
      "Being useful is the same thing as being loved. The moment I stop producing, helping, or fixing, I become replaceable.",
    ],
  },
  {
    key: "want",
    label: "Want",
    guidance: [
      "The want is the visible, external thing this character is actively trying to get, win, protect, or prove.",
      "It should be something another character could observe from the outside.",
    ],
    placeholder: "What does this character believe they need to achieve right now?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "Secure a seat on the royal council before their family loses its final vote, because public influence feels like the only way to guarantee survival.",
      "Recover the missing map and reach the expedition gate before dawn, proving they are indispensable to the mission and not just tolerated out of pity.",
      "Convince their former partner to join one final operation, believing that completing the mission will repair both their reputation and their broken bond.",
    ],
  },
  {
    key: "need",
    label: "Need",
    guidance: [
      "The need is the internal shift that would actually heal or mature this character.",
      "It usually challenges the lie and forces them to relate to people differently.",
    ],
    placeholder: "What emotional lesson or inner change does this character truly need?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "Learn that asking for help is not surrender. Shared responsibility can be a sign of trust and maturity, not weakness or incompetence.",
      "Accept that love cannot be controlled into permanence through overprotection, sacrifice, or silent endurance; genuine closeness requires honesty and mutual choice.",
      "Stop measuring self-worth through constant usefulness, and begin to believe they are worthy of care even when they are tired, uncertain, or unable to perform.",
    ],
  },
  {
    key: "truth",
    label: "Truth",
    guidance: [
      "The truth is the healthier belief this character must eventually accept if they are going to grow.",
      "It should directly challenge the lie without sounding vague or generic.",
    ],
    placeholder: "What deeper truth would set this character free if they finally believed it?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "Real loyalty survives honesty. The people who matter most do not require perfect performance; they require presence, truth, and accountability.",
      "Control can reduce risk, but it cannot create intimacy. Lasting connection grows when uncertainty is shared, not eliminated.",
      "Vulnerability may lead to pain, but emotional concealment guarantees distance. To be fully known is the only path to being deeply loved.",
    ],
  },
];

const STEP_TWO_GUIDED_FIELDS: GuidedFieldDefinition[] = [
  {
    key: "designing_principle",
    label: "Designing principle",
    guidance: [
      "Define the narrative design logic behind this character: what role they are built to perform under pressure.",
      "Think in story function terms (mirror, foil, catalyst, pressure point, false guide, anchor), not personality adjectives.",
    ],
    placeholder: "What is this character's designing principle in the story?",
    suggestedMax: 300,
    minHeightClass: "min-h-[210px]",
    examples: [
      "Designed as a mirror-foil, Mara externalizes the hero's unspoken temptation: win first, justify later. Every choice she makes demonstrates the short-term rewards and long-term corrosion of that worldview.",
      "Built as the emotional pressure valve, Dren absorbs fear with humor and momentum. His silence, withdrawal, or refusal to defuse conflict is used as a structural warning that the team has crossed into irreversible failure territory.",
      "Structured as a false guide, Noctris offers clarity through control. He improves the hero's tactical efficiency while quietly deepening their moral numbness, proving his function is not to mentor growth but to normalize dehumanization.",
    ],
  },
  {
    key: "theme_lie_based",
    label: "Theme — lie-based",
    guidance: [
      "State the theme this character embodies while they are still trapped inside their false belief.",
      "This should sound like a worldview the story will eventually test.",
    ],
    placeholder: "What lie-based theme does this character currently express?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "Love must be earned through usefulness; if I am not solving problems, carrying burdens, or producing results, I become disposable.",
      "Mercy creates openings people exploit. If I hesitate, I lose leverage, and if I lose leverage, I lose the right to survive.",
      "Identity is performance. The moment I stop proving my value in public, I am erased in private.",
    ],
  },
  {
    key: "theme_truth_based",
    label: "Theme — truth-based",
    guidance: [
      "State the healthier truth this character could grow toward if their arc matures.",
      "It should feel like a direct answer to the lie-based theme above.",
    ],
    placeholder: "What truth-based theme could this character grow into?",
    suggestedMax: 180,
    minHeightClass: "min-h-[170px]",
    examples: [
      "Being loved is not the same as being needed. Real connection can remain even when I am tired, uncertain, and unable to perform.",
      "Compassion is not surrender; it can be disciplined courage that protects both dignity and long-term trust under pressure.",
      "Identity can survive failure, transition, and imperfection. Worth is not revoked the moment outcomes are messy or unfinished.",
    ],
  },
  {
    key: "moral_problem",
    label: "Moral problem",
    guidance: [
      "Describe the harmful choice pattern this character falls back on when the pressure rises.",
      "This is the repeated action that makes their inner flaw visible in the plot.",
    ],
    placeholder: "What damaging pattern does this character keep choosing under pressure?",
    suggestedMax: 220,
    minHeightClass: "min-h-[180px]",
    examples: [
      "She manipulates outcomes 'for everyone's good' by withholding key information, staging conversations, and narrowing other people's choices. She calls it protection, but the pattern repeatedly fractures trust when the truth surfaces.",
      "When forced to choose, he always protects one intimate bond at the expense of the wider community. Each decision feels emotionally justified in the moment, but over time it turns loyalty into favoritism and makes leadership impossible.",
      "They avoid direct conflict until consequences become public and irreversible. By delaying hard conversations, they convert manageable tension into institutional damage that now requires scapegoats, not repair.",
    ],
  },
  {
    key: "worthy_cause",
    label: "Worthy cause",
    guidance: [
      "Name the larger good that makes this character's struggle worth caring about beyond their personal pain.",
      "This is often the bigger human, political, familial, or moral reason their arc matters.",
    ],
    placeholder: "What higher cause makes this character worth rooting for?",
    suggestedMax: 220,
    minHeightClass: "min-h-[180px]",
    examples: [
      "Protecting the city that raised them, even though it never fully accepted them, because its people include children who deserve a safer inheritance than the one they received.",
      "Breaking a family cycle of silence so the next generation is not shaped by the same fear, secrecy, and emotional isolation that damaged every relationship before them.",
      "Holding a fragile alliance together long enough to prevent war, even when every faction profits from mistrust and the easiest short-term move is betrayal.",
    ],
  },
];

const emptyTrait = (trait: Partial<PersonalityTrait> = {}): PersonalityTrait => ({
  id: trait.id ?? crypto.randomUUID(),
  title: trait.title ?? "",
  description: trait.description ?? "",
});

const emptyContradiction = (): Contradiction => ({
  left: "",
  right: "",
  description: "",
});

const defaultProfileSections = (): Record<ProfileSectionKey, boolean> => ({
  core: false,
  identity: false,
  traits: false,
  theme: false,
  contradictions: false,
});

const emptyChar = (): Character => ({
  id: crypto.randomUUID(),
  name: "",
  type: "",
  logline: "",
  ghost: "",
  lie: "",
  want: "",
  need: "",
  truth: "",
  designing_principle: "",
  moral_problem: "",
  worthy_cause: "",
  personality_traits: [],
  theme: {
    lie_based: "",
    truth_based: "",
  },
  contradictions: [],
  pinned: false,
  order: Number.MAX_SAFE_INTEGER,
});

const buildDefaultCharacters = (): Character[] => [];

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const toBoolean = (value: unknown): boolean => value === true;

const isCharacterType = (value: unknown): value is CharacterType =>
  typeof value === "string" && CHARACTER_TYPES.includes(value as CharacterType);

const normalizeTrait = (value: unknown, fallbackIndex: number): PersonalityTrait => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return emptyTrait({
    id: toText(record.id) || `legacy-trait-${fallbackIndex}`,
    title: toText(record.title),
    description: toText(record.description),
  });
};

const normalizeContradiction = (value: unknown): Contradiction => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    left: toText(record.left),
    right: toText(record.right),
    description: toText(record.description),
  };
};

const normalizeCharacter = (value: unknown, fallbackOrder: number): Character => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const themeRecord = record.theme && typeof record.theme === "object" ? (record.theme as Record<string, unknown>) : {};
  const contradictions = Array.isArray(record.contradictions)
    ? record.contradictions.map(normalizeContradiction)
    : [];
  const legacyContradiction = toText(record.contradiction);

  return {
    id: toText(record.id) || crypto.randomUUID(),
    name: toText(record.name),
    type: isCharacterType(record.type) ? record.type : "",
    logline: toText(record.logline),
    ghost: toText(record.ghost),
    lie: toText(record.lie) || toText(record.flaw),
    want: toText(record.want) || toText(record.desire),
    need: toText(record.need),
    truth: toText(record.truth),
    designing_principle: toText(record.designing_principle),
    moral_problem: toText(record.moral_problem),
    worthy_cause: toText(record.worthy_cause),
    personality_traits: Array.isArray(record.personality_traits)
      ? record.personality_traits.map((trait, index) => normalizeTrait(trait, index))
      : [],
    theme: {
      lie_based: toText(themeRecord.lie_based),
      truth_based: toText(themeRecord.truth_based),
    },
    contradictions:
      contradictions.length > 0
        ? contradictions
        : legacyContradiction
          ? [{ left: "", right: "", description: legacyContradiction }]
          : [],
    pinned: toBoolean(record.pinned),
    order: toNumber(record.order, fallbackOrder),
  };
};

const sortCharacters = (characters: Character[]): Character[] =>
  [...characters].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    if (left.order !== right.order) return left.order - right.order;
    return left.name.localeCompare(right.name);
  });

const assignCharacterOrder = (characters: Character[]): Character[] =>
  characters.map((character, index) => ({
    ...character,
    order: index,
  }));

const syncCharacters = (value: unknown): Character[] =>
  assignCharacterOrder(
    sortCharacters(Array.isArray(value) ? value.map((character, index) => normalizeCharacter(character, index)) : []),
  );

const cloneCharacter = (character: Character): Character => ({
  ...character,
  personality_traits: character.personality_traits.map((trait) => ({ ...trait })),
  theme: { ...character.theme },
  contradictions: character.contradictions.map((contradiction) => ({ ...contradiction })),
});

const getNarrativeExcerpt = (character: Character): string =>
  character.logline.trim() ||
  character.truth.trim() ||
  character.lie.trim() ||
  character.ghost.trim() ||
  "No core narrative added yet.";

const getTraitLabel = (trait: PersonalityTrait, index: number): string => trait.title.trim() || `Trait ${index + 1}`;

const PinToggleGlyph = ({ pinned }: { pinned: boolean }) => (
  <span className="relative block h-4 w-4">
    <Pin className="h-4 w-4 transition-transform duration-200" />
    <span
      className={cn(
        "pointer-events-none absolute left-[-2px] top-1/2 h-[1.5px] w-[19px] -translate-y-1/2 rotate-[-38deg] rounded-full bg-current transition-all duration-200",
        pinned ? "opacity-100 scale-100" : "opacity-0 scale-75",
      )}
    />
  </span>
);

const ExamplePanel = ({
  definition,
  exampleIndex,
  onPreviousExample,
  onNextExample,
  visible,
}: {
  definition: GuidedFieldDefinition;
  exampleIndex: number;
  onPreviousExample: () => void;
  onNextExample: () => void;
  visible: boolean;
}) => {
  const currentExample = definition.examples[exampleIndex] ?? definition.examples[0];
  const isFirstExample = exampleIndex === 0;
  const isLastExample = exampleIndex >= definition.examples.length - 1;

  return (
    <aside
      className="flex h-full min-h-[230px] w-full flex-col overflow-hidden rounded-[16px] bg-card/[0.14] p-3.5 outline-none"
      aria-hidden={!visible}
      aria-label={visible ? `${definition.label} example` : undefined}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Example</p>
          <p className="text-xs text-muted-foreground">{definition.label}</p>
        </div>
        <p className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {exampleIndex + 1} / {definition.examples.length}
        </p>
      </div>

      <p className="mt-2.5 flex-1 whitespace-pre-wrap text-sm leading-6 text-foreground/90 overflow-hidden">
        {currentExample}
      </p>

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onPreviousExample}
          disabled={isFirstExample}
          aria-label={`Previous ${definition.label} example`}
          tabIndex={visible ? undefined : -1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onNextExample}
          disabled={isLastExample}
          aria-label={`Next ${definition.label} example`}
          tabIndex={visible ? undefined : -1}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
};

const NarrativeCard = ({
  definition,
  value,
  onChange,
  exampleOpen,
  onToggleExample,
  exampleIndex,
  onPreviousExample,
  onNextExample,
  className,
  showExampleButton = true,
}: {
  definition: GuidedFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  exampleOpen?: boolean;
  onToggleExample?: () => void;
  exampleIndex: number;
  onPreviousExample: () => void;
  onNextExample: () => void;
  className?: string;
  showExampleButton?: boolean;
}) => (
  <motion.section
    layout
    transition={{ duration: 0.35, ease: "easeInOut" }}
    className={cn(
      NARRATIVE_FIELD_CARD_CLASS,
      "max-w-[32rem]",
      exampleOpen && "max-w-[66rem]",
      className,
    )}
  >
    <div
      className={cn(
        "flex h-full flex-col gap-4 xl:flex-row",
      )}
    >
      <div className="flex min-h-[230px] min-w-0 flex-1 basis-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor={`narrative-${definition.key}`} className="text-sm font-medium text-foreground">
              {definition.label}
            </Label>
            <div className="space-y-1">
              {definition.guidance.map((line) => (
                <p key={`${definition.key}-${line}`} className="text-sm leading-6 text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {showExampleButton && (
            <Button
              type="button"
              variant={exampleOpen ? "secondary" : "outline"}
              size="sm"
              onClick={onToggleExample}
              aria-expanded={exampleOpen}
              aria-controls={`narrative-example-${definition.key}`}
              className="h-8 shrink-0 rounded-full px-3 text-xs"
            >
              Example
            </Button>
          )}
        </div>

        <Textarea
          id={`narrative-${definition.key}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={definition.placeholder}
          className={cn("mt-3 max-w-full min-h-[150px] resize-y xl:min-h-[170px]", FORM_TEXTAREA_CLASS)}
        />

        <div className="mt-2 flex justify-end text-xs text-muted-foreground/70">
          {value.trim().length}/{definition.suggestedMax}
        </div>
      </div>

      <motion.div
        id={`narrative-example-${definition.key}`}
        layout
        initial={false}
        animate={exampleOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={cn(
          "min-w-0 overflow-hidden",
          exampleOpen ? "block xl:flex-1 xl:basis-0" : "hidden pointer-events-none xl:hidden",
        )}
      >
        <ExamplePanel
          definition={definition}
          exampleIndex={exampleIndex}
          onPreviousExample={onPreviousExample}
          onNextExample={onNextExample}
          visible={Boolean(exampleOpen)}
        />
      </motion.div>
    </div>
  </motion.section>
);

const GuidedFieldCard = ({
  definition,
  value,
  onChange,
  exampleIndex,
  onPreviousExample,
  onNextExample,
  reverseLayout = false,
}: {
  definition: GuidedFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  exampleIndex: number;
  onPreviousExample: () => void;
  onNextExample: () => void;
  reverseLayout?: boolean;
}) => {
  const currentExample = definition.examples[exampleIndex] ?? definition.examples[0];

  return (
    <div className={cn(GUIDED_FIELD_SHELL_CLASS, reverseLayout && "xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1fr)]")}>
      <div className={cn("space-y-3", reverseLayout && "xl:order-2")}>
        <div className="space-y-1.5">
          <Label htmlFor={`guided-${definition.key}`} className="text-sm font-medium text-foreground">
            {definition.label}
          </Label>
          {definition.guidance.map((line) => (
            <p key={`${definition.key}-${line}`} className="text-sm leading-6 text-muted-foreground">
              {line}
            </p>
          ))}
        </div>

        <Textarea
          id={`guided-${definition.key}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={definition.placeholder}
          className={cn(definition.minHeightClass ?? "min-h-[180px]", FORM_TEXTAREA_CLASS)}
        />
        <div className="flex justify-end text-xs text-muted-foreground/70">
          {value.trim().length}/{definition.suggestedMax}
        </div>
      </div>

      <div className={cn("flex h-full min-h-0 flex-col rounded-[18px] bg-card/[0.14] p-4", MILD_EDGE_CLASS, reverseLayout && "xl:order-1")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-foreground">Example {exampleIndex + 1}</p>
          <p className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
            {exampleIndex + 1} / {definition.examples.length}
          </p>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/90">
          {currentExample}
        </p>

        <div className="mt-auto flex items-center justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onPreviousExample}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onNextExample}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const CharacterSection = ({
  title,
  accentClass,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  accentClass: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) => (
  <Collapsible open={open} onOpenChange={onOpenChange} className="group/profile-section scroll-mt-6">
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 px-4 py-4 md:px-5 md:py-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="h-auto w-full touch-manipulation justify-between px-0 py-0 font-mono active:scale-100 hover:bg-transparent"
      >
        <span className={cn("text-sm uppercase tracking-[0.2em]", accentClass)}>{title}</span>
        <ChevronDown className="pointer-events-none h-4 w-4 text-muted-foreground transition-transform duration-200 ease-in-out group-data-[state=open]/profile-section:rotate-180" />
      </Button>
      <CollapsibleContent className="pt-1">
        {children}
      </CollapsibleContent>
    </div>
  </Collapsible>
);

const CharacterField = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className={cn("space-y-2 rounded-lg border border-border/70 bg-background/30 p-3 md:p-4", className)}>
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">{label}</p>
    <p className={cn("whitespace-pre-wrap text-sm leading-7", value ? "text-foreground" : "text-muted-foreground")}>
      {value || "Not set yet."}
    </p>
  </div>
);

const CharacterLab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const newRouteMatch = useMatch("/character-lab/new");
  const editRouteMatch = useMatch("/character-lab/:characterId/edit");
  const profileRouteMatch = useMatch("/character-lab/:characterId");
  const confirmDelete = useDeleteConfirmation();
  const [storedCharacters, setStoredCharacters] = useLocalStorage<unknown[]>("writeforge-characters", buildDefaultCharacters());
  const [editing, setEditing] = useState<Character | null>(null);
  const [profileSections, setProfileSections] = useState<Record<ProfileSectionKey, boolean>>(defaultProfileSections());
  const [filterType, setFilterType] = useState<CharacterViewFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedCharacterId, setDraggedCharacterId] = useState<string | null>(null);
  const [dragOverCharacterId, setDragOverCharacterId] = useState<string | null>(null);
  const [removingTraitId, setRemovingTraitId] = useState<string | null>(null);
  const [removingContradictionIndex, setRemovingContradictionIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [traitDraft, setTraitDraft] = useState("");
  const [guidedExampleIndices, setGuidedExampleIndices] = useState<Record<string, number>>({});
  const [traitDetailsOpen, setTraitDetailsOpen] = useState(false);
  const [contradictionDetailsOpen, setContradictionDetailsOpen] = useState(false);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const readerCardRef = useRef<HTMLDivElement | null>(null);

  const isNewRoute = Boolean(newRouteMatch);
  const editCharacterId = editRouteMatch?.params.characterId ?? null;
  const profileCharacterId = profileRouteMatch?.params.characterId ?? null;
  const characters = useMemo(() => syncCharacters(storedCharacters), [storedCharacters]);
  const showForm = isNewRoute || Boolean(editCharacterId);
  const viewingCharacterId = isNewRoute ? null : editCharacterId ?? profileCharacterId;
  const visibleCharacters = characters.filter((character) => {
    const matchesType = filterType === "All" || character.type === filterType;
    const query = searchTerm.trim().toLowerCase();
    const matchesQuery =
      query.length === 0 ||
      character.name.toLowerCase().includes(query) ||
      character.logline.toLowerCase().includes(query) ||
      character.type.toLowerCase().includes(query);

    return matchesType && matchesQuery;
  });
  const viewingCharacter = editRouteMatch ? null : characters.find((character) => character.id === viewingCharacterId) || null;
  const pinnedCount = characters.filter((character) => character.pinned).length;
  const isExistingCharacter = Boolean(editing && characters.some((character) => character.id === editing.id));
  const isBasicsComplete = Boolean(editing?.name.trim() && editing?.type);
  const isFinalStep = currentStep === FORM_STEPS.length - 1;
  const canUseCharacterActions = isBasicsComplete;
  const editingScrollId = editing?.id;
  const viewingCharacterScrollId = viewingCharacter?.id;
  const forcePageTop = () => {
    const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
    if (!isJsdom) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    if (typeof document !== "undefined") {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };
  const getGuidedExampleIndex = (fieldKey: string, total: number) => {
    const index = guidedExampleIndices[fieldKey] ?? 0;
    return index >= total ? 0 : index;
  };

  const cycleGuidedExample = (fieldKey: string, total: number, direction: 1 | -1) => {
    setGuidedExampleIndices((prev) => {
      const currentIndex = prev[fieldKey] ?? 0;
      return {
        ...prev,
        [fieldKey]: (currentIndex + direction + total) % total,
      };
    });
  };

  useEffect(() => {
    const synced = syncCharacters(storedCharacters);

    if (JSON.stringify(storedCharacters) !== JSON.stringify(synced)) {
      setStoredCharacters(synced);
    }
  }, [setStoredCharacters, storedCharacters]);

  useEffect(() => {
    if (isNewRoute) {
      setEditing((prev) => {
        const isUnsavedDraft = prev ? !characters.some((character) => character.id === prev.id) : false;
        return isUnsavedDraft ? prev : emptyChar();
      });
      setCurrentStep(0);
      setTraitDraft("");
      setGuidedExampleIndices({});
      setTraitDetailsOpen(false);
      setContradictionDetailsOpen(false);
      setRemovingTraitId(null);
      setRemovingContradictionIndex(null);
      return;
    }

    if (editCharacterId) {
      const target = characters.find((character) => character.id === editCharacterId);

      if (!target) {
        navigate("/character-lab", { replace: true });
        return;
      }

      setEditing(cloneCharacter(target));
      setCurrentStep(0);
      setTraitDraft("");
      setGuidedExampleIndices({});
      setTraitDetailsOpen(false);
      setContradictionDetailsOpen(false);
      setRemovingTraitId(null);
      setRemovingContradictionIndex(null);
      return;
    }

    setEditing(null);
    setCurrentStep(0);
    setTraitDraft("");
    setGuidedExampleIndices({});
    setTraitDetailsOpen(false);
    setContradictionDetailsOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
  }, [characters, editCharacterId, isNewRoute, navigate]);

  useEffect(() => {
    if (!viewingCharacterId) return;
    if (editRouteMatch) return;

    const stillVisible = visibleCharacters.some((character) => character.id === viewingCharacterId);

    if (!stillVisible) {
      navigate("/character-lab", { replace: true });
      setProfileSections(defaultProfileSections());
    }
  }, [editRouteMatch, navigate, viewingCharacterId, visibleCharacters]);

  useEffect(() => {
    if (!profileCharacterId || editCharacterId || isNewRoute) return;
    if (characters.some((character) => character.id === profileCharacterId)) return;

    navigate("/character-lab", { replace: true });
  }, [characters, editCharacterId, isNewRoute, navigate, profileCharacterId]);

  useLayoutEffect(() => {
    if (!showForm || !formTopRef.current) return;

    const formTop = formTopRef.current;
    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    let lateSettleTimer = 0;

    const forceTop = () => {
      const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
      if (!isJsdom) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      // Reset document-level scroll positions for browsers/layouts that don't rely on window.
      if (typeof document !== "undefined") {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }

      // Also reset any scrollable parent containers up the tree.
      let parent: HTMLElement | null = formTop.parentElement;
      while (parent) {
        parent.scrollTop = 0;
        parent = parent.parentElement;
      }

      formTop.scrollIntoView({ behavior: "auto", block: "start" });
      formTop.focus({ preventScroll: true });
    };

    // Immediate reset to beat scroll restoration when route changes.
    forceTop();

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        forceTop();
      });
    });

    // One extra correction for late-mounted/animated content shifts.
    settleTimer = window.setTimeout(() => {
      forceTop();
    }, 120);
    lateSettleTimer = window.setTimeout(() => {
      forceTop();
    }, 260);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(lateSettleTimer);
    };
  }, [location.pathname, showForm]);

  useEffect(() => {
    if (!isNewRoute || !formTopRef.current) return;

    const formTop = formTopRef.current;
    const forceTop = () => {
      const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
      if (!isJsdom) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      if (typeof document !== "undefined") {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      let parent: HTMLElement | null = formTop.parentElement;
      while (parent) {
        parent.scrollTop = 0;
        parent = parent.parentElement;
      }
      formTop.scrollIntoView({ behavior: "auto", block: "start" });
      formTop.focus({ preventScroll: true });
    };

    forceTop();
    const t1 = window.setTimeout(forceTop, 90);
    const t2 = window.setTimeout(forceTop, 220);
    const t3 = window.setTimeout(forceTop, 420);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [isNewRoute, location.key]);

  useEffect(() => {
    if (!viewingCharacterScrollId || editRouteMatch || !readerCardRef.current) return;

    const readerCard = readerCardRef.current;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animationFrame = window.requestAnimationFrame(() => {
      readerCard.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      readerCard.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [editRouteMatch, viewingCharacterScrollId]);

  const updateEditing = (update: Partial<Character>) => {
    setEditing((prev) => (prev ? { ...prev, ...update } : prev));
  };

  const updateTheme = (field: keyof CharacterTheme, value: string) => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            theme: {
              ...prev.theme,
              [field]: value,
            },
          }
        : prev,
    );
  };

  const getStepTwoFieldValue = (fieldKey: GuidedFieldDefinition["key"]) => {
    if (!editing) return "";

    switch (fieldKey) {
      case "designing_principle":
        return editing.designing_principle;
      case "theme_lie_based":
        return editing.theme.lie_based;
      case "theme_truth_based":
        return editing.theme.truth_based;
      case "moral_problem":
        return editing.moral_problem;
      case "worthy_cause":
        return editing.worthy_cause;
      default:
        return "";
    }
  };

  const updateStepTwoFieldValue = (fieldKey: GuidedFieldDefinition["key"], value: string) => {
    switch (fieldKey) {
      case "designing_principle":
        updateEditing({ designing_principle: value });
        return;
      case "theme_lie_based":
        updateTheme("lie_based", value);
        return;
      case "theme_truth_based":
        updateTheme("truth_based", value);
        return;
      case "moral_problem":
        updateEditing({ moral_problem: value });
        return;
      case "worthy_cause":
        updateEditing({ worthy_cause: value });
        return;
      default:
        return;
    }
  };

  const updateTrait = (id: string, field: Exclude<keyof PersonalityTrait, "id">, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        personality_traits: prev.personality_traits.map((trait) => (trait.id === id ? { ...trait, [field]: value } : trait)),
      };
    });
  };

  const updateContradiction = (index: number, field: keyof Contradiction, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        contradictions: prev.contradictions.map((contradiction, contradictionIndex) =>
          contradictionIndex === index ? { ...contradiction, [field]: value } : contradiction,
        ),
      };
    });
  };

  const updateContradictionSummary = (value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const nextContradictions = prev.contradictions.length > 0 ? [...prev.contradictions] : [emptyContradiction()];
      nextContradictions[0] = {
        ...nextContradictions[0],
        description: value,
      };

      return {
        ...prev,
        contradictions: value.trim() || prev.contradictions.length > 1 ? nextContradictions : [],
      };
    });
  };

  const addTrait = (title = "") => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            personality_traits: [...prev.personality_traits, emptyTrait({ title })],
          }
        : prev,
    );
  };

  const addTraitFromDraft = () => {
    const title = traitDraft.trim();
    if (!title) return;

    addTrait(title);
    setTraitDraft("");
    setTraitDetailsOpen(true);
  };

  const removeTrait = async (id: string) => {
    const target = editing?.personality_traits.find((trait) => trait.id === id);
    const shouldDelete = await confirmDelete({
      title: `Delete ${target?.title?.trim() ? `"${target.title}"` : "this trait"}?`,
      description: "This personality trait will be removed from the current character draft.",
      confirmLabel: "Delete Trait",
    });
    if (!shouldDelete) return;

    setRemovingTraitId(id);

    window.setTimeout(() => {
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              personality_traits: prev.personality_traits.filter((trait) => trait.id !== id),
            }
          : prev,
      );
      setRemovingTraitId(null);
    }, 180);
  };

  const addContradiction = () => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            contradictions: [...prev.contradictions, emptyContradiction()],
          }
        : prev,
    );
    setContradictionDetailsOpen(true);
  };

  const removeContradiction = async (index: number) => {
    const shouldDelete = await confirmDelete({
      title: `Delete contradiction ${index + 1}?`,
      description: "This contradiction entry will be removed from the current character draft.",
      confirmLabel: "Delete Contradiction",
    });
    if (!shouldDelete) return;

    setRemovingContradictionIndex(index);

    window.setTimeout(() => {
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              contradictions: prev.contradictions.filter((_, contradictionIndex) => contradictionIndex !== index),
            }
          : prev,
      );
      setRemovingContradictionIndex(null);
    }, 180);
  };

  const save = (destination: "lab" | "profile" = "lab") => {
    if (!editing || !editing.name.trim() || !editing.type) return;

    const nextEditing = cloneCharacter(editing);

    setStoredCharacters((prev) => {
      const normalized = syncCharacters(prev);
      const index = normalized.findIndex((character) => character.id === nextEditing.id);

      if (index >= 0) {
        const copy = [...normalized];
        copy[index] = nextEditing;
        return assignCharacterOrder(sortCharacters(copy));
      }

      return assignCharacterOrder(sortCharacters([...normalized, { ...nextEditing, order: normalized.length }]));
    });

    navigate(destination === "profile" ? `/character-lab/${nextEditing.id}` : "/character-lab");
    setProfileSections(defaultProfileSections());
    setEditing(null);
    setCurrentStep(0);
    setTraitDraft("");
    setGuidedExampleIndices({});
    setTraitDetailsOpen(false);
    setContradictionDetailsOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
  };

  const remove = async (id: string) => {
    const target = characters.find((character) => character.id === id);
    const shouldDelete = await confirmDelete({
      title: `Delete "${target?.name || "this character"}"?`,
      description: "This character profile will be removed from Character Lab. This action cannot be undone.",
      confirmLabel: "Delete Character",
    });
    if (!shouldDelete) return;

    setStoredCharacters((prev) => assignCharacterOrder(syncCharacters(prev).filter((character) => character.id !== id)));

    if (viewingCharacterId === id) {
      navigate("/character-lab", { replace: true });
      setProfileSections(defaultProfileSections());
    }

    if (editing?.id === id) {
      setEditing(null);
    }
  };

  const togglePinned = (id: string) => {
    setStoredCharacters((prev) =>
      assignCharacterOrder(
        sortCharacters(
          syncCharacters(prev).map((character) => (character.id === id ? { ...character, pinned: !character.pinned } : character)),
        ),
      ),
    );
  };

  const moveToTop = (id: string) => {
    setStoredCharacters((prev) => {
      const ordered = [...syncCharacters(prev)];
      const index = ordered.findIndex((character) => character.id === id);

      if (index === -1) return prev;

      const [target] = ordered.splice(index, 1);
      const insertAt = target.pinned ? 0 : ordered.findIndex((character) => !character.pinned);
      ordered.splice(insertAt === -1 ? ordered.length : insertAt, 0, target);

      return assignCharacterOrder(ordered);
    });
  };

  const reorderCharacters = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;

    setStoredCharacters((prev) => {
      const ordered = [...syncCharacters(prev)];
      const sourceIndex = ordered.findIndex((character) => character.id === sourceId);
      const targetIndex = ordered.findIndex((character) => character.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...ordered];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);

      return assignCharacterOrder(next);
    });
  };

  const startNew = () => {
    forcePageTop();
    setEditing(emptyChar());
    setCurrentStep(0);
    setTraitDraft("");
    setGuidedExampleIndices({});
    setTraitDetailsOpen(false);
    setContradictionDetailsOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
    navigate("/character-lab/new");
    // Route transition path from lab -> new can retain prior scroll; force reset again.
    window.requestAnimationFrame(() => {
      forcePageTop();
      window.requestAnimationFrame(() => {
        forcePageTop();
      });
    });
  };

  const startEdit = (character: Character) => {
    setEditing(cloneCharacter(character));
    setCurrentStep(0);
    setTraitDraft("");
    setGuidedExampleIndices({});
    setTraitDetailsOpen(false);
    setContradictionDetailsOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
    navigate(`/character-lab/${character.id}/edit`);
  };

  const viewCharacterLab = () => {
    navigate("/character-lab");
    setProfileSections(defaultProfileSections());
  };

  const viewCharacterProfile = (id: string) => {
    navigate(`/character-lab/${id}`);
    setProfileSections(defaultProfileSections());
  };

  const setProfileSectionOpen = (section: ProfileSectionKey, open: boolean) => {
    setProfileSections((prev) => ({ ...prev, [section]: open }));
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggedCharacterId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggedCharacterId && draggedCharacterId !== id) {
      setDragOverCharacterId(id);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    const sourceId = draggedCharacterId || event.dataTransfer.getData("text/plain");

    reorderCharacters(sourceId, id);
    setDraggedCharacterId(null);
    setDragOverCharacterId(null);
  };

  const handleDragEnd = () => {
    setDraggedCharacterId(null);
    setDragOverCharacterId(null);
  };

  const handlePrimaryAction = () => {
    if (!canUseCharacterActions) return;

    if (isFinalStep) {
      save("lab");
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
  };

  if (showForm && editing) {
    return (
      <div ref={formTopRef} tabIndex={-1} className="flex min-h-full w-full flex-col gap-8 pb-8 outline-none">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-6">
            <div className="space-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/80">
                {isExistingCharacter ? "Edit Character" : "New Character"}
              </p>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {isExistingCharacter ? "Edit Character" : "Build Character"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Shape the basics first, then deepen identity and personality without leaving the page.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground xl:text-right">
                  Step {currentStep + 1} of {FORM_STEPS.length}
                </p>
              </div>
            </div>

          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-3 xl:sticky xl:top-6 xl:w-auto xl:pl-6">
            <Button
              type="button"
              variant="outline"
              onClick={viewCharacterLab}
              className="rounded-full border-transparent bg-card/[0.2] px-5 hover:border-transparent"
            >
              View Character Lab
            </Button>
            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!canUseCharacterActions}
              className="rounded-full px-5"
            >
              {isFinalStep ? "Save Character" : "Next Step"}
            </Button>
          </div>
        </div>

        <div className="w-full max-w-none">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {FORM_STEPS.map((step, index) => {
              const isActive = currentStep === index;
              const isComplete = index < currentStep;
              const canOpenStep = index === 0 || canUseCharacterActions;

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => {
                    if (canOpenStep) setCurrentStep(index);
                  }}
                  disabled={!canOpenStep}
                  className={cn(
                    "border-t border-foreground/18 px-1 pt-3 text-left transition-colors hover:border-foreground/28 disabled:cursor-not-allowed disabled:hover:border-foreground/18",
                    !canOpenStep && "opacity-45",
                  )}
                >
                  <p className={cn("text-[15px] font-medium", isActive ? "text-foreground" : "text-muted-foreground/65")}>
                    Step {index + 1}. {step.label}
                  </p>
                  <p className={cn("mt-1 text-xs", isActive || isComplete ? "text-muted-foreground" : "text-muted-foreground/55")}>
                    {isComplete ? "Completed" : "In progress"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {currentStep === 0 && (
            <div className={cn(FORM_PANEL_CLASS, "space-y-6")}>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-start">
                <div className="space-y-3">
                  <Label htmlFor="character-name" className="text-sm font-medium text-foreground">
                    Character name
                  </Label>
                  <Input
                    id="character-name"
                    value={editing.name}
                    onChange={(event) => updateEditing({ name: event.target.value })}
                    placeholder="e.g. Luna Solren"
                    className={cn("h-14 text-base", FORM_INPUT_CLASS)}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">Character type</Label>
                  <Select value={editing.type} onValueChange={(value) => updateEditing({ type: value as CharacterType })}>
                    <SelectTrigger className={cn("h-14 rounded-[16px] px-4 text-left text-base", FORM_INPUT_CLASS)}>
                      <SelectValue placeholder="Select character type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARACTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="character-core-narrative" className="text-sm font-medium text-foreground">
                  Core narrative
                </Label>
                <Textarea
                  id="character-core-narrative"
                  value={editing.logline}
                  onChange={(event) => updateEditing({ logline: event.target.value })}
                  placeholder="Add a short narrative essence for this character"
                  className={cn("min-h-[140px] xl:min-h-[160px]", FORM_TEXTAREA_CLASS)}
                />
              </div>

              <div className="border-t border-foreground/8 pt-6">
                <div className="mb-6 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">Additional narrative notes</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    These deeper anchors help you understand the emotional engine behind the character, not just the surface summary.
                  </p>
                </div>
                <SwipeCardContainer
                  definitions={STEP_ONE_GUIDED_FIELDS}
                  getValue={(key) => String(editing[key as keyof Character] ?? "")}
                  onChange={(key, value) => updateEditing({ [key]: value } as Partial<Character>)}
                  getExampleIndex={getGuidedExampleIndex}
                  onCycleExample={cycleGuidedExample}
                  onComplete={() => {
                    // Move to next step or trigger any completion logic
                    setCurrentStep(1);
                  }}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className={cn(FORM_PANEL_CLASS, "space-y-6")}>
              {STEP_TWO_GUIDED_FIELDS.map((definition, index) => (
                <GuidedFieldCard
                  key={definition.key}
                  definition={definition}
                  value={getStepTwoFieldValue(definition.key)}
                  onChange={(value) => updateStepTwoFieldValue(definition.key, value)}
                  exampleIndex={getGuidedExampleIndex(definition.key, definition.examples.length)}
                  onPreviousExample={() => cycleGuidedExample(definition.key, definition.examples.length, -1)}
                  onNextExample={() => cycleGuidedExample(definition.key, definition.examples.length, 1)}
                  reverseLayout={index % 2 === 1}
                />
              ))}
            </div>
          )}

          {currentStep === 2 && (
            <div className={cn(FORM_PANEL_CLASS, "space-y-6")}>
              <div className={cn("rounded-[18px] border border-foreground/10 bg-card/[0.12] p-4 md:p-5", MILD_EDGE_CLASS)}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Personality Traits</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add defining traits and describe how each one appears in behavior.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => addTrait()} className="h-10 rounded-[14px] px-4">
                    <Plus className="h-4 w-4" /> Add Trait
                  </Button>
                </div>

                {editing.personality_traits.length > 0 ? (
                  <div className="space-y-3">
                    {editing.personality_traits.map((trait, index) => (
                      <div
                        key={`${editing.id}-trait-form-${trait.id}`}
                        className={cn(
                          "space-y-3 rounded-[14px] border border-foreground/10 bg-card/[0.1] p-4",
                          removingTraitId === trait.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Trait {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void removeTrait(trait.id)}
                            aria-label={`Remove trait ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${trait.id}-title`} className="text-sm font-medium text-foreground">
                            Trait Title
                          </Label>
                          <Input
                            id={`${trait.id}-title`}
                            value={trait.title}
                            onChange={(event) => updateTrait(trait.id, "title", event.target.value)}
                            placeholder="e.g. Relentless"
                            className={cn("rounded-[14px]", FORM_INPUT_CLASS)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${trait.id}-description`} className="text-sm font-medium text-foreground">
                            Description
                          </Label>
                          <Textarea
                            id={`${trait.id}-description`}
                            value={trait.description}
                            onChange={(event) => updateTrait(trait.id, "description", event.target.value)}
                            placeholder="Describe how this trait affects decisions, relationships, and conflict."
                            className={cn("min-h-[130px] rounded-[14px]", FORM_TEXTAREA_CLASS)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No traits yet. Add one to build the character voice.</p>
                )}
              </div>

              <div className={cn("rounded-[18px] border border-foreground/10 bg-card/[0.12] p-4 md:p-5", MILD_EDGE_CLASS)}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Contradictions</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Capture opposing forces inside this character to sharpen internal conflict.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addContradiction} className="h-10 rounded-[14px] px-4">
                    <Plus className="h-4 w-4" /> Add Contradiction
                  </Button>
                </div>

                {editing.contradictions.length > 0 ? (
                  <div className="space-y-3">
                    {editing.contradictions.map((contradiction, index) => (
                      <div
                        key={`${editing.id}-contradiction-${index}`}
                        className={cn(
                          "space-y-3 rounded-[14px] border border-foreground/10 bg-card/[0.1] p-4",
                          removingContradictionIndex === index && "pointer-events-none opacity-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Contradiction {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => void removeContradiction(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`${editing.id}-left-${index}`} className="text-sm font-medium text-foreground">Left Trait</Label>
                            <Input
                              id={`${editing.id}-left-${index}`}
                              value={contradiction.left}
                              onChange={(event) => updateContradiction(index, "left", event.target.value)}
                              placeholder="e.g. Compassionate"
                              className={cn("rounded-[14px]", FORM_INPUT_CLASS)}
                            />
                          </div>
                          <p className="pb-3 text-center font-mono text-sm text-muted-foreground">---</p>
                          <div className="space-y-2">
                            <Label htmlFor={`${editing.id}-right-${index}`} className="text-sm font-medium text-foreground">Right Trait</Label>
                            <Input
                              id={`${editing.id}-right-${index}`}
                              value={contradiction.right}
                              onChange={(event) => updateContradiction(index, "right", event.target.value)}
                              placeholder="e.g. Ruthless"
                              className={cn("rounded-[14px]", FORM_INPUT_CLASS)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${editing.id}-description-${index}`} className="text-sm font-medium text-foreground">Description</Label>
                          <Textarea
                            id={`${editing.id}-description-${index}`}
                            value={contradiction.description}
                            onChange={(event) => updateContradiction(index, "description", event.target.value)}
                            placeholder="Explain how these opposing traits collide in choices and behavior."
                            className={cn("min-h-[130px] rounded-[14px]", FORM_TEXTAREA_CLASS)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No contradictions yet. Add one to sharpen internal conflict.</p>
                )}
              </div>

              <Collapsible open={traitDetailsOpen} onOpenChange={setTraitDetailsOpen} className="hidden">
                <div className={FORM_COLLAPSIBLE_CLASS}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="h-auto w-full justify-between rounded-[20px] px-4 py-3 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground">
                      Trait notes
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/trait-details:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 px-4 py-4 md:px-5">
                    <p className="text-sm text-muted-foreground">Legacy section hidden.</p>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Character Lab</h1>
          <p className="mt-1 text-sm text-muted-foreground">Craft, organize, and reference your characters.</p>
        </div>
        <Button onClick={startNew} className="gap-2 rounded-full px-5">
          <Plus className="h-4 w-4" /> New Character
        </Button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_210px_auto] xl:items-end">
        <div className="space-y-2">
          <Label htmlFor="character-search" className="font-mono text-xs">Search Characters</Label>
          <div className={cn("relative rounded-[14px] bg-card/[0.1]", MILD_EDGE_CLASS)}>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input
              id="character-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, type, or core narrative"
              className="h-11 border-transparent bg-transparent pl-10 pr-4 text-[15px] focus-visible:bg-card/[0.08]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Filter by Type</Label>
          <div className={cn("rounded-[14px] bg-card/[0.1]", MILD_EDGE_CLASS)}>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as CharacterViewFilter)}>
              <SelectTrigger className="h-11 rounded-[14px] border-transparent bg-transparent px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_FILTERS.map((filter) => (
                  <SelectItem key={filter} value={filter}>
                    {filter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 pb-1 text-xs font-mono text-muted-foreground xl:justify-end">
          <span>{visibleCharacters.length} shown</span>
          <span className="text-muted-foreground/50">•</span>
          <span>{characters.length} total</span>
          <span className="text-muted-foreground/50">•</span>
          <span>{pinnedCount} pinned</span>
        </div>
      </div>

      <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {visibleCharacters.map((character) => {
          const isSelected = viewingCharacterId === character.id;
          const isDragOver = dragOverCharacterId === character.id && draggedCharacterId !== character.id;

          return (
            <Card
              key={character.id}
              className={cn(
                "glow-card flex h-full flex-col overflow-hidden rounded-[18px] border-transparent bg-card/[0.2] transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:bg-card/[0.28]",
                MILD_EDGE_CLASS,
                isSelected && "bg-card/[0.3] shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.06),0_0_0_1px_hsl(var(--foreground)/0.03)]",
                isDragOver && "border-neon-cyan/70",
              )}
              onDragOver={(event) => handleDragOver(event, character.id)}
              onDrop={(event) => handleDrop(event, character.id)}
              onDragLeave={() => {
                if (dragOverCharacterId === character.id) setDragOverCharacterId(null);
              }}
            >
              <CardHeader className="space-y-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <CardTitle className="whitespace-normal break-words text-[1.55rem] leading-[1.08]">{character.name}</CardTitle>
                    {character.pinned && <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Pinned</p>}
                    <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-neon-cyan">
                      {character.type || "Character Type Unset"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      draggable
                      onDragStart={(event) => handleDragStart(event, character.id)}
                      onDragEnd={handleDragEnd}
                      className="h-8 w-8 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8", character.pinned && "text-neon-pink")} onClick={() => togglePinned(character.id)}>
                      <PinToggleGlyph pinned={character.pinned} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveToTop(character.id)}>
                      <ArrowUpToLine className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(character)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => void remove(character.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">Logline</p>
                  <p className="min-h-[96px] text-sm leading-7 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                    {getNarrativeExcerpt(character)}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{character.personality_traits.length} traits</span>
                  <span>{character.contradictions.length} contradictions</span>
                  <Button
                    variant="ghost"
                    className="h-auto px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                    onClick={() => viewCharacterProfile(character.id)}
                  >
                    Open profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {visibleCharacters.length === 0 && (
          <Card className={cn("glow-card col-span-full border-transparent hover:border-transparent", MILD_EDGE_CLASS)}>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">
                  {characters.length === 0 ? "No characters yet." : "No characters match the current filters."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {characters.length === 0
                    ? "Start a new profile to begin filling out the lab."
                    : "Try a different name, type, or search phrase."}
                </p>
              </div>
              {characters.length === 0 && (
                <Button onClick={startNew} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" /> Create Character
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {viewingCharacter && (
        <Card ref={readerCardRef} tabIndex={-1} className={cn("glow-card scroll-mt-6 border-transparent outline-none hover:border-transparent", MILD_EDGE_CLASS)}>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Character Reader</p>
                <CardTitle className="text-2xl">{viewingCharacter.name}</CardTitle>
                {viewingCharacter.pinned && <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-pink">Pinned</p>}
                <p className="text-xs font-mono text-neon-cyan">{viewingCharacter.type || "Character Type Unset"}</p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", viewingCharacter.pinned && "text-neon-pink")}
                  onClick={() => togglePinned(viewingCharacter.id)}
                >
                  <PinToggleGlyph pinned={viewingCharacter.pinned} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(viewingCharacter)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={viewCharacterLab}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="mx-auto w-full max-w-[800px] space-y-5 px-4 md:px-6">
              <CharacterSection
                title="Core Narrative"
                accentClass="text-neon-cyan"
                open={profileSections.core}
                onOpenChange={(open) => setProfileSectionOpen("core", open)}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CharacterField label="Logline" value={viewingCharacter.logline} className="md:col-span-2" />
                  <CharacterField label="Ghost" value={viewingCharacter.ghost} />
                  <CharacterField label="Lie" value={viewingCharacter.lie} />
                  <CharacterField label="Want" value={viewingCharacter.want} />
                  <CharacterField label="Need" value={viewingCharacter.need} />
                  <CharacterField label="Truth" value={viewingCharacter.truth} className="md:col-span-2" />
                </div>
              </CharacterSection>

              <CharacterSection
                title="Structural Identity"
                accentClass="text-neon-pink"
                open={profileSections.identity}
                onOpenChange={(open) => setProfileSectionOpen("identity", open)}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CharacterField label="Designing Principle" value={viewingCharacter.designing_principle} />
                  <CharacterField label="Moral Problem" value={viewingCharacter.moral_problem} />
                  <CharacterField label="Worthy Cause" value={viewingCharacter.worthy_cause} className="md:col-span-2" />
                </div>
              </CharacterSection>

              <CharacterSection
                title="Personality Traits"
                accentClass="text-neon-purple"
                open={profileSections.traits}
                onOpenChange={(open) => setProfileSectionOpen("traits", open)}
              >
                {viewingCharacter.personality_traits.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {viewingCharacter.personality_traits.map((trait, index) => (
                      <div key={`${viewingCharacter.id}-trait-${trait.id}`} className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-4">
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">{trait.title || `Trait ${index + 1}`}</p>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{trait.description || "No description yet."}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">No traits added yet.</p>
                )}
              </CharacterSection>

              <CharacterSection
                title="Theme"
                accentClass="text-neon-cyan"
                open={profileSections.theme}
                onOpenChange={(open) => setProfileSectionOpen("theme", open)}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CharacterField label="Lie-Based Theme" value={viewingCharacter.theme.lie_based} />
                  <CharacterField label="Truth-Based Theme" value={viewingCharacter.theme.truth_based} />
                </div>
              </CharacterSection>

              <CharacterSection
                title="Contradictions"
                accentClass="text-neon-pink"
                open={profileSections.contradictions}
                onOpenChange={(open) => setProfileSectionOpen("contradictions", open)}
              >
                {viewingCharacter.contradictions.length > 0 ? (
                  <div className="space-y-3">
                    {viewingCharacter.contradictions.map((contradiction, index) => (
                      <div key={`${viewingCharacter.id}-contradiction-${index}`} className="space-y-3 rounded-lg border border-border/70 bg-background/30 p-4">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
                          <span className="text-neon-purple">{contradiction.left || "Left Trait"}</span>
                          <span className="text-muted-foreground/70">---</span>
                          <span className="text-neon-cyan">{contradiction.right || "Right Trait"}</span>
                        </div>
                        <div className="h-px w-full bg-border/70" />
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                          {contradiction.description || "No contradiction description yet."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">No contradictions added yet.</p>
                )}
              </CharacterSection>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CharacterLab;
