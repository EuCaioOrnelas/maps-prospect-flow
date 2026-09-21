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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiblesPicker } from "@/components/meta/ResponsiblesPicker";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AtSign, Bell, Building2, Check,
  CheckCircle2, ChevronRight, CircleHelp, Code2, Copy, ExternalLink, FileText,
  FormInput, Globe2, Hash, Image, Link2, ListChecks, Loader2, Mail, MessageSquareText,
  MousePointerClick, Palette, Phone, Plus, Radio, RefreshCw, Save, Settings2,
  ShieldCheck, Sparkles, Trash2, Type, UserRound, Users, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 0, label: "Informações", icon: FileText },
  { id: 1, label: "Campos", icon: FormInput },
  { id: 2, label: "Aparência", icon: Palette },
  { id: 3, label: "CRM", icon: Users },
  { id: 4, label: "Notificações", icon: Bell },
  { id: 5, label: "Publicar", icon: CheckCircle2 },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "email", label: "E-mail", icon: AtSign },
  { value: "phone", label: "Telefone / WhatsApp", icon: Phone },
  { value: "number", label: "Número", icon: Hash },
  { value: "textarea", label: "Texto longo", icon: MessageSquareText },
  { value: "select", label: "Lista suspensa", icon: ListChecks },
  { value: "radio", label: "Múltipla escolha", icon: Radio },
  { value: "checkbox", label: "Confirmação", icon: CheckCircle2 },
];

const EMPTY_FIELD = { field_type: "text", label: "", name: "", placeholder: "", required: false, is_active: true, options: [] };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const fieldName = (value: string) => slugify(value).replace(/-/g, "_");
const randomSuffix = () => Math.random().toString(36).slice(2, 8);
const initials = (value: string) => value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

function SectionHeading({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { profile, user, accountOwnerId } = useAuth();
  const { members } = useAccountMembers();
  const ownerId = accountOwnerId || user?.id || null;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState("");
  const [generatedSlug] = useState(() => `contato-${randomSuffix()}`);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [form, setForm] = useState<any>({
    name: "", title: "", description: "", button_text: "", success_message: "", status: "draft",
    config: {
      primaryColor: "#3daa57", buttonColor: "#3daa57", backgroundColor: "#f6f7f9", textColor: "#18181b",
      radius: 10, align: "left", logoUrl: "", coverUrl: "", distributionMode: "fixed",
      metaPixelId: "", googleTagManagerId: "", googleAdsId: "",
    },
    crm_enabled: true, crm_stage_id: null, crm_responsibles: [], notify_enabled: false, notify_user_ids: [],
  });
  const [fields, setFields] = useState<any[]>([{ ...EMPTY_FIELD }]);

  useEffect(() => {
    if (!ownerId) return;
    supabase.from("pipeline_stages").select("id, name, color").eq("owner_user_id", ownerId).order("position")
      .then(({ data }) => setStages((data as any) || []));
  }, [ownerId]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (data) {
        setForm({ ...data, config: { distributionMode: "fixed", ...(data as any).config } });
        setSlug((data as any).slug || "");
        const { data: fieldRows } = await supabase.from("form_fields").select("*").eq("form_id", id).order("position");
        setFields(fieldRows?.length ? fieldRows as any : [{ ...EMPTY_FIELD }]);
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));
  const setCfg = (key: string, value: any) => setForm((prev: any) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  const effectiveSlug = slugify(slug) || generatedSlug;
  const publicUrl = `${window.location.origin}/form/${effectiveSlug}`;
  const cfg = form.config || {};

  const updateField = (index: number, patch: any) => setFields((prev) => prev.map((field, position) => position === index ? { ...field, ...patch } : field));
  const move = (index: number, direction: -1 | 1) => setFields((prev) => {
    const next = [...prev];
    const target = index + direction;
    if (target < 0 || target >= next.length) return prev;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const canSave = useMemo(() => form.name.trim().length > 1 && fields.some((field) => field.is_active !== false && field.label.trim()), [form.name, fields]);

  const save = async (options?: { publish?: boolean; status?: string }) => {
    if (!canSave) { toast.error("Informe um nome e mantenha ao menos um campo ativo com título."); return; }
    setSaving(true);
    try {
      const desiredStatus = options?.status || (options?.publish ? "active" : isEdit ? form.status : "draft");
      const payload = {
        action: isEdit ? "update_form" : "create_form",
        form: {
          ...form, id, slug: effectiveSlug, status: desiredStatus,
          title: form.title.trim() || "Fale com a nossa equipe",
          description: form.description.trim() || null,
          button_text: form.button_text.trim() || "Enviar",
          success_message: form.success_message.trim() || "Obrigado! Recebemos seus dados e entraremos em contato em breve.",
        },
        fields: fields.filter((field) => field.label.trim()).map((field, index) => ({ ...field, name: field.name || fieldName(field.label), position: index })),
      };
      const { data, error } = await supabase.functions.invoke("forms-admin", { body: payload });
      if (error) {
        let message = "Não foi possível salvar o formulário.";
        const context: any = (error as any).context;
        try { const body = context && typeof context.json === "function" ? await context.json() : null; if (body?.message || body?.error) message = body.message || body.error; } catch { /* empty */ }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      const saved = (data as any).form;
      setSlug(saved.slug);
      setForm((prev: any) => ({ ...prev, ...saved, config: { ...prev.config, ...(saved.config || {}) } }));
      toast.success(options?.publish ? "Formulário publicado e ativo." : "Formulário salvo como rascunho.");
      if (!isEdit) navigate(`/forms/${saved.id}/editar`, { replace: true });
      if (options?.publish) setStep(5);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const previewTitle = form.title || "Fale com a nossa equipe";
  const previewDescription = form.description || "Conte brevemente como podemos ajudar.";
  const previewButton = form.button_text || "Enviar";
  const selectedNotifyMembers = members.filter((member) => (form.notify_user_ids || []).includes(member.user_id));

  return (
    <div className="min-h-screen bg-background">
      <SEO title={isEdit ? "Editar formulário" : "Novo formulário"} description="Editor de formulários da Wiize" />
      <BackgroundGlow /><AppSidebar profile={profile} /><MobileNav profile={profile} />
      <main className="min-h-screen pt-[42px] lg:pl-[72px] lg:pt-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/forms")} className="mb-4 -ml-2 gap-2 text-muted-foreground"><ArrowLeft /> Voltar para Forms</Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Editar formulário" : "Novo formulário"}</h1><p className="mt-1 text-sm text-muted-foreground">Crie uma experiência de captação com a identidade da sua empresa.</p></div>
            <div className="flex items-center gap-3">
              {isEdit && <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"><span className="text-sm font-medium">{form.status === "active" ? "Ativo" : "Inativo"}</span><Switch checked={form.status === "active"} disabled={saving} onCheckedChange={(active) => save({ status: active ? "active" : "inactive" })} /></div>}
              <Button variant="outline" onClick={() => save()} disabled={saving} className="gap-2 shadow-none"><Save /> {isEdit ? "Salvar alterações" : "Salvar rascunho"}</Button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto pb-2">
            <div className="flex min-w-max items-center rounded-lg border border-border/60 bg-card p-1 shadow-sm">
              {STEPS.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  <Button variant="ghost" onClick={() => setStep(item.id)} className={cn("h-10 gap-2 rounded-md px-3 shadow-none hover:translate-y-0 hover:bg-muted", step === item.id && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground", step > item.id && "text-primary")}>
                    <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", step === item.id ? "border-primary-foreground/50" : "border-current/30")}>{step > item.id ? <Check className="h-3 w-3" /> : index + 1}</span><item.icon className="h-4 w-4" />{item.label}
                  </Button>
                  {index < STEPS.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
            <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
              <div className="p-5 sm:p-6">
                {step === 0 && <div className="space-y-5">
                  <SectionHeading icon={FileText} title="Informações do formulário" description="Essas informações apresentam sua empresa e o motivo do contato." />
                  <div className="space-y-2"><Label>Nome interno</Label><Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ex.: Contato do site institucional" /></div>
                  <div className="space-y-2"><Label>Título exibido</Label><Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ex.: Fale com a nossa equipe" /></div>
                  <div className="space-y-2"><Label>Descrição breve</Label><Textarea value={form.description || ""} onChange={(event) => set("description", event.target.value)} placeholder="Ex.: Conte o que você precisa e retornaremos em breve." className="min-h-[96px] resize-y" /></div>
                  <div className="space-y-2"><Label>Texto do botão</Label><Input value={form.button_text} onChange={(event) => set("button_text", event.target.value)} placeholder="Ex.: Solicitar contato" /></div>
                  <div className="space-y-2"><Label>Mensagem após o envio</Label><Textarea value={form.success_message} onChange={(event) => set("success_message", event.target.value)} placeholder="Ex.: Obrigado! Recebemos seus dados." className="min-h-[84px] resize-y" /></div>
                  <div className="space-y-2"><Label>Nome do link</Label><div className="flex min-w-0 items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring"><span className="shrink-0 border-r border-border px-3 text-sm text-muted-foreground">/form/</span><Input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder={generatedSlug} className="border-0 shadow-none focus-visible:ring-0" /></div><p className="break-all text-xs text-muted-foreground">Prévia: {publicUrl}</p></div>
                </div>}

                {step === 1 && <div className="space-y-5">
                  <SectionHeading icon={FormInput} title="Campos do formulário" description="Organize os dados em uma sequência simples para quem vai responder." />
                  <div className="space-y-4">{fields.map((field, index) => {
                    const type = FIELD_TYPES.find((item) => item.value === field.field_type) || FIELD_TYPES[0];
                    const FieldIcon = type.icon;
                    return <div key={field.id || index} className="rounded-lg border border-border/60 bg-background p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FieldIcon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{field.label || `Campo ${index + 1}`}</p><p className="text-xs text-muted-foreground">{type.label}</p></div></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)} title="Mover para cima"><ArrowUp /></Button><Button variant="ghost" size="icon" disabled={index === fields.length - 1} onClick={() => move(index, 1)} title="Mover para baixo"><ArrowDown /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setFields((previous) => previous.filter((_, position) => position !== index))} title="Excluir campo"><Trash2 /></Button></div></div>
                      <div className="mt-4 space-y-4">
                        <div className="space-y-2"><Label>Título do campo</Label><Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value, name: field.name || fieldName(event.target.value) })} placeholder="Ex.: Nome completo" /></div>
                        <div className="space-y-2"><Label>Tipo de resposta</Label><Select value={field.field_type} onValueChange={(value) => updateField(index, { field_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIELD_TYPES.map((item) => <SelectItem key={item.value} value={item.value}><span className="flex items-center gap-2"><item.icon className="h-4 w-4 text-muted-foreground" />{item.label}</span></SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Exemplo dentro do campo</Label><Input value={field.placeholder || ""} onChange={(event) => updateField(index, { placeholder: event.target.value })} placeholder="Ex.: Digite sua resposta" /></div>
                        <div className="space-y-2"><Label>Identificador no CRM</Label><Input value={field.name || ""} onChange={(event) => updateField(index, { name: fieldName(event.target.value) })} placeholder="Ex.: nome_completo" /></div>
                        {["select", "radio"].includes(field.field_type) && <div className="space-y-2"><Label>Opções para escolher</Label><Textarea value={(Array.isArray(field.options) ? field.options : []).join("\n")} onChange={(event) => updateField(index, { options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean) })} placeholder={"Ex.:\nAté 10 colaboradores\nDe 11 a 50 colaboradores\nMais de 50 colaboradores"} className="min-h-[112px] resize-y" /><p className="text-xs text-muted-foreground">Digite uma opção por linha.</p></div>}
                        <div className="flex flex-wrap items-center gap-5 pt-1"><label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(field.required)} onCheckedChange={(checked) => updateField(index, { required: Boolean(checked) })} />Obrigatório</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={field.is_active !== false} onCheckedChange={(checked) => updateField(index, { is_active: Boolean(checked) })} />Exibir no formulário</label></div>
                      </div>
                    </div>;
                  })}</div>
                  <Button variant="outline" className="w-full gap-2 border-dashed shadow-none" onClick={() => setFields((previous) => [...previous, { ...EMPTY_FIELD }])}><Plus /> Adicionar campo</Button>
                  <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="min-w-0 leading-6 text-muted-foreground">Para preencher o CRM automaticamente, use os identificadores <span className="inline-flex flex-wrap gap-1 align-middle"><code className="rounded bg-background px-1.5 py-0.5">email</code><code className="rounded bg-background px-1.5 py-0.5">whatsapp</code><code className="rounded bg-background px-1.5 py-0.5">nome_completo</code><code className="rounded bg-background px-1.5 py-0.5">empresa</code></span>.</p></div>
                </div>}

                {step === 2 && <div className="space-y-5">
                  <SectionHeading icon={Palette} title="Aparência" description="Personalize cores, marca e acabamento; a prévia muda enquanto você edita." />
                  <div className="grid gap-4 sm:grid-cols-2">{[["primaryColor", "Cor principal"], ["buttonColor", "Cor do botão"], ["backgroundColor", "Fundo da página"], ["textColor", "Cor do texto"]].map(([key, label]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="relative h-11 overflow-hidden rounded-lg border border-input"><input type="color" value={cfg[key] || "#3daa57"} onChange={(event) => setCfg(key, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0" /><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center border-l border-border bg-background/90 px-3 font-mono text-xs uppercase">{cfg[key] || "#3daa57"}</span></div></div>)}</div>
                  <div className="space-y-2"><Label>Arredondamento dos campos</Label><div className="flex items-center gap-3"><Input type="range" min={0} max={24} value={cfg.radius ?? 10} onChange={(event) => setCfg("radius", Number(event.target.value))} className="h-10 flex-1" /><Badge variant="outline" className="w-14 justify-center">{cfg.radius ?? 10}px</Badge></div></div>
                  <div className="space-y-2"><Label>Alinhamento do título</Label><Select value={cfg.align || "left"} onValueChange={(value) => setCfg("align", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">À esquerda</SelectItem><SelectItem value="center">Centralizado</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><div className="flex items-center gap-2"><Label>URL da logo</Label><TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-6 w-6 rounded-full"><CircleHelp className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent className="max-w-xs">Use o endereço público direto da imagem. Recomendamos PNG com fundo transparente e largura mínima de 240 px.</TooltipContent></Tooltip></TooltipProvider></div><div className="relative"><Image className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={cfg.logoUrl || ""} onChange={(event) => setCfg("logoUrl", event.target.value)} placeholder="https://seusite.com.br/logo.png" className="pl-9" /></div></div>
                  <div className="space-y-2"><Label>URL da imagem de capa (opcional)</Label><Input value={cfg.coverUrl || ""} onChange={(event) => setCfg("coverUrl", event.target.value)} placeholder="https://seusite.com.br/capa.jpg" /></div>
                  <div className="rounded-lg border border-border/60 p-4"><div className="mb-4 flex items-center gap-2"><Code2 className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Rastreamento opcional</p><p className="text-xs text-muted-foreground">As tags são carregadas apenas nesta página pública.</p></div></div><div className="space-y-4"><div className="space-y-2"><Label>Meta Pixel</Label><Input value={cfg.metaPixelId || ""} onChange={(event) => setCfg("metaPixelId", event.target.value.replace(/\D/g, ""))} placeholder="Ex.: 123456789012345" /></div><div className="space-y-2"><Label>Google Tag Manager</Label><Input value={cfg.googleTagManagerId || ""} onChange={(event) => setCfg("googleTagManagerId", event.target.value.toUpperCase().trim())} placeholder="Ex.: GTM-XXXXXXX" /></div><div className="space-y-2"><Label>Google Ads</Label><Input value={cfg.googleAdsId || ""} onChange={(event) => setCfg("googleAdsId", event.target.value.toUpperCase().trim())} placeholder="Ex.: AW-123456789" /></div></div></div>
                </div>}

                {step === 3 && <div className="space-y-5">
                  <SectionHeading icon={Users} title="Destino no CRM" description="Defina onde cada novo contato entra e como será distribuído para sua equipe." />
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"><div><p className="text-sm font-semibold">Enviar leads para o CRM</p><p className="mt-1 text-xs text-muted-foreground">Cria ou atualiza contatos sem duplicar.</p></div><Switch checked={form.crm_enabled} onCheckedChange={(checked) => set("crm_enabled", checked)} /></div>
                  <div className="space-y-2"><Label>Coluna de destino</Label><Select value={form.crm_stage_id || "auto"} disabled={!form.crm_enabled} onValueChange={(value) => set("crm_stage_id", value === "auto" ? null : value)}><SelectTrigger><SelectValue placeholder="Primeira coluna" /></SelectTrigger><SelectContent><SelectItem value="auto"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />Primeira coluna do funil</span></SelectItem>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: stage.color || "hsl(var(--muted-foreground))" }} />{stage.name}</span></SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Distribuição dos leads</Label><Select value={cfg.distributionMode || "fixed"} disabled={!form.crm_enabled} onValueChange={(value) => setCfg("distributionMode", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed"><span className="flex items-center gap-2"><UserRound className="h-4 w-4" />Responsáveis selecionados</span></SelectItem><SelectItem value="round_robin"><span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Distribuição inteligente (fila justa)</span></SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Na distribuição inteligente, cada novo lead vai para o próximo vendedor da fila.</p></div>
                  <div className="space-y-2"><Label>{cfg.distributionMode === "round_robin" ? "Vendedores participantes" : "Responsáveis pelos leads"}</Label><ResponsiblesPicker members={members} value={form.crm_responsibles || []} onChange={(value) => set("crm_responsibles", value)} disabled={!form.crm_enabled} placeholder="Buscar vendedor por nome ou e-mail..." /></div>
                </div>}

                {step === 4 && <div className="space-y-5">
                  <SectionHeading icon={Bell} title="Notificações" description="Avise sua equipe no momento em que um novo lead chegar." />
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"><div><p className="text-sm font-semibold">Avisar por e-mail</p><p className="mt-1 text-xs text-muted-foreground">Envia os dados preenchidos e um acesso direto ao CRM.</p></div><Switch checked={form.notify_enabled} onCheckedChange={(checked) => set("notify_enabled", checked)} /></div>
                  <div className="space-y-2"><Label>Quem recebe o aviso</Label><ResponsiblesPicker members={members} value={form.notify_user_ids || []} onChange={(value) => set("notify_user_ids", value)} disabled={!form.notify_enabled} placeholder="Buscar pessoa por nome ou e-mail..." /></div>
                  <Button variant="outline" className="w-full gap-2 shadow-none" disabled={!form.notify_enabled} onClick={() => setEmailPreviewOpen(true)}><Mail /> Ver prévia do e-mail</Button>
                </div>}

                {step === 5 && <div className="space-y-5">
                  <SectionHeading icon={Sparkles} title="Tudo pronto para publicar" description="Revise a prévia e deixe o formulário disponível quando estiver pronto." />
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">Link profissional e seguro</p><p className="mt-1 break-all text-sm text-muted-foreground">{publicUrl}</p></div></div></div>
                  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-border/60 p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Campos ativos</p><p className="mt-2 text-2xl font-semibold">{fields.filter((field) => field.is_active !== false && field.label.trim()).length}</p></div><div className="rounded-lg border border-border/60 p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Destino</p><p className="mt-2 truncate font-semibold">{form.crm_enabled ? "CRM conectado" : "Somente respostas"}</p></div></div>
                  {isEdit && <div className="flex items-center justify-between rounded-lg border border-border/60 p-4"><div><p className="text-sm font-semibold">Formulário {form.status === "active" ? "ativo" : "inativo"}</p><p className="mt-1 text-xs text-muted-foreground">O controle também fica disponível no topo da página.</p></div><Switch checked={form.status === "active"} disabled={saving} onCheckedChange={(active) => save({ status: active ? "active" : "inactive" })} /></div>}
                  {isEdit && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success("Link copiado."))}><Copy /> Copiar link</Button><Button variant="outline" onClick={() => window.open(publicUrl, "_blank")}><ExternalLink /> Abrir formulário</Button></div>}
                </div>}
              </div>

              <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border bg-card p-4 sm:px-6">
                <Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="gap-2 shadow-none"><ArrowLeft /> Voltar</Button>
                {step < 5 ? <Button onClick={() => setStep((current) => Math.min(5, current + 1))} className="gap-2 shadow-none">Próximo <ArrowRight /></Button> : <Button onClick={() => save({ publish: true })} disabled={saving || !canSave} className="gap-2 shadow-none">{saving ? <Loader2 className="animate-spin" /> : <Zap />} Publicar formulário</Button>}
              </div>
            </Card>

            <Card className="sticky top-4 h-fit border-border/60 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Prévia ao vivo</p><p className="text-xs text-muted-foreground">{`/form/${effectiveSlug}`}</p></div><Badge variant="outline">{form.status === "active" ? "Ativo" : isEdit ? "Inativo" : "Rascunho"}</Badge></div>
              <div className="overflow-hidden rounded-lg p-4" style={{ background: cfg.backgroundColor || "#f6f7f9" }}><div className="bg-card p-4 shadow-sm" style={{ borderRadius: (cfg.radius ?? 10) + 6 }}>{cfg.coverUrl && <img src={cfg.coverUrl} alt="Capa" className="mb-4 h-24 w-full object-cover" style={{ borderRadius: cfg.radius ?? 10 }} />}{cfg.logoUrl && <img src={cfg.logoUrl} alt="Logo" className="mb-4 h-9 max-w-[160px] object-contain" style={{ marginInline: cfg.align === "center" ? "auto" : undefined }} />}<div style={{ textAlign: cfg.align || "left" }}><p className="text-base font-semibold" style={{ color: cfg.textColor || "#18181b" }}>{previewTitle}</p><p className="mt-1 text-xs opacity-70" style={{ color: cfg.textColor || "#18181b" }}>{previewDescription}</p></div><div className="mt-4 space-y-3">{fields.filter((field) => field.is_active !== false && field.label.trim()).slice(0, 5).map((field, index) => { const item = FIELD_TYPES.find((type) => type.value === field.field_type) || FIELD_TYPES[0]; return <div key={field.id || index}><p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: cfg.textColor || "#18181b" }}><item.icon className="h-3 w-3" />{field.label}{field.required && " *"}</p><div className="flex h-9 items-center border border-border bg-background px-3 text-[10px] text-muted-foreground" style={{ borderRadius: cfg.radius ?? 10 }}>{field.placeholder || "Digite sua resposta"}</div></div>; })}{!fields.some((field) => field.is_active !== false && field.label.trim()) && <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">Adicione campos para visualizar o formulário.</div>}</div><div className="mt-4 flex h-10 items-center justify-center text-xs font-semibold text-primary-foreground" style={{ background: cfg.buttonColor || "#3daa57", borderRadius: cfg.radius ?? 10 }}>{previewButton}</div></div></div>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}><DialogContent className="w-[calc(100vw-2rem)] max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Prévia do aviso de novo lead</DialogTitle><DialogDescription>Exemplo do e-mail que as pessoas selecionadas receberão.</DialogDescription></DialogHeader><div className="overflow-hidden rounded-lg border border-border bg-muted/30 p-4 sm:p-6"><div className="mx-auto max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-sm"><div className="border-b border-border bg-primary px-5 py-4 text-primary-foreground"><p className="text-sm font-semibold">Novo lead recebido</p><p className="mt-0.5 text-xs opacity-80">{form.name || "Seu formulário"}</p></div><div className="space-y-4 p-5"><div><p className="text-xs text-muted-foreground">Contato</p><p className="mt-1 font-semibold">Marina Oliveira</p><p className="text-sm text-muted-foreground">marina@empresa.com.br · (11) 99999-9999</p></div><div className="grid gap-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Empresa</p><p className="mt-1 font-medium">Empresa Exemplo</p></div><div><p className="text-xs text-muted-foreground">Origem</p><p className="mt-1 font-medium">Campanha do formulário</p></div></div><Button className="w-full shadow-none">Ver lead no CRM</Button></div></div></div><p className="text-xs text-muted-foreground">Destinatários: {selectedNotifyMembers.length ? selectedNotifyMembers.map((member) => member.name || member.email).join(", ") : "selecione quem receberá"}.</p></DialogContent></Dialog>
    </div>
  );
}
