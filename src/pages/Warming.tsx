import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { WarmingNumberCard } from "@/components/warming/WarmingNumberCard";
import { WarmingDetailsDialog } from "@/components/warming/WarmingDetailsDialog";
import { Flame, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
  instance_name: string | null;
}

interface WarmingSession {
  id: string;
  whatsapp_number_id: string;
  status: 'idle' | 'active' | 'paused' | 'completed' | 'error';
  warming_level: number;
  warming_status: 'cold' | 'warm' | 'hot';
  leads_used: number;
  leads_limit: number;
  current_day: number;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export default function Warming() {
  const { user, profile, refreshProfile } = useAuth();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [sessions, setSessions] = useState<WarmingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch WhatsApp numbers
      const { data: numbersData, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (numbersError) throw numbersError;
      setNumbers(numbersData || []);

      // Fetch warming sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('warming_sessions')
        .select('*')
        .eq('user_id', user?.id);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData as WarmingSession[] || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getSessionForNumber = (numberId: string): WarmingSession | undefined => {
    return sessions.find(s => s.whatsapp_number_id === numberId);
  };

  const handleStartWarming = async (numberId: string) => {
    try {
      const existingSession = getSessionForNumber(numberId);
      
      if (existingSession) {
        // Resume existing session
        const { error } = await supabase
          .from('warming_sessions')
          .update({ 
            status: 'active',
            paused_at: null,
            started_at: existingSession.started_at || new Date().toISOString()
          })
          .eq('id', existingSession.id);

        if (error) throw error;
        toast.success('Aquecimento retomado');
      } else {
        // Create new session
        const { error } = await supabase
          .from('warming_sessions')
          .insert({
            user_id: user?.id,
            whatsapp_number_id: numberId,
            status: 'active',
            started_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Aquecimento iniciado');
      }

      fetchData();
    } catch (error) {
      console.error('Error starting warming:', error);
      toast.error('Erro ao iniciar aquecimento');
    }
  };

  const handlePauseWarming = async (numberId: string) => {
    try {
      const session = getSessionForNumber(numberId);
      if (!session) return;

      const { error } = await supabase
        .from('warming_sessions')
        .update({ 
          status: 'paused',
          paused_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;
      toast.success('Aquecimento pausado');
      fetchData();
    } catch (error) {
      console.error('Error pausing warming:', error);
      toast.error('Erro ao pausar aquecimento');
    }
  };

  const handleViewDetails = (number: WhatsAppNumber) => {
    setSelectedNumber(number);
    setDetailsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Aquecimento de Números | WiizeProspect"
        description="Sistema de aquecimento inteligente para números WhatsApp"
      />
      
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-14 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Aquecimento de Números
                </h1>
              </div>
              <p className="text-muted-foreground">
                Prepare seus números novos para uso comercial de forma segura e automática
              </p>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Educational Alert */}
          <Alert className="mb-6 bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-muted-foreground">
              O aquecimento simula o uso natural do WhatsApp. Nem todas as mensagens recebem resposta, 
              e isso é esperado. O processo leva cerca de 20 dias para ser concluído.
            </AlertDescription>
          </Alert>

          {/* Numbers Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : numbers.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum número conectado
              </h3>
              <p className="text-muted-foreground mb-4">
                Conecte um número WhatsApp na página de Disparos para começar o aquecimento
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/whatsapp'}>
                Ir para Disparos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {numbers.map((number) => (
                <WarmingNumberCard
                  key={number.id}
                  number={number}
                  session={getSessionForNumber(number.id)}
                  onStart={() => handleStartWarming(number.id)}
                  onPause={() => handlePauseWarming(number.id)}
                  onViewDetails={() => handleViewDetails(number)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Details Dialog */}
      {selectedNumber && (
        <WarmingDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          number={selectedNumber}
          session={getSessionForNumber(selectedNumber.id)}
        />
      )}
    </div>
  );
}
