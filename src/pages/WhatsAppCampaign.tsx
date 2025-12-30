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
  Crown
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
import { ActiveCampaigns } from "@/components/whatsapp/ActiveCampaigns";
import { ConnectedNumbers } from "@/components/whatsapp/ConnectedNumbers";
import { useWhatsAppNumbers, WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

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
  const [step, setStep] = useState<'leads' | 'messages' | 'settings' | 'running'>('leads');
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

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

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
  const canStartCampaign = delaySeconds >= 40 && (isConnected || isScheduled) && selectedNumberId;

  // Fetch campaigns history
  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns((data || []).map(campaign => ({
        ...campaign,
        messages: Array.isArray(campaign.messages) ? campaign.messages as string[] : [],
        leads: Array.isArray(campaign.leads) ? campaign.leads as unknown as Lead[] : []
      })));
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

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

      await fetchCampaigns();

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

    const campaignId = await createCampaign(false);
    if (!campaignId) return;

    setCampaignState(prev => ({ ...prev, status: 'running', campaignId }));
    setStep('running');
    
    toast({
      title: "Campanha iniciada!",
      description: `Enviando mensagens para ${selectedLeads.length} contatos via ${selectedNumber?.name}`,
    });
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
      {['leads', 'messages', 'settings'].map((s, i) => {
        const stepLabels = ['Leads', 'Mensagens', 'Configurações'];
        const stepIndex = ['leads', 'messages', 'settings'].indexOf(step);
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
            {i < 2 && <div className="w-8 sm:w-12 h-px bg-border mx-2" />}
          </div>
        );
      })}
    </div>
  );

  // Show upgrade prompt for free users
  if (!hasMassMessagingAccess) {
    return (
      <div className="min-h-screen bg-background">
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
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
              <Crown size={40} className="text-warning" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">
              Disparos em Massa
            </h1>
            <p className="text-muted-foreground mb-8">
              Esta funcionalidade é exclusiva para membros dos planos Start, Growth e Scale.
              Faça upgrade para conectar seus números WhatsApp e enviar mensagens em massa.
            </p>
            <div className="space-y-4">
              <Button asChild size="lg" className="w-full gap-2">
                <Link to="/upgrade">
                  <Crown size={18} />
                  Fazer Upgrade
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Voltar ao Dashboard</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              
              <ConnectedNumbers
                selectedNumberId={selectedNumberId}
                onSelectNumber={setSelectedNumberId}
                numbers={numbers}
                onNumbersChange={setNumbers}
                maxNumbers={maxNumbers}
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
              {/* Active Campaigns Section */}
              {step === 'leads' && (
                <ActiveCampaigns
                  campaigns={campaigns}
                  usedToday={usedToday}
                  dailyLimit={dailyLimit}
                  onResume={handleResumeCampaignFromList}
                  onPause={handlePauseCampaignFromList}
                />
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
                  onStartCampaign={handleStartCampaign}
                  canProceed={canStartCampaign}
                  isConnected={isConnected}
                  totalLeads={selectedLeads.length}
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