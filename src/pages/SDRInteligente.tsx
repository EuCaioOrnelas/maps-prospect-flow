import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { MetricSlot, isMetricEmpty } from "@/components/ui/metric-empty";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Users,
  Clock,
  Target,
  MessageSquare,
  TrendingUp,
  XCircle,
  Lock,
  Pencil,
  Trash2,
  Wifi,
  MessagesSquare,
} from "lucide-react";
import { useSDRAgents } from "@/hooks/useSDRAgents";
import { SDRTestChatDialog } from "@/components/sdr/SDRTestChatDialog";
import {
  clearSdrDraft,
  getSdrLimit,
  loadSdrDraft,
  SDR_OBJECTIVE_LABEL,
  type SdrStoredDraft,
} from "@/lib/sdrConfig";

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  emptyHint,
  loading,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  emptyHint?: string;
  loading?: boolean;
}) {
  const empty = isMetricEmpty(value);
  return (
    <Card className="p-5 rounded-2xl border-border/70">
      <span
        className={`h-11 w-11 rounded-xl flex items-center justify-center ${
          empty || loading ? "bg-muted/50" : "bg-primary/10"
        }`}
      >
        <Icon className={empty || loading ? "text-muted-foreground/40" : "text-primary"} size={20} />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
        {label}
      </p>
      <MetricSlot loading={loading} empty={empty} hint={emptyHint} className="mt-2 min-h-[62px]">
        <p className="text-2xl sm:text-3xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
      </MetricSlot>
    </Card>
  );
}

export default function SDRInteligente() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { agents, analytics, loading, refresh } = useSDRAgents();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testAgent, setTestAgent] = useState<any | null>(null);
  const [storedDraft, setStoredDraft] = useState<SdrStoredDraft | null>(() => loadSdrDraft());

  const limit = useMemo(() => getSdrLimit(profile), [profile]);
  const reachedLimit = agents.length >= limit;

  const toggleStatus = async (agent: any) => {
    const next = agent.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("sdr_agents" as any)
      .update({ status: next })
      .eq("id", agent.id);
    if (error) return toast.error("Não foi possível alterar o status");
    toast.success(next === "active" ? "SDR ativado" : "SDR pausado");
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("sdr_agents" as any).delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error("Não foi possível excluir o SDR");
    toast.success("SDR excluído");
    refresh();
  };

  const createButton = (
    <Button
      className="gap-2"
      disabled={reachedLimit}
      onClick={() => navigate("/oportunidades/sdr/novo")}
    >
      {reachedLimit ? <Lock size={16} /> : <Plus size={16} />}
      Criar novo SDR
    </Button>
  );

  return (
    <SidebarProvider>
      <SEO
        title="SDR Inteligente | Wiize"
        description="Crie agentes de IA que conduzem negociações no WhatsApp até o objetivo final."
      />
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Bot className="text-primary" size={28} />
                    SDR Inteligente
                  </h1>
                  <p className="text-muted-foreground mt-1 max-w-2xl">
                    Agentes de IA que interpretam cada mensagem, definem a estratégia e conduzem a
                    negociação no WhatsApp até concluir o objetivo.
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1 h-7">
                  <Wifi size={12} />
                  {agents.length} de {limit} SDRs
                </Badge>
              </div>

              {/* Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  loading={loading}
                  icon={Users}
                  label="Em atendimento"
                  value={String(analytics.inAttendance)}
                  hint="Conversas ativas conduzidas pelos SDRs"
                  emptyHint="Aparece quando o SDR iniciar um atendimento."
                />
                <MetricCard
                  loading={loading}
                  icon={Clock}
                  label="Em follow-up"
                  value={String(analytics.inFollowUp)}
                  hint="Leads aguardando retomada automática"
                  emptyHint="Preenchido quando houver follow-ups agendados."
                />
                <MetricCard
                  loading={loading}
                  icon={Target}
                  label="Conversão média"
                  value={`${analytics.conversionRate.toFixed(1)}%`}
                  hint="Sessões que atingiram o objetivo final"
                  emptyHint="Disponível após as primeiras conversões."
                />
                <MetricCard
                  loading={loading}
                  icon={TrendingUp}
                  label="Taxa de resposta"
                  value={`${analytics.replyRate.toFixed(1)}%`}
                  hint="Leads que responderam ao SDR"
                  emptyHint="Depende das primeiras respostas dos leads."
                />
                <MetricCard
                  loading={loading}
                  icon={XCircle}
                  label="Taxa de abandono"
                  value={`${analytics.abandonRate.toFixed(1)}%`}
                  hint="Conversas encerradas sem avanço"
                  emptyHint="Calculada após conversas encerradas."
                />
                <MetricCard
                  loading={loading}
                  icon={MessageSquare}
                  label="Mensagens enviadas"
                  value={String(analytics.messagesSent)}
                  hint="Total de mensagens geradas pela IA"
                  emptyHint="Será atualizado no primeiro envio da IA."
                />
              </div>

              {/* Lista de SDRs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h2 className="text-lg font-semibold">Lista de SDRs</h2>
                  <p className="text-sm text-muted-foreground">
                    Gerencie, pause ou edite os agentes da sua operação.
                  </p>
                </div>
                {reachedLimit ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">{createButton}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-popover">
                        <p className="text-sm font-medium">Limite de SDRs atingido</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cada número de WhatsApp libera 1 SDR. Você tem {limit} número(s)
                          disponível(is). Faça upgrade do plano ou compre números adicionais para
                          criar mais SDRs.
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => navigate("/meta/numeros")}
                        >
                          Comprar mais números
                        </Button>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  createButton
                )}
              </div>

              {/* Rascunho em andamento */}
              {storedDraft && (
                <Card className="p-5 border-dashed border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Pencil size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {storedDraft.draft.name?.trim() || "SDR sem nome"}
                      </p>
                      <Badge variant="secondary">Rascunho</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configuração interrompida na etapa {storedDraft.step} de 12. Continue de onde
                      parou.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate("/oportunidades/sdr/novo")}>
                      Continuar configuração
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        clearSdrDraft();
                        setStoredDraft(null);
                        toast.success("Rascunho descartado");
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              )}

              {/* Lista */}
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando SDRs...</p>
              ) : agents.length === 0 ? (
                <Card className="p-10 text-center">
                  <Bot className="mx-auto text-muted-foreground mb-3" size={32} />
                  <p className="font-medium">Nenhum SDR criado ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie seu primeiro SDR e deixe a IA conduzir as negociações.
                  </p>
                  <Button className="mt-4 gap-2" onClick={() => navigate("/oportunidades/sdr/novo")}>
                    <Plus size={16} /> Criar novo SDR
                  </Button>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {agents.map((a) => (
                    <Card key={a.id} className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.objective === "outro"
                              ? a.objective_custom || "Objetivo personalizado"
                              : SDR_OBJECTIVE_LABEL(a.objective)}
                          </p>
                        </div>
                        <Badge variant={a.status === "active" ? "default" : "secondary"}>
                          {a.status === "active" ? "Ativo" : "Pausado"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-1 rounded-md bg-muted">
                          {(a.whatsapp_number_ids || []).length} número(s)
                        </span>
                        <span className="px-2 py-1 rounded-md bg-muted">
                          Tom: {a.personality?.tone ?? "—"}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-muted">
                          Follow-up: {a.closing?.followup_max ?? 0}x
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={a.status === "active"}
                            onCheckedChange={() => toggleStatus(a)}
                          />
                          <span className="text-xs text-muted-foreground">Ativo</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8"
                            onClick={() => setTestAgent(a)}
                          >
                            <MessagesSquare size={14} /> Testar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/oportunidades/sdr/${a.id}/editar`)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteId(a.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <SDRTestChatDialog
        agent={testAgent}
        open={!!testAgent}
        onOpenChange={(v) => !v && setTestAgent(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir SDR?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o histórico de atendimentos deste SDR será removido. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
