import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
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
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LeadSelector } from "@/components/whatsapp/LeadSelector";
import { MessageVariations } from "@/components/whatsapp/MessageVariations";
import { CampaignSettings } from "@/components/whatsapp/CampaignSettings";
import { QRCodeConnection } from "@/components/whatsapp/QRCodeConnection";
import { CampaignProgress } from "@/components/whatsapp/CampaignProgress";

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

export interface CampaignState {
  status: 'idle' | 'connecting' | 'connected' | 'running' | 'paused' | 'completed' | 'error';
  currentIndex: number;
  totalSent: number;
  totalFailed: number;
  isPausing: boolean;
}

const WhatsAppCampaign = () => {
  const [step, setStep] = useState<'leads' | 'messages' | 'settings' | 'connect' | 'running'>('leads');
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<string[]>(['', '', '', '', '']);
  const [delaySeconds, setDelaySeconds] = useState(40);
  const [pauseAfterContacts, setPauseAfterContacts] = useState(50);
  const [pauseMinutes, setPauseMinutes] = useState(5);
  const [enableSmartPause, setEnableSmartPause] = useState(true);
  
  const [campaignState, setCampaignState] = useState<CampaignState>({
    status: 'idle',
    currentIndex: 0,
    totalSent: 0,
    totalFailed: 0,
    isPausing: false
  });

  const [isConnected, setIsConnected] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canProceedToMessages = selectedLeads.length > 0;
  const canProceedToSettings = messages.filter(m => m.trim()).length === 5;
  const canProceedToConnect = delaySeconds >= 40;

  const handleStartCampaign = () => {
    if (!isConnected) {
      toast({
        title: "WhatsApp não conectado",
        description: "Escaneie o QR Code para conectar seu WhatsApp",
        variant: "destructive",
      });
      return;
    }

    setCampaignState(prev => ({ ...prev, status: 'running' }));
    setStep('running');
    
    // Simular início da campanha (a lógica real será no backend)
    toast({
      title: "Campanha iniciada!",
      description: `Enviando mensagens para ${selectedLeads.length} contatos`,
    });
  };

  const handlePauseCampaign = () => {
    setCampaignState(prev => ({ ...prev, status: 'paused', isPausing: true }));
    toast({
      title: "Campanha pausada",
      description: "A campanha foi pausada. Clique em continuar para retomar.",
    });
  };

  const handleResumeCampaign = () => {
    setCampaignState(prev => ({ ...prev, status: 'running', isPausing: false }));
    toast({
      title: "Campanha retomada",
      description: "Continuando os disparos...",
    });
  };

  const handleStopCampaign = () => {
    setCampaignState(prev => ({ ...prev, status: 'completed' }));
    toast({
      title: "Campanha encerrada",
      description: `${campaignState.totalSent} mensagens enviadas`,
    });
  };

  const handleWhatsAppConnect = () => {
    setIsConnected(true);
    setCampaignState(prev => ({ ...prev, status: 'connected' }));
    toast({
      title: "WhatsApp conectado!",
      description: "Você já pode iniciar sua campanha",
    });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['leads', 'messages', 'settings', 'connect'].map((s, i) => {
        const stepLabels = ['Leads', 'Mensagens', 'Configurações', 'Conectar'];
        const stepIndex = ['leads', 'messages', 'settings', 'connect'].indexOf(step);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
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
            
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare size={16} className="text-primary" />
              <span className="text-muted-foreground">Disparos WhatsApp</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {step !== 'running' && renderStepIndicator()}

          {/* Step: Select Leads */}
          {step === 'leads' && (
            <LeadSelector
              selectedLeads={selectedLeads}
              onLeadsChange={setSelectedLeads}
              onNext={() => setStep('messages')}
              canProceed={canProceedToMessages}
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
              delaySeconds={delaySeconds}
              onDelayChange={setDelaySeconds}
              pauseAfterContacts={pauseAfterContacts}
              onPauseAfterContactsChange={setPauseAfterContacts}
              pauseMinutes={pauseMinutes}
              onPauseMinutesChange={setPauseMinutes}
              enableSmartPause={enableSmartPause}
              onEnableSmartPauseChange={setEnableSmartPause}
              onBack={() => setStep('messages')}
              onNext={() => setStep('connect')}
              canProceed={canProceedToConnect}
            />
          )}

          {/* Step: Connect WhatsApp */}
          {step === 'connect' && (
            <QRCodeConnection
              isConnected={isConnected}
              onConnect={handleWhatsAppConnect}
              onBack={() => setStep('settings')}
              onStartCampaign={handleStartCampaign}
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
              onNewCampaign={() => {
                setStep('leads');
                setSelectedLeads([]);
                setMessages(['', '', '', '', '']);
                setCampaignState({
                  status: 'idle',
                  currentIndex: 0,
                  totalSent: 0,
                  totalFailed: 0,
                  isPausing: false
                });
                setIsConnected(false);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default WhatsAppCampaign;
