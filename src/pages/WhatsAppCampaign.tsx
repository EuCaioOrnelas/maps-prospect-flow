import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare,
  Send,
  Pause,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Smartphone,
  History,
  Plus,
  BarChart3,
  Crown,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LeadSelector } from "@/components/whatsapp/LeadSelector";
import { MessageVariations } from "@/components/whatsapp/MessageVariations";
import { CampaignSettings } from "@/components/whatsapp/CampaignSettings";
import { CampaignProgress } from "@/components/whatsapp/CampaignProgress";
import { CampaignHistory } from "@/components/whatsapp/CampaignHistory";
import { CampaignSummary } from "@/components/whatsapp/CampaignSummary";
import { ActiveCampaigns } from "@/components/whatsapp/ActiveCampaigns";
import { RealtimeMonitor } from "@/components/whatsapp/RealtimeMonitor";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";
import { useWhatsAppNumbers, WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { NoConnectedNumbers } from "@/components/whatsapp/NoConnectedNumbers";
import { useCampaignRealtime } from "@/hooks/useCampaignRealtime";
import { DisclaimerModal } from "@/components/whatsapp/DisclaimerModal";
import { UpgradeModal } from "@/components/whatsapp/UpgradeModal";
import { FreeTrialLimitModal } from "@/components/whatsapp/FreeTrialLimitModal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export interface Lead {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  mapsLink: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  delay_seconds: number;
  pause_after_contacts: number;
  pause_minutes: number;
  enable_smart_pause: boolean;
  messages: string[];
  leads: Lead[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  scheduled_at?: string | null;
  paused_at_limit?: boolean;
  pause_reason?: string;
  resume_at?: string | null;
  whatsapp_number_id?: string | null;
}

export interface CampaignState {
  status: 'idle' | 'connecting' | 'connected' | 'running' | 'paused' | 'completed' | 'error';
  currentIndex: number;
  totalSent: number;
  totalFailed: number;
  isPausing: boolean;
  campaignId: string | null;
}

const WhatsAppCampaign = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'history'>('new');
  const [step, setStep] = useState<'leads' | 'messages' | 'settings' | 'summary' | 'running'>('leads');
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<string[]>(['', '', '', '', '']);
  const [campaignName, setCampaignName] = useState('');
  const [delaySecondsMin, setDelaySecondsMin] = useState(40);
  const [delaySecondsMax, setDelaySecondsMax] = useState(60);
  const [pauseAfterContacts, setPauseAfterContacts] = useState(50);
  const [pauseMinutes, setPauseMinutes] = useState(5);
  const [enableSmartPause, setEnableSmartPause] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  
  const [campaignState, setCampaignState] = useState<CampaignState>({
    status: 'idle',
    currentIndex: 0,
    totalSent: 0,
    totalFailed: 0,
    isPausing: false,
    campaignId: null
  });

  const [isStartingCampaign, setIsStartingCampaign] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, isTrialExpired, refreshProfile } = useAuth();

  // Free trial limits
  const FREE_TRIAL_MESSAGE_LIMIT = 400;
  const isFreePlan = profile?.plan === 'free' || !profile?.plan;
  const trialMessagesUsed = profile?.trial_messages_sent || 0;
  const hasReachedTrialLimit = isFreePlan && trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT;
  const remainingTrialMessages = FREE_TRIAL_MESSAGE_LIMIT - trialMessagesUsed;

  // Show upgrade modal only if trial expired (not for free trial users who can still use)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTrialLimitModal, setShowTrialLimitModal] = useState(false);
  
  useEffect(() => {
    // If trial expired, show upgrade modal
    if (isFreePlan && isTrialExpired) {
      setShowUpgradeModal(true);
    }
    // If free trial but reached message limit, show trial limit modal
    else if (hasReachedTrialLimit && !isTrialExpired) {
      setShowTrialLimitModal(true);
    }
  }, [isFreePlan, isTrialExpired, hasReachedTrialLimit]);
  
  // Use realtime hook for campaigns
  const { 
    campaigns, 
    setCampaigns, 
    loading: loadingCampaigns, 
    fetchCampaigns 
  } = useCampaignRealtime();

  const {
    numbers,
    setNumbers,
    selectedNumberId,
    setSelectedNumberId,
    loading: loadingNumbers,
    maxNumbers,
    hasMassMessagingAccess,
    hasConnectedNumbers,
    getRemainingDailyLimit,
    isAtDailyLimit,
    hasNumberPendingReset,
    canSendMessages,
    refreshConnectionStatus,
    DAILY_LIMIT_PER_NUMBER
  } = useWhatsAppNumbers();

  const [showConnectModal, setShowConnectModal] = useState(false);

  const selectedNumber = numbers.find(n => n.id === selectedNumberId);
  const isConnected = selectedNumber?.is_connected || false;
  const usedToday = selectedNumber?.daily_sent_count || 0;
  const dailyLimit = DAILY_LIMIT_PER_NUMBER;
  const hasPendingReset = hasNumberPendingReset(selectedNumberId || undefined);

  const canProceedToMessages = selectedLeads.length > 0 && selectedLeads.length <= (dailyLimit - usedToday) && !hasPendingReset;
  const canProceedToSettings = messages.filter(m => m.trim()).length === 5;
  const canStartCampaign = delaySecondsMin >= 40 && delaySecondsMax >= delaySecondsMin && (isConnected || isScheduled) && !!selectedNumberId && !hasPendingReset;

  const isValidSchedule = () => {
    if (!isScheduled) return true;
    if (!scheduledDate || !scheduledTime) return false;
    
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(scheduledDate);
    scheduled.setHours(hours, minutes, 0, 0);
    
    return scheduled > new Date();
  };

  const canStart = canStartCampaign && (!isScheduled || isValidSchedule());


  const createCampaign = async (scheduled: boolean = false): Promise<string | null> => {
    if (!user || !selectedNumberId) return null;

    const name = campaignName || `Campanha ${new Date().toLocaleDateString('pt-BR')}`;
    
    let scheduledAt: string | null = null;
    if (scheduled && scheduledDate && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const schedDate = new Date(scheduledDate);
      schedDate.setHours(hours, minutes, 0, 0);
      scheduledAt = schedDate.toISOString();
    }
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .insert({
          user_id: user.id,
          name,
          status: scheduled ? 'scheduled' : 'pending',
          total_leads: selectedLeads.length,
          delay_seconds: delaySecondsMin,
          delay_seconds_max: delaySecondsMax,
          pause_after_contacts: pauseAfterContacts,
          pause_minutes: pauseMinutes,
          enable_smart_pause: enableSmartPause,
          messages: messages,
          leads: selectedLeads as unknown as any,
          started_at: scheduled ? null : new Date().toISOString(),
          scheduled_at: scheduledAt,
          whatsapp_number_id: selectedNumberId,
          current_lead_index: 0
        })
        .select()
        .single();

      if (error) throw error;

      // If scheduled, create a reservation for the balance
      if (scheduled && scheduledAt && data) {
        const scheduleDate = new Date(scheduledAt);
        await supabase.from('campaign_daily_reservations').insert({
          campaign_id: data.id,
          whatsapp_number_id: selectedNumberId,
          reserved_date: scheduleDate.toISOString().split('T')[0],
          reserved_count: selectedLeads.length
        });
      }

      return data.id;
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({
        title: "Erro",
        description: "Não foi possível criar a campanha",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateCampaign = async (campaignId: string, updates: {
    status?: string;
    sent_count?: number;
    failed_count?: number;
    completed_at?: string;
    paused_at_limit?: boolean;
    pause_reason?: string;
  }) => {
    try {
      await supabase
        .from('whatsapp_campaigns')
        .update(updates)
        .eq('id', campaignId);
    } catch (err) {
      console.error('Error updating campaign:', err);
    }
  };

  const handleStartCampaign = async () => {
    if (!selectedNumberId) {
      toast({
        title: "Selecione um número",
        description: "Escolha um número WhatsApp para os disparos",
        variant: "destructive",
      });
      return;
    }

    // If scheduled, create the campaign and go back
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast({
          title: "Data não selecionada",
          description: "Selecione uma data e horário para agendar",
          variant: "destructive",
        });
        return;
      }

      const campaignId = await createCampaign(true);
      if (!campaignId) return;

      toast({
        title: "Campanha agendada!",
        description: `A campanha será iniciada no horário programado`,
      });
      
      handleNewCampaign();
      setActiveTab('history');
      return;
    }

    // Check free trial limit
    if (isFreePlan && !isTrialExpired) {
      if (selectedLeads.length > remainingTrialMessages) {
        toast({
          title: "Limite do teste gratuito",
          description: `Você só pode enviar mais ${remainingTrialMessages} mensagens no período de teste`,
          variant: "destructive",
        });
        return;
      }
    }

    // Regular start - requires connection
    if (!isConnected) {
      toast({
        title: "WhatsApp não conectado",
        description: "Conecte o número selecionado antes de iniciar",
        variant: "destructive",
      });
      return;
    }

    if (selectedLeads.length > (dailyLimit - usedToday)) {
      toast({
        title: "Limite diário excedido",
        description: `O número ${selectedNumber?.name} só pode enviar mais ${dailyLimit - usedToday} mensagens hoje`,
        variant: "destructive",
      });
      return;
    }

    // VALIDATE BEFORE creating campaign - check instance_name first
    const instanceName = selectedNumber?.instance_name;
    
    if (!instanceName) {
      toast({
        title: "Erro",
        description: "Número não tem instância configurada. Reconecte o WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const validMessages = messages.filter(m => m.trim());
    
    if (validMessages.length < 5) {
      toast({
        title: "Erro",
        description: "Preencha todas as 5 variações de mensagem.",
        variant: "destructive",
      });
      return;
    }

    setIsStartingCampaign(true);

    try {
      // Only create campaign AFTER all validations pass
      const campaignId = await createCampaign(false);
      if (!campaignId) {
        setIsStartingCampaign(false);
        return;
      }

      setCampaignState(prev => ({ ...prev, status: 'running', campaignId }));

      // Call the new campaign processor to start the campaign in background
      const { data, error } = await supabase.functions.invoke('campaign-processor', {
        body: {
          campaignId,
          action: 'start'
        }
      });

      if (error) {
        console.error('Error starting campaign:', error);
        
        // If edge function fails, mark campaign as failed
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'failed', pause_reason: error.message })
          .eq('id', campaignId);
        
        toast({
          title: "Erro ao iniciar campanha",
          description: error.message || "Ocorreu um erro ao iniciar a campanha",
          variant: "destructive",
        });
      } else {
        // Update trial messages sent for free trial users
        if (isFreePlan && !isTrialExpired && user) {
          const newCount = trialMessagesUsed + selectedLeads.length;
          await supabase
            .from('profiles')
            .update({ trial_messages_sent: newCount })
            .eq('id', user.id);
          
          // Refresh profile to get updated count
          await refreshProfile();
          
          // Check if limit reached after this campaign
          if (newCount >= FREE_TRIAL_MESSAGE_LIMIT) {
            setShowTrialLimitModal(true);
          }
        }
        
        toast({
          title: "Campanha iniciada!",
          description: `Enviando mensagens para ${selectedLeads.length} contatos via ${selectedNumber?.name}`,
        });
        
        // Redirect to active campaigns tab
        setActiveTab('active');
      }

      // Reset form
      handleNewCampaign();
      
    } catch (err) {
      console.error('Error in handleStartCampaign:', err);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a campanha",
        variant: "destructive",
      });
    } finally {
      setIsStartingCampaign(false);
    }
  };

  const handlePauseCampaign = async () => {
    setCampaignState(prev => ({ ...prev, status: 'paused', isPausing: true }));
    
    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { status: 'paused' });
    }
    
    toast({
      title: "Campanha pausada",
      description: "A campanha foi pausada. Clique em continuar para retomar.",
    });
  };

  const handleResumeCampaign = async () => {
    setCampaignState(prev => ({ ...prev, status: 'running', isPausing: false }));
    
    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { status: 'running' });
    }
    
    toast({
      title: "Campanha retomada",
      description: "Continuando os disparos...",
    });
  };

  const handleStopCampaign = async () => {
    setCampaignState(prev => ({ ...prev, status: 'completed' }));
    
    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { 
        status: 'completed',
        completed_at: new Date().toISOString(),
        sent_count: campaignState.totalSent,
        failed_count: campaignState.totalFailed
      });
    }
    
    await fetchCampaigns();
    
    toast({
      title: "Campanha encerrada",
      description: `${campaignState.totalSent} mensagens enviadas`,
    });
  };

  const handleUpdateStats = async (sent: number, failed: number) => {
    if (campaignState.campaignId) {
      await updateCampaign(campaignState.campaignId, { 
        sent_count: sent,
        failed_count: failed
      });
    }
  };

  const handleNewCampaign = () => {
    setStep('leads');
    setSelectedLeads([]);
    setMessages(['', '', '', '', '']);
    setCampaignName('');
    setDelaySecondsMin(40);
    setDelaySecondsMax(60);
    setIsScheduled(false);
    setScheduledDate(undefined);
    setScheduledTime('09:00');
    setCampaignState({
      status: isConnected ? 'connected' : 'idle',
      currentIndex: 0,
      totalSent: 0,
      totalFailed: 0,
      isPausing: false,
      campaignId: null
    });
    setActiveTab('new');
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      toast({
        title: "Campanha excluída",
        description: "A campanha foi removida do histórico",
      });
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a campanha",
        variant: "destructive",
      });
    }
  };

  const handleStopCampaignFromList = async (campaign: Campaign) => {
    try {
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? { ...c, status: 'completed', completed_at: new Date().toISOString() } : c
      ));
      
      toast({
        title: "Campanha encerrada",
        description: `Campanha "${campaign.name}" foi encerrada`,
      });
    } catch (err) {
      console.error('Error stopping campaign:', err);
    }
  };

  const handlePauseCampaignFromList = async (campaign: Campaign) => {
    try {
      await supabase
        .from('whatsapp_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaign.id);

      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? { ...c, status: 'paused' } : c
      ));
      
      toast({
        title: "Campanha pausada",
        description: "A campanha foi pausada com sucesso",
      });
    } catch (err) {
      console.error('Error pausing campaign:', err);
    }
  };

  const handleResumeCampaignFromList = async (campaign: Campaign) => {
    // Find the number associated with this campaign
    const campaignNumber = numbers.find(n => n.id === campaign.whatsapp_number_id);
    
    if (campaignNumber && campaignNumber.daily_sent_count >= dailyLimit) {
      toast({
        title: "Limite diário atingido",
        description: `O número "${campaignNumber.name}" atingiu o limite de ${dailyLimit} disparos hoje`,
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'running',
          paused_at_limit: false,
          pause_reason: null
        })
        .eq('id', campaign.id);

      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? { ...c, status: 'running', paused_at_limit: false } : c
      ));
      
      toast({
        title: "Campanha retomada",
        description: "Continuando os disparos...",
      });
    } catch (err) {
      console.error('Error resuming campaign:', err);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['leads', 'messages', 'settings', 'summary'].map((s, i) => {
        const stepLabels = ['Leads', 'Mensagens', 'Configurações', 'Resumo'];
        const stepIndex = ['leads', 'messages', 'settings', 'summary'].indexOf(step);
        const isActive = s === step;
        const isCompleted = i < stepIndex;
        
        return (
          <div key={s} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all
              ${isActive ? 'bg-primary text-primary-foreground' : 
                isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
            `}>
              {isCompleted ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span className={`ml-2 text-sm hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
              {stepLabels[i]}
            </span>
            {i < 3 && <div className="w-8 sm:w-12 h-px bg-border mx-2" />}
          </div>
        );
      })}
    </div>
  );

  // Show upgrade prompt for free users
  // Show upgrade modal for free users with expired trial
  if (isFreePlan && isTrialExpired) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => navigate('/dashboard')} />
      </div>
    );
  }

  // Show trial limit modal for free users who reached message limit
  if (hasReachedTrialLimit && !isTrialExpired) {
    return (
      <div className="min-h-screen bg-background">
        <FreeTrialLimitModal 
          isOpen={showTrialLimitModal} 
          onClose={() => setShowTrialLimitModal(false)} 
          usedMessages={trialMessagesUsed}
          limit={FREE_TRIAL_MESSAGE_LIMIT}
        />
      </div>
    );
  }

  if (!hasMassMessagingAccess && !isFreePlan) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={true} onClose={() => navigate('/dashboard')} />
      </div>
    );
  }

  // Handler para abrir o modal de conectar número
  const handleConnectNumber = () => {
    setShowConnectModal(true);
  };

  // Se não tem nenhum número conectado, mostra tela especial
  if (!loadingNumbers && !hasConnectedNumbers) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <DisclaimerModal />
        <AppSidebar profile={profile} />
        <AppHeader profile={profile} />

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:pl-20">
          <NoConnectedNumbers onConnectClick={handleConnectNumber} />
        </main>

        {/* Modal de gerenciamento de números - só mostra os dialogs, sem os botões */}
        <NumbersManager
          numbers={numbers}
          onNumbersChange={setNumbers}
          maxNumbers={maxNumbers}
          onConnect={setSelectedNumberId}
          forceOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
          hideButtons={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DisclaimerModal />
      <AppSidebar profile={profile} />
      <AppHeader profile={profile} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 lg:pl-20">
        {/* Page Header */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Disparos em Massa</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas campanhas de WhatsApp</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/whatsapp/reports">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 size={16} />
                <span className="hidden sm:inline">Relatórios</span>
              </Button>
            </Link>
            <NumbersManager
              numbers={numbers}
              onNumbersChange={setNumbers}
              maxNumbers={maxNumbers}
              onConnect={setSelectedNumberId}
            />
          </div>
        </div>
        {/* Pending Reset Warning */}
        {hasPendingReset && selectedNumber && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 flex-shrink-0">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Reset pendente</p>
                  <p className="text-xs text-muted-foreground">
                    O contador de disparos do número "{selectedNumber.name}" precisa ser resetado. 
                    O reset ocorre automaticamente às 08:00. Aguarde o horário de reset para continuar os disparos.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshConnectionStatus}
                  className="flex-shrink-0"
                >
                  Verificar novamente
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Free Trial Indicator */}
        {/* Free Trial Indicator */}
        {isFreePlan && !isTrialExpired && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Disparos Gratuitos</p>
                    <p className="text-xs text-muted-foreground">Período de teste (30 dias)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 sm:flex-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-foreground">{trialMessagesUsed} / {FREE_TRIAL_MESSAGE_LIMIT}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {remainingTrialMessages} restantes
                      </span>
                    </div>
                    <div className="w-full sm:w-48 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT * 0.9 
                            ? 'bg-destructive' 
                            : trialMessagesUsed >= FREE_TRIAL_MESSAGE_LIMIT * 0.7 
                              ? 'bg-yellow-500' 
                              : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min((trialMessagesUsed / FREE_TRIAL_MESSAGE_LIMIT) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {step !== 'running' && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'active' | 'history')} className="mb-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="new" className="gap-2">
                  <Plus size={16} />
                  Nova Campanha
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <Play size={16} />
                  Em Andamento
                  {campaigns.filter(c => c.status === 'running' || c.status === 'paused' || c.status === 'scheduled').length > 0 && (
                    <span className="ml-1 min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full inline-flex items-center justify-center">
                      {campaigns.filter(c => c.status === 'running' || c.status === 'paused' || c.status === 'scheduled').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History size={16} />
                  Histórico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === 'history' && step !== 'running' ? (
            <CampaignHistory
              campaigns={campaigns.filter(c => c.status === 'completed' || c.status === 'failed')}
              loading={loadingCampaigns}
              onDelete={handleDeleteCampaign}
              onNewCampaign={handleNewCampaign}
              onPause={handlePauseCampaignFromList}
              onResume={handleResumeCampaignFromList}
              numbers={numbers}
            />
          ) : activeTab === 'active' && step !== 'running' ? (
            <>
              <RealtimeMonitor
                campaigns={campaigns}
                numbers={numbers}
                onPause={handlePauseCampaignFromList}
                onResume={handleResumeCampaignFromList}
                onStop={handleStopCampaignFromList}
              />
              
              <ActiveCampaigns
                campaigns={campaigns}
                usedToday={usedToday}
                dailyLimit={dailyLimit}
                onResume={handleResumeCampaignFromList}
                onPause={handlePauseCampaignFromList}
              />
            </>
          ) : (
            <>
              
              {step !== 'running' && activeTab === 'new' && renderStepIndicator()}

              {/* Step: Select Leads */}
              {step === 'leads' && (
                <LeadSelector
                  selectedLeads={selectedLeads}
                  onLeadsChange={setSelectedLeads}
                  onNext={() => setStep('messages')}
                  canProceed={canProceedToMessages}
                  dailyLimit={dailyLimit}
                  usedToday={usedToday}
                />
              )}

              {/* Step: Message Variations */}
              {step === 'messages' && (
                <MessageVariations
                  messages={messages}
                  onMessagesChange={setMessages}
                  onBack={() => setStep('leads')}
                  onNext={() => setStep('settings')}
                  canProceed={canProceedToSettings}
                  selectedLeads={selectedLeads}
                />
              )}

              {/* Step: Campaign Settings */}
              {step === 'settings' && (
                <CampaignSettings
                  campaignName={campaignName}
                  onCampaignNameChange={setCampaignName}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  onDelayMinChange={setDelaySecondsMin}
                  onDelayMaxChange={setDelaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  onPauseAfterContactsChange={setPauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  onPauseMinutesChange={setPauseMinutes}
                  enableSmartPause={enableSmartPause}
                  onEnableSmartPauseChange={setEnableSmartPause}
                  isScheduled={isScheduled}
                  onScheduleChange={setIsScheduled}
                  scheduledDate={scheduledDate}
                  onScheduledDateChange={setScheduledDate}
                  scheduledTime={scheduledTime}
                  onScheduledTimeChange={setScheduledTime}
                  onBack={() => setStep('messages')}
                  onNext={() => setStep('summary')}
                  isConnected={isConnected}
                  totalLeads={selectedLeads.length}
                  numbers={numbers}
                  selectedNumberId={selectedNumberId}
                  onSelectNumber={setSelectedNumberId}
                  dailyLimit={dailyLimit}
                  maxNumbers={maxNumbers}
                  userPlan={profile?.plan || 'free'}
                />
              )}

              {/* Step: Campaign Summary */}
              {step === 'summary' && (
                <CampaignSummary
                  campaignName={campaignName}
                  selectedLeads={selectedLeads}
                  messages={messages}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  enableSmartPause={enableSmartPause}
                  isScheduled={isScheduled}
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
                  selectedNumber={selectedNumber}
                  isConnected={isConnected}
                  onBack={() => setStep('settings')}
                  onStartCampaign={handleStartCampaign}
                  canStart={canStart}
                  isStarting={isStartingCampaign}
                />
              )}

              {/* Step: Campaign Running */}
              {step === 'running' && (
                <CampaignProgress
                  campaignState={campaignState}
                  totalLeads={selectedLeads.length}
                  messages={messages}
                  delaySecondsMin={delaySecondsMin}
                  delaySecondsMax={delaySecondsMax}
                  pauseAfterContacts={pauseAfterContacts}
                  pauseMinutes={pauseMinutes}
                  enableSmartPause={enableSmartPause}
                  onPause={handlePauseCampaign}
                  onResume={handleResumeCampaign}
                  onStop={handleStopCampaign}
                  onNewCampaign={handleNewCampaign}
                  onUpdateStats={handleUpdateStats}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default WhatsAppCampaign;