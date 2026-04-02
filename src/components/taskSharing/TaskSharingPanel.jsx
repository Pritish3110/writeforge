import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DAYS, getDayName } from "@/data/tasks";
import {
  CUSTOM_TASK_CATEGORIES,
  createCustomTaskRule,
  createCustomTaskStep,
} from "@/lib/customTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import {
  CopyPlus,
  Download,
  Loader2,
  Save,
  Share2,
  Upload,
} from "lucide-react";
import TaskExportModal from "@/components/taskSharing/TaskExportModal";
import TaskImportModal from "@/components/taskSharing/TaskImportModal";
import TaskTemplateCard from "@/components/taskSharing/TaskTemplateCard";

const TEMPLATE_STORAGE_KEY = "taskTemplates";

const defaultTask = {
  id: "",
  title: "",
  description: "",
  steps: [],
  tags: [],
  createdAt: "",
};

const defaultTemplate = {
  id: "",
  name: "",
  tasks: [],
};

const safeText = (value) => (typeof value === "string" ? value : "");

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeListValue = (value) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value;
    return safeText(record.text || record.label || record.value);
  }

  return "";
};

const extractTagValue = (tags, prefix) => {
  const tag = safeArray(tags).find(
    (item) => typeof item === "string" && item.startsWith(prefix),
  );

  return tag ? tag.slice(prefix.length).trim() : "";
};

const isKnownCategory = (value) => CUSTOM_TASK_CATEGORIES.includes(value);
const isKnownDay = (value) => DAYS.includes(value);

const normalizeSharedTask = (value, index = 0) => {
  const record = value && typeof value === "object" ? value : {};
  const steps = safeArray(record.steps)
    .map(normalizeListValue)
    .filter(Boolean);
  const tags = safeArray(record.tags)
    .map(normalizeListValue)
    .filter(Boolean);

  return {
    ...defaultTask,
    id: safeText(record.id) || `shared-task-${index + 1}`,
    title: safeText(record.title),
    description: safeText(record.description),
    steps,
    tags,
    createdAt: safeText(record.createdAt) || new Date().toISOString(),
  };
};

const normalizeTemplate = (value, index = 0) => {
  const record = value && typeof value === "object" ? value : {};

  return {
    ...defaultTemplate,
    id: safeText(record.id) || `template-${index + 1}`,
    name: safeText(record.name) || `Template ${index + 1}`,
    tasks: safeArray(record.tasks).map((task, taskIndex) =>
      normalizeSharedTask(task, taskIndex),
    ),
  };
};

const readStoredTemplates = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return safeArray(parsed).map((template, index) => normalizeTemplate(template, index));
  } catch (error) {
    console.error(error);
    return [];
  }
};

const writeStoredTemplates = (templates) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
};

const downloadFile = (content, fileName, mimeType) => {
  if (typeof window === "undefined") {
    throw new Error("File download is only available in the browser.");
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

const toSharedTasks = (tasks) =>
  safeArray(tasks)
    .map((task, index) => {
      const importantRules = safeArray(task?.importantRules)
        .map((rule) => safeText(rule?.text || rule))
        .filter(Boolean);

      return {
        ...defaultTask,
        id: safeText(task?.id) || `task-${index + 1}`,
        title: safeText(task?.title) || `Untitled Task ${index + 1}`,
        description: safeText(task?.prompt || task?.description),
        steps: safeArray(task?.steps).map(normalizeListValue).filter(Boolean),
        tags: [
          `category:${safeText(task?.category) || "Custom"}`,
          `day:${safeText(task?.assignedDay) || getDayName()}`,
          `duration:${
            Number.isFinite(task?.durationMinutes) ? task.durationMinutes : 10
          }`,
          ...(task?.savedAsTemplate ? ["template:true"] : []),
          ...importantRules.map((rule) => `rule:${rule}`),
        ],
        createdAt: safeText(task?.createdAt) || new Date().toISOString(),
      };
    })
    .filter((task) => task.title || task.description || task.steps.length > 0);

const toCustomTask = (sharedTask, index = 0) => {
  const normalizedTask = normalizeSharedTask(sharedTask, index);
  const categoryValue = extractTagValue(normalizedTask.tags, "category:");
  const dayValue = extractTagValue(normalizedTask.tags, "day:");
  const durationValue = Number.parseInt(
    extractTagValue(normalizedTask.tags, "duration:"),
    10,
  );
  const importantRules = normalizedTask.tags
    .filter((tag) => typeof tag === "string" && tag.startsWith("rule:"))
    .map((tag) => tag.slice("rule:".length).trim())
    .filter(Boolean);
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: normalizedTask.title || `Imported Task ${index + 1}`,
    category: isKnownCategory(categoryValue) ? categoryValue : "Custom",
    durationMinutes:
      Number.isFinite(durationValue) && durationValue > 0 ? durationValue : 10,
    prompt: normalizedTask.description || "Imported task description.",
    steps:
      normalizedTask.steps.length > 0
        ? normalizedTask.steps.map((step) => createCustomTaskStep(step))
        : [createCustomTaskStep("Review and adapt this imported task.")],
    importantRules:
      importantRules.length > 0
        ? importantRules.map((rule) => createCustomTaskRule(rule, true))
        : [createCustomTaskRule("", false)],
    assignedDay: isKnownDay(dayValue) ? dayValue : getDayName(),
    savedAsTemplate: normalizedTask.tags.includes("template:true"),
    order: Number.MAX_SAFE_INTEGER,
    createdAt: normalizedTask.createdAt || timestamp,
    updatedAt: timestamp,
  };
};

const buildTextExport = (sharedTasks) => {
  const sections = safeArray(sharedTasks).map((task, index) => {
    const category = extractTagValue(task.tags, "category:") || "Custom";
    const day = extractTagValue(task.tags, "day:") || "Unassigned";
    const duration = extractTagValue(task.tags, "duration:") || "10";
    const importantRules = safeArray(task.tags)
      .filter((tag) => typeof tag === "string" && tag.startsWith("rule:"))
      .map((tag) => tag.slice("rule:".length).trim())
      .filter(Boolean);

    return [
      `${index + 1}. ${task.title || "Untitled Task"}`,
      `Description: ${task.description || "No description provided."}`,
      `Category: ${category}`,
      `Assigned Day: ${day}`,
      `Duration: ${duration} min`,
      `Created: ${task.createdAt || "Unknown"}`,
      `Steps:`,
      ...(task.steps.length > 0
        ? task.steps.map((step, stepIndex) => `  ${stepIndex + 1}. ${step}`)
        : ["  - No steps provided."]),
      `Rules:`,
      ...(importantRules.length > 0
        ? importantRules.map((rule) => `  - ${rule}`)
        : ["  - No rules saved."]),
    ].join("\n");
  });

  return [
    "WriteForge Task Export",
    `Exported At: ${new Date().toLocaleString()}`,
    `Task Count: ${sharedTasks.length}`,
    "",
    sections.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n");
};

const TaskSharingPanel = ({ tasks, setTasks }) => {
  const [open, setOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState(() => readStoredTemplates());
  const [isExporting, setIsExporting] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState("");

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const sharedTasks = useMemo(() => toSharedTasks(safeTasks), [safeTasks]);

  useEffect(() => {
    if (open) {
      setTemplates(readStoredTemplates());
    }
  }, [open]);

  const handleExportJson = async () => {
    setIsExporting("json");

    try {
      if (sharedTasks.length === 0) {
        toast.error("Nothing to export", {
          description: "Create or save at least one custom task first.",
        });
        return;
      }

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks: sharedTasks,
      };

      downloadFile(
        JSON.stringify(payload, null, 2),
        "tasks.json",
        "application/json;charset=utf-8",
      );
      toast.success("Tasks exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The tasks could not be exported.",
      });
    } finally {
      setIsExporting("");
    }
  };

  const handleExportText = async () => {
    setIsExporting("text");

    try {
      if (sharedTasks.length === 0) {
        toast.error("Nothing to export", {
          description: "Create or save at least one custom task first.",
        });
        return;
      }

      downloadFile(
        buildTextExport(sharedTasks),
        "tasks.txt",
        "text/plain;charset=utf-8",
      );
      toast.success("Tasks exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The text export could not be created.",
      });
    } finally {
      setIsExporting("");
    }
  };

  const handleImportFile = async (file) => {
    setIsImporting(true);

    try {
      if (!file || typeof file.text !== "function") {
        toast.error("Invalid file format");
        return false;
      }

      if (typeof setTasks !== "function") {
        toast.error("Something went wrong");
        return false;
      }

      const raw = await file.text();
      const data = JSON.parse(raw);
      const importedTaskList = Array.isArray(data?.tasks)
        ? data.tasks
        : Array.isArray(data)
          ? data
          : null;

      if (!importedTaskList || !Array.isArray(importedTaskList)) {
        toast.error("Invalid file format", {
          description: "The selected file needs a tasks array.",
        });
        return false;
      }

      const importedSharedTasks = importedTaskList
        .map((task, index) => normalizeSharedTask(task, index))
        .filter((task) => task.title || task.description || task.steps.length > 0);

      if (importedSharedTasks.length === 0) {
        toast.error("Invalid file format", {
          description: "No usable tasks were found in the selected file.",
        });
        return false;
      }

      const importedCustomTasks = importedSharedTasks.map((task, index) =>
        toCustomTask(task, index),
      );

      setTasks((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        ...importedCustomTasks,
      ]);

      toast.success("Tasks imported successfully", {
        description: `${importedCustomTasks.length} task${
          importedCustomTasks.length === 1 ? "" : "s"
        } added to this project.`,
      });

      return true;
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The import could not be completed.",
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);

    try {
      if (sharedTasks.length === 0) {
        toast.error("No tasks available", {
          description: "Create at least one custom task before saving a template.",
        });
        return;
      }

      const name = templateName.trim() || `Template ${templates.length + 1}`;
      const nextTemplate = {
        ...defaultTemplate,
        id: crypto.randomUUID(),
        name,
        tasks: sharedTasks.map((task, index) => normalizeSharedTask(task, index)),
      };
      const nextTemplates = [...readStoredTemplates(), nextTemplate];

      writeStoredTemplates(nextTemplates);
      setTemplates(nextTemplates);
      setTemplateName("");
      setShowTemplateForm(false);

      toast.success("Template saved successfully", {
        description: `${name} is ready to reuse later.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The template could not be saved.",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUseTemplate = async (template) => {
    const templateId = safeText(template?.id);
    setActiveTemplateId(templateId);

    try {
      if (typeof setTasks !== "function") {
        toast.error("Something went wrong");
        return;
      }

      const templateTasks = safeArray(template?.tasks)
        .map((task, index) => normalizeSharedTask(task, index))
        .filter((task) => task.title || task.description || task.steps.length > 0);

      if (templateTasks.length === 0) {
        toast.error("Invalid file format", {
          description: "This template does not contain any reusable tasks.",
        });
        return;
      }

      const nextTasks = templateTasks.map((task, index) => toCustomTask(task, index));

      setTasks((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        ...nextTasks,
      ]);

      toast.success("Template duplicated successfully", {
        description: `${template?.name || "Template"} added ${nextTasks.length} task${
          nextTasks.length === 1 ? "" : "s"
        } to this project.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The template could not be applied.",
      });
    } finally {
      setActiveTemplateId("");
    }
  };

  const handleDeleteTemplate = (templateId) => {
    try {
      const nextTemplates = readStoredTemplates().filter(
        (template) => template.id !== templateId,
      );
      writeStoredTemplates(nextTemplates);
      setTemplates(nextTemplates);

      toast.success("Template deleted");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description: "The template could not be deleted.",
      });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setShowTemplateForm(false);
            setTemplateName("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="font-mono gap-2">
            <Share2 className="h-4 w-4 text-neon-cyan" />
            Share Tasks
          </Button>
        </DialogTrigger>
        <DialogContent className="glow-border border-neon-purple/30 bg-card/95 backdrop-blur-sm sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">Task Sharing</DialogTitle>
            <DialogDescription className="max-w-3xl text-sm text-muted-foreground/85">
              Export tasks, import shared sets, and save reusable templates without changing your existing routes.
            </DialogDescription>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4 pt-1"
          >
            <div className="grid gap-3 lg:grid-cols-[1.35fr_0.95fr]">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <Card className="rounded-xl border border-neon-purple/40 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--muted)/0.32))] shadow-[0_0_0_1px_hsl(var(--neon-purple)/0.14),0_18px_36px_hsl(var(--background)/0.28)] transition-all duration-200 hover:border-neon-purple/60 hover:shadow-[0_0_0_1px_hsl(var(--neon-purple)/0.2),0_0_24px_hsl(var(--neon-purple)/0.12)]">
                  <CardHeader className="space-y-3 pb-2 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg border border-neon-purple/30 bg-neon-purple/10 p-2">
                            <Download className="h-5 w-5 text-neon-purple" />
                          </div>
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-purple">
                              Primary Action
                            </p>
                            <CardTitle className="mt-1 text-base">Export Tasks</CardTitle>
                          </div>
                        </div>
                        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                          Package your current task set for other projects as a clean JSON export or a readable summary.
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-right">
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Ready To Share
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {sharedTasks.length}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pb-5 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">Export is the fastest way to move tasks between projects.</p>
                      <p className="text-xs text-muted-foreground">Best for backups, sharing, and future imports.</p>
                    </div>
                    <Button
                      type="button"
                      className="min-w-36 bg-neon-purple hover:bg-neon-purple/90 font-mono shadow-[0_0_20px_hsl(var(--neon-purple)/0.18)]"
                      onClick={() => setIsExportModalOpen(true)}
                    >
                      Open Export
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <Card className="rounded-xl glow-border bg-muted/15 shadow-[0_10px_24px_hsl(var(--background)/0.18)] transition-all duration-200 hover:border-neon-cyan/40 hover:shadow-[0_0_18px_hsl(var(--neon-cyan)/0.08)]">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4.5 w-4.5 text-neon-cyan" />
                        <CardTitle className="text-sm">Import Tasks</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 pt-0">
                      <p className="text-sm text-muted-foreground">
                        Merge a validated shared task file into this project safely.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full font-mono"
                        onClick={() => setIsImportModalOpen(true)}
                      >
                        Open Import
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <Card className="rounded-xl glow-border bg-muted/15 shadow-[0_10px_24px_hsl(var(--background)/0.18)] transition-all duration-200 hover:border-neon-pink/40 hover:shadow-[0_0_18px_hsl(var(--neon-pink)/0.08)]">
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2">
                        <CopyPlus className="h-4.5 w-4.5 text-neon-pink" />
                        <CardTitle className="text-sm">Save as Template</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 pt-0">
                      <p className="text-sm text-muted-foreground">
                        Save the current collection so you can reuse it later.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full font-mono"
                        onClick={() => setShowTemplateForm((prev) => !prev)}
                      >
                        {showTemplateForm ? "Hide Template Form" : "Save Current Tasks"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {showTemplateForm && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Card className="rounded-xl glow-border bg-muted/10">
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">
                        Template Setup
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Give this reusable task set a recognizable name.
                      </p>
                    </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Template Name</Label>
                    <Input
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      placeholder="Ex: Story Project Starter Set"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      This saves the current task list to local storage for quick reuse later.
                    </p>
                    <Button
                      type="button"
                      className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                    >
                      {isSavingTemplate ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Template
                    </Button>
                  </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="border-t border-border/70 pt-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">Saved Templates</h2>
                    <p className="text-sm text-muted-foreground">
                      Templates live locally for now and are ready for future backend syncing.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-muted-foreground">
                    {templates.length} template{templates.length === 1 ? "" : "s"} saved
                  </div>
                </div>

                {templates.length === 0 ? (
                  <Card className="rounded-xl border border-dashed border-border bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
                      <div className="rounded-xl border border-neon-purple/25 bg-neon-purple/10 p-3">
                        <CopyPlus className="h-5 w-5 text-neon-purple" />
                      </div>
                      <p className="text-sm font-medium">No templates yet</p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        Save your current tasks as a template to reuse them across future projects.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-1 font-mono"
                        onClick={() => setShowTemplateForm(true)}
                      >
                        Create Template
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {templates.map((template) => (
                      <TaskTemplateCard
                        key={template.id}
                        template={template}
                        onUseTemplate={handleUseTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                        isApplying={activeTemplateId === template.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <TaskExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        taskCount={sharedTasks.length}
        isExporting={isExporting}
        onExportJson={handleExportJson}
        onExportText={handleExportText}
      />

      <TaskImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportFile={handleImportFile}
        isImporting={isImporting}
      />
    </>
  );
};

export default TaskSharingPanel;
