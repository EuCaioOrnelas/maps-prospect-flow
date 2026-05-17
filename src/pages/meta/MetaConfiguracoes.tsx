import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ShieldCheck, Loader2, Mail, Webhook, Copy, CheckCircle2, AlertTriangle, RefreshCw, XCircle, PlayCircle, ChevronDown, KeyRound, ListChecks, WifiOff, TrendingDown, Megaphone, BarChart3, Send, FlaskConical, Lock, Shield, FileCheck2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  const [testDialogOpen, setTestDialogOpen] = useState(false);
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

  // Test sending handled inside MetaTestEmailsDialog

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
        titleBadge={
          webhookStatus ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                webhookStatus === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {webhookStatus === "ok" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
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
          <Card className="border-border/60 overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border/60 bg-muted/20">
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alertas por e-mail
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enviados para <strong className="text-foreground">{user?.email}</strong>. Você controla cada tipo individualmente.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestDialogOpen(true)}
                className="gap-2 shrink-0"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Testar alertas
              </Button>
            </div>
            <div className="divide-y divide-border/60">
              <ToggleRow
                icon={WifiOff}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                title="Número desconectado"
                desc="Avisar quando um número WhatsApp Meta perder a conexão (token expirado, etc.)"
                checked={settings.notify_number_disconnected}
                onChange={(v) => updateSetting("notify_number_disconnected", v)}
              />
              <ToggleRow
                icon={TrendingDown}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                title="Queda de qualidade do número"
                desc="Avisar quando o quality rating de um número cair (amarelo ou vermelho)"
                checked={settings.notify_quality_drop}
                onChange={(v) => updateSetting("notify_quality_drop", v)}
              />
              <ToggleRow
                icon={Megaphone}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                title="Problemas em campanhas"
                desc="Falhas no início, pausas inesperadas ou alta taxa de erro nos disparos"
                checked={settings.notify_campaign_issues}
                onChange={(v) => updateSetting("notify_campaign_issues", v)}
              />
              <ToggleRow
                icon={BarChart3}
                iconColor="text-primary"
                iconBg="bg-primary/10"
                title="Resumo diário"
                desc="Receba todo dia às 18h um resumo das mensagens enviadas, lidas e respondidas"
                checked={settings.notify_daily_summary}
                onChange={(v) => updateSetting("notify_daily_summary", v)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-5 space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="p-5 border-b border-border/60 bg-muted/20">
              <p className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Proteções da integração Meta
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as proteções abaixo estão sempre ativas e aplicadas pela Wiize. Não é possível desativá-las — elas garantem a integridade da sua operação Meta.
              </p>
            </div>
            <div className="divide-y divide-border/60">
              <SecurityInfoRow
                icon={Lock}
                title="Validação de assinatura (HMAC)"
                desc="Cada webhook recebido é verificado contra o app secret da Meta. Payloads não assinados ou falsificados são rejeitados automaticamente com 401."
              />
              <SecurityInfoRow
                icon={Shield}
                title="Allowlist de IPs da Meta"
                desc="Apenas callbacks originados das faixas oficiais IPv4 da Meta (AS32934) são aceitos. Origens desconhecidas recebem 403."
              />
              <SecurityInfoRow
                icon={FileCheck2}
                title="Registro de auditoria"
                desc="Toda alteração crítica (conexões, tokens, campanhas) e todo evento de webhook são gravados no log de auditoria para rastreabilidade."
              />
            </div>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <div className="p-5 border-b border-border/60 bg-muted/20">
              <p className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Compliance & proteção da sua operação
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Em linguagem simples: o que a Wiize faz para manter sua integração Meta segura, estável e em conformidade.
              </p>
            </div>
            <Accordion type="single" collapsible className="divide-y divide-border/60">
              {[
                { icon: Lock, title: "Ninguém consegue se passar pela Meta", desc: "Toda mensagem que chega no seu webhook é assinada digitalmente. Se a assinatura não bater, a Wiize rejeita antes de tocar nos seus dados — bloqueia tentativas de fraude e payloads falsos." },
                { icon: Shield, title: "Só a Meta consegue falar com você", desc: "Aceitamos apenas conexões vindas dos servidores oficiais da Meta (faixas de IP públicas da AS32934). Qualquer outra origem é barrada automaticamente." },
                { icon: FileCheck2, title: "Tudo fica registrado", desc: "Cada conexão, troca de token, disparo de campanha e evento de webhook é gravado num log de auditoria. Você consegue rastrear o que aconteceu, quando e por quê." },
                { icon: KeyRound, title: "Seus tokens ficam protegidos", desc: "Tokens da Meta são guardados criptografados no nosso backend e nunca expostos no navegador. Acesso é isolado por conta, então nenhum outro usuário enxerga seus dados." },
                { icon: ShieldCheck, title: "Conformidade com a política da Meta", desc: "Seguimos as regras oficiais da Cloud API: validação HMAC, allowlist de IPs e renovação proativa de tokens. Isso reduz o risco do seu número ser pausado ou bloqueado." },
                { icon: AlertTriangle, title: "Você é avisado se algo der errado", desc: "Quedas de qualidade, desconexões e falhas em campanhas disparam alertas automáticos por e-mail. Você age antes do problema virar perda de receita." },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <AccordionItem key={idx} value={`compliance-${idx}`} className="border-b-0">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&:focus-visible]:ring-0">
                      <div className="flex items-center gap-3 min-w-0 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm font-medium leading-tight">{item.title}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4 pt-0">
                      <p className="text-xs text-muted-foreground leading-relaxed pl-[52px]">{item.desc}</p>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-[11px] text-muted-foreground">
                Todas as proteções acima são aplicadas automaticamente. Não exigem configuração e não podem ser desativadas.
              </p>
            </div>
          </Card>

          <MetaSecurityActivity userId={user?.id} />
        </TabsContent>
      </Tabs>

      <MetaTestEmailsDialog open={testDialogOpen} onOpenChange={setTestDialogOpen} userId={user?.id} userEmail={user?.email} />

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
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

function ComplianceItem({
  title,
  desc,
  icon: Icon,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SecurityInfoRow({
  title,
  desc,
  icon: Icon,
}: {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Ativo
      </span>
    </div>
  );
}

type MetaTestType = {
  key: "META_NUMBER_DISCONNECTED" | "META_QUALITY_DROP" | "CAMPAIGN_FAILED_TO_START" | "META_DAILY_SUMMARY";
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  payload: Record<string, unknown>;
};

const META_TESTS: MetaTestType[] = [
  {
    key: "META_NUMBER_DISCONNECTED",
    label: "Número desconectado",
    desc: "Alerta de número Meta que perdeu conexão",
    icon: WifiOff,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    payload: { phone_number: "+55 11 90000-0000", business_name: "Empresa de Teste" },
  },
  {
    key: "META_QUALITY_DROP",
    label: "Queda de qualidade",
    desc: "Quality rating caiu para amarelo ou vermelho",
    icon: TrendingDown,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    payload: { phone_number: "+55 11 90000-0000", business_name: "Empresa de Teste", old_quality: "GREEN", new_quality: "YELLOW" },
  },
  {
    key: "CAMPAIGN_FAILED_TO_START",
    label: "Problemas em campanhas",
    desc: "Falha no início ou alta taxa de erro",
    icon: Megaphone,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    payload: { campaign_name: "Campanha de Teste", reason: "Número não conectado ao WhatsApp Meta" },
  },
  {
    key: "META_DAILY_SUMMARY",
    label: "Resumo diário",
    desc: "Resumo das últimas 24h da operação Meta",
    icon: BarChart3,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    payload: {
      period: new Date().toLocaleDateString("pt-BR"),
      messages_sent: 342,
      messages_delivered: 318,
      messages_read: 251,
      messages_failed: 4,
      inbound_messages: 87,
      active_numbers: 3,
      new_conversations: 19,
    },
  },
];

function MetaSecurityActivity({ userId }: { userId?: string }) {
  const [events, setEvents] = useState<Array<{ id: string; action: string; created_at: string; ip_address: string | null; metadata: any; resource_id: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("security_audit_log")
      .select("id, action, created_at, ip_address, metadata, resource_id")
      .eq("user_id", userId)
      .eq("resource_type", "meta_webhook")
      .order("created_at", { ascending: false })
      .limit(15);
    setEvents((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const labelFor = (action: string) => {
    if (action === "meta_webhook_accepted") return { label: "Webhook aceito", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", Icon: CheckCircle2 };
    if (action === "meta_webhook_rejected_hmac_invalid") return { label: "Assinatura HMAC inválida", color: "text-destructive", bg: "bg-destructive/10", Icon: XCircle };
    if (action === "meta_webhook_rejected_hmac_missing") return { label: "Assinatura HMAC ausente", color: "text-destructive", bg: "bg-destructive/10", Icon: XCircle };
    if (action === "meta_webhook_rejected_ip") return { label: "IP fora da allowlist Meta", color: "text-destructive", bg: "bg-destructive/10", Icon: XCircle };
    return { label: action, color: "text-muted-foreground", bg: "bg-muted", Icon: AlertTriangle };
  };

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/60 bg-muted/20">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            Atividade de segurança
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Últimos 15 eventos registrados pelas suas proteções Meta (HMAC, IP allowlist, auditoria).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </Button>
      </div>
      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Nenhum evento registrado ainda. Eles aparecerão aqui assim que a Meta enviar webhooks para sua operação.
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {events.map((e) => {
            const m = labelFor(e.action);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.bg}`}>
                    <m.Icon className={`h-4 w-4 ${m.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-tight ${m.color}`}>{m.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {new Date(e.created_at).toLocaleString("pt-BR")}
                      {e.ip_address ? ` · IP ${e.ip_address}` : ""}
                      {e.resource_id ? ` · WABA ${String(e.resource_id).slice(0, 8)}…` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}


function MetaTestEmailsDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  userEmail?: string | null;
}) {
  const [statuses, setStatuses] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});
  const [sendingAll, setSendingAll] = useState(false);

  const sendOne = async (t: MetaTestType) => {
    if (!userId) return;
    setStatuses((p) => ({ ...p, [t.key]: "sending" }));
    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        user_id: userId,
        email_type: t.key,
        payload: t.payload,
        idempotency_key: `meta-test-${t.key}-${userId}-${Date.now()}`,
      },
    });
    if (error) {
      setStatuses((p) => ({ ...p, [t.key]: "error" }));
      toast.error(`Falha ao enviar: ${t.label}`);
    } else {
      setStatuses((p) => ({ ...p, [t.key]: "success" }));
      toast.success(`${t.label} enviado`);
    }
  };

  const sendAll = async () => {
    setSendingAll(true);
    for (const t of META_TESTS) {
      await sendOne(t);
      await new Promise((r) => setTimeout(r, 600));
    }
    setSendingAll(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Testar alertas Meta
          </DialogTitle>
          <DialogDescription>
            Dispare cada alerta com dados de exemplo para <strong className="text-foreground">{userEmail}</strong>.
            Use para conferir como cada e-mail chega na sua caixa.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
          {META_TESTS.map((t) => {
            const status = statuses[t.key] || "idle";
            return (
              <div key={t.key} className="flex items-center justify-between gap-3 px-4 py-3 bg-card">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
                    <t.icon className={`h-4 w-4 ${t.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendOne(t)}
                    disabled={status === "sending" || sendingAll}
                    className="gap-1.5"
                  >
                    {status === "sending" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Enviar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={sendAll} disabled={sendingAll} className="gap-2">
            {sendingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            Testar todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <div className="px-5 pb-5 pt-4 border-t border-border/60 bg-muted/10">
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
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Credenciais do webhook</p>
            <p className="text-xs text-muted-foreground">Cole estes valores na configuração do webhook na Meta.</p>
          </div>
        </div>

        <Field label="Callback URL" value={data.callback_url} onCopy={() => copy("URL", data.callback_url)} />
        <Field label="Verify Token" value={data.verify_token} mono onCopy={() => copy("Token", data.verify_token)} />
      </Card>

      {/* EVENTOS OBRIGATÓRIOS */}
      <Card className="p-5 border-border/60 space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Eventos obrigatórios</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Marque TODOS os eventos abaixo em Webhook fields, Subscribe. Cada um habilita uma parte do sistema.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
            {eventsList.length} eventos
          </Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {eventsList.map((ev) => {
            const meta = EVENT_DETAILS[ev] ?? { label: ev, why: "Recomendado pela Meta.", required: true };
            return (
              <div key={ev} className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <code className="text-xs font-mono font-semibold text-foreground break-all leading-none">{meta.label}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed pl-6">{meta.why}</p>
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
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Teste e validação por número</p>
              <p className="text-xs text-muted-foreground">
                Disparamos um handshake real na Meta para cada número. Quando todos passarem, Chat e Campanhas são liberados automaticamente para esses números.
              </p>
            </div>
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
