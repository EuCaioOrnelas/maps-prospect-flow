import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
    priority: "medium" as ProjectPriority,
    status: "todo" as TaskStatus,
  });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [itemBusy, setItemBusy] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>O prazo da tarefa aparece na Agenda do responsável como vencimento do dia.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="tk-title">Título *</Label>
            <Input id="tk-title" value={form.title} maxLength={200} onChange={(e) => { set("title", e.target.value); setError(null); }} aria-invalid={!!error} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tk-desc">Descrição</Label>
            <Textarea id="tk-desc" value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} className="min-h-[70px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select value={form.stage_id} onValueChange={(v) => set("stage_id", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem etapa</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={form.assignee_id} onValueChange={(v) => set("assignee_id", v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {members.filter((m) => m.status === "active").map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.name || m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-due">Prazo</Label>
              <Input id="tk-due" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as ProjectPriority)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TASK_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Checklist</Label>
              {task && items.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">{done}/{items.length}</span>}
            </div>
            {!task ? (
              <p className="text-xs text-muted-foreground">Salve a tarefa para adicionar itens de verificação.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {items.map((it) => (
                    <li key={it.id} className="group flex items-center gap-2">
                      <Checkbox checked={it.is_completed} onCheckedChange={() => toggleItem(it)} aria-label="Concluir item" />
                      <Input
                        defaultValue={it.title}
                        onBlur={(e) => renameItem(it, e.target.value)}
                        className={`h-8 border-transparent px-1 shadow-none focus-visible:border-input ${it.is_completed ? "text-muted-foreground line-through" : ""}`}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => removeItem(it)} aria-label="Remover item">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Novo item" className="h-8"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={addItem} disabled={itemBusy || !newItem.trim()}>
                    {itemBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Concluir todos os itens não conclui a tarefa automaticamente.</p>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{task ? "Salvar" : "Criar tarefa"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
