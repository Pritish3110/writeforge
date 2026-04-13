import { Link } from "react-router-dom";
import { PenMark } from "@/components/brand/PenMark";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { analyzeWritingDrafts, type WritingDraft } from "@/lib/writingAnalytics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Clock3,
  Flame,
  MessageSquareQuote,
  ScanText,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontFamily: "JetBrains Mono",
  fontSize: "12px",
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const PenMarkIcon = ({ className }: { className?: string }) => (
  <PenMark className={cn("h-4 w-4 opacity-85", className)} />
);

const getHeatmapColor = (level: number) => {
  switch (level) {
    case 3:
      return "hsl(var(--neon-purple))";
    case 2:
      return "hsl(var(--neon-purple) / 0.65)";
    case 1:
      return "hsl(var(--neon-purple) / 0.32)";
    default:
      return "hsl(var(--muted))";
  }
};

const getWordCloudSize = (count: number, maxCount: number) => {
  if (maxCount <= 0) return "0.9rem";
  const ratio = count / maxCount;
  return `${0.85 + ratio * 0.85}rem`;
};

const getToneLabel = (value: number, low: number, high: number) => {
  if (value < low) return "Low";
  if (value < high) return "Balanced";
  return "High";
};

const WritingAnalytics = () => {
  const [drafts] = useLocalStorage<WritingDraft[]>("writeforge-drafts", []);
  const { progress: learningProgress } = useLearningEngine({
    loadToday: false,
    loadProgress: true,
  });
  const analytics = analyzeWritingDrafts(drafts);
  const skillInsights = learningProgress?.skillBuilderInsights;
  const skillHeatmapCounts = new Map(
    (skillInsights?.heatmap || []).map((cell) => [cell.date, cell.count]),
  );
  const totalWords = analytics.totalWords + (skillInsights?.totalWritingWords || 0);
  const sessionsCompleted = analytics.sessionsCompleted + (skillInsights?.entriesCount || 0);
  const combinedHeatmap = analytics.heatmap.map((cell) => {
    const skillSessions = skillHeatmapCounts.get(cell.date) || 0;
    return {
      ...cell,
      sessions: cell.sessions + skillSessions,
      level: Math.max(cell.level, skillSessions === 0 ? 0 : skillSessions === 1 ? 1 : 2),
    };
  });
  const maxWordCloudCount = analytics.topWords[0]?.count || 0;

  if (sessionsCompleted === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Writing Analytics</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            See how your writing style and consistency evolve over time.
          </p>
        </div>

        <Card className="glow-card glow-border border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <PenMarkIcon className="h-10 w-10" />
            <div className="space-y-2">
              <p className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
                No writing sessions yet
              </p>
              <h2 className="text-2xl font-semibold">
                Save a draft to unlock writing insights
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Writing Analytics reads your saved Scene Practice sessions to chart word count,
                streaks, style habits, repetition, and clarity signals.
              </p>
            </div>
            <Button asChild className="bg-neon-purple hover:bg-neon-purple/90 font-mono">
              <Link to="/scene-practice">Go To Scene Practice</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writing Analytics</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Track your writing volume, consistency, and stylistic habits from saved sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <PenMarkIcon className="h-4 w-4" /> Total Words Written
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{totalWords.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across drafts and Skill Builder entries</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-neon-pink" /> Sessions Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{sessionsCompleted}</p>
            <p className="mt-1 text-xs text-muted-foreground">Saved drafts and guided practice entries</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-neon-purple" /> Avg Session Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">
              {sessionsCompleted > 0 ? Math.max(1, Math.round(totalWords / sessionsCompleted / 25)) : 0} min
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Estimated from average words per session</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
          <TabsTrigger value="overview" className="font-mono">Overview</TabsTrigger>
          <TabsTrigger value="style" className="font-mono">Style Analysis</TabsTrigger>
          <TabsTrigger value="progress" className="font-mono">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Words Per Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.wordsPerDay}>
                    <CartesianGrid stroke="hsl(var(--border) / 0.35)" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="words"
                      stroke="hsl(var(--neon-cyan))"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(var(--neon-cyan))", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-neon-pink" /> Writing Streak
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-4xl font-bold font-mono">{analytics.currentStreak}</p>
                <p className="text-xs text-muted-foreground">
                  Longest streak: {analytics.longestStreak} day{analytics.longestStreak === 1 ? "" : "s"}
                </p>
                <Progress
                  value={analytics.longestStreak > 0 ? (analytics.currentStreak / analytics.longestStreak) * 100 : 0}
                  className="h-2"
                />
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4 text-neon-cyan" /> Dialogue Vs Narration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-neon-cyan"
                    style={{ width: `${analytics.dialogueRatio * 100}%` }}
                  />
                  <div
                    className="h-full bg-neon-purple"
                    style={{ width: `${analytics.narrationRatio * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Dialogue {formatPercent(analytics.dialogueRatio)}</span>
                  <span>Narration {formatPercent(analytics.narrationRatio)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-neon-purple" /> Clarity Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-4xl font-bold font-mono">{analytics.clarityScore}</p>
                <Progress value={analytics.clarityScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Higher scores suggest tighter sentence control and less distracting filler.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground">Avg Sentence Length</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold font-mono">{analytics.avgSentenceLength}</p>
                <p className="mt-1 text-xs text-muted-foreground">words per sentence on average</p>
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground">Over-Description Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold font-mono">{analytics.overDescriptionScore}</p>
                  <Badge variant="outline" className="font-mono">
                    {getToneLabel(analytics.overDescriptionScore, 18, 42)}
                  </Badge>
                </div>
                <Progress value={analytics.overDescriptionScore} className="h-2" />
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground">Action Density</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold font-mono">{analytics.actionDensity}</p>
                  <Badge variant="outline" className="font-mono">
                    {getToneLabel(analytics.actionDensity, 10, 35)}
                  </Badge>
                </div>
                <Progress value={analytics.actionDensity} className="h-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="glow-card glow-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-muted-foreground">Most Used Words</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {analytics.topWords.map((item) => (
                    <span
                      key={item.word}
                      className="rounded-full border border-border bg-muted/30 px-3 py-2 text-foreground transition-colors hover:border-neon-purple/60"
                      style={{
                        fontSize: getWordCloudSize(item.count, maxWordCloudCount),
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader>
                <CardTitle className="text-sm font-mono text-muted-foreground">Repetition Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-pink">Repeated Words</p>
                  <div className="mt-3 space-y-2">
                    {analytics.repetition.length > 0 ? analytics.repetition.map((item) => (
                      <div key={item.word} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                        <span>{item.word}</span>
                        <span className="font-mono text-muted-foreground">{item.count}x</span>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No strong repetition signals yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">Repeated Phrases</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {analytics.repeatedPhrases.length > 0 ? analytics.repeatedPhrases.map((item) => (
                      <Badge key={item.word} variant="secondary" className="font-mono text-[11px]">
                        {item.word} · {item.count}x
                      </Badge>
                    )) : (
                      <p className="text-sm text-muted-foreground">No repeated phrase clusters detected yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-neon-pink" /> Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold font-mono text-neon-purple">{analytics.currentStreak}</p>
                <p className="text-xs text-muted-foreground">days with saved writing</p>
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-neon-cyan" /> Longest Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold font-mono text-neon-cyan">{analytics.longestStreak}</p>
                <p className="text-xs text-muted-foreground">best streak so far</p>
              </CardContent>
            </Card>

            <Card className="glow-card glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-neon-purple" /> Weekly Momentum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold font-mono">
                  {analytics.wordsPerDay.slice(-7).reduce((sum, day) => sum + day.words, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">words in the last 7 tracked days</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glow-card glow-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Session Consistency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-2">
                {combinedHeatmap.map((cell) => (
                  <div key={cell.date} className="space-y-1">
                    <div
                      title={`${cell.date} · ${cell.words} draft words · ${cell.sessions} writing session${cell.sessions === 1 ? "" : "s"}`}
                      className="h-9 rounded-md transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: getHeatmapColor(cell.level) }}
                    />
                    <p className="text-center text-[10px] font-mono text-muted-foreground">
                      {cell.label.slice(0, 1)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>Less</span>
                {[0, 1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className="h-4 w-4 rounded-sm"
                    style={{ backgroundColor: getHeatmapColor(level) }}
                  />
                ))}
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WritingAnalytics;
