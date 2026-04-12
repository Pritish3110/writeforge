import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface InlineStatProps {
  className?: string;
  detail?: string;
  label: string;
  value: string;
}

export function InlineStat({
  className,
  detail,
  label,
  value,
}: InlineStatProps) {
  return (
    <Card
      level="secondary"
      className={cn("flex min-h-[132px] flex-col justify-between p-4", className)}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-[-0.03em]">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </Card>
  );
}
