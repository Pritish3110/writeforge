import { useMemo, useState } from "react";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  type LearningQueueItem,
  type LearningTopic,
  type SkillBuilderSubmitResponse,
} from "@/services/learningClient";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Lightbulb,
  PencilLine,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const getTopicFromItem = (item: LearningQueueItem | null): LearningTopic | null => {
  if (!item) return null;
  if (item.topic) return item.topic;
  if (item.payload.type === "learn") return item.payload.data;

  return null;
};

const getPracticePrompt = (topic: LearningTopic | null, item: LearningQueueItem | null) => {
  if (item?.payload.type === "write") return item.payload.prompt;
  if (topic?.title) return `Write a sentence using ${topic.title.toLowerCase()}.`;

  return "Write a sentence using today's writing technique.";
};

const getPracticeHint = (topic: LearningTopic | null, item: LearningQueueItem | null) => {
  if (item?.payload.type === "write") return item.payload.guidance;
  if (topic?.examples?.[0]) return `Start from the pattern in "${topic.examples[0]}", then make it your own.`;

  return "Keep it to one clear sentence and make the technique easy to spot.";
};

const SkillBuilder = () => {
  const {
    today,
    error,
    loadingToday,
    submittingTopicId,
    submitWriting,
  } = useLearningEngine();
  const [content, setContent] = useState("");
  const [result, setResult] = useState<SkillBuilderSubmitResponse | null>(null);
  const currentItem = useMemo(
    () => today?.application || today?.new || today?.reviews?.[0] || null,
    [today],
  );
  const topic = getTopicFromItem(currentItem);
  const examples = topic?.examples?.slice(0, 3) || [];
  const prompt = getPracticePrompt(topic, currentItem);
  const hint = getPracticeHint(topic, currentItem);
  const isSubmitting = Boolean(topic && submittingTopicId === topic.id);
  const canSubmit = Boolean(topic && content.trim() && !isSubmitting);

  const handleSubmit = async () => {
    if (!topic || !content.trim()) return;

    const payload = await submitWriting(topic.id, content);
    if (payload) {
      setResult(payload);
    }
  };

  const handleTryAgain = () => {
    setContent("");
    setResult(null);
  };

  if (loadingToday) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
        <Card className="glow-card glow-border" hoverable={false}>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !topic) {
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {topic.themeTitle}
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {currentItem?.stage || "apply"}
          </Badge>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Builder</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Today, sharpen {topic.title.toLowerCase()} with one focused sentence.
          </p>
        </div>
        <div className="rounded-[12px] bg-muted/25 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Current Topic
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{topic.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{topic.definition}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-4 w-4 text-neon-cyan" />
              {topic.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{topic.definition}</p>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Examples
              </p>
              <div className="grid gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="rounded-[8px] bg-muted/30 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onClick={() => {
                      setContent(example);
                      setResult(null);
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PencilLine className="h-4 w-4 text-neon-purple" />
              Guided Practice
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
                }}
                placeholder="Write your sentence here..."
                className="min-h-[190px] resize-none bg-background/40 text-base leading-7"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{content.length} characters</span>
                <span>One sentence is enough.</span>
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

            {error ? (
              <p className="text-sm text-muted-foreground">Submission failed. Try again.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Card className="glow-card glow-border" hoverable={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-neon-cyan" />
              Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[160px_1fr]">
              <div>
                <p className="font-mono text-4xl font-bold text-neon-cyan">
                  {result.evaluation.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <Progress value={result.evaluation.score} className="mt-3 h-2" />
              </div>
              <div className="space-y-3">
                <p className="text-sm leading-7 text-muted-foreground">
                  {result.evaluation.feedback}
                </p>
                <div className="rounded-[12px] bg-muted/25 p-4">
                  <p className="flex items-start gap-2 text-sm font-medium">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-pink" />
                    {result.evaluation.suggestion}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Your Sentence
              </p>
              <p className="mt-2 text-sm leading-7">{result.entry.content}</p>
            </div>

            <Button type="button" variant="secondary" onClick={handleTryAgain}>
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default SkillBuilder;
