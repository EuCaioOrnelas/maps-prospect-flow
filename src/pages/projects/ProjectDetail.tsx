import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FolderKanban,
  ListTodo,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Timer,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useAccountRole } from "@/hooks/useAccountRole";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { TaskDialog } from "@/components/projects/TaskDialog";
import { StagesTasksTab, stageSummary } from "@/components/projects/StagesTasksTab";
import { ProjectFilesTab } from "@/components/projects/ProjectFilesTab";
import { OverdueBadge, PriorityBadge, ProgressCell, ProjectStatusBadge, StatusOption } from "@/components/projects/ProjectBadges";
import { MemberCell } from "@/components/projects/AssigneePicker";
import { LeadNotesChat } from "@/components/crm/LeadNotesChat";
import { useProjectComments } from "@/hooks/useTaskComments";
import {
  PROJECT_STATUS,
  TASK_STATUS,
  computeProgress,
  formatDateBR,
  friendlyDbError, deleteProjectCompletely,
  isProjectOverdue,
  isTaskOverdue,
  todayISO,
  type Project,
  type ProjectStage,
  type ProjectStatus,
  type ProjectTask,
} from "@/lib/projects";

const db = supabase as any;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { role } = useAccountRole();
  const { members } = useAccountMembers();
  const [tab, setTab] = useState(params.get("task") ? "tasks" : params.get("tab") === "chat" ? "chat" : "overview");
  const [editOpen, setEditOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: ProjectTask | null; stageId?: string | null }>({ open: false, task: null });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const chat = useProjectComments(tab === "chat" ? id : null, members);

  const project = useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("projects").select("*, leads(id, contact_name, company_name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as (Project & { leads: any }) | null;
    },
  });

  const structure = useQuery({
    queryKey: ["project-structure", id],
    enabled: !!id && !!project.data,
    queryFn: async () => {
      const [stages, tasks] = await Promise.all([
        db.from("project_stages").select("*").eq("project_id", id).order("position").order("created_at"),
        db.from("project_tasks").select("*").eq("project_id", id).order("due_date", { ascending: true, nullsFirst: false }).order("created_at"),
      ]);
      if (stages.error) throw stages.error;
      if (tasks.error) throw tasks.error;
      return { stages: stages.data as ProjectStage[], tasks: tasks.data as ProjectTask[] };
    },
  });

  const activity = useQuery({
    queryKey: ["project-activity", id],
    enabled: !!id && !!project.data,
    queryFn: async () => {
      const { data, error } = await db.from("project_activity").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  // Abrir tarefa direto pelo link da Agenda (?task=)
  const taskParam = params.get("task");
  useEffect(() => {
    if (!taskParam || !structure.data) return;
    const t = structure.data.tasks.find((x) => x.id === taskParam);
    if (t) setTaskDialog({ open: true, task: t });
    const next = new URLSearchParams(params);
    next.delete("task");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskParam, structure.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["project-structure", id] });
    qc.invalidateQueries({ queryKey: ["project-activity", id] });
    qc.invalidateQueries({ queryKey: ["projects-list"] });
    qc.invalidateQueries({ queryKey: ["projects-task-list"] });
    qc.invalidateQueries({ queryKey: ["projects-kpis"] });
    qc.invalidateQueries({ queryKey: ["projects-followup"] });
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
  };

  const memberName = (uid: string | null) => {
    if (!uid) return null;
    const m = members.find((x) => x.user_id === uid);
    return m?.name || m?.email || "Usuário";
  };

  const p = project.data;
  const tasks = structure.data?.tasks ?? [];
  const stages = structure.data?.stages ?? [];
  const today = todayISO();

  const stats = useMemo(() => {
    const valid = tasks.filter((t) => t.status !== "cancelled");
    const done = valid.filter((t) => t.status === "done").length;
    return {
      total: valid.length,
      done,
      pending: valid.length - done,
      late: tasks.filter((t) => isTaskOverdue(t, today)).length,
      pct: computeProgress(done, valid.length),
    };
  }, [tasks, today]);

  const update = async (patch: Partial<Project>, msg: string) => {
    if (!p) return;
    setBusy(true);
    const { error } = await db.from("projects").update(patch).eq("id", p.id);
    setBusy(false);
    if (error) return toast.error(friendlyDbError(error));
    toast.success(msg);
    refresh();
  };

  const doDelete = async () => {
    if (!p) return;
    setBusy(true);
    const { error } = await deleteProjectCompletely(p.id);
    setBusy(false);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Projeto excluído");
    qc.invalidateQueries({ queryKey: ["projects-list"] });
    navigate("/projects");
  };

  const shell = (children: React.ReactNode) => (
    <div className="relative min-h-screen bg-background">
      <BackgroundGlow />
      <SEO title={p?.name ? `${p.name} · Projetos` : "Projeto"} description="Detalhes do projeto, etapas, tarefas e entregas." />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />
      <main className="min-h-screen pt-[42px] lg:pl-[72px] lg:pt-0">{children}</main>
    </div>
  );

  if (project.isLoading) {
    return shell(
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>,
    );
  }

  if (project.isError || !p) {
    return shell(
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <FolderKanban className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{project.isError ? friendlyDbError(project.error) : "Projeto não encontrado ou sem permissão de acesso."}</p>
        <Button variant="outline" onClick={() => navigate("/projects")}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar para projetos</Button>
      </div>,
    );
  }

  const overdue = isProjectOverdue(p, today);
  const clientLabel = p.leads ? p.leads.company_name || p.leads.contact_name : p.client_name;
  const summary = stageSummary(stages, tasks);
  const upcoming = tasks.filter((t) => t.due_date && t.status !== "done" && t.status !== "cancelled").slice(0, 6);
  const canDelete = role === "owner" || role === "admin" || p.created_by === profile?.id;

  const ACTION: Record<string, (a: any) => string> = {
    project_created: () => "criou o projeto",
    status_changed: (a) => `alterou o status de ${PROJECT_STATUS[a.metadata.from as ProjectStatus]?.label ?? a.metadata.from} para ${PROJECT_STATUS[a.metadata.to as ProjectStatus]?.label ?? a.metadata.to}`,
    due_changed: (a) => `alterou o prazo de ${formatDateBR(a.metadata.from)} para ${formatDateBR(a.metadata.to)}`,
    responsible_changed: (a) => `alterou o responsável para ${memberName(a.metadata.to) ?? "ninguém"}`,
    archived: () => "arquivou o projeto",
    unarchived: () => "restaurou o projeto",
    task_created: (a) => `criou a tarefa “${a.metadata.title}”`,
    task_completed: (a) => `concluiu a tarefa “${a.metadata.title}”`,
    task_status_changed: (a) => `moveu “${a.metadata.title}” para ${TASK_STATUS[a.metadata.to as keyof typeof TASK_STATUS]?.label ?? a.metadata.to}`,
    task_assignee_changed: (a) => `atribuiu “${a.metadata.title}” a ${memberName(a.metadata.to) ?? "ninguém"}`,
    task_due_changed: (a) => `alterou o prazo de “${a.metadata.title}” para ${formatDateBR(a.metadata.to)}`,
    task_deleted: (a) => `excluiu a tarefa “${a.metadata.title}”`,
  };

  const ActivityList = ({ limit }: { limit?: number }) => {
    const rows = (activity.data ?? []).slice(0, limit);
    if (activity.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
    if (!rows.length) return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>;
    return (
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="flex gap-2.5 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0">
              <p><span className="font-medium">{memberName(a.actor_id) ?? "Sistema"}</span> {(ACTION[a.action_type] ?? (() => a.action_type))(a)}</p>
              <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return shell(
    <>
      <div className="border-b border-border/50">
        <div className="space-y-4 px-3 pb-5 pt-2 sm:p-4 lg:p-6">
          <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Projetos
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="shrink-0 rounded-xl bg-primary/10 p-2.5"><FolderKanban className="h-6 w-6 text-primary" /></div>
              <div className="min-w-0 space-y-2">
                <h1 className="break-words text-xl font-bold leading-tight lg:text-2xl">{p.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ProjectStatusBadge status={p.status} />
                  <PriorityBadge priority={p.priority} />
                  {overdue && <OverdueBadge />}
                  {p.archived_at && <span className="text-xs text-muted-foreground">· Arquivado</span>}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1.5 h-4 w-4" />Editar projeto</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="h-9 w-9" disabled={busy} aria-label="Mais ações">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {p.status !== "completed" && <DropdownMenuItem onClick={() => update({ status: "completed" }, "Projeto concluído")}><CheckCircle2 className="mr-2 h-4 w-4" />Concluir projeto</DropdownMenuItem>}
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Alterar status</DropdownMenuLabel>
                  {Object.entries(PROJECT_STATUS).map(([s, m]) => (
                    <DropdownMenuItem key={s} disabled={p.status === s} onClick={() => update({ status: s as ProjectStatus }, "Status atualizado")}><StatusOption label={m.label} dot={m.dot} /></DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {p.archived_at ? (
                    <DropdownMenuItem onClick={() => update({ archived_at: null }, "Projeto restaurado")}><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => update({ archived_at: new Date().toISOString() }, "Projeto arquivado")}><Archive className="mr-2 h-4 w-4" />Arquivar</DropdownMenuItem>
                  )}
                  {canDelete && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Faixa de informações */}
          <div className="grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCell label="Cliente">
              {clientLabel ? (
                p.lead_id ? (
                  <button type="button" onClick={() => navigate("/crm", { state: { openLeadId: p.lead_id } })} className="inline-flex max-w-full items-center gap-1 truncate hover:text-primary hover:underline">
                    <span className="truncate">{clientLabel}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                  </button>
                ) : <span className="truncate">{clientLabel}</span>
              ) : <span className="text-muted-foreground">Sem cliente</span>}
            </InfoCell>
            <InfoCell label="Responsável"><MemberCell members={members} userId={p.responsible_user_id} /></InfoCell>
            <InfoCell label="Período">
              <span className="inline-flex items-center gap-1.5 tabular-nums"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{formatDateBR(p.start_date)} → <span className={cn(overdue && "font-medium text-destructive")}>{formatDateBR(p.due_date)}</span></span>
            </InfoCell>
            <InfoCell label="Progresso"><ProgressCell done={stats.done} total={stats.total} className="w-full" /></InfoCell>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total de tarefas", value: stats.total, icon: ListTodo, tone: "bg-primary/[0.08] text-primary" },
            { label: "Concluídas", value: stats.done, icon: CheckCircle2, tone: "bg-success/10 text-success" },
            { label: "Pendentes", value: stats.pending, icon: Timer, tone: "bg-info/10 text-info" },
            { label: "Atrasadas", value: stats.late, icon: AlertTriangle, tone: stats.late > 0 ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground", alert: stats.late > 0 },
          ].map((c) => (
            <Card key={c.label} className={cn("flex items-center gap-3 border-border/50 p-4", c.alert && "border-destructive/40")}>
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", c.tone)}><c.icon className="h-[17px] w-[17px]" /></div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                {structure.isLoading ? <Skeleton className="mt-1 h-7 w-10" /> : <p className={cn("text-2xl font-bold leading-tight tabular-nums", c.alert && "text-destructive")}>{c.value}</p>}
              </div>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-10 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="tasks">Etapas e tarefas</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Chat do projeto</TabsTrigger>
            <TabsTrigger value="files">Arquivos</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <Card className="space-y-5 border-border/50 p-4 sm:p-5 lg:col-span-2">
                <div>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.description || "Sem descrição."}</p>
                  {p.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">{p.tags.map((t) => <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs">{t}</span>)}</div>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapas</h3>
                  {summary.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma etapa criada. <button type="button" className="text-primary hover:underline" onClick={() => setTab("tasks")}>Criar etapas</button></p>
                  ) : (
                    <ul className="space-y-2">
                      {summary.map((s, i) => (
                        <li key={s.stage.id} className="flex items-center gap-3">
                          <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                          <span className="min-w-0 flex-1 truncate text-sm">{s.stage.name}</span>
                          <ProgressCell done={s.done} total={s.total} className="w-44" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Próximas entregas</h3>
                  {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa com prazo pendente.</p> : (
                    <ul className="divide-y divide-border">
                      {upcoming.map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => setTaskDialog({ open: true, task: t })} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-primary">
                            <span className="truncate text-sm">{t.title}</span>
                            <span className={cn("shrink-0 text-xs tabular-nums", isTaskOverdue(t, today) ? "font-medium text-destructive" : "text-muted-foreground")}>{formatDateBR(t.due_date)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
              <Card className="border-border/50 p-4 sm:p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Atividades recentes</h3>
                <ActivityList limit={8} />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            {structure.isLoading ? <Skeleton className="h-64 w-full" /> : structure.isError ? (
              <Card className="p-6 text-sm text-destructive">{friendlyDbError(structure.error)}</Card>
            ) : (
              <StagesTasksTab
                projectId={p.id}
                stages={stages}
                tasks={tasks}
                members={members}
                onChanged={refresh}
                onOpenTask={(task, stageId) => setTaskDialog({ open: true, task, stageId })}
              />
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card className="overflow-hidden border-border/50">
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                <div className="rounded-lg bg-primary/10 p-2"><MessageSquare className="h-4 w-4 text-primary" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Chat interno do projeto</p>
                  <p className="text-xs text-muted-foreground">Converse com a equipe sobre o projeto. O responsável e quem participa são avisados no sininho.</p>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <LeadNotesChat
                  controller={chat}
                  heightClass="h-[480px]"
                  placeholder="Escreva uma mensagem para a equipe do projeto..."
                  emptyHint="Nenhuma mensagem ainda. Comece a conversa sobre este projeto."
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-4"><ProjectFilesTab projectId={p.id} /></TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="border-border/50 p-4 sm:p-5"><ActivityList /></Card>
          </TabsContent>
        </Tabs>
      </div>

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={p} onSaved={refresh} />
      <TaskDialog
        open={taskDialog.open}
        onOpenChange={(o) => setTaskDialog((d) => ({ ...d, open: o }))}
        projectId={p.id}
        task={taskDialog.task}
        defaultStageId={taskDialog.stageId}
        stages={stages}
        members={members}
        onSaved={refresh}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>Etapas, tarefas, checklists, conversas das tarefas, histórico e todos os arquivos enviados serão apagados, e os prazos saem da Agenda. <strong className="text-foreground">Depois de excluir, não dá para recuperar.</strong> Para só tirar da lista, use “Arquivar”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card px-4 py-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex min-h-6 items-center text-sm">{children}</div>
    </div>
  );
}
