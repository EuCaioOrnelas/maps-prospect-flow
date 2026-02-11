import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LeadAnalysisPanel } from "./LeadAnalysisPanel";
import {
  Search,
  Loader2,
  Bug,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Calendar,
  MessageSquare,
  XCircle,
  Smartphone,
  Activity,
  RefreshCw,
  Server,
  Database,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface CampaignDebug {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  current_lead_index: number;
  delay_seconds: number;
  delay_seconds_max: number;
  enable_smart_pause: boolean;
  pause_after_contacts: number | null;
  pause_minutes: number | null;
  pause_reason: string | null;
  paused_at_limit: boolean | null;
  resume_at: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_message_sent_at: string | null;
  created_at: string;
  updated_at: string;
  whatsapp_number_id: string | null;
  total_responses: number | null;
  current_window: number | null;
  window_sent_count: number | null;
  simulation_mode: boolean | null;
  is_first_stage: boolean | null;
  first_10_no_response_count: number | null;
  leads: unknown[];
  messages: unknown[];
}

interface NumberInfo {
  id: string;
  name: string;
  phone_number: string | null;
  instance_name: string | null;
  is_connected: boolean;
  daily_sent_count: number;
  last_sent_at: string | null;
}

interface HeartbeatInfo {
  id: string;
  action: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  campaigns_processed: number | null;
  messages_sent: number | null;
  error_message: string | null;
}

interface DiagnosticItem {
  type: "error" | "warning" | "info";
  message: string;
  cause: string;
  fix: string;
  category?: string;
}

export const CampaignDebugPanel = () => {
  const [email, setEmail] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignDebug[]>([]);
  const [numbers, setNumbers] = useState<NumberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [heartbeats, setHeartbeats] = useState<HeartbeatInfo[]>([]);
  const [ignoredCounts, setIgnoredCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const searchCampaigns = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        setCampaigns([]);
        setNumbers([]);
        setUserName(null);
        setHeartbeats([]);
        setIgnoredCounts({});
        toast({ title: "Usuário não encontrado", variant: "destructive" });
        setLoading(false);
        return;
      }

      setUserName(profile.name || profile.email);

      // Fetch ALL campaigns (include completed/cancelled for full picture)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (campaignsError) throw campaignsError;

      // Fetch user's numbers with instance_name
      const { data: numbersData, error: numbersError } = await supabase
        .from("whatsapp_numbers")
        .select("id, name, phone_number, instance_name, is_connected, daily_sent_count, last_sent_at")
        .eq("user_id", profile.id);

      if (numbersError) throw numbersError;

      // Fetch recent heartbeats (last 5)
      const { data: heartbeatData } = await supabase
        .from("campaign_processor_heartbeats")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);

      setHeartbeats((heartbeatData || []) as HeartbeatInfo[]);

      // Fetch ignored contacts count per campaign
      const activeCampaigns = (campaignsData || []).filter(c => 
        ["pending", "running", "paused", "scheduled"].includes(c.status)
      );
      
      const counts: Record<string, number> = {};
      for (const c of activeCampaigns) {
        const { count } = await supabase
          .from("ignored_contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("campaign_id", c.id);
        counts[c.id] = count || 0;
      }
      setIgnoredCounts(counts);

      setCampaigns((campaignsData || []) as unknown as CampaignDebug[]);
      setNumbers(numbersData || []);
    } catch (err) {
      console.error("Error searching campaigns:", err);
      toast({ title: "Erro ao buscar campanhas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getNumberInfo = (numberId: string | null | undefined) => {
    if (!numberId) return null;
    return numbers.find((n) => n.id === numberId) || null;
  };

  const getStatusBadge = (campaign: CampaignDebug) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      running: { label: "Rodando", variant: "default", icon: <Activity size={12} /> },
      paused: { label: "Pausada", variant: "secondary", icon: <Pause size={12} /> },
      scheduled: { label: "Agendada", variant: "outline", icon: <Calendar size={12} /> },
      pending: { label: "Pendente", variant: "outline", icon: <Clock size={12} /> },
      completed: { label: "Concluída", variant: "default", icon: <CheckCircle2 size={12} /> },
      cancelled: { label: "Cancelada", variant: "destructive", icon: <XCircle size={12} /> },
      failed: { label: "Falhou", variant: "destructive", icon: <XCircle size={12} /> },
    };
    const s = statusMap[campaign.status] || { label: campaign.status, variant: "outline" as const, icon: null };
    return (
      <Badge variant={s.variant} className="gap-1">
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const getDiagnostics = (campaign: CampaignDebug): DiagnosticItem[] => {
    const issues: DiagnosticItem[] = [];
    const now = new Date();
    const numberInfo = getNumberInfo(campaign.whatsapp_number_id);

    // ===== INFRASTRUCTURE CHECKS =====

    // Check if processor is running at all
    if (heartbeats.length > 0) {
      const lastHeartbeat = heartbeats[0];
      const lastHeartbeatAge = now.getTime() - new Date(lastHeartbeat.started_at).getTime();
      const minutesSinceHeartbeat = Math.floor(lastHeartbeatAge / 60000);
      
      if (minutesSinceHeartbeat > 3) {
        issues.push({
          type: "error",
          message: `⚙️ Campaign Processor PARADO — último heartbeat há ${minutesSinceHeartbeat} min`,
          cause: "O cron job que executa o campaign-processor não está rodando. Sem ele, NENHUMA campanha será processada. Causa: cron job deletado, Edge Function com erro de deploy, ou infraestrutura Supabase indisponível.",
          fix: "1) Verificar se o cron job 'campaign-processor' existe no pg_cron. 2) Verificar se a Edge Function 'campaign-processor' está deployada sem erros. 3) Testar manualmente via curl: POST /functions/v1/campaign-processor com body {\"action\":\"process\"}.",
          category: "infra"
        });
      }

      if (lastHeartbeat.status === "running" && lastHeartbeat.completed_at === null) {
        const runningFor = Math.floor(lastHeartbeatAge / 60000);
        if (runningFor > 2) {
          issues.push({
            type: "error",
            message: `⚙️ Processor travou na última execução (rodando há ${runningFor} min sem completar)`,
            cause: "A última execução do campaign-processor iniciou mas nunca finalizou. Possível timeout na Edge Function, erro não capturado, ou loop infinito.",
            fix: "1) Verificar logs do campaign-processor para a execução com ID: " + lastHeartbeat.id.slice(0, 8) + ". 2) Próxima execução do cron deve criar um novo heartbeat normalmente.",
            category: "infra"
          });
        }
      }

      if (lastHeartbeat.error_message) {
        issues.push({
          type: "error",
          message: `⚙️ Último processamento teve erro: ${lastHeartbeat.error_message}`,
          cause: "O campaign-processor encontrou um erro na última execução.",
          fix: "Verificar os logs da Edge Function para detalhes do erro.",
          category: "infra"
        });
      }
    } else if (campaign.status === "running" || campaign.status === "pending") {
      issues.push({
        type: "error",
        message: "⚙️ Nenhum heartbeat do processador encontrado",
        cause: "O campaign-processor nunca foi executado ou a tabela de heartbeats está vazia. Sem o processador, campanhas não serão processadas.",
        fix: "1) Verificar se o cron job está configurado. 2) Executar manualmente o processador para testar.",
        category: "infra"
      });
    }

    // ===== NUMBER/CONNECTION CHECKS =====

    if (!campaign.whatsapp_number_id) {
      issues.push({
        type: "error",
        message: "📱 Nenhum número WhatsApp atribuído à campanha",
        cause: "A campanha foi criada sem selecionar um número de envio. Bug no fluxo de criação de campanha (código frontend).",
        fix: "Esta campanha não pode funcionar. O usuário precisa cancelar e criar uma nova campanha selecionando um número. Verificar o código do componente de criação de campanha.",
        category: "number"
      });
    } else if (!numberInfo) {
      issues.push({
        type: "error",
        message: "📱 Número atribuído não existe mais no banco de dados",
        cause: `O whatsapp_number_id "${campaign.whatsapp_number_id}" não foi encontrado. O número pode ter sido deletado após a criação da campanha.`,
        fix: "Campanha irrecuperável. O processador vai pausá-la com 'Número não configurado'. Cancelar e recriar com um número válido.",
        category: "number"
      });
    } else {
      if (!numberInfo.is_connected) {
        issues.push({
          type: "error",
          message: `📱 Número "${numberInfo.name}" está DESCONECTADO`,
          cause: "O WhatsApp perdeu a conexão. O processador vai pular esta campanha a cada ciclo até reconectar. Causas: WhatsApp Web deslogado, celular sem internet, sessão expirada.",
          fix: "1) Pedir ao usuário para reconectar via QR Code na tela 'Números'. 2) Verificar se o celular está ligado e com internet. 3) Se não funcionar, reconectar a instância manualmente.",
          category: "number"
        });
      }

      if (!numberInfo.instance_name) {
        issues.push({
          type: "error",
          message: `📱 Número "${numberInfo.name}" sem instance_name`,
          cause: "O número não tem uma instância na Evolution API. O processador vai pausar a campanha com 'Número não configurado'. Causas: instância nunca criada, ou foi deletada.",
          fix: "1) O usuário precisa ir em 'Números', deletar e recriar este número. 2) Após criar, reconectar via QR Code. 3) Depois, retomar a campanha.",
          category: "number"
        });
      }

      // Check daily limit
      if (numberInfo.daily_sent_count >= 200) {
        issues.push({
          type: "warning",
          message: `📱 Número atingiu limite diário (${numberInfo.daily_sent_count}/200)`,
          cause: "O número já enviou 200 mensagens hoje. O processador pausa a campanha automaticamente até a meia-noite (São Paulo).",
          fix: "Comportamento esperado. O contador reseta à meia-noite (horário de São Paulo) e a campanha retoma automaticamente.",
          category: "number"
        });
      }
    }

    // ===== CAMPAIGN DATA CHECKS =====

    // Parse and validate leads
    let leads: any[] = [];
    try {
      leads = Array.isArray(campaign.leads) ? campaign.leads : 
              typeof campaign.leads === 'string' ? JSON.parse(campaign.leads as string) : [];
    } catch { leads = []; }

    let messages: string[] = [];
    try {
      messages = Array.isArray(campaign.messages) ? campaign.messages as string[] :
                 typeof campaign.messages === 'string' ? JSON.parse(campaign.messages as string) : [];
    } catch { messages = []; }

    const validMessages = messages.filter(m => m?.trim());

    if (leads.length === 0) {
      issues.push({
        type: "error",
        message: "📋 Campanha sem leads (lista vazia)",
        cause: "O campo 'leads' da campanha está vazio ou é inválido. Possível bug no salvamento da campanha: leads não foram persistidos no JSON, ou o formato da planilha estava incorreto.",
        fix: "1) Verificar no banco o campo 'leads' desta campanha (pode estar como '[]' ou null). 2) Cancelar e recriar com leads válidos. 3) Verificar se a planilha importada tinha colunas 'name' e 'phone'.",
        category: "data"
      });
    } else {
      // Check leads with no phone
      const leadsNoPhone = leads.filter(l => !l?.phone && !l?.telefone);
      if (leadsNoPhone.length > 0) {
        const pct = Math.round((leadsNoPhone.length / leads.length) * 100);
        issues.push({
          type: leadsNoPhone.length === leads.length ? "error" : "warning",
          message: `📋 ${leadsNoPhone.length}/${leads.length} leads sem telefone (${pct}%)`,
          cause: leadsNoPhone.length === leads.length
            ? "NENHUM lead tem telefone. A campanha vai falhar em todos. Causa provável: planilha importada sem coluna 'phone' ou 'telefone', ou colunas mapeadas incorretamente."
            : "Alguns leads não têm telefone e serão contados como falha pelo processador.",
          fix: leadsNoPhone.length === leads.length
            ? "Cancelar campanha. Reimportar planilha verificando que a coluna de telefone está como 'phone' ou 'telefone'. Exemplo de lead esperado: {\"name\": \"João\", \"phone\": \"11999998888\"}."
            : "Leads sem telefone serão pulados automaticamente. Se forem muitos, reimportar com dados corretos.",
          category: "data"
        });
      }

      // Check for all leads being ignored
      const ignoredCount = ignoredCounts[campaign.id] || 0;
      if (ignoredCount > 0 && campaign.status === "running") {
        const remainingLeads = leads.length - campaign.current_lead_index;
        if (ignoredCount >= remainingLeads && remainingLeads > 0) {
          issues.push({
            type: "error",
            message: `🚫 ${ignoredCount} contatos ignorados — possivelmente todos os leads restantes já foram contatados`,
            cause: "Os leads restantes já estão na lista de 'ignored_contacts' (já receberam mensagem anteriormente). O processador pula contatos ignorados e conta como falha.",
            fix: "1) Se é uma segunda campanha para os mesmos leads, isso é esperado — apenas leads que responderam são removidos da lista ignorados. 2) Para reenviar, é necessário limpar a tabela 'ignored_contacts' para este usuário.",
            category: "data"
          });
        } else if (ignoredCount > 0) {
          issues.push({
            type: "info",
            message: `🚫 ${ignoredCount} contatos já na lista de ignorados para esta campanha`,
            cause: "Contatos que já receberam mensagem de campanhas anteriores são pulados automaticamente.",
            fix: "Comportamento esperado. Leads ignorados são contados como falha no progresso.",
            category: "data"
          });
        }
      }

      // Check current lead at index
      if (campaign.current_lead_index < leads.length && campaign.status === "running") {
        const currentLead = leads[campaign.current_lead_index];
        const currentPhone = currentLead?.phone || currentLead?.telefone;
        if (!currentPhone) {
          issues.push({
            type: "warning",
            message: `📋 Lead atual (#${campaign.current_lead_index + 1}) não tem telefone: ${JSON.stringify(currentLead).slice(0, 100)}`,
            cause: "O próximo lead a ser processado não tem telefone. O processador vai contar como falha e pular para o próximo.",
            fix: "O processador avança automaticamente. Se todos os próximos leads estão sem telefone, a campanha vai 'completar' com muitas falhas.",
            category: "data"
          });
        }
      }
    }

    if (validMessages.length === 0) {
      issues.push({
        type: "error",
        message: "💬 Campanha sem mensagens válidas",
        cause: "O campo 'messages' está vazio ou todas as mensagens são strings vazias. Bug no fluxo de criação: as mensagens não foram salvas corretamente.",
        fix: "Campanha não vai funcionar. Cancelar e recriar com mensagens válidas. Verificar código do componente MessageVariations.",
        category: "data"
      });
    }

    // ===== CAMPAIGN STATE CHECKS =====

    // Running but no messages sent for a while
    if (campaign.status === "running" && campaign.sent_count === 0 && campaign.started_at) {
      const startedAgo = now.getTime() - new Date(campaign.started_at).getTime();
      const minutesAgo = Math.floor(startedAgo / 60000);
      if (minutesAgo > 5) {
        // Build detailed cause
        const causes: string[] = [];
        if (numberInfo && !numberInfo.is_connected) causes.push("número desconectado");
        if (numberInfo && !numberInfo.instance_name) causes.push("sem instance_name");
        if (leads.length === 0) causes.push("sem leads");
        if (validMessages.length === 0) causes.push("sem mensagens");
        const leadsNoPhone = leads.filter(l => !l?.phone && !l?.telefone);
        if (leadsNoPhone.length === leads.length && leads.length > 0) causes.push("nenhum lead tem telefone");
        
        const processorOk = heartbeats.length > 0 && 
          (now.getTime() - new Date(heartbeats[0].started_at).getTime()) < 3 * 60000;
        if (!processorOk) causes.push("processador pode estar parado");

        issues.push({
          type: "error",
          message: `🔴 Rodando há ${minutesAgo} min sem enviar NENHUMA mensagem`,
          cause: causes.length > 0
            ? `Problemas detectados: ${causes.join(", ")}. O processador busca campanhas 'running', obtém o número, verifica conexão, e tenta enviar ao lead atual.`
            : "Nenhum problema óbvio detectado nos dados. O erro pode estar no código do campaign-processor, na Evolution API, ou na rede.",
          fix: causes.length > 0
            ? "Resolver os problemas listados acima primeiro."
            : "1) Verificar logs do campaign-processor (Edge Function logs). 2) Testar envio manual via evolution-send-message. 3) Verificar se a Evolution API está acessível.",
          category: "state"
        });
      }
    }

    // Running but stuck (no message sent recently)
    if (campaign.status === "running" && campaign.last_message_sent_at && campaign.sent_count > 0) {
      const lastSentAgo = now.getTime() - new Date(campaign.last_message_sent_at).getTime();
      const minutesSinceLastSent = Math.floor(lastSentAgo / 60000);
      if (minutesSinceLastSent > 10) {
        issues.push({
          type: "warning",
          message: `⏱️ Última mensagem enviada há ${minutesSinceLastSent} min (campanha pode estar travada)`,
          cause: "A campanha parou de enviar. Possíveis causas: smart pause ativa, lead atual sem telefone, todos os leads restantes ignorados, ou erro na Evolution API.",
          fix: "1) Verificar se smart_pause está ativa. 2) Checar o lead atual no índice " + campaign.current_lead_index + ". 3) Verificar logs do processador. 4) Se persistir, pausar e retomar manualmente.",
          category: "state"
        });
      }
    }

    // High failure rate
    if (campaign.sent_count + campaign.failed_count > 0) {
      const failRate = campaign.failed_count / (campaign.sent_count + campaign.failed_count);
      if (failRate > 0.3) {
        issues.push({
          type: "error",
          message: `📊 Taxa de falha alta: ${Math.round(failRate * 100)}% (${campaign.failed_count} falhas de ${campaign.sent_count + campaign.failed_count})`,
          cause: "Muitas mensagens falharam. Causas: telefones inválidos na planilha (sem DDD, formato errado), contatos sem WhatsApp, número bloqueado pela Meta, ou instabilidade da Evolution API.",
          fix: "1) Verificar os leads importados — telefones devem ter DDD+9 dígitos (ex: 11999998888). 2) Checar se o número não foi banido. 3) Testar envio manual para um número válido.",
          category: "state"
        });
      }
    }

    // Paused by incident
    if (campaign.pause_reason === "incident_detected") {
      issues.push({
        type: "error",
        message: "🚨 Pausada por incidente (bloqueio/denúncia detectado)",
        cause: "Um contato denunciou/bloqueou o número durante o envio. Campanha pausada automaticamente como proteção.",
        fix: "1) NÃO retomar imediatamente — esperar 24h+. 2) Revisar conteúdo das mensagens. 3) Reduzir volume diário. 4) Se o número foi banido, usar outro número.",
        category: "state"
      });
    }

    // Paused at daily limit
    if (campaign.paused_at_limit) {
      issues.push({
        type: "warning",
        message: "⏸️ Pausada por limite diário atingido",
        cause: "O número atingiu 200 envios hoje. A campanha retoma automaticamente após a meia-noite (São Paulo).",
        fix: `Comportamento esperado.${campaign.resume_at ? ` Retoma prevista: ${formatDate(campaign.resume_at)}` : ""}`,
        category: "state"
      });
    }

    // Paused with smart_pause reason
    if (campaign.status === "paused" && campaign.pause_reason === "smart_pause") {
      issues.push({
        type: "info",
        message: `⏸️ Pausada por Smart Pause (pausa de ${campaign.pause_minutes || 5} min a cada ${campaign.pause_after_contacts || 50} contatos)`,
        cause: "Comportamento esperado. A campanha faz pausas periódicas para parecer mais natural e evitar bloqueios.",
        fix: campaign.resume_at ? `Retoma automática em: ${formatDate(campaign.resume_at)} (${formatRelative(campaign.resume_at)})` : "Retoma automática no próximo ciclo do processador.",
        category: "state"
      });
    }

    // Scheduled but past schedule time
    if (campaign.status === "scheduled" && campaign.scheduled_at) {
      const scheduledTime = new Date(campaign.scheduled_at);
      if (scheduledTime < now) {
        const minutesLate = Math.floor((now.getTime() - scheduledTime.getTime()) / 60000);
        if (minutesLate > 2) {
          issues.push({
            type: "error",
            message: `📅 Agendada para ${format(scheduledTime, "dd/MM HH:mm")} mas não iniciou (${minutesLate} min de atraso)`,
            cause: "O campaign-processor deveria ter mudado o status para 'running'. Possíveis causas: processador parado, erro na query de campanhas agendadas.",
            fix: "1) Verificar se o processador está rodando (ver heartbeats acima). 2) Verificar logs. 3) Se necessário, mudar status manualmente para 'running' no banco.",
            category: "state"
          });
        }
      }
    }

    // Pending for too long
    if (campaign.status === "pending") {
      const createdAgo = now.getTime() - new Date(campaign.created_at).getTime();
      if (createdAgo > 10 * 60000) {
        issues.push({
          type: "warning",
          message: "⏳ Campanha pendente há mais de 10 min",
          cause: "Campanhas 'pending' precisam ser iniciadas pelo frontend (via campaign-processor action: 'start'). Se nunca foi chamado, a campanha ficará pendente indefinidamente.",
          fix: "1) Verificar se o frontend chamou a action 'start' do campaign-processor. 2) O usuário pode ter saído da página antes de confirmar. 3) Tentar iniciar manualmente via curl.",
          category: "state"
        });
      }
    }

    // Index ahead of progress
    if (campaign.current_lead_index > campaign.sent_count + campaign.failed_count + 5) {
      issues.push({
        type: "warning",
        message: `📋 Index (${campaign.current_lead_index}) muito à frente de enviados+falhas (${campaign.sent_count + campaign.failed_count})`,
        cause: "Desalinhamento entre o índice do lead e o progresso registrado. Leads podem ter sido pulados sem contagem.",
        fix: "Monitorar — se a campanha continua avançando, não é crítico. Pode indicar leads sem telefone sendo pulados rapidamente.",
        category: "data"
      });
    }

    // Campaign completed or cancelled — just show summary
    if (campaign.status === "completed") {
      const successRate = campaign.sent_count + campaign.failed_count > 0
        ? Math.round((campaign.sent_count / (campaign.sent_count + campaign.failed_count)) * 100)
        : 0;
      issues.push({
        type: successRate > 70 ? "info" : "warning",
        message: `✅ Campanha concluída — ${campaign.sent_count} enviadas, ${campaign.failed_count} falhas (${successRate}% sucesso)`,
        cause: "",
        fix: "",
        category: "state"
      });
    }

    if (campaign.status === "cancelled") {
      issues.push({
        type: "info",
        message: "❌ Campanha foi cancelada pelo usuário",
        cause: "",
        fix: "",
        category: "state"
      });
    }

    if (issues.length === 0) {
      issues.push({ type: "info", message: "✅ Sem problemas detectados — campanha parece saudável", cause: "", fix: "" });
    }

    return issues;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const formatRelative = (date: string | null) => {
    if (!date) return "";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bug size={20} className="text-orange-500" />
        <h2 className="text-lg font-semibold">Debug de Campanhas</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Email do usuário..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchCampaigns()}
          className="max-w-sm"
        />
        <Button onClick={searchCampaigns} disabled={loading} className="gap-1">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </Button>
        {searched && (
          <Button variant="outline" size="icon" onClick={searchCampaigns} disabled={loading}>
            <RefreshCw size={16} />
          </Button>
        )}
      </div>

      {searched && userName && (
        <p className="text-sm text-muted-foreground mb-4">
          Usuário: <strong>{userName}</strong> · {campaigns.length} campanha(s) encontrada(s)
        </p>
      )}

      {/* Processor Health */}
      {searched && heartbeats.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Server size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Saúde do Processador (últimos 5 heartbeats)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {heartbeats.map((hb) => {
              const age = Math.floor((Date.now() - new Date(hb.started_at).getTime()) / 60000);
              const isRecent = age < 3;
              const isFailed = hb.status !== "completed" && hb.completed_at === null && age > 2;
              return (
                <div key={hb.id} className={`text-xs px-2 py-1 rounded border ${
                  isFailed ? "border-destructive/50 bg-destructive/10 text-destructive" :
                  isRecent ? "border-green-500/30 bg-green-500/10 text-green-600" :
                  "border-border bg-muted/40 text-muted-foreground"
                }`}>
                  <span>{age}m atrás</span>
                  <span className="mx-1">·</span>
                  <span>{hb.campaigns_processed ?? 0} camp</span>
                  <span className="mx-1">·</span>
                  <span>{hb.messages_sent ?? 0} msgs</span>
                  <span className="mx-1">·</span>
                  <span>{isFailed ? "❌ travou" : hb.status === "completed" ? "✅" : "⏳"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Numbers status */}
      {searched && numbers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {numbers.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                n.is_connected
                  ? "border-green-500/30 bg-green-500/10 text-green-600"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <Smartphone size={12} />
              <span>{n.name}</span>
              {n.phone_number && <span className="opacity-60">({n.phone_number})</span>}
              <span>·</span>
              <span>{n.is_connected ? "Conectado" : "Desconectado"}</span>
              <span>·</span>
              <span>{n.daily_sent_count}/200 hoje</span>
              {!n.instance_name && <span className="text-destructive font-medium">· Sem instância!</span>}
            </div>
          ))}
        </div>
      )}

      {/* Campaigns */}
      {searched && campaigns.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>Nenhuma campanha encontrada para este usuário.</p>
        </div>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign) => {
          const diagnostics = getDiagnostics(campaign);
          const hasErrors = diagnostics.some((d) => d.type === "error");
          const hasWarnings = diagnostics.some((d) => d.type === "warning");
          const progress =
            campaign.total_leads > 0
              ? ((campaign.sent_count + campaign.failed_count) / campaign.total_leads) * 100
              : 0;
          const numberInfo = getNumberInfo(campaign.whatsapp_number_id);

          return (
            <div
              key={campaign.id}
              className={`rounded-xl border p-4 space-y-3 ${
                hasErrors
                  ? "border-destructive/50 bg-destructive/5"
                  : hasWarnings
                  ? "border-yellow-500/50 bg-yellow-500/5"
                  : "border-border bg-muted/20"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{campaign.name}</h3>
                    {getStatusBadge(campaign)}
                    {campaign.simulation_mode && (
                      <Badge variant="outline" className="text-xs">Simulação</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{campaign.id}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted/40 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    hasErrors ? "bg-destructive" : hasWarnings ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>

              {/* Diagnostics */}
              <div className="space-y-2">
                {diagnostics.map((d, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 text-sm ${
                      d.type === "error"
                        ? "bg-destructive/10 border border-destructive/30"
                        : d.type === "warning"
                        ? "bg-yellow-500/10 border border-yellow-500/30"
                        : "bg-green-500/10 border border-green-500/30"
                    }`}
                  >
                    <div className={`flex items-center gap-2 font-medium ${
                      d.type === "error"
                        ? "text-destructive"
                        : d.type === "warning"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                    }`}>
                      {d.type === "error" ? (
                        <XCircle size={14} />
                      ) : d.type === "warning" ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      <span>{d.message}</span>
                      {d.category && (
                        <Badge variant="outline" className="text-[10px] ml-auto px-1.5 py-0">
                          {d.category}
                        </Badge>
                      )}
                    </div>
                    {d.cause && (
                      <div className="mt-2 ml-5 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Causa provável:</strong> {d.cause}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Como resolver:</strong> {d.fix}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Lead Analysis */}
              <LeadAnalysisPanel leads={Array.isArray((campaign as any).leads) ? (campaign as any).leads : []} campaignId={campaign.id} />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Progresso</span>
                  <p className="font-semibold">{Math.round(progress)}% ({campaign.sent_count + campaign.failed_count}/{campaign.total_leads})</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Enviadas</span>
                  <p className="font-semibold text-green-600">{campaign.sent_count}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Falhas</span>
                  <p className="font-semibold text-destructive">{campaign.failed_count}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Respostas</span>
                  <p className="font-semibold text-blue-500">{campaign.total_responses || 0}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Index Atual</span>
                  <p className="font-semibold">{campaign.current_lead_index}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <span className="text-muted-foreground">Ignorados</span>
                  <p className="font-semibold">{ignoredCounts[campaign.id] ?? "—"}</p>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Criada em:</span>
                  <span>{formatDate(campaign.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última atualização:</span>
                  <span>{formatDate(campaign.updated_at)} <span className="opacity-60">({formatRelative(campaign.updated_at)})</span></span>
                </div>
                {campaign.started_at && (
                  <div className="flex justify-between">
                    <span>Iniciada em:</span>
                    <span>{formatDate(campaign.started_at)} <span className="opacity-60">({formatRelative(campaign.started_at)})</span></span>
                  </div>
                )}
                {campaign.scheduled_at && (
                  <div className="flex justify-between">
                    <span>Agendada para:</span>
                    <span>{formatDate(campaign.scheduled_at)}</span>
                  </div>
                )}
                {campaign.last_message_sent_at && (
                  <div className="flex justify-between">
                    <span>Última msg enviada:</span>
                    <span>{formatDate(campaign.last_message_sent_at)} <span className="opacity-60">({formatRelative(campaign.last_message_sent_at)})</span></span>
                  </div>
                )}
                {campaign.resume_at && (
                  <div className="flex justify-between">
                    <span>Retoma em:</span>
                    <span>{formatDate(campaign.resume_at)} <span className="opacity-60">({formatRelative(campaign.resume_at)})</span></span>
                  </div>
                )}
              </div>

              {/* Config details */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Delay: {campaign.delay_seconds}-{campaign.delay_seconds_max}s</span>
                {campaign.enable_smart_pause && (
                  <span>Smart Pause: a cada {campaign.pause_after_contacts} contatos, {campaign.pause_minutes} min</span>
                )}
                {campaign.pause_reason && <span>Razão pausa: <strong>{campaign.pause_reason}</strong></span>}
                {numberInfo && (
                  <span>
                    Número: {numberInfo.name} {numberInfo.phone_number ? `(${numberInfo.phone_number})` : ""} — {numberInfo.is_connected ? "✅" : "❌ Desconectado"}
                    {numberInfo.instance_name ? ` — inst: ${numberInfo.instance_name}` : " — ⚠️ SEM INSTÂNCIA"}
                  </span>
                )}
                {campaign.is_first_stage !== null && <span>1º estágio: {campaign.is_first_stage ? "Sim" : "Não"}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
