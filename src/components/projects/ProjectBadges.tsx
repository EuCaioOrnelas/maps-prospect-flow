import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OVERDUE_CLASS,
  PRIORITY,
  PROJECT_STATUS,
  TASK_STATUS,
  computeProgress,
  type ProjectPriority,
  type ProjectStatus,
  type TaskStatus,
} from "@/lib/projects";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const m = PROJECT_STATUS[status] ?? PROJECT_STATUS.planning;
  return <Badge variant="outline" className={cn("h-6 gap-1.5 whitespace-nowrap text-[11px] font-medium", m.className)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />{m.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const m = TASK_STATUS[status] ?? TASK_STATUS.todo;
  return <Badge variant="outline" className={cn("h-6 gap-1.5 whitespace-nowrap text-[11px] font-medium", m.className)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />{m.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  const m = PRIORITY[priority] ?? PRIORITY.medium;
  return <Badge variant="outline" className={cn("h-6 gap-1.5 whitespace-nowrap text-[11px] font-medium", m.className)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />{m.label}</Badge>;
}

export function OverdueBadge() {
  return <Badge variant="outline" className={cn("h-6 whitespace-nowrap text-[11px] font-medium", OVERDUE_CLASS)}>Atrasado</Badge>;
}

export function ProgressCell({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = computeProgress(done, total);
  if (pct === null) return <span className={cn("text-xs text-muted-foreground", className)}>Sem tarefas</span>;
  return (
    <div className={cn("flex min-w-[110px] items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

/** Bolinha colorida + rótulo, para usar dentro de listas de seleção. */
export function StatusOption({ label, dot }: { label: string; dot: string }) {
  return <span className="flex items-center gap-2"><span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />{label}</span>;
}
