import { cn } from "@/lib/utils";
import { getPasswordStrength } from "@/lib/identity";

interface PasswordStrengthMeterProps {
  className?: string;
  password: string;
}

const segmentPalette = [
  "bg-border",
  "bg-destructive/80",
  "bg-muted-foreground/45",
  "bg-foreground/45",
  "bg-foreground/80",
];

export function PasswordStrengthMeter({
  className,
  password,
}: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const filledSegments = Math.max(0, Math.min(strength.score, 4));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-150",
              index < filledSegments ? segmentPalette[filledSegments] : "bg-border",
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/90">
          Strength: {strength.label}
        </span>
        <span>{strength.hint}</span>
      </div>
    </div>
  );
}
