import { useEffect, useRef, useState } from "react";
import { Info, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { AssigneePicker } from "@/components/projects/AssigneePicker";
import { StatusOption } from "@/components/projects/ProjectBadges";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { AccountMember } from "@/hooks/useAccountMembers";
import { useTaskComments } from "@/hooks/useTaskComments";
import { LeadNotesChat } from "@/components/crm/LeadNotesChat";
import {
  PRIORITY,
  TASK_STATUS,
  friendlyDbError,
  type ChecklistItem,
  type ProjectPriority,
  type ProjectStage,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/projects";

const db = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  task: ProjectTask | null;
  defaultStageId?: string | null;
  stages: ProjectStage[];
  members: AccountMember[];
  onSaved: () => void;
}

export function TaskDialog({ open, onOpenChange, projectId, task, defaultStageId, stages, members, onSaved }: Props) {
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    stage_id: "none",
    assignee_id: "none",
    due_date: "",
    due_time: "",
    duration_minutes: "60",
    priority: "medium" as ProjectPriority,
    status: "todo" as TaskStatus,
  });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [itemBusy, setItemBusy] = useState(false);
  const comments = useTaskComments(open && task ? task.id : null, members);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewItem("");
    setForm({
      title: task?.title ?? "",
      description: task?.description ?? "",
      stage_id: task?.stage_id ?? defaultStageId ?? "none",
      assignee_id: task?.assignee_id ?? "none",
      due_date: task?.due_date ?? "",
      due_time: task?.due_time ? task.due_time.slice(0, 5) : "",
      duration_minutes: String(task?.duration_minutes ?? 60),
      priority: task?.priority ?? "medium",
      status: task?.status ?? "todo",
    });
    setItems([]);
    if (task) {
      db.from("project_task_checklist_items").select("*").eq("task_id", task.id).order("position").then(({ data }: any) => setItems(data || []));
    }
  }, [open, task, defaultStageId]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (!form.title.trim()) return setError("Informe o título da tarefa.");
    savingRef.current = true;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      stage_id: form.stage_id === "none" ? null : form.stage_id,
      assignee_id: form.assignee_id === "none" ? null : form.assignee_id,
      due_date: form.due_date || null,
      due_time: form.due_date && form.due_time ? form.due_time : null,
      duration_minutes: Number(form.duration_minutes) || 60,
      priority: form.priority,
      status: form.status,
    };
    const res = task
      ? await db.from("project_tasks").update(payload).eq("id", task.id)
      : await db.from("project_tasks").insert({ ...payload, project_id: projectId });
    savingRef.current = false;
    setSaving(false);
    if (res.error) return toast.error(friendlyDbError(res.error));
    toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
    onSaved();
    onOpenChange(false);
  };

  const addItem = async () => {
    if (!task || !newItem.trim() || itemBusy) return;
    setItemBusy(true);
    const { data, error } = await db
      .from("project_task_checklist_items")
      .insert({ task_id: task.id, title: newItem.trim(), position: items.length })
      .select("*")
      .single();
    setItemBusy(false);
    if (error) return toast.error(friendlyDbError(error));
    setItems((l) => [...l, data]);
    setNewItem("");
    onSaved();
  };

  const toggleItem = async (it: ChecklistItem) => {
    setItems((l) => l.map((x) => (x.id === it.id ? { ...x, is_completed: !x.is_completed } : x)));
    const { error } = await db.from("project_task_checklist_items").update({ is_completed: !it.is_completed }).eq("id", it.id);
    if (error) {
      toast.error(friendlyDbError(error));
      setItems((l) => l.map((x) => (x.id === it.id ? it : x)));
    } else onSaved();
  };

  const renameItem = async (it: ChecklistItem, title: string) => {
    if (!title.trim() || title.trim() === it.title) return;
    const { error } = await db.from("project_task_checklist_items").update({ title: title.trim() }).eq("id", it.id);
    if (error) toast.error(friendlyDbError(error));
    else setItems((l) => l.map((x) => (x.id === it.id ? { ...x, title: title.trim() } : x)));
  };

  const removeItem = async (it: ChecklistItem) => {
    const { error } = await db.from("project_task_checklist_items").delete().eq("id", it.id);
    if (error) return toast.error(friendlyDbError(error));
    setItems((l) => l.filter((x) => x.id !== it.id));
    onSaved();
  };

  const done = items.filter((i) => i.is_completed).length;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <form onSubmit={submit} className="flex max-h-[92vh] flex-col" noValidate>
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><ListChecks className="h-4 w-4 text-primary" /></span>
              <div className="min-w-0">
                <DialogTitle className="text-base">{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
                <DialogDescription className="text-xs">Defina responsável, prazo e acompanhe tudo em um só lugar.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid flex-1 overflow-y-auto md:grid-cols-[1fr_300px]">
            {/* Conteúdo */}
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="space-y-1.5">
                <Input
                  id="tk-title"
                  value={form.title}
                  maxLength={200}
                  placeholder="Título da tarefa"
                  onChange={(e) => { set("title", e.target.value); setError(null); }}
                  aria-invalid={!!error}
                  className="h-11 border-transparent bg-muted/40 px-3 text-base font-semibold shadow-none focus-visible:border-input"
                  autoFocus={!task}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
              <Field label="Descrição">
                <Textarea id="tk-desc" value={form.description} maxLength={4000} placeholder="Detalhes, contexto e o que precisa ser entregue..." onChange={(e) => set("description", e.target.value)} className="min-h-[90px] resize-y" />
              </Field>

              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Checklist</span>
                  {task && items.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">{done}/{items.length}</span>}
                </div>
                {task && items.length > 0 && (
                  <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></div>
                )}
                {!task ? (
                  <p className="text-xs text-muted-foreground">Crie a tarefa para adicionar itens de verificação.</p>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {items.map((it) => (
                        <li key={it.id} className="group flex items-center gap-2">
                          <Checkbox checked={it.is_completed} onCheckedChange={() => toggleItem(it)} aria-label="Concluir item" />
                          <Input
                            defaultValue={it.title}
                            onBlur={(e) => renameItem(it, e.target.value)}
                            className={`h-8 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input ${it.is_completed ? "text-muted-foreground line-through" : ""}`}
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => removeItem(it)} aria-label="Remover item">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Adicionar item e pressionar Enter" className="h-8 bg-background"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={addItem} disabled={itemBusy || !newItem.trim()}>
                        {itemBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Concluir todos os itens não conclui a tarefa automaticamente.</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Conversa da tarefa</span>
                {!task ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Crie a tarefa para conversar com a equipe sobre ela.</p>
                ) : (
                  <LeadNotesChat
                    controller={comments}
                    heightClass="h-[300px]"
                    placeholder="Escreva para quem participa desta tarefa..."
                    emptyHint="Nenhuma mensagem ainda. Converse aqui com a equipe sobre esta tarefa; o responsável é avisado no sininho."
                  />
                )}
              </div>
            </div>

            {/* Propriedades */}
            <aside className="space-y-4 border-t border-border/60 bg-muted/20 px-5 py-5 md:border-l md:border-t-0 sm:px-6 md:px-5">
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TASK_STATUS).map(([k, m]) => <SelectItem key={k} value={k}><StatusOption label={m.label} dot={m.dot} /></SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Responsável">
                <AssigneePicker members={members} value={form.assignee_id === "none" ? null : form.assignee_id} onChange={(v) => set("assignee_id", v ?? "none")} />
              </Field>
              <Field label="Prioridade">
                <Select value={form.priority} onValueChange={(v) => set("priority", v as ProjectPriority)}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY).map(([k, m]) => <SelectItem key={k} value={k}><StatusOption label={m.label} dot={m.dot} /></SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Etapa">
                <Select value={form.stage_id} onValueChange={(v) => set("stage_id", v)}>
                  <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem etapa</SelectItem>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Prazo">
                <Input id="tk-due" type="date" className="h-10 bg-background" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Horário">
                  <Input id="tk-time" type="time" className="h-10 bg-background" value={form.due_time} disabled={!form.due_date} onChange={(e) => set("due_time", e.target.value)} />
                </Field>
                <Field label="Duração">
                  <Select value={form.duration_minutes} onValueChange={(v) => set("duration_minutes", v)} disabled={!form.due_time}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[["15","15 min"],["30","30 min"],["60","1 h"],["90","1h30"],["120","2 h"],["180","3 h"],["240","4 h"],["480","8 h"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <p className="flex gap-1.5 rounded-lg bg-background/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Sem horário, o prazo fica como dia todo e não ocupa a Agenda. Com horário, bloqueia esse período na Agenda do responsável.
              </p>
            </aside>
          </div>

          <DialogFooter className="gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{task ? "Salvar alterações" : "Criar tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
