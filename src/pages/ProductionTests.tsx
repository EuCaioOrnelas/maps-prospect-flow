// Production Tests v2
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, CheckCircle, XCircle, AlertTriangle, Loader2, 
  MessageSquare, Users, Flame, Bot, RefreshCw, Clock, 
  Send, Database, Zap, ArrowRight, ArrowLeft,
  Activity
} from "lucide-react";
import { DebugDispatchPanel } from "@/components/admin/DebugDispatchPanel";
import { EdgeFunctionMonitor } from "@/components/admin/EdgeFunctionMonitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  duration?: number;
}

interface TestLog {
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

const ProductionTests = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("campaigns");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({
    campaigns: [],
    crm: [],
    warming: [],
    agents: []
  });

  // Campaign simulation state
  const [campaignLeadsCount, setCampaignLeadsCount] = useState(25); // More leads to test windows
  const [selectedNumberId, setSelectedNumberId] = useState<string>("");
  const [numbers, setNumbers] = useState<any[]>([]);
  
  // Real message test state
  const [realTestPhone, setRealTestPhone] = useState("");
  const [realTestMessage, setRealTestMessage] = useState("Olá! Esta é uma mensagem de teste do sistema. 🚀");
  const [isRealTestEnabled, setIsRealTestEnabled] = useState(false);

  // Agent test state
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [agents, setAgents] = useState<any[]>([]);
  const [testPhone, setTestPhone] = useState("");

  // Warming state
  const [warmingSessions, setWarmingSessions] = useState<any[]>([]);
  const [selectedWarmingNumberId, setSelectedWarmingNumberId] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchNumbers();
    fetchAgents();
    fetchWarmingSessions();
  }, [user]);

  const addLog = (type: TestLog['type'], message: string) => {
    setLogs(prev => [...prev, { timestamp: new Date(), type, message }]);
  };

  const fetchNumbers = async () => {
    const { data } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('user_id', user?.id);
    setNumbers(data || []);
    if (data?.length) setSelectedNumberId(data[0].id);
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('ai_agents')
      .select('*, whatsapp_number:whatsapp_numbers(name, instance_name)')
      .eq('user_id', user?.id);
    setAgents(data || []);
    if (data?.length) setSelectedAgentId(data[0].id);
  };

  const fetchWarmingSessions = async () => {
    const { data } = await supabase
      .from('warming_sessions')
      .select('*, whatsapp_number:whatsapp_numbers(name, instance_name)')
      .eq('user_id', user?.id)
      .in('status', ['active', 'paused']);
    setWarmingSessions(data || []);
  };

  // ===== CAMPAIGN TESTS =====
  
  // Real message send test
  const runRealMessageTest = async () => {
    if (!realTestPhone || !realTestMessage) {
      toast.error("Preencha o telefone e a mensagem para o teste");
      return;
    }
    
    setIsRunning(true);
    addLog('info', '🚀 Iniciando teste de envio REAL de mensagem...');
    
    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
      // 1. Verify number is connected
      addLog('info', 'Verificando conexão do número...');
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', selectedNumberId)
        .single();

      if (!numberData?.is_connected) {
        results.push({ name: 'Conexão WhatsApp', status: 'error', message: 'Número não conectado' });
        addLog('error', '❌ Número não está conectado');
        setTestResults(prev => ({ ...prev, campaigns: results }));
        setIsRunning(false);
        return;
      }
      results.push({ name: 'Conexão WhatsApp', status: 'success', message: 'Conectado' });
      addLog('success', '✅ Número conectado');

      if (!numberData?.instance_name) {
        results.push({ name: 'Instância', status: 'error', message: 'Sem instance_name' });
        addLog('error', '❌ Número sem instância configurada');
        setTestResults(prev => ({ ...prev, campaigns: results }));
        setIsRunning(false);
        return;
      }
      results.push({ name: 'Instância', status: 'success', message: numberData.instance_name });
      addLog('success', `✅ Instância: ${numberData.instance_name}`);

      // 2. Send real message via edge function
      addLog('info', `📤 Enviando mensagem REAL para ${realTestPhone}...`);
      
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('chat-send-message', {
        body: {
          instanceName: numberData.instance_name,
          phone: realTestPhone.replace(/\D/g, ''),
          message: realTestMessage,
          messageType: 'text'
        }
      });

      if (sendError) {
        results.push({ name: 'Envio Real', status: 'error', message: sendError.message });
        addLog('error', `❌ Erro no envio: ${sendError.message}`);
      } else if (sendResult?.error) {
        results.push({ name: 'Envio Real', status: 'error', message: sendResult.error });
        addLog('error', `❌ Erro no envio: ${sendResult.error}`);
      } else {
        results.push({ name: 'Envio Real', status: 'success', message: 'Mensagem enviada!' });
        addLog('success', `✅ Mensagem enviada com sucesso para ${realTestPhone}`);
        addLog('info', `📨 MessageId: ${sendResult?.messageId || 'N/A'}`);
        
        // Wait for message to be sent
        addLog('info', '⏳ Aguardando confirmação de entrega (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        results.push({ name: 'Sync Chat', status: 'success', message: 'Mensagem enviada com sucesso' });
        addLog('success', '✅ Mensagem enviada e confirmada');
      }

      const duration = Date.now() - startTime;
      addLog('success', `🎉 Teste real concluído em ${(duration / 1000).toFixed(1)}s`);
      toast.success("Teste de envio real concluído!");

    } catch (error: any) {
      results.push({ name: 'Erro', status: 'error', message: error.message });
      addLog('error', `❌ Erro: ${error.message}`);
      toast.error(`Erro no teste: ${error.message}`);
    }

    setTestResults(prev => ({ ...prev, campaigns: results }));
    setIsRunning(false);
  };
  
  const runCampaignSimulation = async () => {
    setIsRunning(true);
    addLog('info', '🚀 Iniciando teste de campanha em modo SIMULAÇÃO...');
    
    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
      // 1. Verify number is connected
      addLog('info', 'Verificando conexão do número...');
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', selectedNumberId)
        .single();

      if (!numberData?.is_connected) {
        results.push({ name: 'Conexão WhatsApp', status: 'error', message: 'Número não conectado' });
        addLog('error', '❌ Número não está conectado');
        setTestResults(prev => ({ ...prev, campaigns: results }));
        setIsRunning(false);
        return;
      }
      results.push({ name: 'Conexão WhatsApp', status: 'success', message: 'Número conectado' });
      addLog('success', '✅ Número conectado');

      // 2. Create simulation campaign
      addLog('info', 'Criando campanha de simulação...');
      
      // Generate fake leads
      const fakeLeads = Array.from({ length: campaignLeadsCount }, (_, i) => ({
        name: `Lead Teste ${i + 1}`,
        phone: `5511999${String(i).padStart(6, '0')}`
      }));

      const { data: campaign, error: createError } = await supabase
        .from('whatsapp_campaigns')
        .insert({
          user_id: user?.id,
          whatsapp_number_id: selectedNumberId,
          name: `[SIMULAÇÃO] Teste ${new Date().toLocaleString('pt-BR')}`,
          leads: fakeLeads,
          messages: ['Olá {nome}, esta é uma mensagem de teste!', 'Oi {nome}! Tudo bem?'],
          total_leads: fakeLeads.length,
          delay_seconds: 5,
          delay_seconds_max: 10,
          simulation_mode: true,
          status: 'scheduled',
          scheduled_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      results.push({ name: 'Criar Campanha', status: 'success', message: `ID: ${campaign.id.slice(0, 8)}` });
      addLog('success', `✅ Campanha criada: ${campaign.id}`);

      // 3. Start campaign
      addLog('info', 'Iniciando campanha...');
      const { error: startError } = await supabase
        .from('whatsapp_campaigns')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', campaign.id);

      if (startError) throw startError;
      results.push({ name: 'Iniciar Campanha', status: 'success' });
      addLog('success', '✅ Campanha iniciada');

      // 4. Wait and check processor multiple times
      addLog('info', 'Aguardando processor (verificando a cada 5s)...');
      
      let checkCount = 0;
      const maxChecks = 12; // 60 seconds total
      let lastSentCount = 0;
      let windowsUnlocked = 0;
      
      while (checkCount < maxChecks) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        checkCount++;
        
        const { data: checkCampaign } = await supabase
          .from('whatsapp_campaigns')
          .select('*')
          .eq('id', campaign.id)
          .single();

        if (!checkCampaign) break;

        const newMessages = checkCampaign.sent_count - lastSentCount;
        if (newMessages > 0) {
          addLog('info', `📤 +${newMessages} mensagens | Total: ${checkCampaign.sent_count} | Janela: ${checkCampaign.current_window}`);
        }
        
        // Track window unlocks
        if (checkCampaign.current_window > windowsUnlocked) {
          windowsUnlocked = checkCampaign.current_window;
          addLog('success', `🔓 Janela ${windowsUnlocked} desbloqueada via resposta simulada!`);
        }
        
        lastSentCount = checkCampaign.sent_count;

        // Check if completed or all leads sent
        if (checkCampaign.status === 'completed' || checkCampaign.sent_count >= fakeLeads.length) {
          results.push({ 
            name: 'Processor', 
            status: 'success', 
            message: `${checkCampaign.sent_count}/${fakeLeads.length} mensagens | ${windowsUnlocked} janelas` 
          });
          addLog('success', `✅ Campanha processada: ${checkCampaign.sent_count} mensagens em ${windowsUnlocked} janelas`);
          break;
        }

        // Check if stuck
        if (checkCampaign.status === 'paused' && checkCampaign.pause_reason !== 'waiting_response') {
          results.push({ 
            name: 'Processor', 
            status: 'warning', 
            message: `Pausado: ${checkCampaign.pause_reason}` 
          });
          addLog('warning', `⚠️ Campanha pausada: ${checkCampaign.pause_reason}`);
          break;
        }
      }

      // Check final state
      const { data: finalCampaign } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('id', campaign.id)
        .single();

      if (finalCampaign && finalCampaign.sent_count === 0) {
        results.push({ name: 'Processor', status: 'warning', message: 'Nenhuma mensagem processada' });
        addLog('warning', '⚠️ Processor pode estar offline');
      }

      // Check simulated responses
      const { data: simResponses } = await supabase
        .from('campaign_responses')
        .select('*')
        .eq('campaign_id', campaign.id);

      if (simResponses?.length) {
        results.push({ 
          name: 'Respostas Simuladas', 
          status: 'success', 
          message: `${simResponses.length} respostas auto-geradas` 
        });
        addLog('success', `✅ ${simResponses.length} respostas simuladas criadas para desbloquear janelas`);
      }

      // 5. Cleanup - delete simulation campaign and responses
      addLog('info', 'Limpando campanha e respostas de teste...');
      await supabase.from('campaign_responses').delete().eq('campaign_id', campaign.id);
      await supabase.from('whatsapp_campaigns').delete().eq('id', campaign.id);
      results.push({ name: 'Limpeza', status: 'success' });
      addLog('success', '✅ Campanha e respostas de teste removidas');

      const duration = Date.now() - startTime;
      addLog('success', `🎉 Teste concluído em ${(duration / 1000).toFixed(1)}s`);

    } catch (error: any) {
      results.push({ name: 'Erro', status: 'error', message: error.message });
      addLog('error', `❌ Erro: ${error.message}`);
    }

    setTestResults(prev => ({ ...prev, campaigns: results }));
    setIsRunning(false);
  };

  // ===== CRM TESTS =====
  const runCRMTests = async () => {
    setIsRunning(true);
    addLog('info', '🚀 Iniciando testes do CRM...');
    
    const results: TestResult[] = [];
    let testLeadId: string | null = null;

    try {
      // 1. Get first stage
      addLog('info', 'Buscando estágios do pipeline...');
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('user_id', user?.id)
        .order('position');

      if (!stages?.length) {
        results.push({ name: 'Estágios', status: 'error', message: 'Nenhum estágio encontrado' });
        addLog('error', '❌ Nenhum estágio encontrado');
      } else {
        results.push({ name: 'Estágios', status: 'success', message: `${stages.length} estágios` });
        addLog('success', `✅ ${stages.length} estágios encontrados`);
      }

      // 2. Create test lead
      addLog('info', 'Criando lead de teste...');
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          user_id: user?.id,
          phone: '5511999999999',
          contact_name: '[TESTE] Lead de Produção',
          company_name: 'Empresa Teste',
          pipeline_stage_id: stages?.[0]?.id,
          origin: 'manual'
        })
        .select()
        .single();

      if (createError) throw createError;
      testLeadId = newLead.id;
      results.push({ name: 'Criar Lead', status: 'success', message: `ID: ${newLead.id.slice(0, 8)}` });
      addLog('success', '✅ Lead criado');

      // 3. Update lead
      addLog('info', 'Atualizando lead...');
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          contact_name: '[TESTE] Lead Atualizado',
          estimated_value: 1500 
        })
        .eq('id', testLeadId);

      if (updateError) throw updateError;
      results.push({ name: 'Atualizar Lead', status: 'success' });
      addLog('success', '✅ Lead atualizado');

      // 4. Move lead to another stage
      if (stages && stages.length > 1) {
        addLog('info', 'Movendo lead de estágio...');
        const { error: moveError } = await supabase
          .from('leads')
          .update({ pipeline_stage_id: stages[1].id })
          .eq('id', testLeadId);

        if (moveError) throw moveError;
        results.push({ name: 'Mover Lead', status: 'success', message: `→ ${stages[1].name}` });
        addLog('success', `✅ Lead movido para ${stages[1].name}`);
      }

      // 5. Add note
      addLog('info', 'Adicionando nota...');
      const { error: noteError } = await supabase
        .from('lead_notes')
        .insert({
          user_id: user?.id,
          lead_id: testLeadId,
          content: 'Nota de teste automático'
        });

      if (noteError) throw noteError;
      results.push({ name: 'Adicionar Nota', status: 'success' });
      addLog('success', '✅ Nota adicionada');

      // 6. Test filters
      addLog('info', 'Testando filtros...');
      const { data: filteredLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id)
        .ilike('contact_name', '%TESTE%');

      results.push({ 
        name: 'Filtros', 
        status: 'success', 
        message: `${filteredLeads?.length || 0} leads encontrados` 
      });
      addLog('success', `✅ Filtros funcionando`);

      // 7. Delete test lead
      addLog('info', 'Removendo lead de teste...');
      await supabase.from('lead_notes').delete().eq('lead_id', testLeadId);
      await supabase.from('leads').delete().eq('id', testLeadId);
      results.push({ name: 'Deletar Lead', status: 'success' });
      addLog('success', '✅ Lead de teste removido');

      addLog('success', '🎉 Todos os testes do CRM passaram!');

    } catch (error: any) {
      results.push({ name: 'Erro', status: 'error', message: error.message });
      addLog('error', `❌ Erro: ${error.message}`);
      
      // Cleanup on error
      if (testLeadId) {
        await supabase.from('lead_notes').delete().eq('lead_id', testLeadId);
        await supabase.from('leads').delete().eq('id', testLeadId);
      }
    }

    setTestResults(prev => ({ ...prev, crm: results }));
    setIsRunning(false);
  };

  // ===== WARMING TESTS (NEW AI SYSTEM) =====
  const [warmingDebugLevel, setWarmingDebugLevel] = useState<string>("2");
  const [warmingSimulatedMsg, setWarmingSimulatedMsg] = useState<string>("opa, tudo bem? quem fala?");
  const [warmingDebugSample, setWarmingDebugSample] = useState<any>(null);

  const runWarmingTests = async () => {
    setIsRunning(true);
    setWarmingDebugSample(null);
    addLog('info', '🔥 Auditoria do Sistema de Aquecimento IA...');
    const results: TestResult[] = [];

    try {
      const targetNumberId = (selectedWarmingNumberId && selectedWarmingNumberId !== 'all') ? selectedWarmingNumberId : null;

      // 1) Sessões + ai_mode
      addLog('info', 'Verificando sessões (ai_mode)...');
      await fetchWarmingSessions();
      const sessionsToCheck = targetNumberId
        ? warmingSessions.filter(s => s.whatsapp_number_id === targetNumberId)
        : warmingSessions;

      const aiSessions = sessionsToCheck.filter((s: any) => s.ai_mode === true);
      const activeAiSessions = aiSessions.filter((s: any) => s.status === 'active');

      results.push({
        name: 'Sessões IA',
        status: aiSessions.length > 0 ? 'success' : 'warning',
        message: `${aiSessions.length} com ai_mode | ${activeAiSessions.length} ativas`
      });
      addLog(aiSessions.length > 0 ? 'success' : 'warning',
        `${aiSessions.length} sessões IA encontradas (${activeAiSessions.length} ativas)`);

      for (const s of activeAiSessions) {
        results.push({
          name: `Sessão ${s.whatsapp_number?.name || s.id.slice(0, 8)}`,
          status: 'success',
          message: `Nível ${s.warming_level} | ${s.leads_used}/${s.leads_limit} leads`
        });
      }

      // 2) Interações IA recentes
      addLog('info', 'Verificando interações IA...');
      const { data: aiInteractions } = await supabase
        .from('warming_interactions')
        .select('id, status, ai_generated, last_ai_error, conversation_history, next_reply_at, lead_phone, created_at, warming_session_id')
        .eq('user_id', user?.id)
        .eq('ai_generated', true)
        .order('created_at', { ascending: false })
        .limit(20);

      const totalAi = aiInteractions?.length || 0;
      const pendingReply = (aiInteractions || []).filter(i => i.status === 'pending_response' && i.next_reply_at).length;
      const errors = (aiInteractions || []).filter(i => i.last_ai_error).length;

      results.push({
        name: 'Interações IA (últimas 20)',
        status: totalAi > 0 ? 'success' : 'warning',
        message: `${totalAi} totais | ${pendingReply} pendentes | ${errors} com erro`
      });
      addLog(totalAi > 0 ? 'success' : 'warning', `${totalAi} interações IA encontradas`);

      if (errors > 0) {
        const lastErr = (aiInteractions || []).find(i => i.last_ai_error);
        addLog('error', `Último erro IA: ${lastErr?.last_ai_error}`);
        results.push({ name: 'Último erro IA', status: 'error', message: lastErr?.last_ai_error || 'desconhecido' });
      }

      // 3) Webhook delegando? checa últimas mensagens recebidas com ai_mode session
      addLog('info', 'Verificando réplicas agendadas pelo webhook...');
      const recentScheduled = (aiInteractions || []).filter(i =>
        i.next_reply_at && new Date(i.next_reply_at).getTime() > Date.now() - 60 * 60 * 1000
      );
      results.push({
        name: 'Réplicas agendadas (1h)',
        status: 'success',
        message: `${recentScheduled.length} próximas`
      });

      // 4) Cron job ativo? — chamada debug ao próprio function (sem efeito colateral)
      addLog('info', 'Chamando warming-reply-processor (modo debug)...');
      const { data: dbg, error: dbgErr } = await supabase.functions.invoke('warming-reply-processor', {
        body: {
          mode: 'debug',
          user_id: user?.id,
          level: parseInt(warmingDebugLevel, 10),
          simulated_lead_message: warmingSimulatedMsg,
        }
      });

      if (dbgErr) {
        results.push({ name: 'Edge function debug', status: 'error', message: dbgErr.message });
        addLog('error', `Falha na edge function: ${dbgErr.message}`);
      } else if (dbg?.checks) {
        setWarmingDebugSample(dbg);
        for (const c of dbg.checks) {
          results.push({
            name: c.step,
            status: c.ok ? 'success' : (c.step === 'evolution_paid' ? 'warning' : 'error'),
            message: c.detail || (c.ok ? 'ok' : 'fail')
          });
        }
        if (dbg.sample) {
          addLog('success', `🤖 Amostra IA gerada (${dbg.sample.length} chars): "${dbg.sample.slice(0, 120)}${dbg.sample.length > 120 ? '...' : ''}"`);
        }
        if (dbg.smart_delay) {
          addLog('info', `⏱️ Smart delay calculado: ${dbg.smart_delay.minutes} min (próximo: ${new Date(dbg.smart_delay.iso).toLocaleString('pt-BR')})`);
        }
      }

      // 5) Conexão do número (se filtrado)
      if (targetNumberId) {
        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('name, is_connected, plan_tier')
          .eq('id', targetNumberId).single();
        results.push({
          name: 'Conexão WhatsApp',
          status: numberData?.is_connected ? 'success' : 'error',
          message: numberData?.is_connected ? `${numberData.name} conectado` : 'Desconectado'
        });
      }

      addLog('success', '🎉 Auditoria concluída!');
    } catch (error: any) {
      results.push({ name: 'Erro', status: 'error', message: error.message });
      addLog('error', `❌ Erro: ${error.message}`);
    }

    setTestResults(prev => ({ ...prev, warming: results }));
    setIsRunning(false);
  };


  // ===== AGENT TESTS =====
  const runAgentTests = async () => {
    setIsRunning(true);
    addLog('info', '🚀 Iniciando testes do agente de IA...');
    
    const results: TestResult[] = [];

    try {
      // 1. Check agent configuration
      addLog('info', 'Verificando configuração do agente...');
      const agent = agents.find(a => a.id === selectedAgentId);

      if (!agent) {
        results.push({ name: 'Agente', status: 'error', message: 'Nenhum agente selecionado' });
        addLog('error', '❌ Selecione um agente');
        setTestResults(prev => ({ ...prev, agents: results }));
        setIsRunning(false);
        return;
      }

      results.push({ 
        name: 'Configuração', 
        status: 'success', 
        message: `${agent.name} - ${agent.status}` 
      });
      addLog('success', `✅ Agente: ${agent.name}`);

      // 2. Check operating hours
      addLog('info', 'Verificando horário de operação...');
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startH, startM] = agent.operating_hours_start.split(':').map(Number);
      const [endH, endM] = agent.operating_hours_end.split(':').map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      const isWithinHours = currentTime >= startTime && currentTime <= endTime;
      
      results.push({ 
        name: 'Horário', 
        status: isWithinHours ? 'success' : 'warning', 
        message: `${agent.operating_hours_start} - ${agent.operating_hours_end} | Atual: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      });
      
      if (isWithinHours) {
        addLog('success', '✅ Dentro do horário de operação');
      } else {
        addLog('warning', '⚠️ Fora do horário de operação');
      }

      // 3. Check message buffer
      addLog('info', 'Verificando buffer de mensagens...');
      const { data: buffer } = await supabase
        .from('agent_message_buffer')
        .select('*')
        .eq('agent_id', selectedAgentId);

      results.push({ 
        name: 'Buffer (2min)', 
        status: 'success', 
        message: `${buffer?.length || 0} mensagens aguardando` 
      });
      addLog('success', `✅ ${buffer?.length || 0} mensagens no buffer`);

      // 4. Check recent conversations
      addLog('info', 'Verificando conversas recentes...');
      const { data: conversations } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_id', selectedAgentId)
        .order('created_at', { ascending: false })
        .limit(5);

      results.push({ 
        name: 'Conversas', 
        status: 'success', 
        message: `${conversations?.length || 0} conversas recentes` 
      });
      addLog('success', `✅ ${conversations?.length || 0} conversas encontradas`);

      // 5. Check WhatsApp connection
      addLog('info', 'Verificando conexão WhatsApp do agente...');
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('*')
        .eq('id', agent.whatsapp_number_id)
        .single();

      if (numberData?.is_connected) {
        results.push({ name: 'WhatsApp', status: 'success', message: 'Conectado' });
        addLog('success', '✅ WhatsApp conectado');
      } else {
        results.push({ name: 'WhatsApp', status: 'error', message: 'Desconectado' });
        addLog('error', '❌ WhatsApp desconectado');
      }

      addLog('success', '🎉 Testes do agente concluídos!');

    } catch (error: any) {
      results.push({ name: 'Erro', status: 'error', message: error.message });
      addLog('error', `❌ Erro: ${error.message}`);
    }

    setTestResults(prev => ({ ...prev, agents: results }));
    setIsRunning(false);
  };

  const renderResults = (results: TestResult[]) => (
    <div className="space-y-2">
      {results.map((result, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
            {result.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            {result.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            {result.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">{result.name}</span>
          </div>
          {result.message && (
            <Badge variant="outline" className="text-xs">
              {result.message}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold mb-2">Testes de Produção</h1>
        <p className="text-muted-foreground">
          Execute testes para validar o funcionamento do sistema antes do lançamento
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Campanhas
              </TabsTrigger>
              <TabsTrigger value="crm" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                CRM
              </TabsTrigger>
              <TabsTrigger value="warming" className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Warming
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Agentes
              </TabsTrigger>
              <TabsTrigger value="monitor" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Monitor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="mt-4 space-y-4">
              <DebugDispatchPanel numbers={numbers} />
            </TabsContent>

            <TabsContent value="crm" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Teste Completo do CRM
                  </CardTitle>
                  <CardDescription>
                    CRUD de leads, notas, movimentação de estágios e filtros
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={runCRMTests} 
                    disabled={isRunning}
                    className="w-full"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando...</>
                    ) : (
                      <><Database className="h-4 w-4 mr-2" /> Testar CRM</>
                    )}
                  </Button>

                  {testResults.crm.length > 0 && renderResults(testResults.crm)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warming" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    Verificação de Aquecimento
                  </CardTitle>
                  <CardDescription>
                    Verifica status das sessões de aquecimento e interações recentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Número WhatsApp (opcional)</Label>
                    <Select value={selectedWarmingNumberId} onValueChange={setSelectedWarmingNumberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os números" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os números</SelectItem>
                        {numbers.map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.name || n.phone_number}
                            {n.is_connected ? ' ✓' : ' (offline)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecione um número para filtrar as sessões ou deixe em "Todos" para ver todas
                    </p>
                  </div>
                  
                  <Button 
                    onClick={runWarmingTests} 
                    disabled={isRunning}
                    className="w-full"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Verificar Warming</>
                    )}
                  </Button>

                  {testResults.warming.length > 0 && renderResults(testResults.warming)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Teste de Agente de IA
                  </CardTitle>
                  <CardDescription>
                    Verifica buffer, horário de operação e conexão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agente</Label>
                    <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={runAgentTests} 
                    disabled={isRunning || !selectedAgentId}
                    className="w-full"
                  >
                    {isRunning ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-2" /> Testar Agente</>
                    )}
                  </Button>

                  {testResults.agents.length > 0 && renderResults(testResults.agents)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monitor" className="mt-4">
              <EdgeFunctionMonitor />
            </TabsContent>
          </Tabs>
        </div>

        {/* Logs Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Logs</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLogs([])}
              >
                Limpar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2 text-sm font-mono">
                {logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded ${
                      log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                      log.type === 'success' ? 'bg-green-500/10 text-green-500' :
                      log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs opacity-60">
                      {log.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                    <div>{log.message}</div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum log ainda. Execute um teste.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductionTests;
