import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { MetaKpiCard } from "@/components/meta/MetaKpiCard";
import { MetaInsightCard } from "@/components/meta/MetaInsightCard";
import { MetaCustosPanel } from "@/components/meta/MetaCustosPanel";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  DollarSign, MessageSquare, MessagesSquare, RotateCcw, Users, Reply,
  Percent, Briefcase, TrendingUp, Sparkles, Plus, FileText, Search,
  LayoutDashboard, Wallet, Calendar as CalendarIcon, CheckCheck, Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMetaDashboard } from "@/hooks/useMetaDashboard";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRLp = (n: number) =>
  n >= 1
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString("pt-BR");

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

const FUNNEL_HINTS: Record<string, string> = {
  Captados: "Total de leads que entraram no CRM no período. É a base (100%) do funil.",
  Analisados: "Leads que tiveram seu potencial classificado pela IA (campo opportunity_level preenchido).",
  Enviados: "Leads que receberam pelo menos uma mensagem (first_message_sent = true).",
  Respondeu: "Leads que responderam pelo menos uma mensagem do nosso lado.",
  Oportunidades: "Leads classificados como alto potencial pela IA (opportunity_level = alto/muito_alto).",
};

// Variação % real vs período anterior. Só suprime quando não há base de
// comparação (prev = 0) — qualquer valor calculado é exibido como está.
function deltaPct(curr: number, prev: number): number | undefined {
  if (prev === undefined || prev === null) return undefined;
  if (prev <= 0) return undefined;
  const pct = ((curr - prev) / prev) * 100;
  if (!isFinite(pct)) return undefined;
  return pct;
}

export default function MetaDashboard() {
  const [end, setEnd] = useState<Date>(new Date());
  const [start, setStart] = useState<Date>(subDays(new Date(), 30));
  const [search, setSearch] = useState("");

  const range = useMemo(() => ({ start, end }), [start, end]);
  const data = useMetaDashboard(range);

  const filteredCampaigns = data.campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = useMemo(() => [
    // Linha 1 — Volume operacional
    { label: "Leads totais", value: fmtN(data.leadsInFunnel), raw: data.leadsInFunnel, delta: deltaPct(data.leadsInFunnel, data.prevLeadsInFunnel), accent: "primary" as const, icon: <Users size={14} />, spark: data.sparks.leadsInFunnel },
    { label: "Mensagens enviadas", value: fmtN(data.messagesSent), raw: data.messagesSent, delta: deltaPct(data.messagesSent, data.prevMessagesSent), accent: "violet" as const, icon: <MessageSquare size={14} />, spark: data.sparks.messages },
    { label: "Taxa de entrega", value: `${data.deliveryRate.toFixed(1)}%`, raw: data.deliveryRate, delta: deltaPct(data.deliveryRate, data.prevDeliveryRate), accent: "emerald" as const, icon: <CheckCheck size={14} />, spark: data.sparks.messages },
    { label: "Conversas iniciadas", value: fmtN(data.conversationsStarted), raw: data.conversationsStarted, delta: deltaPct(data.conversationsStarted, data.prevConversationsStarted), accent: "emerald" as const, icon: <MessagesSquare size={14} />, spark: data.sparks.conversationsStarted },
    // Linha 2 — Engajamento
    { label: "Leads respondidos", value: fmtN(data.leadsAnswered), raw: data.leadsAnswered, delta: deltaPct(data.leadsAnswered, data.prevLeadsAnswered), accent: "emerald" as const, icon: <Reply size={14} />, spark: data.sparks.leadsAnswered },
    { label: "Taxa de resposta", value: `${data.responseRate.toFixed(1)}%`, raw: data.responseRate, delta: deltaPct(data.responseRate, data.prevResponseRate), accent: "violet" as const, icon: <Percent size={14} />, spark: data.sparks.responseRate },
    { label: "Conversas reabertas", value: fmtN(data.conversationsReopened), raw: data.conversationsReopened, delta: deltaPct(data.conversationsReopened, data.prevConversationsReopened), accent: "amber" as const, icon: <RotateCcw size={14} />, spark: data.sparks.conversationsReopened },
    { label: "Oportunidades", value: fmtN(data.opportunities), raw: data.opportunities, delta: deltaPct(data.opportunities, data.prevOpportunities), accent: "violet" as const, icon: <Briefcase size={14} />, spark: data.sparks.opportunities },
    // Linha 3 — Financeiro / ROI
    { label: "Custo Meta", value: fmtBRLp(data.totalCost), raw: data.totalCost, delta: deltaPct(data.totalCost, data.prevTotalCost), accent: "primary" as const, icon: <DollarSign size={14} />, spark: data.sparks.cost },
    { label: "Custo por resposta", value: fmtBRLp(data.costPerResponse), raw: data.costPerResponse, delta: deltaPct(data.costPerResponse, data.prevCostPerResponse), accent: "primary" as const, icon: <DollarSign size={14} />, spark: data.sparks.costPerResponse },
    { label: "Pipeline estimado", value: fmtBRL(data.pipelineEstimated), raw: data.pipelineEstimated, delta: deltaPct(data.pipelineEstimated, data.prevPipelineEstimated), accent: "primary" as const, icon: <TrendingUp size={14} />, spark: data.sparks.pipelineEstimated },
    { label: "ROI projetado", value: `${data.roiProjected.toFixed(1)}x`, raw: data.roiProjected, delta: deltaPct(data.roiProjected, data.prevRoiProjected), accent: "emerald" as const, icon: <Sparkles size={14} />, spark: data.sparks.roiProjected },
  ], [data]);

  return (
    <MetaLayout title="Dashboard" description="Cockpit operacional da operação WhatsApp oficial via Meta API.">
      <MetaPageHeader
        title="Meta Platforms"
        description="Visão completa de campanhas, custos, qualidade e CRM integrados."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/meta/templates">
                <FileText size={14} className="mr-1.5" /> Novo template
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/meta/campanhas">
                <Plus size={14} className="mr-1.5" /> Nova campanha
              </Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/40 border border-border/60 p-1 h-9">
          <TabsTrigger value="overview" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <LayoutDashboard size={13} /> Visão geral
          </TabsTrigger>
          <TabsTrigger value="custos" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Wallet size={13} /> Custos & Consumo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-0">
          {/* Date range filter */}
          <DateRangeBar start={start} end={end} onStart={setStart} onEnd={setEnd} />

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5 border-border/60">
              <ChartHeader title="Custo Meta por dia" subtitle="Gasto consolidado em BRL" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtBRLp(v)} width={70} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [fmtBRLp(v), "Custo"]}
                    />
                    <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#costGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 border-border/60">
              <ChartHeader title="Mensagens vs Respostas" subtitle="Comparativo diário" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.daily.slice(-12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="messages" name="Mensagens" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="responses" name="Respostas" fill="hsl(158 72% 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Funnel + Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5 border-border/60">
              <ChartHeader title="Funil operacional CRM" subtitle="Captados → Oportunidades (dados reais do CRM)" />
              {data.funnel.every((s) => s.value === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum dado de funil no período.</p>
              ) : (
                <TooltipProvider delayDuration={150}>
                  <div className="flex flex-col items-center gap-3">
                    {data.funnel.map((s, i) => {
                      const base = data.funnel[0]?.value || 1;
                      // Largura proporcional ao número de Captados (base do funil).
                      // Mínimo de 14% só para o texto caber sem quebrar.
                      const widthPct = i === 0 ? 100 : Math.max((s.value / base) * 100, 14);
                      const convPct = i === 0 ? 100 : (s.value / base) * 100;
                      const hint = FUNNEL_HINTS[s.stage] ?? `Total de ${s.stage.toLowerCase()} no período.`;
                      return (
                        <div key={s.stage} className="w-full flex flex-col items-center">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <p className="text-sm font-semibold text-foreground">{s.stage}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-muted-foreground/70 hover:text-foreground transition-colors" aria-label={`Como é calculado: ${s.stage}`}>
                                  <Info size={12} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                                {hint}
                                <span className="block mt-1 text-muted-foreground">
                                  % é calculada sobre <b>Captados</b> ({fmtN(base)}).
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div
                            className="h-11 rounded-full bg-gradient-to-r from-primary via-primary/85 to-primary/55 flex items-center justify-center gap-1.5 transition-all shadow-sm px-3 whitespace-nowrap overflow-visible"
                            style={{ width: `${widthPct}%` }}
                          >
                            <span className="text-base font-bold text-white tabular-nums leading-none">
                              {fmtN(s.value)}
                            </span>
                            <span className="text-[11px] font-semibold text-white/90 tabular-nums leading-none">
                              · {convPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </Card>

            <Card className="p-5 border-border/60">
              <ChartHeader title="Categorias de templates" subtitle="Distribuição" />
              <div className="h-56">
                {data.templateCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.templateCategories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {data.templateCategories.map((c) => (
                          <Cell key={c.name} fill={c.color} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem templates cadastrados.</div>
                )}
              </div>
            </Card>
          </div>

          {/* Heatmap real */}
          <Card className="p-5 border-border/60">
            <ChartHeader title="Heatmap de respostas por horário" subtitle="Respostas reais (dia × hora)" />
            <Heatmap data={data.heatmap} />
          </Card>

          {/* Performance table real */}
          <Card className="border-border/60">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Performance das campanhas</h3>
                <p className="text-xs text-muted-foreground">Visão consolidada por campanha (dados reais)</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar campanha..."
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Respostas</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">CPR</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">ROI projetado</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                      {data.loading ? "Carregando..." : "Nenhuma campanha no período."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredCampaigns.map((c) => {
                  const cpr = c.replies > 0 ? c.cost / c.replies : 0;
                  const rate = c.sent > 0 ? (c.replies / c.sent) * 100 : 0;
                  const roi = c.cost > 0 ? (c.replies * 50) / c.cost : 0; // projeção: R$50 por resposta como ticket médio aproximado
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtN(c.sent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtN(c.replies)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(c.cost)}</TableCell>
                      <TableCell className="text-right tabular-nums">{cpr > 0 ? fmtBRL(cpr) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{rate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-500">{roi.toFixed(1)}x</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "running" ? "default" : c.status === "paused" ? "secondary" : "outline"} className="capitalize">
                          {c.status === "running" ? "Ativa" : c.status === "paused" ? "Pausada" : c.status === "completed" ? "Concluída" : c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Insights real */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={14} className="text-primary" /> Insights de IA
              </h3>
              <Badge variant="outline" className="text-[10px]">Computado em tempo real</Badge>
            </div>
            {data.insights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.insights.map((ins) => (
                  <MetaInsightCard key={ins.title} {...ins} />
                ))}
              </div>
            ) : (
              <Card className="p-6 border-border/60 text-center text-xs text-muted-foreground">
                Sem insights suficientes — colete mais dados de campanhas e respostas.
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="custos" className="space-y-4 mt-0">
          <DateRangeBar start={start} end={end} onStart={setStart} onEnd={setEnd} />
          <MetaCustosPanel data={data} />
        </TabsContent>
      </Tabs>
    </MetaLayout>
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

function DateRangeBar({
  start, end, onStart, onEnd,
}: { start: Date; end: Date; onStart: (d: Date) => void; onEnd: (d: Date) => void; }) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const label = `${format(start, "dd MMM yyyy", { locale: ptBR })} — ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
  const applyRange = () => {
    const nextStart = draftStart <= draftEnd ? draftStart : draftEnd;
    const nextEnd = draftStart <= draftEnd ? draftEnd : draftStart;
    onStart(nextStart);
    onEnd(nextEnd);
    setOpen(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setDraftStart(start);
            setDraftEnd(end);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 text-xs border-border/60 gap-1.5">
            <CalendarIcon size={13} />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden rounded-2xl border-border/70 bg-popover p-0 shadow-xl" align="start">
          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={draftStart}
              selected={{ from: draftStart, to: draftEnd }}
              onSelect={(r: any) => {
                if (r?.from) setDraftStart(r.from);
                if (r?.to) setDraftEnd(r.to);
              }}
              initialFocus
              className={cn("p-0 pointer-events-auto")}
              classNames={{
                months: "flex flex-col sm:flex-row gap-4 sm:gap-5",
                month: "space-y-4 w-[260px]",
                caption_label: "text-sm font-semibold text-popover-foreground",
                head_cell: "text-muted-foreground rounded-md w-9 font-medium text-[0.78rem]",
                day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 text-sm font-medium aria-selected:opacity-100"),
                day_selected: "!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
                day_range_start: "day-range-start !bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
                day_range_end: "day-range-end !bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground",
                day_range_middle: "aria-selected:!bg-primary/90 aria-selected:!text-primary-foreground",
                day_outside: "day-outside text-muted-foreground/55 aria-selected:bg-primary/45 aria-selected:text-primary-foreground aria-selected:opacity-100",
                day_today: "font-semibold aria-selected:!bg-primary aria-selected:!text-primary-foreground",
              }}
            />
          </div>
          <div className="border-t border-border/70 bg-secondary/35 p-3">
            <Button size="sm" className="h-9 w-full rounded-lg text-xs" onClick={applyRange}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border mx-1" />

      {PRESETS.map((p) => {
        const currentDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const isActive = currentDays === p.days;
        return (
          <Button
            key={p.label}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 text-xs",
              isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={() => {
              const e = new Date();
              onEnd(e);
              onStart(subDays(e, p.days));
            }}
          >
            {p.label}
          </Button>
        );
      })}
    </div>
  );
}

function Heatmap({ data }: { data: { day: number; hour: number; value: number }[][] }) {
  const max = Math.max(1, ...data.flat().map((c) => c.value));
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex items-center gap-1 mb-1 pl-12">
          {Array.from({ length: 14 }).map((_, h) => (
            <div key={h} className="w-7 text-center text-[10px] text-muted-foreground tabular-nums">{h + 7}h</div>
          ))}
        </div>
        {dayLabels.map((label, day) => (
          <div key={label} className="flex items-center gap-1 mb-1">
            <div className="w-10 text-[11px] text-muted-foreground font-medium">{label}</div>
            {(data[day] || []).map((cell) => {
              const intensity = cell.value / max;
              const opacity = cell.value === 0 ? 0.06 : Math.max(0.15, Math.min(intensity, 0.95));
              return (
                <div
                  key={`${day}-${cell.hour}`}
                  className="w-7 h-7 rounded-sm border border-border/40"
                  style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
                  title={`${label} ${cell.hour}h — ${cell.value} respostas`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
          <div key={o} className="w-4 h-4 rounded-sm border border-border/40" style={{ backgroundColor: `hsl(var(--primary) / ${o})` }} />
        ))}
        <span>Mais</span>
        <span className="ml-auto">Pico: {max} respostas</span>
      </div>
    </div>
  );
}
