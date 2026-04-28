import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GuidedFieldDefinition } from "@/pages/CharacterLab";

interface InlineExamplePanelProps {
  definition: GuidedFieldDefinition;
  exampleIndex: number;
  onPreviousExample: () => void;
  onNextExample: () => void;
}

const InlineExamplePanel = ({
  definition,
  exampleIndex,
  onPreviousExample,
  onNextExample,
}: InlineExamplePanelProps) => {
  const currentExample = definition.examples[exampleIndex] ?? definition.examples[0];
  const isFirstExample = exampleIndex === 0;
  const isLastExample = exampleIndex >= definition.examples.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col p-2 md:p-3">
      {/* Example Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Example</p>
          <p className="text-xs text-muted-foreground">{definition.label}</p>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {exampleIndex + 1} / {definition.examples.length}
        </p>
      </div>

      {/* Example Text */}
      <p className="mb-3 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-foreground/80">
        {currentExample}
      </p>

      {/* Navigation */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onPreviousExample}
          disabled={isFirstExample}
          aria-label={`Previous ${definition.label} example`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={onNextExample}
          disabled={isLastExample}
          aria-label={`Next ${definition.label} example`}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InlineExamplePanel;
