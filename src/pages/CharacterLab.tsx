import { type DragEvent, type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ArrowUpToLine, ChevronDown, Edit2, GripVertical, Pin, Plus, Search, Trash2, X } from "lucide-react";

type CharacterType = "Main Character" | "Side Character" | "Activity Character";
type CharacterViewFilter = "All" | CharacterType;
type ProfileSectionKey = "core" | "identity" | "traits" | "theme" | "contradictions";

interface PersonalityTrait {
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

const CHARACTER_TYPES: CharacterType[] = ["Main Character", "Side Character", "Activity Character"];
const CHARACTER_FILTERS: CharacterViewFilter[] = ["All", ...CHARACTER_TYPES];

const emptyTrait = (): PersonalityTrait => ({
  title: "",
  description: "",
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

const buildKaelCharacter = (): Character => ({
  id: "kael-default",
  name: "Kael",
  type: "Main Character",
  logline: "A cursed 13-year-old boy, abused by his village and betrayed by his only love, sets out to defy a world he is destined to destroy, proving that he is enough to survive the fate that seeks to erase him.",
  ghost: "Growing up in a village where every hand was raised against him, Kael lived in constant fear of connection. When he finally mustered the courage to forge a real bond, the world forced him to face a brutal reality: his curse is real. He is haunted by the knowledge that because of this mark, those around him will always suffer and hate him for it. To Kael, it feels like his inescapable destiny to live and die alone.",
  lie: "The world is a cruel, selfish place where people avoid truth and responsibility by choosing a scapegoat. I am poison; everything that exists around me is destined to wither. I deserve to be alone because my curse acts as a weapon against anyone nearby. In a world this ugly, there is no such thing as love—only the convenience of blame.",
  want: "If the world has cursed me to oblivion, if my destiny is to stop existing, and if my fate is to be forgotten—then I will burn that world down. I will rewrite my destiny and defy fate itself, even if I have to do it entirely alone. I will carve my own place into this earth. I will live and survive for the sole purpose of mocking this world and proving that I alone am enough. To live without a single regret, and show the world how ugly it really is.",
  need: "Kael must confront his past and embrace his nature without letting it break him. He needs to stop defining himself by the fear of others and accept that while people are often selfish and quick to blame, he has the power to adapt. He must realize he is not a monster; he is simply the \"Unknown,\" and the greatest fear people have is the fear of what they do not understand. He needs to learn that happiness is found in how he chooses to exist among others, not in hiding from them.",
  truth: "Faced with the reality that he cannot resolve his condition alone, Kael must choose to share a mutual bond with another person. To do this, he must re-evaluate his entire ideology and face his trauma head-on. The ultimate truth he must accept is that he is not defined by the mark on his hand, the weight of his curse, or the pain of his past. He is defined solely by what he chooses to be in the present.",
  designing_principle: "A boy who moves through the periphery of the world, dressed in the grit of survival, talking to the inanimate to avoid the \"poison\" of human touch.",
  moral_problem: "Is it justified to become something monstrous in order to survive?",
  worthy_cause: "reject this world and rewrite my destiny, I will live and survive for the sole purpose of mocking this world and proving that I alone am enough. I will live without a single regret, a walking mirror showing this world exactly how ugly it really is.",
  personality_traits: [
    {
      title: "Audacity",
      description: "Kael operates with a reckless, manic energy because he has already survived the \"worst-case scenario.\" To him, the boy who could feel fear died in that burning house; what remains is a ghost that cannot be threatened. He does whatever he wants while laughing. He is already alone, already hated, and already \"gone\"—so he treats life like a game where the rules no longer apply to him.",
    },
    {
      title: "The \"No-Touch\" Mania",
      description: "Born from years of beatings and the betrayal of the girl he loved, Kael has developed a pathological revulsion to human contact. He moves with a frantic, liquid grace, avoiding the reach of others as if it were a lethal infection. He masks this deep-seated fear of abuse by avoiding the touch of others. He keeps the world at arm's length to ensure no human hand can ever hurt him again.",
    },
    {
      title: "The Sovereign’s Court",
      description: "Kael has abandoned the \"meat-vehicles\" (humans) for the only companions that never lie: inanimate objects. He talks to his shoes, his clothes, and his daggers with an intimate, witty intensity. To him, they are the only things in life that will stay with him until the end, unaffected by his curse and incapable of betrayal. They are his council, his friends, and the only audience that matters in his private, mad theater.",
    },
    {
      title: "The Spiteful Strategist",
      description: "Kael uses his lack of fear to bend the world to his will. He is audacious, witty, and utterly petty toward those who cross him. He carries grudges like holy relics, taking a spiteful joy in dismantling his enemies. Because nothing holds him back, he will destroy anything that attempts to tether or restrain him. He chooses to do it all while laughing, because the only other alternative is to die screaming—and he’s already done enough of that.",
    },
    {
      title: "The Divine Cynic",
      description: "After watching his world burn under the silent gaze of the Sun, Kael has discarded every shred of divinity. He doesn't just disbelieve; he is actively hostile toward the concept of the Sun God. To Kael, the Sun is not a father or a protector—it is a celestial eye that watched his abuse and did nothing. He views worshippers as pathetic idiots, priests as predatory con artists, and the entire religion as a grand lie designed to give small-minded people a reason to hate what they don't understand.",
    },
  ],
  theme: {
    lie_based: "I am poison. Anyone close to me will suffer—so I’ll survive alone, no matter what this world decides.",
    truth_based: "I am not poison. I choose who I become—and I don’t have to stand alone, no matter what this world decides.",
  },
  contradictions: [
    {
      left: "Reserved",
      right: "Reckless",
      description: "He is naturally quiet and observant, but because he has \"already died once,\" he throws himself into deadly situations with a manic laugh just to see if the world can actually finish him off.",
    },
    {
      left: "Shy/Humble",
      right: "Bold/Audacious",
      description: "Deep down, he’s still the boy who was kicked in the dirt, but he masks that vulnerability with a loud, theatrical arrogance. He’ll bow mockingly to a King because he knows the King’s \"divine\" authority is a lie.",
    },
    {
      left: "Compassionate(towards objects)",
      right: "Ruthless(to enemies)",
      description: "He will spend an hour whispering comfort to a cracked tea-cup or a stray dog, but he will watch an enemy burn without blinking. He gives his empathy to things that can’t betray him.",
    },
    {
      left: "Brilliant",
      right: "Impulsive",
      description: "He can calculate a social \"heist\" or a tactical escape in seconds, but he’ll throw the whole plan away if someone insults his \"friends\" (his objects) or mentions the Sun God.",
    },
    {
      left: "Truthful",
      right: "Deceptive",
      description: "He cannot tolerate the \"Lies\" of religion or society, yet he lives a lie every day by pretending he doesn't care about humans. He is honest about the world's ugliness but deceptive about his own pain.",
    },
    {
      left: "Protective",
      right: "Self Endagering",
      description: "He will risk his life to retrieve a \"loyal\" dagger from a fire, showing a fierce protective streak for the only things he trusts, even while claiming his own life has no value.(also humans later.)",
    },
    {
      left: "Forgiving",
      right: "Spiteful & Grudgy",
      description: "He might forgive a stray cat for scratching him, but he keeps a \"Mental Ledger\" of every human slight. He doesn't just want to win; he wants his enemies to realize they were wrong.",
    },
  ],
  pinned: false,
  order: 0,
});

const buildLunaCharacter = (): Character => {
  const kael = buildKaelCharacter();

  return {
    ...kael,
    id: "luna-default",
    name: "luna",
    order: 1,
  };
};

const CHARACTER_SEED_VERSION = 3;

const buildDefaultCharacters = (): Character[] => [buildKaelCharacter(), buildLunaCharacter()];

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const toBoolean = (value: unknown): boolean => value === true;

const isCharacterType = (value: unknown): value is CharacterType =>
  typeof value === "string" && CHARACTER_TYPES.includes(value as CharacterType);

const normalizeTrait = (value: unknown): PersonalityTrait => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    title: toText(record.title),
    description: toText(record.description),
  };
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
  const name = toText(record.name);

  return {
    id: toText(record.id) || crypto.randomUUID(),
    name,
    type: isCharacterType(record.type) ? record.type : name === "Kael" ? "Main Character" : "",
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
      ? record.personality_traits.map(normalizeTrait)
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

const syncCharacters = (value: unknown, includeDefaults: boolean): Character[] => {
  const normalized = Array.isArray(value) ? value.map((character, index) => normalizeCharacter(character, index)) : [];
  const withDefaults = includeDefaults
    ? [
        ...buildDefaultCharacters().filter(
          (candidate) =>
            !normalized.some((character) => character.id === candidate.id || character.name === candidate.name)
        ),
        ...normalized,
      ]
    : normalized;

  return assignCharacterOrder(sortCharacters(withDefaults));
};

const cloneCharacter = (character: Character): Character => ({
  ...character,
  personality_traits: character.personality_traits.map((trait) => ({ ...trait })),
  theme: { ...character.theme },
  contradictions: character.contradictions.map((contradiction) => ({ ...contradiction })),
});

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
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 md:px-5 md:py-5 space-y-4">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between px-0 py-0 h-auto hover:bg-transparent font-mono"
        >
          <span className={cn("text-sm uppercase tracking-[0.2em]", accentClass)}>{title}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 ease-in-out group-data-[state=open]/profile-section:rotate-180" />
        </Button>
      </CollapsibleTrigger>
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
    <p className={cn("text-sm leading-7 whitespace-pre-wrap", value ? "text-foreground" : "text-muted-foreground")}>
      {value || "Not set yet."}
    </p>
  </div>
);

const CharacterLab = () => {
  const [storedCharacters, setStoredCharacters] = useLocalStorage<unknown[]>("writeforge-characters", buildDefaultCharacters());
  const [characterSeedVersion, setCharacterSeedVersion] = useLocalStorage<number>("writeforge-character-seed-version", 0);
  const [editing, setEditing] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(true);
  const [viewingCharacterId, setViewingCharacterId] = useState<string | null>(null);
  const [profileSections, setProfileSections] = useState<Record<ProfileSectionKey, boolean>>(defaultProfileSections());
  const [filterType, setFilterType] = useState<CharacterViewFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedCharacterId, setDraggedCharacterId] = useState<string | null>(null);
  const [dragOverCharacterId, setDragOverCharacterId] = useState<string | null>(null);
  const [removingTraitIndex, setRemovingTraitIndex] = useState<number | null>(null);
  const [removingContradictionIndex, setRemovingContradictionIndex] = useState<number | null>(null);

  const characters = syncCharacters(storedCharacters, false);
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
  const viewingCharacter = characters.find((character) => character.id === viewingCharacterId) || null;
  const pinnedCount = characters.filter((character) => character.pinned).length;

  useEffect(() => {
    setStoredCharacters((prev) => {
      const synced = syncCharacters(prev, characterSeedVersion < CHARACTER_SEED_VERSION);
      return JSON.stringify(prev) === JSON.stringify(synced) ? prev : synced;
    });

    if (characterSeedVersion < CHARACTER_SEED_VERSION) {
      setCharacterSeedVersion(CHARACTER_SEED_VERSION);
    }
  }, [characterSeedVersion, setCharacterSeedVersion, setStoredCharacters]);

  useEffect(() => {
    if (!viewingCharacterId) return;

    const stillVisible = visibleCharacters.some((character) => character.id === viewingCharacterId);

    if (!stillVisible) {
      setViewingCharacterId(null);
      setProfileSections(defaultProfileSections());
    }
  }, [viewingCharacterId, visibleCharacters]);

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
        : prev
    );
  };

  const updateTrait = (index: number, field: keyof PersonalityTrait, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const nextTraits = prev.personality_traits.map((trait, traitIndex) =>
        traitIndex === index ? { ...trait, [field]: value } : trait
      );

      return { ...prev, personality_traits: nextTraits };
    });
  };

  const updateContradiction = (index: number, field: keyof Contradiction, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const nextContradictions = prev.contradictions.map((contradiction, contradictionIndex) =>
        contradictionIndex === index ? { ...contradiction, [field]: value } : contradiction
      );

      return { ...prev, contradictions: nextContradictions };
    });
  };

  const addTrait = () => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            personality_traits: [...prev.personality_traits, emptyTrait()],
          }
        : prev
    );
  };

  const removeTrait = (index: number) => {
    setRemovingTraitIndex(index);

    window.setTimeout(() => {
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              personality_traits: prev.personality_traits.filter((_, traitIndex) => traitIndex !== index),
            }
          : prev
      );
      setRemovingTraitIndex(null);
    }, 180);
  };

  const addContradiction = () => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            contradictions: [...prev.contradictions, emptyContradiction()],
          }
        : prev
    );
  };

  const removeContradiction = (index: number) => {
    setRemovingContradictionIndex(index);

    window.setTimeout(() => {
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              contradictions: prev.contradictions.filter((_, contradictionIndex) => contradictionIndex !== index),
            }
          : prev
      );
      setRemovingContradictionIndex(null);
    }, 180);
  };

  const save = () => {
    if (!editing || !editing.name.trim() || !editing.type) return;

    const nextEditing = cloneCharacter(editing);

    setStoredCharacters((prev) => {
      const normalized = syncCharacters(prev, false);
      const idx = normalized.findIndex((character) => character.id === nextEditing.id);

      if (idx >= 0) {
        const copy = [...normalized];
        copy[idx] = nextEditing;
        return assignCharacterOrder(sortCharacters(copy));
      }

      return assignCharacterOrder(sortCharacters([...normalized, { ...nextEditing, order: normalized.length }]));
    });

    setViewingCharacterId(nextEditing.id);
    setProfileSections(defaultProfileSections());
    setEditing(null);
    setShowForm(false);
    setAdditionalOpen(true);
    setRemovingTraitIndex(null);
    setRemovingContradictionIndex(null);
  };

  const remove = (id: string) => {
    setStoredCharacters((prev) => assignCharacterOrder(syncCharacters(prev, false).filter((character) => character.id !== id)));

    if (viewingCharacterId === id) {
      setViewingCharacterId(null);
      setProfileSections(defaultProfileSections());
    }

    if (editing?.id === id) {
      setEditing(null);
      setShowForm(false);
    }
  };

  const togglePinned = (id: string) => {
    setStoredCharacters((prev) =>
      assignCharacterOrder(
        sortCharacters(
          syncCharacters(prev, false).map((character) =>
            character.id === id ? { ...character, pinned: !character.pinned } : character
          )
        )
      )
    );
  };

  const moveToTop = (id: string) => {
    setStoredCharacters((prev) => {
      const ordered = [...syncCharacters(prev, false)];
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
      const ordered = [...syncCharacters(prev, false)];
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
    setEditing(emptyChar());
    setShowForm(true);
    setAdditionalOpen(true);
    setRemovingTraitIndex(null);
    setRemovingContradictionIndex(null);
  };

  const startEdit = (character: Character) => {
    setEditing(cloneCharacter(character));
    setShowForm(true);
    setAdditionalOpen(true);
    setRemovingTraitIndex(null);
    setRemovingContradictionIndex(null);
  };

  const cancel = () => {
    setEditing(null);
    setShowForm(false);
    setAdditionalOpen(true);
    setRemovingTraitIndex(null);
    setRemovingContradictionIndex(null);
  };

  const toggleViewingCharacter = (id: string) => {
    setViewingCharacterId((prev) => (prev === id ? null : id));
    setProfileSections(defaultProfileSections());
  };

  const setProfileSectionOpen = (section: ProfileSectionKey, open: boolean) => {
    setProfileSections((prev) => ({ ...prev, [section]: open }));
  };

  const handleCharacterKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    toggleViewingCharacter(id);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Character Lab</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">Craft, organize, and reference your characters.</p>
        </div>
        <Button onClick={startNew} className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New Character
        </Button>
      </div>

      {showForm && editing && (
        <Card className="glow-card glow-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-base">{characters.find((character) => character.id === editing.id) ? "Edit" : "New"} Character</CardTitle>
            <Button variant="ghost" size="icon" onClick={cancel}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="font-mono text-xs">Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => updateEditing({ name: e.target.value })}
                  placeholder="Character name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="font-mono text-xs">Character Type</Label>
                <Select value={editing.type} onValueChange={(value) => updateEditing({ type: value as CharacterType })}>
                  <SelectTrigger className="mt-1">
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

            <Collapsible open={additionalOpen} onOpenChange={setAdditionalOpen} className="group/additional-info">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-1 font-mono text-xs text-muted-foreground hover:text-foreground">
                  Additional Information
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 ease-in-out group-data-[state=open]/additional-info:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan">Core Narrative</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="font-mono text-xs">Logline</Label>
                      <Textarea value={editing.logline} onChange={(e) => updateEditing({ logline: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Ghost</Label>
                      <Textarea value={editing.ghost} onChange={(e) => updateEditing({ ghost: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Lie</Label>
                      <Textarea value={editing.lie} onChange={(e) => updateEditing({ lie: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Want</Label>
                      <Textarea value={editing.want} onChange={(e) => updateEditing({ want: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Need</Label>
                      <Textarea value={editing.need} onChange={(e) => updateEditing({ need: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="font-mono text-xs">Truth</Label>
                      <Textarea value={editing.truth} onChange={(e) => updateEditing({ truth: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-neon-pink">Structural Identity</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-mono text-xs">Designing Principle</Label>
                      <Textarea value={editing.designing_principle} onChange={(e) => updateEditing({ designing_principle: e.target.value })} className="mt-1 min-h-[100px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Moral Problem</Label>
                      <Textarea value={editing.moral_problem} onChange={(e) => updateEditing({ moral_problem: e.target.value })} className="mt-1 min-h-[100px]" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="font-mono text-xs">Worthy Cause</Label>
                      <Textarea value={editing.worthy_cause} onChange={(e) => updateEditing({ worthy_cause: e.target.value })} className="mt-1 min-h-[110px]" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-neon-purple">Personality Traits</p>
                    <Button variant="outline" size="sm" className="font-mono gap-2" onClick={addTrait}>
                      <Plus className="h-3.5 w-3.5" /> Add Trait
                    </Button>
                  </div>

                  {editing.personality_traits.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono">No traits yet. Add one to build the character voice.</p>
                  ) : (
                    <div className="space-y-3">
                      {editing.personality_traits.map((trait, index) => (
                        <div
                          key={`${index}-${trait.title}-${trait.description}`}
                          className={cn(
                            "rounded-lg border border-border bg-muted/20 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200",
                            removingTraitIndex === index && "animate-out fade-out-0 zoom-out-95 duration-200 pointer-events-none opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trait {index + 1}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTrait(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div>
                            <Label className="font-mono text-xs">Trait Title</Label>
                            <Input value={trait.title} onChange={(e) => updateTrait(index, "title", e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="font-mono text-xs">Description</Label>
                            <Textarea value={trait.description} onChange={(e) => updateTrait(index, "description", e.target.value)} className="mt-1 min-h-[100px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan">Theme</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-mono text-xs">Lie-Based Theme</Label>
                      <Textarea value={editing.theme.lie_based} onChange={(e) => updateTheme("lie_based", e.target.value)} className="mt-1 min-h-[100px]" />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">Truth-Based Theme</Label>
                      <Textarea value={editing.theme.truth_based} onChange={(e) => updateTheme("truth_based", e.target.value)} className="mt-1 min-h-[100px]" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-wider text-neon-pink">Contradictions</p>
                    <Button variant="outline" size="sm" className="font-mono gap-2" onClick={addContradiction}>
                      <Plus className="h-3.5 w-3.5" /> Add Contradiction
                    </Button>
                  </div>

                  {editing.contradictions.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono">No contradictions yet. Add one to sharpen internal conflict.</p>
                  ) : (
                    <div className="space-y-3">
                      {editing.contradictions.map((contradiction, index) => (
                        <div
                          key={`${index}-${contradiction.left}-${contradiction.right}-${contradiction.description}`}
                          className={cn(
                            "rounded-lg border border-border bg-muted/20 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200",
                            removingContradictionIndex === index && "animate-out fade-out-0 zoom-out-95 duration-200 pointer-events-none opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contradiction {index + 1}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeContradiction(index)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                            <div>
                              <Label className="font-mono text-xs">Left Trait</Label>
                              <Input value={contradiction.left} onChange={(e) => updateContradiction(index, "left", e.target.value)} className="mt-1" />
                            </div>
                            <p className="pt-5 font-mono text-xs text-muted-foreground text-center">---</p>
                            <div>
                              <Label className="font-mono text-xs">Right Trait</Label>
                              <Input value={contradiction.right} onChange={(e) => updateContradiction(index, "right", e.target.value)} className="mt-1" />
                            </div>
                          </div>
                          <div>
                            <Label className="font-mono text-xs">Description</Label>
                            <Textarea value={contradiction.description} onChange={(e) => updateContradiction(index, "description", e.target.value)} className="mt-1 min-h-[100px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={save}
              disabled={!editing.name.trim() || !editing.type}
              className="bg-neon-purple hover:bg-neon-purple/90 font-mono w-full"
            >
              Save Character
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="glow-card glow-border">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4">
            <div>
              <Label className="font-mono text-xs">Search Characters</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, type, or logline"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label className="font-mono text-xs">Filter by Type</Label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as CharacterViewFilter)}>
                <SelectTrigger className="mt-1">
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

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-muted-foreground">
              {visibleCharacters.length} shown • {characters.length} total
            </span>
            <span className="text-muted-foreground">
              {pinnedCount} pinned • drag by the grip to reorder • pin keeps a character on top
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCharacters.map((character) => {
          const isSelected = viewingCharacterId === character.id;
          const isDragOver = dragOverCharacterId === character.id && draggedCharacterId !== character.id;

          return (
            <Card
              key={character.id}
              className={cn(
                "glow-card glow-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                isSelected && "ring-1 ring-neon-purple/60 shadow-[0_0_24px_hsl(var(--neon-purple)/0.12)]",
                isDragOver && "border-neon-cyan/80 shadow-[0_0_20px_hsl(var(--neon-cyan)/0.18)]"
              )}
              onDragOver={(event) => handleDragOver(event, character.id)}
              onDrop={(event) => handleDrop(event, character.id)}
              onDragLeave={() => {
                if (dragOverCharacterId === character.id) setDragOverCharacterId(null);
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleViewingCharacter(character.id)}
                onKeyDown={(event) => handleCharacterKeyDown(event, character.id)}
                className="cursor-pointer outline-none"
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      draggable
                      onDragStart={(event) => handleDragStart(event, character.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(event) => event.stopPropagation()}
                      className="h-8 w-8 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg truncate">{character.name}</CardTitle>
                        {character.pinned && (
                          <span className="rounded-full border border-neon-pink/40 bg-neon-pink/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-neon-pink">
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-neon-cyan">{character.type || "Character Type Unset"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-7 w-7", character.pinned && "text-neon-pink")}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePinned(character.id);
                      }}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveToTop(character.id);
                      }}
                    >
                      <ArrowUpToLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEdit(character);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(character.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {character.logline && (
                    <div>
                      <span className="font-mono text-xs text-neon-pink">Logline:</span>
                      <p className="mt-1 text-muted-foreground leading-relaxed [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                        {character.logline}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 text-xs font-mono">
                    <span className="text-neon-purple">
                      {character.personality_traits.length} traits • {character.contradictions.length} contradictions
                    </span>
                    <span className={isSelected ? "text-neon-cyan" : "text-muted-foreground"}>
                      {isSelected ? "Reading profile below" : "Open profile"}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}

        {visibleCharacters.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground font-mono text-sm">
            {characters.length === 0 ? "No characters yet. Create your first one!" : "No characters match the current search or filter."}
          </div>
        )}
      </div>

      {viewingCharacter && (
        <Card className="glow-card glow-border">
          <CardHeader className="border-b border-border/80 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Character Reader</p>
                <CardTitle className="text-2xl">{viewingCharacter.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-neon-cyan">{viewingCharacter.type || "Character Type Unset"}</span>
                  {viewingCharacter.pinned && <span className="text-neon-pink">Pinned</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", viewingCharacter.pinned && "text-neon-pink")}
                  onClick={() => togglePinned(viewingCharacter.id)}
                >
                  <Pin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(viewingCharacter)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleViewingCharacter(viewingCharacter.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="mx-auto w-full max-w-[800px] px-4 md:px-6 space-y-5">
              <CharacterSection
                title="Core Narrative"
                accentClass="text-neon-cyan"
                open={profileSections.core}
                onOpenChange={(open) => setProfileSectionOpen("core", open)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingCharacter.personality_traits.map((trait, index) => (
                      <div key={`${viewingCharacter.id}-trait-${index}`} className="rounded-lg border border-border/70 bg-background/30 p-4 space-y-2">
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">{trait.title || `Trait ${index + 1}`}</p>
                        <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">{trait.description || "No description yet."}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div key={`${viewingCharacter.id}-contradiction-${index}`} className="rounded-lg border border-border/70 bg-background/30 p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
                          <span className="text-neon-purple">{contradiction.left || "Left Trait"}</span>
                          <span className="text-muted-foreground/70">---</span>
                          <span className="text-neon-cyan">{contradiction.right || "Right Trait"}</span>
                        </div>
                        <div className="h-px w-full bg-border/70" />
                        <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">
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
