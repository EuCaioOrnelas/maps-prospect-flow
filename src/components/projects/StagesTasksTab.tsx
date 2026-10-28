import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Columns3,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import type { AccountMember } from "@/hooks/useAccountMembers";
import { cn } from "@/lib/utils";
import { PriorityBadge, ProgressCell, TaskStatusBadge } from "./ProjectBadges";
import {
  TASK_STATUS,
  computeProgress,
  formatDateBR,
  friendlyDbError,
  isTaskOverdue,
  type ProjectStage,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/projects";

const db = supabase as any;

interface Props {
  projectId: string;
  stages: ProjectStage[];
  tasks: ProjectTask[];
  members: AccountMember[];
  onChanged: () => void;
  onOpenTask: (task: ProjectTask | null, stageId?: string | null) => void;
}

export function StagesTasksTab({ projectId, stages, tasks, members, onChanged, onOpenTask }: Props) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [stageDialog, setStageDialog] = useState<{ open: boolean; stage: ProjectStage | null }>({ open: false, stage: null });
  const [stageForm, setStageForm] = useState({ name: "", description: "" });
  const [savingStage, setSavingStage] = useState(false);
  const [deleting, setDeleting] = useState<ProjectStage | null>(null);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete">("move");
  const [moveTo, setMoveTo] = useState("none");
  const [busy, setBusy] = useState<string | null>(null);

  const memberName = (id: string | null) => {
    if (!id) return "—";
    const m = members.find((x) => x.user_id === id);
    return m?.name || m?.email || "Usuário";
  };

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (statusFilter === "all" || (statusFilter === "overdue" ? isTaskOverdue(t) : t.status === statusFilter)) &&
          (assigneeFilter === "all" || (assigneeFilter === "none" ? !t.assignee_id : t.assignee_id === assigneeFilter)) &&
          (!search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [tasks, statusFilter, assigneeFilter, search],
  );

  const groups = useMemo(() => {
    const g = stages.map((s) => ({ stage: s as ProjectStage | null, tasks: filtered.filter((t) => t.stage_id === s.id) }));
    const loose = filtered.filter((t) => !t.stage_id || !stages.some((s) => s.id === t.stage_id));
    if (loose.length || stages.length === 0) g.push({ stage: null, tasks: loose });
    return g;
  }, [stages, filtered]);

  const stageProgress = (stageId: string) => {
    const st = tasks.filter((t) => t.stage_id === stageId && t.status !== "cancelled");
    return { done: st.filter((t) => t.status === "done").length, total: st.length };
  };

  const setStatus = async (t: ProjectTask, status: TaskStatus) => {
    setBusy(t.id);
    const { error } = await db.from("project_tasks").update({ status }).eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(friendlyDbError(error));
    onChanged();
  };

  const deleteTask = async (t: ProjectTask) => {
    if (!window.confirm(`Excluir a tarefa “${t.title}”? O prazo dela sai da Agenda.`)) return;
    setBusy(t.id);
    const { error } = await db.from("project_tasks").delete().eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(friendlyDbError(error));
    toast.success("Tarefa excluída");
    onChanged();
  };

  const openStage = (stage: ProjectStage | null) => {
    setStageForm({ name: stage?.name ?? "", description: stage?.description ?? "" });
    setStageDialog({ open: true, stage });
  };

  const saveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.name.trim() || savingStage) return;
    setSavingStage(true);
    const payload = { name: stageForm.name.trim(), description: stageForm.description.trim() || null };
    const res = stageDialog.stage
      ? await db.from("project_stages").update(payload).eq("id", stageDialog.stage.id)
      : await db.from("project_stages").insert({ ...payload, project_id: projectId, position: (stages.at(-1)?.position ?? -1) + 1 });
    setSavingStage(false);
    if (res.error) return toast.error(friendlyDbError(res.error));
    setStageDialog({ open: false, stage: null });
    onChanged();
  };

  const moveStage = async (idx: number, dir: -1 | 1) => {
    const a = stages[idx];
    const b = stages[idx + dir];
    if (!a || !b) return;
    setBusy(a.id);
    // Normaliza posições pela ordem atual e troca as duas.
    const order = stages.map((s) => s.id);
    [order[idx], order[idx + dir]] = [order[idx + dir], order[idx]];
    const results = await Promise.all(order.map((id, i) => db.from("project_stages").update({ position: i }).eq("id", id)));
    setBusy(null);
    const err = results.find((r: any) => r.error);
    if (err) toast.error(friendlyDbError(err.error));
    onChanged();
  };

  const confirmDeleteStage = async () => {
    if (!deleting) return;
    setBusy(deleting.id);
    try {
      const stageTasks = tasks.filter((t) => t.stage_id === deleting.id);
      if (stageTasks.length) {
        if (deleteMode === "delete") {
          const { error } = await db.from("project_tasks").delete().eq("stage_id", deleting.id);
          if (error) throw error;
        } else {
          const { error } = await db.from("project_tasks").update({ stage_id: moveTo === "none" ? null : moveTo }).eq("stage_id", deleting.id);
          if (error) throw error;
        }
      }
      const { error } = await db.from("project_stages").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Etapa excluída");
      setDeleting(null);
      onChanged();
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setBusy(null);
    }
  };

  const TaskActions = ({ t }: { t: ProjectTask }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy === t.id} aria-label="Ações da tarefa">
          {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenTask(t)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Mover para</DropdownMenuLabel>
        {Object.entries(TASK_STATUS).map(([s, m]) => (
          <DropdownMenuItem key={s} disabled={t.status === s} onClick={() => setStatus(t, s as TaskStatus)}>{m.label}</DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTask(t)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name ?? "Sem etapa";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tarefa..." className="col-span-2 h-9 sm:w-56" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              {Object.entries(TASK_STATUS).map(([s, m]) => <SelectItem key={s} value={s}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="none">Sem responsável</SelectItem>
              {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("table")}><Rows3 className="mr-1.5 h-4 w-4" />Tabela</Button>
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView("kanban")}><Columns3 className="mr-1.5 h-4 w-4" />Kanban</Button>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => openStage(null)}><Plus className="mr-1 h-4 w-4" />Etapa</Button>
          <Button size="sm" className="h-9" onClick={() => onOpenTask(null)}><Plus className="mr-1 h-4 w-4" />Tarefa</Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="space-y-3">
          {groups.map(({ stage, tasks: gTasks }, gi) => {
            const key = stage?.id ?? "none";
            const isCollapsed = !!collapsed[key];
            const prog = stage ? stageProgress(stage.id) : null;
            const stageIdx = stage ? stages.findIndex((s) => s.id === stage.id) : -1;
            return (
              <Card key={key} className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                  <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={!isCollapsed}>
                    {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">{stage ? `${stageIdx + 1}.` : ""}</span>
                    <span className="truncate text-sm font-semibold">{stage?.name ?? "Sem etapa"}</span>
                    <span className="text-xs text-muted-foreground">({gTasks.length})</span>
                  </button>
                  {prog && <ProgressCell done={prog.done} total={prog.total} className="hidden w-40 sm:flex" />}
                  {stage && (
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={stageIdx === 0 || !!busy} onClick={() => moveStage(stageIdx, -1)} aria-label="Subir etapa"><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={stageIdx === stages.length - 1 || !!busy} onClick={() => moveStage(stageIdx, 1)} aria-label="Descer etapa"><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ações da etapa"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenTask(null, stage.id)}><Plus className="mr-2 h-4 w-4" />Nova tarefa aqui</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStage(stage)}><Pencil className="mr-2 h-4 w-4" />Editar etapa</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setDeleteMode("move"); setMoveTo("none"); setDeleting(stage); }}><Trash2 className="mr-2 h-4 w-4" />Excluir etapa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  gTasks.length === 0 ? (
                    <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                      {tasks.length === 0 && gi === groups.length - 1 && !stage ? "Nenhuma tarefa ainda. Crie etapas e tarefas para acompanhar o progresso." : "Nenhuma tarefa nesta etapa."}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">Tarefa</TableHead>
                            <TableHead className="min-w-[130px]">Responsável</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead className="min-w-[150px]">Status</TableHead>
                            <TableHead>Prazo</TableHead>
                            <TableHead className="text-center">Checklist</TableHead>
                            <TableHead className="w-10"><span className="sr-only">Ações</span></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gTasks.map((t) => {
                            const late = isTaskOverdue(t);
                            return (
                              <TableRow key={t.id} id={`task-${t.id}`}>
                                <TableCell>
                                  <button type="button" onClick={() => onOpenTask(t)} className={cn("text-left text-sm font-medium hover:text-primary hover:underline", t.status === "cancelled" && "text-muted-foreground line-through")}>{t.title}</button>
                                </TableCell>
                                <TableCell className="text-sm">{memberName(t.assignee_id)}</TableCell>
                                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                                <TableCell>
                                  <Select value={t.status} onValueChange={(v) => setStatus(t, v as TaskStatus)} disabled={busy === t.id}>
                                    <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.entries(TASK_STATUS).map(([s, m]) => <SelectItem key={s} value={s}>{m.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className={cn("whitespace-nowrap text-sm tabular-nums", late && "font-medium text-destructive")}>{formatDateBR(t.due_date)}</TableCell>
                                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{t.checklist_total ? `${t.checklist_done}/${t.checklist_total}` : "—"}</TableCell>
                                <TableCell><TaskActions t={t} /></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-5">
          {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => {
            const col = filtered.filter((t) => t.status === s);
            return (
              <div
                key={s}
                className="flex min-h-[200px] min-w-[220px] flex-col rounded-xl border border-border bg-muted/20"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/task");
                  const t = tasks.find((x) => x.id === id);
                  if (t && t.status !== s) setStatus(t, s);
                }}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <TaskStatusBadge status={s} />
                  <span className="text-xs tabular-nums text-muted-foreground">{col.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {col.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                      className="cursor-grab rounded-lg border border-border bg-card p-2.5 active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <button type="button" onClick={() => onOpenTask(t)} className="text-left text-sm font-medium hover:text-primary">{t.title}</button>
                        <TaskActions t={t} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{stageName(t.stage_id)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <PriorityBadge priority={t.priority} />
                        {t.due_date && <span className={cn("tabular-nums", isTaskOverdue(t) && "font-medium text-destructive")}>{formatDateBR(t.due_date)}</span>}
                        {t.checklist_total > 0 && <span className="inline-flex items-center gap-0.5"><ListChecks className="h-3 w-3" />{t.checklist_done}/{t.checklist_total}</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{memberName(t.assignee_id)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Etapa: criar/editar */}
      <Dialog open={stageDialog.open} onOpenChange={(o) => !savingStage && setStageDialog((d) => ({ ...d, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{stageDialog.stage ? "Editar etapa" : "Nova etapa"}</DialogTitle>
            <DialogDescription>O progresso da etapa é calculado pelas tarefas não canceladas.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStage} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Nome *</Label>
              <Input id="st-name" value={stageForm.name} maxLength={80} onChange={(e) => setStageForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Design" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-desc">Descrição</Label>
              <Textarea id="st-desc" value={stageForm.description} onChange={(e) => setStageForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStageDialog({ open: false, stage: null })}>Cancelar</Button>
              <Button type="submit" disabled={savingStage || !stageForm.name.trim()}>{savingStage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Etapa: excluir com decisão explícita */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir etapa “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              {deleting && tasks.filter((t) => t.stage_id === deleting.id).length > 0
                ? `Esta etapa tem ${tasks.filter((t) => t.stage_id === deleting.id).length} tarefa(s). Escolha o que fazer com elas.`
                : "Esta etapa não tem tarefas."}
            </DialogDescription>
          </DialogHeader>
          {deleting && tasks.some((t) => t.stage_id === deleting.id) && (
            <RadioGroup value={deleteMode} onValueChange={(v) => setDeleteMode(v as "move" | "delete")} className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="move" id="dm-move" className="mt-1" />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="dm-move">Mover as tarefas para</Label>
                  <Select value={moveTo} onValueChange={setMoveTo} disabled={deleteMode !== "move"}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem etapa</SelectItem>
                      {stages.filter((s) => s.id !== deleting.id).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="delete" id="dm-del" />
                <Label htmlFor="dm-del" className="text-destructive">Excluir as tarefas também</Label>
              </div>
            </RadioGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={!!busy}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteStage} disabled={!!busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function stageSummary(stages: ProjectStage[], tasks: ProjectTask[]) {
  return stages.map((s) => {
    const st = tasks.filter((t) => t.stage_id === s.id && t.status !== "cancelled");
    const done = st.filter((t) => t.status === "done").length;
    return { stage: s, done, total: st.length, pct: computeProgress(done, st.length) };
  });
}
