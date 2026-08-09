import React from "react";
import {
  TrendingDown,
  TrendingUp,
  Flame,
  Zap,
  Clock,
  AlertCircle,
  ThermometerSun,
  Search,
  UserPlus,
  MessageSquare,
  MessageCircleOff,
  CalendarX,
  CalendarClock,
  DollarSign,
  Megaphone,
  PlugZap,
  Hourglass,
  Snowflake,
  Target,
} from "lucide-react";
import type { ExecutiveAlert } from "@/components/dashboard/v2/ExecutiveAlerts";

export interface AlertsInput {
  periodDays: number;
  // Period comparisons (current window vs previous window of same size)
  prospected: { current: number; previous: number };
  newLeads: { current: number; previous: number };
  messagesSent: { current: number; previous: number };
  conversations: { current: number; previous: number };
  deals: { currentCount: number; previousCount: number; currentValue: number; previousValue: number };
  meetings: { current: number; previous: number };
  // Operational
  leadsWithoutFirstContact: number;
  unansweredConversations: number;
  stuckLeads: number;
  forgottenHotLeads: number;
  upcomingMeetings7d: number;
  pendingPastMeetings: number;
  campaignsWithoutReturn: number;
  disconnectedNumbers: number;
  bestResponseWeekday: { label: string; rate: number } | null;
  conversionRate: { current: number; previous: number } | null;
  // Score based (already existing signals)
  hotGrowth24h: number;
  decayedLeads7d: number;
  readyForSale: number;
  coldLeads: number;
  peakHour: number | null;
}

const periodLabel = (days: number) => {
  if (days <= 1) return "24 horas";
  if (days === 7) return "7 dias";
  if (days === 30) return "30 dias";
  if (days === 90) return "90 dias";
  return `${days} dias`;
};

function variation(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function fmtBRL(value: number) {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtInt(value: number) {
  return Math.round(value || 0).toLocaleString("pt-BR");
}

interface TrendConfig {
  label: string;
  route: string;
  icon: React.ReactNode;
  minPrevious: number;
  positiveIsGood?: boolean;
}

function trendAlert(
  data: { current: number; previous: number },
  cfg: TrendConfig,
  periodDays: number,
): ExecutiveAlert | null {
  const v = variation(data.current, data.previous);
  if (v === null || data.previous < cfg.minPrevious) return null;
  if (Math.abs(v) < 15) return null;

  const pct = Math.abs(Math.round(v));
  const isDrop = v < 0;
  const good = cfg.positiveIsGood === false ? isDrop : !isDrop;

  return {
    type: good ? "success" : isDrop ? "warning" : "info",
    icon: React.createElement(isDrop ? TrendingDown : TrendingUp, { size: 14 }),
    text: `${cfg.label}: ${pct}% ${isDrop ? "a menos" : "a mais"} que nos ${periodLabel(periodDays)} anteriores (${fmtInt(data.current)} vs ${fmtInt(data.previous)})`,
    route: cfg.route,
    priority: good ? 40 + Math.min(20, pct / 5) : 60 + Math.min(30, pct / 3),
  };
}

export function buildExecutiveAlerts(input: AlertsInput): ExecutiveAlert[] {
  const alerts: ExecutiveAlert[] = [];
  const p = input.periodDays;

  // ---------- 1. Period comparisons ----------
  const trends: Array<[{ current: number; previous: number }, TrendConfig]> = [
    [input.prospected, { label: "Prospecção de empresas", route: "/oportunidades", icon: React.createElement(Search, { size: 14 }), minPrevious: 10 }],
    [input.newLeads, { label: "Novos contatos no CRM", route: "/crm", icon: React.createElement(UserPlus, { size: 14 }), minPrevious: 5 }],
    [input.messagesSent, { label: "Mensagens enviadas", route: "/chat", icon: React.createElement(MessageSquare, { size: 14 }), minPrevious: 20 }],
    [input.conversations, { label: "Conversas iniciadas", route: "/chat", icon: React.createElement(MessageSquare, { size: 14 }), minPrevious: 5 }],
    [input.meetings, { label: "Reuniões agendadas", route: "/agenda", icon: React.createElement(CalendarClock, { size: 14 }), minPrevious: 2 }],
  ];

  trends.forEach(([data, cfg]) => {
    const a = trendAlert(data, cfg, p);
    if (a) alerts.push({ ...a, icon: cfg.icon });
  });

  // Vendas (contagem + valor)
  const dealsVar = variation(input.deals.currentCount, input.deals.previousCount);
  if (dealsVar !== null && input.deals.previousCount >= 1 && Math.abs(dealsVar) >= 15) {
    const isDrop = dealsVar < 0;
    alerts.push({
      type: isDrop ? "danger" : "success",
      icon: React.createElement(DollarSign, { size: 14 }),
      text: `Vendas fechadas: ${Math.abs(Math.round(dealsVar))}% ${isDrop ? "a menos" : "a mais"} que nos ${periodLabel(p)} anteriores (${fmtBRL(input.deals.currentValue)} vs ${fmtBRL(input.deals.previousValue)})`,
      route: "/crm-vendas",
      priority: isDrop ? 95 : 70,
    });
  }

  if (input.conversionRate && input.conversionRate.previous > 0) {
    const cv = input.conversionRate.current - input.conversionRate.previous;
    if (Math.abs(cv) >= 2) {
      const isDrop = cv < 0;
      alerts.push({
        type: isDrop ? "warning" : "success",
        icon: React.createElement(Target, { size: 14 }),
        text: `Taxa de conversão lead para venda ${isDrop ? "caiu" : "subiu"} de ${input.conversionRate.previous.toFixed(1)}% para ${input.conversionRate.current.toFixed(1)}% nos últimos ${periodLabel(p)}`,
        route: "/crm-vendas",
        priority: isDrop ? 85 : 60,
      });
    }
  }

  // ---------- 2. Operacional ----------
  if (input.leadsWithoutFirstContact > 0) {
    alerts.push({
      type: input.leadsWithoutFirstContact >= 20 ? "danger" : "warning",
      icon: React.createElement(Hourglass, { size: 14 }),
      text: `${fmtInt(input.leadsWithoutFirstContact)} leads no CRM há mais de 48h sem nenhuma abordagem enviada`,
      route: "/crm",
      priority: 90,
    });
  }

  if (input.unansweredConversations > 0) {
    alerts.push({
      type: input.unansweredConversations >= 5 ? "danger" : "warning",
      icon: React.createElement(MessageCircleOff, { size: 14 }),
      text: `${fmtInt(input.unansweredConversations)} conversas com mensagem do cliente sem resposta há mais de 24h`,
      route: "/chat",
      priority: 100,
    });
  }

  if (input.forgottenHotLeads > 0) {
    alerts.push({
      type: "danger",
      icon: React.createElement(Flame, { size: 14 }),
      text: `${fmtInt(input.forgottenHotLeads)} leads quentes (score acima de 600) sem interação há mais de 7 dias`,
      route: "/crm-score",
      priority: 98,
    });
  }

  if (input.stuckLeads > 0) {
    alerts.push({
      type: "warning",
      icon: React.createElement(Snowflake, { size: 14 }),
      text: `${fmtInt(input.stuckLeads)} leads parados na mesma etapa do funil há mais de 14 dias`,
      route: "/crm",
      priority: 75,
    });
  }

  if (input.disconnectedNumbers > 0) {
    alerts.push({
      type: "danger",
      icon: React.createElement(PlugZap, { size: 14 }),
      text: `${fmtInt(input.disconnectedNumbers)} número(s) de WhatsApp desconectado(s) — envios bloqueados`,
      route: "/whatsapp",
      priority: 100,
    });
  }

  if (input.campaignsWithoutReturn > 0) {
    alerts.push({
      type: "warning",
      icon: React.createElement(Megaphone, { size: 14 }),
      text: `${fmtInt(input.campaignsWithoutReturn)} campanha(s) com envios e nenhuma resposta — revise a mensagem e o público`,
      route: "/meta-campaigns",
      priority: 80,
    });
  }

  if (input.pendingPastMeetings > 0) {
    alerts.push({
      type: "warning",
      icon: React.createElement(CalendarClock, { size: 14 }),
      text: `${fmtInt(input.pendingPastMeetings)} reuniões já realizadas continuam sem desfecho registrado na agenda`,
      route: "/agenda",
      priority: 72,
    });
  }

  if (input.upcomingMeetings7d === 0 && input.readyForSale > 0) {
    alerts.push({
      type: "danger",
      icon: React.createElement(CalendarX, { size: 14 }),
      text: `Nenhuma reunião marcada para os próximos 7 dias, mesmo com ${fmtInt(input.readyForSale)} leads prontos para venda`,
      route: "/agenda",
      priority: 96,
    });
  }

  // ---------- 3. Score / engajamento ----------
  if (input.hotGrowth24h > 0) {
    alerts.push({
      type: "success",
      icon: React.createElement(Zap, { size: 14 }),
      text: `${fmtInt(input.hotGrowth24h)} leads tiveram aumento de score superior a 100 pts nas últimas 24h`,
      route: "/crm-score",
      priority: 65,
    });
  }

  if (input.readyForSale > 0) {
    alerts.push({
      type: "success",
      icon: React.createElement(Zap, { size: 14 }),
      text: `${fmtInt(input.readyForSale)} leads com score acima de 800 — prontos para abordagem de venda`,
      route: "/crm",
      priority: 88,
    });
  }

  if (input.decayedLeads7d > 0) {
    alerts.push({
      type: "warning",
      icon: React.createElement(TrendingDown, { size: 14 }),
      text: `${fmtInt(input.decayedLeads7d)} leads perderam pontos de score nos últimos 7 dias — risco de esfriamento`,
      route: "/crm-score",
      priority: 70,
    });
  }

  if (input.coldLeads > 5) {
    alerts.push({
      type: "warning",
      icon: React.createElement(ThermometerSun, { size: 14 }),
      text: `${fmtInt(input.coldLeads)} leads frios (score até 200) — considere reativação ou limpeza da base`,
      route: "/crm-score",
      priority: 55,
    });
  }

  if (input.bestResponseWeekday && input.bestResponseWeekday.rate > 0) {
    alerts.push({
      type: "info",
      icon: React.createElement(TrendingUp, { size: 14 }),
      text: `${input.bestResponseWeekday.label} é o dia com maior volume de respostas dos leads (${input.bestResponseWeekday.rate}% do total)`,
      route: "/meta-campaigns",
      priority: 30,
    });
  }

  if (input.peakHour !== null && !isNaN(input.peakHour)) {
    alerts.push({
      type: "info",
      icon: React.createElement(Clock, { size: 14 }),
      text: `Pico de atividade dos leads: ${input.peakHour.toString().padStart(2, "0")}:00 — melhor horário para envios`,
      route: "/meta-campaigns",
      priority: 25,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      icon: React.createElement(AlertCircle, { size: 14 }),
      text: "Sem alertas no momento. Continue prospectando para gerar diagnósticos.",
      route: "/oportunidades",
      priority: 0,
    });
  }

  const severityWeight: Record<ExecutiveAlert["type"], number> = {
    danger: 3,
    warning: 2,
    success: 1,
    info: 0,
  };

  return alerts
    .filter((a) => !a.text.includes("NaN"))
    .sort((a, b) => {
      const s = severityWeight[b.type] - severityWeight[a.type];
      if (s !== 0) return s;
      return (b.priority || 0) - (a.priority || 0);
    });
}
