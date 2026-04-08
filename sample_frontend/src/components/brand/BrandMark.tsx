import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

export function BrandMark({
  className,
  labelClassName,
  markClassName,
  showWordmark = true,
}: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card",
          markClassName,
        )}
      >
        <img src="/favicon.svg" alt="" aria-hidden="true" className="h-5 w-5 opacity-85" />
      </span>
      {showWordmark ? (
        <span className={cn("text-sm font-semibold tracking-[-0.02em] text-foreground", labelClassName)}>
          WriterZ
        </span>
      ) : null}
    </div>
  );
}
