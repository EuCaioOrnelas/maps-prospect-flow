import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { useSDRAgents } from "@/hooks/useSDRAgents";
import { SDRWizard } from "@/components/sdr/SDRWizard";
import { getSdrLimit, SDR_OBJECTIVE_LABEL } from "@/lib/sdrConfig";

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={16} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </Card>
  );
}

export default function SDRInteligente() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { agents, analytics, loading, refresh } = useSDRAgents();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      size="lg"
      className="gap-2"
      disabled={reachedLimit}
      onClick={() => {
        setEditing(null);
        setWizardOpen(true);
      }}
    >
      {reachedLimit ? <Lock size={16} /> : <Plus size={16} />}
      Criar novo SDR IA
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
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <MetricCard icon={Users} label="Em atendimento" value={String(analytics.inAttendance)} />
                <MetricCard icon={Clock} label="Em follow-up" value={String(analytics.inFollowUp)} />
                <MetricCard
                  icon={Target}
                  label="Conversão média"
                  value={`${analytics.conversionRate.toFixed(1)}%`}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Taxa de resposta"
                  value={`${analytics.replyRate.toFixed(1)}%`}
                />
                <MetricCard
                  icon={XCircle}
                  label="Taxa de abandono"
                  value={`${analytics.abandonRate.toFixed(1)}%`}
                />
                <MetricCard
                  icon={MessageSquare}
                  label="Mensagens enviadas"
                  value={String(analytics.messagesSent)}
                />
              </div>

              {/* Create */}
              <div className="flex justify-center">
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
                            variant="ghost"
                            onClick={() => {
                              setEditing(a);
                              setWizardOpen(true);
                            }}
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

      <SDRWizard
        open={wizardOpen}
        editing={editing}
        onClose={() => setWizardOpen(false)}
        onCreated={refresh}
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
