import { motion } from "framer-motion";
import { useAiAssistant } from "@/contexts/AiAssistantContext";
import { cn } from "@/lib/utils";
import { AiSparkIcon } from "./AiSparkIcon";

export const AiFloatingButton = () => {
  const { isOpen, toggleAssistant } = useAiAssistant();

  return (
    <motion.button
      type="button"
      onClick={toggleAssistant}
      aria-expanded={isOpen}
      aria-controls="writerz-ai-panel"
      aria-label={isOpen ? "Close WriterZ AI" : "Open WriterZ AI"}
      className={cn(
        "pointer-events-auto relative h-12 w-12 self-end overflow-hidden rounded-full border border-border bg-card text-neon-purple",
        "shadow-[0_12px_30px_hsl(var(--foreground)/0.08)] transition-[background-color,border-color,color,box-shadow] duration-150",
        "hover:bg-muted/55 hover:text-foreground",
        isOpen && "bg-secondary text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--neon-purple)/0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
    >
      <span className="relative flex h-full w-full items-center justify-center">
        <AiSparkIcon className="h-[18px] w-[18px]" />
      </span>
    </motion.button>
  );
};

export default AiFloatingButton;
