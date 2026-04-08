import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const { getCurrentWeek, getTodayCompleted, getLast7Days, getStreak } = useTaskTracking();
  const today = getTodayCompleted();
  const last7 = getLast7Days();
  const currentWeek = getCurrentWeek();
  const streak = getStreak();
  const username =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Writer";
  const pct = today.total > 0 ? Math.round((today.completed / today.total) * 100) : 0;
  const weekCompleted = currentWeek.reduce((sum, day) => sum + day.completed, 0);
  const weekTotal = currentWeek.reduce((sum, day) => sum + day.total, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {getGreeting()}, {username}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today is {getDayName()} — let's make it count.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card level="secondary" className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{today.completed}<span className="text-lg text-muted-foreground">/{today.total}</span></p>
            <Progress value={pct} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card level="secondary" className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-muted-foreground" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{streak.current} <span className="text-lg text-muted-foreground">days</span></p>
            <p className="text-xs text-muted-foreground mt-1">Longest: {streak.longest} days</p>
          </CardContent>
        </Card>

        <Card level="secondary" className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-muted-foreground" /> This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {weekCompleted}
              <span className="text-lg text-muted-foreground">/{weekTotal}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Last 7 Days</CardTitle>
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
                <Bar dataKey="completed" fill="hsl(var(--foreground) / 0.78)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => navigate("/daily-tasks")}
        className="w-full text-base"
      >
        Start Today's Session →
      </Button>
    </div>
  );
};

export default Dashboard;
