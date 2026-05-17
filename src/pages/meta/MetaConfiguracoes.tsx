import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ShieldCheck, Loader2, Mail, Webhook, Copy, CheckCircle2, AlertTriangle, RefreshCw, XCircle, PlayCircle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Settings = {
  notify_number_disconnected: boolean;
  notify_quality_drop: boolean;
  notify_daily_summary: boolean;
  notify_campaign_issues: boolean;
  security_hmac_required: boolean;
  security_ip_allowlist: boolean;
  security_audit_log: boolean;
};

const DEFAULTS: Settings = {
  notify_number_disconnected: true,
  notify_quality_drop: true,
  notify_daily_summary: false,
  notify_campaign_issues: true,
  security_hmac_required: true,
  security_ip_allowlist: true,
  security_audit_log: true,
};

// Defina aqui a URL do vídeo (embed do YouTube/Vimeo/Loom). Deixe vazio para exibir o estado "Vídeo em breve".
const WEBHOOK_GUIDE_VIDEO_URL = "";

export default function MetaConfiguracoes() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = (searchParams.get("tab") === "notifications" || searchParams.get("tab") === "security") ? searchParams.get("tab")! : "webhook";
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<"ok" | "pending" | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("meta_user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          notify_number_disconnected: data.notify_number_disconnected,
          notify_quality_drop: data.notify_quality_drop,
          notify_daily_summary: data.notify_daily_summary,
          notify_campaign_issues: data.notify_campaign_issues,
          security_hmac_required: data.security_hmac_required,
          security_ip_allowlist: data.security_ip_allowlist,
          security_audit_log: data.security_audit_log,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    if (!user) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSaving(true);
    const { error } = await supabase
      .from("meta_user_settings")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar preferência");
      setSettings(settings);
    } else {
      toast.success("Preferência salva");
    }
  };

  const sendTestEmail = async () => {
    if (!user) return;
    setSendingTest(true);
    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        user_id: user.id,
        email_type: "META_NUMBER_DISCONNECTED",
        payload: {
          phone_number: "+55 11 90000-0000",
          business_name: "E-mail de teste",
        },
        idempotency_key: `meta-test-${user.id}-${Date.now()}`,
      },
    });
    setSendingTest(false);
    if (error) toast.error("Falha ao enviar e-mail de teste");
    else toast.success("E-mail de teste enviado! Verifique sua caixa de entrada.");
  };

  if (loading) {
    return (
      <MetaLayout title="Configurações" description="Preferências da operação Meta.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MetaLayout>
    );
  }

  return (
    <MetaLayout title="Configurações" description="Preferências da operação Meta.">
      <MetaPageHeader
        title="Configurações"
        description="Escolha quais alertas receber por e-mail e as regras de segurança da sua operação Meta."
        actions={
          webhookStatus ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                webhookStatus === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {webhookStatus === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              <span>{webhookStatus === "ok" ? "Webhooks ativos" : "Webhook obrigatório pendente"}</span>
            </div>
          ) : undefined
        }
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-muted/40">
          <TabsTrigger value="webhook">
            <Webhook size={13} className="mr-1.5" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell size={13} className="mr-1.5" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck size={13} className="mr-1.5" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhook" className="mt-5 space-y-4">
          <WebhookPanel onStatusChange={setWebhookStatus} />
        </TabsContent>


        <TabsContent value="notifications" className="mt-5 space-y-4">
          <Card className="p-5 border-border/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <p className="text-sm font-semibold">Alertas por e-mail</p>
                <p className="text-xs text-muted-foreground">
                  Os alertas são enviados para <strong>{user?.email}</strong>.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestEmail}
                disabled={sendingTest}
                className="gap-2"
              >
                {sendingTest ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                Enviar teste
              </Button>
            </div>
            <ToggleRow
              title="Número desconectado"
              desc="Avisar quando um número WhatsApp Meta perder a conexão (token expirado, etc.)"
              checked={settings.notify_number_disconnected}
              onChange={(v) => updateSetting("notify_number_disconnected", v)}
            />
            <ToggleRow
              title="Queda de qualidade do número"
              desc="Avisar quando o quality rating de um número cair (amarelo ou vermelho)"
              checked={settings.notify_quality_drop}
              onChange={(v) => updateSetting("notify_quality_drop", v)}
            />
            <ToggleRow
              title="Problemas em campanhas"
              desc="Falhas no início, pausas inesperadas ou alta taxa de erro nos disparos"
              checked={settings.notify_campaign_issues}
              onChange={(v) => updateSetting("notify_campaign_issues", v)}
            />
            <ToggleRow
              title="Resumo diário"
              desc="Receba todo dia às 18h um resumo das mensagens enviadas, lidas e respondidas"
              checked={settings.notify_daily_summary}
              onChange={(v) => updateSetting("notify_daily_summary", v)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5 space-y-4">
          <Card className="p-5 border-border/60 space-y-3">
            <div className="pb-2 border-b border-border/60">
              <p className="text-sm font-semibold">Proteções da integração Meta</p>
              <p className="text-xs text-muted-foreground">
                Recomendamos manter todas ativas. Elas protegem sua operação contra acessos indevidos.
              </p>
            </div>
            <ToggleRow
              title="Validação de assinatura (HMAC)"
              desc="Rejeitar webhooks que não vierem assinados pela Meta. Bloqueia payloads falsificados."
              checked={settings.security_hmac_required}
              onChange={(v) => updateSetting("security_hmac_required", v)}
            />
            <ToggleRow
              title="Allowlist de IPs da Meta"
              desc="Aceitar callbacks apenas de IPs oficiais da Meta. Bloqueia origens desconhecidas."
              checked={settings.security_ip_allowlist}
              onChange={(v) => updateSetting("security_ip_allowlist", v)}
            />
            <ToggleRow
              title="Registro de auditoria"
              desc="Registrar toda alteração crítica (conexões, tokens, campanhas) para consulta posterior."
              checked={settings.security_audit_log}
              onChange={(v) => updateSetting("security_audit_log", v)}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {saving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground bg-background/95 border border-border/60 rounded-md px-3 py-1.5 shadow">
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
        </div>
      )}
    </MetaLayout>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

type WebhookData = {
  callback_url: string;
  verify_token: string;
  required_events?: string[];
  connections: Array<{
    id: string;
    display_phone_number: string | null;
    business_name: string | null;
    status: string;
    webhook_verified_at: string | null;
  }>;
};

const EVENT_DETAILS: Record<string, { label: string; why: string; required: boolean }> = {
  messages: { label: "messages", why: "Receber mensagens no Chat, disparar fluxos, atualizar status de envio (enviado/entregue/lido/falha) e contar taxa de resposta.", required: true },
  message_template_status_update: { label: "message_template_status_update", why: "Saber quando um template é aprovado/rejeitado pela Meta. Sem isso as campanhas não sabem o status dos templates.", required: true },
  message_template_quality_update: { label: "message_template_quality_update", why: "Detectar queda de qualidade do template e bloquear envios em massa antes de tomar ban.", required: true },
  account_update: { label: "account_update", why: "Mudanças críticas da WABA (capacidade, limites, alertas). Necessário para alertas e métricas do dashboard.", required: true },
  account_review_update: { label: "account_review_update", why: "Alertas quando a Meta inicia revisão da sua conta (risco de bloqueio).", required: true },
  phone_number_quality_update: { label: "phone_number_quality_update", why: "Alerta de queda de quality rating do número (verde→amarelo→vermelho). Usado nas notificações e na taxa de erro do dashboard.", required: true },
  phone_number_name_update: { label: "phone_number_name_update", why: "Mudanças no display name do número (aprovação/rejeição).", required: true },
  business_capability_update: { label: "business_capability_update", why: "Aumentos/reduções do tier de mensagens (1k/10k/100k/ilimitado) — usado no dashboard.", required: true },
  security: { label: "security", why: "Eventos de segurança da conta (2FA, troca de PIN). Recomendado pela Meta.", required: true },
};


type ValidationState = { status: "idle" | "ok" | "error"; detail?: string };

function WebhookPanel({ onStatusChange }: { onStatusChange?: (s: "ok" | "pending" | null) => void }) {
  const [data, setData] = useState<WebhookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ValidationState>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke("meta-webhook-config", {
      body: { action: "info" },
    });
    setLoading(false);
    if (error) {
      toast.error("Falha ao carregar configuração do webhook");
      return;
    }
    const payload = res as WebhookData;
    setData(payload);
    if (onStatusChange) {
      if (payload.connections.length === 0) onStatusChange(null);
      else onStatusChange(payload.connections.every((c) => !!c.webhook_verified_at) ? "ok" : "pending");
    }
  };

  useEffect(() => { load(); }, []);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  };

  const validate = async (connectionId: string): Promise<boolean> => {
    setValidatingId(connectionId);
    const { data: res, error } = await supabase.functions.invoke("meta-webhook-config", {
      body: { action: "validate", connection_id: connectionId },
    });
    setValidatingId(null);
    const ok = !error && (res as any)?.ok;
    const detail = (res as any)?.detail ?? error?.message ?? "Falha desconhecida";
    setResults((r) => ({ ...r, [connectionId]: { status: ok ? "ok" : "error", detail } }));
    return ok;
  };

  const testAll = async () => {
    if (!data) return;
    setTestingAll(true);
    let okCount = 0;
    for (const c of data.connections) {
      const ok = await validate(c.id);
      if (ok) okCount++;
    }
    setTestingAll(false);
    await load();
    if (okCount === data.connections.length) {
      toast.success(`Todos os ${okCount} webhooks validados!`);
    } else {
      toast.error(`${data.connections.length - okCount} webhook(s) com erro. Verifique a configuração na Meta e tente novamente.`);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = [
    { n: 1, t: "Abra o Meta Business Manager", d: "Acesse business.facebook.com, vá em Configurações do Negócio, Contas, Apps, e selecione o App vinculado à sua WhatsApp Business Account." },
    { n: 2, t: "Vá em Webhooks (WhatsApp)", d: "No menu lateral do app, abra Webhooks. No seletor de objeto, escolha WhatsApp Business Account e clique em Configurar (ou Editar, se já existir)." },
    { n: 3, t: "Cole a Callback URL e o Verify Token", d: "Copie os dois valores do card Credenciais abaixo e cole nos campos correspondentes. Clique em Verificar e salvar. A Meta vai bater na URL e validar o token." },
    { n: 4, t: "Inscreva todos os eventos obrigatórios", d: `Em Webhook fields, Subscribe, marque TODOS os ${Object.keys(EVENT_DETAILS).length} eventos listados abaixo. Sem isso, partes do sistema (Chat, Campanhas, Métricas, Taxa de Resposta, Taxa de Erro) não funcionam corretamente.` },
    { n: 5, t: "Volte aqui e clique em Testar todos", d: "Disparamos um handshake real para cada número e confirmamos que a URL responde. Se algum falhar, fica vermelho. Corrija e teste de novo. Quando todos ficarem verdes, Chat e Campanhas são liberados automaticamente." },
  ];

  const allVerified = data.connections.length > 0 && data.connections.every((c) => !!c.webhook_verified_at);
  const eventsList = data.required_events && data.required_events.length > 0
    ? data.required_events
    : Object.keys(EVENT_DETAILS);

  return (
    <div className="space-y-4">
      {/* PASSO A PASSO */}
      <Card className="border-border/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-expanded={guideOpen}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Webhook className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Passo a passo de configuração</p>
                <Badge variant="secondary" className="text-[10px] font-medium h-5 px-1.5">
                  {Object.keys(EVENT_DETAILS).length} eventos
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {guideOpen
                  ? "Siga na ordem. Leva menos de 3 minutos."
                  : "Guia completo com print por print, vídeo e checklist dos eventos obrigatórios."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {guideOpen ? "Recolher" : "Expandir"}
            </span>
            <div className="h-8 w-8 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center transition-colors group-hover:bg-muted">
              <ChevronDown className={`h-4 w-4 text-foreground/70 transition-transform duration-300 ${guideOpen ? "rotate-180" : ""}`} />
            </div>
          </div>
        </button>

        {guideOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-border/60 bg-muted/10">
            <div className="pt-4">
        {guideOpen && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <Tabs defaultValue="guia" className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-xs">
                <TabsTrigger value="guia">Guia escrito</TabsTrigger>
                <TabsTrigger value="video">Vídeo</TabsTrigger>
              </TabsList>

              <TabsContent value="guia" className="mt-4">
                <ol className="space-y-3">
                  {steps.map((s) => (
                    <li key={s.n} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{s.t}</p>
                        <p className="text-xs text-muted-foreground">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="video" className="mt-4">
                {WEBHOOK_GUIDE_VIDEO_URL ? (
                  <div className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30" style={{ paddingTop: "56.25%" }}>
                    <iframe
                      src={WEBHOOK_GUIDE_VIDEO_URL}
                      title="Passo a passo do webhook"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center" style={{ paddingTop: "56.25%" }}>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
                      <PlayCircle className="h-10 w-10 text-muted-foreground/60" />
                      <p className="text-sm font-medium">Vídeo em breve</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Estamos gravando o tutorial em vídeo da configuração do webhook. Enquanto isso, siga o guia escrito ao lado.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Card>

      {/* CREDENCIAIS */}
      <Card className="p-5 border-border/60 space-y-4">
        <div className="pb-2 border-b border-border/60">
          <p className="text-sm font-semibold">Credenciais do webhook</p>
          <p className="text-xs text-muted-foreground">Cole estes valores na configuração do webhook na Meta.</p>
        </div>

        <Field label="Callback URL" value={data.callback_url} onCopy={() => copy("URL", data.callback_url)} />
        <Field label="Verify Token" value={data.verify_token} mono onCopy={() => copy("Token", data.verify_token)} />
      </Card>

      {/* EVENTOS OBRIGATÓRIOS */}
      <Card className="p-5 border-border/60 space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Eventos obrigatórios</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marque TODOS os eventos abaixo em Webhook fields, Subscribe. Cada um habilita uma parte do sistema.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
            {eventsList.length} eventos
          </Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {eventsList.map((ev) => {
            const meta = EVENT_DETAILS[ev] ?? { label: ev, why: "Recomendado pela Meta.", required: true };
            return (
              <div key={ev} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <code className="text-xs font-mono font-semibold text-foreground break-all">{meta.label}</code>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{meta.why}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Faltou marcar algum? A Meta não envia o evento e o sistema não consegue exibir taxa de resposta, taxa de erro, quality rating, status de templates nem mensagens recebidas no Chat.</span>
        </div>
      </Card>

      {/* TESTE / VALIDAÇÃO */}
      <Card className="p-5 border-border/60 space-y-3">
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold">Teste e validação por número</p>
            <p className="text-xs text-muted-foreground">
              Disparamos um handshake real na Meta para cada número. Quando todos passarem, Chat e Campanhas são liberados automaticamente para esses números.
            </p>
          </div>
          {data.connections.length > 0 && (
            <Button size="sm" onClick={testAll} disabled={testingAll || !!validatingId} className="gap-1.5 shrink-0">
              {testingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Testar todos
            </Button>
          )}
        </div>

        {data.connections.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            Nenhum número Meta conectado ainda.
          </div>
        ) : (
          data.connections.map((c) => {
            const verified = !!c.webhook_verified_at;
            const r = results[c.id];
            const errored = r?.status === "error";
            const borderClass = errored
              ? "border-destructive bg-destructive/5"
              : r?.status === "ok" || verified
                ? "border-emerald-500/30"
                : "border-border/60";
            return (
              <div key={c.id} className={`rounded-lg border p-3 space-y-2 transition-colors ${borderClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium truncate">{c.display_phone_number ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.business_name ?? "Sem nome"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {errored ? (
                      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive border-destructive/30">
                        <XCircle className="h-3 w-3" /> Erro
                      </Badge>
                    ) : verified ? (
                      <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Validado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <AlertTriangle className="h-3 w-3" /> Pendente
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={errored ? "destructive" : "outline"}
                      onClick={async () => { await validate(c.id); load(); }}
                      disabled={validatingId === c.id || testingAll}
                      className="gap-1.5"
                    >
                      {validatingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {errored ? "Tentar de novo" : verified ? "Revalidar" : "Validar"}
                    </Button>
                  </div>
                </div>
                {errored && r?.detail && (
                  <p className="text-xs text-destructive flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="break-all">{r.detail}</span>
                  </p>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy: () => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className={`flex-1 px-3 py-2 rounded-md bg-muted/40 border border-border/60 text-xs truncate ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </code>
        <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5">
          <Copy className="h-3 w-3" /> Copiar
        </Button>
      </div>
    </div>
  );
}
