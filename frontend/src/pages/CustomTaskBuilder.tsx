import { type DragEvent, useMemo, useState } from "react";
import { DAYS } from "@/data/tasks";
import { useCustomTasks } from "@/hooks/useCustomTasks";
import { cn } from "@/lib/utils";
import {
  CUSTOM_TASK_CATEGORIES,
  buildCustomTaskDefinition,
  cloneCustomTask,
  createCustomTaskRule,
  createCustomTaskStep,
  createEmptyCustomTask,
  duplicateCustomTask,
  type CustomTask,
  type CustomTaskCategory,
  type CustomTaskDay,
} from "@/lib/customTasks";
import {
  generateTask,
  type GeneratedTaskResult,
} from "@/lib/taskGenerator";
import TaskSharingPanel from "@/components/taskSharing/TaskSharingPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Timer,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90];

const getCategoryBadgeStyle = (category: CustomTaskCategory) => {
  switch (category) {
    case "Character":
      return {
        backgroundColor: "hsl(var(--neon-cyan) / 0.12)",
        borderColor: "hsl(var(--neon-cyan) / 0.35)",
        color: "hsl(var(--neon-cyan))",
      };
    case "Plot":
      return {
        backgroundColor: "hsl(var(--neon-pink) / 0.12)",
        borderColor: "hsl(var(--neon-pink) / 0.35)",
        color: "hsl(var(--neon-pink))",
      };
    case "Action":
      return {
        backgroundColor: "hsl(var(--neon-pink) / 0.12)",
        borderColor: "hsl(var(--neon-pink) / 0.35)",
        color: "hsl(var(--neon-pink))",
      };
    case "Dialogue":
      return {
        backgroundColor: "hsl(var(--neon-cyan) / 0.12)",
        borderColor: "hsl(var(--neon-cyan) / 0.35)",
        color: "hsl(var(--neon-cyan))",
      };
    case "Emotion":
      return {
        backgroundColor: "hsl(var(--neon-purple) / 0.14)",
        borderColor: "hsl(var(--neon-purple) / 0.4)",
        color: "hsl(var(--neon-purple))",
      };
    case "Prose":
      return {
        backgroundColor: "hsl(var(--foreground) / 0.08)",
        borderColor: "hsl(var(--foreground) / 0.18)",
        color: "hsl(var(--foreground))",
      };
    case "World":
    case "Worldbuilding":
      return {
        backgroundColor: "hsl(var(--foreground) / 0.08)",
        borderColor: "hsl(var(--foreground) / 0.18)",
        color: "hsl(var(--foreground))",
      };
    case "Custom":
    default:
      return {
        backgroundColor: "hsl(var(--muted) / 0.8)",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
      };
  }
};

const TaskPreviewCard = ({ task }: { task: CustomTask }) => {
  const previewTask = useMemo(() => buildCustomTaskDefinition(task), [task]);
  const steps = previewTask.steps.length > 0 ? previewTask.steps : ["Add at least one step to guide the exercise."];
  const rules = previewTask.importantRules.length > 0
    ? previewTask.importantRules
    : ["No important rules added yet."];

  return (
    <Card className="glow-card glow-border bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">
                {task.title.trim() || "Untitled Task"}
              </CardTitle>
              <Badge
                variant="outline"
                className="font-mono text-[11px]"
                style={getCategoryBadgeStyle(task.category)}
              >
                {task.category}
              </Badge>
              {task.savedAsTemplate && (
                <Badge variant="secondary" className="font-mono text-[11px]">
                  Template
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
              <span>{task.assignedDay}</span>
              <span>{task.durationMinutes} min</span>
              <span>Custom Builder Preview</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-neon-cyan" />
              Session Length
            </div>
            <p className="mt-1 text-sm text-foreground">{task.durationMinutes} minutes</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Prompt</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {task.prompt.trim() || "Add a prompt to see the main instruction here."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Step-by-Step</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-background/40 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">Important Rules</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CustomTaskBuilder = () => {
  const confirmDelete = useDeleteConfirmation();
  const { tasks, defaultTasks, customTasks, setTasks, setCustomTasks } = useCustomTasks();
  const [builderTask, setBuilderTask] = useState<CustomTask | null>(null);
  const [builderMode, setBuilderMode] = useState<"edit" | "preview">("edit");
  const [showDefaultTasks, setShowDefaultTasks] = useState(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);
  const [lastGeneratedTask, setLastGeneratedTask] = useState<GeneratedTaskResult | null>(null);

  const isEditingExisting = builderTask ? tasks.some((task) => task.id === builderTask.id) : false;
  const isEditingDefaultTask = builderTask?.source === "default";

  const resetTaskGenerator = () => {
    setIsGeneratingTask(false);
    setLastGeneratedTask(null);
  };

  const openNewTask = () => {
    setBuilderTask(createEmptyCustomTask());
    setBuilderMode("edit");
    setDraggedStepId(null);
    setDragOverStepId(null);
    resetTaskGenerator();
  };

  const editTask = (task: CustomTask) => {
    setBuilderTask(cloneCustomTask(task));
    setBuilderMode("edit");
    setDraggedStepId(null);
    setDragOverStepId(null);
    if (task.source === "default") {
      setShowDefaultTasks(true);
    }
    resetTaskGenerator();
  };

  const closeBuilder = () => {
    setBuilderTask(null);
    setBuilderMode("edit");
    setDraggedStepId(null);
    setDragOverStepId(null);
    resetTaskGenerator();
  };

  const updateTask = (update: Partial<CustomTask>) => {
    setBuilderTask((prev) => (prev ? { ...prev, ...update } : prev));
  };

  const updateStep = (id: string, text: string) => {
    setBuilderTask((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((step) => (step.id === id ? { ...step, text } : step)),
          }
        : prev,
    );
  };

  const addStep = () => {
    setBuilderTask((prev) =>
      prev
        ? {
            ...prev,
            steps: [...prev.steps, createCustomTaskStep()],
          }
        : prev,
    );
  };

  const removeStep = async (id: string) => {
    const target = builderTask?.steps.find((step) => step.id === id);
    const shouldDelete = await confirmDelete({
      title: `Delete ${target?.text?.trim() ? `step "${target.text}"` : "this step"}?`,
      description: "This step will be removed from the current custom task draft.",
      confirmLabel: "Delete Step",
    });
    if (!shouldDelete) return;

    setBuilderTask((prev) => {
      if (!prev) return prev;

      const nextSteps = prev.steps.filter((step) => step.id !== id);
      return {
        ...prev,
        steps: nextSteps.length > 0 ? nextSteps : [createCustomTaskStep()],
      };
    });
  };

  const updateRule = (id: string, update: Partial<CustomTask["importantRules"][number]>) => {
    setBuilderTask((prev) =>
      prev
        ? {
            ...prev,
            importantRules: prev.importantRules.map((rule) =>
              rule.id === id ? { ...rule, ...update } : rule,
            ),
          }
        : prev,
    );
  };

  const addRule = () => {
    setBuilderTask((prev) =>
      prev
        ? {
            ...prev,
            importantRules: [...prev.importantRules, createCustomTaskRule()],
          }
        : prev,
    );
  };

  const removeRule = async (id: string) => {
    const target = builderTask?.importantRules.find((rule) => rule.id === id);
    const shouldDelete = await confirmDelete({
      title: `Delete ${target?.text?.trim() ? `rule "${target.text}"` : "this rule"}?`,
      description: "This important-rule bullet will be removed from the current custom task draft.",
      confirmLabel: "Delete Rule",
    });
    if (!shouldDelete) return;

    setBuilderTask((prev) => {
      if (!prev) return prev;

      const nextRules = prev.importantRules.filter((rule) => rule.id !== id);
      return {
        ...prev,
        importantRules: nextRules.length > 0 ? nextRules : [createCustomTaskRule()],
      };
    });
  };

  const handleStepDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggedStepId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleStepDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggedStepId && draggedStepId !== id) {
      setDragOverStepId(id);
    }
  };

  const handleStepDrop = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    const sourceId = draggedStepId || event.dataTransfer.getData("text/plain");

    if (!sourceId || sourceId === id) {
      setDraggedStepId(null);
      setDragOverStepId(null);
      return;
    }

    setBuilderTask((prev) => {
      if (!prev) return prev;

      const sourceIndex = prev.steps.findIndex((step) => step.id === sourceId);
      const targetIndex = prev.steps.findIndex((step) => step.id === id);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const nextSteps = [...prev.steps];
      const [movedStep] = nextSteps.splice(sourceIndex, 1);
      nextSteps.splice(targetIndex, 0, movedStep);

      return {
        ...prev,
        steps: nextSteps,
      };
    });

    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  const handleStepDragEnd = () => {
    setDraggedStepId(null);
    setDragOverStepId(null);
  };

  const applyGeneratedTask = async () => {
    if (typeof window === "undefined") return;
    if (typeof generateTask !== "function") {
      console.error("Task generator not loaded");
      return;
    }
    if (!builderTask) return;

    setIsGeneratingTask(true);

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const result = generateTask();

      setBuilderTask((prev) =>
        prev
          ? {
              ...prev,
              title: result.title,
              prompt: result.description,
            }
          : prev,
      );
      setLastGeneratedTask(result);

      toast.success("Task generated", {
        description: `${result.title} is ready to edit, assign, and refine.`,
      });
      if (result.recycledPool) {
        toast.success("Task history refreshed", {
          description: "The generator reset its no-repeat pool after exhausting recent combinations.",
        });
      }
    } catch (error) {
      console.error("Task generation failed", error);
      toast.error("Task generation failed", {
        description: "Please try again.",
      });
    } finally {
      setIsGeneratingTask(false);
    }
  };

  const handleGenerateTask = async () => {
    await applyGeneratedTask();
  };

  const handleRegenerateTask = async () => {
    await applyGeneratedTask();
  };

  const saveTask = () => {
    if (!builderTask) return;

    const title = builderTask.title.trim();
    const prompt = builderTask.prompt.trim();
    const steps = builderTask.steps
      .map((step) => ({ ...step, text: step.text.trim() }))
      .filter((step) => step.text.length > 0);

    if (!title) {
      toast.error("Task title required");
      return;
    }

    if (!prompt) {
      toast.error("Prompt required");
      return;
    }

    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    const rules = builderTask.importantRules
      .map((rule) => ({ ...rule, text: rule.text.trim() }))
      .filter((rule) => rule.text.length > 0);
    const timestamp = new Date().toISOString();
    const nextTask: CustomTask = {
      ...builderTask,
      title,
      prompt,
      steps,
      importantRules: rules.length > 0 ? rules : [createCustomTaskRule("", false)],
      updatedAt: timestamp,
      createdAt: isEditingExisting ? builderTask.createdAt : timestamp,
    };

    if (nextTask.source === "default") {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === nextTask.id
            ? {
                ...nextTask,
                order: task.order,
              }
            : task,
        ),
      );

      toast.success("Daily task updated", {
        description: `${nextTask.title} now drives both Daily Tasks and Weekly Schedule.`,
      });
    } else {
      setCustomTasks((prev) => {
        const next = [...prev];
        const index = next.findIndex((task) => task.id === nextTask.id);

        if (index >= 0) {
          next[index] = {
            ...nextTask,
            order: next[index].order,
          };
          return next;
        }

        return [...next, { ...nextTask, order: prev.length }];
      });

      toast.success(isEditingExisting ? "Task updated" : "Task created", {
        description: `${nextTask.title} is now part of your custom writing system.`,
      });
    }

    closeBuilder();
  };

  const duplicateTask = (task: CustomTask) => {
    const copy = duplicateCustomTask(task);

    setCustomTasks((prev) => [...prev, { ...copy, order: prev.length }]);
    toast.success("Task duplicated", {
      description: `${copy.title} was added to your custom tasks.`,
    });
  };

  const deleteTask = async (id: string) => {
    const target = customTasks.find((task) => task.id === id);
    if (!target) return;

    const shouldDelete = await confirmDelete({
      title: `Delete "${target.title || "this task"}"?`,
      description: "This custom task will be removed from your writing system. This action cannot be undone.",
      confirmLabel: "Delete Task",
    });
    if (!shouldDelete) return;

    setCustomTasks((prev) => prev.filter((task) => task.id !== id));

    if (builderTask?.id === id) {
      closeBuilder();
    }

    toast.success("Task deleted", {
      description: `${target?.title || "Task"} was removed.`,
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Task Builder</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Edit the default daily system here, or build extra writing drills around it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="font-mono gap-2"
            onClick={() => setShowDefaultTasks((prev) => !prev)}
            aria-expanded={showDefaultTasks}
            aria-controls="default-daily-tasks-panel"
          >
            Default Daily Tasks
            <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
              {defaultTasks.length}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                showDefaultTasks && "rotate-180",
              )}
            />
          </Button>
          <TaskSharingPanel tasks={customTasks} setTasks={setCustomTasks} />
          <Button
            onClick={openNewTask}
            className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2"
          >
            <Plus className="h-4 w-4" /> Create New Task
          </Button>
        </div>
      </div>

      {builderTask && (
        <Card className="glow-card glow-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">
                  {isEditingDefaultTask ? "Edit Default Daily Task" : isEditingExisting ? "Edit Custom Task" : "New Custom Task"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isEditingDefaultTask
                    ? "Changes here immediately reshape the task library used by Daily Tasks and Weekly Schedule."
                    : "Shape the exercise, preview it, then save it into your writing loop."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-border bg-muted/30 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={builderMode === "edit" ? "secondary" : "ghost"}
                    className="font-mono"
                    onClick={() => setBuilderMode("edit")}
                  >
                    Builder
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={builderMode === "preview" ? "secondary" : "ghost"}
                    className="font-mono gap-2"
                    onClick={() => setBuilderMode("preview")}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={closeBuilder}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {builderMode === "preview" ? (
              <TaskPreviewCard task={builderTask} />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Task Title</Label>
                    <Input
                      value={builderTask.title}
                      onChange={(event) => updateTask({ title: event.target.value })}
                      placeholder="Ex: Pressure Dialogue Sprint"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Category</Label>
                    <Select
                      value={builderTask.category}
                      onValueChange={(value) => updateTask({ category: value as CustomTaskCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOM_TASK_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Time Duration</Label>
                    <Select
                      value={String(builderTask.durationMinutes)}
                      onValueChange={(value) => updateTask({ durationMinutes: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((minutes) => (
                          <SelectItem key={minutes} value={String(minutes)}>
                            {minutes} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Assign To Day</Label>
                    <Select
                      value={builderTask.assignedDay}
                      onValueChange={(value) => updateTask({ assignedDay: value as CustomTaskDay })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="font-mono text-xs">Prompt</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono gap-2"
                        onClick={() => void handleGenerateTask()}
                        disabled={isGeneratingTask}
                      >
                        {isGeneratingTask ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-neon-cyan" />
                        ) : (
                          <WandSparkles className="h-3.5 w-3.5 text-neon-cyan" />
                        )}
                        Generate Task
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono gap-2"
                        onClick={() => void handleRegenerateTask()}
                        disabled={isGeneratingTask}
                      >
                        <WandSparkles className="h-3.5 w-3.5 text-neon-purple" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={builderTask.prompt}
                    onChange={(event) => {
                      updateTask({ prompt: event.target.value });
                      setLastGeneratedTask(null);
                    }}
                    placeholder="Define the core writing instruction for this exercise."
                    className="min-h-[120px]"
                  />
                  {isGeneratingTask && (
                    <p className="text-xs text-muted-foreground">Generating skill-based task...</p>
                  )}
                  {!isGeneratingTask && lastGeneratedTask && (
                    <p className="text-xs text-muted-foreground">
                      Generated a reusable writing exercise focused on {lastGeneratedTask.focus}.
                    </p>
                  )}
                  {!isGeneratingTask && !lastGeneratedTask && (
                    <p className="text-xs text-muted-foreground">
                      Task Generator fills the title plus prompt, and everything stays editable before you save.
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">
                        Step-by-Step Rules
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Drag steps by the grip to reorder the exercise flow.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="font-mono gap-2" onClick={addStep}>
                      <Plus className="h-3.5 w-3.5" /> Add Step
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {builderTask.steps.map((step, index) => {
                      const isDragOver = dragOverStepId === step.id && draggedStepId !== step.id;

                      return (
                        <div
                          key={step.id}
                          onDragOver={(event) => handleStepDragOver(event, step.id)}
                          onDrop={(event) => handleStepDrop(event, step.id)}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3 transition-colors duration-200",
                            isDragOver && "border-primary/40 bg-primary/5",
                          )}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-0.5 h-8 w-8 cursor-grab text-muted-foreground hover:text-foreground"
                            draggable
                            onDragStart={(event) => handleStepDragStart(event, step.id)}
                            onDragEnd={handleStepDragEnd}
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                          <div className="flex-1 space-y-2">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Step {index + 1}
                            </p>
                            <Input
                              value={step.text}
                              onChange={(event) => updateStep(step.id, event.target.value)}
                              placeholder="Describe what the writer should do in this step."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => void removeStep(step.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-purple">
                        Important Rules
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Toggle each bullet on or off to control what appears in the task card.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="font-mono gap-2" onClick={addRule}>
                      <Plus className="h-3.5 w-3.5" /> Add Rule
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {builderTask.importantRules.map((rule) => (
                      <div key={rule.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox
                            checked={rule.enabled}
                            onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked === true })}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              {rule.enabled ? "Enabled Bullet" : "Hidden Bullet"}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {rule.enabled ? "Shown in preview" : "Saved but hidden"}
                            </span>
                          </div>
                          <Input
                            value={rule.text}
                            onChange={(event) => updateRule(rule.id, { text: event.target.value })}
                            placeholder="Ex: Avoid generic verbs in the opening paragraph."
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => void removeRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {builderTask.source === "custom" && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-neon-pink">
                          Save As Template
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Mark this task as reusable so it is easy to spot and duplicate later.
                        </p>
                      </div>
                      <Switch
                        checked={builderTask.savedAsTemplate}
                        onCheckedChange={(checked) => updateTask({ savedAsTemplate: checked })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="ghost" className="font-mono" onClick={closeBuilder}>
                Cancel
              </Button>
              {builderMode === "edit" && (
                <Button type="button" variant="outline" className="font-mono gap-2" onClick={() => setBuilderMode("preview")}>
                  <Eye className="h-4 w-4" /> Preview Task
                </Button>
              )}
              <Button type="button" className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2" onClick={saveTask}>
                <CheckCircle2 className="h-4 w-4" />
                {builderTask?.source === "default"
                  ? "Save Daily Task"
                  : isEditingExisting
                    ? "Save Changes"
                    : "Save Task"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Collapsible open={showDefaultTasks} onOpenChange={setShowDefaultTasks}>
        <CollapsibleContent id="default-daily-tasks-panel" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
                Default Daily Tasks
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These are the built-in tasks every account starts with. Edit them here only when you want to reshape the weekly system itself.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
              {defaultTasks.length} daily defaults
            </div>
          </div>

          <div className="grid gap-4">
            {defaultTasks.map((task) => {
              const enabledRules = task.importantRules.filter((rule) => rule.enabled && rule.text.trim().length > 0);
              const visibleSteps = task.steps.filter((step) => step.text.trim().length > 0);

              return (
                <Card key={task.id} className="glow-card glow-border">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg">{task.title || "Untitled Task"}</CardTitle>
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px]"
                            style={getCategoryBadgeStyle(task.category)}
                          >
                            {task.category}
                          </Badge>
                          <Badge variant="secondary" className="font-mono text-[11px]">
                            Daily Default
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                          <span>{task.assignedDay}</span>
                          <span>{task.durationMinutes} min</span>
                          <span>{visibleSteps.length} steps</span>
                          <span>{enabledRules.length} rules active</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-mono gap-2"
                          onClick={() => editTask(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit Daily Task
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Prompt</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {task.prompt}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background/40 p-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Steps</p>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                          {visibleSteps.slice(0, 4).map((step) => (
                            <li key={step.id}>{step.text}</li>
                          ))}
                        </ol>
                        {visibleSteps.length > 4 && (
                          <p className="mt-3 text-xs font-mono text-muted-foreground">
                            +{visibleSteps.length - 4} more step{visibleSteps.length - 4 === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-background/40 p-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">Important Rules</p>
                        {enabledRules.length > 0 ? (
                          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                            {enabledRules.slice(0, 4).map((rule) => (
                              <li key={rule.id}>{rule.text}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            No important rules enabled yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Your Custom Tasks
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Extra drills live here and still appear in Daily Tasks on their assigned day.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
            {customTasks.length} saved • {customTasks.filter((task) => task.savedAsTemplate).length} templates
          </div>
        </div>

        {customTasks.length === 0 ? (
          <Card className="glow-border border-dashed bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <WandSparkles className="h-8 w-8 text-neon-purple" />
              <div>
                <p className="font-mono text-sm">No custom tasks yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first extra exercise to expand the default weekly system.
                </p>
              </div>
              <Button onClick={openNewTask} variant="outline" className="font-mono gap-2">
                <Plus className="h-4 w-4" /> New Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {customTasks.map((task) => {
              const enabledRules = task.importantRules.filter((rule) => rule.enabled && rule.text.trim().length > 0);
              const visibleSteps = task.steps.filter((step) => step.text.trim().length > 0);

              return (
                <Card key={task.id} className="glow-card glow-border">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg">{task.title || "Untitled Task"}</CardTitle>
                          <Badge
                            variant="outline"
                            className="font-mono text-[11px]"
                            style={getCategoryBadgeStyle(task.category)}
                          >
                            {task.category}
                          </Badge>
                          {task.savedAsTemplate && (
                            <Badge variant="secondary" className="font-mono text-[11px]">
                              Template
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                          <span>{task.assignedDay}</span>
                          <span>{task.durationMinutes} min</span>
                          <span>{visibleSteps.length} steps</span>
                          <span>{enabledRules.length} rules active</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-mono gap-2"
                          onClick={() => editTask(task)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-mono gap-2"
                          onClick={() => duplicateTask(task)}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="font-mono gap-2 text-muted-foreground hover:text-destructive"
                          onClick={() => void deleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Prompt</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {task.prompt}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background/40 p-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Steps</p>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                          {visibleSteps.slice(0, 4).map((step) => (
                            <li key={step.id}>{step.text}</li>
                          ))}
                        </ol>
                        {visibleSteps.length > 4 && (
                          <p className="mt-3 text-xs font-mono text-muted-foreground">
                            +{visibleSteps.length - 4} more step{visibleSteps.length - 4 === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-background/40 p-4">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">Important Rules</p>
                        {enabledRules.length > 0 ? (
                          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                            {enabledRules.slice(0, 4).map((rule) => (
                              <li key={rule.id}>{rule.text}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            No important rules enabled yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTaskBuilder;
