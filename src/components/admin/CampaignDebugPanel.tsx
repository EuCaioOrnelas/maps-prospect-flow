import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
}

interface NumberInfo {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
  daily_sent_count: number;
}

export const CampaignDebugPanel = () => {
  const [email, setEmail] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignDebug[]>([]);
  const [numbers, setNumbers] = useState<NumberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
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
        toast({ title: "Usuário não encontrado", variant: "destructive" });
        setLoading(false);
        return;
      }

      setUserName(profile.name || profile.email);

      // Fetch active campaigns (not completed/cancelled)
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("user_id", profile.id)
        .in("status", ["pending", "running", "paused", "scheduled"])
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch user's numbers
      const { data: numbersData, error: numbersError } = await supabase
        .from("whatsapp_numbers")
        .select("id, name, phone_number, is_connected, daily_sent_count")
        .eq("user_id", profile.id);

      if (numbersError) throw numbersError;

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
    };
    const s = statusMap[campaign.status] || { label: campaign.status, variant: "outline" as const, icon: null };
    return (
      <Badge variant={s.variant} className="gap-1">
        {s.icon}
        {s.label}
      </Badge>
    );
  };

  const getDiagnostics = (campaign: CampaignDebug) => {
    const issues: { type: "error" | "warning" | "info"; message: string }[] = [];
    const now = new Date();

    // Running but no messages sent
    if (campaign.status === "running" && campaign.sent_count === 0 && campaign.started_at) {
      const startedAgo = now.getTime() - new Date(campaign.started_at).getTime();
      const minutesAgo = Math.floor(startedAgo / 60000);
      if (minutesAgo > 5) {
        issues.push({ type: "error", message: `Rodando há ${minutesAgo} min sem enviar nenhuma mensagem` });
      }
    }

    // Running but stuck (no message sent recently)
    if (campaign.status === "running" && campaign.last_message_sent_at) {
      const lastSentAgo = now.getTime() - new Date(campaign.last_message_sent_at).getTime();
      const minutesSinceLastSent = Math.floor(lastSentAgo / 60000);
      if (minutesSinceLastSent > 10) {
        issues.push({ type: "warning", message: `Última mensagem enviada há ${minutesSinceLastSent} min (pode estar travada)` });
      }
    }

    // High failure rate
    if (campaign.sent_count + campaign.failed_count > 0) {
      const failRate = campaign.failed_count / (campaign.sent_count + campaign.failed_count);
      if (failRate > 0.3) {
        issues.push({ type: "error", message: `Taxa de falha alta: ${Math.round(failRate * 100)}%` });
      }
    }

    // Paused by incident
    if (campaign.pause_reason === "incident_detected") {
      issues.push({ type: "error", message: "Pausada por incidente (bloqueio/denúncia detectado)" });
    }

    // Paused at daily limit
    if (campaign.paused_at_limit) {
      issues.push({ type: "warning", message: "Pausada por limite diário atingido" });
    }

    // Scheduled but past schedule time
    if (campaign.status === "scheduled" && campaign.scheduled_at) {
      const scheduledTime = new Date(campaign.scheduled_at);
      if (scheduledTime < now) {
        const minutesLate = Math.floor((now.getTime() - scheduledTime.getTime()) / 60000);
        if (minutesLate > 2) {
          issues.push({ type: "error", message: `Agendada para ${format(scheduledTime, "dd/MM HH:mm")} mas não iniciou (${minutesLate} min de atraso)` });
        }
      }
    }

    // Number not connected
    const numberInfo = getNumberInfo(campaign.whatsapp_number_id);
    if (numberInfo && !numberInfo.is_connected) {
      issues.push({ type: "error", message: `Número "${numberInfo.name}" desconectado` });
    }

    if (!campaign.whatsapp_number_id) {
      issues.push({ type: "error", message: "Nenhum número WhatsApp atribuído" });
    }

    // current_lead_index vs sent_count mismatch
    if (campaign.current_lead_index > campaign.sent_count + campaign.failed_count + 5) {
      issues.push({ type: "warning", message: `Index (${campaign.current_lead_index}) muito à frente de enviados+falhas (${campaign.sent_count + campaign.failed_count})` });
    }

    // Pending for too long
    if (campaign.status === "pending") {
      const createdAgo = now.getTime() - new Date(campaign.created_at).getTime();
      if (createdAgo > 10 * 60000) {
        issues.push({ type: "warning", message: "Campanha pendente há mais de 10 min" });
      }
    }

    if (issues.length === 0) {
      issues.push({ type: "info", message: "Sem problemas detectados" });
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
          Usuário: <strong>{userName}</strong> · {campaigns.length} campanha(s) ativa(s)/pendente(s)
        </p>
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
              <span>{n.daily_sent_count} enviados hoje</span>
            </div>
          ))}
        </div>
      )}

      {/* Campaigns */}
      {searched && campaigns.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
          <p>Nenhuma campanha ativa/pendente/agendada encontrada.</p>
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

              {/* Diagnostics */}
              <div className="space-y-1">
                {diagnostics.map((d, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm ${
                      d.type === "error"
                        ? "text-destructive"
                        : d.type === "warning"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {d.type === "error" ? (
                      <XCircle size={14} />
                    ) : d.type === "warning" ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>{d.message}</span>
                  </div>
                ))}
              </div>

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
                  <span className="text-muted-foreground">Janela</span>
                  <p className="font-semibold">{campaign.current_window || 1} (enviados: {campaign.window_sent_count || 0})</p>
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
                    <span>{formatDate(campaign.resume_at)}</span>
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
