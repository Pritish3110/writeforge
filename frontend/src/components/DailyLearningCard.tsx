import { useMemo, useState } from "react";
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
import { BrainCircuit, RefreshCw } from "lucide-react";

const performanceOptions: Array<{
  value: LearningPerformance;
  label: string;
}> = [
  { value: "again", label: "Again" },
  { value: "hard", label: "Hard" },
  { value: "good", label: "Good" },
  { value: "easy", label: "Easy" },
];

const getQueueKey = (item: LearningQueueItem, prefix: string) => `${prefix}:${item.topicId}`;

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
  const reviewItems = useMemo(
    () => [today?.new, ...(today?.reviews || []), today?.application].filter(Boolean) as LearningQueueItem[],
    [today],
  );

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
            "font-mono",
            (option.value === "good" || option.value === "easy") &&
              "bg-neon-purple hover:bg-neon-purple/90",
          )}
          onClick={() => void submitPerformance(item.topicId, option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );

  const renderQueueItem = (item: LearningQueueItem, label: string) => {
    const queueKey = getQueueKey(item, label);

    return (
      <div key={queueKey} className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon-cyan">
              {label}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
          </div>
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {item.stage}
          </Badge>
        </div>

        <p className="mt-2 text-xs font-mono text-muted-foreground">{item.themeTitle}</p>

        {item.payload.type === "learn" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              {item.payload.data.definition}
            </p>
            <div className="flex flex-wrap gap-2">
              {item.payload.data.examples.map((example) => (
                <Badge key={example} variant="secondary" className="font-mono text-[11px]">
                  {example}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Rate how secure this concept feels right now.
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
              <p className="text-xs text-muted-foreground">
                {selectedAnswers[queueKey] === (item.payload as LearningMcqPayload).answerId
                  ? "Correct. Now mark how easily you recognized it."
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
            <p className="text-xs text-muted-foreground">
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
            {renderPerformanceButtons(
              item,
              !(writtenResponses[queueKey] || "").trim(),
            )}
          </div>
        ) : null}
      </div>
    );
  };

  if (loadingToday) {
    return (
      <Card className="glow-card glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <BrainCircuit className="h-4 w-4 text-neon-cyan" />
            Learning Engine
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
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <BrainCircuit className="h-4 w-4 text-neon-cyan" />
              Learning Engine
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Controlled repetition, stage-based practice, and weak-area reinforcement.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="font-mono"
            onClick={() => void refreshToday()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            Theme: {today?.theme?.title || "Figures Of Speech"}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px]">
            Due Today: {progress?.dueToday || 0}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px]">
            Learning Streak: {progress?.streak.current || 0} day
            {(progress?.streak.current || 0) === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <p className="mt-2 text-xs font-mono text-muted-foreground">
              Start the backend to load the daily learning queue.
            </p>
          </div>
        ) : null}

        {reviewItems.length > 0 ? (
          reviewItems.map((item, index) =>
            renderQueueItem(
              item,
              index === 0 && today?.new?.topicId === item.topicId
                ? "New Concept"
                : today?.application?.topicId === item.topicId && index === reviewItems.length - 1
                  ? "Application Task"
                  : "Review",
            ),
          )
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              No learning items are due right now. Come back after your next review window opens.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyLearningCard;
