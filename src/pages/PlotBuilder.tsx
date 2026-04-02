import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
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
import {
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
  "rounded-2xl border border-border/70 bg-background/60 p-4 shadow-[0_18px_40px_hsl(var(--background)/0.35)] backdrop-blur-sm";

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
  const shouldLoadSceneLinks = isCreating || Boolean(editingId);

  useEffect(() => {
    console.log("Plot Builder Mounted");
  }, []);

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
      setEditingId(null);
      setIsCreating(false);
      setDraft(createEmptyPlotPointDraft());
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
                points.reduce((total, point) => total + point.conflictLevel, 0) /
                  points.length,
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
        .slice(0, 6),
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
    setEditingId(null);
    setIsCreating(false);
    setDraft(createEmptyPlotPointDraft());
    setIsContextDrawerOpen(true);
  };

  const clearContextSelection = () => {
    setEditingId(null);
    setIsCreating(false);
    setDraft(createEmptyPlotPointDraft());
  };

  const startCreatePoint = (phase: PlotPhase = "Promise") => {
    setEditingId(null);
    setIsCreating(true);
    setDraft({
      ...createEmptyPlotPointDraft(),
      phase,
    });

    if (isMobile) {
      setIsContextDrawerOpen(true);
    }
  };

  const openPointDetails = (point: PlotPoint) => {
    setEditingId(point.id);
    setIsCreating(false);
    setDraft(toDraft(point));

    if (isMobile) {
      setIsContextDrawerOpen(true);
    }
  };

  const resetDraftChanges = () => {
    if (activePoint) {
      setDraft(toDraft(activePoint));
      return;
    }

    setDraft(createEmptyPlotPointDraft());
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

    setEditingId(pointId);
    setIsCreating(false);

    if (isMobile) {
      setIsContextDrawerOpen(false);
    }
  };

  const deletePlotPoint = (id: string) => {
    const point = pointMap.get(id);

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

  const renderContextPanel = (mobile = false) => (
    <div className={cn("space-y-4", mobile ? "pb-6" : "")}>
      {contextMode === "summary" ? (
        <>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
              Story context
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Build with intent</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Start with a Promise beat, move pressure through Progress, and use Payoff to cash in on what the story set up.
              </p>
            </div>
          </div>

          <div className={panelSurfaceClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                  Conflict distribution
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  See where the story pressure is clustering.
                </p>
              </div>
              <Badge variant="outline" className={metadataBadgeClass}>
                Avg {averageConflict}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {conflictByPhase.map((entry) => {
                const phaseStyle = getPhaseStyle(entry.phase);
                return (
                  <div key={entry.phase} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: phaseStyle.color }}
                        />
                        <p className="text-sm font-medium">{entry.phase}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.average}/100
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${entry.average}%`,
                          backgroundColor: phaseStyle.color,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.count} beat{entry.count === 1 ? "" : "s"} in {entry.phase}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={panelSurfaceClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                  Character usage
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track which arcs are actually present across the board.
                </p>
              </div>
              <Users className="h-4 w-4 text-neon-cyan" />
            </div>

            {characterUsage.length > 0 ? (
              <div className="mt-4 space-y-3">
                {characterUsage.map((character) => {
                  const ratio =
                    plotPoints.length > 0 ? (character.count / plotPoints.length) * 100 : 0;
                  return (
                    <div key={character.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{character.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {character.type || "Character"}
                          </p>
                        </div>
                        <Badge variant="outline" className={metadataBadgeClass}>
                          {character.count} beat{character.count === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60">
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
              <p className="mt-4 text-sm text-muted-foreground">
                Attach characters to plot beats to see whose arc is carrying the story.
              </p>
            )}
          </div>

          <div className={panelSurfaceClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                  Foreshadowing overview
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Make setups and payoffs visible before you draft scenes.
                </p>
              </div>
              <GitFork className="h-4 w-4 text-neon-pink" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <p className="font-mono text-xs text-muted-foreground">Total links</p>
                <p className="mt-2 text-2xl font-semibold">{foreshadowLinks.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <p className="font-mono text-xs text-muted-foreground">Scene-linked beats</p>
                <p className="mt-2 text-2xl font-semibold">{sceneLinkedPoints}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              {beatsWithoutForeshadowing} beat{beatsWithoutForeshadowing === 1 ? "" : "s"} still
              need stronger setup or payoff connections.
            </p>

            {foreshadowLinks.length > 0 && (
              <div className="mt-4 space-y-2">
                {foreshadowLinks.slice(0, 3).map(({ source, target }) => (
                  <div
                    key={`${source.id}-${target.id}`}
                    className="rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <p className="text-sm font-medium">{source.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      pays off into {target.title} in {target.phase}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              startCreatePoint("Promise");
              if (!mobile) return;
            }}
            className="w-full bg-neon-purple font-mono hover:bg-neon-purple/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Promise Beat
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: selectedPhaseStyle.background,
                  borderColor: selectedPhaseStyle.border,
                  color: selectedPhaseStyle.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: selectedPhaseStyle.color }}
                />
                {contextMode === "create" ? `${draft.phase} draft` : activePoint?.phase}
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {contextMode === "create"
                    ? "Create a new plot point"
                    : activePoint?.title || "Edit plot point"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {contextMode === "create"
                    ? "Shape the beat, connect it to characters, and define the pressure it adds to the story."
                    : "Refine the selected beat without losing sight of its stakes, links, and narrative role."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activePoint && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => deletePlotPoint(activePoint.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                className="font-mono text-xs"
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

          <div className={panelSurfaceClass}>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
              Beat details
            </p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs">Title</Label>
                <Input
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  placeholder="Ex: The promise of the cursed mark"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs">Description</Label>
                <Textarea
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  placeholder="What happens in this beat, and why does it matter?"
                  className="min-h-[132px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs">Stakes</Label>
                <Textarea
                  value={draft.stakes}
                  onChange={(event) => updateDraft({ stakes: event.target.value })}
                  placeholder="What breaks, shifts, or gets lost if this beat goes wrong?"
                  className="min-h-[110px]"
                />
              </div>
            </div>
          </div>

          <div className={panelSurfaceClass}>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-mono text-xs">Phase</Label>
                <Select
                  value={draft.phase}
                  onValueChange={(value) => updateDraft({ phase: value as PlotPhase })}
                >
                  <SelectTrigger>
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
                  <Label className="font-mono text-xs">Conflict pressure</Label>
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

          <div className={panelSurfaceClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                  Characters involved
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the characters whose arc this beat actively moves.
                </p>
              </div>
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.characterIds.length} linked
              </Badge>
            </div>

            <div className="mt-4 max-h-60 space-y-2 overflow-auto pr-1">
              {characters.map((character) => (
                <label
                  key={character.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <Checkbox
                    checked={draft.characterIds.includes(character.id)}
                    onCheckedChange={() =>
                      updateDraft({
                        characterIds: toggleId(draft.characterIds, character.id),
                      })
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{character.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {character.type || "Character Type Unset"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={panelSurfaceClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                  Scene links
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tie this beat to actual scene drafts so planning stays grounded in pages.
                </p>
              </div>
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.sceneIds.length} linked
              </Badge>
            </div>

            {scenes.length > 0 ? (
              <div className="mt-4 max-h-60 space-y-2 overflow-auto pr-1">
                {scenes.map((scene) => (
                  <label
                    key={scene.id}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <Checkbox
                      checked={draft.sceneIds.includes(scene.id)}
                      onCheckedChange={() =>
                        updateDraft({
                          sceneIds: toggleId(draft.sceneIds, scene.id),
                        })
                      }
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground">
                        {scene.savedAt || "Untitled Scene"} · {scene.wordCount} words
                      </p>
                      <p className={cn("text-sm text-muted-foreground", previewClampClass, "[-webkit-line-clamp:2]")}>
                        {scene.text || "No preview available."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">
                  No saved scenes yet. Save a draft in Scene Practice to connect it here.
                </p>
                <Button asChild variant="outline" className="mt-3 font-mono">
                  <Link to="/scene-practice">Open Scene Practice</Link>
                </Button>
              </div>
            )}
          </div>

          <div className={panelSurfaceClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                  Foreshadowing links
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect this beat to the setups or payoffs it belongs with.
                </p>
              </div>
              <Badge variant="outline" className={metadataBadgeClass}>
                {draft.foreshadowingIds.length} linked
              </Badge>
            </div>

            {plotPoints.filter((point) => point.id !== editingId).length > 0 ? (
              <div className="mt-4 max-h-60 space-y-2 overflow-auto pr-1">
                {plotPoints
                  .filter((point) => point.id !== editingId)
                  .map((point) => (
                    <label
                      key={point.id}
                      className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                    >
                      <Checkbox
                        checked={draft.foreshadowingIds.includes(point.id)}
                        onCheckedChange={() =>
                          updateDraft({
                            foreshadowingIds: toggleId(draft.foreshadowingIds, point.id),
                          })
                        }
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{point.title}</p>
                          <Badge variant="outline" className={metadataBadgeClass}>
                            {point.phase}
                          </Badge>
                        </div>
                        <p className={cn("text-sm text-muted-foreground", previewClampClass, "[-webkit-line-clamp:2]")}>
                          {point.description}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground">
                  Add more plot points to start weaving foreshadowing across the board.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
            <Button variant="ghost" className="font-mono" onClick={resetDraftChanges}>
              Reset
            </Button>
            <Button
              className="bg-neon-purple font-mono hover:bg-neon-purple/90"
              onClick={savePlotPoint}
            >
              {contextMode === "create" ? "Add Plot Point" : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

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
            <aside className="w-80 flex-shrink-0 overflow-auto border-l border-border/70 bg-background/35 p-4">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_18px_42px_hsl(var(--background)/0.28)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {contextMode === "summary"
                      ? "Context Panel"
                      : contextMode === "create"
                        ? "Create Plot Point"
                        : "Plot Point Details"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {contextMode === "summary"
                      ? "Review the story shape or select a beat to edit its details."
                      : "Refine the selected beat without leaving the board."}
                  </p>
                </div>
                {renderContextPanel()}
              </div>
            </aside>
          )}
        </div>
      </div>

      {isMobile && (
        <Drawer open={isContextDrawerOpen} onOpenChange={setIsContextDrawerOpen}>
          <DrawerContent className="border-border/70 bg-background/95">
            <DrawerHeader className="border-b border-border/70">
              <DrawerTitle>
                {contextMode === "summary"
                  ? "Story Context"
                  : contextMode === "create"
                    ? "Create Plot Point"
                    : "Plot Point Details"}
              </DrawerTitle>
              <DrawerDescription>
                {contextMode === "summary"
                  ? "Use this space to review the story shape before you add or edit beats."
                  : "Edit this beat in context without losing the board."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[78vh] overflow-y-auto px-4 py-4">
              {renderContextPanel(true)}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default PlotBuilder;
