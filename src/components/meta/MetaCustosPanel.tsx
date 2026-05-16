import { useEffect, useMemo, useState } from "react";
import { MetaKpiCard } from "@/components/meta/MetaKpiCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { DollarSign, Target, TrendingUp, Calculator, MessageSquare, Sparkles, Briefcase, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MetaDashboardData } from "@/hooks/useMetaDashboard";
import { META_COST_PER_MSG } from "@/hooks/useMetaDashboard";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const fmtBRLp = (n: number) =>
  n >= 1
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString("pt-BR");

// Variação % real vs período anterior
function deltaPct(curr: number, prev: number): number | undefined {
  if (prev === undefined || prev === null) return undefined;
  if (prev <= 0) return undefined;
  const pct = ((curr - prev) / prev) * 100;
  if (!isFinite(pct)) return undefined;
  return pct;
}

// Preços oficiais Meta para Brasil (BRL por conversa entregue, atualizado 2025)
// Fonte: https://developers.facebook.com/docs/whatsapp/pricing/
const META_PRICING_BR: Record<string, number> = {
  MARKETING: 0.2475,
  UTILITY: 0.0825,
  AUTHENTICATION: 0.0825,
  SERVICE: 0,
};

interface MetaTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
}

interface MetaCustosPanelProps {
  data: MetaDashboardData;
}

export function MetaCustosPanel({ data }: MetaCustosPanelProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState<string>("__manual__");
  const [tipoManual, setTipoManual] = useState<keyof typeof META_PRICING_BR>("MARKETING");
  const [leads, setLeads] = useState<number | "">("");
  const [taxa, setTaxa] = useState<number | "">("");

  // Carrega templates reais da primeira WABA conectada
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setTplLoading(true);
      const { data: conns } = await supabase
        .from("user_waba_connections")
        .select("waba_id,access_token")
        .eq("user_id", user.id)
        .limit(1);
      const conn = conns?.[0];
      if (!conn) { setTplLoading(false); return; }
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-fetch-templates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ waba_id: conn.waba_id, access_token: conn.access_token }),
        });
        const json = await resp.json();
        if (!cancelled && json?.success) {
          const list: MetaTemplate[] = (json.templates || []).filter((t: any) => t.status === "APPROVED");
          setTemplates(list);
        }
      } catch (err) {
        console.error("Erro ao carregar templates Meta:", err);
      } finally {
        if (!cancelled) setTplLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const selectedTpl = templates.find((t) => t.id === selectedTplId);
  const selectedCategory = selectedTpl?.category?.toUpperCase() || tipoManual;
  const costPerMsg = META_PRICING_BR[selectedCategory] ?? META_PRICING_BR.MARKETING;

  const sim = useMemo(() => {
    const leadsN = typeof leads === "number" ? leads : 0;
    const taxaN = typeof taxa === "number" ? taxa : 0;
    const totalCost = leadsN * costPerMsg;
    const respondents = (leadsN * taxaN) / 100;
    const cpr = respondents > 0 ? totalCost / respondents : 0;
    const opps = respondents * 0.12;
    const cpo = opps > 0 ? totalCost / opps : 0;
    return { totalCost, cpr, cpo, respondents, opps };
  }, [leads, costPerMsg, taxa]);

  // KPIs reais — 6 cards (3x2)
  const costPerMessage = data.messagesSent > 0 ? data.totalCost / data.messagesSent : 0;
  const prevCostPerMessage = data.prevMessagesSent > 0 ? data.prevTotalCost / data.prevMessagesSent : 0;
  const costPerOpportunity = data.opportunities > 0 ? data.totalCost / data.opportunities : 0;
  const prevCostPerOpportunity = data.prevOpportunities > 0 ? data.prevTotalCost / data.prevOpportunities : 0;

  const kpis = [
    { label: "Custo Meta total", value: fmtBRLp(data.totalCost), raw: data.totalCost, delta: deltaPct(data.totalCost, data.prevTotalCost), accent: "primary" as const, icon: <DollarSign size={14} />, spark: data.sparks.cost },
    { label: "Custo / mensagem", value: fmtBRL(costPerMessage), raw: costPerMessage, delta: deltaPct(costPerMessage, prevCostPerMessage), accent: "primary" as const, icon: <MessageSquare size={14} /> },
    { label: "Custo / resposta", value: fmtBRL(data.costPerResponse), raw: data.costPerResponse, delta: deltaPct(data.costPerResponse, data.prevCostPerResponse), accent: "emerald" as const, icon: <Target size={14} />, spark: data.sparks.costPerResponse },
    { label: "Custo / oportunidade", value: fmtBRL(costPerOpportunity), raw: costPerOpportunity, delta: deltaPct(costPerOpportunity, prevCostPerOpportunity), accent: "violet" as const, icon: <Briefcase size={14} /> },
    { label: "Pipeline estimado", value: fmtBRLp(data.pipelineEstimated), raw: data.pipelineEstimated, delta: deltaPct(data.pipelineEstimated, data.prevPipelineEstimated), accent: "primary" as const, icon: <TrendingUp size={14} />, spark: data.sparks.pipelineEstimated },
    { label: "ROI projetado", value: `${data.roiProjected.toFixed(1)}x`, raw: data.roiProjected, delta: deltaPct(data.roiProjected, data.prevRoiProjected), accent: "emerald" as const, icon: <Sparkles size={14} />, spark: data.sparks.roiProjected },
  ];

  // Comparação por campanha (top 8 por custo)
  const campaignsBar = [...data.campaigns]
    .filter((c) => c.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((c) => ({ name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name, cost: c.cost, replies: c.replies }));

  return (
    <div className="space-y-4">
      {/* KPIs — 3 por linha, 2 linhas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <MetaKpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            delta={k.delta}
            accent={k.accent}
            icon={k.icon}
            spark={k.spark}
            empty={!k.raw}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border-border/60">
          <ChartHeader title="Evolução de custos" subtitle="Gasto consolidado por dia" />
          <div className="h-64">
            {data.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="custosPanelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRLp(v)} width={70} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(v: number) => [fmtBRL(v), "Custo"]}
                  />
                  <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#custosPanelGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Sem custos no período" />
            )}
          </div>
        </Card>

        <Card className="p-5 border-border/60">
          <ChartHeader title="Custo por campanha" subtitle="Top 8 campanhas no período" />
          <div className="h-64">
            {campaignsBar.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignsBar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRLp(v)} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={130} tickLine={false} axisLine={false} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(v: number) => fmtBRL(v)}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Sem campanhas no período" />
            )}
          </div>
        </Card>
      </div>

      {/* Simulador com templates reais */}
      <Card className="p-5 border-border/60">
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Simulador de custos Meta</h3>
              <p className="text-xs text-muted-foreground">Estime custo, CPR e CPO usando preços oficiais Meta (BR) por categoria de template.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <DollarSign size={10} /> Tabela Meta BR 2025
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template</Label>
              <Select value={selectedTplId} onValueChange={setSelectedTplId}>
                <SelectTrigger>
                  <SelectValue placeholder={tplLoading ? "Carregando templates…" : "Selecione um template"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Custo manual por categoria</SelectItem>
                  {tplLoading && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Carregando…
                    </div>
                  )}
                  {!tplLoading && templates.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Nenhum template aprovado encontrado.
                    </div>
                  )}
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · <span className="text-muted-foreground">{t.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTpl ? (
                <p className="text-[11px] text-muted-foreground">
                  Categoria <span className="font-medium text-foreground">{selectedTpl.category}</span> · custo Meta {fmtBRL(costPerMsg)}/msg
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Custo médio interno: {fmtBRL(META_COST_PER_MSG)}/msg.</p>
              )}
            </div>

            {selectedTplId === "__manual__" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria do template</Label>
                <Select value={tipoManual} onValueChange={(v) => setTipoManual(v as keyof typeof META_PRICING_BR)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing — {fmtBRL(META_PRICING_BR.MARKETING)}/msg</SelectItem>
                    <SelectItem value="UTILITY">Utility — {fmtBRL(META_PRICING_BR.UTILITY)}/msg</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication — {fmtBRL(META_PRICING_BR.AUTHENTICATION)}/msg</SelectItem>
                    <SelectItem value="SERVICE">Service — Grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quantidade de leads</Label>
              <Input type="number" value={leads} min={0} placeholder="Ex.: 1000" onChange={(e) => setLeads(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Taxa de resposta estimada (%)</Label>
              <Input type="number" value={taxa} min={0} max={100} placeholder="Ex.: 20" onChange={(e) => setTaxa(e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SimResult label="Custo total Meta" value={fmtBRL(sim.totalCost)} accent="primary" />
            <SimResult label="Respondentes" value={fmtN(Math.round(sim.respondents))} />
            <SimResult label="Custo / resposta" value={fmtBRL(sim.cpr)} accent="emerald" />
            <SimResult label="Custo / oportunidade" value={fmtBRL(sim.cpo)} accent="violet" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function SimResult({ label, value, accent = "default" }: { label: string; value: string; accent?: string }) {
  const accentClass =
    accent === "primary" ? "text-primary" :
    accent === "emerald" ? "text-emerald-500" :
    accent === "violet" ? "text-violet-500" : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/40 p-4 border border-border/40">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}
