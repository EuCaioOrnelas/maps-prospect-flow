import { useState } from "react";
import { Link } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { MetaKpiCard } from "@/components/meta/MetaKpiCard";
import { MetaInsightCard } from "@/components/meta/MetaInsightCard";
import { MetaFilterBar } from "@/components/meta/MetaFilterBar";
import { MetaCustosPanel } from "@/components/meta/MetaCustosPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Percent, Target, Calendar as CalendarIcon, Briefcase, TrendingUp,
  Sparkles, Plus, FileText, Search, LayoutDashboard, Wallet,
} from "lucide-react";
import {
  dailyCost, funnelData, templateCategories, campaignsPerformance, insights, heatmap,
} from "@/components/meta/mockData";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString("pt-BR");

const KPIS = [
  { label: "Gasto Meta", value: fmtBRL(2486), delta: 12.4, accent: "primary" as const, icon: <DollarSign size={14} /> },
  { label: "Mensagens enviadas", value: fmtN(4860), delta: 8.2, accent: "violet" as const, icon: <MessageSquare size={14} /> },
  { label: "Conversas iniciadas", value: fmtN(1106), delta: 14.1, accent: "emerald" as const, icon: <MessagesSquare size={14} /> },
  { label: "Conversas reabertas", value: fmtN(421), delta: -3.2, accent: "amber" as const, icon: <RotateCcw size={14} /> },
  { label: "Leads no funil CRM", value: fmtN(3120), delta: 5.6, accent: "primary" as const, icon: <Users size={14} /> },
  { label: "Leads respondidos", value: fmtN(728), delta: 11.0, accent: "emerald" as const, icon: <Reply size={14} /> },
  { label: "Taxa de resposta", value: "23.3%", delta: 2.4, accent: "violet" as const, icon: <Percent size={14} /> },
  { label: "Custo por resposta", value: fmtBRL(3.41), delta: -6.8, accent: "primary" as const, icon: <DollarSign size={14} /> },
  { label: "Custo por oportunidade", value: fmtBRL(28), delta: -4.2, accent: "amber" as const, icon: <Target size={14} /> },
  { label: "Reuniões geradas", value: fmtN(168), delta: 18.0, accent: "emerald" as const, icon: <CalendarIcon size={14} /> },
  { label: "Oportunidades", value: fmtN(89), delta: 9.4, accent: "violet" as const, icon: <Briefcase size={14} /> },
  { label: "Pipeline estimado", value: fmtBRL(412000), delta: 14.7, accent: "primary" as const, icon: <TrendingUp size={14} /> },
  { label: "ROI estimado", value: "5.2x", delta: 7.8, accent: "emerald" as const, icon: <Sparkles size={14} /> },
];

export default function MetaDashboard() {
  const [period, setPeriod] = useState("30");
  const [campaign, setCampaign] = useState("all");
  const [numero, setNumero] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const filteredCampaigns = campaignsPerformance.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <MetaFilterBar
            period={period} onPeriodChange={setPeriod}
            campaign={campaign} onCampaignChange={setCampaign}
            numero={numero} onNumeroChange={setNumero}
            status={status} onStatusChange={setStatus}
          />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {KPIS.map((k) => (
          <MetaKpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            delta={k.delta}
            accent={k.accent}
            icon={k.icon}
            spark={Array.from({ length: 12 }).map(() => Math.random() * 50 + 20)}
          />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Custo Meta por dia</h3>
              <p className="text-xs text-muted-foreground">Gasto consolidado em BRL</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCost}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#costGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/60">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Mensagens vs Respostas</h3>
            <p className="text-xs text-muted-foreground">Comparativo diário</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCost.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="responses" fill="hsl(158 72% 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Funnel + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-border/60">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Funil operacional CRM</h3>
            <p className="text-xs text-muted-foreground">Da captação ao fechamento</p>
          </div>
          <div className="space-y-2">
            {funnelData.map((s, i) => {
              const max = funnelData[0].value;
              const pct = (s.value / max) * 100;
              const conv = i > 0 ? ((s.value / funnelData[i - 1].value) * 100).toFixed(1) : null;
              return (
                <div key={s.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{s.stage}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {fmtN(s.value)} {conv && <span className="ml-2 text-emerald-500">{conv}%</span>}
                    </span>
                  </div>
                  <div className="h-7 bg-muted/40 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-md transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 border-border/60">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Categorias de templates</h3>
            <p className="text-xs text-muted-foreground">Distribuição</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={templateCategories} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {templateCategories.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5 border-border/60">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Heatmap de respostas por horário</h3>
          <p className="text-xs text-muted-foreground">Dia da semana × hora</p>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="flex items-center gap-1 mb-1 pl-12">
              {Array.from({ length: 14 }).map((_, h) => (
                <div key={h} className="w-7 text-center text-[10px] text-muted-foreground tabular-nums">{h + 7}h</div>
              ))}
            </div>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label, day) => (
              <div key={label} className="flex items-center gap-1 mb-1">
                <div className="w-10 text-[11px] text-muted-foreground font-medium">{label}</div>
                {heatmap[day].map((cell) => {
                  const intensity = cell.value / 120;
                  return (
                    <div
                      key={`${day}-${cell.hour}`}
                      className="w-7 h-7 rounded-sm border border-border/40"
                      style={{ backgroundColor: `hsl(var(--primary) / ${Math.min(intensity, 0.95)})` }}
                      title={`${cell.value} respostas`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Performance table */}
      <Card className="border-border/60">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Performance das campanhas</h3>
            <p className="text-xs text-muted-foreground">Visão consolidada por campanha</p>
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
              <TableHead className="text-right">Oportunidades</TableHead>
              <TableHead className="text-right">ROI</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtN(c.sent)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtN(c.replies)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(c.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBRL(c.cost / c.replies)}</TableCell>
                <TableCell className="text-right tabular-nums">{c.opps}</TableCell>
                <TableCell className="text-right tabular-nums font-medium text-emerald-500">{c.roi}x</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "default" : c.status === "paused" ? "secondary" : "outline"} className="capitalize">
                    {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : "Arquivada"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Insights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Insights de IA
          </h3>
          <Badge variant="outline" className="text-[10px]">Atualizado agora</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins) => (
            <MetaInsightCard key={ins.title} {...ins} />
          ))}
        </div>
      </div>
    </MetaLayout>
  );
}
