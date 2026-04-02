import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

const EXIT_DURATION_MS = 300;
const TOTAL_DURATION_MS = 2000;
const WIDE_SCREEN_QUERY = "(min-aspect-ratio: 16/10)";

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [isComplete, setIsComplete] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(false);

  useEffect(() => {
    const completeTimer = window.setTimeout(() => {
      setIsComplete(true);
    }, TOTAL_DURATION_MS);

    const finishTimer = window.setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION_MS + EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(completeTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onComplete]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(WIDE_SCREEN_QUERY);
    const updateAspectRatio = () => setIsWideScreen(mediaQuery.matches);

    updateAspectRatio();
    mediaQuery.addEventListener("change", updateAspectRatio);

    return () => {
      mediaQuery.removeEventListener("change", updateAspectRatio);
    };
  }, []);

  const logoSizeClass = isWideScreen
    ? "h-[clamp(6.5rem,18vmin,10rem)] w-[clamp(6.5rem,18vmin,10rem)]"
    : "h-[clamp(5.5rem,16vmin,8rem)] w-[clamp(5.5rem,16vmin,8rem)]";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={{ opacity: isComplete ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          className={`relative flex items-center justify-center ${logoSizeClass}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: 1,
            scale: isComplete ? 1 : [1, 1.05, 1],
          }}
          transition={{
            opacity: { duration: 0.8, ease: "easeOut" },
            scale: {
              duration: 1.3,
              ease: "easeInOut",
              times: [0, 0.6, 1],
            },
          }}
          style={{
            filter: "drop-shadow(0 0 12px rgba(6,182,212,0.6))",
          }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-label="WriteForge loading logo" role="img">
            <motion.polygon
              points="50,10 85,30 85,70 50,90 15,70 15,30"
              fill="none"
              stroke="hsl(var(--neon-purple))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.8 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              style={{
                filter: "drop-shadow(0 0 10px rgba(168,85,247,0.75))",
              }}
            />
            <motion.text
              x="50"
              y="58"
              textAnchor="middle"
              fill="hsl(var(--neon-purple))"
              fontFamily="Inter, sans-serif"
              fontSize="16"
              fontWeight="600"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65, duration: 0.45, ease: "easeOut" }}
              style={{
                filter: "drop-shadow(0 0 6px rgba(168,85,247,0.9))",
                letterSpacing: "0.18em",
                transformOrigin: "50% 50%",
              }}
            >
              WF
            </motion.text>
          </svg>
        </motion.div>

        <motion.p
          className="mt-[clamp(1.25rem,3.5vmin,2.25rem)] max-w-[20rem] text-center font-mono text-[0.72rem] uppercase tracking-[0.34em] text-muted-foreground sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isComplete ? 0 : [0.5, 1, 0.5],
          }}
          transition={{
            delay: 0.8,
            duration: 0.9,
            ease: "easeInOut",
            repeat: isComplete ? 0 : Infinity,
          }}
        >
          Loading WriteForge...
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
