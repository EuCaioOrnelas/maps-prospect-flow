import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueLead, useRevenueEvents } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Morno",
  HOT: "Engajado",
  VERY_HOT: "Quente",
};

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskLabels: Record<string, string> = {
  OK: "Saudável",
  COOLING: "Esfriando",
  AT_RISK: "Em Risco",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-warning/10 text-warning",
  AT_RISK: "bg-destructive/10 text-destructive",
};

const eventLabels: Record<string, string> = {
  INBOUND_MESSAGE: "Mensagem recebida",
  OUTBOUND_MESSAGE: "Mensagem enviada",
  INTENT_PRICE: "Perguntou sobre preço",
  INTENT_BUY_NOW: "Intenção de compra",
  INTENT_AVAILABILITY: "Perguntou disponibilidade",
  INTENT_PAYMENT: "Falou sobre pagamento",
  INTENT_PROPOSAL: "Pediu proposta",
  INTENT_URGENT: "Demonstrou urgência",
  INTENT_OBJECTION: "Fez objeção",
  INTENT_NEGATIVE: "Sinalizou desinteresse",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Respondeu em menos de 1h",
  INBOUND_STREAK_3: "Sequência de 3 mensagens",
  INBOUND_AFTER_24H_SILENCE: "Voltou após 24h de silêncio",
  INBOUND_AFTER_7D_SILENCE: "Voltou após 7 dias de silêncio",
  LINK_CLICK: "Clicou em link",
  FORM_SUBMIT: "Enviou formulário",
  CALL_REQUEST: "Pediu ligação",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "Resposta rápida (< 5min)",
  SLA_FIRST_RESPONSE_5_TO_30MIN: "Resposta em 5–30min",
  SLA_FIRST_RESPONSE_OVER_30MIN: "Resposta lenta (> 30min)",
  UNREPLIED_INBOUND_OVER_2H: "Sem resposta há 2h+",
  UNREPLIED_INBOUND_OVER_24H: "Sem resposta há 24h+",
  CONVERSATION_ACTIVE_3D: "Conversa ativa por 3 dias",
  CONVERSATION_ACTIVE_5D: "Conversa ativa por 5 dias",
  BACK_AND_FORTH_5_TURNS: "5 trocas de mensagens",
};

const eventIcons: Record<string, string> = {
  INBOUND_MESSAGE: "💬",
  OUTBOUND_MESSAGE: "📤",
  INTENT_PRICE: "💰",
  INTENT_BUY_NOW: "🔥",
  INTENT_AVAILABILITY: "📅",
  INTENT_PAYMENT: "💳",
  INTENT_PROPOSAL: "📄",
  INTENT_URGENT: "⚡",
  INTENT_OBJECTION: "⚠️",
  INTENT_NEGATIVE: "🚫",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "⏱️",
  LINK_CLICK: "🔗",
  CALL_REQUEST: "📞",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "✅",
  SLA_FIRST_RESPONSE_OVER_30MIN: "❌",
};

const getRecommendation = (lead: { status_bucket: string; risk_state: string; risk_reason: string | null }) => {
  if (lead.risk_state === "AT_RISK") {
    return { text: "Este lead está em risco de ser perdido! Tente reengajar imediatamente com uma mensagem personalizada.", color: "text-destructive" };
  }
  if (lead.risk_state === "COOLING") {
    return { text: "O engajamento está caindo. Envie uma mensagem de acompanhamento para manter o interesse.", color: "text-warning" };
  }
  if (lead.status_bucket === "VERY_HOT") {
    return { text: "Lead com altíssimo engajamento! É hora de enviar uma proposta ou fechar a venda.", color: "text-primary" };
  }
  if (lead.status_bucket === "HOT") {
    return { text: "Lead quente — mantenha a conversa ativa e qualifique a oportunidade.", color: "text-orange-400" };
  }
  return { text: "Engajamento normal. Continue acompanhando as interações.", color: "text-muted-foreground" };
};

const RevenueLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading: loadingLead } = useRevenueLead(id || "");
  const { data: events, isLoading: loadingEvents } = useRevenueEvents(id || "");

  if (loadingLead) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-muted-foreground">Lead não encontrado.</p>
        <Link to="/revenue/leads" className="text-primary text-sm hover:underline mt-2 inline-block">
          ← Voltar para leads
        </Link>
      </div>
    );
  }

  const recommendation = getRecommendation(lead);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        to="/revenue/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Voltar para leads
      </Link>

      {/* Lead card */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {lead.name || lead.phone_e164}
              </h1>
              <p className="text-sm text-muted-foreground">{lead.phone_e164}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", bucketColors[lead.status_bucket])}>
                {bucketLabels[lead.status_bucket]}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", riskBadge[lead.risk_state])}>
                {riskLabels[lead.risk_state]}
              </Badge>
            </div>
          </div>

          {/* Score */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Pontuação</p>
              <p className="text-2xl font-bold text-primary">{lead.score_total}</p>
              <p className="text-[10px] text-muted-foreground">de 1000</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Primeiro contato</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(lead.first_seen_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Última atividade</p>
              <p className="text-sm font-medium text-foreground">
                {formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Tags</p>
              <p className="text-sm font-medium text-foreground">
                {lead.tags?.length || 0}
              </p>
            </div>
          </div>

          {/* Risk reason */}
          {lead.risk_reason && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{lead.risk_reason}</p>
            </div>
          )}

          {/* Recommendation */}
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
            <TrendingUp size={16} className={cn("mt-0.5 shrink-0", recommendation.color)} />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Ação sugerida</p>
              <p className={cn("text-sm font-medium", recommendation.color)}>{recommendation.text}</p>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm text-foreground">{lead.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events timeline */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock size={16} />
            Histórico de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20"
                >
                  <span className="text-lg shrink-0">
                    {eventIcons[event.event_type] || "📌"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {eventLabels[event.event_type] || event.event_type.replace(/_/g, " ")}
                    </p>
                    {event.event_value !== 0 && (
                      <span
                        className={cn(
                          "text-xs font-bold",
                          event.event_value > 0 ? "text-primary" : "text-destructive"
                        )}
                      >
                        {event.event_value > 0 ? "+" : ""}
                        {event.event_value} pts
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueLeadDetail;
