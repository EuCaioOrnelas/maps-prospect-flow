import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, TrendingUp, Clock, BarChart3, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRevenueLead, useRevenueEvents, useRevenueScoreLogs, useRevenueScoreSnapshots } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useState } from "react";
import { ScoreBreakdownCard } from "@/components/revenue/ScoreBreakdownCard";

const bucketLabels: Record<string, string> = {
  COLD: "Frio", ENGAGED: "Morno", HOT: "Engajado", VERY_HOT: "Quente",
};
const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};
const riskLabels: Record<string, string> = { OK: "Saudável", COOLING: "Esfriando", AT_RISK: "Em Risco" };
const riskBadge: Record<string, string> = {
  OK: "bg-primary/10 text-primary", COOLING: "bg-warning/10 text-warning", AT_RISK: "bg-destructive/10 text-destructive",
};

const eventLabels: Record<string, string> = {
  INBOUND_MESSAGE: "Mensagem recebida", OUTBOUND_MESSAGE: "Mensagem enviada",
  INTENT_PRICE: "Perguntou sobre preço", INTENT_BUY_NOW: "Intenção de compra",
  INTENT_AVAILABILITY: "Perguntou disponibilidade", INTENT_PAYMENT: "Falou sobre pagamento",
  INTENT_PROPOSAL: "Pediu proposta", INTENT_URGENT: "Demonstrou urgência",
  INTENT_OBJECTION: "Fez objeção", INTENT_NEGATIVE: "Sinalizou desinteresse",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Respondeu em menos de 1h",
  INBOUND_STREAK_3: "Sequência de 3 mensagens", INBOUND_AFTER_24H_SILENCE: "Voltou após 24h",
  INBOUND_AFTER_7D_SILENCE: "Voltou após 7 dias", LINK_CLICK: "Clicou em link",
  FORM_SUBMIT: "Enviou formulário", CALL_REQUEST: "Pediu ligação",
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
  INBOUND_MESSAGE: "💬", OUTBOUND_MESSAGE: "📤", INTENT_PRICE: "💰", INTENT_BUY_NOW: "🔥",
  INTENT_AVAILABILITY: "📅", INTENT_PAYMENT: "💳", INTENT_PROPOSAL: "📄", INTENT_URGENT: "⚡",
  INTENT_OBJECTION: "⚠️", INTENT_NEGATIVE: "🚫", OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "⏱️",
  LINK_CLICK: "🔗", CALL_REQUEST: "📞", SLA_FIRST_RESPONSE_UNDER_5MIN: "✅",
  SLA_FIRST_RESPONSE_OVER_30MIN: "❌",
};

const categoryLabels: Record<string, string> = {
  engagement: "Engajamento", intent: "Intenção", sla: "SLA", penalty: "Penalidade",
};
const categoryColors: Record<string, string> = {
  engagement: "text-primary", intent: "text-orange-400", sla: "text-blue-400", penalty: "text-destructive",
};

const getRecommendations = (lead: { status_bucket: string; risk_state: string; score_total: number }, events: { event_type: string }[]) => {
  const recs: { text: string; priority: "high" | "medium" | "low"; icon: string }[] = [];
  const recentIntents = events.slice(0, 20).map((e) => e.event_type);

  if ((lead.status_bucket === "HOT" || lead.status_bucket === "VERY_HOT") && lead.risk_state === "AT_RISK") {
    recs.push({ text: "Responder imediatamente — lead quente em risco!", priority: "high", icon: "🚨" });
  }
  if (recentIntents.includes("INTENT_PRICE")) {
    recs.push({ text: "Enviar proposta ou tabela de preços", priority: "high", icon: "💰" });
  }
  if (recentIntents.includes("INTENT_OBJECTION")) {
    recs.push({ text: "Enviar prova social ou case de sucesso", priority: "medium", icon: "📊" });
  }
  if (recentIntents.includes("INTENT_BUY_NOW")) {
    recs.push({ text: "Fechar venda — enviar contrato ou link de pagamento", priority: "high", icon: "🎯" });
  }
  if (lead.risk_state === "COOLING") {
    recs.push({ text: "Reengajar com follow-up personalizado", priority: "medium", icon: "📨" });
  }
  if (lead.status_bucket === "VERY_HOT" && lead.risk_state === "OK") {
    recs.push({ text: "Lead pronto para fechar — agendar reunião ou enviar proposta", priority: "high", icon: "🔥" });
  }
  if (recs.length === 0) {
    recs.push({ text: "Manter acompanhamento das interações", priority: "low", icon: "👀" });
  }
  return recs;
};

const RevenueLeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading: loadingLead } = useRevenueLead(id || "");
  const { data: events, isLoading: loadingEvents } = useRevenueEvents(id || "");
  const { data: scoreLogs } = useRevenueScoreLogs(id || "");
  const [chartDays, setChartDays] = useState<number>(30);
  const { data: snapshots } = useRevenueScoreSnapshots(id || "", chartDays);

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

  const recommendations = getRecommendations(lead, events || []);

  const chartData = (snapshots || []).map((s) => ({
    date: format(new Date(s.snapshot_date), "dd/MM"),
    score: s.score_value,
  }));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Link to="/revenue/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Voltar para leads
      </Link>

      {/* Lead card */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{lead.name || lead.phone_e164}</h1>
              <p className="text-sm text-muted-foreground">{lead.phone_e164}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", bucketColors[lead.status_bucket])}>{bucketLabels[lead.status_bucket]}</Badge>
              <Badge variant="outline" className={cn("text-xs", riskBadge[lead.risk_state])}>{riskLabels[lead.risk_state]}</Badge>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Pontuação</p>
              <p className="text-2xl font-bold text-primary">{lead.score_total}</p>
              <p className="text-[10px] text-muted-foreground">de 1000</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Primeiro contato</p>
              <p className="text-sm font-medium text-foreground">{format(new Date(lead.first_seen_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Última atividade</p>
              <p className="text-sm font-medium text-foreground">{formatDistanceToNow(new Date(lead.last_activity_at), { addSuffix: true, locale: ptBR })}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Tags</p>
              <p className="text-sm font-medium text-foreground">{lead.tags?.length || 0}</p>
            </div>
          </div>

          {lead.risk_reason && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{lead.risk_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Multidimensional Breakdown */}
      <ScoreBreakdownCard
        scoreIntent={(lead as any).score_intent || 0}
        scoreEngagement={(lead as any).score_engagement || 0}
        scoreUrgency={(lead as any).score_urgency || 0}
        scoreRisk={(lead as any).score_risk || 0}
        scoreTotal={lead.score_total}
      />

      {/* Recommended Actions */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb size={16} className="text-primary" /> Ações Recomendadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((rec, i) => (
            <div key={i} className={cn(
              "p-3 rounded-lg flex items-start gap-2 border",
              rec.priority === "high" ? "bg-destructive/5 border-destructive/20" :
              rec.priority === "medium" ? "bg-yellow-500/5 border-yellow-500/20" :
              "bg-secondary/30 border-border/50"
            )}>
              <span className="text-lg shrink-0">{rec.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{rec.text}</p>
                <p className="text-[10px] text-muted-foreground capitalize">Prioridade: {rec.priority === "high" ? "Alta" : rec.priority === "medium" ? "Média" : "Baixa"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Score Evolution Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp size={16} /> Evolução do Score
              </CardTitle>
              <div className="flex gap-1">
                <button onClick={() => setChartDays(7)} className={cn("px-2 py-1 text-xs rounded", chartDays === 7 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>7d</button>
                <button onClick={() => setChartDays(30)} className={cn("px-2 py-1 text-xs rounded", chartDays === 30 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>30d</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 1000]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Breakdown */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} /> Composição do Score
          </CardTitle>
          <CardDescription>Últimas 15 alterações no score — mostra como cada evento impactou a pontuação</CardDescription>
        </CardHeader>
        <CardContent>
          {!scoreLogs || scoreLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum log de score registrado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {scoreLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20">
                  <span className={cn("text-xs font-bold w-16 text-right shrink-0", log.points_applied > 0 ? "text-primary" : "text-destructive")}>
                    {log.points_applied > 0 ? "+" : ""}{log.points_applied} pts
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {eventLabels[log.event_type] || log.event_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <span className={categoryColors[log.category] || "text-muted-foreground"}>
                        {categoryLabels[log.category] || log.category}
                      </span>
                      {" • "}Score: {log.score_before} → {log.score_after}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events timeline */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock size={16} /> Histórico de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20">
                  <span className="text-lg shrink-0">{eventIcons[event.event_type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{eventLabels[event.event_type] || event.event_type.replace(/_/g, " ")}</p>
                    {event.event_value !== 0 && (
                      <span className={cn("text-xs font-bold", event.event_value > 0 ? "text-primary" : "text-destructive")}>
                        {event.event_value > 0 ? "+" : ""}{event.event_value} pts
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
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
