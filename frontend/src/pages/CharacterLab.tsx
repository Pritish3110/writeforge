import { type DragEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate } from "react-router-dom";
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
import { ArrowUpToLine, ChevronDown, Edit2, GripVertical, Pin, Plus, Search, Trash2, X } from "lucide-react";

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

const CHARACTER_TYPES: CharacterType[] = ["Main Character", "Side Character", "Activity Character"];
const CHARACTER_FILTERS: CharacterViewFilter[] = ["All", ...CHARACTER_TYPES];

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
  const name = toText(record.name);

  return {
    id: toText(record.id) || crypto.randomUUID(),
    name,
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
    <p className={cn("text-sm leading-7 whitespace-pre-wrap", value ? "text-foreground" : "text-muted-foreground")}>
      {value || "Not set yet."}
    </p>
  </div>
);

const CharacterLab = () => {
  const navigate = useNavigate();
  const newRouteMatch = useMatch("/character-lab/new");
  const editRouteMatch = useMatch("/character-lab/:characterId/edit");
  const profileRouteMatch = useMatch("/character-lab/:characterId");
  const confirmDelete = useDeleteConfirmation();
  const [storedCharacters, setStoredCharacters] = useLocalStorage<unknown[]>("writeforge-characters", buildDefaultCharacters());
  const [editing, setEditing] = useState<Character | null>(null);
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [profileSections, setProfileSections] = useState<Record<ProfileSectionKey, boolean>>(defaultProfileSections());
  const [filterType, setFilterType] = useState<CharacterViewFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedCharacterId, setDraggedCharacterId] = useState<string | null>(null);
  const [dragOverCharacterId, setDragOverCharacterId] = useState<string | null>(null);
  const [removingTraitId, setRemovingTraitId] = useState<string | null>(null);
  const [removingContradictionIndex, setRemovingContradictionIndex] = useState<number | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const readerCardRef = useRef<HTMLDivElement | null>(null);

  const isNewRoute = Boolean(newRouteMatch);
  const editCharacterId = editRouteMatch?.params.characterId ?? null;
  const profileCharacterId = profileRouteMatch?.params.characterId ?? null;
  const characters = useMemo(() => syncCharacters(storedCharacters), [storedCharacters]);
  const activeCharacterId = isNewRoute
    ? null
    : editCharacterId ?? profileCharacterId;
  const showForm = isNewRoute || Boolean(editCharacterId);
  const viewingCharacterId = activeCharacterId;
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
  const viewingCharacter =
    editRouteMatch ? null : characters.find((character) => character.id === viewingCharacterId) || null;
  const pinnedCount = characters.filter((character) => character.pinned).length;

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
      setAdditionalOpen(false);
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
      setAdditionalOpen(false);
      setRemovingTraitId(null);
      setRemovingContradictionIndex(null);
      return;
    }

    setEditing(null);
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

  useEffect(() => {
    if (!showForm || !editing || !formCardRef.current) return;

    const formCard = formCardRef.current;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animationFrame = window.requestAnimationFrame(() => {
      formCard.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      formCard.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [editing?.id, showForm]);

  useEffect(() => {
    if (!viewingCharacter || editRouteMatch || !readerCardRef.current) return;

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
  }, [editRouteMatch, viewingCharacter?.id]);

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

  const updateTrait = (id: string, field: Exclude<keyof PersonalityTrait, "id">, value: string) => {
    setEditing((prev) => {
      if (!prev) return prev;

      const nextTraits = prev.personality_traits.map((trait) => (trait.id === id ? { ...trait, [field]: value } : trait));

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
          : prev
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
        : prev
    );
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

    navigate(`/character-lab/${nextEditing.id}`);
    setProfileSections(defaultProfileSections());
    setEditing(null);
    setAdditionalOpen(true);
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

    setStoredCharacters((prev) => assignCharacterOrder(syncCharacters(prev, false).filter((character) => character.id !== id)));

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
    setAdditionalOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
    navigate("/character-lab/new");
  };

  const startEdit = (character: Character) => {
    setEditing(cloneCharacter(character));
    setAdditionalOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
    navigate(`/character-lab/${character.id}/edit`);
  };

  const cancel = () => {
    const fallbackRoute = editing && characters.some((character) => character.id === editing.id)
      ? `/character-lab/${editing.id}`
      : "/character-lab";
    setEditing(null);
    setAdditionalOpen(false);
    setRemovingTraitId(null);
    setRemovingContradictionIndex(null);
    navigate(fallbackRoute);
  };

  const toggleViewingCharacter = (id: string) => {
    navigate(viewingCharacterId === id && !editRouteMatch ? "/character-lab" : `/character-lab/${id}`);
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
        <Card ref={formCardRef} tabIndex={-1} className="glow-card glow-border scroll-mt-6 outline-none">
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
                          key={trait.id}
                          className={cn(
                            "rounded-lg border border-border bg-muted/20 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200",
                            removingTraitId === trait.id && "animate-out fade-out-0 zoom-out-95 duration-200 pointer-events-none opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trait {index + 1}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void removeTrait(trait.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div>
                            <Label className="font-mono text-xs">Trait Title</Label>
                            <Input value={trait.title} onChange={(e) => updateTrait(trait.id, "title", e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="font-mono text-xs">Description</Label>
                            <Textarea value={trait.description} onChange={(e) => updateTrait(trait.id, "description", e.target.value)} className="mt-1 min-h-[100px]" />
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
                          key={`${editing.id}-contradiction-${index}`}
                          className={cn(
                            "rounded-lg border border-border bg-muted/20 p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-200",
                            removingContradictionIndex === index && "animate-out fade-out-0 zoom-out-95 duration-200 pointer-events-none opacity-50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contradiction {index + 1}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void removeContradiction(index)}>
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
                        void remove(character.id);
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
        <Card ref={readerCardRef} tabIndex={-1} className="glow-card glow-border scroll-mt-6 outline-none">
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
                      <div key={`${viewingCharacter.id}-trait-${trait.id}`} className="rounded-lg border border-border/70 bg-background/30 p-4 space-y-2">
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
