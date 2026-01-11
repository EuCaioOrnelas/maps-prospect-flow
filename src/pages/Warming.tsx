import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WarmingNumberCard } from "@/components/warming/WarmingNumberCard";
import { WarmingDetailsDialog } from "@/components/warming/WarmingDetailsDialog";
import { SelectWarmingSearchDialog } from "@/components/warming/SelectWarmingSearchDialog";
import { Flame, Info, RefreshCw, Search, Wifi, TestTube, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestLogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

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

interface SearchAssignment {
  whatsapp_number_id: string;
  search_query: string;
  search_city: string | null;
}

export default function Warming() {
  const { user, profile, refreshProfile } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [sessions, setSessions] = useState<WarmingSession[]>([]);
  const [assignments, setAssignments] = useState<SearchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<WhatsAppNumber | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectSearchOpen, setSelectSearchOpen] = useState(false);
  const [pendingStartNumber, setPendingStartNumber] = useState<WhatsAppNumber | null>(null);
  const [leadsCount, setLeadsCount] = useState(0);
  const [hasConnectedNumber, setHasConnectedNumber] = useState(false);
  const [testingWarming, setTestingWarming] = useState(false);
  const [testLogs, setTestLogs] = useState<TestLogEntry[]>([]);
  const [showTestLogs, setShowTestLogs] = useState(false);

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
      
      // Check if there's at least one connected number
      const connectedNumbers = (numbersData || []).filter(n => n.is_connected);
      setHasConnectedNumber(connectedNumbers.length > 0);

      // Fetch leads count
      const { count: leadsTotal, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (leadsError) throw leadsError;
      setLeadsCount(leadsTotal || 0);

      // Fetch warming sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('warming_sessions')
        .select('*')
        .eq('user_id', user?.id);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData as WarmingSession[] || []);

      // Fetch search assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('warming_search_assignments')
        .select('whatsapp_number_id, search_query, search_city')
        .eq('user_id', user?.id);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
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

  const getAssignmentForNumber = (numberId: string): SearchAssignment | undefined => {
    return assignments.find(a => a.whatsapp_number_id === numberId);
  };

  const handleStartWarming = async (numberId: string) => {
    const number = numbers.find(n => n.id === numberId);
    if (!number) return;

    // Check if this number has an assigned search
    const assignment = getAssignmentForNumber(numberId);
    
    if (!assignment) {
      // No search assigned - open dialog to select one
      setPendingStartNumber(number);
      setSelectSearchOpen(true);
      return;
    }

    // Has assignment - proceed to start
    await startWarmingSession(numberId, assignment.search_query, assignment.search_city);
  };

  const startWarmingSession = async (numberId: string, searchQuery: string, searchCity: string | null) => {
    try {
      const existingSession = getSessionForNumber(numberId);
      
      if (existingSession) {
        // Resume existing session
        const { error } = await supabase
          .from('warming_sessions')
          .update({ 
            status: 'active',
            paused_at: null,
            started_at: existingSession.started_at || new Date().toISOString(),
            assigned_search_query: searchQuery,
            assigned_search_city: searchCity
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
            started_at: new Date().toISOString(),
            assigned_search_query: searchQuery,
            assigned_search_city: searchCity
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

  const handleSearchSelected = async (search: { keyword: string; location: string }) => {
    if (!pendingStartNumber || !user) return;
    
    const numberId = pendingStartNumber.id;
    const existingSession = getSessionForNumber(numberId);
    const existingAssignment = getAssignmentForNumber(numberId);
    
    try {
      // Update or create the assignment
      if (existingAssignment) {
        await supabase
          .from('warming_search_assignments')
          .update({
            search_query: search.keyword,
            search_city: search.location || null
          })
          .eq('whatsapp_number_id', numberId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('warming_search_assignments')
          .insert({
            user_id: user.id,
            whatsapp_number_id: numberId,
            search_query: search.keyword,
            search_city: search.location || null
          });
      }
      
      // Also update the session if it exists
      if (existingSession) {
        await supabase
          .from('warming_sessions')
          .update({
            assigned_search_query: search.keyword,
            assigned_search_city: search.location || null
          })
          .eq('id', existingSession.id);
          
        toast.success('Busca atualizada');
      } else {
        // No session yet - start the warming
        await startWarmingSession(numberId, search.keyword, search.location || null);
      }
      
      setPendingStartNumber(null);
      fetchData();
    } catch (error) {
      console.error('Error saving search assignment:', error);
      toast.error('Erro ao salvar busca');
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

  const addTestLog = (type: TestLogEntry['type'], message: string) => {
    setTestLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message
    }]);
  };

  const handleTestWarming = async () => {
    setTestingWarming(true);
    setTestLogs([]);
    setShowTestLogs(true);
    
    addTestLog('info', 'Iniciando teste do processador de aquecimento...');
    
    try {
      addTestLog('info', 'Chamando warming-processor com { test: true }...');
      
      const { data, error } = await supabase.functions.invoke('warming-processor', {
        body: { test: true }
      });

      if (error) {
        addTestLog('error', `Erro na chamada: ${error.message}`);
        throw error;
      }

      console.log('Warming processor test result:', data);
      
      // Parse response data for logs
      if (data) {
        addTestLog('success', 'Resposta recebida do processador');
        
        if (data.activeSessions !== undefined) {
          addTestLog('info', `Sessões ativas encontradas: ${data.activeSessions}`);
        }
        
        if (data.messagesSent !== undefined) {
          addTestLog('success', `Mensagens enviadas: ${data.messagesSent}`);
        }
        
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: string) => {
            addTestLog('error', err);
          });
        }
        
        if (data.details) {
          addTestLog('info', `Detalhes: ${JSON.stringify(data.details)}`);
        }
        
        if (data.message) {
          addTestLog('info', data.message);
        }
      }
      
      addTestLog('success', 'Teste concluído com sucesso!');
      toast.success('Teste de aquecimento executado!');
      
      await fetchData();
    } catch (error: any) {
      console.error('Error testing warming:', error);
      addTestLog('error', `Erro ao testar: ${error.message || 'Erro desconhecido'}`);
      toast.error('Erro ao testar aquecimento');
    } finally {
      setTestingWarming(false);
    }
  };

  // Check prerequisites
  const meetsLeadsRequirement = leadsCount >= 50;
  const meetsNumberRequirement = hasConnectedNumber;
  const canAccessWarming = meetsLeadsRequirement && meetsNumberRequirement;

  // Show prerequisites screen if requirements not met
  if (!loading && !canAccessWarming) {
    return (
      <div className="min-h-screen bg-background">
        <SEO 
          title="Aquecimento de Números | WiizeProspect"
          description="Sistema de aquecimento inteligente para números WhatsApp"
        />
        
        <AppSidebar profile={profile} />
        <MobileNav profile={profile} />

        <main className="lg:pl-14 pt-16 lg:pt-0 min-h-screen">
          <div className="max-w-2xl mx-auto p-4 lg:p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                Aquecimento de Números
              </h1>
              <p className="text-muted-foreground">
                Complete os pré-requisitos abaixo para acessar o sistema de aquecimento
              </p>
            </div>

            {/* Prerequisites Cards */}
            <div className="space-y-4">
              {/* Number Connection Requirement */}
              <Card className={`border-2 ${meetsNumberRequirement ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      meetsNumberRequirement ? 'bg-green-500/20' : 'bg-destructive/20'
                    }`}>
                      <Wifi className={`w-6 h-6 ${meetsNumberRequirement ? 'text-green-500' : 'text-destructive'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          Conectar número WhatsApp
                        </h3>
                        {meetsNumberRequirement ? (
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                            ✓ Concluído
                          </span>
                        ) : (
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Você precisa ter pelo menos 1 número WhatsApp conectado para iniciar o aquecimento.
                      </p>
                      {!meetsNumberRequirement && (
                        <Button 
                          onClick={() => navigate('/whatsapp')}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Wifi className="w-4 h-4 mr-2" />
                          Conectar Número
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Requirement */}
              <Card className={`border-2 ${meetsLeadsRequirement ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      meetsLeadsRequirement ? 'bg-green-500/20' : 'bg-destructive/20'
                    }`}>
                      <Search className={`w-6 h-6 ${meetsLeadsRequirement ? 'text-green-500' : 'text-destructive'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          Prospectar leads
                        </h3>
                        {meetsLeadsRequirement ? (
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                            ✓ Concluído
                          </span>
                        ) : (
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                            {leadsCount}/50 leads
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Você precisa ter pelo menos 50 leads prospectados para o aquecimento funcionar corretamente.
                        {!meetsLeadsRequirement && ` Você tem ${leadsCount} lead${leadsCount !== 1 ? 's' : ''} atualmente.`}
                      </p>
                      {!meetsLeadsRequirement && (
                        <Button 
                          onClick={() => navigate('/dashboard')}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Prospectar Leads
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <Alert className="mt-6 bg-muted/50 border-muted">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-muted-foreground">
                O aquecimento utiliza os leads prospectados para simular conversas naturais e preparar 
                seu número para uso comercial de forma segura.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

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
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Aquecimento de Números
                </h1>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs font-semibold">
                  BETA
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Prepare seus números novos para uso comercial de forma segura e automática
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleTestWarming}
                  disabled={testingWarming || sessions.filter(s => s.status === 'active').length === 0}
                  title="Executar teste do processador de aquecimento"
                >
                  <TestTube className={`w-4 h-4 mr-2 ${testingWarming ? 'animate-pulse' : ''}`} />
                  {testingWarming ? 'Testando...' : 'Testar'}
                </Button>
              )}
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
          </div>

          {/* Educational Alert */}
          <Alert className="mb-6 bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-muted-foreground">
              O aquecimento simula o uso natural do WhatsApp. Nem todas as mensagens recebem resposta, 
              e isso é esperado. O processo leva cerca de 20 dias para ser concluído. 
              <strong className="text-foreground"> Cada número usa uma busca de leads diferente.</strong>
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
              <Flame className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum número conectado
              </h3>
              <p className="text-muted-foreground mb-4">
                Conecte um número WhatsApp na página de Disparos para começar o aquecimento
              </p>
              <Button variant="outline" onClick={() => navigate('/whatsapp')}>
                Ir para Disparos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {numbers.map((number) => {
                const assignment = getAssignmentForNumber(number.id);
                return (
                  <WarmingNumberCard
                    key={number.id}
                    number={number}
                    session={getSessionForNumber(number.id)}
                    assignment={assignment}
                    onStart={() => handleStartWarming(number.id)}
                    onPause={() => handlePauseWarming(number.id)}
                    onViewDetails={() => handleViewDetails(number)}
                    onSelectSearch={() => {
                      setPendingStartNumber(number);
                      setSelectSearchOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Test Logs Panel - Admin Only */}
          {isAdmin && showTestLogs && testLogs.length > 0 && (
            <Card className="mt-6 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TestTube className="w-4 h-4 text-primary" />
                    Logs do Teste de Aquecimento
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowTestLogs(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
                  <div className="space-y-2">
                    {testLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-2 text-sm ${
                          log.type === 'error' ? 'text-destructive' :
                          log.type === 'success' ? 'text-green-500' :
                          log.type === 'warning' ? 'text-yellow-500' :
                          'text-muted-foreground'
                        }`}
                      >
                        {log.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        {log.type === 'error' && <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        {log.type === 'warning' && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        {log.type === 'info' && <Info className="w-4 h-4 mt-0.5 shrink-0" />}
                        <span className="text-xs text-muted-foreground shrink-0">[{log.timestamp}]</span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
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

      {/* Select Search Dialog */}
      {pendingStartNumber && user && (
        <SelectWarmingSearchDialog
          open={selectSearchOpen}
          onOpenChange={(open) => {
            setSelectSearchOpen(open);
            if (!open) setPendingStartNumber(null);
          }}
          userId={user.id}
          numberId={pendingStartNumber.id}
          numberName={pendingStartNumber.name}
          onSearchSelected={handleSearchSelected}
        />
      )}
    </div>
  );
}
