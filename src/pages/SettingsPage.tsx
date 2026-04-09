import { useTheme } from "@/contexts/ThemeContext";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Moon, Sun, Database } from "lucide-react";
import { useDeleteConfirmation } from "@/components/DeleteConfirmationProvider";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { resetAll } = useTaskTracking();
  const confirmDelete = useDeleteConfirmation();

  const handleReset = async () => {
    const shouldReset = await confirmDelete({
      title: "Reset all progress?",
      description: "This will delete your tasks, characters, relationships, plot points, world elements, and saved drafts from local storage. This action cannot be undone.",
      confirmLabel: "Reset Everything",
      badgeLabel: "Destructive Action",
    });

    if (!shouldReset) return;

    resetAll();
    localStorage.removeItem("writeforge-characters");
    localStorage.removeItem("writeforge-kael-seeded");
    localStorage.removeItem("writeforge-character-seed-version");
    localStorage.removeItem("writeforge-character-relationships");
    localStorage.removeItem("writeforge-custom-tasks");
    localStorage.removeItem("writeforge-plot-builder");
    localStorage.removeItem("writeforge-drafts");
    localStorage.removeItem("writeforge-world-elements");
    localStorage.removeItem("writeforge-scene-practice-world-element");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Customize your WriterZ experience.</p>
      </div>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4 text-neon-purple" /> : <Sun className="h-4 w-4 text-neon-cyan" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-mono text-sm">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle between dark and light themes</p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Database className="h-4 w-4 text-neon-cyan" /> Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm">All your data is stored locally in your browser using localStorage.</p>
            <p className="text-xs text-muted-foreground mt-1">Tasks, characters, world elements, drafts, and preferences are persisted between sessions.</p>
          </div>
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => void handleReset()}
              className="font-mono gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Reset All Progress
            </Button>
            <p className="text-xs text-destructive mt-2">This will delete all tasks, characters, world elements, and drafts. This cannot be undone.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
