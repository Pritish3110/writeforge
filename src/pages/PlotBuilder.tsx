import { type DragEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  PLOT_BUILDER_STORAGE_KEY,
  PLOT_PHASES,
  assignPhaseOrder,
  createEmptyPlotPointDraft,
  getPhaseStyle,
  normalizePlotCharacters,
  normalizePlotScenes,
  syncPlotPoints,
  type PlotPhase,
  type PlotPoint,
  type PlotPointDraft,
} from "@/lib/plotBuilder";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import {
  ChevronDown,
  Flame,
  GitFork,
  GripVertical,
  Link2,
  Map as MapIcon,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

const previewClampClass =
  "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]";

const panelSurfaceClass =
  "rounded-2xl border border-border/70 bg-background/60 p-3.5 shadow-[0_16px_34px_hsl(var(--background)/0.28)] backdrop-blur-sm";

const metadataBadgeClass =
  "border-border/60 bg-muted/30 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

const workflowSteps = [
  {
    label: "Start the promise",
    description: "Create the opening beat that tells the reader what kind of story is coming.",
  },
  {
    label: "Build progress",
    description: "Drag beats into Progress as stakes, tension, and complications escalate.",
  },
  {
    label: "Land payoff",
    description: "Select a beat to refine stakes, characters, and foreshadowing in the context panel.",
  },
] as const;

const phaseGuidance: Record<PlotPhase, string> = {
  Promise:
    "Frame the beat, anchor the story promise, and hint at the pressure that will grow from it.",
  Progress:
    "Push the beat forward, connect it to character choices, and intensify the pressure on the story.",
  Payoff:
    "Land the consequence, reveal the payoff, and make the emotional or plot turn feel earned.",
};

type EditorAccordionSection =
  | "stakes"
  | "characters"
  | "scenes"
  | "foreshadowing";

type SidebarMode = "summary" | "draft";

interface SidebarAccordionSectionProps {
  title: string;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  description: string;
  badge?: ReactNode;
}

const SidebarAccordionSection = ({
  title,
  children,
  isOpen,
  onToggle,
  description,
  badge,
}: SidebarAccordionSectionProps) => (
  <div
    className={cn(
      "rounded-xl border border-border/70 bg-background/40 transition-all duration-200",
      isOpen &&
        "border-neon-purple/45 bg-background/70 shadow-[0_0_0_1px_hsl(var(--neon-purple)/0.18),0_16px_34px_hsl(var(--neon-purple)/0.08)]",
    )}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-neon-purple",
          )}
        />
      </div>
    </button>

    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="origin-top border-t border-border/60 px-4 py-3"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  </div>
);

const getConflictTone = (value: number) => {
  if (value < 30) return "Low";
  if (value < 60) return "Moderate";
  if (value < 85) return "High";
  return "Volatile";
};

const toDraft = (point: PlotPoint): PlotPointDraft => ({
  phase: point.phase,
  title: point.title,
  description: point.description,
  characterIds: point.characterIds,
  sceneIds: point.sceneIds,
  stakes: point.stakes,
  conflictLevel: point.conflictLevel,
  foreshadowingIds: point.foreshadowingIds,
});

const readStoredCollection = (key: string): unknown[] => {
  if (typeof window === "undefined") return [];

  try {
    const item = window.localStorage.getItem(key);
    const parsed = item ? JSON.parse(item) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const PlotBuilder = () => {
  const confirmDelete = useDeleteConfirmation();
  const isMobile = useIsMobile();
  const [storedPlotPoints, setStoredPlotPoints] = useLocalStorage<unknown[]>(
    PLOT_BUILDER_STORAGE_KEY,
    [],
  );
  const [storedCharacters] = useState<unknown[]>(() =>
    readStoredCollection("writeforge-characters"),
  );
  const [storedScenes, setStoredScenes] = useState<unknown[] | null>(null);
  const [draft, setDraft] = useState<PlotPointDraft>(createEmptyPlotPointDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [dragOverPointId, setDragOverPointId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<PlotPhase | null>(null);
  const [mode, setMode] = useState<SidebarMode>("summary");
  const [activeEditorSection, setActiveEditorSection] =
    useState<EditorAccordionSection | null>(null);
  const shouldLoadSceneLinks = isCreating || Boolean(editingId);

  const plotPoints = useMemo(
    () => assignPhaseOrder(syncPlotPoints(storedPlotPoints)),
    [storedPlotPoints],
  );
  const characters = useMemo(
    () => normalizePlotCharacters(storedCharacters),
    [storedCharacters],
  );
  const scenes = useMemo(
    () => normalizePlotScenes(storedScenes || []),
    [storedScenes],
  );
  const pointMap = useMemo(
    () => new Map(plotPoints.map((point) => [point.id, point])),
    [plotPoints],
  );

  useEffect(() => {
    if (!shouldLoadSceneLinks || storedScenes !== null) return;
    setStoredScenes(readStoredCollection("writeforge-drafts"));
  }, [shouldLoadSceneLinks, storedScenes]);

  useEffect(() => {
    if (editingId && !pointMap.has(editingId)) {
      setMode("summary");
      setEditingId(null);
      setIsCreating(false);
      setDraft(createEmptyPlotPointDraft());
      setActiveEditorSection(null);
    }
  }, [editingId, pointMap]);

  const phaseBuckets = useMemo(
    () =>
      Object.fromEntries(
        PLOT_PHASES.map((phase) => [
          phase.value,
          plotPoints.filter((point) => point.phase === phase.value),
        ]),
      ) as Record<PlotPhase, PlotPoint[]>,
    [plotPoints],
  );
  const conflictByPhase = useMemo(
    () =>
      PLOT_PHASES.map((phase) => {
        const points = phaseBuckets[phase.value];
        const average =
          points.length > 0
            ? Math.round(
                points.reduce((sum, point) => sum + point.conflictLevel, 0) / points.length,
              )
            : 0;

        return {
          phase: phase.value,
          average,
          count: points.length,
        };
      }),
    [phaseBuckets],
  );

  const foreshadowLinks = useMemo(
    () =>
      plotPoints.flatMap((point) =>
        point.foreshadowingIds
          .map((targetId) => {
            const target = pointMap.get(targetId);
            if (!target) return null;
            return {
              source: point,
              target,
            };
          })
          .filter(Boolean) as Array<{ source: PlotPoint; target: PlotPoint }>,
      ),
    [plotPoints, pointMap],
  );
  const characterUsage = useMemo(
    () =>
      characters
        .map((character) => ({
          ...character,
          count: plotPoints.filter((point) => point.characterIds.includes(character.id)).length,
        }))
        .filter((character) => character.count > 0)
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
        .slice(0, 4),
    [characters, plotPoints],
  );

  const activePoint = editingId ? pointMap.get(editingId) || null : null;
  const contextMode = isCreating ? "create" : activePoint ? "edit" : "summary";
  const averageConflict =
    plotPoints.length > 0
      ? Math.round(
          plotPoints.reduce((sum, point) => sum + point.conflictLevel, 0) / plotPoints.length,
        )
      : 0;
  const sceneLinkedPoints = plotPoints.filter((point) => point.sceneIds.length > 0).length;
  const beatsWithoutForeshadowing = plotPoints.filter(
    (point) => point.foreshadowingIds.length === 0,
  ).length;
  const selectedPhaseStyle = getPhaseStyle(
    activePoint?.phase || draft.phase || PLOT_PHASES[0].value,
  );

  const updateDraft = (update: Partial<PlotPointDraft>) => {
    setDraft((prev) => ({ ...prev, ...update }));
  };

  const toggleId = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];

  const openSummaryPanel = () => {
    setMode("summary");
    setEditingId(null);
    setIsCreating(false);
    setDraft(createEmptyPlotPointDraft());
    setActiveEditorSection(null);
    setIsContextDrawerOpen(true);
  };

  const clearContextSelection = () => {
    setMode("summary");
    setEditingId(null);
    setIsCreating(false);
    setDraft(createEmptyPlotPointDraft());
    setActiveEditorSection(null);
  };

  const startCreatePoint = (phase: PlotPhase = "Promise") => {
    setMode("draft");
    setEditingId(null);
    setIsCreating(true);
    setDraft({
      ...createEmptyPlotPointDraft(),
      phase,
    });
    setActiveEditorSection(null);

    if (isMobile) {
      setIsContextDrawerOpen(true);
    }
  };

  const openPointDetails = (point: PlotPoint) => {
    setMode("draft");
    setEditingId(point.id);
    setIsCreating(false);
    setDraft(toDraft(point));
    setActiveEditorSection(null);

    if (isMobile) {
      setIsContextDrawerOpen(true);
    }
  };

  const resetDraftChanges = () => {
    if (activePoint) {
      setDraft(toDraft(activePoint));
      return;
    }

    setMode("summary");
    setIsCreating(false);
    setDraft(createEmptyPlotPointDraft());
    setActiveEditorSection(null);
  };

  const savePlotPoint = () => {
    const title = draft.title.trim();
    const description = draft.description.trim();
    const stakes = draft.stakes.trim();

    if (!title) {
      toast.error("Plot point title required");
      return;
    }

    if (!description) {
      toast.error("Plot point description required");
      return;
    }

    const timestamp = new Date().toISOString();
    const pointId = editingId || crypto.randomUUID();

    setStoredPlotPoints((prev) => {
      const normalized = assignPhaseOrder(syncPlotPoints(prev));
      const nextPoint: PlotPoint = {
        id: pointId,
        phase: draft.phase,
        title,
        description,
        characterIds: draft.characterIds,
        sceneIds: draft.sceneIds,
        stakes,
        conflictLevel: draft.conflictLevel,
        foreshadowingIds: draft.foreshadowingIds.filter((targetId) => targetId !== pointId),
        order: 0,
        createdAt:
          normalized.find((point) => point.id === pointId)?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      const existingIndex = normalized.findIndex((point) => point.id === pointId);
      const next =
        existingIndex >= 0
          ? normalized.map((point, index) => (index === existingIndex ? nextPoint : point))
          : [
              ...normalized,
              {
                ...nextPoint,
                order: normalized.filter((point) => point.phase === nextPoint.phase).length,
              },
            ];

      return assignPhaseOrder(next);
    });

    toast.success(editingId ? "Plot point updated" : "Plot point added", {
      description: `${title} is now part of your story board.`,
    });

    setMode("draft");
    setEditingId(pointId);
    setIsCreating(false);

    if (isMobile) {
      setIsContextDrawerOpen(false);
    }
  };

  const deletePlotPoint = async (id: string) => {
    const point = pointMap.get(id);
    const shouldDelete = await confirmDelete({
      title: `Delete "${point?.title || "this plot point"}"?`,
      description: "This plot point will be removed from the board, and any foreshadowing links pointing to it will also be cleared.",
      confirmLabel: "Delete Plot Point",
    });
    if (!shouldDelete) return;

    setStoredPlotPoints((prev) =>
      assignPhaseOrder(
        syncPlotPoints(prev)
          .filter((item) => item.id !== id)
          .map((item) => ({
            ...item,
            foreshadowingIds: item.foreshadowingIds.filter((linkId) => linkId !== id),
          })),
      ),
    );

    if (editingId === id) {
      clearContextSelection();
      if (isMobile) {
        setIsContextDrawerOpen(false);
      }
    }

    toast.success("Plot point removed", {
      description: point?.title || "The selected beat has been deleted.",
    });
  };

  const movePlotPoint = (
    sourceId: string,
    targetPhase: PlotPhase,
    targetId?: string | null,
  ) => {
    setStoredPlotPoints((prev) => {
      const normalized = assignPhaseOrder(syncPlotPoints(prev));
      const source = normalized.find((point) => point.id === sourceId);
      if (!source) return prev;

      const remaining = normalized.filter((point) => point.id !== sourceId);
      const grouped = new Map<PlotPhase, PlotPoint[]>(
        PLOT_PHASES.map((phase) => [
          phase.value,
          remaining.filter((point) => point.phase === phase.value),
        ]),
      );

      const targetColumn = [...(grouped.get(targetPhase) || [])];
      const movedPoint = { ...source, phase: targetPhase };
      const insertIndex =
        targetId != null
          ? Math.max(0, targetColumn.findIndex((point) => point.id === targetId))
          : targetColumn.length;

      targetColumn.splice(insertIndex, 0, movedPoint);
      grouped.set(targetPhase, targetColumn);

      return assignPhaseOrder(
        PLOT_PHASES.flatMap((phase) => grouped.get(phase.value) || []),
      );
    });
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, pointId: string) => {
    setDraggedPointId(pointId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", pointId);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, phase: PlotPhase) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverPhase(phase);
    setDragOverPointId(null);
  };

  const handleDragOverCard = (
    event: DragEvent<HTMLDivElement>,
    phase: PlotPhase,
    pointId: string,
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggedPointId && draggedPointId !== pointId) {
      setDragOverPointId(pointId);
      setDragOverPhase(phase);
    }
  };

  const handleCardDrop = (
    event: DragEvent<HTMLDivElement>,
    phase: PlotPhase,
    pointId: string,
  ) => {
    event.preventDefault();
    const sourceId = draggedPointId || event.dataTransfer.getData("text/plain");
    if (!sourceId) return;

    movePlotPoint(sourceId, phase, pointId);
    setDraggedPointId(null);
    setDragOverPointId(null);
    setDragOverPhase(null);
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, phase: PlotPhase) => {
    event.preventDefault();
    const sourceId = draggedPointId || event.dataTransfer.getData("text/plain");
    if (!sourceId) return;

    movePlotPoint(sourceId, phase, null);
    setDraggedPointId(null);
    setDragOverPointId(null);
    setDragOverPhase(null);
  };

  const handleDragEnd = () => {
    setDraggedPointId(null);
    setDragOverPointId(null);
    setDragOverPhase(null);
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    point: PlotPoint,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPointDetails(point);
    }
  };

  const toggleEditorSection = (section: EditorAccordionSection) => {
    setActiveEditorSection((prev) => (prev === section ? null : section));
  };

  const renderSummaryPanel = (mobile = false) => (
    <div className={cn("flex flex-col gap-3", mobile ? "pb-4" : "h-full justify-between")}>
      <div className="space-y-3">
        <div className={cn(panelSurfaceClass, "bg-muted/20")}>
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
            Story Context
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-semibold tracking-tight">Build with intent</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Start with a Promise beat, move pressure through Progress, and use Payoff to cash in on what the story set up.
            </p>
          </div>
        </div>

        <div className={panelSurfaceClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                Conflict Distribution
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                See where the story pressure is clustering.
              </p>
            </div>
            <Badge variant="outline" className={metadataBadgeClass}>
              Avg {averageConflict}
            </Badge>
          </div>

          <div className="mt-3 space-y-2.5">
            {conflictByPhase.map((entry) => {
              const phaseStyle = getPhaseStyle(entry.phase);
              return (
                <div key={entry.phase} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: phaseStyle.color }}
                      />
                      <p className="text-sm font-medium">{entry.phase}</p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {entry.average}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${entry.average}%`,
                        backgroundColor: phaseStyle.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={panelSurfaceClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                Character Usage
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Track which arcs are actually present across the board.
              </p>
            </div>
            <Users className="h-4 w-4 text-neon-cyan" />
          </div>

          {characterUsage.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {characterUsage.map((character) => {
                const ratio =
                  plotPoints.length > 0 ? (character.count / plotPoints.length) * 100 : 0;
                return (
                  <div key={character.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{character.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {character.type || "Character"}
                        </p>
                      </div>
                      <Badge variant="outline" className={metadataBadgeClass}>
                        {character.count} beat{character.count === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-neon-cyan"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Attach characters to plot beats to see whose arc is carrying the story.
            </p>
          )}
        </div>

        <div className={panelSurfaceClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                Foreshadowing Overview
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Keep setups and payoffs visible before you draft scenes.
              </p>
            </div>
            <GitFork className="h-4 w-4 text-neon-pink" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border/60 bg-background/40 p-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Total Links
              </p>
              <p className="mt-1.5 text-xl font-semibold">{foreshadowLinks.length}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Scene-Linked
              </p>
              <p className="mt-1.5 text-xl font-semibold">{sceneLinkedPoints}</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {beatsWithoutForeshadowing} beat{beatsWithoutForeshadowing === 1 ? "" : "s"} still
            need stronger setup or payoff connections.
          </p>

          {foreshadowLinks.length > 0 && (
            <div className="mt-3 space-y-2">
              {foreshadowLinks.slice(0, 2).map(({ source, target }) => (
                <div
                  key={`${source.id}-${target.id}`}
                  className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
                >
                  <p className="truncate text-sm font-medium">{source.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    pays off into {target.title} in {target.phase}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn(panelSurfaceClass, "p-3")}>
        <Button
          onClick={() => startCreatePoint("Promise")}
          className="w-full bg-neon-purple font-mono hover:bg-neon-purple/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New Plot Point
        </Button>
      </div>
    </div>
  );

  const renderDraftPanel = (mobile = false) => (
    <div className={cn("flex flex-col gap-3", mobile ? "pb-4" : "h-full justify-between")}>
      <div className="space-y-3">
        <div className={cn(panelSurfaceClass, "p-3")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: selectedPhaseStyle.background,
                  borderColor: selectedPhaseStyle.border,
                  color: selectedPhaseStyle.color,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: selectedPhaseStyle.color }}
                />
                {contextMode === "edit" ? activePoint?.phase : `${draft.phase} draft`}
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {contextMode === "edit" ? "Edit Plot Point" : "Create Plot Point"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {contextMode === "edit"
                    ? "Refine the selected beat without losing sight of its stakes, links, and narrative role."
                    : phaseGuidance[draft.phase] || phaseGuidance.Promise}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activePoint && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => void deletePlotPoint(activePoint.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-8 px-2.5 font-mono text-[11px] uppercase tracking-[0.16em]"
                onClick={() => {
                  clearContextSelection();
                  if (mobile) {
                    setIsContextDrawerOpen(false);
                  }
                }}
              >
                {mobile ? "Close" : "Summary"}
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Title
              </Label>
              <Input
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="Ex: The promise of the cursed mark"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={draft.description}
                onChange={(event) => updateDraft({ description: event.target.value })}
                placeholder="What happens in this beat, and why does it matter?"
                className="min-h-[96px]"
              />
            </div>

            <div className="grid gap-3 border-t border-border/60 pt-3">
              <div className="space-y-2">
                <Label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Phase
                </Label>
                <Select
                  value={draft.phase}
                  onValueChange={(value) => updateDraft({ phase: value as PlotPhase })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLOT_PHASES.map((phase) => (
                      <SelectItem key={phase.value} value={phase.value}>
                        {phase.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Conflict
                  </Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {draft.conflictLevel} · {getConflictTone(draft.conflictLevel)}
                  </span>
                </div>
                <Slider
                  value={[draft.conflictLevel]}
                  onValueChange={(value) =>
                    updateDraft({ conflictLevel: value[0] || draft.conflictLevel })
                  }
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <SidebarAccordionSection
            title="Stakes"
            isOpen={activeEditorSection === "stakes"}
            onToggle={() => toggleEditorSection("stakes")}
            description="Clarify what breaks, shifts, or gets lost if this beat fails."
            badge={
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.stakes.trim() ? "Ready" : "Empty"}
              </Badge>
            }
          >
            <div className="space-y-2">
              <Label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Stakes
              </Label>
              <Textarea
                value={draft.stakes}
                onChange={(event) => updateDraft({ stakes: event.target.value })}
                placeholder="What breaks, shifts, or gets lost if this beat goes wrong?"
                className="min-h-[96px]"
              />
            </div>
          </SidebarAccordionSection>

          <SidebarAccordionSection
            title="Characters"
            isOpen={activeEditorSection === "characters"}
            onToggle={() => toggleEditorSection("characters")}
            description="Choose the characters whose arc this beat actively moves."
            badge={
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.characterIds.length} linked
              </Badge>
            }
          >
            <div className="space-y-2">
              {characters.length > 0 ? (
                characters.map((character) => (
                  <label
                    key={character.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/35 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={draft.characterIds.includes(character.id)}
                      onCheckedChange={() =>
                        updateDraft({
                          characterIds: toggleId(draft.characterIds, character.id),
                        })
                      }
                    />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{character.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {character.type || "Character Type Unset"}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/35 px-3 py-3">
                  <p className="text-sm text-muted-foreground">
                    No characters available yet. Add them in Character Lab first.
                  </p>
                </div>
              )}
            </div>
          </SidebarAccordionSection>

          <SidebarAccordionSection
            title="Scene Links"
            isOpen={activeEditorSection === "scenes"}
            onToggle={() => toggleEditorSection("scenes")}
            description="Tie this beat to scene drafts so planning stays connected to pages."
            badge={
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.sceneIds.length} linked
              </Badge>
            }
          >
            {scenes.length > 0 ? (
              <div className="space-y-2">
                {scenes.map((scene) => (
                  <label
                    key={scene.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/35 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={draft.sceneIds.includes(scene.id)}
                      onCheckedChange={() =>
                        updateDraft({
                          sceneIds: toggleId(draft.sceneIds, scene.id),
                        })
                      }
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-mono text-muted-foreground">
                        {scene.savedAt || "Untitled Scene"} · {scene.wordCount} words
                      </p>
                      <p
                        className={cn(
                          "text-sm text-muted-foreground",
                          previewClampClass,
                          "[-webkit-line-clamp:2]",
                        )}
                      >
                        {scene.text || "No preview available."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-background/35 px-3 py-3">
                <p className="text-sm text-muted-foreground">
                  No saved scenes yet. Save a draft in Scene Practice to connect it here.
                </p>
                <Button asChild variant="outline" className="mt-3 font-mono">
                  <Link to="/scene-practice">Open Scene Practice</Link>
                </Button>
              </div>
            )}
          </SidebarAccordionSection>

          <SidebarAccordionSection
            title="Foreshadowing"
            isOpen={activeEditorSection === "foreshadowing"}
            onToggle={() => toggleEditorSection("foreshadowing")}
            description="Connect this beat to the setups or payoffs it belongs with."
            badge={
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.foreshadowingIds.length} linked
              </Badge>
            }
          >
            {plotPoints.filter((point) => point.id !== editingId).length > 0 ? (
              <div className="space-y-2">
                {plotPoints
                  .filter((point) => point.id !== editingId)
                  .map((point) => (
                    <label
                      key={point.id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/35 px-3 py-2.5"
                    >
                      <Checkbox
                        checked={draft.foreshadowingIds.includes(point.id)}
                        onCheckedChange={() =>
                          updateDraft({
                            foreshadowingIds: toggleId(draft.foreshadowingIds, point.id),
                          })
                        }
                      />
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{point.title}</p>
                          <Badge variant="outline" className={metadataBadgeClass}>
                            {point.phase}
                          </Badge>
                        </div>
                        <p
                          className={cn(
                            "text-sm text-muted-foreground",
                            previewClampClass,
                            "[-webkit-line-clamp:2]",
                          )}
                        >
                          {point.description}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-background/35 px-3 py-3">
                <p className="text-sm text-muted-foreground">
                  Add more plot points to start weaving foreshadowing across the board.
                </p>
              </div>
            )}
          </SidebarAccordionSection>
        </div>
      </div>

      <div className={cn(panelSurfaceClass, "p-3")}>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="font-mono" onClick={resetDraftChanges}>
            Reset
          </Button>
          <Button
            className="bg-neon-purple font-mono hover:bg-neon-purple/90"
            onClick={savePlotPoint}
          >
            {contextMode === "edit" ? "Save Changes" : "Add Plot Point"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSidebarPanel = (mobile = false) =>
    mode === "summary" ? renderSummaryPanel(mobile) : renderDraftPanel(mobile);

  return (
    <>
      <div className="-m-6 flex w-[calc(100%+3rem)] min-h-[calc(100vh-3rem)]">
        <div className="flex w-full min-w-0 flex-1">
          <div className="flex-1 overflow-auto p-6">
            <div className="w-full space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-neon-purple/30 bg-neon-purple/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                  Promise → Progress → Payoff
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Plot Builder
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Build your story as a clear sequence of promises, pressure, and payoff so every beat earns its place.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="font-mono xl:hidden"
                  onClick={openSummaryPanel}
                >
                  Story Context
                </Button>
                <Button
                  onClick={() => startCreatePoint()}
                  className="bg-neon-purple font-mono hover:bg-neon-purple/90"
                >
                  <Plus className="mr-2 h-4 w-4" /> New Plot Point
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  label: "Plot Points",
                  value: plotPoints.length,
                  description: "Structured beats currently shaping the story",
                  icon: MapIcon,
                  iconClass: "text-neon-cyan",
                },
                {
                  label: "Conflict Tracker",
                  value: averageConflict,
                  description: "Average story pressure across the whole board",
                  icon: Flame,
                  iconClass: "text-neon-pink",
                },
                {
                  label: "Foreshadowing Links",
                  value: foreshadowLinks.length,
                  description: "Visible setups and payoffs already connected",
                  icon: Link2,
                  iconClass: "text-neon-purple",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.label}
                    className="glow-card glow-border border-border/70 bg-card/80 shadow-[0_20px_48px_hsl(var(--background)/0.35)]"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                        <Icon className={cn("h-4 w-4", item.iconClass)} />
                        {item.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-semibold tracking-tight">{item.value}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="glow-card glow-border border-border/70 bg-gradient-to-r from-neon-purple/10 via-background/70 to-neon-cyan/10">
              <CardContent className="grid gap-4 p-5 md:grid-cols-3">
                {workflowSteps.map((step, index) => (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.label}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Plot Builder is running in safe mode right now. Reordering is temporarily paused while the route is stabilized.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
              {PLOT_PHASES.map((phase) => {
                const phaseStyle = getPhaseStyle(phase.value);
                const points = phaseBuckets[phase.value];

                return (
                  <Card
                    key={phase.value}
                    className="glow-card glow-border border-border/70 bg-card/75 shadow-[0_22px_60px_hsl(var(--background)/0.38)]"
                  >
                    <CardHeader className="space-y-4 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-3">
                          <div
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]"
                            style={{
                              backgroundColor: phaseStyle.background,
                              borderColor: phaseStyle.border,
                              color: phaseStyle.color,
                            }}
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: phaseStyle.color }}
                            />
                            {phase.value}
                          </div>

                          <div>
                            <CardTitle className="text-xl tracking-tight">
                              {phase.value}
                            </CardTitle>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {phase.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={metadataBadgeClass}>
                            {points.length} beat{points.length === 1 ? "" : "s"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => startCreatePoint(phase.value)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div
                        className="min-h-[480px] rounded-2xl border border-dashed border-border/70 bg-background/30 p-4 transition-all"
                      >
                        {points.length > 0 ? (
                          <div className="space-y-4">
                            {points.map((point) => {
                              const pointPhaseStyle = getPhaseStyle(point.phase);
                              const isSelected = editingId === point.id && !isCreating;

                              return (
                                <div
                                  key={point.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openPointDetails(point)}
                                  onKeyDown={(event) => handleCardKeyDown(event, point)}
                                  className={cn(
                                    "group relative cursor-pointer rounded-2xl border border-border/70 bg-card/95 p-5 text-left shadow-[0_18px_42px_hsl(var(--background)/0.28)] transition-all duration-200",
                                    "hover:scale-[1.015] hover:border-primary/40 hover:shadow-[0_26px_52px_hsl(var(--neon-purple)/0.12)]",
                                    isSelected &&
                                      "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.28),0_26px_52px_hsl(var(--neon-purple)/0.16)]",
                                  )}
                                >
                                  <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                          style={{
                                            backgroundColor: pointPhaseStyle.background,
                                            borderColor: pointPhaseStyle.border,
                                            color: pointPhaseStyle.color,
                                          }}
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <h3 className="truncate text-base font-semibold tracking-tight">
                                            {point.title}
                                          </h3>
                                          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                            {point.phase} beat
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <Badge
                                      variant="outline"
                                      className="shrink-0 border-border/60 bg-background/60 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                                    >
                                      Conflict {point.conflictLevel}
                                    </Badge>
                                  </div>

                                  <p
                                    className={cn(
                                      "mt-4 text-sm leading-relaxed text-muted-foreground",
                                      previewClampClass,
                                      "[-webkit-line-clamp:3]",
                                    )}
                                  >
                                    {point.description}
                                  </p>

                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <Badge variant="outline" className={metadataBadgeClass}>
                                      {point.characterIds.length} character
                                      {point.characterIds.length === 1 ? "" : "s"}
                                    </Badge>
                                    <Badge variant="outline" className={metadataBadgeClass}>
                                      {point.sceneIds.length} scene
                                      {point.sceneIds.length === 1 ? "" : "s"}
                                    </Badge>
                                    {point.foreshadowingIds.length > 0 && (
                                      <Badge variant="outline" className={metadataBadgeClass}>
                                        {point.foreshadowingIds.length} foreshadow
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="mt-5 border-t border-border/60 pt-4">
                                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                                      Stakes
                                    </p>
                                    <p
                                      className={cn(
                                        "mt-2 text-sm leading-relaxed text-muted-foreground",
                                        previewClampClass,
                                        "[-webkit-line-clamp:2]",
                                      )}
                                    >
                                      {point.stakes ||
                                        "Add stakes in the detail panel to sharpen what this beat risks."}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/40 p-6 text-center">
                            <div className="space-y-3">
                              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {phase.value} is empty
                              </p>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                Drop plot points here or create a new one.
                              </p>
                              <Button
                                variant="outline"
                                className="font-mono"
                                onClick={() => startCreatePoint(phase.value)}
                              >
                                Create In {phase.value}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          </div>

          {!isMobile && (
            <aside className="h-[calc(100vh-3rem)] w-80 flex-shrink-0 border-l border-border/70 bg-background/35 p-4">
              {renderSidebarPanel()}
            </aside>
          )}
        </div>
      </div>

      {isMobile && (
        <Drawer open={isContextDrawerOpen} onOpenChange={setIsContextDrawerOpen}>
          <DrawerContent className="border-border/70 bg-background/95">
            <DrawerHeader className="border-b border-border/70">
              <DrawerTitle>{mode === "summary" ? "Story Context" : "Plot Editor"}</DrawerTitle>
              <DrawerDescription>
                {mode === "summary"
                  ? "Review story pressure, character usage, and foreshadowing before shaping the next beat."
                  : "Shape the active beat with a compact editor and focused accordion sections."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-4">
              {renderSidebarPanel(true)}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default PlotBuilder;
