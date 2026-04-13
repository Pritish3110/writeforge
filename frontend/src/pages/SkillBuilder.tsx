import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  type LearningPathItem,
  type LearningQueueItem,
  type LearningTopic,
  type SkillBuilderSubmitResponse,
} from "@/services/learningClient";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { callBackendAI } from "@/services/backendAiClient";
import { buildSkillBuilderImprovementPrompt } from "@/lib/promptEngine";
import {
  buildCoachFallback,
  buildDailyChallengeTask,
  getTrendLabel,
  validateSkillBuilderDraft,
} from "@/lib/skillBuilder";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Flame,
  Lightbulb,
  PencilLine,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
} from "lucide-react";

const getTopicFromItem = (item: LearningQueueItem | null): LearningTopic | null => {
  if (!item) return null;
  if (item.topic) return item.topic;
  if (item.payload.type === "learn") return item.payload.data;

  return null;
};

const getPracticePrompt = (topic: LearningTopic | null, item: LearningQueueItem | null) => {
  if (item?.payload.type === "write") return item.payload.prompt;
  if (topic?.title) return `Write 2-3 sentences using ${topic.title.toLowerCase()}.`;

  return "Write 2-3 sentences using today's writing technique.";
};

const getPracticeHint = (topic: LearningTopic | null, item: LearningQueueItem | null) => {
  if (item?.payload.type === "write") return item.payload.guidance;
  if (topic?.conceptGuide?.examples?.[0]) {
    return `Start from the pattern in "${topic.conceptGuide.examples[0]}", then place it inside a fuller moment.`;
  }
  if (topic?.examples?.[0]) {
    return `Start from the pattern in "${topic.examples[0]}", then place it inside a fuller moment.`;
  }

  return "Build a clear image, then give it enough context to feel alive.";
};

const getHeatmapColor = (level: number) => {
  switch (level) {
    case 3:
      return "hsl(var(--neon-purple))";
    case 2:
      return "hsl(var(--neon-purple) / 0.68)";
    case 1:
      return "hsl(var(--neon-purple) / 0.32)";
    default:
      return "hsl(var(--muted))";
  }
};

const sessionStepLabels = {
  learn: "Learn",
  write: "Write",
  improve: "Improve",
  challenge: "Challenge",
} as const;

type SessionStep = keyof typeof sessionStepLabels;

const sessionOrder: SessionStep[] = ["learn", "write", "improve", "challenge"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontFamily: "JetBrains Mono",
  fontSize: "12px",
};

const StepPill = ({
  active,
  completed,
  label,
  onClick,
}: {
  active: boolean;
  completed: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-[8px] border px-3 py-2 text-left text-sm transition-colors",
      active
        ? "border-neon-purple bg-neon-purple/10 text-foreground"
        : "border-border bg-muted/20 text-muted-foreground hover:text-foreground",
      completed && "border-neon-cyan/60 bg-neon-cyan/10 text-foreground",
    )}
  >
    {label}
  </button>
);

const SkillBuilder = () => {
  const { today, progress, error, loadingToday, submittingTopicId, submitWriting } = useLearningEngine();
  const [content, setContent] = useState("");
  const [result, setResult] = useState<SkillBuilderSubmitResponse | null>(null);
  const [activeStep, setActiveStep] = useState<SessionStep>("learn");
  const [coachDraft, setCoachDraft] = useState("");
  const [coachMode, setCoachMode] = useState<"ai" | "fallback" | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [challengeResponse, setChallengeResponse] = useState("");
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);
  const currentItem = useMemo(
    () => today?.application || today?.new || today?.reviews?.[0] || null,
    [today],
  );
  const topic = getTopicFromItem(currentItem);
  const dateKey = new Date().toISOString().slice(0, 10);
  const sessionStorageKey = `${dateKey}-${topic?.id || "pending"}`;
  const [sessionStore, setSessionStore] = useLocalStorage<
    Record<string, Record<SessionStep, boolean>>
  >("writerz-skill-builder-sessions", {});
  const sessionState = sessionStore[sessionStorageKey] || {
    learn: false,
    write: false,
    improve: false,
    challenge: false,
  };

  const prompt = getPracticePrompt(topic, currentItem);
  const hint = getPracticeHint(topic, currentItem);
  const guide = topic?.conceptGuide || {
    what: topic?.definition || "",
    why: topic?.definition
      ? `Use ${topic.title.toLowerCase()} to make your writing more expressive.`
      : "",
    steps: [] as string[],
    examples: topic?.examples || [],
  };
  const validation = validateSkillBuilderDraft(content);
  const learningPath = progress?.learningPath || [];
  const tracker = progress?.skillBuilderInsights?.heatmap || progress?.heatmap || [];
  const masteryItem = learningPath.find((item) => item.topicId === topic?.id) || null;
  const attempts = (progress?.skillBuilderInsights?.recentAttempts || []).filter(
    (entry) => entry.topicId === topic?.id,
  );
  const visibleAttempts = attempts.length > 0
    ? attempts
    : (progress?.skillBuilderInsights?.recentAttempts || []).slice(0, 5);
  const attemptTrendData = [...visibleAttempts]
    .reverse()
    .map((attempt, index) => ({
      label: `Try ${index + 1}`,
      score: attempt.score,
    }));
  const challengeTask = useMemo(() => {
    if (!topic) return null;

    return buildDailyChallengeTask(
      topic,
      learningPath.map((item) => ({ id: item.topicId, title: item.title })),
      dateKey,
    );
  }, [dateKey, learningPath, topic]);
  const isSubmitting = Boolean(topic && submittingTopicId === topic.id);
  const canSubmit = Boolean(topic && validation.isValid && !isSubmitting);
  const completedCount = sessionOrder.filter((step) => sessionState[step]).length;
  const sessionProgress = (completedCount / sessionOrder.length) * 100;

  useEffect(() => {
    setResult(null);
    setCoachDraft("");
    setCoachMode(null);
    setCoachError(null);
    setChallengeResponse("");
    setChallengeFeedback(null);
    setActiveStep("learn");
  }, [topic?.id]);

  const markStep = (step: SessionStep, nextStep?: SessionStep) => {
    setSessionStore((previous) => ({
      ...previous,
      [sessionStorageKey]: {
        ...sessionState,
        [step]: true,
      },
    }));

    if (nextStep) {
      setActiveStep(nextStep);
    }
  };

  const handleSubmit = async () => {
    if (!topic || !validation.isValid) return;

    const payload = await submitWriting(topic.id, content);
    if (payload) {
      setResult(payload);
      markStep("write", "improve");
    }
  };

  const handleCoachRewrite = async () => {
    if (!topic || !content.trim()) return;

    setImproving(true);
    setCoachError(null);

    try {
      const response = await callBackendAI({
        prompt: buildSkillBuilderImprovementPrompt({
          topicTitle: topic.title,
          content,
        }),
        generationConfig: {
          maxOutputTokens: 220,
          temperature: 0.7,
        },
      });
      setCoachDraft(response.text.trim());
      setCoachMode("ai");
    } catch {
      setCoachDraft(buildCoachFallback(content, topic));
      setCoachMode("fallback");
      setCoachError("Live coaching was unavailable, so a local rewrite guide stepped in.");
    } finally {
      setImproving(false);
    }
  };

  const handleAcceptCoachDraft = () => {
    if (!coachDraft) return;
    setContent(coachDraft);
    setResult(null);
    markStep("improve", "challenge");
  };

  const handleChallengeSubmit = (answerId?: string) => {
    if (!challengeTask) return;

    if (challengeTask.type === "identify") {
      const isCorrect = answerId === challengeTask.answerId;
      setChallengeFeedback(
        isCorrect
          ? "Nice. You spotted the technique correctly."
          : `Not quite. This one is ${topic?.title}.`,
      );
      markStep("challenge");
      return;
    }

    if (!challengeResponse.trim()) {
      setChallengeFeedback("Write a quick response before finishing the challenge.");
      return;
    }

    setChallengeFeedback("Challenge complete. You gave the idea another angle, which is exactly the point.");
    markStep("challenge");
  };

  if (loadingToday) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glow-card glow-border" hoverable={false}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card className="glow-card glow-border" hoverable={false}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !topic || !progress) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Builder</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Build stronger writing instincts one step at a time.
          </p>
        </div>
        <Card className="glow-card glow-border" hoverable={false}>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">
              Unable to load content. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {topic.themeTitle}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {currentItem?.stage || "apply"}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            Mastery {masteryItem?.mastery || 0}%
          </Badge>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skill Builder</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Today, go deeper with {topic.title.toLowerCase()} through guided learning, practice, and revision.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-[12px] bg-muted/25 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>Session Completion</span>
              <span>{completedCount}/4</span>
            </div>
            <Progress value={sessionProgress} className="mt-3 h-2" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {sessionOrder.map((step) => (
                <StepPill
                  key={step}
                  active={activeStep === step}
                  completed={sessionState[step]}
                  label={sessionStepLabels[step]}
                  onClick={() => setActiveStep(step)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-neon-cyan" />
              Concept Deep Dive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[12px] bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Topic</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{topic.title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{topic.definition}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-border bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What Is It</p>
                <p className="mt-3 text-sm leading-7">{guide.what}</p>
              </div>
              <div className="rounded-[12px] border border-border bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Why It Matters</p>
                <p className="mt-3 text-sm leading-7">{guide.why}</p>
              </div>
            </div>

            <div className="rounded-[12px] border border-border bg-muted/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">How To Write It</p>
              <div className="mt-3 space-y-3">
                {(guide.steps.length > 0 ? guide.steps : [
                  "Start with the main image or idea you want to express.",
                  "Shape it so the technique is easy to notice.",
                  "Add enough context for the writing to feel alive.",
                ]).map((step, index) => (
                  <div key={step} className="flex items-start gap-3 text-sm leading-6">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-neon-cyan/10 text-xs font-semibold text-neon-cyan">
                      {index + 1}
                    </div>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Examples</p>
              <div className="grid gap-2">
                {(guide.examples.length > 0 ? guide.examples : topic.examples || []).map((example) => (
                  <div key={example} className="rounded-[8px] bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {example}
                  </div>
                ))}
              </div>
            </div>

            {!sessionState.learn ? (
              <Button type="button" variant="secondary" onClick={() => markStep("learn", "write")}>
                Mark Learn Complete
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-neon-cyan">
                <CheckCircle2 className="h-4 w-4" />
                Learn step complete
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glow-card glow-border" hoverable={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-neon-purple" />
                Daily Practice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                {tracker.slice(-30).map((cell) => (
                  <div key={cell.date} className="space-y-1 text-center">
                    <div
                      className="h-7 w-full rounded-[6px]"
                      title={`${cell.date} · ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                      style={{ backgroundColor: getHeatmapColor(cell.level) }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(cell.date), "d")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-muted/20 p-4 text-sm">
                <span className="text-muted-foreground">Current streak</span>
                <span className="font-semibold">{progress.streak.current} days</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card glow-border" hoverable={false}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-neon-pink" />
                Your Learning Path
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningPath.map((item: LearningPathItem) => (
                <div
                  key={item.topicId}
                  className="flex items-center justify-between rounded-[8px] border border-border bg-muted/10 px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {item.completed ? "✔" : "⬜"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.status.replace("_", " ")}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{item.mastery}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PencilLine className="h-4 w-4 text-neon-purple" />
              Step 2: Write
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[12px] bg-muted/25 p-4">
              <p className="text-sm font-medium">{prompt}</p>
              <p className="mt-2 flex gap-2 text-sm leading-6 text-muted-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
                {hint}
              </p>
            </div>

            <div className="space-y-3">
              <Textarea
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setResult(null);
                  setCoachDraft("");
                }}
                placeholder="Write 2-3 sentences here..."
                className="min-h-[220px] resize-none bg-background/40 text-base leading-7"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{validation.wordCount} words · {validation.sentenceCount} sentences</span>
                <span>{validation.message}</span>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-neon-purple hover:bg-neon-purple/90"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? "Evaluating..." : "Submit & Evaluate"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {error ? <p className="text-sm text-muted-foreground">Submission failed. Try again.</p> : null}
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WandSparkles className="h-4 w-4 text-neon-cyan" />
              Step 3: Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[12px] bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              Improve the same idea with stronger imagery, more context, and better flow.
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!content.trim() || improving}
              onClick={() => void handleCoachRewrite()}
            >
              {improving ? "Rewriting..." : "Get Coach Rewrite"}
              <Sparkles className="h-4 w-4" />
            </Button>

            {coachError ? <p className="text-xs text-muted-foreground">{coachError}</p> : null}

            {coachDraft ? (
              <div className="space-y-3 rounded-[12px] border border-border bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Suggested rewrite</p>
                  <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                    {coachMode === "ai" ? "AI Coach" : "Coach Draft"}
                  </Badge>
                </div>
                <p className="text-sm leading-7">{coachDraft}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleAcceptCoachDraft}>
                    Accept Rewrite
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => markStep("improve", "challenge")}>
                    Keep My Draft
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit a draft or paste one into the box to unlock a stronger version.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-neon-cyan" />
              Advanced Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div>
                <p className="font-mono text-4xl font-bold text-neon-cyan">
                  {result.evaluation.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <Progress value={result.evaluation.score} className="mt-3 h-2" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.evaluation.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm leading-7 text-muted-foreground">{result.evaluation.feedback}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(result.evaluation.breakdown).map(([key, value]) => (
                    <div key={key} className="rounded-[12px] border border-border bg-muted/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{key}</p>
                      <p className="mt-2 text-2xl font-semibold">{value.score}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{value.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[12px] bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your Draft</p>
                <p className="mt-2 text-sm leading-7">{result.entry.content}</p>
              </div>
              <div className="rounded-[12px] bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Weak Parts To Fix</p>
                <div className="mt-2 space-y-2">
                  {result.evaluation.weakParts.length > 0 ? (
                    result.evaluation.weakParts.map((item) => (
                      <p key={item} className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Clean structure and clarity. Push vividness if you want a stronger score.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-neon-pink" />
              Step 4: Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {challengeTask ? (
              <>
                <div className="rounded-[12px] bg-muted/20 p-4">
                  <p className="text-sm font-medium">{challengeTask.title}</p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{challengeTask.prompt}</p>
                </div>

                {challengeTask.type === "identify" ? (
                  <div className="grid gap-2">
                    {challengeTask.options?.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="secondary"
                        className="justify-start"
                        onClick={() => handleChallengeSubmit(option.id)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={challengeResponse}
                      onChange={(event) => setChallengeResponse(event.target.value)}
                      placeholder="Write your challenge response here..."
                      className="min-h-[150px] resize-none bg-background/40 text-base leading-7"
                    />
                    <Button type="button" onClick={() => handleChallengeSubmit()}>
                      Complete Challenge
                    </Button>
                  </div>
                )}

                {challengeTask.sampleAnswer ? (
                  <p className="text-xs text-muted-foreground">Example: {challengeTask.sampleAnswer}</p>
                ) : null}

                {challengeFeedback ? (
                  <div className="rounded-[12px] border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                    {challengeFeedback}
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-neon-cyan" />
              Previous Attempts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Recent trend</p>
                <p className="text-sm text-muted-foreground">
                  {getTrendLabel(progress.skillBuilderInsights?.trend || "steady")}
                </p>
              </div>
              <div className="rounded-[12px] bg-muted/20 px-3 py-2 text-sm">
                Mastery {masteryItem?.mastery || 0}%
              </div>
            </div>

            {attemptTrendData.length > 1 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attemptTrendData}>
                    <CartesianGrid stroke="hsl(var(--border) / 0.35)" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--neon-cyan))"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(var(--neon-cyan))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="space-y-3">
              {visibleAttempts.length > 0 ? (
                visibleAttempts.slice(0, 5).map((attempt) => (
                  <div key={attempt.id} className="rounded-[12px] border border-border bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{attempt.content}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{attempt.feedback}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold">{attempt.score}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(attempt.createdAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                  Your last five submissions will show up here once you start practicing.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
              <Flame className="h-4 w-4 text-neon-pink" />
              Daily Consistency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{progress.streak.current}</p>
            <p className="mt-1 text-xs text-muted-foreground">days in your current streak</p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
              <BrainCircuit className="h-4 w-4 text-neon-cyan" />
              Weak Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {progress.skillBuilderInsights?.weakAreas?.[0]?.title || progress.weakTopics?.[0]?.title || "None"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {progress.skillBuilderInsights?.weakAreas?.[0]?.recommendation ||
                progress.weakTopics?.[0]?.recommendation ||
                "Keep practicing to surface your next focus area."}
            </p>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
              <Target className="h-4 w-4 text-neon-purple" />
              Topic Mastery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono">{masteryItem?.mastery || 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">based on attempts, scores, and SRS stage</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SkillBuilder;
