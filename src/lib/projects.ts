/**
 * Regras e rótulos centrais do módulo de Projetos.
 * Os contadores (tasks_total/tasks_done/tasks_open) são mantidos pelo banco.
 */

export type ProjectStatus = "planning" | "in_progress" | "review" | "completed" | "paused" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";

export interface Project {
  id: string;
  owner_user_id: string;
  lead_id: string | null;
  client_name: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  responsible_user_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  tags: string[];
  tasks_total: number;
  tasks_done: number;
  tasks_open: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  position: number;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: ProjectPriority;
  assignee_id: string | null;
  due_date: string | null;
  /** Horário opcional (HH:MM:SS). Sem horário = vencimento do dia todo, não ocupa a Agenda. */
  due_time?: string | null;
  duration_minutes?: number;
  completed_at: string | null;
  position: number;
  checklist_total: number;
  checklist_done: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

interface Meta { label: string; className: string; dot: string }

const TONE = {
  slate: { className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  info: { className: "bg-info/10 text-info border-info/25", dot: "bg-info" },
  review: { className: "bg-review/10 text-review border-review/25", dot: "bg-review" },
  success: { className: "bg-success/10 text-success border-success/25", dot: "bg-success" },
  warning: { className: "bg-warning/15 text-warning border-warning/30", dot: "bg-warning" },
  danger: { className: "bg-destructive/10 text-destructive border-destructive/25", dot: "bg-destructive" },
};

export const PROJECT_STATUS: Record<ProjectStatus, Meta> = {
  planning: { label: "Planejamento", ...TONE.slate },
  in_progress: { label: "Em andamento", ...TONE.info },
  review: { label: "Em revisão", ...TONE.review },
  completed: { label: "Concluído", ...TONE.success },
  paused: { label: "Pausado", ...TONE.warning },
  cancelled: { label: "Cancelado", ...TONE.danger },
};

export const TASK_STATUS: Record<TaskStatus, Meta> = {
  todo: { label: "A fazer", ...TONE.slate },
  in_progress: { label: "Em andamento", ...TONE.info },
  review: { label: "Em revisão", ...TONE.review },
  done: { label: "Concluída", ...TONE.success },
  cancelled: { label: "Cancelada", ...TONE.danger },
};

export const PRIORITY: Record<ProjectPriority, Meta & { rank: number }> = {
  low: { label: "Baixa", ...TONE.slate, rank: 1 },
  medium: { label: "Média", ...TONE.info, rank: 2 },
  high: { label: "Alta", ...TONE.warning, rank: 3 },
  urgent: { label: "Urgente", ...TONE.danger, rank: 4 },
};

export const OVERDUE_CLASS = "bg-destructive/10 text-destructive border-destructive/30";

/** Data de hoje (AAAA-MM-DD) no fuso da Wiize. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

/** Progresso em %, ou null quando ainda não há tarefas (canceladas não contam). */
export function computeProgress(done: number, total: number): number | null {
  if (!total || total <= 0) return null;
  return Math.round((Math.min(done, total) / total) * 100);
}

/** Projeto atrasado: não concluído/cancelado/arquivado e com prazo antes de hoje. */
export function isProjectOverdue(
  p: Pick<Project, "status" | "due_date" | "archived_at">,
  today: string = todayISO(),
): boolean {
  if (!p.due_date || p.archived_at) return false;
  if (p.status === "completed" || p.status === "cancelled") return false;
  return p.due_date < today;
}

export function isTaskOverdue(t: Pick<ProjectTask, "status" | "due_date">, today: string = todayISO()): boolean {
  if (!t.due_date) return false;
  if (t.status === "done" || t.status === "cancelled") return false;
  return t.due_date < today;
}

/** Valida o formulário do projeto; retorna erros por campo. */
export function validateProjectForm(v: { name: string; start_date?: string | null; due_date?: string | null }) {
  const errors: Record<string, string> = {};
  if (!v.name || !v.name.trim()) errors.name = "Informe o nome do projeto.";
  if (v.start_date && v.due_date && v.due_date < v.start_date) {
    errors.due_date = "O prazo final não pode ser antes da data de início.";
  }
  return errors;
}

export function formatDateBR(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function friendlyDbError(error: unknown): string {
  const msg = (error as { message?: string })?.message || "";
  if ((error as { code?: string })?.code === "23P01" || msg.includes("calendar_events_no_overlap"))
    return "Esse horário já está ocupado na Agenda do responsável. Escolha outro horário ou deixe sem horário (dia todo).";
  if (msg.includes("projects_dates_check")) return "O prazo final não pode ser antes da data de início.";
  if (msg.includes("não pertence") || msg.includes("inválida")) return msg;
  if (msg.includes("row-level security") || (error as { code?: string })?.code === "42501")
    return "Você não tem permissão para esta ação.";
  if ((error as { code?: string })?.code === "42P01") return "O módulo de Projetos ainda não foi ativado no banco.";
  return msg || "Não foi possível concluir. Tente novamente.";
}

/**
 * Exclui o projeto por completo: primeiro os arquivos guardados, depois o
 * projeto (etapas, tarefas, checklist, conversas, histórico e prazos da Agenda
 * saem junto pelo banco). Não há como recuperar.
 */
export async function deleteProjectCompletely(projectId: string): Promise<{ error: unknown | null }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const db = supabase as any;
  const paths = new Set<string>();
  const { data: rows } = await db.from("project_files").select("storage_path").eq("project_id", projectId);
  (rows || []).forEach((r: { storage_path: string }) => r.storage_path && paths.add(r.storage_path));
  const { data: listed } = await supabase.storage.from("project-files").list(projectId, { limit: 1000 });
  (listed || []).forEach((f) => f.name && paths.add(`${projectId}/${f.name}`));
  const all = [...paths];
  for (let i = 0; i < all.length; i += 100) {
    const { error } = await supabase.storage.from("project-files").remove(all.slice(i, i + 100));
    if (error) return { error: new Error("Não foi possível apagar os arquivos do projeto. Nada foi excluído; tente novamente.") };
  }
  const { error } = await db.from("projects").delete().eq("id", projectId);
  return { error };
}
