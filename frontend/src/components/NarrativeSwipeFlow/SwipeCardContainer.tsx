import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NarrativeSwipeCard from "./NarrativeSwipeCard";
import ProgressIndicator from "./ProgressIndicator";
import type { GuidedFieldDefinition } from "@/pages/CharacterLab";

interface SwipeCardContainerProps {
  definitions: GuidedFieldDefinition[];
  getValue: (key: string) => string;
  onChange: (key: string, value: string) => void;
  getExampleIndex: (key: string, total: number) => number;
  onCycleExample: (key: string, total: number, direction: 1 | -1) => void;
  onComplete?: () => void;
}

type SlideDirection = "next" | "prev";

const SwipeCardContainer = ({
  definitions,
  getValue,
  onChange,
  getExampleIndex,
  onCycleExample,
  onComplete,
}: SwipeCardContainerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("next");
  const [hasNavigatedCards, setHasNavigatedCards] = useState(false);

  const currentDefinition = definitions[currentIndex];
  const isFirstCard = currentIndex === 0;
  const isLastCard = currentIndex === definitions.length - 1;

  const handleNext = useCallback(() => {
    if (!isLastCard) {
      setHasNavigatedCards(true);
      setSlideDirection("next");
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastCard]);

  const handlePrevious = useCallback(() => {
    if (!isFirstCard) {
      setHasNavigatedCards(true);
      setSlideDirection("prev");
      setCurrentIndex((prev) => prev - 1);
    }
  }, [isFirstCard]);

  const handleAdvance = useCallback(() => {
    if (isLastCard) {
      onComplete?.();
      return;
    }
    handleNext();
  }, [handleNext, isLastCard, onComplete]);

  const slideVariants = {
    enter: (direction: SlideDirection) => ({
      x: direction === "next" ? 56 : -56,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: SlideDirection) => ({
      zIndex: 0,
      x: direction === "next" ? -56 : 56,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full space-y-4">
      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={currentIndex + 1}
        totalSteps={definitions.length}
        stepLabel={currentDefinition.label}
      />

      {/* Card Container */}
      <div className="relative h-[clamp(320px,42vh,420px)] w-full">
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentIndex}
            custom={slideDirection}
            variants={slideVariants}
            initial={hasNavigatedCards ? "enter" : false}
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 0.2, ease: "easeOut" },
              opacity: { duration: 0.2, ease: "linear" },
            }}
            className="absolute inset-0 px-3 md:px-4"
          >
            <NarrativeSwipeCard
              definition={currentDefinition}
              value={getValue(currentDefinition.key)}
              onChange={(value) => onChange(currentDefinition.key, value)}
              exampleIndex={getExampleIndex(currentDefinition.key, currentDefinition.examples.length)}
              onPreviousExample={() => onCycleExample(currentDefinition.key, currentDefinition.examples.length, -1)}
              onNextExample={() => onCycleExample(currentDefinition.key, currentDefinition.examples.length, 1)}
              onPreviousStep={handlePrevious}
              onNextStep={handleAdvance}
              isFirstStep={isFirstCard}
              isLastStep={isLastCard}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SwipeCardContainer;
