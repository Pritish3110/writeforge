import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  fetchLearningSessionToday,
  resetSkillBuilderAttempts,
  submitSkillBuilderChallenge,
  updateLearningSession,
  type LearningCycleSummary,
  type LearningPathItem,
  type LearningQueueItem,
  type LearningSessionSummary,
  type LearningSessionStep,
  type LearningTopic,
  type SkillBuilderChallengeResponse,
  type SkillBuilderSubmitResponse,
} from "@/services/learningClient";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { mergeLearningSessionSummary } from "@/lib/learningSession";
import {
  buildDailyChallengeTask,
  buildRuleBasedImprovement,
  getImprovementChecklist,
  getTrendLabel,
  validateSkillBuilderDraft,
} from "@/lib/skillBuilder";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const SkillBuilderTrendChart = lazy(() => import("@/components/skillBuilder/SkillBuilderTrendChart"));

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
const emptySessionSteps: Record<SessionStep, boolean> = {
  learn: false,
  write: false,
  improve: false,
  challenge: false,
};
const evaluationDimensionCopy = {
  structure: "Technique Control",
  creativity: "Image Power",
  clarity: "Sentence Flow",
} as const;

const formatCountdown = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
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

const SkillBuilderPageSkeleton = () => (
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

const SkillBuilder = () => {
  const {
    today,
    cycle,
    progress,
    error,
    loadingToday,
    submittingTopicId,
    syncProgress,
    submitWriting,
    refreshToday,
  } = useLearningEngine();
  const [content, setContent] = useState("");
  const [result, setResult] = useState<SkillBuilderSubmitResponse | null>(null);
  const [challengeResult, setChallengeResult] = useState<SkillBuilderChallengeResponse | null>(null);
  const [activeStep, setActiveStep] = useState<SessionStep>("learn");
  const [coachDraft, setCoachDraft] = useState("");
  const [improving, setImproving] = useState(false);
  const [session, setSession] = useState<LearningSessionSummary | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [persistingStep, setPersistingStep] = useState<LearningSessionStep | null>(null);
  const [challengeResponse, setChallengeResponse] = useState("");
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceNoticeSeen, setPracticeNoticeSeen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [sessionCycle, setSessionCycle] = useState<LearningCycleSummary | null>(null);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const [refreshingCycle, setRefreshingCycle] = useState(false);
  const [lastCycleRefreshTarget, setLastCycleRefreshTarget] = useState<string | null>(null);
  const currentItem = useMemo(() => {
    const queue = [today?.application, today?.new, ...(today?.reviews || [])].filter(
      (item): item is LearningQueueItem => Boolean(item),
    );

    if (session?.topicId) {
      return queue.find((item) => item.topicId === session.topicId) || queue[0] || null;
    }

    return queue[0] || null;
  }, [session?.topicId, today?.application, today?.new, today?.reviews]);
  const topic = getTopicFromItem(currentItem);
  const topicId = topic?.id || "";
  const cycleInfo = cycle || sessionCycle;
  const dateKey = cycleInfo?.currentDate || new Date().toISOString().slice(0, 10);
  const sessionState = session?.steps || emptySessionSteps;
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
  const learningPath = useMemo(() => progress?.learningPath || [], [progress?.learningPath]);
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
  const isWriteLocked = sessionState.write;
  const isImproveLocked = sessionState.improve;
  const isChallengeLocked = sessionState.challenge;
  const canSubmit = Boolean(topic && validation.isValid && !isSubmitting);
  const completedCount = sessionOrder.filter((step) => sessionState[step]).length;
  const sessionProgress = (completedCount / sessionOrder.length) * 100;
  const improvementChecklist = topic ? getImprovementChecklist(topic) : [];
  const normalizedResetConfirmInput = resetConfirmInput.trim().toLowerCase();
  const applySessionUpdate = useCallback(
    (
      incoming?: Partial<LearningSessionSummary> | null,
      overrides?: Partial<LearningSessionSummary>,
      options?: {
        preserveCompletedSteps?: boolean;
      },
    ) => {
      setSession((previous) =>
        mergeLearningSessionSummary({
          previous,
          incoming,
          overrides,
          defaultDate: dateKey,
          defaultTopicId: topicId,
          preserveCompletedSteps: options?.preserveCompletedSteps,
        }),
      );
    },
    [dateKey, topicId],
  );

  const resetLocalSessionState = useCallback(() => {
    setContent("");
    setResult(null);
    setChallengeResult(null);
    setCoachDraft("");
    setChallengeResponse("");
    setShowPracticeModal(false);
    setPracticeNoticeSeen(false);
    setActiveStep("learn");
  }, []);

  const loadSession = useCallback(
    async (showLoader = false) => {
      if (showLoader) {
        setLoadingSession(true);
      }

      setSessionError(null);

      try {
        const payload = await fetchLearningSessionToday();
        setSession(payload.session);
        setSessionCycle(payload.cycle);
        return payload;
      } catch {
        setSession(null);
        setSessionError("Session progress could not be restored.");
        return null;
      } finally {
        if (showLoader) {
          setLoadingSession(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const payload = await loadSession(true);
      if (cancelled || !payload) return;

      setSession(payload.session);
      setSessionCycle(payload.cycle);
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  useEffect(() => {
    resetLocalSessionState();
  }, [resetLocalSessionState, session?.date, topic?.id]);

  useEffect(() => {
    if (!cycleInfo?.nextCycleAt) {
      setCountdownMs(null);
      return;
    }

    const updateCountdown = () => {
      setCountdownMs(Math.max(0, new Date(cycleInfo.nextCycleAt).getTime() - Date.now()));
    };

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [cycleInfo?.nextCycleAt]);

  useEffect(() => {
    if (
      countdownMs === null ||
      countdownMs > 0 ||
      refreshingCycle ||
      !cycleInfo?.nextCycleAt ||
      lastCycleRefreshTarget === cycleInfo.nextCycleAt
    ) {
      return;
    }

    let cancelled = false;

    const refreshForNextCycle = async () => {
      setRefreshingCycle(true);
      setLastCycleRefreshTarget(cycleInfo.nextCycleAt);
      const payload = await refreshToday();
      if (!cancelled && payload) {
        resetLocalSessionState();
      }
      if (!cancelled) {
        setRefreshingCycle(false);
      }
    };

    void refreshForNextCycle();

    return () => {
      cancelled = true;
    };
  }, [
    countdownMs,
    cycleInfo?.nextCycleAt,
    lastCycleRefreshTarget,
    refreshingCycle,
    refreshToday,
    resetLocalSessionState,
  ]);

  const persistStep = async (step: LearningSessionStep, nextStep?: SessionStep) => {
    if (!topicId || sessionState[step]) {
      if (nextStep) setActiveStep(nextStep);
      return true;
    }

    setPersistingStep(step);
    setSessionError(null);

    try {
      const payload = await updateLearningSession({
        topicId,
        step,
        completed: true,
      });
      applySessionUpdate(payload.session, {
        steps: {
          [step]: true,
        } as Partial<Record<LearningSessionStep, boolean>>,
      }, { preserveCompletedSteps: true });
      syncProgress(payload.progress);
      setSessionCycle(payload.cycle);
      if (nextStep) setActiveStep(nextStep);
      return true;
    } catch {
      setSessionError("Could not save this step right now.");
      return false;
    } finally {
      setPersistingStep(null);
    }
  };

  const submitWritingAttempt = async ({
    practiceOnly,
    contentValue = content,
    requireValidDraft = true,
  }: {
    practiceOnly: boolean;
    contentValue?: string;
    requireValidDraft?: boolean;
  }) => {
    const draftValidation = validateSkillBuilderDraft(contentValue);
    if (!topicId || isSubmitting || !contentValue.trim() || (requireValidDraft && !draftValidation.isValid)) {
      return false;
    }

    const payload = await submitWriting(topicId, contentValue, { practiceOnly });
    if (payload) {
      setResult(payload);
      if (!practiceOnly) {
        applySessionUpdate(payload.session, {
          steps: {
            write: true,
          },
          writeScore: payload.evaluation.score,
        }, { preserveCompletedSteps: true });
        setChallengeResult(null);
        setActiveStep("improve");
      }
      return true;
    }

    return false;
  };

  const handleSubmit = async () => {
    if (!topicId || !validation.isValid || isSubmitting) return;

    if (isWriteLocked && !practiceNoticeSeen) {
      setShowPracticeModal(true);
      return;
    }

    if (!isWriteLocked && !sessionState.learn) {
      const learnSaved = await persistStep("learn");
      if (!learnSaved) return;
    }

    await submitWritingAttempt({
      practiceOnly: isWriteLocked,
    });
  };

  const handleCoachRewrite = async () => {
    if (!topic || !content.trim()) return;

    setImproving(true);
    const rewrite = buildRuleBasedImprovement(content, topic);
    setCoachDraft(rewrite);
    setImproving(false);
  };

  const completeImproveStep = async (acceptDraft: boolean) => {
    const finalContent = acceptDraft && coachDraft ? coachDraft : content;

    if (acceptDraft && coachDraft) {
      setContent(finalContent);
      setResult(null);
    }

    if (!sessionState.learn) {
      const learnSaved = await persistStep("learn");
      if (!learnSaved) return;
    }

    if (!sessionState.write) {
      const writeSaved = await submitWritingAttempt({
        practiceOnly: false,
        contentValue: finalContent,
        requireValidDraft: false,
      });
      if (!writeSaved) return;
    }

    if (!sessionState.improve) {
      await persistStep("improve", "challenge");
      return;
    }

    setActiveStep("challenge");
  };

  const handleChallengeSubmit = async (answerId?: string) => {
    if (!topicId || !challengeTask || isChallengeLocked) return;

    try {
      let payload: SkillBuilderChallengeResponse;

      if (challengeTask.type === "identify") {
        const score = answerId === challengeTask.answerId ? 100 : 40;
        payload = await submitSkillBuilderChallenge({
          topicId,
          challengeScore: score,
        });
      } else {
        if (!challengeResponse.trim()) {
          setSessionError("Write a response before completing the challenge.");
          return;
        }
        payload = await submitSkillBuilderChallenge({
          topicId,
          content: challengeResponse,
        });
      }

      setChallengeResult(payload);
      applySessionUpdate(payload.session, {
        steps: {
          challenge: true,
        },
        challengeScore: payload.evaluation.score,
        finalScore: payload.finalScore,
        completed: true,
      }, { preserveCompletedSteps: true });
      syncProgress(payload.progress);
    } catch {
      setSessionError("Challenge scoring could not be saved.");
    }
  };

  const handleResetAttempts = async () => {
    if (normalizedResetConfirmInput !== "reset attempts") {
      setSessionError('Incorrect confirmation. Type "reset attempts" to confirm.');
      return;
    }

    setIsResetting(true);
    setSessionError(null);

    try {
      if (!topic) {
        throw new Error("Reset failed");
      }

      const payload = await resetSkillBuilderAttempts(topic.id);
      applySessionUpdate(payload.session);
      setSessionCycle(payload.cycle);
      resetLocalSessionState();
      setShowResetModal(false);
      setResetConfirmInput("");
      await refreshToday();
      setSessionError("✓ All attempts cleared. Your progress has been reset.");
    } catch {
      setSessionError("Could not reset attempts. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  if (loadingToday) {
    return <SkillBuilderPageSkeleton />;
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
            <p className="text-sm text-muted-foreground">Unable to load content. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                {topic.themeTitle}
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                Mastery {masteryItem?.mastery || 0}%
              </Badge>
              {session?.finalScore !== null && session?.finalScore !== undefined ? (
                <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                  Today {session.finalScore}/100
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Skill Builder</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Today you are sharpening {topic.title.toLowerCase()} through study, draftwork, refinement, and a final pressure test.
            </p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,320px)] xl:w-auto xl:min-w-[540px]">
            <div className="rounded-[12px] border border-border bg-muted/20 px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Next task in
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {countdownMs === null ? "--:--:--" : formatCountdown(countdownMs)}
              </p>
            </div>

            <div className="rounded-[12px] bg-muted/25 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span>Session Arc</span>
                <span>{completedCount}/4</span>
              </div>
              <Progress value={sessionProgress} className="mt-3 h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sessionOrder.map((step) => (
                  <StepPill
                    key={step}
                    active={activeStep === step}
                    completed={sessionState[step]}
                    label={`${sessionState[step] ? "✔" : "⬜"} ${sessionStepLabels[step]}`}
                    onClick={() => setActiveStep(step)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {loadingSession ? (
          <p className="text-sm text-muted-foreground">Restoring today&apos;s session progress...</p>
        ) : sessionError ? (
          <p className="text-sm text-muted-foreground">{sessionError}</p>
        ) : null}
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
                {(guide.steps.length > 0
                  ? guide.steps
                  : [
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
              <Button
                type="button"
                variant="secondary"
                disabled={persistingStep === "learn"}
                onClick={() => void persistStep("learn", "write")}
              >
                {persistingStep === "learn" ? "Saving..." : "Mark Learn Complete"}
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
                    <span className="text-sm">{item.completed ? "✔" : "⬜"}</span>
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
              Step 2: Draft the Passage
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
                <span>
                  {isWriteLocked
                    ? validation.isValid
                      ? "Scored pass complete. Further submissions are private practice and do not affect streaks, mastery, or analytics."
                      : `${validation.message} Practice passes stay private and do not affect tracked progress.`
                    : validation.message}
                </span>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-neon-purple hover:bg-neon-purple/90"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting
                ? "Reading Your Lines..."
                : isWriteLocked
                  ? "Practice-Only Evaluation"
                  : "Submit & Evaluate"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WandSparkles className="h-4 w-4 text-neon-cyan" />
              Step 3: Refine the Passage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[12px] bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              Ask the page for a sharper pass: stronger texture, cleaner sentence movement, and more pressure inside the image.
            </div>

            <div className="space-y-2 rounded-[12px] border border-border bg-muted/10 p-4">
              {improvementChecklist.map((item) => (
                <p key={item} className="text-sm text-muted-foreground">
                  {item}
                </p>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!content.trim() || improving || persistingStep === "improve" || isImproveLocked}
              onClick={() => void handleCoachRewrite()}
            >
              {improving || persistingStep === "improve"
                ? "Sharpening Draft..."
                : isImproveLocked
                  ? "Improve Step Complete"
                  : "Generate a Sharper Rewrite"}
              <Sparkles className="h-4 w-4" />
            </Button>

            {coachDraft ? (
              <div className="space-y-3 rounded-[12px] border border-border bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Suggested rewrite</p>
                  <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                    Coach pass
                  </Badge>
                </div>
                <p className="text-sm leading-7">{coachDraft}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void completeImproveStep(true)}>
                    Accept Rewrite
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void completeImproveStep(false)}>
                    Keep Draft
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Generate a rewrite after the scored pass to see how a stronger, cleaner version could carry the same idea.
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
              {result.practiceOnly ? "Private Practice Feedback" : "Scored Feedback"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {result.practiceOnly ? (
              <div className="rounded-[12px] border border-neon-cyan/30 bg-neon-cyan/5 p-4 text-sm leading-7 text-muted-foreground">
                This is a private practice read. The score is visible only here and does not feed mastery, streaks,
                heatmaps, analytics, or counted attempts.
              </div>
            ) : null}
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
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {evaluationDimensionCopy[key as keyof typeof evaluationDimensionCopy] || key}
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{value.score}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{value.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[12px] bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What You Wrote</p>
                <p className="mt-2 text-sm leading-7">{result.entry.content}</p>
              </div>
              <div className="rounded-[12px] bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next Revision Moves</p>
                <div className="mt-2 space-y-2">
                  {result.evaluation.weakParts.length > 0 ? (
                    result.evaluation.weakParts.map((item) => (
                      <p key={item} className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Add a setting, one stronger adjective, and one more descriptive detail if you want to push the score higher.
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
              Step 4: Pressure Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {challengeTask ? (
              <>
                <div className="rounded-[12px] bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{challengeTask.title}</p>
                    {challengeTask.difficultyLabel ? (
                      <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
                        {challengeTask.difficultyLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{challengeTask.prompt}</p>
                </div>

                {challengeTask.requirements?.length ? (
                  <div className="rounded-[12px] border border-border bg-muted/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What This Demands</p>
                    <div className="mt-3 space-y-2">
                      {challengeTask.requirements.map((requirement) => (
                        <p key={requirement} className="text-sm leading-6 text-muted-foreground">
                          {requirement}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {challengeTask.type === "identify" ? (
                  <div className="grid gap-2">
                    {challengeTask.options?.map((option) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant="secondary"
                        disabled={isChallengeLocked}
                        className="h-auto justify-start whitespace-normal py-3 text-left leading-6"
                        onClick={() => void handleChallengeSubmit(option.id)}
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
                      disabled={isChallengeLocked}
                      placeholder={challengeTask.placeholder || "Write your challenge response here..."}
                      className="min-h-[150px] resize-none bg-background/40 text-base leading-7"
                    />
                    <Button type="button" disabled={isChallengeLocked} onClick={() => void handleChallengeSubmit()}>
                      {isChallengeLocked ? "Pressure Test Complete" : challengeTask.ctaLabel || "Complete Challenge"}
                    </Button>
                  </div>
                )}

                {challengeTask.sampleAnswer ? (
                  <p className="text-xs text-muted-foreground">Benchmark direction: {challengeTask.sampleAnswer}</p>
                ) : null}

                {challengeResult ? (
                  <div className="space-y-3 rounded-[12px] border border-border bg-muted/10 p-4">
                    <p className="text-sm font-medium">Pressure test scored</p>
                    <p className="text-sm text-muted-foreground">{challengeResult.evaluation.feedback}</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span>Challenge: {challengeResult.evaluation.score}/100</span>
                      <span>Session total: {challengeResult.finalScore}/100</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-neon-cyan" />
                Counted Sessions
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                className="font-mono text-destructive hover:text-destructive"
                onClick={() => setShowResetModal(true)}
              >
                Delete Attempts
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Current momentum</p>
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
                <Suspense fallback={<Skeleton className="h-full w-full rounded-[12px]" />}>
                  <SkillBuilderTrendChart data={attemptTrendData} />
                </Suspense>
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
                  Your counted submissions will gather here as you complete scored sessions.
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
              Next Pressure Point
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
            <p className="mt-1 text-xs text-muted-foreground">
              Mastery rises slowly from repeated strong sessions, not from a single good day.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPracticeModal} onOpenChange={setShowPracticeModal}>
        <DialogContent className="glow-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">Practice-only evaluation?</DialogTitle>
            <DialogDescription className="leading-6">
              Your scored draft is already locked into today&apos;s session. A second or later submission is still useful,
              but it stays private and will not change mastery, streaks, heatmaps, analytics, or counted attempts.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[12px] border border-border bg-muted/10 p-4 text-sm leading-7 text-muted-foreground">
            Use this mode when you want more feedback, another pass, or a cleaner version of the same idea without
            moving your tracked progress.
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPracticeModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPracticeNoticeSeen(true);
                setShowPracticeModal(false);
                void submitWritingAttempt({
                  practiceOnly: true,
                });
              }}
            >
              Continue in Practice Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="glow-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">Hard reset attempts?</DialogTitle>
            <DialogDescription className="leading-6">
              Type <span className="font-mono text-foreground">reset attempts</span> to clear attempts,
              session progress, analytics, and mastery data for this topic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Confirmation
            </p>
            <Input
              value={resetConfirmInput}
              onChange={(event) => setResetConfirmInput(event.target.value)}
              placeholder="reset attempts"
              className="font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowResetModal(false);
                setResetConfirmInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={normalizedResetConfirmInput !== "reset attempts" || isResetting}
              onClick={() => void handleResetAttempts()}
            >
              {isResetting ? "Resetting..." : "Hard Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillBuilder;
