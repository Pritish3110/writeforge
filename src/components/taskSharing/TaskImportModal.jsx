import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Loader2, Upload } from "lucide-react";

const TaskImportModal = ({
  open,
  onOpenChange,
  onImportFile,
  isImporting,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setInlineError("");
    }
  }, [open]);

  const handleImport = async () => {
    if (!selectedFile) {
      setInlineError("Choose a JSON file before importing.");
      return;
    }

    setInlineError("");
    const result = await onImportFile?.(selectedFile);

    if (result !== false) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glow-border sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">Import Tasks</DialogTitle>
          <DialogDescription>
            Upload a JSON file and the sharing layer will validate it before adding any tasks.
          </DialogDescription>
        </DialogHeader>

        <Card className="rounded-xl glow-border bg-muted/10">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs">JSON File</Label>
              <Input
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setInlineError("");
                }}
              />
            </div>

            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">
                <FileUp className="h-4 w-4" />
                Import Preview
              </div>
              <p className="mt-3">
                {selectedFile
                  ? `${selectedFile.name} is ready to validate and import.`
                  : "Select a task export file to begin."}
              </p>
            </div>

            {inlineError && (
              <p className="text-sm text-destructive">{inlineError}</p>
            )}
          </CardContent>
        </Card>

        <DialogFooter className="sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Invalid files are rejected safely without touching existing tasks.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="font-mono" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2"
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import Tasks
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskImportModal;
