import { useLearningEngine } from "@/hooks/useLearningEngine";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { BrainCircuit, Flame, Trophy } from "lucide-react";

const Analytics = () => {
  const { getLast7Days, getLast28Days, getStreak, getCategoryStats } = useTaskTracking();
  const { progress: learningProgress, loadingProgress, error: learningError } =
    useLearningEngine({ loadToday: false, loadProgress: true });
  const last7 = getLast7Days();
  const last28 = getLast28Days();
  const streak = getStreak();
  const catStats = getCategoryStats();

  const completionRate = last7.map((d) => ({
    ...d,
    rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

  // Simple heatmap for last 28 days
  const heatmap = last28.map((dayData) => ({
    date: dayData.date,
    level:
      dayData.completed === 0
        ? 0
        : dayData.completed >= dayData.total
          ? 3
          : dayData.completed >= 1
            ? 2
            : 1,
  }));

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

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Learning Engine Analytics</h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Track spaced repetition streaks, weak-area reinforcement, and theme progression.
          </p>
        </div>

        {learningError ? (
          <Card className="glow-card glow-border border-dashed bg-muted/10">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">{learningError}</p>
              <p className="mt-2 text-xs font-mono text-muted-foreground">
                Start the backend learning routes to unlock these analytics.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-neon-cyan" /> Learning Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-cyan">
                {loadingProgress ? "..." : learningProgress?.streak.current || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                longest {learningProgress?.streak.longest || 0} day
                {(learningProgress?.streak.longest || 0) === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Topics Mastered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-purple">
                {loadingProgress ? "..." : learningProgress?.topicsCompleted || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                of {learningProgress?.totalTopics || 0} topics in the current curriculum
              </p>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Reviews Due Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-pink">
                {loadingProgress ? "..." : learningProgress?.dueToday || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                queued for the next learning session
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Theme Progression
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {learningProgress?.themes?.length ? (
                learningProgress.themes.map((theme) => {
                  const completionRate =
                    theme.totalTopics > 0
                      ? (theme.masteredTopics / theme.totalTopics) * 100
                      : 0;

                  return (
                    <div key={theme.id} className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{theme.title}</p>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {theme.masteredTopics}/{theme.totalTopics} mastered
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] uppercase">
                          {theme.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-neon-cyan"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No learning theme data yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Weak Area Reinforcement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningProgress?.weakTopics?.length ? (
                learningProgress.weakTopics.map((topic) => (
                  <div key={topic.topicId} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{topic.title}</p>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                          {topic.themeTitle} • stage {topic.stage}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        Again {topic.againCount} • Hard {topic.hardCount}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {topic.recommendation}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No weak areas flagged right now. Keep reviewing to build a stronger signal.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glow-card glow-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground">
              Learning Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {learningProgress?.heatmap?.length ? (
                learningProgress.heatmap.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date} · ${cell.count} review${cell.count === 1 ? "" : "s"}`}
                    className="h-6 w-6 rounded-sm"
                    style={{
                      backgroundColor:
                        cell.level === 0
                          ? "hsl(var(--muted))"
                          : cell.level === 1
                            ? "hsl(var(--neon-cyan) / 0.3)"
                            : cell.level === 2
                              ? "hsl(var(--neon-cyan) / 0.6)"
                              : "hsl(var(--neon-cyan))",
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No learning activity yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
