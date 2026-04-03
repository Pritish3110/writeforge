import { useEffect, useState } from "react";
import { WRITING_PROMPTS } from "@/data/tasks";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { Download, Edit2, FileText, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { exportSceneAsDocx, exportSceneAsPdf, type ExportFormatMode } from "@/lib/sceneExport";
import { cn } from "@/lib/utils";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";

type SceneType = "Main Story Scene" | "Side Scene" | "Cool Scene" | "Activity Scene";

interface Draft {
  id: string;
  title: string;
  type: SceneType;
  content: string;
  createdAt: string;
  updatedAt: string;
  text: string;
  wordCount: number;
  savedAt: string;
}

const DRAFT_STORAGE_KEY = "writeforge-drafts";
const DEFAULT_SCENE_TYPE: SceneType = "Main Story Scene";
const SCENE_TYPES: SceneType[] = [
  "Main Story Scene",
  "Side Scene",
  "Cool Scene",
  "Activity Scene",
];

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const isSceneType = (value: unknown): value is SceneType => SCENE_TYPES.includes(value as SceneType);
const countWords = (value: string) => {
  const matches = value.match(/\b[\w']+\b/g);
  return matches ? matches.length : 0;
};

const buildDraftRecord = ({
  id,
  title,
  type,
  content,
  createdAt,
  updatedAt,
}: {
  id: string;
  title: string;
  type: SceneType;
  content: string;
  createdAt: string;
  updatedAt: string;
}): Draft => {
  const wordCount = countWords(content);

  return {
    id,
    title,
    type,
    content,
    createdAt,
    updatedAt,
    text: content,
    wordCount,
    savedAt: updatedAt,
  };
};

const normalizeDraft = (value: unknown, index: number): Draft => {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content = toText(record.content) || toText(record.text);
  const createdAt = toText(record.createdAt) || toText(record.savedAt) || new Date().toISOString();
  const updatedAt = toText(record.updatedAt) || toText(record.savedAt) || createdAt;

  return buildDraftRecord({
    id: toText(record.id) || `scene-${index + 1}`,
    title: toText(record.title).trim() || `Untitled Scene ${index + 1}`,
    type: isSceneType(record.type) ? record.type : DEFAULT_SCENE_TYPE,
    content,
    createdAt,
    updatedAt,
  });
};

const readStoredDrafts = (): Draft[] => {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map((draft, index) => normalizeDraft(draft, index)) : [];
  } catch {
    return [];
  }
};

const formatSceneDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const ScenePractice = () => {
  const confirmDelete = useDeleteConfirmation();
  const [text, setText] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneType, setSceneType] = useState<SceneType>(DEFAULT_SCENE_TYPE);
  const [sceneTitleError, setSceneTitleError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>(() => readStoredDrafts());
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [openSceneId, setOpenSceneId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [formattingMode, setFormattingMode] = useState<ExportFormatMode>("Minimal");
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "google-docs" | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch {}
  }, [drafts]);

  const wordCount = countWords(text);
  const hasText = text.trim().length > 0;
  const draftGroups = SCENE_TYPES.map((type) => ({
    type,
    drafts: drafts.filter((draft) => draft.type === type),
  })).filter((group) => group.drafts.length > 0);

  const clearEditor = () => {
    setText("");
    setSceneTitle("");
    setSceneType(DEFAULT_SCENE_TYPE);
    setSceneTitleError(null);
    setActiveSceneId(null);
  };

  const generatePrompt = () => {
    const idx = Math.floor(Math.random() * WRITING_PROMPTS.length);
    const nextPrompt = WRITING_PROMPTS[idx];
    setPrompt(nextPrompt);
    setSceneTitle((prev) => (prev.trim().length === 0 ? nextPrompt : prev));
    setSceneTitleError(null);
  };

  const saveDraft = () => {
    const normalizedTitle = sceneTitle.trim() || prompt.trim();

    if (!normalizedTitle) {
      setSceneTitleError("Scene title is required");
      toast.error("Scene title is required");
      return;
    }

    if (!hasText) {
      toast.error("Nothing to save");
      return;
    }

    const now = new Date().toISOString();
    const existingDraft = activeSceneId ? drafts.find((draft) => draft.id === activeSceneId) : null;

    if (existingDraft) {
      const updatedDraft = buildDraftRecord({
        id: existingDraft.id,
        title: normalizedTitle,
        type: sceneType,
        content: text,
        createdAt: existingDraft.createdAt,
        updatedAt: now,
      });

      setDrafts((prev) => [updatedDraft, ...prev.filter((draft) => draft.id !== existingDraft.id)]);
      toast.success("Scene updated");
      clearEditor();
      return;
    }

    const nextDraft = buildDraftRecord({
      id: crypto.randomUUID(),
      title: normalizedTitle,
      type: sceneType,
      content: text,
      createdAt: now,
      updatedAt: now,
    });

    setDrafts((prev) => [nextDraft, ...prev]);
    toast.success("Scene saved");
    clearEditor();
  };

  const loadDraft = (draft: Draft) => {
    setActiveSceneId(draft.id);
    setSceneTitle(draft.title);
    setSceneType(draft.type);
    setText(draft.content);
    setSceneTitleError(null);
  };

  const removeDraft = async (id: string) => {
    const target = drafts.find((draft) => draft.id === id);
    if (!target) return;

    const shouldDelete = await confirmDelete({
      title: `Delete "${target.title}"?`,
      description: "This draft will be removed from your saved scenes library. This action cannot be undone.",
      confirmLabel: "Delete Draft",
    });
    if (!shouldDelete) return;

    setDrafts((prev) => prev.filter((draft) => draft.id !== id));

    if (activeSceneId === id) {
      setActiveSceneId(null);
    }

    if (openSceneId === id) {
      setOpenSceneId(null);
    }

    toast.success("Scene deleted");
  };

  const handleExport = async (format: "pdf" | "google-docs") => {
    if (!hasText) {
      toast.error("Nothing to export");
      return;
    }

    setExportingFormat(format);

    try {
      const exportOptions = {
        sessionTitle,
        text,
        wordCount,
        includeMetadata,
        formattingMode,
      };

      if (format === "pdf") {
        await exportSceneAsPdf(exportOptions);
      } else {
        await exportSceneAsDocx(exportOptions);
      }

      setExportOpen(false);
      toast.success("Export successful", {
        description:
          format === "pdf"
            ? "Your scene was downloaded as a PDF."
            : "Your scene was downloaded as a Google Docs-ready .docx file.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Export failed", {
        description: "Please try again.",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scene Practice</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Write freely. Save your best work.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={generatePrompt} variant="outline" className="font-mono gap-2">
          <Sparkles className="h-4 w-4 text-neon-pink" /> Generate Prompt
        </Button>
        <Button onClick={saveDraft} className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2">
          <Save className="h-4 w-4" /> Save Draft
        </Button>
        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="font-mono gap-2" disabled={!hasText}>
              <Download className="h-4 w-4 text-neon-cyan" /> Export
            </Button>
          </DialogTrigger>
          <DialogContent className="glow-border">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">Export Writing Session</DialogTitle>
              <DialogDescription>
                Export the current scene without leaving the editor. PDF uses print-friendly pages, and Google Docs export downloads a `.docx` fallback for upload.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="font-mono text-xs">Session Name</Label>
                <Input
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  placeholder="Optional title for this writing session"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                <div>
                  <Label className="font-mono text-xs">Formatting Mode</Label>
                  <Select value={formattingMode} onValueChange={(value) => setFormattingMode(value as ExportFormatMode)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Minimal">Minimal</SelectItem>
                      <SelectItem value="Manuscript">Manuscript format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Switch checked={includeMetadata} onCheckedChange={setIncludeMetadata} />
                    <div>
                      <Label className="font-mono text-xs">Include Metadata</Label>
                      <p className="text-xs text-muted-foreground">Date, session name, and word count</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="glow-border bg-muted/30">
                <CardContent className="py-3 px-4 space-y-2">
                  <p className="font-mono text-xs uppercase tracking-wider text-neon-pink">Export Preview</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                    <span>{wordCount} words</span>
                    <span>{formattingMode}</span>
                    <span>{includeMetadata ? "Metadata on" : "Metadata off"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="sm:justify-between gap-2">
              <Button
                variant="outline"
                className="font-mono gap-2"
                onClick={() => handleExport("pdf")}
                disabled={!hasText || exportingFormat !== null}
              >
                {exportingFormat === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-neon-cyan" />}
                Export as PDF
              </Button>
              <Button
                className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2"
                onClick={() => handleExport("google-docs")}
                disabled={!hasText || exportingFormat !== null}
              >
                {exportingFormat === "google-docs" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export to Google Docs
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {prompt && (
        <Card className="glow-border bg-muted/30">
          <CardContent className="py-3 px-4">
            <p className="font-mono text-xs text-neon-pink uppercase tracking-wider mb-1">Prompt</p>
            <p className="text-sm">{prompt}</p>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-border bg-muted/20 p-4 glow-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4">
          <div>
            <Label className="font-mono text-xs">Scene Title</Label>
            <Input
              value={sceneTitle}
              onChange={(event) => {
                setSceneTitle(event.target.value);
                if (event.target.value.trim()) {
                  setSceneTitleError(null);
                }
              }}
              placeholder="Enter Scene Title..."
              className={cn("mt-1", sceneTitleError && "border-destructive focus-visible:ring-destructive")}
            />
            {sceneTitleError && (
              <p className="mt-1 font-mono text-xs text-destructive">{sceneTitleError}</p>
            )}
          </div>

          <div>
            <Label className="font-mono text-xs">Scene Type</Label>
            <Select value={sceneType} onValueChange={(value) => setSceneType(value as SceneType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeSceneId && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neon-purple/30 bg-neon-purple/10 px-3 py-2 text-xs font-mono">
            <span className="text-neon-purple">Loaded saved scene. Saving will update this draft.</span>
            <span className="text-muted-foreground">{wordCount} words</span>
          </div>
        )}
      </div>

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing..."
          className="min-h-[300px] font-sans text-base leading-relaxed resize-y glow-border"
        />
        <div className="absolute bottom-3 right-3 bg-card/80 backdrop-blur px-2 py-1 rounded text-xs font-mono text-muted-foreground">
          {wordCount} words
        </div>
      </div>

      {draftGroups.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">Saved Scenes</h2>
            <p className="mt-1 text-xs text-muted-foreground">Expand a scene type to read it. Use Edit to load a saved scene into the editor.</p>
          </div>

          <Accordion type="multiple" className="space-y-3">
            {draftGroups.map((group) => (
              <AccordionItem key={group.type} value={group.type} className="border-none">
                <Card className="glow-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <CardHeader className="py-3 px-4">
                    <AccordionTrigger className="py-0 hover:no-underline">
                      <div className="text-left">
                        <CardTitle className="text-base">{group.type}</CardTitle>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {group.drafts.length} saved scene{group.drafts.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </AccordionTrigger>
                  </CardHeader>

                  <AccordionContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <Accordion
                        type="single"
                        collapsible
                        value={group.drafts.some((draft) => draft.id === openSceneId) ? openSceneId ?? undefined : undefined}
                        onValueChange={(value) => setOpenSceneId(value || null)}
                        className="space-y-2"
                      >
                        {group.drafts.map((draft) => {
                          const isLoaded = activeSceneId === draft.id;
                          const isOpen = openSceneId === draft.id;

                          return (
                            <AccordionItem key={draft.id} value={draft.id} className="border-none">
                              <Card
                                className={cn(
                                  "rounded-lg border border-border/70 bg-background/30 transition-all duration-200 hover:border-neon-cyan/40 hover:bg-muted/20",
                                  isOpen && "border-neon-purple/60 bg-neon-purple/10 shadow-[0_0_20px_hsl(var(--neon-purple)/0.12)]",
                                  isLoaded && !isOpen && "border-neon-cyan/50"
                                )}
                              >
                                <CardHeader className="py-3 px-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <AccordionTrigger
                                      className="py-0 hover:no-underline flex-1 items-start"
                                    >
                                      <div className="text-left space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-semibold text-sm">{draft.title}</p>
                                          {isLoaded && (
                                            <span className="rounded-full border border-neon-purple/40 bg-neon-purple/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-neon-purple">
                                              Active
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-mono text-xs text-muted-foreground">
                                          Updated {formatSceneDate(draft.updatedAt)} · {draft.wordCount} words
                                        </p>
                                      </div>
                                    </AccordionTrigger>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 font-mono"
                                        onClick={() => {
                                          loadDraft(draft);
                                          setOpenSceneId(draft.id);
                                        }}
                                      >
                                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => void removeDraft(draft.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>

                                <AccordionContent>
                                  <CardContent className="pt-0 pb-4 px-4">
                                    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                                      <p className="text-sm leading-7 whitespace-pre-wrap">
                                        {draft.content || "No content yet."}
                                      </p>
                                    </div>
                                  </CardContent>
                                </AccordionContent>
                              </Card>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default ScenePractice;
