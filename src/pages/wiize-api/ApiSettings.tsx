import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Monitor, ShieldCheck, Webhook, Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { mockSecurityActivity, mockSessions } from "@/data/wiizeApiMocks";

export default function ApiSettings() {
  const { toast } = useToast();
  const [webhook, setWebhook] = useState("");
  const [notifyLow, setNotifyLow] = useState(true);
  const [notifyErrors, setNotifyErrors] = useState(true);
  const [notifyReport, setNotifyReport] = useState(false);
  const demo = () =>
    toast({ title: "Interface de demonstração", description: "Será habilitado na implementação do backend." });

  return (
    <>
      <Helmet>
        <title>Settings — Wiize API</title>
        <meta name="description" content="Segurança, sessões ativas, webhooks e notificações da sua conta Wiize API." />
      </Helmet>

      <PageHeader title="Settings" description="Segurança, sessões, webhooks e notificações." />

      <SectionCard title="Segurança" description="Proteja o acesso à sua conta de infraestrutura">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck size={16} className="text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium">Autenticação em duas etapas</p>
              <p className="text-xs text-muted-foreground">Exigir código do aplicativo autenticador a cada acesso.</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Ativado</Badge>
        </div>

        <Button variant="outline" size="sm" className="mt-4" onClick={demo}>
          Alterar senha
        </Button>
      </SectionCard>

      <SectionCard title="Sessões ativas" description="Dispositivos com acesso à sua conta">
        <ul className="space-y-3">
          {mockSessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Monitor size={16} className="text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-medium">{s.device}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.location} · {s.lastAccess}
                  </p>
                </div>
                {s.current && (
                  <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Sessão atual</Badge>
                )}
              </div>
              {!s.current && (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={demo}>
                  Encerrar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Webhooks" description="Receba eventos de saldo, recargas e falhas">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="webhook-url">URL de destino</Label>
            <div className="relative">
              <Webhook size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                id="webhook-url"
                className="pl-9"
                placeholder="https://seusistema.com/webhooks/wiize"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={demo}>Salvar</Button>
        </div>
      </SectionCard>

      <SectionCard title="Notificações" description="Avisos por e-mail sobre a sua operação">
        {[
          { label: "Saldo baixo", desc: "Aviso quando o saldo atingir o limite configurado.", v: notifyLow, set: setNotifyLow },
          { label: "Erros de requisição", desc: "Resumo de falhas recorrentes nas chamadas.", v: notifyErrors, set: setNotifyErrors },
          { label: "Relatório mensal", desc: "Consumo e custos do mês fechado.", v: notifyReport, set: setNotifyReport },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-start gap-3">
              <Bell size={15} className="mt-0.5 text-muted-foreground" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            </div>
            <Switch checked={n.v} onCheckedChange={n.set} aria-label={n.label} />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Atividade de segurança" description="Últimos eventos registrados na conta">
        <ul className="space-y-3">
          {mockSecurityActivity.map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <History size={13} className="text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{e.event}</p>
                <p className="text-xs text-muted-foreground">{e.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{e.when}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
