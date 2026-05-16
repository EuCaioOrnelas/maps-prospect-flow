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
    { label: "Custo Meta total", value: fmtBRLp(data.totalCost), raw: data.totalCost, delta: deltaPct(data.totalCost, data.prevTotalCost), accent: "primary" as const, icon: <DollarSign size={14} />, spark: data.sparks.cost, hint: "Soma do gasto Meta no período (mensagens × preço por categoria)." },
    { label: "Custo / mensagem", value: fmtBRL(costPerMessage), raw: costPerMessage, delta: deltaPct(costPerMessage, prevCostPerMessage), accent: "primary" as const, icon: <MessageSquare size={14} />, hint: "Custo médio por mensagem enviada (Custo Meta total ÷ Mensagens enviadas)." },
    { label: "Custo / resposta", value: fmtBRL(data.costPerResponse), raw: data.costPerResponse, delta: deltaPct(data.costPerResponse, data.prevCostPerResponse), accent: "emerald" as const, icon: <Target size={14} />, spark: data.sparks.costPerResponse, hint: "Custo Meta total ÷ Respostas recebidas. Mostra quanto custa cada lead que efetivamente respondeu." },
    { label: "Custo / oportunidade", value: fmtBRL(costPerOpportunity), raw: costPerOpportunity, delta: deltaPct(costPerOpportunity, prevCostPerOpportunity), accent: "violet" as const, icon: <Briefcase size={14} />, hint: "Custo Meta total ÷ Oportunidades (leads classificados como alto potencial pelo CRM). Indica quanto você gasta em mídia para gerar um lead realmente quente." },
    { label: "Pipeline estimado", value: fmtBRLp(data.pipelineEstimated), raw: data.pipelineEstimated, delta: deltaPct(data.pipelineEstimated, data.prevPipelineEstimated), accent: "primary" as const, icon: <TrendingUp size={14} />, spark: data.sparks.pipelineEstimated, hint: "Soma do valor estimado de todos os leads do período." },
    { label: "ROI projetado", value: `${data.roiProjected.toFixed(1)}x`, raw: data.roiProjected, delta: deltaPct(data.roiProjected, data.prevRoiProjected), accent: "emerald" as const, icon: <Sparkles size={14} />, spark: data.sparks.roiProjected, hint: "Pipeline estimado ÷ Custo Meta total. Quantas vezes o valor potencial supera o investimento." },
  ];

  // Comparação por campanha (top 8 por custo)
  const campaignsBar = [...data.campaigns]
    .filter((c) => c.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((c) => ({ name: c.name.length > 22 ? c.name.slice(0, 22) + "…" : c.name, cost: c.cost, replies: c.replies }));

  const currentYear = new Date().getFullYear();

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      {/* KPIs — 3 por linha, 2 linhas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="relative">
            <MetaKpiCard
              label={k.label}
              value={k.value}
              delta={k.delta}
              accent={k.accent}
              icon={k.icon}
              spark={k.spark}
              empty={!k.raw}
            />
            {k.hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label={`Como é calculado: ${k.label}`}
                  >
                    <Info size={13} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                  {k.hint}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
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
      <Card className="overflow-hidden border-border/60">
        <div className="p-5 border-b border-border/60 flex items-start justify-between gap-3 flex-wrap bg-muted/20">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Simulador de custos Meta</h3>
              <p className="text-xs text-muted-foreground">Estime custo, CPR e CPO com preços oficiais Meta (BR) por categoria de template.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
            <DollarSign size={10} /> Tabela Meta BR {currentYear}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Coluna de configuração */}
          <div className="lg:col-span-5 p-5 lg:border-r border-border/60 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Configuração</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Template</Label>
                  <Select value={selectedTplId} onValueChange={setSelectedTplId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tplLoading ? "Carregando…" : "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">Manual</SelectItem>
                      {tplLoading && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground inline-flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" /> Carregando…
                        </div>
                      )}
                      {!tplLoading && templates.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum template aprovado.</div>
                      )}
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="truncate">{t.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select
                    value={selectedTplId === "__manual__" ? tipoManual : (selectedTpl?.category?.toUpperCase() || "MARKETING")}
                    onValueChange={(v) => setTipoManual(v as keyof typeof META_PRICING_BR)}
                    disabled={selectedTplId !== "__manual__"}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utilidade</SelectItem>
                      <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                      <SelectItem value="SERVICE">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Quantidade de leads</Label>
                  <Input type="number" value={leads} min={0} placeholder="Ex.: 1000" onChange={(e) => setLeads(e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))} />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Taxa resposta (%)</Label>
                  <Input type="number" value={taxa} min={0} max={100} placeholder="Ex.: 20" onChange={(e) => setTaxa(e.target.value === "" ? "" : Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-primary" />
              <span>
                {selectedTpl
                  ? <>Categoria <span className="font-medium text-foreground">{selectedTpl.category}</span> · custo Meta <span className="font-medium text-foreground">{fmtBRL(costPerMsg)}/msg</span></>
                  : <>Custo aplicado: <span className="font-medium text-foreground">{fmtBRL(costPerMsg)}/msg</span> (categoria {selectedCategory}).</>}
              </span>
            </div>
          </div>

          {/* Coluna de resultados */}
          <div className="lg:col-span-7 p-5 bg-gradient-to-br from-muted/10 to-transparent">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Resultado da simulação</p>

            {/* Hero card — Custo total Meta */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent p-5 mb-3">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                      <DollarSign size={16} />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Custo total Meta</p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-emerald-500 mt-3">{fmtBRL(sim.totalCost)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {fmtN(typeof leads === "number" ? leads : 0)} mensagens × {fmtBRL(costPerMsg)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                  <TrendingUp size={10} /> Estimativa
                </Badge>
              </div>
            </div>

            {/* Cards secundários — com ícones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SimResult
                icon={<MessageSquare size={14} />}
                label="Respondentes"
                value={fmtN(Math.round(sim.respondents))}
                accent="primary"
                hint="Leads × Taxa de resposta. Quantos leads efetivamente responderam à mensagem."
              />
              <SimResult
                icon={<Target size={14} />}
                label="Custo / resposta"
                value={fmtBRL(sim.cpr)}
                accent="violet"
                hint="Custo total ÷ Respondentes. Investimento médio por lead que respondeu."
              />
              <SimResult
                icon={<Briefcase size={14} />}
                label="Custo / oportunidade"
                value={fmtBRL(sim.cpo)}
                accent="amber"
                hint="Considera que ~12% dos respondentes viram oportunidades reais (média B2B). Custo total ÷ oportunidades estimadas."
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
    </TooltipProvider>
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

function SimResult({ label, value, accent = "default", hint, icon }: { label: string; value: string; accent?: string; hint?: string; icon?: React.ReactNode }) {
  const accentClass =
    accent === "primary" ? "text-primary" :
    accent === "emerald" ? "text-emerald-500" :
    accent === "violet" ? "text-violet-500" :
    accent === "amber" ? "text-amber-500" : "text-foreground";
  const iconBg =
    accent === "primary" ? "bg-primary/10 text-primary" :
    accent === "emerald" ? "bg-emerald-500/10 text-emerald-500" :
    accent === "violet" ? "bg-violet-500/10 text-violet-500" :
    accent === "amber" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-foreground";
  return (
    <div className="relative rounded-lg bg-card border border-border/60 px-3.5 py-3 hover:border-border transition-colors">
      <div className="flex items-center gap-2">
        {icon && (
          <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
        )}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate flex-1">{label}</p>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/60 hover:text-foreground shrink-0" aria-label="Como é calculado">
                <Info size={11} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={`text-lg font-semibold mt-1.5 tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}
