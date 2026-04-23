import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const getScrollContainer = () =>
  (typeof document !== "undefined"
    ? document.querySelector("main")
    : null) as HTMLElement | null;

export const WritingScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scrollContainer = getScrollContainer();

    if (!scrollContainer) {
      return;
    }

    const updateVisibility = () => {
      setIsVisible(scrollContainer.scrollTop > 240);
    };

    updateVisibility();
    scrollContainer.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  const handleScrollToTop = () => {
    const scrollContainer = getScrollContainer();
    scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={handleScrollToTop}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-24 right-3 z-30 h-11 w-11 rounded-full border-border bg-card/92 shadow-sm backdrop-blur-sm transition-all duration-200 sm:bottom-24 sm:right-6",
        isVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
};

export default WritingScrollToTopButton;
