import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import { writeStoredJsonValue } from "@/lib/backend/storageAdapter";
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Edit2,
  Lock,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  WORLD_CATEGORIES,
  formatWorldCategoryLabel,
  formatWorldElementLabel,
  generateWorldElementPrompt,
  getRandomWorldSelection,
  getWorldElementsForCategory,
  type GeneratedWorldElementPrompt,
  type WorldCategory,
} from "@/data/worldEngine";
import {
  WORLD_ELEMENTS_STORAGE_KEY,
  buildWorldElementRecord,
  countFilledWorldSections,
  createEmptyWorldElementContent,
  readStoredWorldElements,
  storeWorldElementSceneReference,
  suggestWorldElementTitle,
  type WorldElementContent,
  type WorldElementRecord,
} from "@/lib/worldElements";

const WORLD_SECTIONS: Array<{
  key: keyof WorldElementContent;
  label: string;
  placeholder: string;
}> = [
  {
    key: "concept",
    label: "Core Concept",
    placeholder: "What is this element?",
  },
  {
    key: "mechanics",
    label: "Mechanics",
    placeholder: "How does it work?",
  },
  {
    key: "impact",
    label: "Impact",
    placeholder: "Who does it affect?",
  },
  {
    key: "tradeoffs",
    label: "Trade-offs",
    placeholder: "What are the costs, risks, or consequences?",
  },
  {
    key: "storyUse",
    label: "Story Use",
    placeholder: "How can this be used in a narrative?",
  },
];

const formatSavedDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const sortWorldElements = (records: WorldElementRecord[]) =>
  [...records].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

const WorldElementDesigner = ({ showIntro = true }: { showIntro?: boolean }) => {
  const confirmDelete = useDeleteConfirmation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<WorldCategory>("physical");
  const [selectedElement, setSelectedElement] = useState<string>(getWorldElementsForCategory("physical")[0]);
  const [elementPickerOpen, setElementPickerOpen] = useState(false);
  const [lockPromptSync, setLockPromptSync] = useState(false);
  const [title, setTitle] = useState("");
  const [titleAutoMode, setTitleAutoMode] = useState<"manual" | "concept" | "prompt">("manual");
  const [content, setContent] = useState<WorldElementContent>(() => createEmptyWorldElementContent());
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedWorldElementPrompt | null>(null);
  const [savedElements, setSavedElements] = useState<WorldElementRecord[]>(() => readStoredWorldElements());
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const categoryElements = useMemo(
    () =>
      Array.from(
        new Set([...getWorldElementsForCategory(selectedCategory), selectedElement].filter(Boolean)),
      ),
    [selectedCategory, selectedElement],
  );
  const filledSections = countFilledWorldSections(content);
  const completionPercent = Math.round((filledSections / WORLD_SECTIONS.length) * 100);
  const titleSuggestion = suggestWorldElementTitle(content.concept);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("World engine mounted");
    }
  }, []);

  useEffect(() => {
    if (!categoryElements.includes(selectedElement)) {
      setSelectedElement(categoryElements[0]);
    }
  }, [categoryElements, selectedElement]);

  useEffect(() => {
    writeStoredJsonValue(WORLD_ELEMENTS_STORAGE_KEY, savedElements);
  }, [savedElements]);

  useEffect(() => {
    if (!titleSuggestion) return;
    if (!(titleAutoMode === "concept" || title.trim().length === 0)) return;

    if (title !== titleSuggestion) {
      setTitle(titleSuggestion);
    }
    setTitleAutoMode("concept");
  }, [title, titleAutoMode, titleSuggestion]);

  const groupedElements = useMemo(() => {
    return WORLD_CATEGORIES.map((category) => {
      const categoryRecords = savedElements.filter((record) => record.category === category);
      const orderedElements = Array.from(
        new Set([...getWorldElementsForCategory(category), ...categoryRecords.map((record) => record.element)]),
      );

      return {
        category,
        groups: orderedElements
          .map((element) => ({
            element,
            items: categoryRecords.filter((record) => record.element === element),
          }))
          .filter((group) => group.items.length > 0),
      };
    }).filter((group) => group.groups.length > 0);
  }, [savedElements]);

  const resetEditor = (preserveSelection = true) => {
    setActiveElementId(null);
    setElementPickerOpen(false);
    setTitle("");
    setTitleAutoMode("manual");
    setContent(createEmptyWorldElementContent());
    setGeneratedPrompt(null);

    if (!preserveSelection) {
      setSelectedCategory("physical");
      setSelectedElement(getWorldElementsForCategory("physical")[0]);
    }
  };

  const updateContent = (key: keyof WorldElementContent, value: string) => {
    setContent((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    const nextCategory = value as WorldCategory;
    const nextCategoryElements = getWorldElementsForCategory(nextCategory);
    setSelectedCategory(nextCategory);
    setSelectedElement((prev) =>
      nextCategoryElements.includes(prev) ? prev : nextCategoryElements[0],
    );
    setElementPickerOpen(false);

    if (titleAutoMode === "prompt" && !content.concept.trim()) {
      setTitle("");
      setTitleAutoMode("manual");
    }
  };

  const handleElementChange = (element: string) => {
    setSelectedElement(element);
    setElementPickerOpen(false);
  };

  const handleGeneratePrompt = () => {
    const result = generateWorldElementPrompt({
      category: selectedCategory,
      element: selectedElement,
    });
    setGeneratedPrompt(result);
    setSelectedCategory(result.category);
    setSelectedElement(result.element);
    setElementPickerOpen(false);
    setTitle(result.title);
    setTitleAutoMode("prompt");

    if (!lockPromptSync) {
      setContent((prev) => ({
        ...prev,
        concept: result.core,
        mechanics: result.mechanic,
        impact: result.impact,
        tradeoffs: result.consequence,
      }));
    }

    if (result.recycledPool) {
      toast.success("World prompt history refreshed", {
        description: "The world-element engine reset its no-repeat history after exhausting the active pool.",
      });
    } else {
      toast.success("World element prompt generated");
    }
  };

  const handleRandomElement = () => {
    const randomSelection = getRandomWorldSelection();
    setSelectedCategory(randomSelection.category);
    setSelectedElement(randomSelection.element);
    setElementPickerOpen(false);
    setGeneratedPrompt(null);

    if (titleAutoMode === "prompt" && !content.concept.trim()) {
      setTitle("");
      setTitleAutoMode("manual");
    }

    toast.success("Random world element selected", {
      description: `${formatWorldCategoryLabel(randomSelection.category)} · ${formatWorldElementLabel(randomSelection.element)}`,
    });
  };

  const handleSave = () => {
    if (filledSections === 0) {
      toast.error("Fill at least one section before saving");
      return;
    }

    const now = new Date().toISOString();
    const existingRecord = activeElementId
      ? savedElements.find((record) => record.id === activeElementId) || null
      : null;
    const normalizedContent: WorldElementContent = {
      concept: content.concept.trim(),
      mechanics: content.mechanics.trim(),
      impact: content.impact.trim(),
      tradeoffs: content.tradeoffs.trim(),
      storyUse: content.storyUse.trim(),
    };
    const normalizedTitle =
      title.trim() ||
      suggestWorldElementTitle(normalizedContent.concept) ||
      generatedPrompt?.title ||
      formatWorldElementLabel(selectedElement);

    const nextRecord = buildWorldElementRecord({
      id: existingRecord?.id || crypto.randomUUID(),
      category: selectedCategory,
      element: selectedElement,
      title: normalizedTitle,
      content: normalizedContent,
      createdAt: existingRecord?.createdAt || now,
      updatedAt: now,
      generatedPrompt,
    });

    setSavedElements((prev) => sortWorldElements([nextRecord, ...prev.filter((record) => record.id !== nextRecord.id)]));
    toast.success(existingRecord ? "World element updated" : "World element saved");
    resetEditor(true);
  };

  const handleLoad = (record: WorldElementRecord) => {
    setActiveElementId(record.id);
    setElementPickerOpen(false);
    setSelectedCategory(record.category);
    setSelectedElement(record.element);
    setTitle(record.title);
    setTitleAutoMode("manual");
    setContent(record.content);
    setGeneratedPrompt(
      record.prompt || record.breakdown
        ? {
            prompt: record.prompt || "",
            title: record.title,
            category: record.category,
            element: record.element,
            core: record.breakdown?.core || "",
            mechanic: record.breakdown?.mechanic || "",
            impact: record.breakdown?.impact || "",
            consequence: record.breakdown?.consequence || "",
            recycledPool: false,
            usedCount: 0,
          }
        : null,
    );

    toast.success("World element loaded into the editor");
  };

  const handleUseInScene = (record: WorldElementRecord) => {
    storeWorldElementSceneReference(record);
    toast.success("World element sent to Scene Practice");
    navigate("/scene-practice");
  };

  const handleDelete = async (record: WorldElementRecord) => {
    const shouldDelete = await confirmDelete({
      title: `Delete "${record.title}"?`,
      description: "This saved world element will be removed from your library. This action cannot be undone.",
      confirmLabel: "Delete Element",
      badgeLabel: "Delete Element",
    });
    if (!shouldDelete) return;

    setSavedElements((prev) => prev.filter((entry) => entry.id !== record.id));

    if (activeElementId === record.id) {
      resetEditor(true);
    }

    toast.success("World element deleted", {
      description: `${record.title} was removed from your saved world elements.`,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {showIntro ? (
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan">World Element Designer</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shape one story-ready world element with guided notes and prompt support you can revisit later.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-neon-cyan">Structured Editor</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Build reusable world elements and carry them into Scene Practice when you are ready to write with them.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="font-mono gap-2" onClick={handleGeneratePrompt}>
            <Sparkles className="h-4 w-4 text-neon-pink" />
            Generate Prompt
          </Button>
          <Button type="button" variant="outline" size="sm" className="font-mono gap-2" onClick={handleRandomElement}>
            <Shuffle className="h-4 w-4 text-neon-cyan" />
            Random Element
          </Button>
          <Button type="button" variant="outline" size="sm" className="font-mono" onClick={() => resetEditor(false)}>
            New Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label className="font-mono text-xs">Category</Label>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORLD_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {formatWorldCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="font-mono text-xs">Element</Label>
          <Popover open={elementPickerOpen} onOpenChange={setElementPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={elementPickerOpen}
                className="mt-1 w-full justify-between font-normal"
              >
                <span className="truncate">
                  {selectedElement ? formatWorldElementLabel(selectedElement) : "Select element"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-border/70 bg-card/95 p-0 backdrop-blur-sm" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder={`Search ${formatWorldCategoryLabel(selectedCategory)} elements...`} />
                <CommandList className="max-h-60 overflow-y-auto [scrollbar-width:thin]">
                  <CommandEmpty>No matching element found.</CommandEmpty>
                  {categoryElements.map((element) => (
                    <CommandItem
                      key={element}
                      value={`${element} ${formatWorldElementLabel(element)}`}
                      onSelect={() => handleElementChange(element)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{formatWorldElementLabel(element)}</p>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-neon-cyan transition-opacity",
                          selectedElement === element ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground">
            {categoryElements.length} element options available for this category.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Prompt Guidance</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Let Generate Prompt reshape the full draft, or keep your section notes in place while it refreshes the title and selection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lockPromptSync ? (
              <Lock className="h-4 w-4 text-neon-pink" />
            ) : (
              <Unlock className="h-4 w-4 text-neon-cyan" />
            )}
            <Switch checked={lockPromptSync} onCheckedChange={setLockPromptSync} />
          </div>
        </div>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {lockPromptSync ? "Keep my notes in place" : "Let prompts refresh the full draft"}
        </p>
      </div>

      <div>
        <Label className="font-mono text-xs">Title</Label>
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleAutoMode("manual");
          }}
          placeholder="Auto-suggested from Core Concept"
          className="mt-1"
        />
        {titleAutoMode !== "manual" && title.trim() && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">Auto-suggested title</p>
        )}
      </div>

      {generatedPrompt && (
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="mb-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Suggested Title</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">{generatedPrompt.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {formatWorldCategoryLabel(generatedPrompt.category)}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.18em] border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
              {formatWorldElementLabel(generatedPrompt.element)}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {generatedPrompt.core}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {generatedPrompt.mechanic}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {generatedPrompt.impact}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              {generatedPrompt.consequence}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-7">{generatedPrompt.prompt}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Core</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {generatedPrompt.core}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">Mechanic</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {generatedPrompt.mechanic}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Impact</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {generatedPrompt.impact}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 p-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Consequence</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {generatedPrompt.consequence}
              </p>
            </div>
          </div>
          {lockPromptSync && (
            <p className="mt-3 text-xs text-muted-foreground">
              Your section notes stayed in place while the new prompt refreshed the title and selection.
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Completion</p>
          <p className="font-mono text-xs text-muted-foreground">
            {filledSections}/{WORLD_SECTIONS.length} sections filled
          </p>
        </div>
        <Progress value={completionPercent} className="mt-3 h-2" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {WORLD_SECTIONS.map((section) => (
          <div key={section.key} className={section.key === "storyUse" ? "md:col-span-2" : ""}>
            <Label className="font-mono text-xs">{section.label}</Label>
            <Textarea
              value={content[section.key]}
              onChange={(event) => updateContent(section.key, event.target.value)}
              placeholder={section.placeholder}
              className="mt-1 min-h-[120px] text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          {activeElementId ? "Update Element" : "Save Element"}
        </Button>
        {activeElementId && (
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.18em]">
            Editing saved element
          </Badge>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">World Elements</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved elements stay local for now, grouped by category and ready for future Lore Library integration.
          </p>
        </div>

        {groupedElements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/30 p-4 text-sm text-muted-foreground">
            Save a world element to start building your reusable knowledge base.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedElements.map((categoryGroup) => (
              <div key={categoryGroup.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    {formatWorldCategoryLabel(categoryGroup.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {categoryGroup.groups.reduce((count, group) => count + group.items.length, 0)} saved
                  </span>
                </div>

                {categoryGroup.groups.map((elementGroup) => (
                  <div key={`${categoryGroup.category}-${elementGroup.element}`} className="rounded-lg border border-border bg-background/30 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-medium">{formatWorldElementLabel(elementGroup.element)}</p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {elementGroup.items.length} item{elementGroup.items.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <Accordion type="multiple" className="space-y-2">
                      {elementGroup.items.map((record) => (
                        <AccordionItem
                          key={record.id}
                          value={record.id}
                          className="rounded-lg border border-border/70 bg-background/50 px-3"
                        >
                          <div className="flex items-start justify-between gap-3 py-3">
                            <AccordionTrigger className="py-0 hover:no-underline flex-1 items-start">
                              <div className="text-left">
                                <p className="font-semibold text-sm">{record.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-[0.18em]">
                                    {formatWorldCategoryLabel(record.category)}
                                  </Badge>
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    Last edited {formatSavedDate(record.updatedAt)}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>

                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 font-mono" onClick={() => handleLoad(record)}>
                                <Edit2 className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 font-mono" onClick={() => handleUseInScene(record)}>
                                <BookOpen className="mr-1 h-3.5 w-3.5" />
                                Use in Scene
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${record.title}`}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => void handleDelete(record)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <AccordionContent className="pb-4">
                            {record.prompt && (
                              <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
                                <p className="font-mono text-xs uppercase tracking-wider text-neon-pink">Generated Prompt</p>
                                <p className="mt-2 text-sm leading-7">{record.prompt}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {WORLD_SECTIONS.map((section) => (
                                <div
                                  key={`${record.id}-${section.key}`}
                                  className={section.key === "storyUse" ? "md:col-span-2" : ""}
                                >
                                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                                    {section.label}
                                  </p>
                                  <div className="mt-1 rounded-lg border border-border/70 bg-background/40 p-3 text-sm leading-6 whitespace-pre-wrap">
                                    {record.content[section.key] || "Not filled yet."}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldElementDesigner;
