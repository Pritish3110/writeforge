import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackdropProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AuroraBackdrop({
  children,
  className,
  contentClassName,
}: AuroraBackdropProps) {
  return (
    <div className={cn("relative overflow-hidden bg-background", className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(var(--border)/0.65)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.65)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle,hsl(var(--foreground))_0.8px,transparent_0.8px)] [background-size:18px_18px]" />
      <div className={cn("relative", contentClassName)}>{children}</div>
    </div>
  );
}
