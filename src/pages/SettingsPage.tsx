import { useTheme } from "@/contexts/ThemeContext";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Moon, Sun, Database } from "lucide-react";
import { useState } from "react";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { resetAll } = useTaskTracking();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetAll();
    localStorage.removeItem("writeforge-characters");
    localStorage.removeItem("writeforge-kael-seeded");
    localStorage.removeItem("writeforge-character-seed-version");
    localStorage.removeItem("writeforge-character-relationships");
    localStorage.removeItem("writeforge-custom-tasks");
    localStorage.removeItem("writeforge-plot-builder");
    localStorage.removeItem("writeforge-drafts");
    setConfirmReset(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Customize your WriteForge experience.</p>
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
            <p className="text-xs text-muted-foreground mt-1">Tasks, characters, drafts, and preferences are persisted between sessions.</p>
          </div>
          <div className="border-t border-border pt-4">
            <Button
              variant={confirmReset ? "destructive" : "outline"}
              onClick={handleReset}
              className="font-mono gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {confirmReset ? "Click again to confirm reset" : "Reset All Progress"}
            </Button>
            {confirmReset && (
              <p className="text-xs text-destructive mt-2">This will delete all tasks, characters, and drafts. This cannot be undone.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
