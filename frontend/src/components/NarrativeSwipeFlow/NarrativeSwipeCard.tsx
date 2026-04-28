import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import InlineExamplePanel from "./InlineExamplePanel";
import type { GuidedFieldDefinition } from "@/pages/CharacterLab";

interface NarrativeSwipeCardProps {
  definition: GuidedFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  exampleIndex: number;
  onPreviousExample: () => void;
  onNextExample: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const NarrativeSwipeCard = ({
  definition,
  value,
  onChange,
  exampleIndex,
  onPreviousExample,
  onNextExample,
  onPreviousStep,
  onNextStep,
  isFirstStep,
  isLastStep,
}: NarrativeSwipeCardProps) => {
  return (
    <motion.div
      className="relative h-full w-full"
      layout
    >
      <section className="relative h-full rounded-[20px] border border-foreground/12 bg-card/[0.1] px-3 pt-3 pb-2.5 md:px-4 md:pt-4 md:pb-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPreviousStep}
          disabled={isFirstStep}
          aria-label="Previous card"
          className="absolute left-0 top-1/2 z-30 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-foreground/25 bg-background/95 p-0 shadow-md hover:bg-background"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNextStep}
          disabled={isLastStep}
          aria-label="Next card"
          className="absolute right-0 top-1/2 z-30 h-8 w-8 translate-x-1/2 -translate-y-1/2 rounded-full border-foreground/25 bg-background/95 p-0 shadow-md hover:bg-background"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="grid h-full grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-4">
          <div className="flex min-h-0 flex-col rounded-[16px] border border-foreground/12 bg-card/[0.08] px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-3.5">
            <div className="mb-2.5 flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-[1.55rem] font-semibold text-foreground">{definition.label}</h2>
              </div>
            </div>

            <div className="mb-3 space-y-1.5">
              {definition.guidance.map((line, idx) => (
                <p key={idx} className="text-sm leading-6 text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>

            <Label htmlFor={`narrative-${definition.key}`} className="sr-only">
              {definition.label}
            </Label>
            <Textarea
              id={`narrative-${definition.key}`}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={definition.placeholder}
              className={cn(
                "flex-1 resize-none rounded-[14px] border border-foreground/15 bg-card/[0.12] px-4 py-3.5 text-[15px] leading-7 shadow-none placeholder:text-muted-foreground/60 focus-visible:border-foreground/25 focus-visible:bg-card/[0.16]",
                "min-h-[145px] md:min-h-[170px]"
              )}
            />

            <div className="mt-1.5 flex justify-end text-xs text-muted-foreground/70">
              {value.trim().length}/{definition.suggestedMax}
            </div>
          </div>

          <div className="flex min-h-0 flex-col px-1 py-1 md:px-1.5">
            <InlineExamplePanel
              definition={definition}
              exampleIndex={exampleIndex}
              onPreviousExample={onPreviousExample}
              onNextExample={onNextExample}
            />
          </div>
        </div>
      </section>

    </motion.div>
  );
};

export default NarrativeSwipeCard;
