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
  MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard";
import { AgentDetailsDialog } from "@/components/agents/AgentDetailsDialog";
import { AgentWarningDialog } from "@/components/agents/AgentWarningDialog";
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

  useEffect(() => {
    fetchAgents();

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
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <AppHeader profile={profile} />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    Agentes de IA
                  </h1>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 gap-1">
                    <FlaskConical className="h-3 w-3" />
                    Beta
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Automatize sua prospecção com agentes inteligentes e seguros
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
                >
                  <Plus className="h-4 w-4" />
                  Criar Agente
                </Button>
              </div>

              {/* Warning Card */}
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Regra de Ouro: Menos inteligência, mais previsibilidade</p>
                    <p className="text-muted-foreground mt-1">
                      O agente <strong>não é um chatbot</strong>. Ele responde uma vez e encerra. 
                      Prioriza segurança do número, não conversão.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Agents Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum agente criado</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
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
                    >
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Agente
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <Card 
                      key={agent.id} 
                      className="border-border hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 relative">
                              <Bot className="h-5 w-5 text-primary" />
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <FlaskConical className="w-2.5 h-2.5 text-amber-500" />
                              </div>
                            </div>
                            <div>
                              <CardTitle className="text-lg">{agent.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {getObjectiveLabel(agent.objective)}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(agent.status)}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Stats with real-time indicator */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              {agent.status === 'active' && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            <span className={`font-medium ${
                              agent.messages_sent_today >= agent.daily_limit * 0.9 
                                ? 'text-yellow-500' 
                                : agent.messages_sent_today >= agent.daily_limit 
                                  ? 'text-red-500' 
                                  : 'text-muted-foreground'
                            }`}>
                              {agent.messages_sent_today}/{agent.daily_limit} hoje
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{agent.operating_hours_start?.slice(0, 5)} - {agent.operating_hours_end?.slice(0, 5)}</span>
                          </div>
                        </div>
                        
                        {/* Progress bar for daily messages */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              agent.messages_sent_today >= agent.daily_limit 
                                ? 'bg-red-500' 
                                : agent.messages_sent_today >= agent.daily_limit * 0.9 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((agent.messages_sent_today / agent.daily_limit) * 100, 100)}%` }}
                          />
                        </div>

                        {/* WhatsApp Number */}
                        {agent.whatsapp_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${agent.is_warmed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <span className="text-muted-foreground">
                              {agent.whatsapp_number.name || agent.whatsapp_number.phone_number}
                            </span>
                            {!agent.is_warmed && (
                              <Badge variant="outline" className="text-xs">
                                <Flame className="h-3 w-3 mr-1" />
                                Frio
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button
                            variant={agent.status === 'active' ? 'destructive' : 'default'}
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAgentStatus(agent);
                            }}
                          >
                            {agent.status === 'active' ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Ativar
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgent(agent);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgentToDelete(agent);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
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
    </SidebarProvider>
  );
}
