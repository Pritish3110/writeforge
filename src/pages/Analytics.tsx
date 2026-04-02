import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Flame, Trophy } from "lucide-react";

const Analytics = () => {
  const { getLast7Days, getStreak, getCategoryStats } = useTaskTracking();
  const last7 = getLast7Days();
  const streak = getStreak();
  const catStats = getCategoryStats();

  const completionRate = last7.map((d) => ({
    ...d,
    rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

  // Simple heatmap for last 28 days
  const heatmap: { date: string; level: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayData = last7.find((x) => x.date === dateStr);
    const level = dayData ? (dayData.completed === 0 ? 0 : dayData.completed >= dayData.total ? 3 : dayData.completed >= 1 ? 2 : 1) : 0;
    heatmap.push({ date: dateStr, level });
  }

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    fontFamily: "JetBrains Mono",
    fontSize: "12px",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Analytics</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Track your writing journey over time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-neon-pink" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono text-neon-purple">{streak.current}</p>
            <p className="text-xs text-muted-foreground">consecutive days</p>
          </CardContent>
        </Card>
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-neon-cyan" /> Longest Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold font-mono text-neon-cyan">{streak.longest}</p>
            <p className="text-xs text-muted-foreground">personal best</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-muted-foreground">Completion Rate (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionRate}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--neon-cyan))" strokeWidth={2} dot={{ fill: "hsl(var(--neon-cyan))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-muted-foreground">Tasks by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            {catStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catStats}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--neon-pink))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-sm">
                Complete some tasks to see category data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="text-sm font-mono text-muted-foreground">Activity Heatmap (28 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 flex-wrap">
            {heatmap.map((cell) => (
              <div
                key={cell.date}
                title={cell.date}
                className="w-6 h-6 rounded-sm transition-colors duration-200"
                style={{
                  backgroundColor:
                    cell.level === 0
                      ? "hsl(var(--muted))"
                      : cell.level === 1
                      ? "hsl(var(--neon-purple) / 0.3)"
                      : cell.level === 2
                      ? "hsl(var(--neon-purple) / 0.6)"
                      : "hsl(var(--neon-purple))",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground font-mono">
            <span>Less</span>
            {[0, 1, 2, 3].map((l) => (
              <div
                key={l}
                className="w-4 h-4 rounded-sm"
                style={{
                  backgroundColor:
                    l === 0 ? "hsl(var(--muted))" : l === 1 ? "hsl(var(--neon-purple) / 0.3)" : l === 2 ? "hsl(var(--neon-purple) / 0.6)" : "hsl(var(--neon-purple))",
                }}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
