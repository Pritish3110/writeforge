import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  CHARACTER_RELATIONSHIP_STORAGE_KEY,
  RELATIONSHIP_TYPES,
  createRelationshipFormState,
  createTimelineEntry,
  getRelationshipTypeStyle,
  isSameRelationshipPair,
  normalizeCharacterRelationships,
  normalizeRelationshipCharacters,
  type CharacterRelationship,
  type RelationshipCharacter,
  type RelationshipFormState,
  type RelationshipTimelineEntry,
  type RelationshipType,
} from "@/lib/characterRelationships";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import {
  GitFork,
  Minus,
  Plus,
  Trash2,
  Users,
  ZoomIn,
} from "lucide-react";

interface GraphPosition {
  x: number;
  y: number;
}

const GRAPH_WIDTH = 1000;
const GRAPH_HEIGHT = 620;
const NODE_HALF_WIDTH = 74;
const NODE_HALF_HEIGHT = 34;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const truncate = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit - 1)}…` : value;

const getStrengthTone = (value: number) => {
  if (value < 30) return "Fragile";
  if (value < 60) return "Developing";
  if (value < 85) return "Strong";
  return "Core";
};

const buildDefaultPositions = (characters: RelationshipCharacter[]) => {
  if (characters.length === 0) return {};

  const centerX = GRAPH_WIDTH / 2;
  const centerY = GRAPH_HEIGHT / 2;
  const radiusX = characters.length === 1 ? 0 : Math.min(320, 180 + characters.length * 18);
  const radiusY = characters.length === 1 ? 0 : Math.min(220, 120 + characters.length * 14);

  return Object.fromEntries(
    characters.map((character, index) => {
      if (characters.length === 1) {
        return [character.id, { x: centerX, y: centerY }];
      }

      const angle = (Math.PI * 2 * index) / characters.length - Math.PI / 2;
      return [
        character.id,
        {
          x: centerX + Math.cos(angle) * radiusX,
          y: centerY + Math.sin(angle) * radiusY,
        },
      ];
    }),
  ) as Record<string, GraphPosition>;
};

const CharacterRelationships = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [storedCharacters] = useLocalStorage<unknown[]>("writeforge-characters", []);
  const [storedRelationships, setStoredRelationships] = useLocalStorage<unknown[]>(
    CHARACTER_RELATIONSHIP_STORAGE_KEY,
    [],
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [nodePositions, setNodePositions] = useState<Record<string, GraphPosition>>({});

  const characters = useMemo(
    () => normalizeRelationshipCharacters(storedCharacters),
    [storedCharacters],
  );
  const relationships = useMemo(
    () => normalizeCharacterRelationships(storedRelationships),
    [storedRelationships],
  );
  const characterMap = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );
  const visibleRelationships = useMemo(
    () =>
      relationships.filter(
        (relationship) =>
          characterMap.has(relationship.characterAId) &&
          characterMap.has(relationship.characterBId),
      ),
    [relationships, characterMap],
  );
  const [form, setForm] = useState<RelationshipFormState>(() =>
    createRelationshipFormState(characters),
  );

  useEffect(() => {
    setNodePositions((prev) => {
      const fallback = buildDefaultPositions(characters);
      const next: Record<string, GraphPosition> = {};

      characters.forEach((character) => {
        next[character.id] = prev[character.id] || fallback[character.id];
      });

      return next;
    });
  }, [characters]);

  useEffect(() => {
    if (!selectedCharacterId || !characterMap.has(selectedCharacterId)) {
      setSelectedCharacterId(characters[0]?.id || null);
    }
  }, [selectedCharacterId, characterMap, characters]);

  useEffect(() => {
    setForm((prev) => {
      const availableIds = new Set(characters.map((character) => character.id));
      const next = {
        ...prev,
        characterAId: availableIds.has(prev.characterAId)
          ? prev.characterAId
          : characters[0]?.id || "",
        characterBId: availableIds.has(prev.characterBId)
          ? prev.characterBId
          : characters[1]?.id || characters[0]?.id || "",
      };

      return next;
    });
  }, [characters]);

  useEffect(() => {
    if (!draggingNodeId) return;

    const getPointFromClient = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * GRAPH_WIDTH;
      const y = ((clientY - rect.top) / rect.height) * GRAPH_HEIGHT;

      return {
        x: clamp(x, NODE_HALF_WIDTH + 16, GRAPH_WIDTH - NODE_HALF_WIDTH - 16),
        y: clamp(y, NODE_HALF_HEIGHT + 16, GRAPH_HEIGHT - NODE_HALF_HEIGHT - 16),
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      const point = getPointFromClient(event.clientX, event.clientY);
      if (!point) return;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: point,
      }));
    };

    const handleMouseUp = () => setDraggingNodeId(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNodeId]);

  const selectedCharacter =
    (selectedCharacterId ? characterMap.get(selectedCharacterId) : null) || null;
  const selectedCharacterRelationships = visibleRelationships.filter(
    (relationship) =>
      relationship.characterAId === selectedCharacterId ||
      relationship.characterBId === selectedCharacterId,
  );
  const averageStrength =
    visibleRelationships.length > 0
      ? Math.round(
          visibleRelationships.reduce(
            (total, relationship) => total + relationship.strength,
            0,
          ) / visibleRelationships.length,
        )
      : 0;

  const updateTimelineEntry = (
    id: string,
    update: Partial<RelationshipTimelineEntry>,
  ) => {
    setForm((prev) => ({
      ...prev,
      timeline: prev.timeline.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    }));
  };

  const addTimelineEntry = () => {
    setForm((prev) => ({
      ...prev,
      timeline: [...prev.timeline, createTimelineEntry()],
    }));
  };

  const removeTimelineEntry = (id: string) => {
    setForm((prev) => {
      const nextTimeline = prev.timeline.filter((entry) => entry.id !== id);
      return {
        ...prev,
        timeline: nextTimeline.length > 0 ? nextTimeline : [createTimelineEntry()],
      };
    });
  };

  const handleSaveRelationship = () => {
    if (!form.characterAId || !form.characterBId) {
      toast.error("Choose two characters first");
      return;
    }

    if (form.characterAId === form.characterBId) {
      toast.error("Choose two different characters");
      return;
    }

    const description = form.description.trim();
    if (!description) {
      toast.error("Add a relationship description");
      return;
    }

    const timeline = form.timeline
      .map((entry) => ({
        ...entry,
        label: entry.label.trim(),
        note: entry.note.trim(),
      }))
      .filter((entry) => entry.label || entry.note);

    const timestamp = new Date().toISOString();
    const existing = visibleRelationships.find((relationship) =>
      isSameRelationshipPair(
        relationship.characterAId,
        relationship.characterBId,
        form.characterAId,
        form.characterBId,
      ),
    );

    const nextRelationship: CharacterRelationship = {
      id: existing?.id || crypto.randomUUID(),
      characterAId: form.characterAId,
      characterBId: form.characterBId,
      type: form.type,
      description,
      strength: form.strength,
      timeline: timeline.length > 0 ? timeline : [createTimelineEntry()],
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    setStoredRelationships((prev) => {
      const normalized = normalizeCharacterRelationships(prev);
      const existingIndex = normalized.findIndex((relationship) =>
        isSameRelationshipPair(
          relationship.characterAId,
          relationship.characterBId,
          form.characterAId,
          form.characterBId,
        ),
      );

      if (existingIndex >= 0) {
        const copy = [...normalized];
        copy[existingIndex] = nextRelationship;
        return copy;
      }

      return [...normalized, nextRelationship];
    });

    toast.success(existing ? "Relationship updated" : "Relationship added", {
      description: `${characterMap.get(form.characterAId)?.name || "Character"} and ${characterMap.get(form.characterBId)?.name || "character"} are now mapped.`,
    });

    setForm(createRelationshipFormState(characters));
  };

  const handleDeleteRelationship = (id: string) => {
    setStoredRelationships((prev) =>
      normalizeCharacterRelationships(prev).filter(
        (relationship) => relationship.id !== id,
      ),
    );
  };

  const adjustZoom = (delta: number) => {
    setZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 0.75, 1.8));
  };

  const handleGraphWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    adjustZoom(event.deltaY < 0 ? 0.1 : -0.1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Character Relationships</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Visualize your cast dynamics, compare connection strength, and track how relationships evolve.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-neon-cyan" /> Characters In Graph
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{characters.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Nodes pulled from Character Lab storage</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <GitFork className="h-4 w-4 text-neon-pink" /> Active Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{visibleRelationships.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Stored edges across your cast map</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-neon-purple" /> Avg Bond Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{averageStrength}</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on current relationship slider values</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card className="glow-card glow-border">
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-base font-mono">Relationship Graph</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Drag nodes to rearrange the map. Scroll or use controls to zoom.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => adjustZoom(-0.1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="min-w-20 rounded-lg border border-border bg-muted/30 px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </div>
                  <Button variant="outline" size="icon" onClick={() => adjustZoom(0.1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="font-mono" onClick={() => setZoom(1)}>
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {RELATIONSHIP_TYPES.map((type) => {
                  const style = getRelationshipTypeStyle(type.value);
                  return (
                    <Badge
                      key={type.value}
                      variant="outline"
                      className="font-mono text-[11px]"
                      style={{
                        backgroundColor: style.background,
                        borderColor: style.border,
                        color: style.color,
                      }}
                    >
                      {type.value}
                    </Badge>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent>
              <div
                onWheel={handleGraphWheel}
                className="overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top,hsl(var(--muted)/0.55),transparent_55%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))]"
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                  className={cn(
                    "h-[520px] w-full select-none origin-center transition-transform duration-200 ease-out",
                    draggingNodeId ? "cursor-grabbing" : "cursor-grab",
                  )}
                  style={{ transform: `scale(${zoom})` }}
                >
                  {visibleRelationships.map((relationship) => {
                    const start = nodePositions[relationship.characterAId];
                    const end = nodePositions[relationship.characterBId];
                    if (!start || !end) return null;

                    const style = getRelationshipTypeStyle(relationship.type);
                    const isHighlighted =
                      !selectedCharacterId ||
                      relationship.characterAId === selectedCharacterId ||
                      relationship.characterBId === selectedCharacterId;
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;

                    return (
                      <g key={relationship.id}>
                        <line
                          x1={start.x}
                          y1={start.y}
                          x2={end.x}
                          y2={end.y}
                          stroke={style.color}
                          strokeWidth={2 + relationship.strength / 28}
                          strokeOpacity={isHighlighted ? 0.8 : 0.22}
                        />
                        <circle
                          cx={midX}
                          cy={midY}
                          r={8 + relationship.strength / 30}
                          fill={style.color}
                          fillOpacity={isHighlighted ? 0.22 : 0.1}
                          stroke={style.color}
                          strokeOpacity={isHighlighted ? 0.8 : 0.22}
                        />
                      </g>
                    );
                  })}

                  {characters.map((character) => {
                    const position = nodePositions[character.id];
                    if (!position) return null;

                    const isSelected = selectedCharacterId === character.id;
                    const connectionCount = visibleRelationships.filter(
                      (relationship) =>
                        relationship.characterAId === character.id ||
                        relationship.characterBId === character.id,
                    ).length;

                    return (
                      <g
                        key={character.id}
                        transform={`translate(${position.x}, ${position.y})`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setDraggingNodeId(character.id);
                          setSelectedCharacterId(character.id);
                        }}
                        onClick={() => setSelectedCharacterId(character.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={-NODE_HALF_WIDTH}
                          y={-NODE_HALF_HEIGHT}
                          width={NODE_HALF_WIDTH * 2}
                          height={NODE_HALF_HEIGHT * 2}
                          rx="20"
                          fill="hsl(var(--card))"
                          fillOpacity={0.96}
                          stroke={isSelected ? "hsl(var(--neon-purple))" : "hsl(var(--border))"}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          style={{
                            filter: isSelected
                              ? "drop-shadow(0 0 16px rgba(168,85,247,0.38))"
                              : "drop-shadow(0 0 8px rgba(0,0,0,0.18))",
                          }}
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fill="hsl(var(--foreground))"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="15"
                          fontWeight="700"
                        >
                          {truncate(character.name, 14)}
                        </text>
                        <text
                          x="0"
                          y="16"
                          textAnchor="middle"
                          fill={isSelected ? "hsl(var(--neon-cyan))" : "hsl(var(--muted-foreground))"}
                          fontFamily="Inter, sans-serif"
                          fontSize="11"
                        >
                          {truncate(character.type || "Unassigned", 18)}
                        </text>
                        <circle
                          cx={NODE_HALF_WIDTH - 12}
                          cy={-NODE_HALF_HEIGHT + 12}
                          r="13"
                          fill="hsl(var(--background))"
                          stroke={isSelected ? "hsl(var(--neon-purple))" : "hsl(var(--border))"}
                          strokeWidth="1.5"
                        />
                        <text
                          x={NODE_HALF_WIDTH - 12}
                          y={-NODE_HALF_HEIGHT + 16}
                          textAnchor="middle"
                          fill="hsl(var(--foreground))"
                          fontFamily="JetBrains Mono, monospace"
                          fontSize="10"
                          fontWeight="700"
                        >
                          {connectionCount}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-base font-mono">Mini Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCharacter ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">{selectedCharacter.name}</h2>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {selectedCharacter.type || "Character Type Unset"}
                    </Badge>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {selectedCharacter.logline || "No logline available yet. Add one in Character Lab to deepen this profile."}
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                        Connection Count
                      </p>
                      <p className="mt-2 text-3xl font-bold font-mono">
                        {selectedCharacterRelationships.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                        Avg Strength
                      </p>
                      <p className="mt-2 text-3xl font-bold font-mono">
                        {selectedCharacterRelationships.length > 0
                          ? Math.round(
                              selectedCharacterRelationships.reduce(
                                (total, relationship) => total + relationship.strength,
                                0,
                              ) / selectedCharacterRelationships.length,
                            )
                          : 0}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Connected Relationships
                    </p>
                    {selectedCharacterRelationships.length > 0 ? (
                      selectedCharacterRelationships.map((relationship) => {
                        const counterpartId =
                          relationship.characterAId === selectedCharacter.id
                            ? relationship.characterBId
                            : relationship.characterAId;
                        const counterpart = characterMap.get(counterpartId);
                        const style = getRelationshipTypeStyle(relationship.type);

                        return (
                          <div
                            key={relationship.id}
                            className="rounded-xl border border-border bg-muted/20 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-1">
                                <p className="font-medium">{counterpart?.name || "Unknown Character"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {counterpart?.type || "Unknown"}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="font-mono text-[11px]"
                                style={{
                                  backgroundColor: style.background,
                                  borderColor: style.border,
                                  color: style.color,
                                }}
                              >
                                {relationship.type}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                              {relationship.description}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No mapped relationships yet. Add one from the panel on the right.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a character node to inspect their connections.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-base font-mono">Add Relationship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">Character A</Label>
                  <Select
                    value={form.characterAId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, characterAId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a character" />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map((character) => (
                        <SelectItem key={character.id} value={character.id}>
                          {character.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-xs">Character B</Label>
                  <Select
                    value={form.characterBId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, characterBId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a character" />
                    </SelectTrigger>
                    <SelectContent>
                      {characters.map((character) => (
                        <SelectItem key={character.id} value={character.id}>
                          {character.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs">Relationship Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value as RelationshipType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Describe the tension, trust, or emotional history between these characters."
                  className="min-h-[110px]"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                      Relationship Strength
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use the slider to represent how intense or important this bond is.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl">{form.strength}</p>
                    <p className="text-xs text-muted-foreground">{getStrengthTone(form.strength)}</p>
                  </div>
                </div>
                <Slider
                  value={[form.strength]}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, strength: value[0] || prev.strength }))
                  }
                  max={100}
                  min={1}
                  step={1}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                      Timeline Evolution
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Capture how the relationship changes across arcs, reveals, or major events.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="font-mono gap-2" onClick={addTimelineEntry}>
                    <Plus className="h-3.5 w-3.5" /> Add Event
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.timeline.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          Timeline Beat
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTimelineEntry(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="mt-3 space-y-3">
                        <Input
                          value={entry.label}
                          onChange={(event) =>
                            updateTimelineEntry(entry.id, { label: event.target.value })
                          }
                          placeholder="Ex: Before the betrayal"
                        />
                        <Textarea
                          value={entry.note}
                          onChange={(event) =>
                            updateTimelineEntry(entry.id, { note: event.target.value })
                          }
                          placeholder="Explain how the relationship shifts during this stage."
                          className="min-h-[88px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveRelationship}
                className="w-full bg-neon-purple hover:bg-neon-purple/90 font-mono"
                disabled={characters.length < 2}
              >
                Save Relationship
              </Button>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-base font-mono">Relationship List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleRelationships.length > 0 ? (
                visibleRelationships.map((relationship) => {
                  const left = characterMap.get(relationship.characterAId);
                  const right = characterMap.get(relationship.characterBId);
                  const style = getRelationshipTypeStyle(relationship.type);

                  return (
                    <div
                      key={relationship.id}
                      className="rounded-xl border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {left?.name || "Unknown"} <span className="text-muted-foreground">↔</span>{" "}
                            {right?.name || "Unknown"}
                          </p>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            Strength {relationship.strength} • {getStrengthTone(relationship.strength)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px]"
                            style={{
                              backgroundColor: style.background,
                              borderColor: style.border,
                              color: style.color,
                            }}
                          >
                            {relationship.type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRelationship(relationship.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {relationship.description}
                      </p>

                      {relationship.timeline.some((entry) => entry.label || entry.note) && (
                        <div className="mt-4 space-y-2">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
                            Timeline
                          </p>
                          {relationship.timeline.map((entry) => (
                            <div key={entry.id} className="flex gap-3">
                              <div className="flex flex-col items-center pt-1">
                                <div className="h-2.5 w-2.5 rounded-full bg-neon-cyan" />
                                <div className="mt-1 h-full w-px bg-border" />
                              </div>
                              <div className="pb-2">
                                <p className="text-sm font-medium">
                                  {entry.label || "Untitled Beat"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {entry.note || "No detail added for this shift yet."}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No relationships saved yet. Add one to start mapping your story dynamics.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CharacterRelationships;
