import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WarmingNumberCard } from "@/components/warming/WarmingNumberCard";
import { WarmingDetailsDialog } from "@/components/warming/WarmingDetailsDialog";
import { SelectWarmingSearchDialog } from "@/components/warming/SelectWarmingSearchDialog";
import { SkipWarmingDialog } from "@/components/warming/SkipWarmingDialog";
import { ReconnectDialog } from "@/components/whatsapp/ReconnectDialog";
import { Flame, Info, RefreshCw, Search, Wifi, TestTube, X, CheckCircle, XCircle, AlertCircle, MessageCircle, AlertTriangle, FlaskConical, Lock, Crown, Sparkles } from "lucide-react";
import { PremiumFeatureBlock } from "@/components/PremiumFeatureBlock";
import { WarmingInteractionsLog } from "@/components/warming/WarmingInteractionsLog";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { usePagePopupDismiss } from "@/hooks/usePagePopupDismiss";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  messages_sent_today: number;
  last_message_at: string | null;
  phone_key: string | null;
}

interface SearchAssignment {
  whatsapp_number_id: string;
  search_query: string;
  search_city: string | null;
  phone_key?: string | null;
}

// Extract last 8 digits of a phone number for matching across formats
const getPhoneKey = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits.slice(-8);
};

export default function Warming() {
  const { user, profile, refreshProfile } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  useAutoScoreTracking("warming");
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
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);
  const [reconnectingNumber, setReconnectingNumber] = useState<WhatsAppNumber | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showPopup: showBetaWarning, dismiss: dismissBetaWarning, canClose: canCloseBeta, countdown: betaCountdown } = usePagePopupDismiss("warming_beta_warning");
  const [skipWarmingNumber, setSkipWarmingNumber] = useState<WhatsAppNumber | null>(null);

  // Check if user has access to Warming (paid plans only)
  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const hasAccess = ['start', 'growth', 'scale'].includes(userPlan);

  const handleCloseBetaWarning = () => {
    dismissBetaWarning();
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-refresh every 30 seconds for active warming sessions
  useEffect(() => {
    const hasActiveSessions = sessions.some(s => s.status === 'active');
    
    if (!hasActiveSessions || !user) return;

    const interval = setInterval(() => {
      // Silent refresh without loading state
      refreshSessionsData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [sessions, user]);

  const refreshSessionsData = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('warming_sessions')
        .select('*')
        .eq('user_id', user?.id);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData as WarmingSession[] || []);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

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

      // Fetch leads count from search_history (sum leads from all searches)
      const { data: searchHistoryData, error: searchError } = await supabase
        .from('search_history')
        .select('leads, results_count')
        .eq('user_id', user?.id);

      if (searchError) throw searchError;
      
      // Count leads by summing from search history entries
      // Use the greater of: JSON leads array length OR results_count
      const totalFromHistory = (searchHistoryData || []).reduce((total, entry) => {
        const leadsArray = Array.isArray(entry.leads) ? entry.leads : [];
        const jsonCount = leadsArray.length;
        const resultsCount = entry.results_count || 0;
        return total + Math.max(jsonCount, resultsCount);
      }, 0);

      // Also get actual leads count from leads table as fallback
      const { count: leadsTableCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (leadsError) throw leadsError;
      
      // Use the greater value between history sum and leads table count
      setLeadsCount(Math.max(totalFromHistory, leadsTableCount || 0));

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
        .select('whatsapp_number_id, search_query, search_city, phone_key')
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
    // First try exact match by number ID
    const exact = sessions.find(s => s.whatsapp_number_id === numberId);
    if (exact) return exact;
    
    // Then try matching by phone_key (for reconnected numbers with different format)
    const number = numbers.find(n => n.id === numberId);
    const phoneKey = getPhoneKey(number?.phone_number || null);
    if (phoneKey) {
      return sessions.find(s => s.phone_key === phoneKey);
    }
    return undefined;
  };

  const getAssignmentForNumber = (numberId: string): SearchAssignment | undefined => {
    const exact = assignments.find(a => a.whatsapp_number_id === numberId);
    if (exact) return exact;
    
    // Try matching by phone_key
    const number = numbers.find(n => n.id === numberId);
    const phoneKey = getPhoneKey(number?.phone_number || null);
    if (phoneKey) {
      return assignments.find(a => a.phone_key === phoneKey);
    }
    return undefined;
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
      const number = numbers.find(n => n.id === numberId);
      const phoneKey = getPhoneKey(number?.phone_number || null);
      const existingSession = getSessionForNumber(numberId);
      
      // If no session for this number ID, check if there's one matching by phone_key
      let matchedSession = existingSession;
      if (!matchedSession && phoneKey) {
        matchedSession = sessions.find(s => {
          // Match by phone_key from any session of this user
          const sessionData = s as any;
          return sessionData.phone_key === phoneKey;
        });
        
        // If found a session by phone_key, re-link it to the new number ID
        if (matchedSession) {
          console.log(`Found existing warming session by phone_key ${phoneKey}, re-linking to number ${numberId}`);
          const { error: relinkError } = await supabase
            .from('warming_sessions')
            .update({ whatsapp_number_id: numberId })
            .eq('id', matchedSession.id);
          
          if (relinkError) {
            console.error('Error re-linking session:', relinkError);
          }
        }
      }
      
      if (matchedSession) {
        // Resume existing session - keep current_day as-is (activity-based)
        const { error } = await supabase
          .from('warming_sessions')
          .update({ 
            status: 'active',
            paused_at: null,
            error_message: null,
            whatsapp_number_id: numberId,
            phone_key: phoneKey,
            started_at: matchedSession.started_at || new Date().toISOString(),
            assigned_search_query: searchQuery,
            assigned_search_city: searchCity
          })
          .eq('id', matchedSession.id);

        if (error) throw error;
        toast.success(`Aquecimento retomado no dia ${matchedSession.current_day}`);
      } else {
        // Check limit before creating new session
        const plan = profile?.plan?.toLowerCase() || 'free';
        const maxChips = plan === 'start' ? 2 : plan === 'growth' ? 5 : plan === 'scale' ? 10 : 0;
        const activeCount = sessions.filter(s => s.status === 'active' || s.status === 'paused').length;
        
        if (activeCount >= maxChips) {
          toast.error(`Limite de ${maxChips} chip(s) em aquecimento atingido para o plano ${plan.toUpperCase()}`);
          return;
        }
        
        // Create new session with phone_key
        const { error } = await supabase
          .from('warming_sessions')
          .insert({
            user_id: user?.id,
            whatsapp_number_id: numberId,
            status: 'active',
            started_at: new Date().toISOString(),
            assigned_search_query: searchQuery,
            assigned_search_city: searchCity,
            phone_key: phoneKey
          });

        if (error) throw error;
        
        // Auto-create warming agent for this number
        await createWarmingAgent(numberId, searchQuery, searchCity);
        
        toast.success('Aquecimento iniciado');
      }

      fetchData();
    } catch (error) {
      console.error('Error starting warming:', error);
      toast.error('Erro ao iniciar aquecimento');
    }
  };

  const createWarmingAgent = async (numberId: string, searchQuery: string, searchCity: string | null) => {
    try {
      // Check if warming agent already exists for this number
      const { data: existingAgent } = await supabase
        .from('ai_agents')
        .select('id')
        .eq('whatsapp_number_id', numberId)
        .eq('objective', 'warming')
        .single();

      if (existingAgent) {
        console.log('Warming agent already exists for this number');
        return;
      }

      const number = numbers.find(n => n.id === numberId);
      const numberName = number?.name || number?.phone_number || 'Número';
      const location = searchCity ? ` em ${searchCity}` : '';

      // Create a natural warming prompt with message variations
      const warmingPrompt = `# AGENTE DE AQUECIMENTO - CONVERSA SIMPLES E NATURAL

Você responde leads de forma casual durante o aquecimento do WhatsApp. Seu único objetivo é ter uma conversa breve e natural.

## CONTEXTO
- Nicho: "${searchQuery}"${location}
- Objetivo: Conversa simples de 2-3 mensagens, depois encerrar

## FLUXO DA CONVERSA

### Mensagem 1 - Quando responderem a primeira vez:
- Agradeça de forma simples
- Faça UMA pergunta casual sobre o negócio

### Mensagem 2 - Após resposta:
- Comente algo positivo sobre o que disseram
- Pode fazer mais uma pergunta leve OU já encerrar

### Mensagem 3 - ENCERRAMENTO OBRIGATÓRIO:
Quando o lead perguntar "posso ajudar?", "o que você precisa?", "em que posso ajudar?" ou similar:
- Agradeça pelo tempo
- Diga que era só para conhecer o mercado
- Use uma das frases de encerramento abaixo

## VARIAÇÕES DE RESPOSTAS (escolha aleatoriamente)

### Primeira resposta (escolha 1):
- "Que legal! Como tá o movimento aí ultimamente?"
- "Show! E como andam as coisas por aí?"
- "Opa, tranquilo! O negócio tá bom aí?"
- "Beleza! E aí, como tá o dia?"
- "Legal demais! Muito trabalho ultimamente?"

### Comentário positivo (escolha 1):
- "Bacana demais! Parece um lugar bem legal 👏"
- "Massa! Parece que vocês mandam bem 💪"
- "Que legal! Bom saber disso 👍"
- "Show de bola! Fico feliz em saber"
- "Top! Pelo jeito vocês são bons nisso"

### Encerramentos - QUANDO PERGUNTAREM "posso ajudar?" (escolha 1):
- "Na verdade era só curiosidade! Achei vocês interessantes. Sucesso! 🙌"
- "Nada não, só conhecendo o mercado! Valeu pela atenção. Boa sorte! 👊"
- "Era só pra conhecer mesmo! Obrigado pelo papo. Sucesso pra vocês! ✌️"
- "Só tava curioso sobre o nicho! Muito obrigado. Tudo de bom! 🤙"
- "Nada especial, só pesquisando! Valeu demais. Sucesso aí! 🎯"

### Resposta a "quem é você?" (escolha 1):
- "Opa! Tô fazendo uma pesquisa sobre ${searchQuery}${location} e achei vocês. Tudo bem?"
- "Fala! Vi vocês numa pesquisa de ${searchQuery} e quis conhecer melhor. Tranquilo aí?"
- "E aí! Pesquisando sobre ${searchQuery}${location} e apareceu o contato de vocês!"

### Resposta negativa/desinteresse (escolha 1):
- "Tranquilo! Desculpa incomodar. Valeu! 👍"
- "Sem stress! Foi mal aí. Boa semana! 🙏"
- "De boa! Desculpa qualquer coisa. Abraço!"
- "Suave! Perdão pelo incômodo. Fica bem!"

## REGRAS IMPORTANTES

1. Máximo 60 caracteres por mensagem quando possível
2. Tom informal e simpático
3. 1 emoji por mensagem no máximo
4. NUNCA tente vender nada
5. Após 2-3 trocas de mensagem, SEMPRE encerre
6. Se perguntarem "posso ajudar?", encerre IMEDIATAMENTE
7. Não seja curioso demais, mantenha conversa superficial
8. VARIE as respostas - não use sempre a mesma frase`;
      // Create the warming agent
      const { error: agentError } = await supabase
        .from('ai_agents')
        .insert({
          user_id: user?.id,
          name: `🔥 Aquecimento - ${numberName}`,
          objective: 'warming',
          whatsapp_number_id: numberId,
          system_prompt: warmingPrompt,
          communication_style: 'casual',
          status: 'active',
          operating_hours_start: '08:00',
          operating_hours_end: '20:00',
          daily_limit: 50,
          max_replies: 2,
          max_response_chars: 150,
          is_warmed: false,
          post_response_behavior: 'Manter conversa natural e encerrar após 2 respostas. Não tentar vender nada.',
          agent_objective: `Aquecer o número respondendo leads de ${searchQuery}${location} de forma natural`,
          target_audience: searchQuery
        });

      if (agentError) {
        console.error('Error creating warming agent:', agentError);
        // Don't fail the warming session creation if agent creation fails
      } else {
        console.log('Warming agent created successfully');
      }
    } catch (error) {
      console.error('Error creating warming agent:', error);
      // Don't fail the warming session creation if agent creation fails
    }
  };

  const handleSearchSelected = async (search: { keyword: string; location: string }) => {
    if (!pendingStartNumber || !user) return;
    
    const numberId = pendingStartNumber.id;
    const number = numbers.find(n => n.id === numberId);
    const phoneKey = getPhoneKey(number?.phone_number || null);
    const existingSession = getSessionForNumber(numberId);
    const existingAssignment = getAssignmentForNumber(numberId);
    
    try {
      // Update or create the assignment
      if (existingAssignment) {
        await supabase
          .from('warming_search_assignments')
          .update({
            search_query: search.keyword,
            search_city: search.location || null,
            phone_key: phoneKey
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
            search_city: search.location || null,
            phone_key: phoneKey
          });
      }
      
      // Also update the session if it exists
      if (existingSession) {
        // Check if session was paused due to needing leads - auto resume
        const needsLeadsResume = existingSession.status === 'paused' && 
          existingSession.error_message?.includes('NEEDS_LEADS');
        
        await supabase
          .from('warming_sessions')
          .update({
            assigned_search_query: search.keyword,
            assigned_search_city: search.location || null,
            // If paused for needing leads, resume the session
            ...(needsLeadsResume ? {
              status: 'active',
              paused_at: null,
              error_message: null
            } : {})
          })
          .eq('id', existingSession.id);
        
        if (needsLeadsResume) {
          toast.success('Novos leads selecionados - aquecimento retomado!');
        } else {
          toast.success('Busca atualizada');
        }
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

  const handleSkipWarming = async (numberId: string) => {
    try {
      const session = getSessionForNumber(numberId);
      const number = numbers.find(n => n.id === numberId);
      const phoneKey = getPhoneKey(number?.phone_number || null);
      
      if (session) {
        // Mark existing session as completed (skipped) — also save phone_key for reconnection
        const { error } = await supabase
          .from('warming_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            warming_status: 'hot',
            warming_level: 4,
            error_message: 'SKIPPED: Aquecimento pulado pelo usuário',
            phone_key: phoneKey || (session as any).phone_key || null
          })
          .eq('id', session.id);

        if (error) throw error;
      } else {
        // Create a completed session
        const { error } = await supabase
          .from('warming_sessions')
          .insert({
            user_id: user?.id,
            whatsapp_number_id: numberId,
            status: 'completed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            warming_status: 'hot',
            warming_level: 4,
            current_day: 20,
            phone_key: phoneKey
          });

        if (error) throw error;
      }

      // Also update is_warmed and daily_limit on any AI agents linked to this number
      if (user?.id) {
        const { data: updatedAgents, error: agentError } = await supabase
          .from('ai_agents')
          .update({ is_warmed: true, daily_limit: 999999 })
          .eq('whatsapp_number_id', numberId)
          .eq('user_id', user.id)
          .select('id, name, daily_limit');

        if (agentError) {
          console.error('Error updating agent is_warmed:', agentError);
        } else {
          console.log('Agents updated after skip warming:', updatedAgents);
        }
      }

      toast.success('Aquecimento pulado — número marcado como pronto');
      setSkipWarmingNumber(null);
      fetchData();
    } catch (error) {
      console.error('Error skipping warming:', error);
      toast.error('Erro ao pular aquecimento');
    }
  };

  const handleViewDetails = (number: WhatsAppNumber) => {
    setSelectedNumber(number);
    setDetailsOpen(true);
  };

  const handleReconnect = (number: WhatsAppNumber) => {
    setReconnectingNumber(number);
    setReconnectDialogOpen(true);
  };

  const handleReconnectSuccess = async () => {
    setReconnectDialogOpen(false);
    setReconnectingNumber(null);
    
    toast.success('Número reconectado! Sincronizando mensagens...');
    
    // Sync messages after reconnection
    if (reconnectingNumber?.instance_name) {
      setIsSyncing(true);
      try {
        await supabase.functions.invoke('evolution-sync-messages', {
          body: {
            instanceName: reconnectingNumber.instance_name,
            numberId: reconnectingNumber.id,
            lastSyncAt: new Date().toISOString()
          }
        });
        toast.success('Mensagens sincronizadas!');
      } catch (error) {
        console.error('Error syncing messages:', error);
      } finally {
        setIsSyncing(false);
      }
    }
    
    // Refresh data and auto-resume warming if it was paused due to disconnection
    await fetchData();
    
    // Find the session for this number - try by ID first, then by phone_key
    const reconnectedNumber = numbers.find(n => n.id === reconnectingNumber?.id);
    const phoneKey = getPhoneKey(reconnectedNumber?.phone_number || null);
    
    let session = getSessionForNumber(reconnectingNumber?.id || '');
    
    // Also try matching by phone_key in case the number ID changed
    if (!session && phoneKey) {
      session = sessions.find(s => s.phone_key === phoneKey) || undefined;
    }
    
    if (session && (session.status === 'paused' || session.status === 'error')) {
      try {
        await supabase
          .from('warming_sessions')
          .update({
            status: 'active',
            paused_at: null,
            error_message: null,
            whatsapp_number_id: reconnectingNumber?.id, // Re-link to current number
            phone_key: phoneKey
          })
          .eq('id', session.id);
        
        toast.success(`Aquecimento retomado no dia ${session.current_day}!`);
        await fetchData();
      } catch (error) {
        console.error('Error resuming warming:', error);
      }
    }
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
  
  // Check if user has a paid plan (start, growth, or scale)
  const currentPlan = profile?.plan?.toLowerCase() || 'free';
  const isPaidPlan = ['start', 'growth', 'scale'].includes(currentPlan);
  const hasPlanAccess = isPaidPlan;

  // Get max warming chips allowed based on plan
  const getMaxWarmingChips = (plan: string) => {
    switch (plan) {
      case 'start':
        return 2;
      case 'growth':
        return 5;
      case 'scale':
        return 10;
      default:
        return 0;
    }
  };

  const maxWarmingChips = getMaxWarmingChips(currentPlan);
  const activeWarmingSessions = sessions.filter(s => s.status === 'active' || s.status === 'paused');
  const activeWarmingCount = activeWarmingSessions.length;
  const canStartNewWarming = activeWarmingCount < maxWarmingChips;

  // Show upgrade screen if user is on free/trial plan
  if (!loading && !hasPlanAccess) {
    return (
      <div className="min-h-screen bg-background">
        <SEO 
          title="Aquecimento de Números | Wiize"
          description="Sistema de aquecimento inteligente para números WhatsApp"
        />
        
        <AppSidebar profile={profile} />
        <MobileNav profile={profile} />

        <main className="lg:pl-14 pt-16 lg:pt-0 min-h-screen flex items-center justify-center">
          <div className="max-w-lg mx-auto p-4 lg:p-8 text-center">
            {/* Lock Icon */}
            <div className="mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 border border-primary/30">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
                Aquecimento de Chips
              </h1>
              <p className="text-muted-foreground text-lg">
                Recurso exclusivo para planos pagos
              </p>
            </div>

            {/* Feature Description */}
            <div className="mb-8 p-6 rounded-xl bg-muted/30 border border-border/50 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">O que é o Aquecimento?</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                O sistema de aquecimento prepara seus números WhatsApp para campanhas de prospecção em massa, 
                simulando conversas naturais para evitar bloqueios e melhorar a entregabilidade.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Evita bloqueios do WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Aumenta taxa de entrega
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Processo 100% automático
                </li>
              </ul>
            </div>

            {/* Plans Comparison */}
            <div className="mb-8 space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Escolha um plano para desbloquear o aquecimento:
              </p>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-medium">Start</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Até 2 chips</span>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-medium">Growth</span>
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Até 5 chips</span>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-medium">Enterprise</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Até 10 chips</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => navigate('/upgrade')}
              className="w-full gap-2"
              size="lg"
            >
              <Crown className="w-5 h-5" />
              Ver Planos e Desbloquear
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Garantia de 7 dias • Cancele quando quiser
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Show prerequisites screen if requirements not met
  if (!loading && !canAccessWarming) {
    return (
      <div className="min-h-screen bg-background">
        <SEO 
          title="Aquecimento de Números | Wiize"
          description="Sistema de aquecimento inteligente para números WhatsApp"
        />
        
        <AppSidebar profile={profile} />
        <MobileNav profile={profile} />

        <main className="lg:pl-[72px] pt-16 lg:pt-0 min-h-screen">
          <div className="max-w-2xl mx-auto p-3 sm:p-4 lg:p-8">
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
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO 
        title="Aquecimento de Números | Wiize"
        description="Sistema de aquecimento inteligente para números WhatsApp"
      />
      
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-[72px] pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                      Aquecimento
                    </h1>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px] sm:text-xs font-semibold">
                      BETA
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Prepare seus números novos para uso comercial de forma segura
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTestWarming}
                    disabled={testingWarming || sessions.filter(s => s.status === 'active').length === 0}
                    title="Executar teste do processador de aquecimento"
                    className="h-8 sm:h-9"
                  >
                    <TestTube className={`w-4 h-4 sm:mr-2 ${testingWarming ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">{testingWarming ? 'Testando...' : 'Testar'}</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchData}
                  disabled={loading}
                  className="h-8 sm:h-9"
                >
                  <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Warming Chips Limit Indicator */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-foreground">
                {activeWarmingCount}/{maxWarmingChips} chips
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                (Plano {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)})
              </span>
            </div>
            {!canStartNewWarming && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/upgrade')}
                className="text-primary border-primary/30 hover:bg-primary/10 h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Aumentar limite
              </Button>
            )}
          </div>

          {/* Educational Alert */}
          <Alert className="mb-4 sm:mb-6 bg-muted/50 border-muted">
            <Info className="h-4 w-4 shrink-0" />
            <AlertDescription className="text-xs sm:text-sm text-muted-foreground">
              O aquecimento simula o uso natural do WhatsApp. Nem todas as mensagens recebem resposta, 
              e isso é esperado. O processo leva cerca de 20 dias.
              <strong className="text-foreground hidden sm:inline"> Cada número usa uma busca de leads diferente.</strong>
            </AlertDescription>
          </Alert>

          {/* Numbers Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 sm:h-64 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : numbers.length === 0 ? (
            <div className="text-center py-12 sm:py-16 bg-card rounded-xl border border-border px-4">
              <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
                Nenhum número conectado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Conecte um número WhatsApp na página de Disparos para começar o aquecimento
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate('/whatsapp')}>
                Ir para Disparos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {numbers.map((number) => {
                const assignment = getAssignmentForNumber(number.id);
                const session = getSessionForNumber(number.id);
                return (
                  <WarmingNumberCard
                    key={number.id}
                    number={number}
                    session={session}
                    assignment={assignment}
                    onStart={() => handleStartWarming(number.id)}
                    onPause={() => handlePauseWarming(number.id)}
                    onViewDetails={() => handleViewDetails(number)}
                    onSelectSearch={() => {
                      setPendingStartNumber(number);
                      setSelectSearchOpen(true);
                    }}
                    onReconnect={!number.is_connected && number.instance_name ? () => handleReconnect(number) : undefined}
                    onSkipWarming={number.is_connected ? () => setSkipWarmingNumber(number) : undefined}
                  />
                );
              })}
            </div>
          )}

          {/* Warming Interactions Log - Admin Only */}
          {isAdmin && user && !loading && numbers.length > 0 && (
            <div className="mt-6">
              <WarmingInteractionsLog userId={user.id} />
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

      {/* Reconnect Dialog */}
      {reconnectingNumber && (
        <ReconnectDialog
          open={reconnectDialogOpen}
          onOpenChange={(open) => {
            setReconnectDialogOpen(open);
            if (!open) setReconnectingNumber(null);
          }}
          instanceName={reconnectingNumber.instance_name || ''}
          numberId={reconnectingNumber.id}
          numberName={reconnectingNumber.name}
          qrCode={null}
          onReconnected={handleReconnectSuccess}
        />
      )}

      {/* Beta Warning Dialog */}
      <Dialog open={showBetaWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Sistema em Versão Beta</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                O sistema de <strong>Aquecimento de Números</strong> está atualmente em versão <span className="text-amber-500 font-semibold">beta</span> e pode apresentar alguns bugs ou comportamentos inesperados.
              </p>
              <p>
                Estamos trabalhando constantemente para melhorar a experiência e corrigir possíveis falhas.
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

      {/* Skip Warming Dialog */}
      <SkipWarmingDialog
        open={!!skipWarmingNumber}
        onOpenChange={(open) => !open && setSkipWarmingNumber(null)}
        onConfirm={() => skipWarmingNumber && handleSkipWarming(skipWarmingNumber.id)}
        numberName={skipWarmingNumber?.name || skipWarmingNumber?.phone_number || 'Número'}
      />
    </div>
  );
}
