import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePagePopupDismiss } from "@/hooks/usePagePopupDismiss";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Flame, 
  Settings, 
  Trash2,
  MessageSquare,
  Clock,
  Target,
  AlertTriangle,
  FlaskConical,
  MessageCircle,
  FileText,
  Copy,
  Info,
  WifiOff,
  QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard";
import { AgentDetailsDialog } from "@/components/agents/AgentDetailsDialog";
import { AgentWarningDialog } from "@/components/agents/AgentWarningDialog";
import { AgentSummaryDialog } from "@/components/agents/AgentSummaryDialog";
import { AgentTestChatDialog } from "@/components/agents/AgentTestChatDialog";
import { ManageTemplatesDialog } from "@/components/agents/ManageTemplatesDialog";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PremiumFeatureBlock } from "@/components/PremiumFeatureBlock";
import { Bot as BotIcon } from "lucide-react";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { useWhatsAppNumbers } from "@/hooks/useWhatsAppNumbers";
import { Smartphone } from "lucide-react";
import { ApiCompatibilityDialog } from "@/components/agents/ApiCompatibilityDialog";

interface AIAgent {
  id: string;
  name: string;
  objective: string;
  status: string;
  daily_limit: number;
  messages_sent_today: number;
  is_warmed: boolean;
  communication_style: string;
  operating_hours_start: string;
  operating_hours_end: string;
  whatsapp_number_id: string | null;
  whatsapp_number?: {
    name: string;
    phone_number: string;
  };
  created_at: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
    case 'paused':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
    case 'warming':
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Aquecendo</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground">Rascunho</Badge>;
  }
};

const getObjectiveLabel = (objective: string) => {
  switch (objective) {
    case 'prospecting':
      return 'Prospecção';
    case 'warming':
      return 'Aquecimento';
    case 'first_contact':
      return 'Primeiro Contato';
    default:
      return objective;
  }
};

export default function AIAgents() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackScoreEvent } = useAutoScoreTracking("agents");
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingAgentData, setEditingAgentData] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [hasSeenWarning, setHasSeenWarning] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [showLeadsLimitInfo, setShowLeadsLimitInfo] = useState(false);
  const [warmingStatuses, setWarmingStatuses] = useState<Record<string, string>>({});
  const [summaryAgent, setSummaryAgent] = useState<AIAgent | null>(null);
  const [testChatAgent, setTestChatAgent] = useState<AIAgent | null>(null);
  const [showTestAgentSelector, setShowTestAgentSelector] = useState(false);
  const [showApiCompat, setShowApiCompat] = useState(false);

  // DB-backed beta warning popup
  const { showPopup: showBetaWarning, dismiss: dismissBetaWarning, canClose: canCloseBeta, countdown: betaCountdown } = usePagePopupDismiss("agents_beta_warning");

  // WhatsApp numbers management (shared with mass messaging)
  const { 
    numbers, setNumbers, maxNumbers, fetchNumbers: fetchWhatsAppNumbers,
  } = useWhatsAppNumbers();

  // Build a set of disconnected number IDs for quick lookup
  const disconnectedNumberIds = useMemo(() => 
    new Set(numbers.filter(n => !n.is_connected).map(n => n.id)),
    [numbers]
  );

  // Check if user has access to AI Agents (paid plans only)
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasAccess = ['start', 'growth', 'scale'].includes(userPlan);

  const handleCloseBetaWarning = () => {
    dismissBetaWarning();
  };

  // Check if user has seen warning before
  useEffect(() => {
    const seen = localStorage.getItem('agent_warning_seen');
    setHasSeenWarning(!!seen);
  }, []);

  const fetchAgents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select(`
          *,
          whatsapp_number:whatsapp_numbers(name, phone_number)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Erro ao carregar agentes",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch warming statuses for agent numbers
  const fetchWarmingStatuses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('warming_sessions')
      .select('whatsapp_number_id, warming_status')
      .eq('user_id', user.id);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(s => { map[s.whatsapp_number_id] = s.warming_status; });
      setWarmingStatuses(map);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchWarmingStatuses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ai_agents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_agents',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleAgentStatus = async (agent: AIAgent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: newStatus === 'active' ? "Agente ativado" : "Agente pausado",
        description: `${agent.name} foi ${newStatus === 'active' ? 'ativado' : 'pausado'} com sucesso.`,
      });

      fetchAgents();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({
        title: "Erro ao alterar status",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const deleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', agentToDelete.id);

      if (error) throw error;

      toast({
        title: "Agente excluído",
        description: `${agentToDelete.name} foi excluído com sucesso.`,
      });

      setAgentToDelete(null);
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Erro ao excluir agente",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  // If no access, show premium block (after all hooks)
  if (!hasAccess && !loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
          <BackgroundGlow />
          <AppSidebar profile={profile} />
          
          <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
            <AppHeader profile={profile} />
            
            <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
              <PremiumFeatureBlock 
                featureName="Agentes de IA"
                description="Automatize sua prospecção com agentes inteligentes que respondem leads automaticamente via WhatsApp. Disponível apenas nos planos pagos."
                icon={<BotIcon className="h-10 w-10 text-primary" />}
              />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                      Agentes de IA
                    </h1>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs font-semibold gap-1">
                      <FlaskConical className="h-3 w-3" />
                      BETA
                    </Badge>
                  </div>
                   
                  <div className="flex gap-2 w-full sm:w-auto">
                    <NumbersManager
                      numbers={numbers}
                      onNumbersChange={setNumbers}
                      maxNumbers={maxNumbers}
                      onConnect={() => { fetchWhatsAppNumbers(); fetchAgents(); }}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => setShowManageTemplates(true)}
                      className="gap-2 flex-1 sm:flex-none"
                      size="sm"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Templates</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowTestAgentSelector(true)}
                      className="gap-2 flex-1 sm:flex-none"
                      size="sm"
                      disabled={agents.length === 0}
                    >
                      <FlaskConical className="h-4 w-4" />
                      <span className="hidden sm:inline">Testar Agente</span>
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!hasSeenWarning) {
                          setShowWarningDialog(true);
                        } else {
                          setShowWizard(true);
                        }
                      }}
                      className="gap-2 flex-1 sm:flex-none"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Agente
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatize sua prospecção com agentes inteligentes e seguros
                </p>
              </div>

              {/* Info Card */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground flex-1">
                  <span className="font-medium text-foreground/80">Dica:</span> Agentes de IA são exclusivos da API Outbound (WhatsApp Web). Para usar IA na API Oficial, use os Fluxos.
                </p>
                <button onClick={() => setShowApiCompat(true)} className="text-xs text-primary hover:underline shrink-0 font-medium">
                  Saiba mais
                </button>
              </div>

              {/* Agents Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-border">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : agents.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center px-4">
                    <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhum agente criado</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      Crie seu primeiro agente de IA para automatizar a prospecção 
                      via WhatsApp de forma segura e controlada.
                    </p>
                    <Button 
                      onClick={() => {
                        if (!hasSeenWarning) {
                          setShowWarningDialog(true);
                        } else {
                          setShowWizard(true);
                        }
                      }} 
                      className="gap-2"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Agente
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {agents.map((agent) => {
                    const isNumberDisconnected = agent.whatsapp_number_id ? disconnectedNumberIds.has(agent.whatsapp_number_id) : false;
                    const isNumberDeleted = agent.whatsapp_number_id && !agent.whatsapp_number;
                    const hasNumberProblem = isNumberDisconnected || isNumberDeleted;
                    return (
                    <Card 
                      key={agent.id} 
                      className={cn(
                        "border-border hover:border-primary/30 transition-all cursor-pointer group",
                        hasNumberProblem && "border-destructive/40 bg-destructive/5"
                      )}
                      onClick={() => setSummaryAgent(agent)}
                    >
                      <div className="p-3 space-y-3">
                        {/* Disconnection / Deleted Number Warning */}
                        {hasNumberProblem && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                            <WifiOff className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <p className="text-[11px] text-destructive font-medium leading-tight">
                              {isNumberDeleted 
                                ? "Número removido — vincule um novo número ao agente"
                                : "Número desconectado — o agente não funcionará até reconectar"
                              }
                            </p>
                          </div>
                        )}

                        {/* Top: Icon + Name + Number */}
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className={cn("p-1.5 rounded-lg", hasNumberProblem ? "bg-destructive/10" : "bg-primary/10")}>
                              <Bot className={cn("h-4 w-4", hasNumberProblem ? "text-destructive" : "text-primary")} />
                            </div>
                            {agent.status === 'active' && !hasNumberProblem && (
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 ring-2 ring-card"></span>
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
                            <p className={cn("text-xs truncate", hasNumberProblem ? "text-destructive" : "text-muted-foreground")}>
                              {isNumberDeleted
                                ? 'Número removido'
                                : agent.whatsapp_number 
                                  ? (agent.whatsapp_number.name || agent.whatsapp_number.phone_number)
                                  : 'Sem número vinculado'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {agent.operating_hours_start?.slice(0, 5)} – {agent.operating_hours_end?.slice(0, 5)}
                          </span>
                          {hasNumberProblem 
                            ? <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                                {isNumberDeleted ? 'Sem número' : 'Desconectado'}
                              </Badge>
                            : getStatusBadge(agent.status)
                          }
                        </div>

                        {/* Connect or Toggle button */}
                        {hasNumberProblem ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full h-7 text-xs gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isNumberDeleted) {
                                // Open edit wizard to reassign number
                                setSummaryAgent(agent);
                              } else {
                                navigate('/whatsapp');
                              }
                            }}
                          >
                            <QrCode className="h-3 w-3" />
                            {isNumberDeleted ? 'Vincular Número' : 'Reconectar Número'}
                          </Button>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button
                              variant={agent.status === 'active' ? 'outline' : 'default'}
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAgentStatus(agent);
                              }}
                            >
                              {agent.status === 'active' ? (
                                <><Pause className="h-3 w-3 mr-1" />Pausar</>
                              ) : (
                                <><Play className="h-3 w-3 mr-1" />Ativar</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Create Agent Wizard */}
      <CreateAgentWizard 
        open={showWizard} 
        onOpenChange={(open) => {
          setShowWizard(open);
          if (!open) setEditingAgentData(null);
        }}
        onCreated={fetchAgents}
        editingAgent={editingAgentData}
      />

      {/* Agent Summary Dialog */}
      <AgentSummaryDialog
        agent={summaryAgent}
        open={!!summaryAgent}
        onOpenChange={(open) => !open && setSummaryAgent(null)}
        onToggleStatus={(agent) => toggleAgentStatus(agent)}
        onOpenDetails={(agent) => setSelectedAgent(agent)}
        onEdit={async (agent) => {
          // Fetch full agent data including wizard_data
          const { data: fullAgent } = await supabase
            .from('ai_agents')
            .select('*')
            .eq('id', agent.id)
            .single();
          if (fullAgent) {
            setEditingAgentData(fullAgent);
            setSummaryAgent(null);
            setShowWizard(true);
          }
        }}
        onSaveTemplate={(agent) => {
          setSelectedAgent(agent);
          setTimeout(() => {
            const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
            settingsTab?.click();
          }, 300);
        }}
        onDelete={(agent) => setAgentToDelete(agent)}
        onShowLeadsLimitInfo={() => setShowLeadsLimitInfo(true)}
        onTestChat={(agent) => setTestChatAgent(agent)}
        disconnectedNumberIds={disconnectedNumberIds}
      />

      {/* Agent Test Selector Dialog */}
      <Dialog open={showTestAgentSelector} onOpenChange={setShowTestAgentSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Selecionar Agente para Teste
            </DialogTitle>
            <DialogDescription>
              Escolha qual agente você deseja testar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                onClick={() => {
                  setShowTestAgentSelector(false);
                  setTestChatAgent(agent);
                }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  agent.status === 'active' ? "bg-emerald-500/20" : "bg-muted"
                )}>
                  <Bot className={cn("h-4 w-4", agent.status === 'active' ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {agent.objective === 'prospecting' ? 'Prospecção' : agent.objective === 'nurturing' ? 'Nutrição' : agent.objective === 'closing' ? 'Fechamento' : agent.objective}
                  </p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", agent.status === 'active' ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground")}>
                  {agent.status === 'active' ? 'Ativo' : 'Pausado'}
                </Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Agent Test Chat Dialog */}
      <AgentTestChatDialog
        agent={testChatAgent}
        open={!!testChatAgent}
        onOpenChange={(open) => !open && setTestChatAgent(null)}
      />

      {/* Agent Details Dialog */}
      <AgentDetailsDialog
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={(open) => !open && setSelectedAgent(null)}
        onUpdate={fetchAgents}
        whatsappNumbers={numbers}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!agentToDelete} onOpenChange={(open) => !open && setAgentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agente "{agentToDelete?.name}"? 
              Esta ação não pode ser desfeita e todo o histórico de conversas será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteAgent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Dialog */}
      <AgentWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        onAccept={() => {
          localStorage.setItem('agent_warning_seen', 'true');
          setHasSeenWarning(true);
          setShowWarningDialog(false);
          setShowWizard(true);
        }}
      />

      {/* Beta Warning Dialog */}
      <Dialog open={showBetaWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Agentes de IA em Versão Beta</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Os <strong>Agentes de IA</strong> estão atualmente em versão <span className="text-amber-500 font-semibold">beta</span> e podem apresentar alguns bugs ou comportamentos inesperados.
              </p>
              <p>
                Estamos trabalhando constantemente para melhorar a experiência, adicionar novas funcionalidades e corrigir possíveis falhas.
              </p>
              <div className="bg-muted/50 p-3 rounded-lg border">
                <p className="text-sm">
                  <strong>Encontrou algum problema?</strong><br />
                  Entre em contato conosco pela página de <span className="text-primary font-medium">Contato</span> que vamos trabalhar para corrigir o mais rápido possível!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/contact')}
              className="w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ir para Contato
            </Button>
            <Button 
              onClick={handleCloseBetaWarning}
              disabled={!canCloseBeta}
              className="w-full sm:w-auto"
            >
              {canCloseBeta ? "Entendi, continuar" : `Aguarde ${betaCountdown}s`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Templates Dialog */}
      <ManageTemplatesDialog
        open={showManageTemplates}
        onOpenChange={setShowManageTemplates}
      />

      {/* Leads Limit Info Dialog */}
      <Dialog open={showLeadsLimitInfo} onOpenChange={setShowLeadsLimitInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Limite Progressivo de Leads
            </DialogTitle>
            <DialogDescription className="text-left space-y-4 pt-3">
              <p>
                Para ajudar a proteger seu número contra bloqueios, o limite de leads respondidos pelo agente aumenta conforme o aquecimento do chip:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-lg">🔴</span>
                  <div>
                    <p className="font-medium text-sm">Frio — até 20 leads/dia</p>
                    <p className="text-xs text-muted-foreground">Chip novo ou pouco usado</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-lg">🟡</span>
                  <div>
                    <p className="font-medium text-sm">Morno — até 100 leads/dia</p>
                    <p className="text-xs text-muted-foreground">Chip com algum histórico</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-lg">🟢</span>
                  <div>
                    <p className="font-medium text-sm">Quente — Ilimitado</p>
                    <p className="text-xs text-muted-foreground">Chip bem aquecido e confiável</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Essa proteção ajuda a evitar que envios em massa prejudiquem a reputação do seu número. 
                Aqueça seu chip na seção de <strong>Aquecimento</strong> para desbloquear limites maiores.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowLeadsLimitInfo(false)} className="w-full">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Compatibility Dialog */}
      <ApiCompatibilityDialog open={showApiCompat} onOpenChange={setShowApiCompat} />
    </SidebarProvider>
  );
}
