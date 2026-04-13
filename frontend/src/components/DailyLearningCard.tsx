import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLearningEngine } from "@/hooks/useLearningEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BrainCircuit } from "lucide-react";

const DailyLearningCard = () => {
  const navigate = useNavigate();
  const { today } = useLearningEngine();
  const currentItem = useMemo(
    () => today?.application || today?.new || today?.reviews?.[0] || null,
    [today],
  );
  const topic = currentItem?.topic;
  const topicTitle = topic?.title || currentItem?.title || "Daily writing craft";
  const topicDescription =
    topic?.definition ||
    currentItem?.themeTitle ||
    "One focused practice step to keep your writing instincts awake.";

  return (
    <Card className="glow-card glow-border" hoverable={false}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-4 w-4 text-neon-cyan" />
          Skill Builder
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Build stronger writing instincts one step at a time
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[12px] bg-muted/25 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Today's Topic
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight">{topicTitle}</p>
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            {topicDescription}
          </p>
        </div>

        <Button
          type="button"
          className="w-full bg-neon-purple hover:bg-neon-purple/90"
          onClick={() => navigate("/skill-builder")}
        >
          Dive into Today's Topic
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default DailyLearningCard;
