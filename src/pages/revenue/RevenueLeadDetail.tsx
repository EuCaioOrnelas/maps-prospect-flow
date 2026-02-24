import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, TrendingUp, Clock, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueLead, useRevenueEvents } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary",
  COOLING: "bg-warning/10 text-warning",
  AT_RISK: "bg-destructive/10 text-destructive",
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
};

const getRecommendation = (lead: { status_bucket: string; risk_state: string; risk_reason: string | null }) => {
  if (lead.risk_state === "AT_RISK") {
    return { text: "Lead em risco! Reengajar imediatamente.", color: "text-destructive" };
  }
  if (lead.risk_state === "COOLING") {
    return { text: "Lead esfriando — enviar mensagem de reengajamento.", color: "text-warning" };
  }
  if (lead.status_bucket === "VERY_HOT") {
    return { text: "Lead muito quente — enviar proposta ou fechar.", color: "text-primary" };
  }
  if (lead.status_bucket === "HOT") {
    return { text: "Lead quente — manter conversa ativa, qualificar.", color: "text-orange-400" };
  }
  return { text: "Continuar acompanhando o engajamento.", color: "text-muted-foreground" };
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
      <Card className="bg-card border-border">
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
                {lead.status_bucket.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", riskBadge[lead.risk_state])}>
                {lead.risk_state}
              </Badge>
            </div>
          </div>

          {/* Score */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{lead.score_total}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Primeira vez</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(lead.first_seen_at), "dd/MM/yy", { locale: ptBR })}
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
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock size={16} />
            Timeline de Eventos
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
                      {event.event_type.replace(/_/g, " ")}
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
