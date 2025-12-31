import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
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
import { useCampaignRealtime } from "@/hooks/useCampaignRealtime";
import { DisclaimerModal } from "@/components/whatsapp/DisclaimerModal";
import { UpgradeModal } from "@/components/whatsapp/UpgradeModal";

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
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [step, setStep] = useState<'leads' | 'messages' | 'settings' | 'summary' | 'running'>('leads');
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<string[]>(['', '', '', '', '']);
  const [campaignName, setCampaignName] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(40);
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
  const { user, profile } = useAuth();

  // Check if user has access (paid plans only)
  const isFreePlan = profile?.plan === 'free' || !profile?.plan;
  const [showUpgradeModal, setShowUpgradeModal] = useState(isFreePlan);
  
  useEffect(() => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
    }
  }, [isFreePlan]);
  
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
    maxNumbers,
    hasMassMessagingAccess,
    getRemainingDailyLimit,
    isAtDailyLimit,
    DAILY_LIMIT_PER_NUMBER
  } = useWhatsAppNumbers();

  const selectedNumber = numbers.find(n => n.id === selectedNumberId);
  const isConnected = selectedNumber?.is_connected || false;
  const usedToday = selectedNumber?.daily_sent_count || 0;
  const dailyLimit = DAILY_LIMIT_PER_NUMBER;

  const canProceedToMessages = selectedLeads.length > 0 && selectedLeads.length <= (dailyLimit - usedToday);
  const canProceedToSettings = messages.filter(m => m.trim()).length === 5;
  const canStartCampaign = delaySeconds >= 40 && (isConnected || isScheduled) && !!selectedNumberId;

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
          status: scheduled ? 'scheduled' : 'running',
          total_leads: selectedLeads.length,
          delay_seconds: delaySeconds,
          pause_after_contacts: pauseAfterContacts,
          pause_minutes: pauseMinutes,
          enable_smart_pause: enableSmartPause,
          messages: messages,
          leads: selectedLeads as unknown as any,
          started_at: scheduled ? null : new Date().toISOString(),
          scheduled_at: scheduledAt,
          whatsapp_number_id: selectedNumberId
        })
        .select()
        .single();

      if (error) throw error;

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

    setIsStartingCampaign(true);

    try {
      // Create campaign first
      const campaignId = await createCampaign(false);
      if (!campaignId) {
        setIsStartingCampaign(false);
        return;
      }

      setCampaignState(prev => ({ ...prev, status: 'running', campaignId }));

      // Get the instance name for Evolution API
      const instanceName = `whatsapp_${selectedNumberId.replace(/-/g, '_')}`;
      const validMessages = messages.filter(m => m.trim());

      // Call the edge function to start the campaign
      const { data, error } = await supabase.functions.invoke('evolution-run-campaign', {
        body: {
          campaignId,
          numberId: selectedNumberId,
          instanceName,
          leads: selectedLeads,
          messages: validMessages,
          delaySeconds
        }
      });

      if (error) {
        console.error('Error starting campaign:', error);
        toast({
          title: "Erro ao iniciar campanha",
          description: error.message || "Ocorreu um erro ao iniciar a campanha",
          variant: "destructive",
        });
        // Campaign was created but sending failed - it will show in active campaigns
      } else {
        toast({
          title: "Campanha iniciada!",
          description: `Enviando mensagens para ${selectedLeads.length} contatos via ${selectedNumber?.name}`,
        });
      }

      // Go back to leads step to show realtime monitor
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
  // Show upgrade modal for free users
  if (isFreePlan) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </div>
    );
  }

  if (!hasMassMessagingAccess) {
    return (
      <div className="min-h-screen bg-background">
        <UpgradeModal isOpen={true} onClose={() => navigate('/dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DisclaimerModal />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <Logo size="md" />
            </div>
            
            <div className="flex items-center gap-3">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {step !== 'running' && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'history')} className="mb-8">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new" className="gap-2">
                  <Plus size={16} />
                  Nova Campanha
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History size={16} />
                  Histórico ({campaigns.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === 'history' && step !== 'running' ? (
            <CampaignHistory
              campaigns={campaigns}
              loading={loadingCampaigns}
              onDelete={handleDeleteCampaign}
              onNewCampaign={handleNewCampaign}
              onPause={handlePauseCampaignFromList}
              onResume={handleResumeCampaignFromList}
              numbers={numbers}
            />
          ) : (
            <>
              {/* Real-time Monitor for Active Campaigns */}
              {step === 'leads' && (
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
              )}
              
              {step !== 'running' && renderStepIndicator()}

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
                />
              )}

              {/* Step: Campaign Settings */}
              {step === 'settings' && (
                <CampaignSettings
                  campaignName={campaignName}
                  onCampaignNameChange={setCampaignName}
                  delaySeconds={delaySeconds}
                  onDelayChange={setDelaySeconds}
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
                />
              )}

              {/* Step: Campaign Summary */}
              {step === 'summary' && (
                <CampaignSummary
                  campaignName={campaignName}
                  selectedLeads={selectedLeads}
                  messages={messages}
                  delaySeconds={delaySeconds}
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
                  delaySeconds={delaySeconds}
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