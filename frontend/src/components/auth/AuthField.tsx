import { useState, type ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends ComponentPropsWithoutRef<"input"> {
  error?: string | null;
  hint?: string | null;
  icon?: LucideIcon;
  inputClassName?: string;
  label: string;
  successMessage?: string | null;
}

export function AuthField({
  className,
  error,
  hint,
  icon: Icon,
  id,
  inputClassName,
  label,
  successMessage,
  type,
  ...props
}: AuthFieldProps) {
  const describedBy = id ? `${id}-description` : undefined;
  const hasSuccess = !error && Boolean(successMessage);
  const isPasswordField = type === "password";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      <Label
        htmlFor={id}
        className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground"
      >
        {label}
      </Label>
      <div className="group relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-foreground" />
        ) : null}
        <Input
          id={id}
          type={isPasswordField ? (isPasswordVisible ? "text" : "password") : type}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 pl-8 pr-10 text-sm leading-5 placeholder:text-muted-foreground/90 focus-visible:border-foreground/18 focus-visible:ring-0",
            error &&
              "border-destructive/60 focus-visible:border-destructive/60",
            hasSuccess && "border-foreground/18",
            inputClassName,
          )}
          {...props}
        />
        {isPasswordField ? (
          <button
            type="button"
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((current) => !current)}
            className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : error ? (
          <AlertCircle className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
        ) : hasSuccess ? (
          <CheckCircle2 className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
      </div>
      <div
        id={describedBy}
        className={cn(
          "min-h-[1.25rem] text-xs leading-5",
          error ? "text-destructive" : "text-muted-foreground",
          hasSuccess && "text-foreground/80",
        )}
      >
        {error || successMessage || hint || "\u00A0"}
      </div>
    </div>
  );
}
