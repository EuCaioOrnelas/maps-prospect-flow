import { useMemo, useState } from "react";
import {
  Mail, Pencil, Eye, Play, Pause, Power, RefreshCw, FlaskConical, ArrowDown, Users, Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StepEditorDialog } from "@/components/admin/lifecycle/StepEditorDialog";
import { StepPreviewDialog } from "@/components/admin/lifecycle/StepPreviewDialog";
import { RecipientsDialog } from "@/components/admin/lifecycle/RecipientsDialog";
import { TestModeDialog } from "@/components/admin/lifecycle/TestModeDialog";
import { SendTestDialog } from "@/components/admin/lifecycle/SendTestDialog";
import { ExecutionLogsPanel } from "@/components/admin/lifecycle/ExecutionLogsPanel";
import { useLifecycleCampaign, rate, type LifecycleStep } from "@/hooks/useLifecycleCampaign";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  active: { label: "Ativa", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  paused: { label: "Pausada", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  disabled: { label: "Desativada", className: "bg-muted text-muted-foreground border-border" },
};

export default function AdminTrialEmailFlow() {
  const { campaign, steps, deliveries, enrollments, metricsByStep, totals, loading, load, setStatus, saveStep } =
    useLifecycleCampaign();

  const [editStep, setEditStep] = useState<LifecycleStep | null>(null);
  const [previewStep, setPreviewStep] = useState<LifecycleStep | null>(null);
  const [recipientsStep, setRecipientsStep] = useState<LifecycleStep | null>(null);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [testModeOpen, setTestModeOpen] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);

  const convertedUserIds = useMemo(
    () => new Set(enrollments.filter((e) => e.exit_reason === "converted").map((e) => e.user_id)),
    [enrollments],
  );

  const status = campaign?.status || "draft";
  const meta = STATUS_META[status] || STATUS_META.draft;

  const openRecipients = (step: LifecycleStep | null) => {
    setRecipientsStep(step);
    setRecipientsOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        <Card className="border-border/40">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            A campanha de trial ainda não foi criada no banco de dados.
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Usuários no fluxo", value: totals.inFlow, hint: `${totals.enrolled} inscritos no total` },
    { label: "E-mails enviados", value: totals.sent },
    { label: "Entregues", value: totals.delivered, hint: rate(totals.delivered, totals.sent) },
    { label: "Aberturas", value: totals.opened, hint: rate(totals.opened, totals.sent) },
    { label: "Cliques", value: totals.clicked, hint: rate(totals.clicked, totals.sent) },
    { label: "Conversões", value: totals.converted, hint: rate(totals.converted, totals.enrolled) },
    { label: "Bounce", value: totals.bounced, hint: rate(totals.bounced, totals.sent) },
    { label: "Descadastros", value: totals.unsubscribed, hint: rate(totals.unsubscribed, totals.sent) },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail size={20} /> Trial Email Flow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaign.name} · 7 dias de teste + recuperação
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[11px] ${meta.className}`}>{meta.label}</Badge>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw size={14} className="mr-1.5" /> Atualizar</Button>
          <Button size="sm" variant="outline" onClick={() => setTestModeOpen(true)}>
            <FlaskConical size={14} className="mr-1.5" /> Modo de teste
          </Button>
          {status !== "active" ? (
            <Button size="sm" onClick={() => setConfirmActivate(true)}>
              <Play size={14} className="mr-1.5" /> Ativar campanha
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus("paused")}>
              <Pause size={14} className="mr-1.5" /> Pausar
            </Button>
          )}
          {status !== "disabled" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("disabled")}>
              <Power size={14} className="mr-1.5" /> Desativar
            </Button>
          )}
        </div>
      </div>

      {status !== "active" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          A campanha não está ativa. Nenhum e-mail é enviado automaticamente enquanto ela estiver assim.
        </div>
      )}

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/40 bg-card/80">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              {s.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => openRecipients(null)}>
          <Users size={14} className="mr-1.5" /> Ver todos os destinatários
        </Button>
      </div>

      {/* Fluxo */}
      <div className="space-y-1">
        {steps.map((step, index) => {
          const m = metricsByStep.get(step.id);
          const configured = !!step.subject && !!step.content;
          return (
            <div key={step.id}>
              <Card className={`border-border/50 bg-card/80 ${!step.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">DIA {step.day_offset}</Badge>
                        {step.audience === "trial_ended_no_subscription" && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                            Pós-trial · sem assinatura
                          </Badge>
                        )}
                        {!step.is_active && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                        {!configured && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Incompleto</Badge>}
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1.5">{step.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{step.subject || "Sem assunto"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setPreviewStep(step)}>
                        <Eye size={14} className="mr-1.5" /> Visualizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditStep(step)}>
                        <Pencil size={14} className="mr-1.5" /> Editar
                      </Button>
                    </div>
                  </div>

                  {m && m.sent > 0 && (
                    <button
                      type="button"
                      onClick={() => openRecipients(step)}
                      className="mt-3 w-full text-left grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-md border border-border/40 px-3 py-2 hover:bg-muted/40 transition-colors"
                    >
                      <Metric label="Enviados" value={m.sent} />
                      <Metric label="Entregues" value={m.delivered} pct={rate(m.delivered, m.sent)} />
                      <Metric label="Abertos" value={m.opened} pct={rate(m.opened, m.sent)} />
                      <Metric label="Cliques" value={m.clicked} pct={rate(m.clicked, m.sent)} />
                      <Metric label="Conversões" value={m.converted} pct={rate(m.converted, m.sent)} />
                    </button>
                  )}
                </CardContent>
              </Card>
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown size={14} className="text-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ExecutionLogsPanel onAfterRun={load} />

      {/* Dialogs */}
      <StepEditorDialog step={editStep} open={!!editStep} onOpenChange={(o) => !o && setEditStep(null)} onSave={saveStep} />
      <StepPreviewDialog step={previewStep} open={!!previewStep} onOpenChange={(o) => !o && setPreviewStep(null)} />
      <RecipientsDialog
        open={recipientsOpen}
        onOpenChange={setRecipientsOpen}
        step={recipientsStep}
        deliveries={deliveries}
        convertedUserIds={convertedUserIds}
      />
      <TestModeDialog open={testModeOpen} onOpenChange={setTestModeOpen} />

      <AlertDialog open={confirmActivate} onOpenChange={setConfirmActivate}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar esta campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Usuários elegíveis poderão começar a receber e-mails automaticamente. Só entram no fluxo trials
              iniciados a partir da ativação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStatus("active")}>Ativar campanha</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({ label, value, pct }: { label: string; value: number; pct?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {value}
        {pct && pct !== "—" && <span className="text-[11px] font-normal text-muted-foreground ml-1">{pct}</span>}
      </p>
    </div>
  );
}
