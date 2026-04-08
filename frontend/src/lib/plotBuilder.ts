export const PLOT_BUILDER_STORAGE_KEY = "writeforge-plot-builder";

export const PLOT_PHASES = [
  {
    value: "Promise",
    description: "Set expectations and seed story tension.",
    color: "hsl(var(--neon-cyan))",
    background: "hsl(var(--neon-cyan) / 0.12)",
    border: "hsl(var(--neon-cyan) / 0.35)",
  },
  {
    value: "Progress",
    description: "Escalate, complicate, and test the promise.",
    color: "hsl(var(--neon-purple))",
    background: "hsl(var(--neon-purple) / 0.14)",
    border: "hsl(var(--neon-purple) / 0.4)",
  },
  {
    value: "Payoff",
    description: "Deliver consequence, reversal, or resolution.",
    color: "hsl(var(--neon-pink))",
    background: "hsl(var(--neon-pink) / 0.12)",
    border: "hsl(var(--neon-pink) / 0.35)",
  },
] as const;

export type PlotPhase = (typeof PLOT_PHASES)[number]["value"];

export interface PlotCharacterLink {
  id: string;
  name: string;
  type: string;
}

export interface PlotSceneLink {
  id: string;
  text: string;
  wordCount: number;
  savedAt: string;
}

export interface PlotPoint {
  id: string;
  phase: PlotPhase;
  title: string;
  description: string;
  characterIds: string[];
  sceneIds: string[];
  stakes: string;
  conflictLevel: number;
  foreshadowingIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlotPointDraft {
  phase: PlotPhase;
  title: string;
  description: string;
  characterIds: string[];
  sceneIds: string[];
  stakes: string;
  conflictLevel: number;
  foreshadowingIds: string[];
}

const PHASE_SET = new Set<string>(PLOT_PHASES.map((phase) => phase.value));

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isPlotPhase = (value: unknown): value is PlotPhase =>
  typeof value === "string" && PHASE_SET.has(value);

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

export const createEmptyPlotPointDraft = (): PlotPointDraft => ({
  phase: "Promise",
  title: "",
  description: "",
  characterIds: [],
  sceneIds: [],
  stakes: "",
  conflictLevel: 55,
  foreshadowingIds: [],
});

export const normalizePlotPoint = (value: unknown, fallbackOrder: number): PlotPoint => {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const createdAt = toText(record.createdAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || createdAt;

  return {
    id: toText(record.id) || crypto.randomUUID(),
    phase: isPlotPhase(record.phase) ? record.phase : "Promise",
    title: toText(record.title),
    description: toText(record.description),
    characterIds: normalizeStringArray(record.characterIds),
    sceneIds: normalizeStringArray(record.sceneIds),
    stakes: toText(record.stakes),
    conflictLevel: clamp(toNumber(record.conflictLevel, 55), 1, 100),
    foreshadowingIds: normalizeStringArray(record.foreshadowingIds),
    order: toNumber(record.order, fallbackOrder),
    createdAt,
    updatedAt,
  };
};

export const syncPlotPoints = (value: unknown): PlotPoint[] =>
  (Array.isArray(value) ? value : [])
    .map((plotPoint, index) => normalizePlotPoint(plotPoint, index))
    .sort((left, right) => {
      if (left.phase !== right.phase) {
        return (
          PLOT_PHASES.findIndex((phase) => phase.value === left.phase) -
          PLOT_PHASES.findIndex((phase) => phase.value === right.phase)
        );
      }

      if (left.order !== right.order) return left.order - right.order;
      return left.title.localeCompare(right.title);
    });

export const assignPhaseOrder = (points: PlotPoint[]): PlotPoint[] => {
  const counters = new Map<PlotPhase, number>();

  return points.map((point) => {
    const nextOrder = counters.get(point.phase) || 0;
    counters.set(point.phase, nextOrder + 1);
    return { ...point, order: nextOrder };
  });
};

export const getPhaseStyle = (phase: PlotPhase) =>
  PLOT_PHASES.find((item) => item.value === phase) || PLOT_PHASES[0];

export const normalizePlotCharacters = (value: unknown): PlotCharacterLink[] => {
  if (!Array.isArray(value) || value.length === 0) return [];

  return value
    .map((item, index) => {
      const record =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};

      return {
        id: toText(record.id) || `character-${index + 1}`,
        name: toText(record.name) || `Character ${index + 1}`,
        type: toText(record.type),
      };
    })
    .filter((character) => character.name.trim().length > 0);
};

export const normalizePlotScenes = (value: unknown): PlotSceneLink[] =>
  Array.isArray(value)
    ? value
        .map((item, index) => {
          const record =
            item && typeof item === "object" ? (item as Record<string, unknown>) : {};

          return {
            id: toText(record.id) || `scene-${index + 1}`,
            text: toText(record.text),
            wordCount: toNumber(record.wordCount, 0),
            savedAt: toText(record.savedAt),
          };
        })
        .filter((scene) => scene.id.trim().length > 0)
    : [];
