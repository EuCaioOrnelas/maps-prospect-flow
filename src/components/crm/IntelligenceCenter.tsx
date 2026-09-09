import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Flame, AlertTriangle, Gauge, Users, ArrowRight, TrendingUp, TrendingDown,
  Minus, Target, Activity, Signal, Layers, UserCheck, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadIntelligence, NEXT_ACTION_LABELS, PRIORITY_LABELS, MOMENTUM_LABELS, STAGE_LABELS } from "@/hooks/useLeadIntelligence";
import { INTEL_BAND_SHORT, intelBand, phoneKey8, intelTextColor } from "@/lib/intelligence";

/**
 * Central de Inteligencia dos Leads.
 * NAO calcula nenhuma pontuacao nova: consome o motor central
 * (intel_lead_profiles / intel_signals) e a base ja normalizada 0-100.
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

const pctOf = (value: number | undefined, max: number) =>
  Math.max(0, Math.min(100, Math.round(((Math.abs(Number(value || 0))) / max) * 100)));

const intentLevel = (v: number) => (v >= 81 ? "Muito alta" : v >= 61 ? "Alta" : v >= 41 ? "Moderada" : v >= 21 ? "Baixa" : "Sem intenção identificada");

const Empty = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground py-8 text-center">{text}</p>
);

const RankRow = ({
  i, title, subtitle, value, valueLabel, onClick, trend,
}: {
  i: number; title: string; subtitle?: string; value?: number; valueLabel?: string;
  onClick?: () => void; trend?: "up" | "down" | "flat";
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-muted/40 transition-colors text-left"
  >
    <span className="w-4 text-[11px] text-muted-foreground tabular-nums">{i}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-foreground truncate">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
    </div>
    {trend && (
      trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        : trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />
          : <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    )}
    <span className={`text-sm font-semibold tabular-nums shrink-0 ${typeof value === "number" ? intelTextColor(value) : "text-foreground"}`}>
      {valueLabel ?? `${value} de 100`}
    </span>
  </button>
);

const Section = ({
  title, hint, icon: Icon, children, className,
}: { title: string; hint?: string; icon: React.ElementType; children: React.ReactNode; className?: string }) => (
  <Card className={`bg-card border-border/60 ${className || ""}`}>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </CardTitle>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
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
      if (!accountOwnerId) return { byPhone: new Map(), stages: [] as any[], owners: new Map() };
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

  const enriched = useMemo(() => {
    return leads.map((l) => {
      const p = getByPhone(l.phone_e164);
      const c = crm?.byPhone.get(phoneKey8(l.phone_e164));
      const intent = p ? Math.round(p.intent_score) : pctOf(l.score_intent, 5);
      const engagement = p ? Math.round(p.engagement_score) : pctOf(l.score_engagement, 5);
      const risk = p ? Math.round(p.risk_score) : pctOf(l.score_risk, 3);
      return {
        lead: l,
        profile: p,
        intent, engagement, risk,
        company: c?.company_name || null,
        stageId: c?.pipeline_stage_id || null,
        ownerId: c?.responsible_user_id || null,
        title: l.name || c?.contact_name || c?.company_name || l.phone_e164,
      };
    });
  }, [leads, profiles, crm, getByPhone]);

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      if (band !== "all" && intelBand(e.lead.score_total) !== band) return false;
      if (stageFilter !== "all" && e.stageId !== stageFilter) return false;
      if (ownerFilter !== "all" && e.ownerId !== ownerFilter) return false;
      return true;
    });
  }, [enriched, band, stageFilter, ownerFilter]);

  const total = filtered.length;
  const avg = total ? Math.round(filtered.reduce((s, e) => s + e.lead.score_total, 0) / total) : 0;
  const highOpportunity = filtered.filter((e) => e.lead.score_total >= 61).length;
  const highIntent = filtered.filter((e) => e.intent >= 61).length;
  const atRisk = filtered.filter((e) => e.risk >= 50 || e.lead.risk_state === "AT_RISK" || e.lead.risk_state === "CRITICAL");
  const needsAttention = filtered.filter((e) => e.profile && (e.profile.priority === "P0" || e.profile.priority === "P1")).length;

  const bands = BANDS.map((b) => ({
    ...b,
    count: filtered.filter((e) => e.lead.score_total >= b.min && e.lead.score_total <= b.max).length,
  }));

  const momentum = useMemo(() => {
    const up = filtered.filter((e) => e.profile && (e.profile.momentum_state === "RISING" || e.profile.momentum_state === "STRONGLY_RISING")).length;
    const down = filtered.filter((e) => e.profile && (e.profile.momentum_state === "DECLINING" || e.profile.momentum_state === "STRONGLY_DECLINING")).length;
    const flat = filtered.filter((e) => e.profile && e.profile.momentum_state === "STABLE").length;
    return { up, down, flat, analyzed: up + down + flat };
  }, [filtered]);

  const actions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) if (e.profile) map[e.profile.next_best_action] = (map[e.profile.next_best_action] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);

  /* Crescimento e queda: diferença real entre o primeiro e o último registro do período. */
  const deltas = useMemo(() => {
    const byLead = new Map<string, { first: number; last: number; reason?: string }>();
    for (const l of logs as any[]) {
      const before = Math.round(Number(l.score_before || 0) / 10);
      const after = Math.round(Number(l.score_after || 0) / 10);
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
      .filter(Boolean) as { e: typeof filtered[number]; from: number; to: number; delta: number; reason?: string }[];
    return {
      rising: rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 8),
      falling: rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 8),
    };
  }, [logs, filtered]);

  /* Evolução agregada: média diária da pontuação registrada no período. */
  const evolution = useMemo(() => {
    const byDay = new Map<string, { sum: number; n: number }>();
    for (const l of logs as any[]) {
      const day = new Date(l.created_at).toISOString().slice(0, 10);
      const v = Math.max(0, Math.min(100, Math.round(Number(l.score_after || 0) / 10)));
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

  const topSignals = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const s of signals as any[]) {
      const set = map.get(s.signal_type) || new Set<string>();
      set.add(phoneKey8(s.phone_e164));
      map.set(s.signal_type, set);
    }
    return Array.from(map.entries())
      .map(([type, set]) => ({ type, count: set.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [signals]);

  const byStage = useMemo(() => {
    if (!crm?.stages?.length) return [];
    return crm.stages
      .map((s: any) => {
        const rows = filtered.filter((e) => e.stageId === s.id);
        return { id: s.id, name: s.name, count: rows.length, avg: rows.length ? Math.round(rows.reduce((a, e) => a + e.lead.score_total, 0) / rows.length) : 0 };
      })
      .filter((s: any) => s.count > 0);
  }, [crm, filtered]);

  const byOwner = useMemo(() => {
    if (!crm?.owners?.size) return [];
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      if (!e.ownerId) continue;
      map.set(e.ownerId, [...(map.get(e.ownerId) || []), e]);
    }
    return Array.from(map.entries()).map(([id, rows]) => ({
      id,
      name: crm.owners.get(id) || "Sem nome",
      count: rows.length,
      avg: Math.round(rows.reduce((a, e) => a + e.lead.score_total, 0) / rows.length),
      intent: Math.round(rows.reduce((a, e) => a + e.intent, 0) / rows.length),
      high: rows.filter((e) => e.lead.score_total >= 61).length,
      risk: rows.filter((e) => e.risk >= 50 || e.lead.risk_state === "AT_RISK" || e.lead.risk_state === "CRITICAL").length,
    })).sort((a, b) => b.avg - a.avg);
  }, [crm, filtered]);

  const topIntent = [...filtered].sort((a, b) => b.intent - a.intent).filter((e) => e.intent > 0).slice(0, 8);
  const topEngagement = [...filtered].sort((a, b) => b.engagement - a.engagement).filter((e) => e.engagement > 0).slice(0, 8);
  const topOpportunity = [...filtered].sort((a, b) => b.lead.score_total - a.lead.score_total).filter((e) => e.lead.score_total > 0).slice(0, 10);
  const riskTop = [...atRisk].sort((a, b) => b.risk - a.risk).slice(0, 8);

  const kpis = [
    { label: "Leads analisados", value: total.toLocaleString("pt-BR"), icon: Users },
    { label: "Inteligência média", value: `${avg} de 100`, icon: Gauge },
    { label: "Alta oportunidade", value: highOpportunity.toLocaleString("pt-BR"), icon: Brain },
    { label: "Alta intenção", value: highIntent.toLocaleString("pt-BR"), icon: Target },
    { label: "Em risco", value: atRisk.length.toLocaleString("pt-BR"), icon: AlertTriangle },
    { label: "Precisam de atenção", value: needsAttention.toLocaleString("pt-BR"), icon: Flame },
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
          </SelectContent>
        </Select>
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Faixa de Inteligência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as faixas</SelectItem>
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
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribuição + Tendência + Ações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Distribuição da Inteligência" icon={Layers} hint="Qualidade atual da sua base de contatos.">
          <div className="space-y-3">
            {total === 0 && <Empty text="Nenhum contato analisado com os filtros atuais." />}
            {total > 0 && bands.map((b) => {
              const pct = total ? Math.round((b.count / total) * 100) : 0;
              return (
                <div key={b.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{b.label} <span className="text-muted-foreground">({b.min}–{b.max})</span></span>
                    <span className="tabular-nums text-muted-foreground">{b.count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Tendência dos leads" icon={Activity} hint="Como o interesse está se movendo.">
          {momentum.analyzed === 0 ? (
            <Empty text="Ainda não há leads com tendência calculada." />
          ) : (
            <div className="space-y-2">
              {[
                { label: "Crescendo", value: momentum.up, icon: TrendingUp, cls: "text-emerald-500" },
                { label: "Estável", value: momentum.flat, icon: Minus, cls: "text-muted-foreground" },
                { label: "Em queda", value: momentum.down, icon: TrendingDown, cls: "text-destructive" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground flex items-center gap-2"><m.icon className={`w-3.5 h-3.5 ${m.cls}`} />{m.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {m.value} · {momentum.analyzed ? Math.round((m.value / momentum.analyzed) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="O que precisa de atenção?" icon={Sparkles} hint="Próximo passo sugerido pela Inteligência.">
          {actions.length === 0 ? (
            <Empty text="Assim que houver conversas analisadas, as recomendações aparecem aqui." />
          ) : (
            <div className="space-y-2">
              {actions.map(([action, count]) => (
                <div key={action} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-primary" />{NEXT_ACTION_LABELS[action] || action}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Evolução */}
      <Section title="Evolução da Inteligência" icon={TrendingUp} hint="Média da base a cada dia, com base no histórico real.">
        {evolution.length < 2 ? (
          <Empty text="Ainda não há histórico suficiente no período selecionado." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="media" name="Inteligência média" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Leads com maior intenção" icon={Target} hint="Ordenado pela dimensão de intenção comercial.">
          {topIntent.length === 0 ? <Empty text="Nenhum sinal de intenção identificado ainda." /> : (
            <div className="space-y-0.5">
              {topIntent.map((e, i) => (
                <RankRow
                  key={e.lead.id} i={i + 1} title={e.title}
                  subtitle={`Intenção: ${intentLevel(e.intent)} · Inteligência ${e.lead.score_total} de 100${e.profile?.hot_reason ? ` · ${e.profile.hot_reason}` : ""}`}
                  valueLabel={`${e.intent}`} onClick={() => onSelectLead?.(e.lead)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Leads mais engajados" icon={Activity} hint="Quem mais interage e responde.">
          {topEngagement.length === 0 ? <Empty text="Ainda não há interações suficientes." /> : (
            <div className="space-y-0.5">
              {topEngagement.map((e, i) => (
                <RankRow
                  key={e.lead.id} i={i + 1} title={e.title}
                  subtitle={`Engajamento ${e.engagement} · Inteligência ${e.lead.score_total} de 100`}
                  valueLabel={`${e.engagement}`} onClick={() => onSelectLead?.(e.lead)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Maiores oportunidades" icon={Brain} hint="Os contatos com maior Inteligência hoje." className="lg:col-span-2">
          {topOpportunity.length === 0 ? <Empty text="Nenhum contato pontuado ainda." /> : (
            <div className="space-y-0.5">
              {topOpportunity.map((e, i) => {
                const p = e.profile;
                const stage = p ? STAGE_LABELS[p.stage] || p.stage : (crm?.stages?.find((s: any) => s.id === e.stageId)?.name || null);
                const last = e.lead.last_activity_at ? new Date(e.lead.last_activity_at).toLocaleDateString("pt-BR") : null;
                const parts = [
                  `Intenção: ${intentLevel(e.intent)}`,
                  stage ? `Etapa: ${stage}` : null,
                  e.ownerId && crm?.owners?.get(e.ownerId) ? `Resp.: ${crm.owners.get(e.ownerId)}` : null,
                  last ? `Última interação: ${last}` : null,
                ].filter(Boolean);
                return (
                  <RankRow
                    key={e.lead.id} i={i + 1} title={e.company ? `${e.title} · ${e.company}` : e.title}
                    subtitle={parts.join(" · ")} value={e.lead.score_total}
                    trend={p ? (p.momentum_state.includes("RISING") ? "up" : p.momentum_state.includes("DECLINING") ? "down" : "flat") : undefined}
                    onClick={() => onSelectLead?.(e.lead)}
                  />
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Inteligência em crescimento" icon={TrendingUp} hint="Contatos esquentando no período.">
          {deltas.rising.length === 0 ? <Empty text="Sem crescimento registrado no período." /> : (
            <div className="space-y-0.5">
              {deltas.rising.map((r, i) => (
                <RankRow key={r.e.lead.id} i={i + 1} title={r.e.title}
                  subtitle={`${r.from} → ${r.to}`} valueLabel={`+${r.delta}`} trend="up"
                  onClick={() => onSelectLead?.(r.e.lead)} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Inteligência em queda" icon={TrendingDown} hint="Contatos perdendo interesse.">
          {deltas.falling.length === 0 ? <Empty text="Sem quedas registradas no período." /> : (
            <div className="space-y-0.5">
              {deltas.falling.map((r, i) => (
                <RankRow key={r.e.lead.id} i={i + 1} title={r.e.title}
                  subtitle={`${r.from} → ${r.to}${r.reason ? ` · ${prettySignal(r.reason)}` : ""}`}
                  valueLabel={`${r.delta}`} trend="down" onClick={() => onSelectLead?.(r.e.lead)} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Leads em risco" icon={AlertTriangle} hint="Sinais de silêncio, objeção ou falta de resposta.">
          {riskTop.length === 0 ? <Empty text="Nenhum contato em risco no momento." /> : (
            <div className="space-y-0.5">
              {riskTop.map((e, i) => (
                <RankRow key={e.lead.id} i={i + 1} title={e.title}
                  subtitle={`${e.profile?.risk_factors?.[0]?.label || e.lead.risk_state || "Risco detectado"} · Inteligência ${e.lead.score_total} de 100`}
                  valueLabel={`Risco ${e.risk}`} onClick={() => onSelectLead?.(e.lead)} />
              ))}
            </div>
          )}
        </Section>

        <Section title="Principais sinais comerciais" icon={Signal} hint="Sinais detectados nas conversas (Evolution e Meta) no período.">
          {topSignals.length === 0 ? <Empty text="Nenhum sinal detectado no período." /> : (
            <div className="space-y-2">
              {topSignals.map((s) => (
                <div key={s.type} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-foreground">{prettySignal(s.type)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{s.count} {s.count === 1 ? "lead" : "leads"}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Etapa e responsável */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {byStage.length > 0 && (
          <Section title="Inteligência por etapa" icon={Layers} hint="Onde estão as melhores oportunidades do funil.">
            <div className="space-y-3">
              {byStage.map((s: any) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{s.name} <span className="text-muted-foreground">({s.count})</span></span>
                    <span className={`tabular-nums font-semibold ${intelTextColor(s.avg)}`}>{s.avg} de 100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.avg}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {byOwner.length > 0 && (
          <Section title="Inteligência por responsável" icon={UserCheck} hint="Qualidade e acompanhamento por carteira.">
            <div className="space-y-1">
              {byOwner.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-2.5 py-2 rounded-xl bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{o.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {o.count} leads · {o.high} de alta oportunidade · {o.risk} em risco · intenção média {o.intent}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${intelTextColor(o.avg)}`}>{o.avg} de 100</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["P0", "P1", "P2", "P3", "P4"].map((p) => {
            const n = filtered.filter((e) => e.profile?.priority === p).length;
            return n ? (
              <Badge key={p} variant="outline" className="text-[10px] border-primary/30 text-primary">
                {PRIORITY_LABELS[p]}: {n}
              </Badge>
            ) : null;
          })}
          {momentum.analyzed > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {momentum.analyzed} contatos com tendência: {MOMENTUM_LABELS.STABLE.toLowerCase()} e demais estados
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligenceCenter;
