import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderKanban,
  ListTodo,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { OverdueBadge, PriorityBadge, ProgressCell, ProjectStatusBadge } from "@/components/projects/ProjectBadges";
import {
  PRIORITY,
  PROJECT_STATUS,
  formatDateBR,
  friendlyDbError,
  isProjectOverdue,
  todayISO,
  type Project,
  type ProjectStatus,
} from "@/lib/projects";

const db = supabase as any;
const PAGE_SIZES = [10, 25, 50];
const OPEN_STATUSES = ["planning", "in_progress", "review", "paused"];

type Sort = "due_asc" | "created_desc" | "name_asc" | "priority_desc";

const ACTIVITY_LABEL: Record<string, string> = {
  project_created: "Projeto criado",
  status_changed: "Status alterado",
  due_changed: "Prazo alterado",
  responsible_changed: "Responsável alterado",
  archived: "Projeto arquivado",
  unarchived: "Projeto restaurado",
  task_created: "Tarefa criada",
  task_completed: "Tarefa concluída",
  task_status_changed: "Status de tarefa alterado",
  task_assignee_changed: "Responsável de tarefa alterado",
  task_due_changed: "Prazo de tarefa alterado",
  task_deleted: "Tarefa excluída",
};

export default function ProjectsPage() {
  const { profile } = useAuth();
  const { role } = useAccountRole();
  const { members } = useAccountMembers();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const today = todayISO();

  // Filtros (preservados na URL para manter ao navegar)
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const priority = params.get("priority") ?? "all";
  const responsible = params.get("resp") ?? "all";
  const dueFrom = params.get("from") ?? "";
  const dueTo = params.get("to") ?? "";
  const overdueOnly = params.get("overdue") === "1";
  const showArchived = params.get("archived") === "1";
  const sort = (params.get("sort") as Sort) || "due_asc";
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = PAGE_SIZES.includes(Number(params.get("size"))) ? Number(params.get("size")) : 10;

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  const setParam = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => (v === null || v === "" || v === "all" ? next.delete(k) : next.set(k, v)));
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) setParam({ q: searchInput.trim() || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasFilters = !!(search || status !== "all" || priority !== "all" || responsible !== "all" || dueFrom || dueTo || overdueOnly || showArchived);
  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  // Formulário
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [defaultLead, setDefaultLead] = useState<string | null>(null);
  useEffect(() => {
    if (location.pathname === "/projects/new") {
      setEditing(null);
      setDefaultLead(params.get("lead"));
      setFormOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const memberName = (id: string | null) => {
    if (!id) return null;
    const m = members.find((x) => x.user_id === id);
    return m?.name || m?.email || "Usuário";
  };

  // ===== Indicadores =====
  const kpis = useQuery({
    queryKey: ["projects-kpis"],
    queryFn: async () => {
      const base = () => db.from("projects").select("id", { count: "exact", head: true }).is("archived_at", null);
      const [total, active, done, late, tasks, ...byStatus] = await Promise.all([
        base(),
        base().in("status", OPEN_STATUSES),
        base().eq("status", "completed"),
        base().in("status", OPEN_STATUSES).lt("due_date", today),
        db
          .from("project_tasks")
          .select("id, projects!inner(archived_at)", { count: "exact", head: true })
          .not("status", "in", "(done,cancelled)")
          .is("projects.archived_at", null),
        ...Object.keys(PROJECT_STATUS).map((s) => base().eq("status", s)),
      ]);
      const err = [total, active, done, late, tasks].find((r: any) => r.error);
      if (err) throw err.error;
      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        done: done.count ?? 0,
        late: late.count ?? 0,
        tasks: tasks.count ?? 0,
        byStatus: Object.keys(PROJECT_STATUS).map((s, i) => ({ status: s as ProjectStatus, count: byStatus[i]?.count ?? 0 })),
      };
    },
  });

  const followUp = useQuery({
    queryKey: ["projects-followup"],
    queryFn: async () => {
      const in14 = new Date(Date.now() + 14 * 86400000);
      const limit14 = todayISO(in14);
      const [upcoming, late, activity, tasksSoon] = await Promise.all([
        db.from("projects").select("id, name, client_name, due_date, status, tasks_done, tasks_total").is("archived_at", null)
          .in("status", OPEN_STATUSES).gte("due_date", today).lte("due_date", limit14).order("due_date").limit(5),
        db.from("projects").select("id, name, client_name, due_date, status").is("archived_at", null)
          .in("status", OPEN_STATUSES).lt("due_date", today).order("due_date").limit(5),
        db.from("project_activity").select("id, action_type, metadata, created_at, actor_id, project_id, projects(name)")
          .order("created_at", { ascending: false }).limit(8),
        db.from("project_tasks").select("id, title, due_date, project_id, projects!inner(name, archived_at)")
          .not("status", "in", "(done,cancelled)").is("projects.archived_at", null).gte("due_date", today)
          .order("due_date").limit(5),
      ]);
      return {
        upcoming: upcoming.data ?? [],
        late: late.data ?? [],
        activity: activity.data ?? [],
        tasksSoon: tasksSoon.data ?? [],
      };
    },
  });

  // ===== Listagem paginada no servidor =====
  const listKey = ["projects-list", search, status, priority, responsible, dueFrom, dueTo, overdueOnly, showArchived, sort, page, pageSize];
  const list = useQuery({
    queryKey: listKey,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      let q = db.from("projects").select("*, leads(id, contact_name, company_name)", { count: "exact" });
      q = showArchived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
      const term = search.replace(/[%,()]/g, "").trim();
      if (term) q = q.or(`name.ilike.%${term}%,client_name.ilike.%${term}%`);
      if (status !== "all") q = q.eq("status", status);
      if (priority !== "all") q = q.eq("priority", priority);
      if (responsible !== "all") q = responsible === "none" ? q.is("responsible_user_id", null) : q.eq("responsible_user_id", responsible);
      if (dueFrom) q = q.gte("due_date", dueFrom);
      if (dueTo) q = q.lte("due_date", dueTo);
      if (overdueOnly) q = q.in("status", OPEN_STATUSES).lt("due_date", today);
      if (sort === "due_asc") q = q.order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
      if (sort === "created_desc") q = q.order("created_at", { ascending: false });
      if (sort === "name_asc") q = q.order("name", { ascending: true });
      if (sort === "priority_desc") q = q.order("priority_rank", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false });
      const from = (page - 1) * pageSize;
      const { data, count, error } = await q.range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data || []) as (Project & { leads: any })[], count: count ?? 0 };
    },
  });

  const totalCount = list.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  useEffect(() => {
    if (!list.isFetching && page > totalPages) setParam({ page: String(totalPages) }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["projects-list"] });
    queryClient.invalidateQueries({ queryKey: ["projects-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["projects-followup"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
  };

  // ===== Ações =====
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const canDelete = (p: Project) => role === "owner" || role === "admin" || p.created_by === profile?.id;

  const runUpdate = async (p: Project, patch: Partial<Project>, msg: string) => {
    setBusyId(p.id);
    const { error } = await db.from("projects").update(patch).eq("id", p.id);
    setBusyId(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success(msg);
    refreshAll();
  };

  const duplicate = async (p: Project) => {
    setBusyId(p.id);
    try {
      const { data: copy, error } = await db
        .from("projects")
        .insert({
          owner_user_id: p.owner_user_id,
          created_by: profile?.id,
          name: `${p.name} (cópia)`.slice(0, 120),
          description: p.description,
          lead_id: p.lead_id,
          responsible_user_id: p.responsible_user_id,
          priority: p.priority,
          status: "planning",
          start_date: p.start_date,
          due_date: p.due_date,
          tags: p.tags,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Copia apenas a estrutura de etapas (tarefas ficam de fora para não duplicar prazos na Agenda).
      const { data: stages } = await db.from("project_stages").select("name, description, position").eq("project_id", p.id);
      if (stages?.length) {
        const { error: e2 } = await db.from("project_stages").insert(stages.map((s: any) => ({ ...s, project_id: copy.id })));
        if (e2) throw e2;
      }
      toast.success("Projeto duplicado (etapas copiadas)");
      navigate(`/projects/${copy.id}`);
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    const { error } = await db.from("projects").delete().eq("id", toDelete.id);
    setBusyId(null);
    setToDelete(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Projeto excluído");
    refreshAll();
  };

  const openLead = (leadId: string) => navigate("/crm", { state: { openLeadId: leadId } });

  const k = kpis.data;
  const kpiCards = [
    { key: "total", label: "Total de projetos", value: k?.total, icon: FolderKanban, onClick: () => clearFilters() },
    { key: "active", label: "Em andamento", value: k?.active, icon: Timer, onClick: () => setParam({ status: "in_progress", overdue: null, archived: null }) },
    { key: "done", label: "Concluídos", value: k?.done, icon: CheckCircle2, onClick: () => setParam({ status: "completed", overdue: null, archived: null }) },
    { key: "late", label: "Atrasados", value: k?.late, icon: AlertTriangle, onClick: () => setParam({ overdue: "1", status: null, archived: null }), alert: (k?.late ?? 0) > 0 },
    { key: "tasks", label: "Tarefas pendentes", value: k?.tasks, icon: ListTodo },
  ];

  const statusMax = useMemo(() => Math.max(1, ...(k?.byStatus ?? []).map((s) => s.count)), [k]);

  return (
    <div className="relative min-h-screen bg-background">
      <BackgroundGlow />
      <SEO title="Projetos" description="Gerencie projetos, acompanhe entregas e mantenha sua equipe alinhada." />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="min-h-screen pt-[42px] lg:pl-[72px] lg:pt-0">
        <div className="border-b border-border/50">
          <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2 sm:p-4 lg:p-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 sm:p-2">
                <FolderKanban className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold sm:text-xl lg:text-2xl">Projetos</h1>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  Gerencie projetos, acompanhe entregas e mantenha sua equipe alinhada em um só lugar.
                </p>
              </div>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => { setEditing(null); setDefaultLead(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Novo projeto</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-3 sm:p-4 lg:p-6">
          {/* Indicadores */}
          {kpis.isError ? (
            <Card className="p-4 text-sm text-destructive">{friendlyDbError(kpis.error)}</Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {kpiCards.map((c) => (
                <Card
                  key={c.key}
                  role={c.onClick ? "button" : undefined}
                  tabIndex={c.onClick ? 0 : undefined}
                  onClick={c.onClick}
                  onKeyDown={(e) => c.onClick && (e.key === "Enter" || e.key === " ") && c.onClick()}
                  className={cn("p-4 transition-colors", c.onClick && "cursor-pointer hover:border-primary/40")}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                    <c.icon className={cn("h-4 w-4", c.alert ? "text-destructive" : "text-muted-foreground")} />
                  </div>
                  {kpis.isLoading ? (
                    <Skeleton className="mt-2 h-8 w-14" />
                  ) : (
                    <p className={cn("mt-1 text-2xl font-bold tabular-nums", c.alert && "text-destructive")}>{c.value ?? 0}</p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Acompanhamento */}
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Entregas nos próximos 14 dias</h2>
              <FollowList
                loading={followUp.isLoading}
                empty="Nenhuma entrega próxima."
                items={(followUp.data?.upcoming ?? []).map((p: any) => ({ id: p.id, title: p.name, sub: p.client_name, date: p.due_date, href: `/projects/${p.id}` }))}
              />
              {(followUp.data?.tasksSoon?.length ?? 0) > 0 && (
                <>
                  <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximos prazos de tarefas</h3>
                  <FollowList
                    loading={false}
                    empty=""
                    items={followUp.data!.tasksSoon.map((t: any) => ({ id: t.id, title: t.title, sub: t.projects?.name, date: t.due_date, href: `/projects/${t.project_id}?task=${t.id}` }))}
                  />
                </>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Projetos atrasados</h2>
              <FollowList
                loading={followUp.isLoading}
                danger
                empty="Nenhum projeto atrasado."
                items={(followUp.data?.late ?? []).map((p: any) => ({ id: p.id, title: p.name, sub: p.client_name, date: p.due_date, href: `/projects/${p.id}` }))}
              />
              <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distribuição por status</h3>
              <div className="space-y-1.5">
                {(k?.byStatus ?? []).map((s) => (
                  <button key={s.status} type="button" onClick={() => setParam({ status: s.status, overdue: null })} className="flex w-full items-center gap-2 text-left">
                    <span className="w-24 truncate text-xs text-muted-foreground">{PROJECT_STATUS[s.status].label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(s.count / statusMax) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right text-xs tabular-nums">{s.count}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Atividades recentes</h2>
              {followUp.isLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (followUp.data?.activity.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
              ) : (
                <ul className="space-y-2.5">
                  {followUp.data!.activity.map((a: any) => (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <Link to={`/projects/${a.project_id}`} className="block truncate hover:underline">
                          {ACTIVITY_LABEL[a.action_type] ?? a.action_type}
                          {a.metadata?.title ? `: ${a.metadata.title}` : ""}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.projects?.name} · {memberName(a.actor_id) ?? "Sistema"} · {new Date(a.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Filtros */}
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Buscar por projeto ou cliente..." className="h-9 pl-9" />
                </div>
                <Select value={sort} onValueChange={(v) => setParam({ sort: v === "due_asc" ? null : v })}>
                  <SelectTrigger className="h-9 md:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_asc">Ordenar: prazo</SelectItem>
                    <SelectItem value="created_desc">Ordenar: mais recentes</SelectItem>
                    <SelectItem value="name_asc">Ordenar: nome</SelectItem>
                    <SelectItem value="priority_desc">Ordenar: prioridade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                <Select value={status} onValueChange={(v) => setParam({ status: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(PROJECT_STATUS).map(([s, m]) => <SelectItem key={s} value={s}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={(v) => setParam({ priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    {Object.entries(PRIORITY).map(([s, m]) => <SelectItem key={s} value={s}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={responsible} onValueChange={(v) => setParam({ resp: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name || m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" aria-label="Prazo a partir de" value={dueFrom} onChange={(e) => setParam({ from: e.target.value })} className="h-9" />
                <Input type="date" aria-label="Prazo até" value={dueTo} onChange={(e) => setParam({ to: e.target.value })} className="h-9" />
                <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3">
                  <Label htmlFor="flt-overdue" className="text-xs">Só atrasados</Label>
                  <Switch id="flt-overdue" checked={overdueOnly} onCheckedChange={(v) => setParam({ overdue: v ? "1" : null })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch id="flt-archived" checked={showArchived} onCheckedChange={(v) => setParam({ archived: v ? "1" : null })} />
                  <Label htmlFor="flt-archived" className="text-xs text-muted-foreground">Ver arquivados</Label>
                </div>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Tabela */}
          <Card className="overflow-hidden">
            {list.isError ? (
              <div className="p-8 text-center text-sm text-destructive">{friendlyDbError(list.error)}</div>
            ) : list.isLoading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : totalCount === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                <div className="rounded-xl bg-primary/10 p-3"><FolderKanban className="h-6 w-6 text-primary" /></div>
                {hasFilters ? (
                  <>
                    <p className="font-medium">Nenhum projeto encontrado com esses filtros.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Você ainda não tem projetos.</p>
                    <p className="max-w-sm text-sm text-muted-foreground">Crie o primeiro projeto, vincule a um cliente do CRM e distribua as tarefas para sua equipe.</p>
                    <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Criar primeiro projeto</Button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={cn("overflow-x-auto", list.isFetching && "opacity-70")}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Projeto</TableHead>
                        <TableHead className="min-w-[150px]">Cliente</TableHead>
                        <TableHead className="min-w-[130px]">Responsável</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="min-w-[140px]">Progresso</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="whitespace-nowrap">Início</TableHead>
                        <TableHead className="whitespace-nowrap">Prazo final</TableHead>
                        <TableHead className="whitespace-nowrap text-center">Tarefas</TableHead>
                        <TableHead className="w-12 text-right"><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.data!.rows.map((p) => {
                        const overdue = isProjectOverdue(p, today);
                        const clientLabel = p.leads ? p.leads.company_name || p.leads.contact_name : p.client_name;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Link to={`/projects/${p.id}`} className="font-medium hover:text-primary hover:underline">{p.name}</Link>
                              {p.archived_at && <span className="ml-2 text-xs text-muted-foreground">(arquivado)</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {p.lead_id && clientLabel ? (
                                <button type="button" onClick={() => openLead(p.lead_id!)} className="inline-flex max-w-[180px] items-center gap-1 truncate hover:text-primary hover:underline">
                                  <span className="truncate">{clientLabel}</span>
                                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                                </button>
                              ) : (
                                <span className="text-muted-foreground">{clientLabel || "—"}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{memberName(p.responsible_user_id) ?? <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <ProjectStatusBadge status={p.status} />
                                {overdue && <OverdueBadge />}
                              </div>
                            </TableCell>
                            <TableCell><ProgressCell done={p.tasks_done} total={p.tasks_total} /></TableCell>
                            <TableCell><PriorityBadge priority={p.priority} /></TableCell>
                            <TableCell className="whitespace-nowrap text-sm tabular-nums">{formatDateBR(p.start_date)}</TableCell>
                            <TableCell className={cn("whitespace-nowrap text-sm tabular-nums", overdue && "font-medium text-destructive")}>{formatDateBR(p.due_date)}</TableCell>
                            <TableCell className="text-center text-sm tabular-nums">{p.tasks_done}/{p.tasks_total}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busyId === p.id} aria-label="Ações do projeto">
                                    {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => navigate(`/projects/${p.id}`)}><FolderKanban className="mr-2 h-4 w-4" />Abrir projeto</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger><Timer className="mr-2 h-4 w-4" />Alterar status</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {Object.entries(PROJECT_STATUS).map(([s, m]) => (
                                        <DropdownMenuItem key={s} disabled={p.status === s} onClick={() => runUpdate(p, { status: s as ProjectStatus }, "Status atualizado")}>{m.label}</DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuItem onClick={() => duplicate(p)}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {p.archived_at ? (
                                    <DropdownMenuItem onClick={() => runUpdate(p, { archived_at: null }, "Projeto restaurado")}><ArchiveRestore className="mr-2 h-4 w-4" />Restaurar</DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => runUpdate(p, { archived_at: new Date().toISOString() }, "Projeto arquivado")}><Archive className="mr-2 h-4 w-4" />Arquivar</DropdownMenuItem>
                                  )}
                                  {canDelete(p) && (
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setToDelete(p)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Paginação */}
                <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-3 text-sm sm:flex-row">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{totalCount} {totalCount === 1 ? "projeto" : "projetos"}</span>
                    <span>·</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setParam({ size: v === "10" ? null : v })}>
                      <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} por página</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) }, false)}>
                      <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    {pageNumbers(page, totalPages).map((n, i) =>
                      n === null ? (
                        <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
                      ) : (
                        <Button key={n} variant={n === page ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0 tabular-nums" onClick={() => setParam({ page: String(n) }, false)}>{n}</Button>
                      ),
                    )}
                    <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setParam({ page: String(page + 1) }, false)}>
                      <span className="hidden sm:inline">Próximo</span> <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o && location.pathname === "/projects/new") navigate("/projects", { replace: true });
        }}
        project={editing}
        defaultLeadId={defaultLead}
        onSaved={(p) => {
          refreshAll();
          if (!editing) navigate(`/projects/${p.id}`);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.name}” será excluído junto com etapas, tarefas, checklists, arquivos e histórico, e os prazos saem da Agenda. Não é possível desfazer. Se quiser apenas tirar da lista, use “Arquivar”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function pageNumbers(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

function FollowList({
  items,
  loading,
  empty,
  danger,
}: {
  items: { id: string; title: string; sub?: string | null; date: string | null; href: string }[];
  loading: boolean;
  empty: string;
  danger?: boolean;
}) {
  if (loading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (!items.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.id}>
          <Link to={it.href} className="flex items-center justify-between gap-3 py-2 hover:text-primary">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{it.title}</p>
              {it.sub && <p className="truncate text-xs text-muted-foreground">{it.sub}</p>}
            </div>
            <span className={cn("shrink-0 text-xs tabular-nums", danger ? "font-medium text-destructive" : "text-muted-foreground")}>{formatDateBR(it.date)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
