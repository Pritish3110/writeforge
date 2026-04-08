import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const AiSparkIcon = ({
  className,
}: {
  className?: string;
}) => (
  <Sparkles className={cn("h-5 w-5", className)} strokeWidth={1.8} />
);

export default AiSparkIcon;
