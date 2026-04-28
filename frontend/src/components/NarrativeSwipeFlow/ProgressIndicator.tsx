import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

const ProgressIndicator = ({ currentStep, totalSteps, stepLabel }: ProgressIndicatorProps) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-2">
      {/* Step Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-sm text-muted-foreground">{stepLabel}</p>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-card/[0.2]">
        <motion.div
          initial={false}
          animate={{
            width: `${progressPercentage}%`,
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
          className="h-full bg-primary"
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;
