import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types/money";

const toneToVariant = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "destructive",
  neutral: "secondary",
} as const;

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Badge variant={toneToVariant[tone]} className={cn("capitalize", className)}>
      {Icon && <Icon className="size-3" />}
      {label}
    </Badge>
  );
}
