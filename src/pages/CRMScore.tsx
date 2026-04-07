import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  BarChart3, Users, Trophy, Settings, Loader2, 
  Smartphone, Search, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Target, AlertTriangle, Zap,
  ChevronsLeft, ChevronsRight, Info, HelpCircle, Filter, X, Calendar,
  User, Clock, CalendarDays, RefreshCw, Rocket, MessageSquare, Diamond, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { cn } from "@/lib/utils";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

// ═══════════════ TYPES ═══════════════

interface RevenueLead {
  id: string;
  name: string | null;
  phone_e164: string;
  score_total: number;
  score_engagement: number;
  score_intent: number;
  score_risk: number;
  score_urgency: number;
  status_bucket: string;
  risk_state: string;
  last_activity_at: string;
  score_last_calc_at: string | null;
  first_seen_at: string;
  tags: string[] | null;
  source_number_instance_id: string | null;
}

interface ScoreRule {
  id: string;
  rule_key: string;
  points: number;
  is_enabled: boolean;
  cooldown_minutes: number | null;
  max_per_day: number | null;
  user_id: string;
}

// ═══════════════ CONSTANTS ═══════════════

const BUCKET_COLORS: Record<string, string> = {
  "READY_TO_SELL": "hsl(158, 72%, 38%)",
  "HIGH_VALUE": "hsl(262, 83%, 58%)",
  "ENGAGED": "hsl(200, 98%, 39%)",
  "LOW_ENGAGEMENT": "hsl(38, 92%, 50%)",
  "COLD": "hsl(0, 72%, 51%)",
};

const BUCKET_LABELS: Record<string, string> = {
  "COLD": "Frio (0-200)",
  "LOW_ENGAGEMENT": "Baixo engajamento (201-400)",
  "ENGAGED": "Engajado (401-600)",
  "HIGH_VALUE": "Alto valor (601-800)",
  "READY_TO_SELL": "Pronto para venda (801-1000)",
};

const BUCKET_SHORT_LABELS: Record<string, string> = {
  "COLD": "Frio",
  "LOW_ENGAGEMENT": "Baixo engaj.",
  "ENGAGED": "Engajado",
  "HIGH_VALUE": "Alto valor",
  "READY_TO_SELL": "Pronto p/ venda",
};

const BUCKET_BADGE_COLORS: Record<string, string> = {
  "READY_TO_SELL": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "HIGH_VALUE": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "ENGAGED": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "LOW_ENGAGEMENT": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "COLD": "bg-red-500/20 text-red-400 border-red-500/30",
};

const mapBucket = (bucket: string, score: number): string => {
  if (score >= 801) return "READY_TO_SELL";
  if (score >= 601) return "HIGH_VALUE";
  if (score >= 401) return "ENGAGED";
  if (score >= 201) return "LOW_ENGAGEMENT";
  return "COLD";
};

const RULE_LABELS: Record<string, string> = {
  INBOUND_MESSAGE: "Mensagem recebida",
  INBOUND_STREAK_3: "Sequência de 3 msgs",
  INBOUND_AFTER_24H_SILENCE: "Voltou após 24h",
  INBOUND_AFTER_7D_SILENCE: "Voltou após 7 dias",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Resposta em < 1h",
  INTENT_PRICE: "Perguntou preço",
  INTENT_BUY_NOW: "Intenção de compra",
  INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento",
  INTENT_PROPOSAL: "Proposta",
  INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção",
  INTENT_NEGATIVE_MODERATE: "Penalidade Moderada",
  INTENT_NEGATIVE_HARD: "Penalidade Forte",
  LINK_CLICK: "Clique em link",
  FORM_SUBMIT: "Formulário enviado",
  CALL_REQUEST: "Pediu ligação",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "Resposta < 5min",
  SLA_FIRST_RESPONSE_5_TO_30MIN: "Resposta 5-30min",
  SLA_FIRST_RESPONSE_OVER_30MIN: "Resposta > 30min",
  UNREPLIED_INBOUND_OVER_2H: "Sem resposta 2h+",
  UNREPLIED_INBOUND_OVER_24H: "Sem resposta 24h+",
  CONVERSATION_ACTIVE_3D: "Conversa ativa 3 dias",
  CONVERSATION_ACTIVE_5D: "Conversa ativa 5 dias",
  BACK_AND_FORTH_5_TURNS: "5+ turnos de conversa",
};

// Rule descriptions with triggers. copied from Revenue for consistency
const RULE_DESCRIPTIONS: Record<string, { description: string; triggers?: string[]; type: "bonus" | "penalty" | "neutral" }> = {
  INBOUND_MESSAGE: {
    description: "Toda mensagem recebida do lead soma pontos de engajamento.",
    triggers: ["Qualquer mensagem enviada pelo lead"],
    type: "bonus",
  },
  INBOUND_STREAK_3: {
    description: "Quando o lead envia 3 mensagens seguidas sem você responder, indica alto interesse.",
    triggers: ["3 mensagens consecutivas do lead"],
    type: "bonus",
  },
  INBOUND_AFTER_24H_SILENCE: {
    description: "Lead que volta a falar após 24h de silêncio demonstra interesse persistente.",
    triggers: ["Mensagem após 24h sem interação"],
    type: "bonus",
  },
  INBOUND_AFTER_7D_SILENCE: {
    description: "Lead que retorna após 7 dias é um sinal forte de intenção real.",
    triggers: ["Mensagem após 7 dias sem interação"],
    type: "bonus",
  },
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: {
    description: "Lead responde rápido à sua mensagem, indicando engajamento ativo.",
    triggers: ["Resposta do lead em menos de 1 hora"],
    type: "bonus",
  },
  INTENT_PRICE: {
    description: "Lead demonstrou interesse em valores ou orçamento. Classificado como Intenção Positiva (PRICE_REQUEST).",
    triggers: ["preço", "valor", "quanto custa", "qual o valor", "orçamento", "tabela", "investimento", "custo", "quanto fica"],
    type: "bonus",
  },
  INTENT_BUY_NOW: {
    description: "Lead sinalizou forte intenção de fechar negócio. Classificado como Intenção Positiva (BUY_INTENT).",
    triggers: ["quero fechar", "quero contratar", "vamos fechar", "pode mandar contrato", "como assino", "onde pago", "pode emitir", "pode gerar boleto", "faz o pix", "como pagar", "parcelamento", "forma de pagamento"],
    type: "bonus",
  },
  INTENT_AVAILABILITY: {
    description: "Lead perguntou sobre disponibilidade ou agenda. Classificado como Intenção Positiva (AVAILABILITY).",
    triggers: ["tem vaga", "quando começa", "disponível", "agenda", "prazo", "entrega quando", "tempo de entrega"],
    type: "bonus",
  },
  INTENT_PAYMENT: {
    description: "Lead mencionou forma de pagamento. sinal de decisão avançada. Classificado como Intenção Positiva (PAYMENT).",
    triggers: ["pix", "cartão", "boleto", "parcelar", "pagamento", "parcela"],
    type: "bonus",
  },
  INTENT_PROPOSAL: {
    description: "Lead solicitou proposta ou material comercial. Classificado como Intenção Positiva (PROPOSAL).",
    triggers: ["proposta", "cotação", "envia pdf", "manda a proposta", "detalhamento", "escopo", "condições"],
    type: "bonus",
  },
  INTENT_URGENT: {
    description: "Lead demonstrou urgência na compra. Classificado como Intenção Positiva (URGENT).",
    triggers: ["urgente", "pra hoje", "imediato", "preciso já", "pra ontem"],
    type: "bonus",
  },
  INTENT_OBJECTION: {
    description: "Objeção contextual detectada. Inclui objeção de preço, financeira ou adiamento. Score líquido leve negativo.",
    triggers: ["preço+caro", "preço+alto", "não tenho dinheiro", "não cabe no orçamento", "preciso pensar", "depois eu vejo", "vou analisar", "vou falar com sócio"],
    type: "penalty",
  },
  INTENT_NEGATIVE_MODERATE: {
    description: "Penalidade moderada. lead demonstrou desinteresse leve. Mantém lead ativo mas reduz score.",
    triggers: ["não sei", "não tenho certeza", "talvez depois", "não agora", "não é prioridade", "não faz sentido agora"],
    type: "penalty",
  },
  INTENT_NEGATIVE_HARD: {
    description: "Penalidade forte. desinteresse explícito ou opt-out. Adiciona tag do_not_contact e marca AT_RISK.",
    triggers: ["não quero", "não tenho interesse", "pode cancelar", "pare", "para de mandar", "remove meu número", "me tira da lista", "bloqueia"],
    type: "penalty",
  },
  LINK_CLICK: {
    description: "Lead clicou em um link enviado, demonstrando interesse no conteúdo.",
    triggers: ["Clique em link rastreado"],
    type: "bonus",
  },
  FORM_SUBMIT: {
    description: "Lead preencheu e enviou um formulário.",
    triggers: ["Envio de formulário detectado"],
    type: "bonus",
  },
  CALL_REQUEST: {
    description: "Lead solicitou uma ligação ou chamada.",
    triggers: ["Pedido de ligação ou chamada"],
    type: "bonus",
  },
  SLA_FIRST_RESPONSE_UNDER_5MIN: {
    description: "Você respondeu em menos de 5 minutos. excelente atendimento!",
    triggers: ["Primeira resposta em < 5 minutos"],
    type: "bonus",
  },
  SLA_FIRST_RESPONSE_5_TO_30MIN: {
    description: "Você respondeu entre 5 e 30 minutos. dentro do aceitável.",
    triggers: ["Primeira resposta entre 5–30 minutos"],
    type: "neutral",
  },
  SLA_FIRST_RESPONSE_OVER_30MIN: {
    description: "Resposta demorou mais de 30 minutos. penalidade aplicada.",
    triggers: ["Primeira resposta acima de 30 minutos"],
    type: "penalty",
  },
  UNREPLIED_INBOUND_OVER_2H: {
    description: "Lead enviou mensagem e não foi respondido há mais de 2 horas.",
    triggers: ["Mensagem do lead sem resposta por 2h+"],
    type: "penalty",
  },
  UNREPLIED_INBOUND_OVER_24H: {
    description: "Lead sem resposta há mais de 24 horas. risco alto de perda.",
    triggers: ["Mensagem do lead sem resposta por 24h+"],
    type: "penalty",
  },
  CONVERSATION_ACTIVE_3D: {
    description: "Conversa ativa por 3 dias consecutivos. bom sinal de engajamento.",
    triggers: ["Troca de mensagens por 3 dias seguidos"],
    type: "bonus",
  },
  CONVERSATION_ACTIVE_5D: {
    description: "Conversa ativa por 5 dias. lead altamente engajado.",
    triggers: ["Troca de mensagens por 5 dias seguidos"],
    type: "bonus",
  },
  BACK_AND_FORTH_5_TURNS: {
    description: "5 trocas de mensagem no diálogo. conversa avançada.",
    triggers: ["5 mensagens alternadas (ida e volta)"],
    type: "bonus",
  },
};

const RULE_CATEGORIES: Record<string, { label: string; color: string; keys: string[] }> = {
  engagement: {
    label: "Engajamento",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    keys: ["INBOUND_MESSAGE", "INBOUND_STREAK_3", "INBOUND_AFTER_24H_SILENCE", "INBOUND_AFTER_7D_SILENCE", "OUTBOUND_REPLY_RECEIVED_WITHIN_1H", "CONVERSATION_ACTIVE_3D", "CONVERSATION_ACTIVE_5D", "BACK_AND_FORTH_5_TURNS"],
  },
  intent: {
    label: "Intenção de Compra",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    keys: ["INTENT_PRICE", "INTENT_BUY_NOW", "INTENT_AVAILABILITY", "INTENT_PAYMENT", "INTENT_PROPOSAL", "INTENT_URGENT"],
  },
  actions: {
    label: "Ações",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    keys: ["LINK_CLICK", "FORM_SUBMIT", "CALL_REQUEST"],
  },
  sla: {
    label: "SLA / Tempo de Resposta",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    keys: ["SLA_FIRST_RESPONSE_UNDER_5MIN", "SLA_FIRST_RESPONSE_5_TO_30MIN", "SLA_FIRST_RESPONSE_OVER_30MIN"],
  },
  penalty: {
    label: "Penalidades / Risco",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    keys: ["INTENT_OBJECTION", "INTENT_NEGATIVE_MODERATE", "INTENT_NEGATIVE_HARD", "UNREPLIED_INBOUND_OVER_2H", "UNREPLIED_INBOUND_OVER_24H"],
  },
};

const PER_PAGE_OPTIONS = [20, 50, 100];
const DEFAULT_PER_PAGE = 20;

const getScoreColor = (score: number) => {
  if (score >= 801) return "text-emerald-400";
  if (score >= 601) return "text-purple-400";
  if (score >= 401) return "text-blue-400";
  if (score >= 201) return "text-yellow-400";
  return "text-red-400";
};

const getScoreCircleColor = (score: number) => {
  if (score >= 801) return "bg-emerald-500/[0.12]";
  if (score >= 601) return "bg-purple-500/[0.12]";
  if (score >= 401) return "bg-blue-500/[0.12]";
  if (score >= 201) return "bg-yellow-500/[0.12]";
  return "bg-red-500/[0.12]";
};

const fmtNum = (n: number) => Number.isInteger(n) ? n.toLocaleString('pt-BR') : n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return phone;
};

// ═══════════════ SCORE INFO POPOVER ═══════════════

const ScoreInfoModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-sm bg-card" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Como funciona o Score</CardTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            O score vai de 0 a 1.000 pontos e é calculado automaticamente com base nas interações dos contatos no WhatsApp.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {[
            { label: "Frio", range: "0 – 200", desc: "Sem interação relevante", color: "border-red-500/40 bg-red-500/10", text: "text-red-400" },
            { label: "Baixo engajamento", range: "201 – 400", desc: "Pouca atividade", color: "border-yellow-500/40 bg-yellow-500/10", text: "text-yellow-400" },
            { label: "Engajado", range: "401 – 600", desc: "Interagindo ativamente", color: "border-blue-500/40 bg-blue-500/10", text: "text-blue-400" },
            { label: "Alto valor", range: "601 – 800", desc: "Forte interesse", color: "border-purple-500/40 bg-purple-500/10", text: "text-purple-400" },
            { label: "Pronto p/ venda", range: "801 – 1.000", desc: "Contato quente", color: "border-emerald-500/40 bg-emerald-500/10", text: "text-emerald-400" },
          ].map((b) => (
            <div key={b.label} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${b.color}`}>
              <span className={`text-xs font-semibold ${b.text}`}>{b.label}</span>
              <div className="text-right">
                <span className="text-[11px] font-medium text-foreground">{b.range}</span>
                <p className="text-[10px] text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-[11px] text-muted-foreground">
              O score é atualizado automaticamente. Cada regra soma ou subtrai pontos. Contatos inativos perdem score diariamente.
            </p>
          </div>
          <Button variant="outline" className="w-full mt-2" size="sm" onClick={onClose}>Fechar</Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════ EMPTY STATE ═══════════════

const EmptyListState = ({ message, icon: Icon }: { message: string; icon?: React.ElementType }) => {
  const IconComponent = Icon || Search;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
        <IconComponent className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground/70 mb-1">Sem dados no momento</p>
      <p className="text-xs text-muted-foreground/50 max-w-[240px]">{message}</p>
    </div>
  );
};

// ═══════════════ DASHBOARD TAB ═══════════════

const ScoreDashboard = ({ leads }: { leads: RevenueLead[] }) => {
  const totalLeads = leads.length;
  const avgScore = totalLeads > 0 ? leads.reduce((s, l) => s + l.score_total, 0) / totalLeads : 0;
  const sortedScores = [...leads].sort((a, b) => a.score_total - b.score_total);
  const medianScore = totalLeads > 0 ? sortedScores[Math.floor(totalLeads / 2)]?.score_total || 0 : 0;

  const byBucket = leads.reduce((acc, l) => {
    const b = mapBucket(l.status_bucket, l.score_total);
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const atRisk = leads.filter(l => l.risk_state === "AT_RISK" || l.risk_state === "CRITICAL").length;
  const readyToSell = byBucket["READY_TO_SELL"] || 0;
  const cold = byBucket["COLD"] || 0;

  // Leads em risco do dia: only READY_TO_SELL, HIGH_VALUE, ENGAGED with negative score_risk today
  const atRiskToday = useMemo(() => {
    const qualifiedBuckets = ["READY_TO_SELL", "HIGH_VALUE", "ENGAGED"];
    return leads
      .filter(l => {
        const bucket = mapBucket(l.status_bucket, l.score_total);
        return qualifiedBuckets.includes(bucket) && l.score_risk < 0;
      })
      .sort((a, b) => a.score_risk - b.score_risk)
      .slice(0, 10);
  }, [leads]);

  // Top oportunidades de venda: leads above ENGAGED (HIGH_VALUE + READY_TO_SELL) with highest score gains
  const topOpportunities = useMemo(() => {
    const qualifiedBuckets = ["READY_TO_SELL", "HIGH_VALUE", "ENGAGED"];
    return leads
      .filter(l => {
        const bucket = mapBucket(l.status_bucket, l.score_total);
        return qualifiedBuckets.includes(bucket) && l.score_total > 0;
      })
      .sort((a, b) => {
        // Sort by intent + engagement (proxies for daily gain)
        const aGain = a.score_intent + a.score_engagement;
        const bGain = b.score_intent + b.score_engagement;
        return bGain - aGain;
      })
      .slice(0, 10);
  }, [leads]);

  const kpis = [
    [
      { label: "Total Contatos", value: fmtNum(totalLeads), icon: Users, color: "text-primary", circleColor: "bg-primary/[0.12]" },
      { label: "Pronto p/ Venda", value: fmtNum(readyToSell), icon: TrendingUp, color: "text-primary", circleColor: "bg-primary/[0.12]" },
    ],
    [
      { label: "Score Médio", value: fmtNum(Math.round(avgScore)), icon: BarChart3, color: "text-emerald-400", circleColor: "bg-emerald-500/[0.12]" },
      { label: "Em Risco", value: fmtNum(atRisk), icon: AlertTriangle, color: "text-destructive", circleColor: "bg-destructive/[0.12]" },
      { label: "Frios", value: fmtNum(cold), icon: TrendingDown, color: "text-red-400", circleColor: "bg-red-500/[0.12]" },
    ],
  ];

  const pieData = Object.entries(byBucket).map(([bucket, count]) => ({
    name: BUCKET_SHORT_LABELS[bucket] || bucket,
    value: count,
    color: BUCKET_COLORS[bucket] || "hsl(var(--muted))",
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden bg-card border-border/60">
            <div className={`absolute -top-5 -right-5 w-[72px] h-[72px] rounded-full ${kpi.circleColor}`} />
            <kpi.icon className={`absolute top-3 right-3 h-4 w-4 ${kpi.color}`} />
            <CardContent className="p-5 relative">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">{kpi.label}</p>
              <p className="text-[30px] font-bold leading-none tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, value, cx: cxP, cy: cyP, midAngle, outerRadius: or }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = (or || 90) + 30;
                      const x = (cxP || 0) + radius * Math.cos(-midAngle * RADIAN);
                      const y = (cyP || 0) + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > (cxP || 0) ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                          {`${name}: ${fmtNum(value)}`}
                        </text>
                      );
                    }}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyListState message="Os dados aparecerão quando seus leads começarem a interagir" icon={BarChart3} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Top 10 Leads por Score</CardTitle></CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[...leads].sort((a, b) => b.score_total - a.score_total).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" domain={[0, 1000]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v ? (v.length > 12 ? v.slice(0, 12) + "…" : v) : v} />
                  <RechartsTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="score_total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyListState message="Conecte seu WhatsApp e comece a interagir com leads" icon={Users} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* At Risk + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads em risco do dia */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Leads em Risco do Dia
            </CardTitle>
            <p className="text-xs text-muted-foreground">Leads com score acima de 400 que perderam pontos hoje</p>
          </CardHeader>
          <CardContent>
            {atRiskToday.length > 0 ? (
              <div className="space-y-2">
                {atRiskToday.map((lead, i) => {
                  const bucket = mapBucket(lead.status_bucket, lead.score_total);
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.name || fmtPhone(lead.phone_e164)}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", BUCKET_BADGE_COLORS[bucket])}>
                              {BUCKET_SHORT_LABELS[bucket]}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{fmtNum(lead.score_total)} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-destructive tabular-nums">{lead.score_risk}</p>
                        <p className="text-[10px] text-muted-foreground">risco</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyListState message="Nenhum lead qualificado perdeu pontos hoje. ótimo sinal!" icon={AlertTriangle} />
            )}
          </CardContent>
        </Card>

        {/* Top oportunidades de venda */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Top 10 Oportunidades de Venda
            </CardTitle>
            <p className="text-xs text-muted-foreground">Leads com score acima de 400 e maior potencial de conversão</p>
          </CardHeader>
          <CardContent>
            {topOpportunities.length > 0 ? (
              <div className="space-y-2">
                {topOpportunities.map((lead, i) => {
                  const bucket = mapBucket(lead.status_bucket, lead.score_total);
                  const gain = lead.score_intent + lead.score_engagement;
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.name || fmtPhone(lead.phone_e164)}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", BUCKET_BADGE_COLORS[bucket])}>
                              {BUCKET_SHORT_LABELS[bucket]}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{fmtNum(lead.score_total)} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-bold tabular-nums", gain > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                          {gain > 0 ? `+${fmtNum(gain)}` : fmtNum(gain)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">potencial</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyListState message="Quando seus leads atingirem o nível Engajado ou acima, as oportunidades aparecerão aqui" icon={Zap} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════ ADVANCED FILTERS ═══════════════

interface FilterState {
  dateFrom: string;
  dateTo: string;
  scoreMin: string;
  scoreMax: string;
  bucket: string;
  riskState: string;
}

const defaultFilters: FilterState = {
  dateFrom: "",
  dateTo: "",
  scoreMin: "",
  scoreMax: "",
  bucket: "all",
  riskState: "all",
};

const AdvancedFiltersPopover = ({ 
  filters, 
  onApply, 
  activeCount 
}: { 
  filters: FilterState; 
  onApply: (f: FilterState) => void;
  activeCount: number;
}) => {
  const [local, setLocal] = useState<FilterState>(filters);
  const [open, setOpen] = useState(false);

  useEffect(() => { setLocal(filters); }, [filters]);

  const handleApply = () => {
    onApply(local);
    setOpen(false);
  };

  const handleClear = () => {
    onApply(defaultFilters);
    setLocal(defaultFilters);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] absolute -top-2 -right-2">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="end">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Filtros Avançados</h4>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleClear}>
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Período - De</Label>
            <Input type="date" value={local.dateFrom} onChange={(e) => setLocal(l => ({ ...l, dateFrom: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Período - Até</Label>
            <Input type="date" value={local.dateTo} onChange={(e) => setLocal(l => ({ ...l, dateTo: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Score mínimo</Label>
              <Input type="number" min="0" max="1000" placeholder="0" value={local.scoreMin} onChange={(e) => setLocal(l => ({ ...l, scoreMin: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Score máximo</Label>
              <Input type="number" min="0" max="1000" placeholder="1000" value={local.scoreMax} onChange={(e) => setLocal(l => ({ ...l, scoreMax: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
            <Select value={local.bucket} onValueChange={(v) => setLocal(l => ({ ...l, bucket: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(BUCKET_SHORT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Risco</Label>
            <Select value={local.riskState} onValueChange={(v) => setLocal(l => ({ ...l, riskState: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SAFE">Seguro</SelectItem>
                <SelectItem value="AT_RISK">Em Risco</SelectItem>
                <SelectItem value="CRITICAL">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleApply} className="w-full" size="sm">Aplicar Filtros</Button>
      </PopoverContent>
    </Popover>
  );
};

// ═══════════════ USERS TAB ═══════════════

const ScoreUsersTab = ({ leads }: { leads: RevenueLead[] }) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sortBy, setSortBy] = useState("score_total");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [selectedLead, setSelectedLead] = useState<RevenueLead | null>(null);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.dateFrom) c++;
    if (filters.dateTo) c++;
    if (filters.scoreMin) c++;
    if (filters.scoreMax) c++;
    if (filters.bucket !== "all") c++;
    if (filters.riskState !== "all") c++;
    return c;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        if (!(l.name?.toLowerCase().includes(s) || l.phone_e164.includes(search))) return false;
      }
      if (filters.bucket !== "all") {
        const mapped = mapBucket(l.status_bucket, l.score_total);
        if (mapped !== filters.bucket) return false;
      }
      if (filters.riskState !== "all" && l.risk_state !== filters.riskState) return false;
      if (filters.scoreMin) {
        const min = parseInt(filters.scoreMin);
        if (!isNaN(min) && l.score_total < min) return false;
      }
      if (filters.scoreMax) {
        const max = parseInt(filters.scoreMax);
        if (!isNaN(max) && l.score_total > max) return false;
      }
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        if (new Date(l.last_activity_at) < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(l.last_activity_at) > to) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? 0;
      const bVal = (b as any)[sortBy] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [leads, search, filters, sortBy, sortAsc]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 3) pages.push("...");
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages - 2, page + 2); i++) pages.push(i);
      if (page < totalPages - 4) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." className="pl-9 rounded-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <AdvancedFiltersPopover filters={filters} onApply={(f) => { setFilters(f); setPage(0); }} activeCount={activeFilterCount} />
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>{fmtNum(filtered.length)} leads encontrados com {activeFilterCount} filtro(s) ativo(s)</span>
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortBy("score_total"); setSortAsc(sortBy === "score_total" ? !sortAsc : false); }}>
                  Score {sortBy === "score_total" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="hidden md:table-cell">Tendência</TableHead>
                <TableHead className="hidden md:table-cell">Engajamento</TableHead>
                <TableHead className="hidden md:table-cell">Intenção</TableHead>
                <TableHead className="hidden lg:table-cell">Risco</TableHead>
                <TableHead className="hidden lg:table-cell">Última Atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((lead) => {
                const bucket = mapBucket(lead.status_bucket, lead.score_total);
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedLead(lead)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.name || fmtPhone(lead.phone_e164)}</p>
                        <p className="text-xs text-muted-foreground">{fmtPhone(lead.phone_e164)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-lg font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>{fmtNum(lead.score_total)}</span>
                      <span className="text-xs text-muted-foreground ml-1">/1.000</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={BUCKET_BADGE_COLORS[bucket] || ""}>
                        {BUCKET_SHORT_LABELS[bucket] || bucket}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {lead.score_risk < -50 ? (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      ) : lead.score_engagement > 20 || lead.score_intent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm font-semibold tabular-nums">{fmtNum(lead.score_engagement)}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm font-semibold tabular-nums">{fmtNum(lead.score_intent)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm font-semibold tabular-nums text-destructive">{fmtNum(lead.score_risk)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(lead.last_activity_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contato encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Por página:</span>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{fmtNum(filtered.length)} contatos</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPages().map((p, i) =>
              typeof p === "string" ? (
                <span key={`e${i}`} className="px-1 text-muted-foreground">...</span>
              ) : (
                <Button key={p} variant={page === p ? "default" : "outline"} size="sm" className="h-8 min-w-[2rem]" onClick={() => setPage(p)}>
                  {p + 1}
                </Button>
              )
            )}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <LeadDetailPopup lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
};

// ═══════════════ LEAD DETAIL POPUP ═══════════════

interface ScoreLog {
  id: string;
  event_type: string;
  points_applied: number;
  score_before: number;
  score_after: number;
  category: string;
  created_at: string;
}

const SCORE_BAR_CONFIG = [
  { key: "score_engagement", label: "Engajamento", icon: MessageSquare, color: "bg-blue-500", max: 500 },
  { key: "score_intent", label: "Intenção Compra", icon: ShoppingCart, color: "bg-yellow-500", max: 500 },
  { key: "score_urgency", label: "Urgência", icon: Zap, color: "bg-purple-500", max: 300 },
  { key: "score_risk", label: "Risco", icon: AlertTriangle, color: "bg-destructive", max: 300, isNegative: true },
];

const HISTORY_PER_PAGE = 15;

const LeadDetailPopup = ({ lead, onClose }: { lead: RevenueLead; onClose: () => void }) => {
  const [tab, setTab] = useState<"score" | "history" | "evolution">("score");
  const [logs, setLogs] = useState<ScoreLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(0);
  const [evoData, setEvoData] = useState<{ date: string; score: number }[]>([]);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoPeriod, setEvoPeriod] = useState("30d");
  const [evoDateFrom, setEvoDateFrom] = useState("");
  const [evoDateTo, setEvoDateTo] = useState("");

  const bucket = mapBucket(lead.status_bucket, lead.score_total);

  // Load history
  useEffect(() => {
    if (tab === "history" && logs.length === 0) {
      setLogsLoading(true);
      supabase
        .from("revenue_score_logs")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(500)
        .then(({ data }) => {
          setLogs((data || []) as ScoreLog[]);
          setLogsLoading(false);
        });
    }
  }, [tab, lead.id]);

  // Load evolution
  useEffect(() => {
    if (tab === "evolution") {
      setEvoLoading(true);
      let fromDate: Date;
      let toDate = new Date();

      if (evoDateFrom && evoDateTo) {
        fromDate = new Date(evoDateFrom);
        toDate = new Date(evoDateTo);
        toDate.setHours(23, 59, 59, 999);
      } else {
        const days = evoPeriod === "7d" ? 7 : evoPeriod === "14d" ? 14 : evoPeriod === "90d" ? 90 : 30;
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
      }

      supabase
        .from("revenue_score_logs")
        .select("score_after, created_at")
        .eq("lead_id", lead.id)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(1000)
        .then(({ data }) => {
          const points = (data || []).map((d: any) => ({
            date: new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            score: d.score_after,
          }));
          setEvoData(points);
          setEvoLoading(false);
        });
    }
  }, [tab, lead.id, evoPeriod, evoDateFrom, evoDateTo]);

  const logTotalPages = Math.ceil(logs.length / HISTORY_PER_PAGE);
  const paginatedLogs = logs.slice(logPage * HISTORY_PER_PAGE, (logPage + 1) * HISTORY_PER_PAGE);

  const CATEGORY_COLORS: Record<string, string> = {
    engagement: "bg-blue-500/20 text-blue-400",
    intent: "bg-yellow-500/20 text-yellow-400",
    penalty: "bg-red-500/20 text-red-400",
    sla: "bg-purple-500/20 text-purple-400",
    actions: "bg-emerald-500/20 text-emerald-400",
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl bg-card max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Detalhe do Contato</CardTitle>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {/* Lead Header */}
          <div className="flex items-start justify-between p-4 rounded-xl bg-muted/20 border border-border/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-bold">{lead.name || fmtPhone(lead.phone_e164)}</p>
              </div>
              <p className="text-sm text-muted-foreground">{fmtPhone(lead.phone_e164)}</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Último evento: {new Date(lead.last_activity_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  Desde {new Date(lead.first_seen_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className={`text-4xl font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>{fmtNum(lead.score_total)}</p>
              <Badge variant="outline" className={BUCKET_BADGE_COLORS[bucket] || ""}>
                {BUCKET_SHORT_LABELS[bucket]}
              </Badge>
              <div className="flex items-center gap-1 mt-1">
                {lead.score_risk < -50 ? (
                  <><TrendingDown className="h-3.5 w-3.5 text-destructive" /><span className="text-[10px] text-destructive">Em queda</span></>
                ) : lead.score_engagement > 20 || lead.score_intent > 0 ? (
                  <><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[10px] text-emerald-400">Em alta</span></>
                ) : (
                  <><Minus className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Estável</span></>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-muted/30 p-1">
            {(["score", "history", "evolution"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "score" ? "Score" : t === "history" ? `Histórico (${logs.length || "..."})` : "Evolução"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "score" && (
            <div className="space-y-4">
              {SCORE_BAR_CONFIG.map((cfg) => {
                const value = Math.abs((lead as any)[cfg.key] || 0);
                const pct = Math.min((value / cfg.max) * 100, 100);
                const displayValue = (lead as any)[cfg.key] || 0;
                return (
                  <div key={cfg.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <cfg.icon className={cn("h-4 w-4", cfg.isNegative ? "text-destructive" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", cfg.isNegative ? "text-destructive" : "")}>{cfg.label}</span>
                      </div>
                      <span className={cn("text-sm font-bold tabular-nums", cfg.isNegative ? "text-destructive" : "")}>
                        {fmtNum(Number(displayValue))}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", cfg.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* Insight */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <div>
                    <p className="text-sm font-semibold mb-1">Insights</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                      {lead.score_total >= 801 && <li>Lead pronto para venda. priorize o contato imediato.</li>}
                      {lead.score_total >= 601 && lead.score_total < 801 && <li>Lead de alto valor. mantenha o engajamento para converter.</li>}
                      {lead.score_total >= 401 && lead.score_total < 601 && <li>Lead engajado. aumente a frequência de interação.</li>}
                      {lead.score_total >= 201 && lead.score_total < 401 && <li>Baixo engajamento. envie conteúdo relevante para reativar.</li>}
                      {lead.score_total < 201 && <li>Lead frio. considere uma campanha de reativação.</li>}
                      {lead.score_risk < -50 && <li>Risco elevado de perda. ação urgente recomendada.</li>}
                      {lead.score_intent > 30 && <li>Alta intenção de compra detectada.</li>}
                      {lead.score_engagement > 50 && <li>Usuário com alto engajamento nas conversas.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Histórico de Eventos</h4>
                {logTotalPages > 1 && (
                  <span className="text-xs text-muted-foreground">Página {logPage + 1} de {logTotalPages}</span>
                )}
              </div>
              {logsLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : paginatedLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Nenhum evento registrado</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {paginatedLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{RULE_LABELS[log.event_type] || log.event_type}</p>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[log.category] || "")}>
                              {log.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("text-sm font-bold tabular-nums", log.points_applied >= 0 ? "text-emerald-400" : "text-destructive")}>
                            {log.points_applied >= 0 ? `+${fmtNum(Number(log.points_applied))}` : fmtNum(Number(log.points_applied))}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })},{" "}
                            {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {logTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" disabled={logPage === 0} onClick={() => setLogPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">Página {logPage + 1}</span>
                      <Button variant="outline" size="sm" disabled={logPage >= logTotalPages - 1} onClick={() => setLogPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "evolution" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Evolução do Score</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {["7d", "14d", "30d", "90d"].map((p) => (
                  <Button
                    key={p}
                    variant={evoPeriod === p && !evoDateFrom ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setEvoPeriod(p); setEvoDateFrom(""); setEvoDateTo(""); }}
                  >
                    {p === "7d" ? "7 dias" : p === "14d" ? "14 dias" : p === "30d" ? "30 dias" : "90 dias"}
                  </Button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <Input type="date" className="h-7 text-xs w-[120px]" value={evoDateFrom} onChange={(e) => { setEvoDateFrom(e.target.value); setEvoPeriod("custom"); }} />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input type="date" className="h-7 text-xs w-[120px]" value={evoDateTo} onChange={(e) => { setEvoDateTo(e.target.value); setEvoPeriod("custom"); }} />
                </div>
              </div>
              {evoLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : evoData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Sem dados de evolução para o período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={evoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} domain={[0, 1000]} />
                    <RechartsTooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`${fmtNum(value)}`, "Score"]}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};



const RANKING_PER_PAGE = 50;

const ScoreRankingTab = ({ leads }: { leads: RevenueLead[] }) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(0);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.dateFrom) c++;
    if (filters.dateTo) c++;
    if (filters.scoreMin) c++;
    if (filters.scoreMax) c++;
    if (filters.bucket !== "all") c++;
    if (filters.riskState !== "all") c++;
    return c;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        if (!(l.name?.toLowerCase().includes(s) || l.phone_e164.includes(search))) return false;
      }
      if (filters.bucket !== "all") {
        const mapped = mapBucket(l.status_bucket, l.score_total);
        if (mapped !== filters.bucket) return false;
      }
      if (filters.riskState !== "all" && l.risk_state !== filters.riskState) return false;
      if (filters.scoreMin) { const min = parseInt(filters.scoreMin); if (!isNaN(min) && l.score_total < min) return false; }
      if (filters.scoreMax) { const max = parseInt(filters.scoreMax); if (!isNaN(max) && l.score_total > max) return false; }
      if (filters.dateFrom) { if (new Date(l.last_activity_at) < new Date(filters.dateFrom)) return false; }
      if (filters.dateTo) { const to = new Date(filters.dateTo); to.setHours(23, 59, 59, 999); if (new Date(l.last_activity_at) > to) return false; }
      return true;
    });
    result.sort((a, b) => b.score_total - a.score_total);
    return result;
  }, [leads, search, filters]);

  const totalPages = Math.ceil(filtered.length / RANKING_PER_PAGE);
  const paginated = filtered.slice(page * RANKING_PER_PAGE, (page + 1) * RANKING_PER_PAGE);

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 3) pages.push("...");
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages - 2, page + 2); i++) pages.push(i);
      if (page < totalPages - 4) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  const getMedalIcon = (index: number) => {
    const globalIndex = page * RANKING_PER_PAGE + index;
    if (globalIndex === 0) return <span className="text-xl">🥇</span>;
    if (globalIndex === 1) return <span className="text-xl">🥈</span>;
    if (globalIndex === 2) return <span className="text-xl">🥉</span>;
    return <span className="w-5 text-center text-sm text-muted-foreground font-medium">{globalIndex + 1}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar contato..." className="pl-9 rounded-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <AdvancedFiltersPopover filters={filters} onApply={(f) => { setFilters(f); setPage(0); }} activeCount={activeFilterCount} />
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>{fmtNum(filtered.length)} contatos encontrados com {activeFilterCount} filtro(s) ativo(s)</span>
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {paginated.map((lead, i) => {
              const bucket = mapBucket(lead.status_bucket, lead.score_total);
              const globalIndex = page * RANKING_PER_PAGE + i;
              return (
                <div key={lead.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => {}}>
                  <div className="w-8 flex justify-center shrink-0">{getMedalIcon(i)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name || fmtPhone(lead.phone_e164)}</p>
                    <p className="text-xs text-muted-foreground truncate">{fmtPhone(lead.phone_e164)}</p>
                  </div>
                  <Badge variant="outline" className={cn("hidden sm:inline-flex", BUCKET_BADGE_COLORS[bucket] || "")}>
                    {BUCKET_SHORT_LABELS[bucket] || bucket}
                  </Badge>
                  <div className="hidden sm:flex items-center w-8 justify-center">
                    {lead.score_risk < -50 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : lead.score_engagement > 20 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p className={`text-xl font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>
                      {fmtNum(lead.score_total)}
                    </p>
                  </div>
                </div>
              );
            })}
            {paginated.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Nenhum contato com score</div>
            )}
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPages().map((p, i) =>
            typeof p === "string" ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">...</span>
            ) : (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm" className="h-8 min-w-[2rem]" onClick={() => setPage(p)}>
                {p + 1}
              </Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

// ═══════════════ RULES TAB (with Revenue-style tooltips) ═══════════════

const ScoreRulesTab = ({ userId }: { userId: string }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState("");
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["crm-score-rules", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_score_rules")
        .select("*")
        .eq("user_id", userId)
        .order("rule_key");
      if (error) throw error;
      return (data || []) as ScoreRule[];
    },
  });

  useEffect(() => {
    if (!isLoading && rules.length === 0) {
      supabase.rpc("seed_revenue_score_rules", { p_user_id: userId }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      });
    }
  }, [isLoading, rules.length, userId]);

  const toggleRule = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("revenue_score_rules").update({ is_enabled: enabled }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar regra");
    } else {
      queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      toast.success(enabled ? "Regra ativada" : "Regra desativada");
    }
  };

  const updatePoints = async (id: string) => {
    const pts = parseInt(editPoints);
    if (isNaN(pts)) return;
    const { error } = await supabase.from("revenue_score_rules").update({ points: pts }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar pontos");
    } else {
      queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      setEditingId(null);
      toast.success("Pontos atualizados");
    }
  };

  const filteredRules = rules.filter(r =>
    (RULE_LABELS[r.rule_key] || r.rule_key).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar regra..." className="pl-9 rounded-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Link to="/warming">
          <Button variant="outline" size="sm" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Conectar WhatsApp
          </Button>
        </Link>
      </div>

      {Object.entries(RULE_CATEGORIES).map(([catKey, cat]) => {
        const catRules = filteredRules.filter(r => cat.keys.includes(r.rule_key));
        if (catRules.length === 0) return null;

        return (
          <Card key={catKey} className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Badge variant="outline" className={cat.color}>{cat.label}</Badge>
                <span className="text-muted-foreground text-xs">({catRules.length} regras)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {catRules.map((rule) => {
                  const isNegative = rule.points < 0;
                  const info = RULE_DESCRIPTIONS[rule.rule_key];
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{RULE_LABELS[rule.rule_key] || rule.rule_key}</p>
                          {isNegative && <Badge variant="destructive" className="text-[10px] px-1">NEG</Badge>}
                          {info && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="shrink-0 outline-none">
                                  <Info size={13} className={cn(
                                    "cursor-help transition-colors",
                                    info.type === "penalty" ? "text-destructive/50 hover:text-destructive" :
                                    info.type === "bonus" ? "text-primary/50 hover:text-primary" :
                                    "text-muted-foreground/50 hover:text-muted-foreground"
                                  )} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[320px] p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] px-1.5 py-0",
                                    info.type === "penalty" ? "border-destructive/40 text-destructive" :
                                    info.type === "bonus" ? "border-primary/40 text-primary" :
                                    "border-border text-muted-foreground"
                                  )}>
                                    {info.type === "penalty" ? "Penalidade" : info.type === "bonus" ? "Bônus" : "Neutro"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
                                {info.triggers && info.triggers.length > 0 && (
                                  <div className="pt-1 border-t border-border/40">
                                    <p className="text-[10px] font-medium text-foreground mb-1">
                                      {rule.rule_key.startsWith("INTENT_") ? "Palavras-chave detectadas:" : "Gatilho:"}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {info.triggers.map((t, i) => (
                                        <span key={i} className={cn(
                                          "inline-block text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                                          info.type === "penalty"
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-primary/10 text-primary"
                                        )}>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.rule_key}</p>
                        {(rule.cooldown_minutes || rule.max_per_day) && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {rule.cooldown_minutes && `Cooldown: ${rule.cooldown_minutes}min`}
                            {rule.cooldown_minutes && rule.max_per_day && " · "}
                            {rule.max_per_day && `Máx: ${rule.max_per_day}x/dia`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {editingId === rule.id ? (
                          <Input
                            className="w-16 h-8 text-center text-sm"
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && updatePoints(rule.id)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(rule.id); setEditPoints(String(rule.points)); }}
                            className={`text-lg font-bold min-w-[40px] text-center cursor-pointer hover:opacity-70 ${isNegative ? "text-destructive" : "text-primary"}`}
                          >
                            {isNegative ? `${rule.points}` : `+${rule.points}`}
                          </button>
                        )}
                        <Switch checked={rule.is_enabled} onCheckedChange={(checked) => toggleRule(rule.id, checked)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ═══════════════ MAIN PAGE ═══════════════

const CRMScore = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [deepLinkPhone] = useState(() => searchParams.get("phone"));
  const [autoOpenedLead, setAutoOpenedLead] = useState<RevenueLead | null>(null);
  useAutoScoreTracking("crm_score");

  const { data: sidebarProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-score-leads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenue_leads")
        .select("id, name, phone_e164, score_total, score_engagement, score_intent, score_risk, score_urgency, status_bucket, risk_state, last_activity_at, score_last_calc_at, first_seen_at, tags, source_number_instance_id")
        .eq("user_id", user.id)
        .order("score_total", { ascending: false });
      if (error) throw error;
      return (data || []) as RevenueLead[];
    },
    enabled: !!user,
  });

  // Auto-open lead from deep link (by phone)
  useEffect(() => {
    if (deepLinkPhone && leads.length > 0 && !autoOpenedLead) {
      const phoneKey = deepLinkPhone.replace(/\D/g, "").slice(-8);
      const found = leads.find(l => l.phone_e164.replace(/\D/g, "").slice(-8) === phoneKey);
      if (found) setAutoOpenedLead(found);
    }
  }, [deepLinkPhone, leads, autoOpenedLead]);

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO title="Score CRM - Wiize" description="Análise de score de engajamento dos seus leads via WhatsApp" />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground">Score de Contatos</h1>
                  <button onClick={() => setScoreInfoOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Análise de engajamento e intenção de compra via WhatsApp · Score de 0 a 1.000
                </p>
              </div>
            </div>
          </div>


          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-card border-border/50"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Contatos
                </TabsTrigger>
                <TabsTrigger value="ranking" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="rules" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Regras
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <ScoreDashboard leads={leads} />
              </TabsContent>
              <TabsContent value="users">
                <ScoreUsersTab leads={leads} />
              </TabsContent>
              <TabsContent value="ranking">
                <ScoreRankingTab leads={leads} />
              </TabsContent>
              <TabsContent value="rules">
                {user && <ScoreRulesTab userId={user.id} />}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      {/* Deep-link lead detail */}
      {autoOpenedLead && (
        <LeadDetailPopup lead={autoOpenedLead} onClose={() => setAutoOpenedLead(null)} />
      )}
    </div>
  );
};

export default CRMScore;
