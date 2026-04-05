import { useNavigate } from "react-router-dom";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { getDayName } from "@/data/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Flame, CheckCircle2, Zap } from "lucide-react";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { getCurrentWeek, getTodayCompleted, getLast7Days, getStreak } = useTaskTracking();
  const today = getTodayCompleted();
  const last7 = getLast7Days();
  const currentWeek = getCurrentWeek();
  const streak = getStreak();
  const pct = today.total > 0 ? Math.round((today.completed / today.total) * 100) : 0;
  const weekCompleted = currentWeek.reduce((sum, day) => sum + day.completed, 0);
  const weekTotal = currentWeek.reduce((sum, day) => sum + day.total, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, <span className="text-neon-purple">UndyingKoi</span>
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Today is {getDayName()} — let's make it count.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-neon-cyan" /> Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{today.completed}<span className="text-muted-foreground text-lg">/{today.total}</span></p>
            <Progress value={pct} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-neon-pink" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{streak.current} <span className="text-muted-foreground text-lg">days</span></p>
            <p className="text-xs text-muted-foreground mt-1">Longest: {streak.longest} days</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-neon-purple" /> This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">
              {weekCompleted}
              <span className="text-muted-foreground text-lg">/{weekTotal}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-muted-foreground">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontFamily: "JetBrains Mono" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="completed" fill="hsl(var(--neon-purple))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => navigate("/daily-tasks")}
        className="w-full bg-neon-purple hover:bg-neon-purple/90 text-primary-foreground font-mono text-base py-6 glow-card"
      >
        Start Today's Session →
      </Button>
    </div>
  );
};

export default Dashboard;
