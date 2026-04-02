import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { WRITING_PROMPTS } from "@/data/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { Download, FileText, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { exportSceneAsDocx, exportSceneAsPdf, type ExportFormatMode } from "@/lib/sceneExport";

interface Draft {
  id: string;
  text: string;
  wordCount: number;
  savedAt: string;
}

const ScenePractice = () => {
  const [text, setText] = useState("");
  const [prompt, setPrompt] = useState("");
  const [drafts, setDrafts] = useLocalStorage<Draft[]>("writeforge-drafts", []);
  const [exportOpen, setExportOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [formattingMode, setFormattingMode] = useState<ExportFormatMode>("Minimal");
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "google-docs" | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasText = text.trim().length > 0;

  const generatePrompt = () => {
    const idx = Math.floor(Math.random() * WRITING_PROMPTS.length);
    setPrompt(WRITING_PROMPTS[idx]);
  };

  const saveDraft = () => {
    if (!text.trim()) return;
    setDrafts((prev) => [
      { id: crypto.randomUUID(), text, wordCount, savedAt: new Date().toLocaleString() },
      ...prev,
    ]);
    setText("");
  };

  const removeDraft = (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id));

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

      {drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">Saved Drafts</h2>
          {drafts.map((draft) => (
            <Card key={draft.id} className="glow-border">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono text-muted-foreground">
                  {draft.savedAt} · {draft.wordCount} words
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDraft(draft.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <p className="text-sm line-clamp-3">{draft.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenePractice;
