import { useMemo, useRef, useState } from "react";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  type LearningPerformance,
  type LearningQueueItem,
  type LearningWritePayload,
  type LearningMcqPayload,
} from "@/services/learningClient";
import { ArrowRight, BrainCircuit, Flame, RefreshCw, Sparkles } from "lucide-react";

const performanceOptions: Array<{
  value: LearningPerformance;
  label: string;
}> = [
  { value: "again", label: "Needs Work" },
  { value: "hard", label: "Keep Going" },
  { value: "good", label: "Solid" },
  { value: "easy", label: "Easy" },
];

const stageLabel: Record<LearningQueueItem["stage"], string> = {
  learn: "Discover",
  recognize: "Recognize",
  apply: "Use In Writing",
  mastered: "Mastered",
};

const getQueueKey = (item: LearningQueueItem) => `${item.stage}:${item.topicId}`;

const DailyLearningCard = () => {
  const {
    today,
    progress,
    error,
    loadingToday,
    submittingTopicId,
    refreshToday,
    submitPerformance,
  } = useLearningEngine();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [writtenResponses, setWrittenResponses] = useState<Record<string, string>>({});
  const practicePanelRef = useRef<HTMLDivElement | null>(null);
  const practiceItems = useMemo(
    () => [today?.new, ...(today?.reviews || []), today?.application].filter(Boolean) as LearningQueueItem[],
    [today],
  );
  const featuredItem = practiceItems[0] || null;
  const upcomingItems = practiceItems.slice(1, 3);
  const suggestedFocus =
    progress?.weakTopics?.[0]?.recommendation ||
    (today?.theme?.title
      ? `Keep building your ${today.theme.title.toLowerCase()} skills with one focused practice round today.`
      : "A short focused practice round will keep your momentum moving.");
  const quickTaskLabel = featuredItem
    ? featuredItem.payload.type === "write"
      ? (featuredItem.payload as LearningWritePayload).prompt
      : featuredItem.payload.type === "mcq"
        ? (featuredItem.payload as LearningMcqPayload).question
        : `Review ${featuredItem.title} and try one fresh example in your own words.`
    : "You're all caught up for today.";

  const scrollToPractice = () => {
    if (!practicePanelRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    practicePanelRef.current.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    practicePanelRef.current.focus({ preventScroll: true });
  };

  const renderPerformanceButtons = (
    item: LearningQueueItem,
    disabled = false,
  ) => (
    <div className="flex flex-wrap gap-2">
      {performanceOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={option.value === "good" || option.value === "easy" ? "default" : "outline"}
          size="sm"
          disabled={disabled || submittingTopicId === item.topicId}
          className={cn(
            option.value === "good" || option.value === "easy"
              ? "bg-neon-purple hover:bg-neon-purple/90"
              : "",
          )}
          onClick={() => void submitPerformance(item.topicId, option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );

  const renderPracticeItem = (item: LearningQueueItem) => {
    const queueKey = getQueueKey(item);

    return (
      <div
        key={queueKey}
        className="rounded-[1.25rem] border border-border/70 bg-background/40 p-5 shadow-[0_16px_40px_-32px_hsl(var(--foreground)/0.85)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neon-cyan">
              {item.themeTitle}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{item.title}</h3>
          </div>
          <Badge variant="outline" className="text-[11px] uppercase tracking-[0.14em]">
            {stageLabel[item.stage]}
          </Badge>
        </div>

        {item.payload.type === "learn" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {item.payload.data.definition}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.payload.data.examples.map((example) => (
                <Badge key={example} variant="secondary" className="text-[11px]">
                  {example}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Mark how confident this feels before you move on.
            </p>
            {renderPerformanceButtons(item)}
          </div>
        ) : null}

        {item.payload.type === "mcq" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">{item.payload.question}</p>
            <div className="grid gap-2">
              {(item.payload as LearningMcqPayload).options.map((option) => {
                const selectedAnswer = selectedAnswers[queueKey];
                const showFeedback = Boolean(selectedAnswer);
                const isCorrect = option.id === (item.payload as LearningMcqPayload).answerId;
                const isSelected = selectedAnswer === option.id;

                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    className={cn(
                      "justify-start font-normal",
                      showFeedback && isCorrect && "border-neon-cyan/40 bg-neon-cyan/10",
                      showFeedback && isSelected && !isCorrect && "border-destructive/40 bg-destructive/10",
                    )}
                    onClick={() =>
                      setSelectedAnswers((prev) => ({ ...prev, [queueKey]: option.id }))
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            {selectedAnswers[queueKey] ? (
              <p className="text-sm text-muted-foreground">
                {selectedAnswers[queueKey] === (item.payload as LearningMcqPayload).answerId
                  ? "Nice work. Mark how comfortable that felt."
                  : `Correct answer: ${
                      (item.payload as LearningMcqPayload).options.find(
                        (option) => option.id === (item.payload as LearningMcqPayload).answerId,
                      )?.label || item.title
                    }`}
              </p>
            ) : null}
            {renderPerformanceButtons(item, !selectedAnswers[queueKey])}
          </div>
        ) : null}

        {item.payload.type === "write" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {(item.payload as LearningWritePayload).prompt}
            </p>
            <p className="text-sm text-muted-foreground">
              {(item.payload as LearningWritePayload).guidance}
            </p>
            <Textarea
              value={writtenResponses[queueKey] || ""}
              onChange={(event) =>
                setWrittenResponses((prev) => ({
                  ...prev,
                  [queueKey]: event.target.value,
                }))
              }
              placeholder={`Draft a sentence using ${item.title}...`}
              className="min-h-[110px]"
            />
            {renderPerformanceButtons(item, !(writtenResponses[queueKey] || "").trim())}
          </div>
        ) : null}
      </div>
    );
  };

  if (loadingToday) {
    return (
      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-4 w-4 text-neon-cyan" />
            Skill Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-card glow-border">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-neon-cyan" />
              Skill Builder
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Build stronger writing instincts with one focused practice step at a time.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => void refreshToday()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today's Focus</p>
            <p className="mt-2 text-lg font-semibold tracking-tight">
              {featuredItem?.title || today?.theme?.title || "Daily writing craft"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {featuredItem?.themeTitle || "A short creative practice to keep your skills sharp."}
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quick Task</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{quickTaskLabel}</p>
          </div>

          <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-neon-pink" />
              Streak
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {progress?.streak.current || 0}
              <span className="ml-2 text-base text-muted-foreground">
                day{(progress?.streak.current || 0) === 1 ? "" : "s"}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{suggestedFocus}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-5">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : null}

        {!error && featuredItem ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neon-cyan">
                  <Sparkles className="h-3.5 w-3.5" />
                  Start Practice
                </div>
                <p className="text-sm text-muted-foreground">
                  One short session is enough to keep today’s momentum going.
                </p>
              </div>
              <Button
                type="button"
                onClick={scrollToPractice}
                className="bg-neon-purple hover:bg-neon-purple/90"
              >
                Start Practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {upcomingItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {upcomingItems.map((item) => (
                  <Badge key={item.topicId} variant="outline" className="text-[11px] uppercase tracking-[0.14em]">
                    Next: {item.title}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div ref={practicePanelRef} tabIndex={-1} className="scroll-mt-6 outline-none">
              {renderPracticeItem(featuredItem)}
            </div>
          </div>
        ) : null}

        {!error && !featuredItem ? (
          <div className="rounded-[1.25rem] border border-border/70 bg-background/35 p-5">
            <p className="text-base font-medium">You're all caught up for today</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Come back tomorrow to continue building your skills.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DailyLearningCard;
