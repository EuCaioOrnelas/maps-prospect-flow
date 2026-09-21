import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink, GripVertical, Info,
  Loader2, Palette, Plus, Settings2, Trash2, Users, Bell, FileText,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 0, label: "Informações", icon: FileText },
  { id: 1, label: "Campos", icon: Settings2 },
  { id: 2, label: "Aparência", icon: Palette },
  { id: 3, label: "CRM", icon: Users },
  { id: 4, label: "Notificações", icon: Bell },
  { id: 5, label: "Publicar", icon: Check },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone / WhatsApp" },
  { value: "number", label: "Número" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Lista suspensa" },
  { value: "radio", label: "Múltipla escolha" },
  { value: "checkbox", label: "Confirmação" },
];

const DEFAULT_FIELDS = [
  { field_type: "text", label: "Nome completo", name: "nome_completo", placeholder: "Seu nome", required: true, is_active: true, options: [] },
  { field_type: "email", label: "E-mail", name: "email", placeholder: "voce@empresa.com", required: true, is_active: true, options: [] },
  { field_type: "phone", label: "WhatsApp", name: "whatsapp", placeholder: "(11) 99999-9999", required: true, is_active: true, options: [] },
  { field_type: "text", label: "Empresa", name: "empresa", placeholder: "Nome da empresa", required: false, is_active: true, options: [] },
];

const slugifyName = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);

export default function FormBuilder() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { profile, user, accountOwnerId } = useAuth();
  const { members } = useAccountMembers();
  const ownerId = accountOwnerId || user?.id || null;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState<any>({
    name: "",
    title: "Fale com a nossa equipe",
    description: "Preencha os dados e retornamos em breve.",
    button_text: "Enviar",
    success_message: "Obrigado! Recebemos seus dados e entraremos em contato em breve.",
    status: "active",
    config: { primaryColor: "#3daa57", buttonColor: "#3daa57", backgroundColor: "#f6f7f9", textColor: "#18181b", radius: 10, align: "left", logoUrl: "", coverUrl: "" },
    crm_enabled: true,
    crm_stage_id: null,
    crm_responsibles: [],
    notify_enabled: false,
    notify_user_ids: [],
  });
  const [fields, setFields] = useState<any[]>(DEFAULT_FIELDS);

  useEffect(() => {
    if (!ownerId) return;
    supabase.from("pipeline_stages").select("id, name").eq("owner_user_id", ownerId).order("position")
      .then(({ data }) => setStages((data as any) || []));
  }, [ownerId]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (data) {
        setForm({ ...data, config: (data as any).config || {} });
        setSlug((data as any).slug);
        const { data: fieldRows } = await supabase
          .from("form_fields").select("*").eq("form_id", id).order("position");
        if (fieldRows?.length) setFields(fieldRows as any);
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const setCfg = (key: string, value: any) => setForm((prev: any) => ({ ...prev, config: { ...prev.config, [key]: value } }));

  const publicUrl = slug ? `${window.location.origin}/form/${slug}` : null;

  const updateField = (index: number, patch: any) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const move = (index: number, dir: -1 | 1) =>
    setFields((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const canSave = useMemo(
    () => form.name.trim().length > 1 && fields.some((f) => f.is_active !== false),
    [form.name, fields],
  );

  const save = async (opts?: { publish?: boolean }) => {
    if (!canSave) { toast.error("Informe um nome e mantenha ao menos um campo ativo."); return; }
    setSaving(true);
    try {
      const payload = {
        action: isEdit ? "update_form" : "create_form",
        form: {
          ...form,
          id,
          status: opts?.publish ? "active" : form.status,
        },
        fields: fields.map((f, i) => ({ ...f, name: f.name || slugifyName(f.label), position: i })),
      };
      const { data, error } = await supabase.functions.invoke("forms-admin", { body: payload });
      if (error) {
        let message = "Não foi possível salvar o formulário.";
        const ctx: any = (error as any).context;
        try {
          const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
          if (body?.message || body?.error) message = body.message || body.error;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      const saved = (data as any).form;
      setSlug(saved.slug);
      toast.success(opts?.publish ? "Formulário publicado." : "Formulário salvo.");
      if (!isEdit) navigate(`/forms/${saved.id}/editar`, { replace: true });
      if (opts?.publish) setStep(5);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cfg = form.config || {};

  return (
    <div className="min-h-screen bg-background">
      <SEO title={isEdit ? "Editar formulário" : "Novo formulário"} description="Editor de formulários da Wiize" />
      <BackgroundGlow />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <button onClick={() => navigate("/forms")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para Forms
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Editar formulário" : "Novo formulário"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Configure, publique e receba os leads direto no CRM.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar
              </Button>
              <Button onClick={() => save({ publish: true })} disabled={saving}>Publicar</Button>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                  step === s.id ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
                }`}
              >
                <s.icon className="h-4 w-4" /> {s.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
            <Card className="border-border/60 p-5">
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nome interno</Label>
                    <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Formulário site institucional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Título exibido</Label>
                    <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Texto do botão</Label>
                      <Input value={form.button_text} onChange={(e) => set("button_text", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mensagem de sucesso</Label>
                      <Input value={form.success_message} onChange={(e) => set("success_message", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  {fields.map((f, i) => (
                    <div key={i} className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={f.label}
                          onChange={(e) => updateField(i, { label: e.target.value, name: f.name || slugifyName(e.target.value) })}
                          className="h-9 flex-1"
                        />
                        <Select value={f.field_type} onValueChange={(v) => updateField(i, { field_type: v })}>
                          <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => move(i, -1)}>↑</Button>
                        <Button variant="ghost" size="icon" onClick={() => move(i, 1)}>↓</Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setFields((p) => p.filter((_, x) => x !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Input
                          value={f.placeholder || ""}
                          onChange={(e) => updateField(i, { placeholder: e.target.value })}
                          placeholder="Texto de apoio (placeholder)"
                          className="h-9"
                        />
                        <Input
                          value={f.name}
                          onChange={(e) => updateField(i, { name: slugifyName(e.target.value) })}
                          placeholder="identificador"
                          className="h-9"
                        />
                      </div>

                      {["select", "radio"].includes(f.field_type) && (
                        <Input
                          value={(Array.isArray(f.options) ? f.options : []).join(", ")}
                          onChange={(e) => updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          placeholder="Opções separadas por vírgula"
                          className="mt-3 h-9"
                        />
                      )}

                      <div className="mt-3 flex items-center gap-5">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={!!f.required} onCheckedChange={(c) => updateField(i, { required: !!c })} /> Obrigatório
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={f.is_active !== false} onCheckedChange={(c) => updateField(i, { is_active: !!c })} /> Ativo
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setFields((p) => [...p, { field_type: "text", label: "Novo campo", name: `campo_${p.length + 1}`, placeholder: "", required: false, is_active: true, options: [] }])}
                  >
                    <Plus className="h-4 w-4" /> Adicionar campo
                  </Button>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Use os identificadores <b>email</b>, <b>whatsapp</b>, <b>nome_completo</b> e <b>empresa</b> para que os dados caiam nos campos certos do CRM.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["primaryColor", "Cor principal"],
                    ["buttonColor", "Cor do botão"],
                    ["backgroundColor", "Fundo da página"],
                    ["textColor", "Cor do texto"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={cfg[key] || "#3daa57"} onChange={(e) => setCfg(key, e.target.value)} className="h-9 w-12 rounded-md border border-border" />
                        <Input value={cfg[key] || ""} onChange={(e) => setCfg(key, e.target.value)} className="h-9" />
                      </div>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label>Arredondamento</Label>
                    <Input type="number" min={0} max={28} value={cfg.radius ?? 10} onChange={(e) => setCfg("radius", Number(e.target.value))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alinhamento do título</Label>
                    <Select value={cfg.align || "left"} onValueChange={(v) => setCfg("align", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centralizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>URL do logo (opcional)</Label>
                    <Input value={cfg.logoUrl || ""} onChange={(e) => setCfg("logoUrl", e.target.value)} placeholder="https://..." className="h-9" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                    <div>
                      <p className="text-sm font-medium">Enviar leads para o CRM</p>
                      <p className="text-xs text-muted-foreground">Cria ou atualiza o contato automaticamente, sem duplicar.</p>
                    </div>
                    <Switch checked={form.crm_enabled} onCheckedChange={(c) => set("crm_enabled", c)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Coluna de destino</Label>
                    <Select
                      value={form.crm_stage_id || "auto"}
                      onValueChange={(v) => set("crm_stage_id", v === "auto" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Primeira coluna" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Primeira coluna do funil</SelectItem>
                        {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Responsável pelos leads</Label>
                    <Select
                      value={form.crm_responsibles?.[0] || "none"}
                      onValueChange={(v) => set("crm_responsibles", v === "none" ? [] : [v])}
                    >
                      <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.name || m.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                    <div>
                      <p className="text-sm font-medium">Avisar por e-mail a cada novo lead</p>
                      <p className="text-xs text-muted-foreground">Enviamos um resumo com os dados preenchidos.</p>
                    </div>
                    <Switch checked={form.notify_enabled} onCheckedChange={(c) => set("notify_enabled", c)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Quem recebe</Label>
                    {members.map((m) => {
                      const checked = (form.notify_user_ids || []).includes(m.user_id);
                      return (
                        <label key={m.user_id} className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) =>
                              set("notify_user_ids", c
                                ? [...(form.notify_user_ids || []), m.user_id]
                                : (form.notify_user_ids || []).filter((x: string) => x !== m.user_id))
                            }
                          />
                          <span>{m.name || m.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                    <div>
                      <p className="text-sm font-medium">Formulário ativo</p>
                      <p className="text-xs text-muted-foreground">Quando inativo, a página pública deixa de aceitar envios.</p>
                    </div>
                    <Switch checked={form.status === "active"} onCheckedChange={(c) => set("status", c ? "active" : "inactive")} />
                  </div>

                  {publicUrl ? (
                    <div className="rounded-xl border border-border/60 p-4">
                      <p className="text-sm font-medium">Link público</p>
                      <p className="mt-1 break-all text-sm text-muted-foreground">{publicUrl}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado."); }}>
                          <Copy className="h-3.5 w-3.5" /> Copiar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(publicUrl, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </Button>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium">Incorporar no seu site</p>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{`<iframe src="${publicUrl}" style="width:100%;height:760px;border:0" loading="lazy"></iframe>`}</pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Salve o formulário para gerar o link público.</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button disabled={step === 5} onClick={() => setStep((s) => Math.min(5, s + 1))} className="gap-1.5">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Prévia */}
            <Card className="h-fit border-border/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Prévia</p>
                <Badge variant="outline">{form.status === "active" ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="rounded-xl p-4" style={{ background: cfg.backgroundColor || "#f6f7f9" }}>
                <div className="rounded-xl bg-white p-4" style={{ borderRadius: (cfg.radius ?? 10) + 8 }}>
                  <div style={{ textAlign: (cfg.align as any) || "left" }}>
                    <p className="text-base font-semibold" style={{ color: cfg.textColor || "#18181b" }}>{form.title}</p>
                    {form.description && <p className="mt-1 text-xs text-zinc-500">{form.description}</p>}
                  </div>
                  <div className="mt-3 space-y-2">
                    {fields.filter((f) => f.is_active !== false).map((f, i) => (
                      <div key={i}>
                        <p className="text-[11px] font-medium text-zinc-600">{f.label}{f.required && " *"}</p>
                        <div className="mt-1 h-8 border border-zinc-200 bg-zinc-50" style={{ borderRadius: cfg.radius ?? 10 }} />
                      </div>
                    ))}
                  </div>
                  <div
                    className="mt-3 flex h-9 items-center justify-center text-xs font-semibold text-white"
                    style={{ background: cfg.buttonColor || "#3daa57", borderRadius: cfg.radius ?? 10 }}
                  >
                    {form.button_text}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
