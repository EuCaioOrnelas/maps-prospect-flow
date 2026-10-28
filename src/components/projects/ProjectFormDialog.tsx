import { useEffect, useRef, useState } from "react";
import { AlignLeft, CalendarRange, FolderKanban, Loader2, Tag, Users } from "lucide-react";
import { AssigneePicker } from "./AssigneePicker";
import { StatusOption } from "./ProjectBadges";
import { RichTextEditor, isRichEmpty } from "./RichTextEditor";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      description: isRichEmpty(form.description) ? null : form.description,
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
        const { data: owner } = await supabase.rpc("get_account_owner", { _uid: user!.id });
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

  const SectionTitle = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{children}</h3>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <form onSubmit={submit} className="flex max-h-[92vh] flex-col" noValidate>
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><FolderKanban className="h-4 w-4 text-primary" /></span>
              <div className="min-w-0">
                <DialogTitle className="text-base">{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
                <DialogDescription className="text-xs">Defina cliente, responsável e prazos. O prazo final aparece automaticamente na Agenda.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-1.5">
              <Input id="pj-name" value={form.name} maxLength={120} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} placeholder="Nome do projeto *" autoFocus={!project}
                className="h-12 border-transparent bg-muted/40 px-3 text-lg font-semibold shadow-none focus-visible:border-input" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <section className="space-y-3">
              <SectionTitle icon={Users}>Cliente e equipe</SectionTitle>
              <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cliente do CRM</Label>
                  <ClientPicker value={form.lead_id} initialLabel={form.lead_label} onChange={(id, label) => setForm((f) => ({ ...f, lead_id: id, lead_label: label }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <AssigneePicker members={activeMembers} value={form.responsible_user_id || null} onChange={(v) => set("responsible_user_id", v ?? "")} />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle icon={CalendarRange}>Andamento e prazos</SectionTitle>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROJECT_STATUS).map(([k, m]) => <SelectItem key={k} value={k}><StatusOption label={m.label} dot={m.dot} /></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v as ProjectPriority)}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PRIORITY).map(([k, m]) => <SelectItem key={k} value={k}><StatusOption label={m.label} dot={m.dot} /></SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pj-start" className="text-xs text-muted-foreground">Início</Label>
                  <Input id="pj-start" type="date" className="h-10 bg-background" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pj-due" className="text-xs text-muted-foreground">Prazo final</Label>
                  <Input id="pj-due" type="date" className="h-10 bg-background" value={form.due_date} min={form.start_date || undefined} onChange={(e) => set("due_date", e.target.value)} aria-invalid={!!errors.due_date} />
                </div>
                {errors.due_date && <p className="col-span-full text-xs text-destructive">{errors.due_date}</p>}
                <div className="col-span-full space-y-1.5">
                  <Label htmlFor="pj-tags" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Tag className="h-3 w-3" />Tags</Label>
                  <Input id="pj-tags" className="h-10 bg-background" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Ex.: site, urgente, recorrente (separadas por vírgula)" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle icon={AlignLeft}>Descrição</SectionTitle>
              <RichTextEditor value={form.description} onChange={(v) => set("description", v)} projectId={project?.id ?? null} minHeightClass="min-h-[220px]"
                placeholder="Objetivo, escopo, entregas combinadas… use títulos, negrito, listas e links." />
              {!project && <p className="text-[11px] text-muted-foreground">Imagens podem ser adicionadas depois de criar o projeto.</p>}
            </section>
          </div>

          <DialogFooter className="gap-2 border-t border-border/60 px-5 py-3 sm:px-6">
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
