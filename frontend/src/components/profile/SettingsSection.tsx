import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SettingsSectionProps {
  children: ReactNode;
  description?: string;
  icon: LucideIcon;
  title: string;
}

export function SettingsSection({
  children,
  description,
  icon: Icon,
  title,
}: SettingsSectionProps) {
  return (
    <Card level="primary" className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
