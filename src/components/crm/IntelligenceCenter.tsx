import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Flame, AlertTriangle, Gauge, Users, ArrowRight, TrendingUp, TrendingDown,
  Minus, Target, Activity, Signal, Layers, UserCheck, Sparkles, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadIntelligence, NEXT_ACTION_LABELS, PRIORITY_LABELS, STAGE_LABELS } from "@/hooks/useLeadIntelligence";
import {
  INTEL_BAND_SHORT, intelBand, phoneKey8, intelTextColor,
  dimensionTo100, dimensionLabel, riskLabel, momentumOf, MOMENTUM_SIMPLE_LABELS,
} from "@/lib/intelligence";

/**
 * Central de Inteligencia dos Leads.
 *
 * NAO calcula nenhuma pontuacao nova. Le o motor central:
 *   intel_lead_profiles  -> dimensoes, momentum, prioridade, proxima acao
 *   revenue_leads        -> Oportunidade 0-100 (fallback normalizado do motor legado)
 *   revenue_score_logs   -> evolucao / crescimento / queda
 *   intel_signals        -> sinais comerciais (Evolution + Meta no mesmo pipeline)
 *
 * "Oportunidade" e o resultado numerico principal da Inteligencia (0-100).
 */
export interface IntelLeadRow {
  id: string;
  name: string | null;
  phone_e164: string;
  score_total: number;
  score_intent?: number;
  score_engagement?: number;
  score_risk?: number;
  status_bucket?: string;
  risk_state?: string | null;
  last_activity_at?: string | null;
}

const BANDS = [
  { key: "VERY_HIGH", label: INTEL_BAND_SHORT.VERY_HIGH, min: 81, max: 100 },
  { key: "HIGH", label: INTEL_BAND_SHORT.HIGH, min: 61, max: 80 },
  { key: "MEDIUM", label: INTEL_BAND_SHORT.MEDIUM, min: 41, max: 60 },
  { key: "LOW", label: INTEL_BAND_SHORT.LOW, min: 21, max: 40 },
  { key: "VERY_LOW", label: INTEL_BAND_SHORT.VERY_LOW, min: 0, max: 20 },
] as const;

const SIGNAL_LABELS: Record<string, string> = {
  PRICE_REQUEST: "Pediu preço",
  PROPOSAL_REQUEST: "Pediu proposta",
  BUYING_INTENT: "Intenção de compra",
  URGENCY: "Urgência",
  PRICE_OBJECTION: "Objeção de preço",
  OBJECTION: "Objeção",
  NO_REPLY: "Mensagem sem resposta",
  UNANSWERED: "Mensagem sem resposta",
  FAST_REPLY: "Resposta rápida",
  SILENCE: "Silêncio",
  REACTIVATION: "Reativação",
  MEETING_REQUEST: "Pediu reunião",
  PAYMENT_INTENT: "Falou em pagamento",
  SCHEDULING: "Agendamento",
  QUESTION: "Dúvida enviada",
  POSITIVE_SENTIMENT: "Sentimento positivo",
  NEGATIVE_SENTIMENT: "Sentimento negativo",
};
const prettySignal = (t: string) =>
  SIGNAL_LABELS[t] || t.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const Empty = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground py-8 text-center">{text}</p>
);

const Section = ({
  title, hint, icon: Icon, children, className, action,
}: {
  title: string; hint?: string; icon: React.ElementType;
  children: React.ReactNode; className?: string; action?: React.ReactNode;
}) => (
  <Card className={`bg-card border-border/60 transition-shadow hover:shadow-sm ${className || ""}`}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary shrink-0" /> {title}
          </CardTitle>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        {action}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

type Enriched = {
  lead: IntelLeadRow;
  profile: ReturnType<ReturnType<typeof useLeadIntelligence>["getByPhone"]>;
  opportunity: number;
  intent: number;
  engagement: number;
  risk: number;
  momentum: ReturnType<typeof momentumOf>;
  company: string | null;
  stageId: string | null;
  ownerId: string | null;
  title: string;
  stageName: string | null;
  ownerName: string | null;
};

const RankRow = ({
  i, row, valueLabel, valueClass, subtitle, trend, onClick,
}: {
  i: number; row: Enriched; valueLabel: string; valueClass?: string;
  subtitle?: string; trend?: "up" | "down" | "flat"; onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-muted/50 active:scale-[0.995] transition-all text-left group"
  >
    <span className="w-5 text-[11px] text-muted-foreground tabular-nums">{String(i).padStart(2, "0")}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-foreground truncate">{row.company ? `${row.title} · ${row.company}` : row.title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
    </div>
    {trend && (
      trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        : trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />
          : <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    )}
    <span className={`text-sm font-semibold tabular-nums shrink-0 ${valueClass || "text-foreground"}`}>{valueLabel}</span>
    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
  </button>
);

export const IntelligenceCenter = ({
  leads,
  onSelectLead,
}: {
  leads: IntelLeadRow[];
  onSelectLead?: (lead: IntelLeadRow) => void;
}) => {
  const { accountOwnerId } = useAuth();
  const { profiles, getByPhone } = useLeadIntelligence();

  const [days, setDays] = useState("30");
  const [band, setBand] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [rankTab, setRankTab] = useState<"opportunity" | "intent" | "engagement" | "growth" | "risk">("opportunity");
  const [drill, setDrill] = useState<{ title: string; hint?: string; rows: Enriched[] } | null>(null);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(days));
    return d.toISOString();
  }, [days]);

  /* Histórico real de pontuação (evolução, crescimento e queda). */
  const { data: logs = [] } = useQuery({
    queryKey: ["intel-center-logs", accountOwnerId, days],
    queryFn: async () => {
      if (!accountOwnerId) return [];
      const { data, error } = await supabase
        .from("revenue_score_logs")
        .select("lead_id, score_before, score_after, created_at, event_type, points_applied")
        .eq("owner_user_id", accountOwnerId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountOwnerId,
    staleTime: 120_000,
  });

  /* Sinais comerciais detectados pelo motor (Evolution + Meta no mesmo pipeline). */
  const { data: signals = [] } = useQuery({
    queryKey: ["intel-center-signals", accountOwnerId, days],
    queryFn: async () => {
      if (!accountOwnerId) return [];
      const { data, error } = await supabase
        .from("intel_signals")
        .select("signal_type, signal_group, phone_e164, occurred_at")
        .eq("owner_user_id", accountOwnerId)
        .gte("occurred_at", since)
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountOwnerId,
    staleTime: 120_000,
  });

  /* Etapa do funil e responsável — vindos do CRM real. */
  const { data: crm } = useQuery({
    queryKey: ["intel-center-crm", accountOwnerId],
    queryFn: async () => {
      if (!accountOwnerId) return { byPhone: new Map(), stages: [] as any[], owners: new Map<string, string>() };
      const [{ data: crmLeads }, { data: stages }] = await Promise.all([
        supabase.from("leads").select("id, phone, contact_name, company_name, pipeline_stage_id, responsible_user_id").eq("owner_user_id", accountOwnerId).limit(5000),
        supabase.from("pipeline_stages").select("id, name, position").eq("owner_user_id", accountOwnerId).order("position"),
      ]);
      const ownerIds = Array.from(new Set((crmLeads || []).map((l: any) => l.responsible_user_id).filter(Boolean)));
      const owners = new Map<string, string>();
      if (ownerIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ownerIds as string[]);
        for (const p of profs || []) owners.set((p as any).id, (p as any).full_name || (p as any).email || "Sem nome");
      }
      const byPhone = new Map<string, any>();
      for (const l of crmLeads || []) byPhone.set(phoneKey8((l as any).phone), l);
      return { byPhone, stages: stages || [], owners };
    },
    enabled: !!accountOwnerId,
    staleTime: 300_000,
  });

  const enriched: Enriched[] = useMemo(() => {
    return leads.map((l) => {
      const p = getByPhone(l.phone_e164);
      const c = crm?.byPhone.get(phoneKey8(l.phone_e164));
      // Fonte unica: intel_lead_profiles. Sem perfil = nao analisado (0), nunca valor presumido.
      const opportunity = p ? Math.max(0, Math.min(100, Math.round(p.opportunity_score))) : 0;
      const intent = p ? Math.round(p.intent_score) : 0;
      const engagement = p ? Math.round(p.engagement_score) : 0;
      const risk = p ? Math.round(p.risk_score) : 0;
      const momentum = p
        ? momentumOf(p.momentum_state)
        : (l.risk_state === "AT_RISK" || l.risk_state === "CRITICAL" ? "down" : "unknown");
      return {
        lead: l,
        profile: p,
        opportunity, intent, engagement, risk, momentum,
        company: c?.company_name || null,
        stageId: c?.pipeline_stage_id || null,
        ownerId: c?.responsible_user_id || null,
        title: l.name || c?.contact_name || c?.company_name || l.phone_e164,
        stageName: p ? (STAGE_LABELS[p.stage] || p.stage) : (crm?.stages?.find((s: any) => s.id === c?.pipeline_stage_id)?.name || null),
        ownerName: c?.responsible_user_id ? (crm?.owners?.get(c.responsible_user_id) || null) : null,
      };
    });
  }, [leads, profiles, crm, getByPhone]);

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      if (band !== "all" && intelBand(e.opportunity) !== band) return false;
      if (stageFilter !== "all" && e.stageId !== stageFilter) return false;
      if (ownerFilter !== "all" && e.ownerId !== ownerFilter) return false;
      return true;
    });
  }, [enriched, band, stageFilter, ownerFilter]);

  const total = filtered.length;
  const avg = total ? Math.round(filtered.reduce((s, e) => s + e.opportunity, 0) / total) : 0;
  const highOpportunityRows = filtered.filter((e) => e.opportunity >= 61);
  const highIntentRows = filtered.filter((e) => e.intent >= 61);
  const atRisk = filtered.filter((e) => e.risk >= 61 || e.lead.risk_state === "CRITICAL");
  const attentionRows = filtered.filter((e) => e.profile && (e.profile.priority === "P0" || e.profile.priority === "P1"));

  const bands = BANDS.map((b) => {
    const rows = filtered.filter((e) => e.opportunity >= b.min && e.opportunity <= b.max);
    return { ...b, count: rows.length, rows };
  });

  const momentumGroups = useMemo(() => ({
    up: filtered.filter((e) => e.momentum === "up"),
    flat: filtered.filter((e) => e.momentum === "flat"),
    down: filtered.filter((e) => e.momentum === "down"),
  }), [filtered]);
  const momentumAnalyzed = momentumGroups.up.length + momentumGroups.flat.length + momentumGroups.down.length;

  const actions = useMemo(() => {
    const map = new Map<string, Enriched[]>();
    for (const e of filtered) {
      if (!e.profile) continue;
      const k = e.profile.next_best_action;
      map.set(k, [...(map.get(k) || []), e]);
    }
    return Array.from(map.entries())
      .map(([action, rows]) => ({ action, rows }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [filtered]);

  /* Crescimento e queda: diferença real entre o primeiro e o último registro do período. */
  const deltas = useMemo(() => {
    const byLead = new Map<string, { first: number; last: number; reason?: string }>();
    for (const l of logs as any[]) {
      const before = dimensionTo100(l.score_before);
      const after = dimensionTo100(l.score_after);
      const cur = byLead.get(l.lead_id);
      if (!cur) byLead.set(l.lead_id, { first: before, last: after, reason: l.event_type });
      else {
        cur.last = after;
        if (Number(l.points_applied || 0) < 0) cur.reason = l.event_type;
      }
    }
    const rows = filtered
      .map((e) => {
        const d = byLead.get(e.lead.id);
        if (!d) return null;
        return { e, from: d.first, to: d.last, delta: d.last - d.first, reason: d.reason };
      })
      .filter(Boolean) as { e: Enriched; from: number; to: number; delta: number; reason?: string }[];
    return {
      rising: rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta),
      falling: rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta),
    };
  }, [logs, filtered]);

  /* Evolução agregada: média diária real da pontuação registrada no período. */
  const evolution = useMemo(() => {
    const byDay = new Map<string, { sum: number; n: number }>();
    for (const l of logs as any[]) {
      const day = new Date(l.created_at).toISOString().slice(0, 10);
      const v = dimensionTo100(l.score_after);
      const cur = byDay.get(day) || { sum: 0, n: 0 };
      cur.sum += v; cur.n += 1;
      byDay.set(day, cur);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({
        date: new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        media: Math.round(v.sum / v.n),
        leads: v.n,
      }));
  }, [logs]);

  /* Tendência do período: primeiro dia vs último dia da média real. */
  const avgTrend = useMemo(() => {
    if (evolution.length < 2) return null;
    const first = evolution[0].media;
    const last = evolution[evolution.length - 1].media;
    if (!first) return null;
    return Math.round(((last - first) / first) * 100);
  }, [evolution]);

  const topSignals = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of signals as any[]) {
      const set = map.get(s.signal_type) || new Set<string>();
      set.add(phoneKey8(s.phone_e164));
      map.set(s.signal_type, set);
    }
    const rows = Array.from(map.entries()).map(([type, set]) => ({ type, count: set.size }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
    const max = rows[0]?.count || 1;
    return rows.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }, [signals]);

  const byStage = useMemo(() => {
    if (!crm?.stages?.length) return [];
    return crm.stages
      .map((s: any) => {
        const rows = filtered.filter((e) => e.stageId === s.id);
        return {
          id: s.id, name: s.name, rows, count: rows.length,
          avg: rows.length ? Math.round(rows.reduce((a, e) => a + e.opportunity, 0) / rows.length) : 0,
        };
      })
      .filter((s: any) => s.count > 0);
  }, [crm, filtered]);

  const byOwner = useMemo(() => {
    if (!crm?.owners?.size) return [];
    const map = new Map<string, Enriched[]>();
    for (const e of filtered) {
      if (!e.ownerId) continue;
      map.set(e.ownerId, [...(map.get(e.ownerId) || []), e]);
    }
    return Array.from(map.entries()).map(([id, rows]) => ({
      id,
      name: crm.owners.get(id) || "Sem nome",
      rows,
      count: rows.length,
      avg: Math.round(rows.reduce((a, e) => a + e.opportunity, 0) / rows.length),
      intent: Math.round(rows.reduce((a, e) => a + e.intent, 0) / rows.length),
      high: rows.filter((e) => e.opportunity >= 61).length,
      risk: rows.filter((e) => e.risk >= 61).length,
    })).sort((a, b) => b.avg - a.avg);
  }, [crm, filtered]);

  /* ── Ranking unificado por dimensão (cada aba ordena pela SUA dimensão) ── */
  const ranking = useMemo(() => {
    if (rankTab === "opportunity") {
      return [...filtered].filter((e) => e.opportunity > 0).sort((a, b) => b.opportunity - a.opportunity).slice(0, 15)
        .map((e) => ({ e, value: `${e.opportunity} de 100`, cls: intelTextColor(e.opportunity), trend: e.momentum }));
    }
    if (rankTab === "intent") {
      return [...filtered].filter((e) => e.intent > 0).sort((a, b) => b.intent - a.intent).slice(0, 15)
        .map((e) => ({ e, value: dimensionLabel(e.intent), cls: intelTextColor(e.intent), trend: e.momentum }));
    }
    if (rankTab === "engagement") {
      return [...filtered].filter((e) => e.engagement > 0).sort((a, b) => b.engagement - a.engagement).slice(0, 15)
        .map((e) => ({ e, value: `${e.engagement}`, cls: intelTextColor(e.engagement), trend: e.momentum }));
    }
    if (rankTab === "growth") {
      return deltas.rising.slice(0, 15)
        .map((r) => ({ e: r.e, value: `+${r.delta}`, cls: "text-emerald-500", trend: "up" as const, extra: `${r.from} → ${r.to}` }));
    }
    return [...atRisk].sort((a, b) => b.risk - a.risk).slice(0, 15)
      .map((e) => ({ e, value: `Risco ${e.risk}`, cls: "text-destructive", trend: e.momentum }));
  }, [rankTab, filtered, deltas, atRisk]);

  const RANK_TABS = [
    { key: "opportunity", label: "Oportunidades" },
    { key: "intent", label: "Intenção" },
    { key: "engagement", label: "Engajamento" },
    { key: "growth", label: "Crescimento" },
    { key: "risk", label: "Risco" },
  ] as const;

  const openDrill = (title: string, rows: Enriched[], hint?: string) => {
    if (!rows.length) return;
    setDrill({ title, rows: [...rows].sort((a, b) => b.opportunity - a.opportunity), hint });
  };

  /* ── KPIs: hierarquia clara, com destaque para a Oportunidade média ── */
  const kpis = [
    {
      label: "Oportunidade média", value: `${avg}`, suffix: " de 100", icon: Gauge, primary: true,
      context: total ? `${total.toLocaleString("pt-BR")} contatos analisados` : "Sem contatos no filtro",
      trend: avgTrend, rows: filtered,
    },
    { label: "Alta oportunidade", value: highOpportunityRows.length.toLocaleString("pt-BR"), suffix: total ? ` · ${Math.round((highOpportunityRows.length / total) * 100)}%` : "", icon: Brain, context: "61 a 100 de Oportunidade", rows: highOpportunityRows },
    { label: "Alta intenção", value: highIntentRows.length.toLocaleString("pt-BR"), icon: Target, context: "Sinais fortes de compra", rows: highIntentRows },
    { label: "Em risco", value: atRisk.length.toLocaleString("pt-BR"), icon: AlertTriangle, context: "Silêncio, objeção ou sem resposta", rows: atRisk },
    { label: "Precisam de atenção", value: attentionRows.length.toLocaleString("pt-BR"), icon: Flame, context: "Prioridade crítica ou muito alta", rows: attentionRows },
    { label: "Leads analisados", value: total.toLocaleString("pt-BR"), icon: Users, context: `${profiles.length.toLocaleString("pt-BR")} com perfil completo`, rows: filtered },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros globais */}
      <div className="flex flex-wrap gap-2">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 180 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="w-[190px] h-9 text-xs"><SelectValue placeholder="Faixa de Oportunidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as oportunidades</SelectItem>
            {BANDS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label} ({b.min}–{b.max})</SelectItem>)}
          </SelectContent>
        </Select>
        {(crm?.stages?.length || 0) > 0 && (
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue placeholder="Etapa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {crm!.stages.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(crm?.owners?.size || 0) > 0 && (
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {Array.from(crm!.owners.entries()).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Resumo executivo */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => openDrill(k.label, k.rows)}
            className={`text-left rounded-2xl border transition-all hover:border-primary/40 hover:shadow-sm ${
              k.primary ? "bg-primary/[0.04] border-primary/25 col-span-2" : "bg-card border-border/60"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.primary ? "bg-primary/15" : "bg-muted/60"}`}>
                  <k.icon className={`w-3.5 h-3.5 ${k.primary ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">{k.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`tabular-nums font-semibold text-foreground ${k.primary ? "text-3xl" : "text-xl"}`}>{k.value}</span>
                {k.suffix && <span className="text-xs text-muted-foreground tabular-nums">{k.suffix}</span>}
                {typeof k.trend === "number" && k.trend !== 0 && (
                  <span className={`text-[11px] font-medium tabular-nums flex items-center gap-0.5 ${k.trend > 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {k.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {k.trend > 0 ? "+" : ""}{k.trend}%
                  </span>
                )}
              </div>
              {k.context && <p className="text-[11px] text-muted-foreground mt-1 truncate">{k.context}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* Distribuição + Tendência + Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Distribuição das oportunidades" icon={Layers} hint="Clique em uma faixa para ver os contatos.">
          <div className="space-y-3">
            {total === 0 && <Empty text="Nenhum contato analisado com os filtros atuais." />}
            {total > 0 && bands.map((b) => {
              const pct = total ? Math.round((b.count / total) * 100) : 0;
              return (
                <button
                  key={b.key}
                  type="button"
                  disabled={!b.count}
                  onClick={() => openDrill(`${b.label} — ${b.min} a ${b.max}`, b.rows, `${b.count} contatos · ${pct}% da base`)}
                  className="w-full text-left group disabled:opacity-50 disabled:cursor-default"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      {b.label} <span className="text-muted-foreground">({b.min}–{b.max})</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{b.count} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700 group-hover:opacity-80" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Tendência dos leads" icon={Activity} hint="Como o interesse está se movendo.">
          {momentumAnalyzed === 0 ? (
            <Empty text="Ainda não há leads com tendência calculada." />
          ) : (
            <div className="space-y-2">
              {([
                { key: "up", label: "Crescendo", icon: TrendingUp, cls: "text-emerald-500" },
                { key: "flat", label: "Estável", icon: Minus, cls: "text-muted-foreground" },
                { key: "down", label: "Em queda", icon: TrendingDown, cls: "text-destructive" },
              ] as const).map((m) => {
                const rows = momentumGroups[m.key];
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!rows.length}
                    onClick={() => openDrill(`Leads ${m.label.toLowerCase()}`, rows)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-default"
                  >
                    <span className="text-xs text-foreground flex items-center gap-2"><m.icon className={`w-3.5 h-3.5 ${m.cls}`} />{m.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {rows.length} · {Math.round((rows.length / momentumAnalyzed) * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="O que precisa de atenção?" icon={Sparkles} hint="Próximo passo sugerido pela Inteligência. Clique para ver os leads.">
          {actions.length === 0 ? (
            <Empty text="Assim que houver conversas analisadas, as recomendações aparecem aqui." />
          ) : (
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {actions.map(({ action, rows }) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => openDrill(NEXT_ACTION_LABELS[action] || action, rows)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group"
                >
                  <span className="text-xs text-foreground flex items-center gap-2 min-w-0">
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{NEXT_ACTION_LABELS[action] || action}</span>
                  </span>
                  <span className="text-xs tabular-nums font-semibold text-foreground shrink-0">{rows.length}</span>
                </button>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Evolução */}
      <Section
        title="Evolução das oportunidades"
        icon={TrendingUp}
        hint="Média diária real da base, com base no histórico registrado pelo motor."
        action={
          <div className="flex items-center gap-2 shrink-0">
            {evolution.length >= 2 && (
              <>
                <Badge variant="outline" className="text-[10px] tabular-nums">Média {avg} de 100</Badge>
                {typeof avgTrend === "number" && (
                  <Badge variant="outline" className={`text-[10px] tabular-nums ${avgTrend >= 0 ? "text-emerald-600 border-emerald-500/30" : "text-destructive border-destructive/30"}`}>
                    {avgTrend >= 0 ? "+" : ""}{avgTrend}% no período
                  </Badge>
                )}
              </>
            )}
          </div>
        }
      >
        {evolution.length < 2 ? (
          <Empty text="Ainda não há histórico suficiente no período selecionado. Amplie o período ou aguarde novas interações." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={evolution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="intelArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number, n) => [n === "media" ? `${v} de 100` : `${v} registros`, n === "media" ? "Oportunidade média" : "Interações"]}
              />
              <Area type="monotone" dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#intelArea)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Ranking unificado */}
      <Section
        title="Ranking de oportunidades"
        icon={Brain}
        hint="Cada aba ordena pela sua própria dimensão da Inteligência."
        action={
          <div className="flex flex-wrap gap-1 shrink-0">
            {RANK_TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={rankTab === t.key ? "default" : "ghost"}
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setRankTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        }
      >
        {ranking.length === 0 ? (
          <Empty text="Nenhum contato com dados suficientes nesta dimensão." />
        ) : (
          <div className="space-y-0.5">
            {ranking.map((r, i) => {
              const e = r.e;
              const parts = [
                rankTab !== "opportunity" ? `Oportunidade ${e.opportunity} de 100` : `Intenção: ${dimensionLabel(e.intent)}`,
                rankTab === "growth" ? (r as any).extra : `Engajamento ${e.engagement}`,
                e.stageName ? `Etapa: ${e.stageName}` : null,
                e.ownerName ? `Resp.: ${e.ownerName}` : null,
                e.lead.last_activity_at ? `Última interação: ${new Date(e.lead.last_activity_at).toLocaleDateString("pt-BR")}` : null,
              ].filter(Boolean) as string[];
              return (
                <RankRow
                  key={e.lead.id}
                  i={i + 1}
                  row={e}
                  subtitle={parts.join(" · ")}
                  valueLabel={r.value}
                  valueClass={r.cls}
                  trend={r.trend === "unknown" ? undefined : (r.trend as any)}
                  onClick={() => onSelectLead?.(e.lead)}
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* Queda + sinais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Oportunidades em queda" icon={TrendingDown} hint="Contatos perdendo interesse no período.">
          {deltas.falling.length === 0 ? <Empty text="Sem quedas registradas no período." /> : (
            <div className="space-y-0.5">
              {deltas.falling.slice(0, 10).map((r, i) => (
                <RankRow
                  key={r.e.lead.id} i={i + 1} row={r.e}
                  subtitle={`${r.from} → ${r.to}${r.reason ? ` · ${prettySignal(r.reason)}` : ""}`}
                  valueLabel={`${r.delta}`} valueClass="text-destructive" trend="down"
                  onClick={() => onSelectLead?.(r.e.lead)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Principais sinais comerciais" icon={Signal} hint="Sinais detectados nas conversas (Evolution e Meta) no período.">
          {topSignals.length === 0 ? <Empty text="Nenhum sinal detectado no período." /> : (
            <div className="space-y-2.5">
              {topSignals.map((s) => (
                <div key={s.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground truncate">{prettySignal(s.type)}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{s.count} {s.count === 1 ? "lead" : "leads"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70 transition-[width] duration-700" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Etapa e responsável */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {byStage.length > 0 && (
          <Section title="Oportunidade por etapa" icon={Layers} hint="Onde estão as melhores oportunidades do funil.">
            <div className="space-y-3">
              {byStage.map((s: any) => (
                <button key={s.id} type="button" onClick={() => openDrill(`Etapa: ${s.name}`, s.rows)} className="w-full text-left group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground group-hover:text-primary transition-colors">{s.name} <span className="text-muted-foreground">({s.count})</span></span>
                    <span className={`tabular-nums font-semibold ${intelTextColor(s.avg)}`}>{s.avg} de 100</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${s.avg}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {byOwner.length > 0 && (
          <Section title="Oportunidade por responsável" icon={UserCheck} hint="Qualidade e acompanhamento por carteira.">
            <div className="space-y-1">
              {byOwner.map((o) => (
                <button key={o.id} type="button" onClick={() => openDrill(`Carteira de ${o.name}`, o.rows)} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl bg-muted/20 hover:bg-muted/50 transition-colors text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {o.count} leads · {o.high} de alta oportunidade · {o.risk} em risco · intenção média {o.intent}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${intelTextColor(o.avg)}`}>{o.avg} de 100</span>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["P0", "P1", "P2", "P3", "P4"].map((p) => {
            const rows = filtered.filter((e) => e.profile?.priority === p);
            return rows.length ? (
              <button key={p} type="button" onClick={() => openDrill(`Prioridade ${PRIORITY_LABELS[p]}`, rows)}>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                  {PRIORITY_LABELS[p]}: {rows.length}
                </Badge>
              </button>
            ) : null;
          })}
        </div>
      )}

      {/* Drill-down: lista de leads da fatia clicada */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-base">{drill?.title}</DialogTitle>
            {drill && (
              <p className="text-xs text-muted-foreground">
                {drill.hint || `${drill.rows.length} ${drill.rows.length === 1 ? "contato" : "contatos"}`}
              </p>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-0.5 pr-1">
            {drill?.rows.map((e, i) => (
              <RankRow
                key={e.lead.id} i={i + 1} row={e}
                subtitle={[
                  `Intenção: ${dimensionLabel(e.intent)}`,
                  `Engajamento ${e.engagement}`,
                  `Risco: ${riskLabel(e.risk)}`,
                  `Tendência: ${MOMENTUM_SIMPLE_LABELS[e.momentum]}`,
                  e.stageName ? `Etapa: ${e.stageName}` : null,
                ].filter(Boolean).join(" · ")}
                valueLabel={`${e.opportunity} de 100`}
                valueClass={intelTextColor(e.opportunity)}
                trend={e.momentum === "unknown" ? undefined : e.momentum}
                onClick={() => { onSelectLead?.(e.lead); setDrill(null); }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntelligenceCenter;
