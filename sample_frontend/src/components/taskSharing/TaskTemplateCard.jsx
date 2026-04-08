import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CopyPlus, Loader2, Trash2 } from "lucide-react";

const TaskTemplateCard = ({
  template,
  onUseTemplate,
  onDeleteTemplate,
  isApplying,
}) => {
  const taskCount = Array.isArray(template?.tasks) ? template.tasks.length : 0;
  const templateName = typeof template?.name === "string" && template.name.trim()
    ? template.name
    : "Untitled Template";

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.16, ease: "easeOut" }}>
      <Card className="rounded-xl glow-border bg-muted/12 shadow-[0_10px_24px_hsl(var(--background)/0.18)] transition-all duration-200 hover:border-neon-purple/45 hover:shadow-[0_0_18px_hsl(var(--neon-purple)/0.08)]">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-base">{templateName}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {taskCount} task{taskCount === 1 ? "" : "s"}
                </Badge>
                <Badge variant="outline" className="font-mono text-[11px] border-neon-purple/30 text-neon-purple">
                  Reusable
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Use this template to duplicate a saved task set into the current project without affecting the original.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="font-mono gap-2"
              onClick={() => onUseTemplate?.(template)}
              disabled={isApplying}
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CopyPlus className="h-4 w-4 text-neon-cyan" />
              )}
              Use Template
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="font-mono gap-2 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteTemplate?.(template?.id)}
              disabled={isApplying}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TaskTemplateCard;
