import { cn } from "@/lib/utils";

interface PenMarkProps {
  alt?: string;
  className?: string;
  decorative?: boolean;
}

export function PenMark({
  alt = "WriterZ pen mark",
  className,
  decorative = true,
}: PenMarkProps) {
  return (
    <img
      src="/favicon.svg"
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? true : undefined}
      className={cn(className)}
    />
  );
}
