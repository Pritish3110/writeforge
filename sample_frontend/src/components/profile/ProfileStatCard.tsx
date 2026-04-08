import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileStatCardProps {
  className?: string;
  description: string;
  icon: LucideIcon;
  label: string;
  tone?: "cyan" | "pink" | "purple";
  value: string;
}

const toneClasses = {
  cyan: {
    border: "border-[hsl(var(--neon-cyan)/0.24)]",
    chip: "bg-[hsl(var(--neon-cyan)/0.12)] text-neon-cyan",
  },
  pink: {
    border: "border-[hsl(var(--neon-pink)/0.22)]",
    chip: "bg-[hsl(var(--neon-pink)/0.12)] text-neon-pink",
  },
  purple: {
    border: "border-[hsl(var(--neon-purple)/0.24)]",
    chip: "bg-[hsl(var(--neon-purple)/0.12)] text-neon-purple",
  },
};

export function ProfileStatCard({
  className,
  description,
  icon: Icon,
  label,
  tone = "purple",
  value,
}: ProfileStatCardProps) {
  const theme = toneClasses[tone];

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border bg-[linear-gradient(180deg,hsl(var(--card)/0.85),hsl(var(--background)/0.8))] p-5 shadow-[0_20px_60px_-35px_hsl(var(--foreground)/0.65)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_72px_-36px_hsl(var(--neon-purple)/0.45)]",
        theme.border,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", theme.chip)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
