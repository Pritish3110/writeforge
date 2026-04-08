import { AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useAiAssistant } from "@/contexts/AiAssistantContext";
import AiChatPanel from "./AiChatPanel";
import AiFloatingButton from "./AiFloatingButton";

export const GlobalAiAssistant = () => {
  const { isOpen } = useAiAssistant();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex flex-col items-stretch gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end">
      <AnimatePresence>{isOpen ? <AiChatPanel /> : null}</AnimatePresence>
      <AiFloatingButton />
    </div>,
    document.body,
  );
};

export default GlobalAiAssistant;
