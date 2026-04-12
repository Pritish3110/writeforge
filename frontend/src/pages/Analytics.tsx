import { useLearningEngine } from "@/hooks/useLearningEngine";
import { useTaskTracking } from "@/hooks/useTaskTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { BrainCircuit, Flame, Sparkles, Trophy } from "lucide-react";

const Analytics = () => {
  const { getLast7Days, getLast28Days, getStreak, getCategoryStats } = useTaskTracking();
  const { progress: learningProgress, loadingProgress, error: learningError } =
    useLearningEngine({ loadToday: false, loadProgress: true });
  const last7 = getLast7Days();
  const last28 = getLast28Days();
  const streak = getStreak();
  const catStats = getCategoryStats();
  const learnedConcepts = learningProgress?.topicsCompleted || 0;
  const totalConcepts = learningProgress?.totalTopics || 0;
  const weeklyLearningActivity =
    learningProgress?.heatmap?.slice(-7).reduce((sum, cell) => sum + cell.count, 0) || 0;
  const improvingThemes =
    learningProgress?.themes
      ?.filter((theme) => theme.masteredTopics > 0 || theme.status === "in_progress")
      .slice(0, 2)
      .map((theme) => theme.title) || [];
  const nextFocusTopic = learningProgress?.weakTopics?.[0] || null;
  const activeSkillTrack = learningProgress?.activeTheme?.title || "Writing craft";
  const suggestionCopy = nextFocusTopic
    ? `You're close to mastering ${nextFocusTopic.title.toLowerCase()}. Practice a few more examples to improve.`
    : `Keep practicing ${activeSkillTrack.toLowerCase()} to build stronger instincts.`;

  const completionRate = last7.map((d) => ({
    ...d,
    rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
  }));

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
          <h2 className="text-xl font-semibold tracking-tight">Skill Builder Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A clear view of what you're strengthening and where to focus next.
          </p>
        </div>

        {learningError ? (
          <Card className="glow-card glow-border">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">{learningError}</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-neon-cyan" /> Concepts Learned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-cyan">
                {loadingProgress ? "..." : learnedConcepts}
                <span className="text-lg text-muted-foreground">/{totalConcepts}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                steadily building your writing toolkit
              </p>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Practice Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-purple">
                {loadingProgress ? "..." : learningProgress?.streak.current || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {loadingProgress
                  ? "tracking your consistency"
                  : `best run: ${learningProgress?.streak.longest || 0} day${(learningProgress?.streak.longest || 0) === 1 ? "" : "s"}`}
              </p>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-mono text-neon-pink">
                {loadingProgress ? "..." : weeklyLearningActivity}
              </p>
              <p className="text-xs text-muted-foreground">
                practice step{weeklyLearningActivity === 1 ? "" : "s"} completed this week
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Focus Area
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">You're improving in</p>
                {improvingThemes.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {improvingThemes.map((theme) => (
                      <Badge key={theme} variant="secondary">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your first practice wins will start showing up here.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">Needs more practice</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {nextFocusTopic?.title || activeSkillTrack}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Suggested Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-neon-cyan/10 p-3 text-neon-cyan">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">A gentle next step</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {suggestionCopy}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
