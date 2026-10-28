import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { ClientPicker } from "./ClientPicker";
import {
  PRIORITY,
  PROJECT_STATUS,
  friendlyDbError,
  validateProjectForm,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
} from "@/lib/projects";

const db = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  defaultLeadId?: string | null;
  defaultLeadLabel?: string | null;
  onSaved: (project: Project) => void;
}

export function ProjectFormDialog({ open, onOpenChange, project, defaultLeadId, defaultLeadLabel, onSaved }: Props) {
  const { user } = useAuth();
  const { members } = useAccountMembers();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    lead_id: null as string | null,
    lead_label: null as string | null,
    responsible_user_id: "" as string,
    priority: "medium" as ProjectPriority,
    status: "planning" as ProjectStatus,
    start_date: "",
    due_date: "",
    tags: "",
  });

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({
      name: project?.name ?? "",
      description: project?.description ?? "",
      lead_id: project ? project.lead_id : defaultLeadId ?? null,
      lead_label: project ? project.client_name : defaultLeadLabel ?? null,
      responsible_user_id: project?.responsible_user_id ?? user?.id ?? "",
      priority: project?.priority ?? "medium",
      status: project?.status ?? "planning",
      start_date: project?.start_date ?? "",
      due_date: project?.due_date ?? "",
      tags: (project?.tags ?? []).join(", "),
    });
  }, [open, project, defaultLeadId, defaultLeadLabel, user?.id]);

  // Se o cliente veio do CRM sem nome, busca o nome para exibir.
  useEffect(() => {
    if (!open || !form.lead_id || form.lead_label) return;
    supabase.from("leads").select("contact_name, company_name").eq("id", form.lead_id).maybeSingle().then(({ data }) => {
      if (data) setForm((f) => ({ ...f, lead_label: data.company_name || data.contact_name }));
    });
  }, [open, form.lead_id, form.lead_label]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const activeMembers = members.filter((m) => m.status === "active");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const errs = validateProjectForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    savingRef.current = true;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      lead_id: form.lead_id,
      responsible_user_id: form.responsible_user_id || null,
      priority: form.priority,
      status: form.status,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
    };
    try {
      let res;
      if (project) {
        res = await db.from("projects").update(payload).eq("id", project.id).select("*").single();
      } else {
        const { data: owner } = await supabase.rpc("get_account_owner", { _user_id: user!.id } as any);
        res = await db
          .from("projects")
          .insert({ ...payload, owner_user_id: (owner as string) || user!.id, created_by: user!.id })
          .select("*")
          .single();
      }
      if (res.error) throw res.error;
      toast.success(project ? "Projeto atualizado" : "Projeto criado");
      onSaved(res.data as Project);
      onOpenChange(false);
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>Defina cliente, responsável e prazos. O prazo final aparece automaticamente na Agenda.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Informações gerais</h3>
            <div className="space-y-1.5">
              <Label htmlFor="pj-name">Nome do projeto *</Label>
              <Input id="pj-name" value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} placeholder="Ex.: Desenvolvimento de site" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-desc">Descrição</Label>
              <Textarea id="pj-desc" value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <ClientPicker
                  value={form.lead_id}
                  initialLabel={form.lead_label}
                  onChange={(id, label) => setForm((f) => ({ ...f, lead_id: id, lead_label: label }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={form.responsible_user_id || "none"} onValueChange={(v) => set("responsible_user_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Andamento e prazos</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v as ProjectPriority)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pj-start">Data de início</Label>
                <Input id="pj-start" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pj-due">Prazo final</Label>
                <Input id="pj-due" type="date" value={form.due_date} min={form.start_date || undefined} onChange={(e) => set("due_date", e.target.value)} aria-invalid={!!errors.due_date} />
                {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-tags">Tags</Label>
              <Input id="pj-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Separadas por vírgula" />
            </div>
          </section>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? "Salvar alterações" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
