import { CheckCircle2, Clock, XCircle, PauseCircle, HelpCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/metaTemplates";

const TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

function iconFor(status: string) {
  switch (status) {
    case "APPROVED": return CheckCircle2;
    case "PENDING":
    case "IN_APPEAL": return Clock;
    case "REJECTED":
    case "DISABLED":
    case "LIMIT_EXCEEDED": return XCircle;
    case "PAUSED": return PauseCircle;
    case "DELETED":
    case "PENDING_DELETION": return Trash2;
    default: return HelpCircle;
  }
}

export function TemplateStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  const Icon = iconFor(status);
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[meta.tone],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
