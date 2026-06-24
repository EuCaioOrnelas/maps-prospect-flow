import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Webhook, Loader2, Copy, CheckCircle2, AlertTriangle, RefreshCw, XCircle,
  PlayCircle, ChevronDown, KeyRound, ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import webhookGuideCoverAsset from "@/assets/webhook-guide-cover.png.asset.json";

// ID do vídeo do YouTube com o passo a passo do webhook.
const WEBHOOK_GUIDE_VIDEO_ID = "suwAEoYW33E";
const WEBHOOK_GUIDE_VIDEO_THUMBNAIL = webhookGuideCoverAsset.url;

export type WebhookData = {
  callback_url: string;
  verify_token: string;
  required_events?: string[];
  connections: Array<{
    id: string;
    waba_id?: string | null;
    phone_number_id?: string | null;
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

type DiagnosticStep = {
  key: string;
  label: string;
  status: "ok" | "warning" | "error" | "skipped";
  summary: string;
  details?: string[];
  technical?: string;
  fbtrace_id?: string;
};

type ValidationState = {
  status: "idle" | "ok" | "error";
  detail?: string;
  issue?: { title: string; cause: string; action: string } | null;
  diagnostics?: DiagnosticStep[];
};

export function WebhookPanel({ onStatusChange }: { onStatusChange?: (s: "ok" | "pending" | null) => void }) {
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
    const payload = res as any;
    const ok = !error && payload?.ok;
    const detail = payload?.detail ?? error?.message ?? "Falha desconhecida";
    setResults((r) => ({
      ...r,
      [connectionId]: {
        status: ok ? "ok" : "error",
        detail,
        issue: payload?.issue ?? null,
        diagnostics: payload?.diagnostics ?? [],
      },
    }));
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

  const steps: Array<{ n: number; t: string; d: string; href?: string; linkLabel?: string }> = [
    {
      n: 1,
      t: "Abra o seu App da Meta",
      d: "Entre no Meta for Developers, faça login e abra o App que você usa para o WhatsApp (o mesmo da etapa de conexão do número).",
      href: "https://developers.facebook.com/apps/",
      linkLabel: "Abrir Meta for Developers",
    },
    {
      n: 2,
      t: "No menu lateral, clique em WhatsApp → Configuração",
      d: "Role até a seção Webhook. Clique em Editar (ou Configurar, se for a primeira vez).",
    },
    {
      n: 3,
      t: "Cole a Callback URL e o Verify Token",
      d: "Copie os dois valores do card Credenciais logo abaixo e cole nos campos correspondentes. Clique em Verificar e salvar — a Meta vai bater na URL e validar o token.",
    },
    {
      n: 4,
      t: "Inscreva todos os eventos obrigatórios",
      d: `Ainda na seção Webhook, clique em Gerenciar (Webhook fields). Marque TODOS os ${Object.keys(EVENT_DETAILS).length} eventos listados no card Eventos obrigatórios abaixo. Sem isso, Chat, Campanhas e métricas não funcionam.`,
    },
    {
      n: 5,
      t: "Volte aqui e clique em Testar todos",
      d: "Disparamos um teste real para cada número. Quando todos ficarem verdes, Chat e Campanhas são liberados automaticamente.",
    },
  ];

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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{s.t}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.d}</p>
                        {s.href && (
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
                          >
                            {s.linkLabel ?? "Abrir link"}
                            <ChevronDown className="h-3 w-3 -rotate-90" />
                          </a>
                        )}
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
                    <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                      WABA {c.waba_id ?? "—"} · Phone {c.phone_number_id ?? "—"}
                    </p>
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
                  <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-destructive">
                          {r.issue?.title ?? "Falha na validação do webhook"}
                        </p>
                        <p className="text-xs text-foreground/80 break-words">
                          {r.issue?.cause ?? r.detail}
                        </p>
                        {r.issue?.action && (
                          <p className="text-xs font-medium text-foreground break-words">
                            Próximo passo: {r.issue.action}
                          </p>
                        )}
                      </div>
                    </div>

                    {r.diagnostics && r.diagnostics.length > 0 && (
                      <div className="space-y-1.5">
                        {r.diagnostics.map((step) => (
                          <DiagnosticRow key={step.key} step={step} />
                        ))}
                      </div>
                    )}
                  </div>
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

function DiagnosticRow({ step }: { step: DiagnosticStep }) {
  const tone = step.status === "ok"
    ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
    : step.status === "warning"
      ? "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400"
      : step.status === "skipped"
        ? "border-border/60 bg-muted/20 text-muted-foreground"
        : "border-destructive/25 bg-background text-destructive";
  const Icon = step.status === "ok" ? CheckCircle2 : step.status === "error" ? XCircle : AlertTriangle;

  return (
    <div className={`rounded-md border p-2.5 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">{step.label}</p>
            {step.fbtrace_id && <code className="text-[10px] text-muted-foreground shrink-0">{step.fbtrace_id}</code>}
          </div>
          <p className="text-xs text-foreground/75 break-words mt-0.5">{step.summary}</p>
          {step.details && step.details.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {step.details.slice(0, 4).map((d, index) => (
                <li key={`${step.key}-${index}`} className="text-[11px] text-muted-foreground break-words">• {d}</li>
              ))}
            </ul>
          )}
          {step.technical && (
            <code className="block mt-1 text-[11px] text-muted-foreground break-all rounded bg-muted/40 px-2 py-1">
              {step.technical}
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
