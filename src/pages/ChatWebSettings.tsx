import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Loader2, Upload, Check, X, Globe, Power, MessageSquare, Code2, BarChart3, History, Palette, AlertTriangle, LayoutTemplate, MousePointerClick, ShieldCheck, Users, CheckCircle2, XCircle, Clock, Timer, Bot, UserPlus, Headphones, Activity, TrendingUp, Info, type LucideIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/chatweb/ChatWebShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatWebWindow, type ChatWebMessage } from "@/components/chatweb/ChatWebWindow";
import {
  chatwebLink, chatwebIssues, inlineEmbedCode, normalizeSlug, optimizeAvatar, readTheme, slugProblem, widgetEmbedCode,
  type ChatWebTheme, type InlineEmbedOptions, type WidgetEmbedOptions,
} from "@/lib/chatweb";
import { cn } from "@/lib/utils";

const copy = async (v: string, msg = "Copiado!") => { await navigator.clipboard.writeText(v); toast.success(msg); };

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon?: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {Icon && <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={14} /></span>}
      </div>
      <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, step }: { icon: LucideIcon; title: string; desc: string; step?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={18} /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-2"><p className="font-medium text-foreground">{title}</p>{step && <Badge variant="secondary" className="text-[10px]">{step}</Badge>}</div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function CodeBox({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Code2 size={13} />HTML</span>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCopy}><Copy size={13} className="mr-1.5" />Copiar código</Button>
      </div>
      <pre className="p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all bg-card text-foreground font-mono">{code}</pre>
    </div>
  );
}

export default function ChatWebSettings() {
  const { id: flowId = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["chatweb-config", flowId],
    queryFn: async () => {
      const [{ data: flow }, { data: cfg }, { data: nodes }] = await Promise.all([
        supabase.from("wa_automation_flows").select("id,name,status,owner_user_id,user_id").eq("id", flowId).maybeSingle(),
        supabase.from("chatweb_configurations").select("*").eq("flow_id", flowId).maybeSingle(),
        supabase.from("wa_flow_nodes").select("id,node_type,name,config").eq("flow_id", flowId),
      ]);
      return { flow, cfg, nodes: nodes || [] };
    },
  });
  const cfg = data?.cfg as any;
  const flow = data?.flow as any;

  // ----- rascunho da aparência (prévia ao vivo, salva só no botão) -----
  const [draft, setDraft] = useState({ display_name: "", description: "", welcome_message: "", input_placeholder: "", theme: readTheme({}) as ChatWebTheme });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{ main: Blob; thumb: Blob } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cfg) return;
    setDraft({
      display_name: cfg.display_name || "", description: cfg.description || "", welcome_message: cfg.welcome_message || "",
      input_placeholder: cfg.input_placeholder || "", theme: readTheme(cfg.theme_config),
    });
    setSlugInput(cfg.slug);
    setDomains((cfg.allowed_domains || []).join("\n"));
    if (cfg.avatar_path) supabase.storage.from("chatweb-avatars").createSignedUrl(cfg.avatar_path, 3600).then(({ data }) => setAvatarPreview(data?.signedUrl || null));
  }, [cfg]);

  const update = async (patch: Record<string, any>, msg = "Salvo!") => {
    const { error } = await supabase.from("chatweb_configurations").update(patch).eq("id", cfg.id);
    if (error) {
      toast.error(error.code === "23505" || error.message.includes("slug_taken") ? "Este endereço já está sendo utilizado. Escolha outro." : error.message.includes("reserved") ? "Este endereço é reservado. Escolha outro." : "Não foi possível salvar.");
      return false;
    }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["chatweb-config", flowId] });
    qc.invalidateQueries({ queryKey: ["chatweb-list"] });
    return true;
  };

  const pickAvatar = async (f?: File) => {
    if (!f) return;
    try {
      const out = await optimizeAvatar(f);
      setAvatarFile(out);
      setAvatarPreview(URL.createObjectURL(out.main));
      toast.success(`Foto otimizada: ${Math.round(out.main.size / 1024)} KB`);
    } catch (e: any) { toast.error(e.message); }
  };

  const saveAppearance = async () => {
    setSaving(true);
    try {
      let avatar_path = cfg.avatar_path;
      if (avatarFile) {
        const ext = avatarFile.main.type === "image/webp" ? "webp" : "jpg";
        const stamp = Date.now();
        avatar_path = `${cfg.owner_user_id}/${cfg.id}/avatar-${stamp}.${ext}`;
        const up = await supabase.storage.from("chatweb-avatars").upload(avatar_path, avatarFile.main, { contentType: avatarFile.main.type, cacheControl: "31536000" });
        if (up.error) throw up.error;
        await supabase.storage.from("chatweb-avatars").upload(`${cfg.owner_user_id}/${cfg.id}/thumb-${stamp}.${ext}`, avatarFile.thumb, { contentType: avatarFile.thumb.type, cacheControl: "31536000" });
      }
      const ok = await update({
        display_name: draft.display_name.slice(0, 60) || "Atendimento", description: draft.description.slice(0, 120) || null,
        welcome_message: draft.welcome_message.slice(0, 500) || null, input_placeholder: draft.input_placeholder.slice(0, 80) || null,
        theme_config: draft.theme, avatar_path,
      }, "Personalização salva!");
      if (ok) setAvatarFile(null);
    } catch { toast.error("Falha ao enviar a foto."); } finally { setSaving(false); }
  };

  // ----- endereço -----
  const [slugInput, setSlugInput] = useState("");
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const normalized = normalizeSlug(slugInput);
  useEffect(() => {
    if (!cfg || normalized === cfg.slug) { setSlugState("idle"); return; }
    if (slugProblem(normalized)) { setSlugState("invalid"); return; }
    setSlugState("checking");
    const t = setTimeout(async () => {
      const { data: ok } = await supabase.rpc("chatweb_slug_available", { _slug: normalized, _config_id: cfg.id });
      setSlugState(ok ? "ok" : "taken");
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, cfg]);

  // ----- incorporação -----
  const [inline, setInline] = useState<InlineEmbedOptions>({ width: "100%", height: "640px", minHeight: "420px", radius: 16, border: true, margin: "0" });
  const [widget, setWidget] = useState<WidgetEmbedOptions>({ position: "right", color: "#16a34a", label: "Fale conosco" });
  const [domains, setDomains] = useState("");
  useEffect(() => { if (cfg) setWidget((w) => ({ ...w, color: readTheme(cfg.theme_config).primary })); }, [cfg]);

  // ----- estatísticas -----
  const [period, setPeriod] = useState("30");
  const { data: stats } = useQuery({
    queryKey: ["chatweb-stats", flowId, period, cfg?.owner_user_id],
    enabled: !!cfg,
    queryFn: async () => {
      const from = subDays(new Date(), Number(period)).toISOString();
      const to = new Date(Date.now() + 60_000).toISOString();
      const [{ data: rows }, { count: aiCount }, { data: sess }] = await Promise.all([
        supabase.rpc("chatweb_flow_stats", { _owner: cfg.owner_user_id, _from: from, _to: to }),
        supabase.from("ai_usage_logs").select("id", { count: "exact", head: true }).eq("channel", "chatweb").eq("feature", "wa_flow_ai_agent").gte("created_at", from).contains("metadata", { flow_id: flowId }),
        supabase.from("chatweb_sessions").select("id,status,lead_id,started_at,origin").eq("config_id", cfg.id).gte("started_at", from),
      ]);
      const mine = (rows || []).filter((r: any) => r.flow_id === flowId);
      return { web: mine.find((r: any) => r.channel === "chatweb"), wa: mine.find((r: any) => r.channel === "whatsapp"), ai: aiCount || 0, sessions: sess || [] };
    },
  });

  // ----- sessões -----
  const [openSession, setOpenSession] = useState<string | null>(null);
  const { data: sessions } = useQuery({
    queryKey: ["chatweb-sessions", cfg?.id],
    enabled: !!cfg,
    queryFn: async () => (await supabase.from("chatweb_sessions").select("id,status,origin,started_at,last_activity_at,lead_id,context").eq("config_id", cfg.id).order("started_at", { ascending: false }).limit(50)).data || [],
  });
  const { data: sessionMsgs } = useQuery({
    queryKey: ["chatweb-session-msgs", openSession],
    enabled: !!openSession,
    queryFn: async () => (await supabase.from("chatweb_messages").select("*").eq("session_id", openSession!).order("created_at")).data || [],
  });

  const issues = useMemo(() => chatwebIssues(data?.nodes || []), [data?.nodes]);
  const previewMsgs: ChatWebMessage[] = useMemo(() => {
    const now = new Date().toISOString();
    return [
      ...(draft.welcome_message ? [{ id: "w", sender_type: "bot" as const, message_type: "text", content: draft.welcome_message, created_at: now }] : []),
      { id: "o", sender_type: "bot", message_type: "options", content: "Como podemos ajudar?", created_at: now, metadata: { options: [{ id: "1", title: "Conhecer planos" }, { id: "2", title: "Suporte técnico" }, { id: "3", title: "Falar com vendas" }] } },
      { id: "v", sender_type: "visitor", message_type: "text", content: "Quero conhecer os planos 😊", created_at: now },
    ];
  }, [draft.welcome_message]);

  if (isLoading) return <AppLayout><div className="p-10 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!flow || !cfg) {
    return (
      <AppLayout>
        <div className="p-10 text-center space-y-3">
          <p className="text-muted-foreground">Este fluxo ainda não tem ChatWeb. Ative pelo menu ⋮ na lista de fluxos.</p>
          <Button variant="outline" onClick={() => navigate("/fluxos")}>Voltar aos fluxos</Button>
        </div>
      </AppLayout>
    );
  }

  const link = chatwebLink(cfg.slug);
  const web = stats?.web as any; const wa = stats?.wa as any;
  const pct = (a?: number, b?: number) => (b ? `${Math.round(((a || 0) / b) * 100)}%` : "—");
  const mins = (s?: number) => (s ? `${Math.max(1, Math.round(s / 60))} min` : "—");

  const preview = (
    <div className="h-[560px] rounded-2xl overflow-hidden border border-border shadow-sm">
      <ChatWebWindow name={draft.display_name || "Atendimento"} description={draft.description} avatarUrl={avatarPreview} theme={draft.theme}
        placeholder={draft.input_placeholder} messages={previewMsgs} onSend={() => {}} onOption={() => {}} />
    </div>
  );

  const colorField = (key: keyof ChatWebTheme, label: string) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label className="text-sm font-normal">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={draft.theme[key] as string} onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, [key]: e.target.value } }))} className="h-8 w-24 font-mono text-xs" />
        <input type="color" aria-label={label} value={draft.theme[key] as string} onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, [key]: e.target.value } }))} className="h-8 w-10 rounded border border-border bg-transparent cursor-pointer" />
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fluxos")} aria-label="Voltar"><ArrowLeft size={18} /></Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">ChatWeb</h1>
              <Badge variant={cfg.enabled ? "default" : "secondary"}>{cfg.enabled ? "Ativo" : "Desativado"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">Fluxo: {flow.name}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/fluxos/${flowId}`)}>Editar fluxo</Button>
          <Button variant={cfg.enabled ? "outline" : "default"} onClick={() => update({ enabled: !cfg.enabled }, cfg.enabled ? "ChatWeb desativado. O fluxo continua intacto." : "ChatWeb ativado!")}>
            <Power size={15} className="mr-2" />{cfg.enabled ? "Desativar" : "Ativar"}
          </Button>
        </div>

        {flow.status !== "active" && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm">
            <AlertTriangle size={16} className="text-muted-foreground mt-0.5" />
            <p>O fluxo está como <b>{flow.status === "draft" ? "rascunho" : flow.status}</b>. O ChatWeb funciona mesmo assim, mas revise o fluxo antes de divulgar o link.</p>
          </div>
        )}

        <Tabs defaultValue="geral">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="geral"><Globe size={14} className="mr-1.5" />Geral</TabsTrigger>
            <TabsTrigger value="aparencia"><Palette size={14} className="mr-1.5" />Aparência</TabsTrigger>
            <TabsTrigger value="link"><ExternalLink size={14} className="mr-1.5" />Link do atendimento</TabsTrigger>
            <TabsTrigger value="embed"><Code2 size={14} className="mr-1.5" />Incorporar no site</TabsTrigger>
            <TabsTrigger value="sessoes"><History size={14} className="mr-1.5" />Sessões e histórico</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 size={14} className="mr-1.5" />Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-6">
            <div className="grid lg:grid-cols-[1fr_380px] gap-6">
              <div className="space-y-6">
                <Card><CardContent className="p-5 space-y-3">
                  <Label>Seu link exclusivo</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={link} className="font-mono text-sm" />
                    <Button variant="outline" onClick={() => copy(link, "Link copiado!")}><Copy size={15} className="mr-2" />Copiar</Button>
                    <Button variant="outline" onClick={() => window.open(link, "_blank", "noopener")}><ExternalLink size={15} className="mr-2" />Visualizar</Button>
                  </div>
                </CardContent></Card>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Sessões (30 dias)" value={stats?.sessions.length ?? "—"} />
                  <Stat label="Concluídas" value={web?.completed ?? 0} />
                  <Stat label="Em andamento" value={web?.in_progress ?? 0} />
                  <Stat label="Leads gerados" value={web?.leads ?? 0} />
                </div>
                <Card><CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div><Label>Ao desativar, encerrar conversas abertas</Label><p className="text-xs text-muted-foreground mt-0.5">Se desligado, quem já está conversando pode terminar o atendimento.</p></div>
                    <Switch checked={cfg.disable_policy === "close"} onCheckedChange={(v) => update({ disable_policy: v ? "close" : "keep_open" })} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div><Label>Expiração da sessão</Label><p className="text-xs text-muted-foreground mt-0.5">Tempo sem atividade até a conversa ser encerrada.</p></div>
                    <Select value={String(cfg.session_ttl_minutes)} onValueChange={(v) => update({ session_ttl_minutes: Number(v) })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 hora</SelectItem><SelectItem value="360">6 horas</SelectItem>
                        <SelectItem value="1440">24 horas</SelectItem><SelectItem value="10080">7 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent></Card>
                <Card><CardContent className="p-5 space-y-3">
                  <p className="font-medium text-sm">Compatibilidade dos blocos</p>
                  {issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2"><Check size={15} className="text-primary" />Todos os blocos deste fluxo funcionam no ChatWeb.</p>
                  ) : issues.map((i) => (
                    <div key={i.nodeId + i.message} className="flex gap-2 text-sm">
                      <AlertTriangle size={15} className={cn("mt-0.5 shrink-0", i.level === "error" ? "text-destructive" : "text-muted-foreground")} />
                      <p><b>{i.nodeName}:</b> {i.message}</p>
                    </div>
                  ))}
                </CardContent></Card>
              </div>
              {preview}
            </div>
          </TabsContent>

          <TabsContent value="aparencia" className="mt-6">
            <div className="grid lg:grid-cols-[1fr_380px] gap-6">
              <Card><CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-4">
                  {avatarPreview ? <img src={avatarPreview} alt="" className="h-16 w-16 rounded-full object-cover border border-border" /> : <div className="h-16 w-16 rounded-full bg-muted" />}
                  <div>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload size={14} className="mr-2" />Enviar foto</Button>
                    <p className="text-xs text-muted-foreground mt-1">Otimizamos automaticamente (256×256, WebP, ~30–100 KB).</p>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Nome de exibição</Label><Input maxLength={60} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Descrição</Label><Input maxLength={120} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Respondemos em minutos" /></div>
                </div>
                <div className="space-y-1.5"><Label>Mensagem de boas-vindas</Label><Textarea maxLength={500} rows={2} value={draft.welcome_message} onChange={(e) => setDraft({ ...draft, welcome_message: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Texto do campo de digitação</Label><Input maxLength={80} value={draft.input_placeholder} onChange={(e) => setDraft({ ...draft, input_placeholder: e.target.value })} /></div>
                <div className="grid sm:grid-cols-2 gap-x-8 border-t border-border pt-4">
                  {colorField("primary", "Cor principal")}
                  {colorField("secondary", "Cor secundária")}
                  {colorField("sentBubble", "Balões enviados")}
                  {colorField("receivedBubble", "Balões recebidos")}
                  {colorField("text", "Textos")}
                  {colorField("background", "Fundo")}
                </div>
                <div className="space-y-1.5">
                  <Label>Ícone do chat</Label>
                  <Select value={draft.theme.icon} onValueChange={(v: any) => setDraft({ ...draft, theme: { ...draft.theme, icon: v } })}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="message">Balão de conversa</SelectItem><SelectItem value="sparkles">Brilho (IA)</SelectItem><SelectItem value="headset">Atendente</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button onClick={saveAppearance} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar personalização</Button>
              </CardContent></Card>
              {preview}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-6">
            <Card className="max-w-2xl"><CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Final do endereço</Label>
                <div className="flex items-center rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="px-3 text-sm text-muted-foreground bg-muted h-10 flex items-center whitespace-nowrap">{window.location.host}/c/</span>
                  <input className="flex-1 h-10 px-2 bg-transparent outline-none text-sm" value={slugInput} onChange={(e) => setSlugInput(e.target.value)} aria-label="Final do endereço" />
                </div>
                <p className="text-xs text-muted-foreground">Ficará: <span className="font-mono">{normalized || "…"}</span></p>
                {slugState === "checking" && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" />Verificando…</p>}
                {slugState === "ok" && <p className="text-sm text-primary flex items-center gap-1.5"><Check size={14} />Endereço disponível.</p>}
                {slugState === "taken" && <p className="text-sm text-destructive flex items-center gap-1.5"><X size={14} />Este endereço já está sendo utilizado. Escolha outro.</p>}
                {slugState === "invalid" && <p className="text-sm text-destructive flex items-center gap-1.5"><X size={14} />Use de 3 a 48 letras, números ou hífens (algumas palavras são reservadas).</p>}
              </div>
              <p className="text-xs text-muted-foreground">Ao trocar, o endereço antigo fica reservado para você e não poderá ser usado por outra empresa — mas deixará de abrir este chat.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={slugState !== "ok"} onClick={() => update({ slug: normalized }, "Endereço atualizado!")}>Salvar endereço</Button>
                <Button variant="outline" onClick={() => copy(link, "Link copiado!")}><Copy size={15} className="mr-2" />Copiar link</Button>
                <Button variant="outline" onClick={() => window.open(link, "_blank", "noopener")}><ExternalLink size={15} className="mr-2" />Visualizar atendimento</Button>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="embed" className="mt-6 space-y-6">
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: LayoutTemplate, t: "1. Escolha o formato", d: "Chat na página ou botão flutuante." },
                { icon: Copy, t: "2. Copie o código", d: "Ajuste tamanho e cor antes de copiar." },
                { icon: Globe, t: "3. Cole no seu site", d: "Funciona em WordPress, Wix, HTML e outros." },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                  <x.icon size={18} className="text-primary shrink-0 mt-0.5" />
                  <div><p className="text-sm font-medium text-foreground">{x.t}</p><p className="text-xs text-muted-foreground">{x.d}</p></div>
                </div>
              ))}
            </div>
            <Card><CardContent className="p-5 space-y-5">
              <SectionHead icon={LayoutTemplate} title="Chat dentro de uma página" step="Incorporado" desc="Ideal para páginas de contato, suporte ou vendas. Cole o código onde o chat deve aparecer." />
              <div className="grid sm:grid-cols-5 gap-3">
                {(["width", "height", "minHeight", "margin"] as const).map((k) => (
                  <div key={k} className="space-y-1"><Label className="text-xs">{{ width: "Largura", height: "Altura", minHeight: "Altura mínima", margin: "Margens" }[k]}</Label><Input value={inline[k]} onChange={(e) => setInline({ ...inline, [k]: e.target.value })} /></div>
                ))}
                <div className="space-y-1"><Label className="text-xs">Cantos (px)</Label><Input type="number" value={inline.radius} onChange={(e) => setInline({ ...inline, radius: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={inline.border} onCheckedChange={(v) => setInline({ ...inline, border: v })} /><Label className="font-normal">Mostrar borda</Label></div>
              <CodeBox code={inlineEmbedCode(cfg.slug, inline)} onCopy={() => copy(inlineEmbedCode(cfg.slug, inline), "Código copiado!")} />
            </CardContent></Card>
            <Card><CardContent className="p-5 space-y-5">
              <SectionHead icon={MousePointerClick} title="Botão flutuante" step="Mais usado" desc="Um botão no canto do site que abre o chat. Cole antes do fechamento da tag </body>." />
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Posição</Label>
                  <Select value={widget.position} onValueChange={(v: any) => setWidget({ ...widget, position: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="right">Inferior direita</SelectItem><SelectItem value="left">Inferior esquerda</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Cor</Label>
                  <div className="flex gap-2"><input type="color" aria-label="Escolher cor" value={/^#[0-9a-f]{6}$/i.test(widget.color) ? widget.color : "#000000"} onChange={(e) => setWidget({ ...widget, color: e.target.value })} className="h-10 w-12 rounded-md border border-input bg-background p-1 cursor-pointer" /><Input value={widget.color} onChange={(e) => setWidget({ ...widget, color: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Texto do botão (opcional)</Label><Input maxLength={40} value={widget.label} onChange={(e) => setWidget({ ...widget, label: e.target.value })} /></div>
              </div>
              <div className="relative h-28 rounded-xl border border-dashed border-border bg-muted/40 overflow-hidden">
                <span className="absolute top-3 left-3 text-[11px] text-muted-foreground">Prévia no seu site</span>
                <div className={cn("absolute bottom-3 flex items-center gap-2", widget.position === "left" ? "left-3" : "right-3")}>
                  {widget.label && <span className="rounded-full bg-card border border-border px-3 py-1 text-xs text-foreground shadow-sm">{widget.label}</span>}
                  <span className="h-11 w-11 rounded-full flex items-center justify-center text-primary-foreground shadow-sm" style={{ background: widget.color }}><MessageSquare size={18} /></span>
                </div>
              </div>
              <CodeBox code={widgetEmbedCode(cfg.slug, widget)} onCopy={() => copy(widgetEmbedCode(cfg.slug, widget), "Código copiado!")} />
            </CardContent></Card>
            <Card><CardContent className="p-5 space-y-4">
              <SectionHead icon={ShieldCheck} title="Sites autorizados" desc="Opcional. Um domínio por linha (ex.: minhaempresa.com.br). Vazio = qualquer site pode incorporar." />
              <Textarea rows={3} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="minhaempresa.com.br" />
              <Button variant="outline" onClick={() => {
                const list = Array.from(new Set(domains.split(/[\s,]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")).filter((d) => /^(\*\.)?[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))).slice(0, 20);
                update({ allowed_domains: list }, "Sites autorizados salvos!");
              }}><ShieldCheck size={15} className="mr-2" />Salvar sites</Button>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="sessoes" className="mt-6">
            <div className="grid lg:grid-cols-[1fr_380px] gap-6">
              <Card><CardContent className="p-0 divide-y divide-border">
                {(sessions || []).length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">Nenhuma conversa ainda.</p>}
                {(sessions || []).map((s: any) => (
                  <button key={s.id} onClick={() => setOpenSession(s.id)} className={cn("w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50", openSession === s.id && "bg-muted/60")}>
                    <MessageSquare size={16} className="text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{format(new Date(s.started_at), "dd MMM, HH:mm", { locale: ptBR })} · <span className="text-muted-foreground">{s.origin || "link"}</span></p>
                      {s.status === "handoff" && <p className="text-xs text-muted-foreground truncate">Aguardando atendente — {s.context?.handoff?.reason}</p>}
                    </div>
                    <Badge variant="secondary">{{ active: "Em andamento", completed: "Concluída", abandoned: "Abandonada", handoff: "Atendente", closed: "Encerrada" }[s.status as string] || s.status}</Badge>
                    {s.lead_id && <Badge variant="outline">Lead</Badge>}
                  </button>
                ))}
              </CardContent></Card>
              <div className="h-[560px] rounded-2xl overflow-hidden border border-border">
                {openSession ? (
                  <ChatWebWindow name={cfg.display_name} avatarUrl={avatarPreview} theme={readTheme(cfg.theme_config)} messages={(sessionMsgs || []) as any} onSend={() => {}} disabled status="closed" />
                ) : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Selecione uma conversa</div>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-6 space-y-5">
            {(() => {
              const list: any[] = stats?.sessions || [];
              const total = list.length;
              const count = (st: string) => list.filter((x) => x.status === st).length;
              const leads = list.filter((x) => x.lead_id).length;
              const handoff = count("handoff");
              const days = Number(period);
              const buckets = Array.from({ length: days }, (_, i) => format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd"));
              const perDay = buckets.map((d) => list.filter((x) => String(x.started_at).slice(0, 10) === d).length);
              const max = Math.max(1, ...perDay);
              const origins: [string, number][] = (Object.entries(list.reduce((m: Record<string, number>, x) => { const k = x.origin || "link"; m[k] = (m[k] || 0) + 1; return m; }, {})) as [string, number][]).sort((a, b) => b[1] - a[1]);
              const originName: Record<string, string> = { link: "Link direto", embed: "Chat na página", inline: "Chat na página", widget: "Botão flutuante" };
              const funnel = [
                { l: "Sessões abertas", v: total, icon: Users },
                { l: "Conversas iniciadas", v: Number(web?.sessions || 0), icon: MessageSquare },
                { l: "Concluídas", v: Number(web?.completed || 0), icon: CheckCircle2 },
                { l: "Leads gerados", v: leads, icon: UserPlus },
              ];
              const fmax = Math.max(1, ...funnel.map((f) => f.v));
              return (<>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-medium text-foreground">Desempenho do ChatWeb</p><p className="text-sm text-muted-foreground">Acompanhe como os visitantes usam seu atendimento web.</p></div>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat icon={Users} label="Total de sessões" value={total} hint="Visitantes que abriram o chat" />
                  <Stat icon={TrendingUp} label="Taxa de conclusão" value={pct(web?.completed, web?.sessions)} hint="Chegaram ao fim do fluxo" />
                  <Stat icon={UserPlus} label="Leads gerados" value={leads} hint={total ? `${Math.round((leads / total) * 100)}% das sessões` : "Enviados ao CRM"} />
                  <Stat icon={Timer} label="Tempo médio" value={mins(Number(web?.avg_seconds))} hint="Duração da conversa" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Stat icon={MessageSquare} label="Conversas iniciadas" value={web?.sessions ?? 0} />
                  <Stat icon={CheckCircle2} label="Concluídas" value={web?.completed ?? 0} />
                  <Stat icon={Activity} label="Em andamento" value={web?.in_progress ?? 0} />
                  <Stat icon={XCircle} label="Abandonadas" value={count("abandoned") + Number(web?.abandoned || 0)} />
                  <Stat icon={Headphones} label="Com atendente" value={handoff} />
                </div>
                <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
                  <Card><CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4"><p className="font-medium">Sessões por dia</p><span className="text-xs text-muted-foreground">Pico: {Math.max(0, ...perDay)}</span></div>
                    <div className="flex items-end gap-[2px] h-40">
                      {perDay.map((v, i) => (
                        <div key={i} className="flex-1 h-full flex items-end group relative">
                          <div className="w-full rounded-t bg-primary/80 group-hover:bg-primary transition-colors" style={{ height: `${Math.max(v ? 6 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} />
                          <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-foreground text-background text-[10px] px-1.5 py-0.5 whitespace-nowrap z-10">{format(new Date(buckets[i] + "T12:00"), "dd/MM")}: {v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2"><span>{format(new Date(buckets[0] + "T12:00"), "dd/MM")}</span><span>Hoje</span></div>
                  </CardContent></Card>
                  <Card><CardContent className="p-5 space-y-3">
                    <p className="font-medium">Funil de conversão</p>
                    {funnel.map((f) => (
                      <div key={f.l} className="space-y-1">
                        <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted-foreground"><f.icon size={14} />{f.l}</span><span className="font-medium tabular-nums">{f.v}</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(f.v / fmax) * 100}%` }} /></div>
                      </div>
                    ))}
                  </CardContent></Card>
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card><CardContent className="p-5 space-y-3">
                    <p className="font-medium">De onde vêm os visitantes</p>
                    {origins.length === 0 ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Info size={14} />Sem sessões no período.</p> : origins.map(([k, v]) => (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">{originName[k] || k}</span><span className="tabular-nums">{v} · {Math.round((v / total) * 100)}%</span></div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(v / total) * 100}%` }} /></div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"><Bot size={14} />Respostas de IA no período: <b className="text-foreground">{stats?.ai ?? 0}</b></div>
                  </CardContent></Card>
                  <Card><CardContent className="p-5">
                    <p className="font-medium mb-3">ChatWeb x WhatsApp (mesmo fluxo)</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-muted-foreground text-left"><th className="py-1.5 font-normal">Indicador</th><th className="font-normal"><span className="flex items-center gap-1"><Globe size={13} />ChatWeb</span></th><th className="font-normal"><span className="flex items-center gap-1"><MessageSquare size={13} />WhatsApp</span></th></tr></thead>
                      <tbody className="divide-y divide-border">
                        <tr><td className="py-2.5">Execuções</td><td className="tabular-nums">{web?.sessions ?? 0}</td><td className="tabular-nums">{wa?.sessions ?? 0}</td></tr>
                        <tr><td className="py-2.5">Concluídas</td><td className="tabular-nums">{web?.completed ?? 0}</td><td className="tabular-nums">{wa?.completed ?? 0}</td></tr>
                        <tr><td className="py-2.5">Taxa de conclusão</td><td>{pct(web?.completed, web?.sessions)}</td><td>{pct(wa?.completed, wa?.sessions)}</td></tr>
                        <tr><td className="py-2.5"><span className="flex items-center gap-1"><Clock size={13} />Tempo médio</span></td><td>{mins(Number(web?.avg_seconds))}</td><td>{mins(Number(wa?.avg_seconds))}</td></tr>
                      </tbody>
                    </table>
                  </CardContent></Card>
                </div>
              </>);
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
