import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";

const TaskExportModal = ({
  open,
  onOpenChange,
  taskCount,
  isExporting,
  onExportJson,
  onExportText,
}) => {
  const isBusy = Boolean(isExporting);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glow-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">Export Tasks</DialogTitle>
          <DialogDescription>
            Download your current custom tasks as either a structured JSON file or a readable text summary.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-xl glow-border bg-muted/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-neon-purple" />
                  <CardTitle className="text-sm">JSON Export</CardTitle>
                </div>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {taskCount} task{taskCount === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Best for moving tasks between projects while keeping the import flow fast and structured.
              </p>
              <Button
                type="button"
                className="w-full bg-neon-purple hover:bg-neon-purple/90 font-mono gap-2"
                onClick={onExportJson}
                disabled={taskCount === 0 || isBusy}
              >
                {isExporting === "json" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export as JSON
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl glow-border bg-muted/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-neon-cyan" />
                <CardTitle className="text-sm">Readable Text</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Great for reviewing, sharing in chats, or copying into notes before adapting the tasks elsewhere.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full font-mono gap-2"
                onClick={onExportText}
                disabled={taskCount === 0 || isBusy}
              >
                {isExporting === "text" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-neon-cyan" />
                )}
                Export as Text
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Export is disabled until at least one custom task exists.
          </p>
          <Button type="button" variant="ghost" className="font-mono" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskExportModal;
