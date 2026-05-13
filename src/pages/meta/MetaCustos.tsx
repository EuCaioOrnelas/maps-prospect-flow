import { useState, useMemo } from "react";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { MetaKpiCard } from "@/components/meta/MetaKpiCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { DollarSign, Target, TrendingUp, Calculator } from "lucide-react";
import { dailyCost, campaignsPerformance } from "@/components/meta/mockData";

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export default function MetaCustos() {
  const [leads, setLeads] = useState(1000);
  const [tipo, setTipo] = useState("MARKETING");
  const [taxa, setTaxa] = useState(20);

  const sim = useMemo(() => {
    const costPerMsg = tipo === "MARKETING" ? 0.55 : tipo === "UTILITY" ? 0.18 : 0.4;
    const totalCost = leads * costPerMsg;
    const respondents = (leads * taxa) / 100;
    const cpr = respondents > 0 ? totalCost / respondents : 0;
    const opps = respondents * 0.12;
    const cpo = opps > 0 ? totalCost / opps : 0;
    return { totalCost, cpr, cpo, respondents, opps };
  }, [leads, tipo, taxa]);

  return (
    <MetaLayout title="Custos & Consumo" description="Controle financeiro completo da operação Meta.">
      <MetaPageHeader title="Custos & Consumo" description="Acompanhe custo total, ROI e simule cenários antes de disparar." />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetaKpiCard label="Custo total" value={fmtBRL(2486)} delta={12} icon={<DollarSign size={14} />} accent="primary" />
        <MetaKpiCard label="Por campanha" value={fmtBRL(621)} delta={-3} icon={<DollarSign size={14} />} />
        <MetaKpiCard label="Por número" value={fmtBRL(829)} delta={5} icon={<DollarSign size={14} />} />
        <MetaKpiCard label="Por template" value={fmtBRL(345)} delta={-2} icon={<DollarSign size={14} />} />
        <MetaKpiCard label="Custo / resposta" value={fmtBRL(3.41)} delta={-7} icon={<Target size={14} />} accent="emerald" />
        <MetaKpiCard label="Custo / oportunidade" value={fmtBRL(28)} delta={-4} icon={<TrendingUp size={14} />} accent="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border-border/60">
          <h3 className="text-sm font-semibold mb-1">Evolução de custos</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos 30 dias</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCost}>
                <defs>
                  <linearGradient id="costGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#costGrad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/60">
          <h3 className="text-sm font-semibold mb-1">Comparação de campanhas</h3>
          <p className="text-xs text-muted-foreground mb-4">Custo por campanha</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignsPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border-border/60 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-1">Custo × Conversão</h3>
          <p className="text-xs text-muted-foreground mb-4">Cada ponto = uma campanha</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" dataKey="cost" name="Custo" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="number" dataKey="opps" name="Oportunidades" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <ZAxis type="number" dataKey="roi" range={[80, 400]} />
                <RTooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Scatter data={campaignsPerformance} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Simulator */}
      <Card className="p-5 border-border/60">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Simulador de custos Meta</h3>
            <p className="text-xs text-muted-foreground">Estime custo, CPR e CPO antes de disparar uma campanha.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quantidade de leads</Label>
              <Input type="number" value={leads} onChange={(e) => setLeads(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de template</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing (R$ 0,55/msg)</SelectItem>
                  <SelectItem value="UTILITY">Utility (R$ 0,18/msg)</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication (R$ 0,40/msg)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Taxa de resposta estimada (%)</Label>
              <Input type="number" value={taxa} onChange={(e) => setTaxa(Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SimResult label="Custo total Meta" value={fmtBRL(sim.totalCost)} accent="primary" />
            <SimResult label="Respondentes" value={Math.round(sim.respondents).toLocaleString("pt-BR")} />
            <SimResult label="Custo por resposta" value={fmtBRL(sim.cpr)} accent="emerald" />
            <SimResult label="Custo por oportunidade" value={fmtBRL(sim.cpo)} accent="violet" />
          </div>
        </div>
      </Card>
    </MetaLayout>
  );
}

function SimResult({ label, value, accent = "default" }: { label: string; value: string; accent?: string }) {
  const accentClass =
    accent === "primary" ? "text-primary" :
    accent === "emerald" ? "text-emerald-500" :
    accent === "violet" ? "text-violet-500" : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${accentClass}`}>{value}</p>
    </div>
  );
}
