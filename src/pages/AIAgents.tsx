import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard";
import { AgentDetailsDialog } from "@/components/agents/AgentDetailsDialog";
import { AgentWarningDialog } from "@/components/agents/AgentWarningDialog";
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
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [hasSeenWarning, setHasSeenWarning] = useState(false);
  const [showBetaWarning, setShowBetaWarning] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [showLeadsLimitInfo, setShowLeadsLimitInfo] = useState(false);
  const [warmingStatuses, setWarmingStatuses] = useState<Record<string, string>>({});

  // Check if user has access to AI Agents (paid plans only)
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasAccess = ['start', 'growth', 'scale'].includes(userPlan);

  // If no access, show premium block
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

  // Check if beta warning should be shown (every 30 days)
  useEffect(() => {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const acceptedAt = localStorage.getItem('agents_beta_warning_accepted_at');
    
    if (!acceptedAt) {
      setShowBetaWarning(true);
      return;
    }
    
    const acceptedDate = new Date(acceptedAt).getTime();
    const now = Date.now();
    if (now - acceptedDate > THIRTY_DAYS_MS) {
      setShowBetaWarning(true);
    }
  }, []);

  const handleCloseBetaWarning = () => {
    localStorage.setItem('agents_beta_warning_accepted_at', new Date().toISOString());
    setShowBetaWarning(false);
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
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Dica:</span> Agentes respondem automaticamente enquanto o lead continuar interagindo.
                </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {agents.map((agent) => (
                    <Card 
                      key={agent.id} 
                      className="border-border hover:border-primary/30 transition-all cursor-pointer group overflow-hidden flex flex-col"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      {/* Header */}
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Bot className="h-5 w-5 text-primary" />
                              </div>
                              {agent.status === 'active' && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-2 ring-card"></span>
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                              <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                                <Target className="h-3 w-3 shrink-0" />
                                {getObjectiveLabel(agent.objective)}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(agent.status)}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 flex-1 space-y-3">
                        {/* WhatsApp Number Chip */}
                        {agent.whatsapp_number && (
                          <div className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-md bg-muted/60 border border-border/50">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${agent.is_warmed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <span className="text-muted-foreground truncate flex-1">
                              {agent.whatsapp_number.name || agent.whatsapp_number.phone_number}
                            </span>
                            {!agent.is_warmed && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-yellow-500/30 text-yellow-500">
                                <Flame className="h-2.5 w-2.5 mr-0.5" />
                                Frio
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Stats Grid */}
                        <div className="space-y-2">
                          {/* Messages with progress */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3" />
                                Mensagens hoje
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold tabular-nums ${
                                  agent.messages_sent_today >= agent.daily_limit 
                                    ? 'text-red-500' 
                                    : agent.messages_sent_today >= agent.daily_limit * 0.8 
                                      ? 'text-yellow-500' 
                                      : 'text-foreground'
                                }`}>
                                  {agent.messages_sent_today} / {agent.daily_limit}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowLeadsLimitInfo(true);
                                      }}
                                      className="text-muted-foreground/50 hover:text-foreground transition-colors"
                                    >
                                      <Info className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Sobre limites progressivos</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  agent.messages_sent_today >= agent.daily_limit 
                                    ? 'bg-red-500' 
                                    : agent.messages_sent_today >= agent.daily_limit * 0.8 
                                      ? 'bg-yellow-500' 
                                      : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min((agent.messages_sent_today / agent.daily_limit) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Operating hours */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              Horário ativo
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {agent.operating_hours_start?.slice(0, 5)} – {agent.operating_hours_end?.slice(0, 5)}
                            </span>
                          </div>
                        </div>
                      </CardContent>

                      {/* Actions Footer */}
                      <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border mt-auto">
                        <Button
                          variant={agent.status === 'active' ? 'outline' : 'default'}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAgentStatus(agent);
                          }}
                        >
                          {agent.status === 'active' ? (
                            <>
                              <Pause className="h-3.5 w-3.5 mr-1.5" />
                              Pausar
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                              Ativar
                            </>
                          )}
                        </Button>

                        <div className="flex items-center border-l border-border pl-1 ml-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAgent(agent);
                                  setTimeout(() => {
                                    const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
                                    settingsTab?.click();
                                  }, 300);
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Salvar como template</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAgent(agent);
                                }}
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Configurações</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgentToDelete(agent);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
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

      {/* Create Agent Wizard */}
      <CreateAgentWizard 
        open={showWizard} 
        onOpenChange={setShowWizard}
        onCreated={fetchAgents}
      />

      {/* Agent Details Dialog */}
      <AgentDetailsDialog
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={(open) => !open && setSelectedAgent(null)}
        onUpdate={fetchAgents}
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
      <Dialog open={showBetaWarning} onOpenChange={setShowBetaWarning}>
        <DialogContent className="sm:max-w-md">
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
              className="w-full sm:w-auto"
            >
              Entendi, continuar
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
    </SidebarProvider>
  );
}
