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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { FormResponsiblePicker } from "@/components/forms/FormResponsiblePicker";
import { FormEmailPreview } from "@/components/forms/FormEmailPreview";
import { cn } from "@/lib/utils";
import {
  AlignLeft, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AtSign, Bell, Building2,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleDot, Copy, ExternalLink,
  FileText, Globe2, Hash, HelpCircle, Image, Link2, ListChecks, Loader2, Mail,
  MessageSquareText, Palette, Phone, Plus, Radio, Save, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Trash2, Type, UserRound, Users,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 0, label: "Informações", icon: FileText },
  { id: 1, label: "Campos", icon: Settings2 },
  { id: 2, label: "Aparência", icon: Palette },
  { id: 3, label: "CRM", icon: Users },
  { id: 4, label: "Notificações", icon: Bell },
  { id: 5, label: "Salvar e publicar", icon: CheckCircle2 },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "email", label: "E-mail", icon: AtSign },
  { value: "phone", label: "Telefone / WhatsApp", icon: Phone },
  { value: "number", label: "Número", icon: Hash },
  { value: "textarea", label: "Texto longo", icon: AlignLeft },
  { value: "select", label: "Lista suspensa", icon: ChevronDown },
  { value: "radio", label: "Múltipla escolha", icon: CircleDot },
  { value: "checkbox", label: "Confirmação", icon: Check },
];

const EMPTY_FIELD = (index: number) => ({
  field_type: "text", label: "", name: `campo_${index + 1}`, placeholder: "", required: false, is_active: true, options: [],
});

const randomSlug = () => `contato-${crypto.randomUUID().slice(0, 6)}`;
const slugifyLink = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const slugifyName = (value: string) => slugifyLink(value).replace(/-/g, "_");
const fieldIcon = (type: string) => FIELD_TYPES.find((item) => item.value === type)?.icon || Type;

const initialForm = {
  name: "",
  title: "",
  description: "",
  button_text: "",
  success_message: "",
  status: "draft",
  config: {
    primaryColor: "#3daa57", buttonColor: "#3daa57", backgroundColor: "#f6f7f9", textColor: "#18181b",
    radius: 10, align: "left", logoUrl: "", coverUrl: "", distributionMode: "fixed", metaPixelId: "", googleTagId: "",
  },
  crm_enabled: true,
  crm_stage_id: null,
  crm_responsibles: [] as string[],
  notify_enabled: false,
  notify_user_ids: [] as string[],
};

function SectionHeader({ icon: Icon, title, description }: { icon: typeof FileText; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 border-b border-border/60 pb-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    </div>
  );
}

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
  const [slug, setSlug] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [stages, setStages] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [form, setForm] = useState<any>(initialForm);
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    if (!ownerId) return;
    supabase.from("pipeline_stages").select("id, name, color").eq("owner_user_id", ownerId).order("position")
      .then(({ data }) => setStages((data as any) || []));
  }, [ownerId]);

  useEffect(() => {
    if (!isEdit) { setSlug(randomSlug()); return; }
    (async () => {
      const { data } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();
      if (data) {
        setForm({ ...initialForm, ...data, config: { ...initialForm.config, ...((data as any).config || {}) } });
        setSlug((data as any).slug);
        const { data: rows } = await supabase.from("form_fields").select("*").eq("form_id", id).order("position");
        setFields((rows as any) || []);
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const set = (key: string, value: any) => setForm((previous: any) => ({ ...previous, [key]: value }));
  const setCfg = (key: string, value: any) => setForm((previous: any) => ({ ...previous, config: { ...previous.config, [key]: value } }));
  const cfg = form.config || {};
  const displaySlug = slugifyLink(slug) || randomSlug();
  const publicUrl = `${window.location.origin}/form/${displaySlug}`;
  const updateField = (index: number, patch: any) => setFields((previous) => previous.map((field, position) => position === index ? { ...field, ...patch } : field));
  const move = (index: number, direction: -1 | 1) => setFields((previous) => {
    const target = index + direction;
    if (target < 0 || target >= previous.length) return previous;
    const next = [...previous];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const canSave = useMemo(() => form.name.trim().length > 1 && fields.some((field) => field.is_active !== false && field.label.trim()), [form.name, fields]);

  const save = async () => {
    if (!canSave) { toast.error("Informe um nome e adicione ao menos um campo com título."); return; }
    setSaving(true);
    try {
      const payload = {
        action: isEdit ? "update_form" : "create_form",
        form: { ...form, id, slug: displaySlug },
        fields: fields.map((field, index) => ({ ...field, name: field.name || slugifyName(field.label), position: index })),
      };
      const { data, error } = await supabase.functions.invoke("forms-admin", { body: payload });
      if (error) {
        let message = "Não foi possível salvar o formulário.";
        const context: any = (error as any).context;
        try { const response = context && typeof context.json === "function" ? await context.json() : null; if (response?.message || response?.error) message = response.message || response.error; } catch { /* noop */ }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      const saved = (data as any).form;
      setSlug(saved.slug);
      toast.success(saved.status === "active" ? "Formulário salvo e ativo." : "Formulário salvo como rascunho.");
      if (!isEdit) navigate(`/forms/${saved.id}/editar`, { replace: true });
    } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={isEdit ? "Editar formulário" : "Novo formulário"} description="Editor de formulários da Wiize" />
      <BackgroundGlow /><AppSidebar profile={profile} /><MobileNav profile={profile} />
      <main className="min-h-screen pt-[42px] lg:pl-[72px] lg:pt-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/forms")} className="mb-4 -ml-2 gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Voltar para Forms</Button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><h1 className="text-2xl font-semibold">{isEdit ? "Editar formulário" : "Criar formulário"}</h1><p className="mt-1 text-sm text-muted-foreground">Configure cada detalhe e acompanhe o resultado antes de salvar.</p></div>
            <Badge variant="outline" className={cn("w-fit", form.status === "active" ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{form.status === "active" ? "Ativo" : "Rascunho"}</Badge>
          </div>

          <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card p-1.5">
            <div className="flex min-w-max items-center">
              {STEPS.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  <Button variant="ghost" onClick={() => setStep(item.id)} className={cn("h-11 gap-2 rounded-md px-3", step === item.id && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground", step > item.id && "text-primary")}>
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border text-xs", step === item.id ? "border-primary-foreground/30" : "border-border")}>
                      {step > item.id ? <Check className="h-3.5 w-3.5" /> : <item.icon className="h-3.5 w-3.5" />}
                    </span>{item.label}
                  </Button>
                  {index < STEPS.length - 1 && <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </div>

          <Card className="mt-5 border-border/60 p-5 shadow-sm sm:p-7">
            {step === 0 && <div>
              <SectionHeader icon={FileText} title="Informações do formulário" description="Defina o que o visitante verá. Os exemplos abaixo não serão salvos como conteúdo." />
              <div className="space-y-5">
                <div className="space-y-2"><Label>Nome interno</Label><Input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ex.: Captação — página de consultoria" maxLength={120} /></div>
                <div className="space-y-2"><Label>Título exibido</Label><Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ex.: Fale com um especialista" maxLength={160} /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description || ""} onChange={(event) => set("description", event.target.value)} placeholder="Ex.: Conte brevemente o que acontece após o envio." className="min-h-24" maxLength={600} /></div>
                <div className="space-y-2"><Label>Texto do botão</Label><Input value={form.button_text} onChange={(event) => set("button_text", event.target.value)} placeholder="Ex.: Quero conversar" maxLength={60} /></div>
                <div className="space-y-2"><Label>Mensagem de sucesso</Label><Textarea value={form.success_message} onChange={(event) => set("success_message", event.target.value)} placeholder="Ex.: Recebemos seus dados. Nossa equipe entrará em contato." className="min-h-20" maxLength={400} /></div>
                <div className="space-y-2"><Label htmlFor="form-slug">Nome do link</Label><div className="flex min-h-11 items-center rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring"><span className="shrink-0 text-sm text-muted-foreground">/form/</span><input id="form-slug" value={slug} onChange={(event) => setSlug(slugifyLink(event.target.value))} placeholder="contato-empresa" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" /></div><p className="break-all text-xs text-muted-foreground">{publicUrl}</p></div>
              </div>
            </div>}

            {step === 1 && <div>
              <SectionHeader icon={ListChecks} title="Campos do formulário" description="Organize as perguntas na mesma ordem em que o visitante responderá." />
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const Icon = fieldIcon(field.field_type);
                  return <div key={field.id || index} className="rounded-md border border-border bg-card p-4 sm:p-5">
                    <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{field.label || `Campo ${index + 1}`}</p><p className="text-xs text-muted-foreground">{FIELD_TYPES.find((type) => type.value === field.field_type)?.label}</p></div>
                      <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={index === fields.length - 1} onClick={() => move(index, 1)} aria-label="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setFields((previous) => previous.filter((_, position) => position !== index))} aria-label="Excluir campo"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2"><Label>Tipo de resposta</Label><Select value={field.field_type} onValueChange={(value) => updateField(index, { field_type: value, options: ["select", "radio"].includes(value) ? field.options : [] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FIELD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}><span className="flex items-center gap-2"><type.icon className="h-4 w-4" />{type.label}</span></SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>Título do campo</Label><Input value={field.label} onChange={(event) => updateField(index, { label: event.target.value, name: field.name.startsWith("campo_") ? slugifyName(event.target.value) : field.name })} placeholder="Ex.: Nome completo" maxLength={120} /></div>
                      <div className="space-y-2"><Label>Exemplo dentro do campo</Label><Input value={field.placeholder || ""} onChange={(event) => updateField(index, { placeholder: event.target.value })} placeholder="Ex.: Digite seu nome e sobrenome" maxLength={120} /></div>
                      <div className="space-y-2"><Label>Identificador no CRM</Label><Input value={field.name || ""} onChange={(event) => updateField(index, { name: slugifyName(event.target.value) })} placeholder="Ex.: nome_completo" maxLength={60} /></div>
                      {["select", "radio"].includes(field.field_type) && <div className="space-y-3"><Label>Opções de resposta</Label>{(field.options || []).map((option: string, optionIndex: number) => <div key={optionIndex} className="flex gap-2"><Input value={option} onChange={(event) => updateField(index, { options: field.options.map((item: string, current: number) => current === optionIndex ? event.target.value : item) })} placeholder={`Opção ${optionIndex + 1}`} /><Button variant="outline" size="icon" onClick={() => updateField(index, { options: field.options.filter((_: string, current: number) => current !== optionIndex) })}><Trash2 className="h-4 w-4" /></Button></div>)}<Button variant="outline" size="sm" className="gap-2" onClick={() => updateField(index, { options: [...(field.options || []), ""] })}><Plus className="h-4 w-4" />Adicionar opção</Button></div>}
                      <div className="flex flex-wrap gap-5 pt-1"><label className="flex items-center gap-2 text-sm"><Checkbox checked={!!field.required} onCheckedChange={(checked) => updateField(index, { required: !!checked })} />Obrigatório</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={field.is_active !== false} onCheckedChange={(checked) => updateField(index, { is_active: !!checked })} />Ativo</label></div>
                    </div>
                  </div>;
                })}
                <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setFields((previous) => [...previous, EMPTY_FIELD(previous.length)])}><Plus className="h-4 w-4" />Adicionar campo</Button>
                <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground"><InfoIcon /><p className="min-w-0 leading-5">Para preencher automaticamente o CRM, use um destes identificadores: <strong className="break-words text-foreground">email</strong>, <strong className="break-words text-foreground">whatsapp</strong>, <strong className="break-words text-foreground">nome_completo</strong> ou <strong className="break-words text-foreground">empresa</strong>.</p></div>
              </div>
            </div>}

            {step === 2 && <div>
              <SectionHeader icon={Palette} title="Aparência" description="Personalize o formulário sem comprometer a leitura e a acessibilidade." />
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">{[["primaryColor", "Cor principal"], ["buttonColor", "Cor do botão"], ["backgroundColor", "Fundo da página"], ["textColor", "Cor do texto"]].map(([key, label]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="relative h-11 overflow-hidden rounded-md border border-input"><input aria-label={label} type="color" value={cfg[key] || "#3daa57"} onChange={(event) => setCfg(key, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0" /><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center border-l border-border bg-background/90 px-3 font-mono text-xs">{cfg[key]}</span></div></div>)}</div>
                <div className="space-y-2"><Label>Arredondamento dos campos</Label><Input type="range" min={0} max={24} value={cfg.radius ?? 10} onChange={(event) => setCfg("radius", Number(event.target.value))} className="px-0" /><p className="text-xs text-muted-foreground">{cfg.radius ?? 10}px</p></div>
                <div className="space-y-2"><Label>Alinhamento do título</Label><Select value={cfg.align || "left"} onValueChange={(value) => setCfg("align", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">À esquerda</SelectItem><SelectItem value="center">Centralizado</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><div className="flex items-center gap-2"><Label>URL pública da logo</Label><TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" aria-label="Como obter a URL da logo" className="text-muted-foreground hover:text-foreground"><HelpCircle className="h-4 w-4" /></button></TooltipTrigger><TooltipContent className="max-w-xs">Envie a logo para seu site ou armazenamento público e cole o endereço direto da imagem. Recomendamos PNG com fundo transparente.</TooltipContent></Tooltip></TooltipProvider></div><div className="relative"><Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={cfg.logoUrl || ""} onChange={(event) => setCfg("logoUrl", event.target.value)} placeholder="https://seusite.com/logo.png" className="pl-9" /></div><p className="text-xs text-muted-foreground">Prefira PNG transparente, com endereço iniciado por https://.</p></div>
              </div>
            </div>}

            {step === 3 && <div>
              <SectionHeader icon={Users} title="Destino no CRM" description="Defina onde o lead entra e quem será responsável pelo primeiro contato." />
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4"><div><p className="text-sm font-medium">Enviar leads para o CRM</p><p className="mt-1 text-xs text-muted-foreground">Cria ou atualiza o contato automaticamente, sem duplicar.</p></div><Switch checked={form.crm_enabled} onCheckedChange={(checked) => set("crm_enabled", checked)} /></div>
                <div className={cn("space-y-5", !form.crm_enabled && "pointer-events-none opacity-50")}>
                  <div className="space-y-2"><Label>Coluna de destino</Label><Select value={form.crm_stage_id || "auto"} onValueChange={(value) => set("crm_stage_id", value === "auto" ? null : value)}><SelectTrigger><SelectValue placeholder="Primeira coluna do funil" /></SelectTrigger><SelectContent><SelectItem value="auto"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />Primeira coluna do funil</span></SelectItem>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: stage.color || "currentColor" }} />{stage.name}</span></SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Distribuição dos leads</Label><Select value={cfg.distributionMode || "fixed"} onValueChange={(value) => { setCfg("distributionMode", value); if (value === "fixed" && form.crm_responsibles.length > 1) set("crm_responsibles", form.crm_responsibles.slice(0, 1)); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed"><span className="flex items-center gap-2"><UserRound className="h-4 w-4" />Responsável fixo</span></SelectItem><SelectItem value="balanced"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Distribuição inteligente</span></SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{cfg.distributionMode === "balanced" ? "Cada novo lead vai para o vendedor com menos leads recebidos por este formulário." : "Todos os leads serão direcionados ao mesmo responsável."}</p></div>
                  <div className="space-y-2"><Label>{cfg.distributionMode === "balanced" ? "Vendedores participantes" : "Responsável pelos leads"}</Label><FormResponsiblePicker members={members.filter((member) => member.status === "active")} value={form.crm_responsibles || []} onChange={(value) => set("crm_responsibles", value)} multiple={cfg.distributionMode === "balanced"} /></div>
                </div>
              </div>
            </div>}

            {step === 4 && <div>
              <SectionHeader icon={Bell} title="Notificações e rastreamento" description="Avise sua equipe e conecte as ferramentas de medição usadas pela empresa." />
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4"><div><p className="text-sm font-medium">Avisar por e-mail a cada novo lead</p><p className="mt-1 text-xs text-muted-foreground">A equipe recebe os dados enviados e um acesso direto ao CRM.</p></div><Switch checked={form.notify_enabled} onCheckedChange={(checked) => set("notify_enabled", checked)} /></div>
                {form.notify_enabled && <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><Label>Quem recebe</Label><FormResponsiblePicker members={members.filter((member) => member.status === "active")} value={form.notify_user_ids || []} onChange={(value) => set("notify_user_ids", value)} multiple /></div><div className="space-y-2"><Label>Prévia do e-mail</Label><FormEmailPreview formName={form.name} fields={fields} /></div></div>}
                <div className="border-t border-border pt-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><SlidersHorizontal className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Tags de acompanhamento</p><p className="text-xs text-muted-foreground">Opcional. Use apenas os identificadores fornecidos pelas plataformas.</p></div></div><div className="space-y-4"><div className="space-y-2"><Label>Meta Pixel</Label><Input value={cfg.metaPixelId || ""} onChange={(event) => setCfg("metaPixelId", event.target.value.replace(/\D/g, "").slice(0, 30))} placeholder="Ex.: 123456789012345" inputMode="numeric" /></div><div className="space-y-2"><Label>Google Tag Manager ou Google Ads</Label><Input value={cfg.googleTagId || ""} onChange={(event) => setCfg("googleTagId", event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 30))} placeholder="Ex.: GTM-XXXXXXX ou AW-XXXXXXXXX" /></div></div></div>
              </div>
            </div>}

            {step === 5 && <div>
              <SectionHeader icon={ShieldCheck} title="Salvar e publicar" description="Revise o endereço e escolha se o formulário poderá receber respostas agora." />
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-md border border-primary/20 bg-primary/5 p-4"><div><p className="text-sm font-semibold">Formulário {form.status === "active" ? "ativo" : "inativo"}</p><p className="mt-1 text-xs text-muted-foreground">{form.status === "active" ? "A página pública está pronta para receber novos leads." : "Ele será salvo como rascunho e não aceitará envios."}</p></div><Switch checked={form.status === "active"} onCheckedChange={(checked) => set("status", checked ? "active" : "draft")} /></div>
                <div className="rounded-md border border-border p-4"><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Link público</p></div><p className="mt-2 break-all text-sm text-muted-foreground">{publicUrl}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado."); }}><Copy className="h-4 w-4" />Copiar</Button>{isEdit && <Button size="sm" variant="outline" className="gap-2" onClick={() => window.open(publicUrl, "_blank")}><ExternalLink className="h-4 w-4" />Abrir</Button>}</div></div>
                <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">Campos ativos</p><p className="mt-1 text-xl font-semibold">{fields.filter((field) => field.is_active !== false).length}</p></div><div className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">CRM</p><p className="mt-1 text-sm font-semibold">{form.crm_enabled ? "Conectado" : "Desativado"}</p></div><div className="rounded-md border border-border p-4"><p className="text-xs text-muted-foreground">Aviso por e-mail</p><p className="mt-1 text-sm font-semibold">{form.notify_enabled ? `${form.notify_user_ids.length} destinatário(s)` : "Desativado"}</p></div></div>
              </div>
            </div>}
          </Card>

          <Collapsible open={previewOpen} onOpenChange={setPreviewOpen} className="mt-4">
            <CollapsibleTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Prévia do formulário</span><ChevronDown className={cn("h-4 w-4 transition-transform", previewOpen && "rotate-180")} /></Button></CollapsibleTrigger>
            <CollapsibleContent><Card className="mt-2 border-border/60 p-4 sm:p-6"><p className="mb-3 break-all text-xs text-muted-foreground">{publicUrl}</p><div className="mx-auto max-w-xl rounded-md p-5" style={{ backgroundColor: cfg.backgroundColor || "#f6f7f9" }}><div className="bg-card p-5" style={{ borderRadius: (cfg.radius ?? 10) + 4 }}><div style={{ textAlign: cfg.align || "left" }}>{cfg.logoUrl && <img src={cfg.logoUrl} alt="Logo" className="mb-4 h-9 max-w-[160px] object-contain" />}<p className="font-semibold" style={{ color: cfg.textColor || "#18181b" }}>{form.title || "Título do formulário"}</p><p className="mt-1 text-xs opacity-60" style={{ color: cfg.textColor || "#18181b" }}>{form.description || "A descrição aparecerá aqui."}</p></div><div className="mt-4 space-y-3">{fields.filter((field) => field.is_active !== false).map((field, index) => { const Icon = fieldIcon(field.field_type); return <div key={index}><p className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: cfg.textColor || "#18181b" }}><Icon className="h-3 w-3" />{field.label || `Campo ${index + 1}`}{field.required && " *"}</p><div className="mt-1 flex h-9 items-center border border-border bg-background px-3 text-[11px] text-muted-foreground" style={{ borderRadius: cfg.radius ?? 10 }}>{field.placeholder || "Exemplo da resposta"}</div></div>; })}{!fields.length && <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Adicione campos para montar sua prévia.</div>}</div><div className="mt-4 flex h-10 items-center justify-center text-xs font-semibold text-primary-foreground" style={{ backgroundColor: cfg.buttonColor || "#3daa57", borderRadius: cfg.radius ?? 10 }}>{form.button_text || "Enviar formulário"}</div></div></div></Card></CollapsibleContent>
          </Collapsible>
        </div>

        <div className="sticky bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-sm supports-[backdrop-filter]:bg-background/90">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="gap-2"><ArrowLeft className="h-4 w-4" />Voltar</Button>
            {step < STEPS.length - 1 ? <Button onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))} className="gap-2">Próximo<ArrowRight className="h-4 w-4" /></Button> : <Button onClick={save} disabled={saving || !canSave} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar formulário</Button>}
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoIcon() { return <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />; }
